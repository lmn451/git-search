# Git Search Improvement Plan

This document outlines the high-level plan to improve the Git Search VS Code extension.

## 1. Performance Optimization

- **Problem:** The extension activates on VS Code startup, causing unnecessary performance overhead.
- **Solution:** Modify `package.json` to use `onCommand:git-search.showPanel` for the `activationEvents`. This will ensure the extension only loads when the user explicitly runs its command.

## 2. Code Refactoring & State Management

- **Problem:** The main logic in `extension.js` is monolithic and uses a global state object, making it hard to maintain and test.
- **Solution:**
  - Refactor `extension.js` by extracting logic into smaller, single-responsibility modules (e.g., `webviewManager.js`, `searchHandler.js`).
  - Replace the global `store` with a more robust state management pattern. Pass state explicitly to functions or encapsulate it within relevant modules.

## 3. Comprehensive Testing

- **Problem:** Test coverage is minimal and only covers a small part of the `git` functionality, ignoring the core extension logic.
- **Solution:**
  - Implement a comprehensive suite of unit tests for all helper functions and modules.
  - Write integration tests for the main extension workflow, covering the interaction between the webview and the extension backend.
  - Mock dependencies like `vscode` and `git` commands to ensure tests are fast and reliable.

## 4. User Configuration

- **Problem:** Key parameters like `PAGE_SIZE` and `NUMBER_OF_CONTEXT_LINES` are hardcoded.
- **Solution:** Implement user-configurable settings using the VS Code configuration API. Allow users to set these values in their `settings.json`.

## 5. Frontend Improvements

- **Problem:** The `ansi-to-html` conversion is done on the backend, which is inefficient.
- **Solution:** Move the `ansi-to-html` conversion logic to the client-side (the webview's JavaScript). This will reduce the payload from the extension backend and offload processing to the client.
