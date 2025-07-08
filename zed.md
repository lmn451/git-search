# git-search Extension Architecture Documentation

## Overview

A VS Code extension for performing `git log -S` searches directly in the editor. Implements a webview panel interface with backend command execution.

## Core Components

### 1. Extension Entry Point (`extension.js`)

- Main module exporting `activate` and `deactivate` functions
- Registers the `git-search.showPanel` command
- Manages webview panel lifecycle
- Handles communication between webview and Node.js backend

### 2. Webview Interface (`gitSearchPanel.html`)

- Frontend UI for search input and results display
- Uses VS Code's webview API for secure communication
- Implements search form and results rendering
- JavaScript handles user interactions and message passing

### 3. Backend Logic

- Uses `simple-git` library for Git operations
- Implements search functionality via `git log -S` command
- Handles file system operations with `fs-extra`
- Processes git output and formats results for UI

### 4. Configuration

- VS Code settings integration (`package.json` contributes configuration)
- Search pattern configuration
- Result display preferences
- Keyboard shortcut support

## Development Structure

```
├── src/                  # Source code (TypeScript)
├── test/                 # Test suite (Mocha/Chai)
│   └── suite/            # Test cases
├── assets/               # Static assets (logo)
├── node_modules/         # Dependencies
├── package.json          # Project metadata and scripts
├── extension.js          # Main extension implementation
├── gitSearchPanel.html   # Webview UI
├── jsconfig.json         # JavaScript configuration
└── LICENSE               # MIT License
```

## Key Technologies

- **VS Code Extension API**: Core API for creating commands, webviews, and editor integration
- **Node.js**: Runtime for backend operations
- **Git CLI**: Direct integration for version control operations
- **Webview API**: Secure communication between frontend and backend
- **TypeScript**: Type-safe development (via dev dependencies)
- **Simple Git**: Promise-based git interface

## Extension Workflow

1. User triggers `git-search.showPanel` command
2. Extension creates webview panel and loads HTML content
3. User enters search pattern in webview form
4. Webview sends message to backend via `acquireVsCodeApi`
5. Backend executes `git log -S` command using simple-git
6. Results are processed and returned to webview
7. Webview renders formatted results with syntax highlighting

## Testing Framework

- Unit tests using Mocha and Chai
- End-to-end tests with VS Code test harness
- Real git tests for actual repository validation
- Linting with ESLint and Prettier formatting
