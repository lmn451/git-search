const assert = require("assert");
const vscode = require("vscode");
const path = require("path");
const os = require("os");
const fs = require("fs");
const { execSync } = require("child_process");

suite("E2E Test Suite for Git Search", function () {
  this.timeout(60000); // Set a longer timeout for E2E tests

  let testRepoPath;
  let extensionApi;

  // Runs once before all tests in this suite
  suiteSetup(async () => {
    testRepoPath = fs.mkdtempSync(path.join(os.tmpdir(), "git-search-e2e-"));

    // --- 1. Create a temporary Git repository for our tests
    try {
      execSync("git init", { cwd: testRepoPath });
      execSync('git config user.name "Test User"', { cwd: testRepoPath });
      execSync('git config user.email "test@example.com"', {
        cwd: testRepoPath,
      });

      // --- 2. Create and commit a file with a unique keyword
      fs.writeFileSync(
        path.join(testRepoPath, "file1.txt"),
        "This file contains the magic_keyword for our test.",
      );
      execSync("git add file1.txt", { cwd: testRepoPath });
      execSync('git commit -m "feat: add magic keyword"', {
        cwd: testRepoPath,
      });

      // --- 3. Create a second commit for noise
      fs.writeFileSync(
        path.join(testRepoPath, "file2.txt"),
        "This is another file.",
      );
      execSync("git add file2.txt", { cwd: testRepoPath });
      execSync('git commit -m "chore: add another file"', {
        cwd: testRepoPath,
      });
    } catch (error) {
      console.error("Failed to set up the test repository.", error);
      throw error; // Fail the suite if setup fails
    }

    // --- 4. Open the test repository in the VS Code test instance
    const uri = vscode.Uri.file(testRepoPath);
    await vscode.commands.executeCommand("vscode.openFolder", uri, {
      forceNewWindow: false,
    });

    // --- 5. Activate the extension and get its API for testing
    const extension = vscode.extensions.getExtension("lmn451.git-log-s");
    assert.ok(extension, "Could not find the git-search extension.");
    if (!extension.isActive) {
      await extension.activate();
    }
    // This assumes the extension exports a `getTestApi` function for testing purposes.
    // This is a common and robust pattern for testing extensions.
    if (typeof extension.exports.getTestApi === "function") {
      extensionApi = extension.exports.getTestApi();
    } else {
      throw new Error(
        "Extension does not export a 'getTestApi' function. This is required for E2E testing.",
      );
    }
  });

  // Runs once after all tests in this suite
  suiteTeardown(() => {
    // Clean up the temporary directory
    if (testRepoPath) {
      try {
        fs.rmSync(testRepoPath, { recursive: true, force: true });
      } catch (err) {
        console.error(`Error cleaning up test repo: ${err}`);
      }
    }
    // Close the editor
    return vscode.commands.executeCommand("workbench.action.closeFolder");
  });

  test("Should run a full E2E git search and display results in the webview", async () => {
    // --- 1. Define a promise that resolves when the webview signals it's ready
    const onWebviewReady = new Promise((resolve) => {
      const interval = setInterval(() => {
        const panel = extensionApi.getCurrentPanel();
        if (panel) {
          panel.webview.onDidReceiveMessage((message) => {
            if (message.command === "webview-ready") {
              clearInterval(interval);
              resolve(panel);
            }
          });
        }
      }, 100);
    });

    // --- 2. Open the search panel
    await vscode.commands.executeCommand("git-search.showPanel");

    // --- 3. Wait for the panel to be created and signal it's ready
    const panel = await onWebviewReady;
    assert.ok(panel, "Webview panel should be defined and ready.");

    // --- 4. Define a promise to listen for the search results
    const onSearchResults = new Promise((resolve) => {
      panel.webview.onDidReceiveMessage((message) => {
        if (message.command === "showResults") {
          resolve(message.html);
        }
      });
    });

    // --- 5. Programmatically send the 'search' command to the webview
    panel.webview.postMessage({
      command: "search",
      text: "magic_keyword",
    });

    // --- 6. Wait for the results to come back
    const resultsHtml = await onSearchResults;

    // --- 7. Assert that the results are correct
    assert.ok(
      resultsHtml,
      "The results HTML from the webview should not be empty.",
    );
    assert.ok(
      resultsHtml.includes("feat: add magic keyword"),
      "Results HTML should contain the correct commit message.",
    );
    assert.ok(
      resultsHtml.includes("magic_keyword"),
      "Results HTML should contain the searched keyword.",
    );
    assert.ok(
      !resultsHtml.includes("chore: add another file"),
      "Results HTML should NOT contain commits that do not match the search.",
    );
  });
});
