const assert = require('assert');
const { SearchEngine } = require('../../src/searchEngine');

// Simple test runner
const tests = [];
function test(description, fn) {
  tests.push({ description, fn });
}

function describe(suiteName, fn) {
  console.log(`\n${suiteName}`);
  fn();
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const { description, fn } of tests) {
    try {
      await fn();
      console.log(`  ✓ ${description}`);
      passed++;
    } catch (error) {
      console.log(`  ✗ ${description}`);
      console.log(`    ${error.message}`);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

// Mock git commands
function createMockGitCommands() {
  return {
    getRepoUrl: async () => 'https://github.com/test/repo',
    getRelatedCommitsInfo: async () => 'abc123|Test Author|2023-01-01T12:00:00Z',
    getDiff: async () => '--- a/file.js\n+++ b/file.js\n@@ -1,1 +1,1 @@\n-old line\n+new line'
  };
}

// Test suite
describe('SearchEngine', () => {
  test('should initialize with default options', () => {
    const mockGit = createMockGitCommands();
    const engine = new SearchEngine(mockGit);
    
    assert.strictEqual(engine.pageSize, 10);
    assert.strictEqual(engine.mode, 'S');
    assert.strictEqual(engine.contextLines, 3);
    assert.strictEqual(engine.latestQuery, '');
    assert.strictEqual(engine.isLoadMore, false);
  });

  test('should initialize with custom options', () => {
    const mockGit = createMockGitCommands();
    const options = { pageSize: 20, mode: 'G', contextLines: 5 };
    const engine = new SearchEngine(mockGit, options);
    
    assert.strictEqual(engine.pageSize, 20);
    assert.strictEqual(engine.mode, 'G');
    assert.strictEqual(engine.contextLines, 5);
  });

  test('should reset state correctly', () => {
    const mockGit = createMockGitCommands();
    const engine = new SearchEngine(mockGit);
    
    // Set some state
    engine.latestQuery = 'test';
    engine.isLoadMore = true;
    engine.currentCommits = ['commit1'];
    
    // Reset
    engine.reset();
    
    assert.strictEqual(engine.latestQuery, '');
    assert.strictEqual(engine.isLoadMore, false);
    assert.deepStrictEqual(engine.currentCommits, []);
  });

  test('should change mode correctly', () => {
    const mockGit = createMockGitCommands();
    const engine = new SearchEngine(mockGit);
    
    engine.changeMode('G');
    assert.strictEqual(engine.mode, 'G');
    
    engine.changeMode('S');
    assert.strictEqual(engine.mode, 'S');
    
    // Should ignore invalid modes
    engine.changeMode('X');
    assert.strictEqual(engine.mode, 'S');
  });

  test('should update context lines', () => {
    const mockGit = createMockGitCommands();
    const engine = new SearchEngine(mockGit);
    
    engine.updateContextLines(7);
    assert.strictEqual(engine.contextLines, 7);
    assert.strictEqual(engine.redraw, true);
    assert.strictEqual(engine.isLoadMore, false);
  });

  test('should return empty result for empty query', async () => {
    const mockGit = createMockGitCommands();
    const engine = new SearchEngine(mockGit);
    
    const result = await engine.search('', '/workspace');
    assert.strictEqual(result.html, '');
    assert.strictEqual(result.canLoadMore, false);
  });

  test('should return no workspace message when workspace is null', async () => {
    const mockGit = createMockGitCommands();
    const engine = new SearchEngine(mockGit);
    
    const result = await engine.search('test', null);
    assert.strictEqual(result.html, 'No workspace found');
    assert.strictEqual(result.canLoadMore, false);
  });

  test('should perform successful search', async () => {
    const mockGit = createMockGitCommands();
    const engine = new SearchEngine(mockGit);
    
    const result = await engine.search('test query', '/workspace');
    
    assert.ok(result.html.includes('abc123'));
    assert.ok(result.html.includes('Test Author'));
    assert.ok(result.html.includes('https://github.com/test/repo'));
    assert.strictEqual(result.latestQuery, 'test query');
  });

  test('should handle git command failures', async () => {
    const mockGit = {
      getRepoUrl: async () => { throw new Error('Git error'); },
      getRelatedCommitsInfo: async () => 'abc123|Author|2023-01-01',
      getDiff: async () => 'diff'
    };
    
    const engine = new SearchEngine(mockGit);
    
    try {
      await engine.search('test', '/workspace');
      assert.fail('Should have thrown an error');
    } catch (error) {
      assert.ok(error.message.includes('Git error'));
    }
  });

  test('should handle no results from git', async () => {
    const mockGit = {
      getRepoUrl: async () => 'https://github.com/test/repo',
      getRelatedCommitsInfo: async () => '', // No commits
      getDiff: async () => 'diff'
    };
    
    const engine = new SearchEngine(mockGit);
    
    const result = await engine.search('test', '/workspace');
    assert.strictEqual(result.html, 'No results found');
    assert.strictEqual(result.canLoadMore, false);
  });

  test('should reset commits when new query differs from latest', async () => {
    const mockGit = createMockGitCommands();
    const engine = new SearchEngine(mockGit);
    
    // First search
    await engine.search('first query', '/workspace');
    assert.strictEqual(engine.currentCommits.length, 1);
    
    // Different search should reset commits
    await engine.search('second query', '/workspace');
    assert.strictEqual(engine.latestQuery, 'second query');
    // Note: currentCommits will be reset and then populated again
  });

  test('should handle load more functionality', async () => {
    const mockGit = createMockGitCommands();
    const engine = new SearchEngine(mockGit);
    
    // Initial search
    await engine.search('test', '/workspace');
    
    // Load more
    const result = await engine.loadMore('/workspace');
    assert.strictEqual(engine.isLoadMore, true);
    assert.strictEqual(engine.redraw, true);
    assert.ok(result.html.includes('abc123'));
  });

  test('should handle diff errors gracefully', async () => {
    const mockGit = {
      getRepoUrl: async () => 'https://github.com/test/repo',
      getRelatedCommitsInfo: async () => 'abc123|Author|2023-01-01',
      getDiff: async () => { throw new Error('Diff failed'); }
    };
    
    const engine = new SearchEngine(mockGit);
    
    const result = await engine.search('test', '/workspace');
    // Should continue processing even if diff fails
    assert.strictEqual(result.html, 'No results found'); // Empty because diff failed
  });
});

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
} 