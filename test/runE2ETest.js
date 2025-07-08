const path = require("path");
const { runTests } = require("@vscode/test-electron");

async function main() {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, "../");

    // The path to the extension E2E test script
    // Passed to --extensionTestsPath. This file will be loaded and run by the test runner.
    const extensionTestsPath = path.resolve(
      __dirname,
      "./e2e/search.e2e.test.js",
    );

    // Download VS Code, unzip it and run the E2E tests
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [path.join(os.tmpdir(), "vscode-git-search-e2e-test")],
    });
  } catch (err) {
    console.error("Failed to run E2E tests:", err);
    process.exit(1);
  }
}

main();
