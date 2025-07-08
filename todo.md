# Git Search Project Improvement Plan

This document outlines key areas for improving the `git-search` VS Code extension, focusing on dependencies, testing, automation, and code quality.

## ✅ TODO

### 📦 Dependency Management

- [ ] **Update Dependencies**: A number of `devDependencies` are likely outdated. Run the following command to check for and install the latest stable versions. This helps incorporate the latest features, security patches, and performance improvements.
  ```bash
  pnpm up --latest
  ```
- [ ] **Add `prettier` to `devDependencies`**: The `package.json` includes a `prettier` script, but the package itself is missing as a development dependency. It should be added to ensure consistent formatting across the project.
  ```bash
  pnpm add -D prettier
  ```

### 🧪 Testing

- [ ] **Implement End-to-End (E2E) Tests**: The current test suite primarily uses stubs and mocks, which is great for unit testing but doesn't verify the core functionality against a real environment. Add E2E tests that execute actual `git` commands against a test repository to ensure the extension behaves as expected. The `@vscode/test-electron` package is already set up for this.

  ```javascript
  // Example for a new E2E test file: test/e2e/search.e2e.test.js
  const assert = require("assert");
  const vscode = require("vscode");
  const path = require("path");

  suite("E2E Test Suite", () => {
    vscode.window.showInformationMessage("Start all E2E tests.");

    test("Should perform a real git search and show results", async () => {
      // This test will require a fixture repository and logic to coordinate
      // with the webview panel to verify the output.
      // 1. Activate the extension
      await vscode.commands.executeCommand("git-search.showPanel");

      // 2. Add logic to wait for the webview to be ready
      // 3. Programmatically trigger a search
      // 4. Assert that the webview receives and displays correct results
      assert.strictEqual(true, true, "E2E test needs full implementation");
    }).timeout(20000); // E2E tests can be slow, so increase the timeout
  });
  ```

- [ ] **Address Skipped Tests**: Two tests in `test/suite/extension.test.js` are marked as skipped (`xit`). Skipped tests can hide bugs and lead to an incomplete test suite. They should be implemented or removed.

  ```javascript
  // In test/suite/extension.test.js

  // TODO: Implement this test to verify command execution
  it("should execute command and return result", async () => {
    // Use a safe, simple command for testing the helper function
    const result = await executeCommand("git --version", ".");
    assert.ok(result.startsWith("git version"));
  });

  // TODO: Implement this test with a fixture repository
  it("should get repository URL", async () => {
    // This test requires a test repository to be initialized in a temporary directory
    // during the test setup phase.
    const url = await extension.getRepoUrl("."); // Should point to the fixture repo
    assert.equal(url, "https://github.com/test-user/test-repo"); // Example assertion
  });
  ```

### 🤖 Automation & Tooling

- [ ] **Set Up Pre-Commit Hooks**: To maintain code quality and consistency automatically, integrate `husky` and `lint-staged`. This will ensure that `eslint` and `prettier` are run on staged files before they are committed.

  1.  **Install packages:**
      ```bash
      pnpm add -D husky lint-staged
      ```
  2.  **Initialize husky:**
      ```bash
      npx husky init
      ```
  3.  **Create a pre-commit hook file (`.husky/pre-commit`):**

      ```bash
      #!/bin/sh
      . "$(dirname "$0")/_/husky.sh"

      npx lint-staged
      ```

  4.  **Configure `lint-staged` in `package.json`:**
      ```json
      "lint-staged": {
        "*.js": [
          "eslint --fix",
          "prettier --write"
        ]
      }
      ```

### 📄 Documentation

- [ ] **Enhance `README.md`**: A good README is crucial for user adoption and contribution. Improve the existing `README.md` with clear usage instructions and add the demo GIF to show the extension in action.

  ```markdown
  ## How to Use

  1.  Open the Command Palette (`Cmd+Shift+P` on macOS or `Ctrl+Shift+P` on Windows/Linux).
  2.  Search for and select the **"Show Git Search Panel"** command.
  3.  In the new panel, type your search term into the input box and press Enter. This will run a `git log -S"<your-term>"` command to find commits that introduce or remove that string.
  4.  The results, including commit hash, author, and date, will be displayed in the panel.

  ## Demo

  ![Git Search in Action](assets/out.gif)
  ```

### 🧹 Code Quality

- [ ] **Refactor `extension.js`**: The main `extension.js` file appears to handle multiple responsibilities, including state management, command execution, and UI logic. Refactoring this into smaller, more focused modules will significantly improve maintainability and testability.

  - **`src/gitService.js`**: Centralize all functions that interact directly with the `git` command-line interface.
  - **`src/webviewManager.js`**: Encapsulate all logic related to creating, managing, and communicating with the VS Code Webview panel.
  - **`extension.js`** (main entry point): Should primarily be responsible for activating the extension, initializing the services, and wiring them together.

  ```javascript
  // Example structure for src/gitService.js
  const { exec } = require("child_process");
  const { promisify } = require("util");
  const execPromise = promisify(exec);

  async function searchGitLog(query, cwd) {
    // Implement robust command construction and execution
    const command = `git log -S"${query}" --format="%H|%an|%cr"`;
    const { stdout } = await execPromise(command, { cwd });
    return stdout.trim();
  }

  module.exports = { searchGitLog };
  ```

  ```javascript
  // Example refactoring in extension.js
  const vscode = require("vscode");
  const webviewManager = require("./src/webviewManager");
  const gitService = require("./src/gitService");

  function activate(context) {
    context.subscriptions.push(
      vscode.commands.registerCommand("git-search.showPanel", () => {
        webviewManager.createOrShow(context.extensionUri);
      }),
    );
    // Setup message listener that uses gitService
    // ...
  }

  module.exports = { activate };
  ```
