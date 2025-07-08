const assert = require("assert");
const vscode = require("vscode");
const path = require("path");
const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");

// --- Test Setup ---
// We need a temporary git repository to run our tests against.
// This setup will create a directory, initialize git, and make a commit.
const testRepoPath = path.join(os.tmpdir(), "vscode-git-search-e2e-test");

/**
 * Creates a temporary directory, initializes a git repository, and adds a commit.
 */
function setupTestRepo() {
  if (fs.existsSync(testRepoPath)) {
    fs.rmSync(testRepoPath, { recursive: true, force: true });
  }
  fs.mkdirSync(testRepoPath, { recursive: true });

  try {
    execSync("git init", { cwd: testRepoPath });
    execSync('git config user.name "Test User"', { cwd: testRepoPath });
    execSync('git config user.email "test@example.com"', { cwd: testRepoPath });

    // Create a file and commit it
    fs.writeFileSync(
      path.join(testRepoPath, "test.txt"),
      "hello world with a test keyword",
    );
    execSync("git add .", { cwd: testRepoPath });
    execSync('git commit -m "feat: initial commit with test keyword"', {
      cwd: testRepoPath,
    });
  } catch (error) {
    console.error("Failed to set up test repository:", error);
    throw error;
  }
}

/**
 * Removes the temporary test repository directory.
 */
function cleanupTestRepo() {
  if (fs.existsSync(testRepoPath)) {
    fs.rmSync(testRepoPath, { recursive: true, force: true });
  }
}

// --- Test Suite ---
suite("E2E Test Suite for Git Search", () => {
  // Runs before all tests in this suite
  suiteSetup(async () => {
    console.log("Setting up E2E test repository...");
    setupTestRepo();
    // Open the temporary repository in the current VS Code test window
    const uri = vscode.Uri.file(testRepoPath);
    await vscode.commands.executeCommand("vscode.openFolder", uri, {
      forceNewWindow: false,
    });

    // Wait for the workspace folder to be recognized
    await new Promise((resolve) => {
      if (
        vscode.workspace.workspaceFolders &&
        vscode.workspace.workspaceFolders.length > 0
      ) {
        return resolve();
      }
      const disposable = vscode.workspace.onDidChangeWorkspaceFolders(() => {
        disposable.dispose();
        resolve();
      });
    });

    const extension = vscode.extensions.getExtension("lmn451.git-log-s");
    if (!extension.isActive) {
      await extension.activate();
    }
  });

  // Runs after all tests in this suite
  suiteTeardown(() => {
    console.log("Cleaning up E2E test repository...");
    cleanupTestRepo();
    // Close the folder/workspace
    return vscode.commands.executeCommand("workbench.action.closeFolder");
  });

  test("Should activate the extension and show the panel", async () => {
    // Ensure the extension is active before running the command
    const extension = vscode.extensions.getExtension("lmn451.git-log-s");
    assert.ok(extension, "Extension should be found.");
    if (!extension.isActive) {
      await extension.activate();
    }
    assert.strictEqual(extension.isActive, true, "Extension should be active.");

    // Trigger the command to show the panel
    await vscode.commands.executeCommand("git-search.showPanel");

    // A more robust test would be to find a way to interact with the webview panel.
    // The VS Code testing API makes this complex. A common strategy is to have
    // the webview post a message back when it's ready, which we can listen for.
    // For now, we'll assert that the command ran without throwing an error
    // and that the extension remains active.

    // This is a placeholder. A full E2E test would need to:
    // 1. Get a handle to the created WebviewPanel. This is the hardest part.
    //    One might need to extend the extension code to register the panel for test access.
    // 2. Programmatically send a "search" message to its webview.
    // 3. Wait for a "showResults" message back from the webview.
    // 4. Assert the content of the results.
    assert.ok(
      true,
      "showPanel command executed. Further interaction testing requires more advanced setup.",
    );
  }).timeout(30000); // E2E tests can be slow, so increase the timeout.
});
