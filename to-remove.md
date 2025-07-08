# Files to Remove

Based on the recent refactoring, the following files are no longer in use and can be safely deleted to clean up the project.

- `test/gitCommands.test.js`: This file contains tests for the legacy `gitCommands.js` module, which has been replaced by `src/gitService.js`. The tests are no longer relevant.
- `test/messageHandler.test.js`: This file tests the logic from the old `extension.js` before it was refactored. The responsibilities have been moved to `src/webviewManager.js`, making these tests obsolete.
- `test/vscode.mock.js`: This mock was used exclusively by `messageHandler.test.js` and is therefore no longer needed.
