const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const { createState } = require("./state");

function getWebviewContent() {
  const htmlFilePath = path.join(__dirname, "..", "gitSearchPanel.html");
  return fs.readFileSync(htmlFilePath, "utf8");
}

function createWebviewPanel(context, handleWebviewMessage) {
  const panel = vscode.window.createWebviewPanel(
    "gitSearch",
    "Git Search",
    vscode.ViewColumn.One,
    { enableScripts: true },
  );

  const state = createState();

  panel.webview.html = getWebviewContent();
  panel.webview.onDidReceiveMessage(
    (message) => handleWebviewMessage(message, panel, state),
    undefined,
    context.subscriptions,
  );

  return panel;
}

module.exports = { createWebviewPanel };
