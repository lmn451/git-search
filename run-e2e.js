const { runTests } = require('@vscode/test-electron');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');

async function waitForServer(port, timeout = 30000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${port}/`, { timeout: 1000 }, (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            reject(new Error(`Server responded with status code ${res.statusCode}`));
          }
        });
        req.on('error', reject);
        req.end();
      });
      console.log(`Server on port ${port} is up!`);
      return true;
    } catch (error) {
      console.log(`Waiting for server on port ${port}... (${error.message})`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retrying
    }
  }
  throw new Error(`Server on port ${port} did not become available within ${timeout / 1000} seconds.`);
}

async function main() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname);
    const testWorkspace = path.resolve(__dirname, 'tmp/git-test');

    // Launch VS Code without running tests, just to activate the extension
    const vscodeProcess = runTests({
      extensionDevelopmentPath,
      launchArgs: [testWorkspace],
      force: true, // Force re-download of VS Code test instance
      // Do not pass extensionTestsPath, so it doesn't run the integration tests
    });

    console.log('VS Code launched. Waiting for webview server...');
    await waitForServer(3000); // Wait for the webview server to start on port 3000

    console.log('Webview server detected. Running Playwright tests...');
    execSync('npx playwright test', { stdio: 'inherit' });

    console.log('Playwright tests finished. Closing VS Code...');
    // The vscodeProcess promise will resolve when VS Code exits
    // We might need a more robust way to kill the VS Code process launched by runTests
    // if it doesn't exit automatically after Playwright tests.
    // For now, let's assume it will eventually exit or we'll manually kill it if it hangs.

  } catch (err) {
    console.error('Failed to run E2E tests:', err);
    process.exit(1);
  }
}

main();