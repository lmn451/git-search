# Test Infrastructure Redesign Plan

## Current Problems

### 1. Global State Pollution
- Extension uses global variables that persist across tests:
  - `latestQuery`, `currentCommits`, `isLoadMore`, `lastCommitDate`
  - `PAGE_SIZE`, `MODE`, `NUMBER_OF_CONTEXT_LINES`, `redraw`
- Tests interfere with each other due to shared state
- State reset is incomplete and unreliable

### 2. Tight Coupling
- Business logic is tightly coupled to VS Code APIs
- Hard to test logic in isolation
- Mocking VS Code APIs is complex and brittle

### 3. Complex Async Behavior
- Multiple async operations in message handling flow
- Race conditions in test environment
- Difficult to control timing and order of operations

### 4. Overly Complex Mocking
- Trying to mock too many things simultaneously
- Brittle test setup that breaks easily
- Hard to debug when tests fail

## Proposed Solution: Hybrid Architecture

### Phase 1: Extract Core Logic

#### Create `src/searchEngine.js`
```javascript
class SearchEngine {
  constructor(gitCommands, options = {}) {
    this.gitCommands = gitCommands;
    this.pageSize = options.pageSize || 10;
    this.mode = options.mode || "S";
    this.contextLines = options.contextLines || 3;
    this.reset();
  }

  reset() {
    this.latestQuery = "";
    this.isLoadMore = false;
    this.lastCommitDate = "";
    this.currentCommits = [];
    this.redraw = false;
  }

  async search(query, workspacePath) {
    // Pure business logic - no VS Code dependencies
  }

  async loadMore(workspacePath) {
    // Load more logic
  }

  changeMode(newMode) {
    // Mode change logic
  }

  updateContextLines(lines) {
    // Context lines update logic
  }
}
```

#### Benefits
- **Encapsulated State**: All state contained in class instance
- **Dependency Injection**: Git commands passed as parameter
- **Pure Functions**: No VS Code dependencies
- **Easy Testing**: Predictable input/output

### Phase 2: Refactor Extension

#### Update `extension.js`
```javascript
let searchEngine;

function activate(context) {
  searchEngine = new SearchEngine(gitCommands);
  // Register commands...
}

function handleWebviewMessage(message, panel) {
  switch (message.command) {
    case "search":
      return handleSearch(message.text, panel);
    case "reset":
      searchEngine.reset();
      panel.webview.postMessage({ command: "reset", text: "" });
      break;
    // ... other cases
  }
}

async function handleSearch(query, panel) {
  try {
    panel.webview.postMessage({ command: "showResults", text: "Loading" });
    const results = await searchEngine.search(query, getWorkspace());
    panel.webview.postMessage({ 
      command: "showResults", 
      text: results.html,
      isLoadMore: results.canLoadMore 
    });
  } catch (error) {
    vscode.window.showErrorMessage(error.message);
    panel.webview.postMessage({ command: "showResults", text: error.message });
  }
}
```

#### Benefits
- **Thin Integration Layer**: Extension focuses on VS Code integration
- **Clear Separation**: Business logic delegated to SearchEngine
- **Easier Debugging**: Simpler message handling flow

### Phase 3: Two-Tier Testing

#### Unit Tests (`test/unit/searchEngine.test.js`)
```javascript
const { SearchEngine } = require('../../src/searchEngine');

describe('SearchEngine', () => {
  let searchEngine;
  let mockGitCommands;

  beforeEach(() => {
    mockGitCommands = {
      getRepoUrl: sinon.stub(),
      getRelatedCommitsInfo: sinon.stub(),
      getDiff: sinon.stub()
    };
    searchEngine = new SearchEngine(mockGitCommands);
  });

  describe('search', () => {
    it('should format results correctly', async () => {
      // Fast, reliable unit test
      mockGitCommands.getRepoUrl.resolves('https://github.com/test/repo');
      mockGitCommands.getRelatedCommitsInfo.resolves('abc123|Author|2023-01-01');
      mockGitCommands.getDiff.resolves('diff content');

      const result = await searchEngine.search('test query', '/workspace');
      
      expect(result.html).to.include('abc123');
      expect(result.html).to.include('Author');
      expect(result.canLoadMore).to.be.true;
    });
  });
});
```

#### Integration Tests (`test/integration/extension.test.js`)
```javascript
describe('Extension Integration', () => {
  it('should handle search message', async () => {
    // Minimal test focused on message passing
    const mockPanel = createMockPanel();
    
    await handleWebviewMessage({ 
      command: 'search', 
      text: 'test' 
    }, mockPanel);
    
    expect(mockPanel.webview.postMessage)
      .to.have.been.calledWith({ command: 'showResults', text: 'Loading' });
  });
});
```

#### Benefits
- **Fast Unit Tests**: No VS Code startup (runs in milliseconds)
- **Reliable**: No global state interference
- **Comprehensive**: Easy to test edge cases
- **Focused Integration Tests**: Test only the message passing layer

## Implementation Steps

### Step 1: Create SearchEngine Class
1. Create `src/searchEngine.js`
2. Move all business logic from `extension.js`
3. Remove global variables
4. Add dependency injection for git commands

### Step 2: Refactor Extension
1. Update `extension.js` to use SearchEngine
2. Simplify message handling
3. Add proper error handling
4. Ensure clean separation of concerns

### Step 3: Write Unit Tests
1. Create `test/unit/` directory
2. Write comprehensive tests for SearchEngine
3. Test all methods and edge cases
4. Ensure 100% code coverage for business logic

### Step 4: Simplify Integration Tests
1. Update existing integration tests
2. Focus only on VS Code message passing
3. Remove complex mocking
4. Ensure tests are fast and reliable

### Step 5: Add Test Scripts
1. Update `package.json` with separate test commands:
   - `npm run test:unit` - Fast unit tests
   - `npm run test:integration` - VS Code integration tests
   - `npm test` - Run both

## Expected Outcomes

### Before (Current State)
- ❌ Tests take 30+ seconds to run
- ❌ Tests fail intermittently
- ❌ Hard to debug failures
- ❌ Global state causes interference
- ❌ Complex mocking setup

### After (Hybrid Architecture)
- ✅ Unit tests run in <1 second
- ✅ Reliable, predictable test results
- ✅ Easy to debug and maintain
- ✅ Isolated test environments
- ✅ Simple, focused test setup
- ✅ Better code organization
- ✅ Easier to add new features


## Risk Mitigation

- **Regression Risk**: Keep existing tests running until new tests are proven
- **Complexity Risk**: Implement incrementally, one piece at a time
- **Time Risk**: Focus on core functionality first, add edge cases later 