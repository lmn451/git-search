# Workflow Documentation

## 1. Extension Activation

```mermaid
sequenceDiagram
    participant VSCode
    participant Extension
    participant Webview

    VSCode->>Extension: activate()
    Extension->>Extension: Register 'git-search.showPanel' command
    VSCode->>Extension: Command triggered
    Extension->>Webview: Create webview panel
    Webview->>Webview: Load HTML content
    Webview->>Extension: Register message handler
```

**Activation Sequence:**

1. Extension initializes via `activate()` function
2. Registers command "git-search.showPanel" with VS Code
3. When command is triggered:
   - Creates webview panel with HTML content
   - Sets up message handler for webview communication
4. Exports key functions for external access

## 2. Git Search Command

```mermaid
sequenceDiagram
    participant Webview
    participant Extension
    participant GitCommands
    participant Model

    Webview->>Extension: Send 'search' message
    Extension->>Extension: Reset state if needed
    Extension->>Extension: Show loading indicator
    Extension->>GitCommands: Call getRelatedCommitsInfo()
    GitCommands->>Model: Execute git log command
    Model-->>GitCommands: Return raw commit data
    GitCommands->>GitCommands: Parse and filter commits
    GitCommands->>Extension: Return processed commits
    Extension->>GitCommands: Call getDiff() for each commit
    GitCommands->>Model: Execute git diff
    Model-->>GitCommands: Return diff data
    GitCommands->>GitCommands: Process and cache results
    Extension->>Webview: Post processed results
```

**Execution Flow:**

1. Webview sends search command with query
2. Extension resets state and shows loading UI
3. GitCommands executes git log with search pattern
4. Raw commit data is parsed and filtered
5. Parallel diff requests are made for each commit
6. Results are processed, cached, and sent back to webview

## 3. Results Rendering

```mermaid
flowchart TD
    A[Raw Git Data] --> B[Parse Commits]
    B --> C[Extract Commit Info]
    C --> D[Format Dates]
    D --> E[Build HTML Structure]
    E --> F[Highlight Query]
    F --> G[Escape HTML]
    G --> H[Webview Display]

    subgraph HTML Helpers
        I[escapeHtml] --> J[highlightQueryInHtml]
    end
```

**UI Update Sequence:**

1. Raw git data is transformed into structured objects
2. Commit metadata is formatted (dates, authors)
3. HTML structure is built with:
   - Commit headers
   - File details
   - Diff displays
4. Query highlighting applied using regex
5. HTML escaping prevents XSS vulnerabilities
6. Final content sent to webview for display

## 4. Error Handling

```mermaid
sequenceDiagram
    participant Webview
    participant Extension
    participant GitCommands
    participant VSCode

    GitCommands->>GitCommands: Try/Catch blocks
    GitCommands->>VSCode: Log errors to console
    GitCommands-->>Extension: Return null on error
    Extension->>VSCode: Show error messages
    Extension->>Webview: Display error UI
    Webview->>User: Show error notifications
```

**Error Propagation Workflow:**

1. Git commands use try/catch for error capture
2. Errors are logged to VS Code's output channel
3. Null values propagate through the pipeline
4. Extension displays error UI in webview
5. Critical errors show VS Code error notifications
6. Webview displays user-friendly error messages

## Areas to Improve

### State Handling Simplification

Current state management could be simplified using signals-based architecture. Potential improvements:

- Replace manual state updates with reactive signals
- Centralize state management using a library like Preact Signals
- Reduce callback nesting through signal subscriptions
