const { SearchEngine } = require("./src/searchEngine");
const gitCommands = require("./src/gitCommands");
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

let searchEngine;

const getWorkspace = () => {
  try {
    return vscode.workspace.workspaceFolders[0].uri.fsPath;
  } catch (err) {
    return null;
  }
};

function activate(context) {
  searchEngine = new SearchEngine(gitCommands);
  
  let disposable = vscode.commands.registerCommand("git-search.showPanel", () =>
    showPanel(context)
  );

  context.subscriptions.push(disposable);
}

function showPanel(context) {
  const panel = vscode.window.createWebviewPanel(
    "gitSearch",
    "Git Search",
    vscode.ViewColumn.One,
    { enableScripts: true }
  );

  panel.webview.html = getWebviewContent();
  panel.webview.onDidReceiveMessage(
    (message) => handleWebviewMessage(message, panel),
    undefined,
    context.subscriptions
  );
}

function handleWebviewMessage(message, panel) {
  return new Promise(async (resolve) => {
    try {
      switch (message.command) {
        case "search":
          await handleSearchCommand(message.text, panel);
          break;
        case "loadMore":
          await handleLoadMoreCommand(panel);
          break;
        case "reset":
          handleResetCommand(panel);
          break;
        case "changeMode":
          handleChangeMode(message.mode);
          break;
        case "updateNumberOfContextLines":
          await handleUpdateNumberOfContextLines(message, panel);
          break;
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Error: ${error.message}`);
      panel.webview.postMessage({
        command: "showResults",
        text: error.message,
      });
    }
    resolve();
  });
}

async function handleUpdateNumberOfContextLines(message, panel) {
  searchEngine.updateContextLines(message.value);
  const result = await searchEngine.search(searchEngine.latestQuery, getWorkspace());
  panel.webview.postMessage({
    command: "showResults",
    text: result.html,
    latestQuery: result.latestQuery,
    isLoadMore: result.canLoadMore,
  });
}

async function handleSearchCommand(query, panel) {
  panel.webview.postMessage({ command: "showResults", text: "Loading" });
  
  const result = await searchEngine.search(query, getWorkspace());
  panel.webview.postMessage({
    command: "showResults",
    text: result.html,
    latestQuery: result.latestQuery,
    isLoadMore: result.canLoadMore,
  });
}

async function handleLoadMoreCommand(panel) {
  const result = await searchEngine.loadMore(getWorkspace());
  panel.webview.postMessage({
    command: result.isLoadMore ? "showResults" : "appendResults",
    text: result.html,
    latestQuery: result.latestQuery,
    isLoadMore: result.canLoadMore,
  });
}

function handleResetCommand(panel) {
  searchEngine.reset();
  panel.webview.postMessage({ command: "reset", text: "" });
}

function handleChangeMode(value) {
  searchEngine.changeMode(value);
}

function getWebviewContent() {
  const htmlFilePath = path.join(__dirname, "gitSearchPanel.html");
  return fs.readFileSync(htmlFilePath, "utf8");
}

function deactivate() {}

// Expose searchEngine for testing
function getSearchEngine() {
  return searchEngine;
}

function setSearchEngine(engine) {
  searchEngine = engine;
}

module.exports = {
  activate,
  deactivate,
  handleSearchCommand,
  handleLoadMoreCommand,
  handleResetCommand,
  handleWebviewMessage,
  getWebviewContent,
  showPanel,
  SearchEngine, // Export for testing
  getSearchEngine,
  setSearchEngine,
};
