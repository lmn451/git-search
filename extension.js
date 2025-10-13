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
let currentCommits = [];
let redraw = false;
let perCommitContextLines = new Map();

const getWorkspace = () => {
  try {
    return vscode.workspace.workspaceFolders[0].uri.fsPath;
  } catch {
    return null;
  }
};

function activate(context) {
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
      break;
    case "copyCommitHash":
      vscode.env.clipboard
        .writeText(message.value)
        .then(() => vscode.window.setStatusBarMessage("Copied commit hash", 1200))
        .catch((err) => vscode.window.showErrorMessage(err?.message || String(err)));
      break;
    case "changeContextLines":
      handleChangeContextLines(message, panel);
      break;
  }
}

async function handleUpdateNumberOfContextLines(message, panel) {
  NUMBER_OF_CONTEXT_LINES = message.value;
  lastCommitDate = "";
  redraw = true;
  isLoadMore = false;
  await executeGitSearch(latestQuery, panel);
}

async function handleChangeContextLines(message, panel) {
  try {
    const commitHash = message.commit;
    const requested = Number(message.value);
    const newValue = Math.max(1, Math.min(50, Number.isFinite(requested) ? requested : NUMBER_OF_CONTEXT_LINES));
    perCommitContextLines.set(commitHash, newValue);

    const workspaceFolderPath = getWorkspace();
    if (!workspaceFolderPath) return;

    const diffOutput = await getDiff(
      workspaceFolderPath,
      commitHash,
      latestQuery,
      newValue
    );

    const highlightedDiff = highlightQueryInHtml(
      escapeHtml(diffOutput),
      escapeHtml(latestQuery)
    );
    const diffHtml = convert.toHtml(highlightedDiff);

    panel.webview.postMessage({
      command: "updateCommitDiff",
      commit: commitHash,
      value: newValue,
      diffHtml,
    });
  } catch (error) {
    vscode.window.showErrorMessage(error.stack || String(error));
  }
}

async function handleSearchCommand(query, panel) {
  if (query !== latestQuery) {
    currentCommits = [];
    perCommitContextLines.clear();
  }
  latestQuery = query;
  isLoadMore = false;
  lastCommitDate = "";
  panel.webview.postMessage({ command: "showResults", text: "Loading" });
  await executeGitSearch(query, panel);
}

async function handleLoadMoreCommand(panel) {
  isLoadMore = true;
  redraw = true;
  await executeGitSearch(latestQuery, panel);
}

function handleResetCommand(panel) {
  latestQuery = "";
  isLoadMore = false;
  lastCommitDate = "";
  currentCommits = [];
  perCommitContextLines.clear();
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

async function executeGitSearch(rawQuery, panel) {
  const query = rawQuery.trim();
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

    if (!redraw || isLoadMore) {
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

      currentCommits.push(...commits);
      lastCommitDate = adjustDate(commits.at(-1).split("|")[2]);
    }

    const diffPromises = currentCommits.map((commitEntry) => {
      const [commitHash, author, commitDate] = commitEntry.split("|");
      const lines = perCommitContextLines.get(commitHash) ?? NUMBER_OF_CONTEXT_LINES;
      return getDiff(
        workspaceFolderPath,
        commitHash,
        query,
        lines
      )
        .then((diffOutput) => ({ commitHash, diffOutput, commitDate, author, lines }))
        .catch((error) => {
          vscode.window.showErrorMessage(error.stack);
          return null; // Continue processing other commits
        });
    });

    const diffResults = await Promise.all(diffPromises);
    const contentArray = diffResults.map((diff) => {
      if (!diff) return "";
      const { commitHash, diffOutput, commitDate, author, lines } = diff;
      const highlightedDiff = highlightQueryInHtml(
        escapeHtml(diffOutput),
        escapeHtml(query)
      );
      const diffHtml = convert.toHtml(highlightedDiff);
      const shortHash = commitHash.slice(0, 7);
      const commitUrl = `${repoUrl}/commit/${commitHash}`;
      return `<li class="commit-diff" data-commit="${commitHash}">
        <div class="commit-header">
          <span class="commit-title">Commit: <a class="commit-link" href="${commitUrl}">${shortHash}</a></span>
          <span class="commit-meta">by ${escapeHtml(author)} at ${formatDate(commitDate)}</span>
          <span class="commit-actions">
            <span class="context-lines" title="Number of context lines">
              <button class="btn-ghost dec-lines" data-commit="${commitHash}" aria-label="Decrease context lines">-</button>
              <span class="lines-count" data-commit="${commitHash}">${lines}</span>
              <button class="btn-ghost inc-lines" data-commit="${commitHash}" aria-label="Increase context lines">+</button>
            </span>
            <button class=\"btn-ghost btn-icon copy-hash\" data-commit=\"${commitHash}\" title=\"Copy commit hash\" aria-label=\"Copy commit hash\">\n              <svg viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M16 1H8v2h8v12h2V3a2 2 0 00-2-2zM14 5H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2zm0 14H6V7h8v12z\"/></svg>\n            </button>\n            <button class=\"btn-ghost btn-icon toggle-diff\" aria-expanded=\"true\" title=\"Collapse/Expand diff\" aria-label=\"Collapse diff\">\n              <svg viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M7 10l5 5 5-5H7z\"/></svg>\n            </button>\n
          </span>
        </div>
        <pre class="diff-body">${diffHtml}</pre>
      </li>`;
    });

    let content = contentArray.join("");
    panel.webview.postMessage({
      command: redraw
        ? "showResults"
        : isLoadMore
        ? "appendResults"
        : "showResults",
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
  getRepoUrl,
};
