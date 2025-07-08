# User Flows

## 1. Search Initialization

1. User invokes "Git Search" from command palette
2. Webview panel opens with search input

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

## 2. Query Execution

1. User enters search terms
2. Results display in virtualized list
3. Clicking result opens file at line

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

## 3. Advanced Operations

1. Filtering by file type
2. Search history navigation

```mermaid
flowchart TD
    A[User Action] --> B{Operation Type}
    B -->|Filter| C[Apply file type filter]
    B -->|History| D[Load previous search]
    C --> E[Update results display]
    D --> F[Load search parameters]
    E --> G[Render filtered results]
    F --> H[Re-execute search with saved terms]
```
