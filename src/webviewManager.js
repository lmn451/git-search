const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const gitService = require("./gitService");
const Convert = require("ansi-to-html");

const convert = new Convert();

/**
 * @type {vscode.WebviewPanel | undefined}
 */
let currentPanel;
let currentSearchQuery = "";
let currentPage = 1;
let repoUrl = null;

/**
 * Creates and shows a new webview panel or reveals the existing one.
 * @param {vscode.Uri} extensionUri The URI of the extension's directory.
 */
async function createOrShow(extensionUri) {
  const column = vscode.window.activeTextEditor
    ? vscode.window.activeTextEditor.viewColumn
    : undefined;

  // If we already have a panel, show it.
  if (currentPanel) {
    currentPanel.reveal(column);
    return;
  }

  // Otherwise, create a new panel.
  currentPanel = vscode.window.createWebviewPanel(
    "gitSearch", // Identifies the type of the webview. Used internally
    "Git Search", // Title of the panel displayed to the user
    column || vscode.ViewColumn.One, // Editor column to show the new webview panel in.
    {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(extensionUri, "assets")],
    },
  );

  const workspacePath = gitService.getWorkspacePath();
  if (!workspacePath) {
    vscode.window.showErrorMessage(
      "Git Search: No workspace folder found. Please open a folder to use this extension.",
    );
    currentPanel.dispose();
    return;
  }

  repoUrl = await gitService.getRepoUrl(workspacePath);
  currentPanel.webview.html = getWebviewContent(
    currentPanel.webview,
    extensionUri,
  );

  // Handle messages from the webview
  currentPanel.webview.onDidReceiveMessage(
    async (message) => {
      switch (message.command) {
        case "webview-ready":
          // This is a signal from the webview that it has loaded and is ready.
          // In a test environment, this is crucial for synchronization.
          if (process.env.VSCODE_TEST) {
            console.log("Webview is ready for testing.");
          }
          return;
        case "search":
          currentSearchQuery = message.text;
          currentPage = 1;
          currentPanel.webview.postMessage({
            command: "showResults",
            html: "<span>Loading...</span>",
          });
          await executeSearch(workspacePath);
          return;
        case "loadMore":
          currentPage++;
          await executeSearch(workspacePath, true); // `true` for append
          return;
        case "reset":
          currentSearchQuery = "";
          currentPage = 1;
          currentPanel.webview.postMessage({ command: "reset" });
          return;
      }
    },
    undefined,
    [],
  );

  // Reset state when the panel is closed
  currentPanel.onDidDispose(
    () => {
      currentPanel = undefined;
      currentSearchQuery = "";
      currentPage = 1;
      repoUrl = null;
    },
    null,
    [],
  );
}

/**
 * Executes the git search and sends the results to the webview.
 * @param {string} workspacePath The path of the current workspace.
 * @param {boolean} [append=false] Whether to append results or replace them.
 */
async function executeSearch(workspacePath, append = false) {
  if (!currentPanel) {
    return;
  }

  const output = await gitService.searchGitLog({
    query: currentSearchQuery,
    cwd: workspacePath,
    page: currentPage,
  });

  if (!output && !append) {
    currentPanel.webview.postMessage({
      command: "showResults",
      html: "<span>No results found.</span>",
      append: false,
    });
    return;
  }

  const results = output
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [hash, author, date] = line.split("|");
      const commitLink = repoUrl ? `${repoUrl}/commit/${hash}` : "";
      const linkTag = commitLink
        ? `<a href="${commitLink}">${hash.substring(0, 7)}</a>`
        : hash.substring(0, 7);
      return `<div class="commit-item">${linkTag} - ${author} (${date})</div>`;
    })
    .join("");

  const html = convert.toHtml(results);

  currentPanel.webview.postMessage({
    command: "showResults",
    html: html,
    append: append,
  });
}

/**
 * Loads the HTML content for the webview.
 * @param {vscode.Webview} webview The webview instance.
 * @param {vscode.Uri} extensionUri The URI of the extension's directory.
 * @returns {string} The HTML content.
 */
function getWebviewContent(webview, extensionUri) {
  const htmlPath = path.join(extensionUri.fsPath, "gitSearchPanel.html");
  let html = fs.readFileSync(htmlPath, "utf8");

  // Use a nonce to only allow specific scripts to be run
  const nonce = getNonce();
  html = html.replace(/{{nonce}}/g, nonce);

  // Set the content security policy
  const cspSource = webview.cspSource;
  html = html.replace(
    /{{cspSource}}/g,
    `default-src 'none'; style-src ${cspSource}; script-src 'nonce-${nonce}';`,
  );

  return html;
}

/**
 * Generates a random string to be used as a nonce.
 * @returns {string} The nonce.
 */
function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

module.exports = {
  createOrShow,
  getCurrentPanel: () => currentPanel,
};
