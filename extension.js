const {
  getRelatedCommitsInfo,
  getDiff,
  getRepoUrl,
} = require("./src/gitCommands");
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const Convert = require("ansi-to-html");
const { adjustDate, formatDate } = require("./src/helpers");
const { highlightQueryInHtml, escapeHtml } = require("./src/htmlHelpers");

const convert = new Convert({
  colors: [
    "#000000", // Black
    "#DB7093", // Red
    // "#00FF00", // Green
  ],
  stream: true,
});

let PAGE_SIZE = 10;
let MODE = "S";
let NUMBER_OF_CONTEXT_LINES = 3;
let latestQuery = "";
let isLoadMore = false;
let lastCommitDate = "";

const getWorkspace = () => {
  try {
    return vscode.workspace.workspaceFolders[0].uri.fsPath;
  } catch (err) {
    return null;
  }
};

function activate(context) {
  let disposable = vscode.commands.registerCommand(
    "git-search.showPanel",
    showPanel.bind(null, context)
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
  switch (message.command) {
    case "search":
      handleSearchCommand(message.text, panel);
      break;
    case "loadMore":
      handleLoadMoreCommand(panel);
      break;
    case "reset":
      handleResetCommand(panel);
      break;
    case "changeMode":
      handleChangeMode(message.mode);
      break;
    case "updateNumberOfContextLines":
      handleUpdateNumberOfContextLines(message, panel);
  }
}

async function handleUpdateNumberOfContextLines(message, panel) {
  NUMBER_OF_CONTEXT_LINES = message.value;
  lastCommitDate = "";
  isLoadMore = false;
  await executeGitSearch(latestQuery, panel);
}

async function handleSearchCommand(query, panel) {
  latestQuery = query;
  isLoadMore = false;
  lastCommitDate = "";
  panel.webview.postMessage({ command: "showResults", text: "Loading" });
  await executeGitSearch(query, panel);
}

async function handleLoadMoreCommand(panel) {
  isLoadMore = true;
  await executeGitSearch(latestQuery, panel);
}

function handleResetCommand(panel) {
  latestQuery = "";
  isLoadMore = false;
  lastCommitDate = "";
  panel.webview.postMessage({ command: "reset", text: "" });
}

function handleChangeMode(value) {
  if (!(value === "G" || value === "S")) return;
  MODE = value;
}

function getWebviewContent() {
  const htmlFilePath = path.join(__dirname, "gitSearchPanel.html");
  return fs.readFileSync(htmlFilePath, "utf8");
}

async function executeGitSearch(dirtyQuery, panel) {
  const query = dirtyQuery.trim();
  if (!query) {
    return panel.webview.postMessage({
      command: "showResults",
      text: "",
    });
  }
  try {
    const workspaceFolderPath = getWorkspace();
    if (!workspaceFolderPath)
      return panel.webview.postMessage({
        command: "showResults",
        text: `No workspace found`,
      });

    const repoUrl = await getRepoUrl(workspaceFolderPath);
    const logOutput = await getRelatedCommitsInfo(
      workspaceFolderPath,
      query,
      MODE,
      lastCommitDate,
      PAGE_SIZE
    );
    if (!logOutput)
      return panel.webview.postMessage({
        command: isLoadMore ? "appendResults" : "showResults",
        text: null,
        isLoadMore: false,
      });

    const commits = logOutput
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    lastCommitDate = adjustDate(commits.at(-1).split("|")[2]);

    const diffPromises = commits.map((commitEntry) => {
      const [commitHash, author, commitDate] = commitEntry.split("|");
      return getDiff(
        workspaceFolderPath,
        commitHash,
        query,
        NUMBER_OF_CONTEXT_LINES
      )
        .then((diffOutput) => ({ commitHash, diffOutput, commitDate, author }))
        .catch((error) => {
          vscode.window.showErrorMessage(error.stack);
          return null; // Continue processing other commits
        });
    });

    const diffResults = await Promise.all(diffPromises);
    const contentArray = diffResults.map((diff) => {
      if (!diff) return "";
      const { commitHash, diffOutput, commitDate, author } = diff;
      const highlightedDiff = highlightQueryInHtml(
        escapeHtml(diffOutput),
        escapeHtml(query)
      );
      const diffHtml = convert.toHtml(highlightedDiff);
      return `<li class="commit-diff">Commit: <a href=${repoUrl}/commit/${commitHash}>${commitHash}</a> by ${author} at ${formatDate(
        commitDate
      )}<br><pre>${diffHtml}</pre></li>`;
    });

    let content = contentArray.join("");
    panel.webview.postMessage({
      command: isLoadMore ? "appendResults" : "showResults",
      text: content || "No results found",
      latestQuery,
      isLoadMore: contentArray ? contentArray.length == PAGE_SIZE : false,
    });
  } catch (error) {
    vscode.window.showErrorMessage(error.stack);
    panel.webview.postMessage({
      command: "showResults",
      text: error,
    });
  }
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
  handleSearchCommand,
  handleLoadMoreCommand,
  handleResetCommand,
  handleWebviewMessage,
  getWebviewContent,
  executeGitSearch,
};
