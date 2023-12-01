const vscode = require("vscode");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const Convert = require("ansi-to-html");
const convert = new Convert();
const sanitize = require("./src/sanitize");
const { adjustDate, formatDate } = require("./src/helpers");

const pageSize = 10;
let latestQuery = "";
let isLoadMore = false;
let lastCommitDate = "";

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
    { enableScripts: true, retainContextWhenHidden: true }
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
  }
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

function getRepoUrl(workspaceFolderPath) {
  return new Promise((resolve, reject) => {
    exec(
      "git config --get remote.origin.url",
      { cwd: workspaceFolderPath },
      (error, stdout, stderr) => {
        if (error || stderr || !stdout) {
          resolve("");
        } else {
          const repoUrl = stdout
            .trim()
            .replace(".git", "")
            .replace("git@github.com:", "https://github.com/");
          resolve(repoUrl);
        }
      }
    );
  });
}

function getWebviewContent() {
  const htmlFilePath = path.join(__dirname, "gitSearchPanel.html");
  return fs.readFileSync(htmlFilePath, "utf8");
}

async function executeGitSearch(query, panel) {
  if (!query.trim()) {
    return panel.webview.postMessage({
      command: "showResults",
      text: "",
    });
  }
  try {
    const workspaceFolderPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const repoUrl = await getRepoUrl(workspaceFolderPath);
    const logCommand = `git log --pretty=format:"%H|%an|%cd" -G"${query}" ${
      lastCommitDate ? `--before="${lastCommitDate}"` : ""
    } -n ${pageSize}`;
    const logOutput = await executeCommand(logCommand, workspaceFolderPath);
    const commits = logOutput.split("\n");
    lastCommitDate = adjustDate(commits.at(-1).split("|")[2]);
    let content = "";
    for (const commitEntry of commits) {
      if (commitEntry.trim() === "") continue;
      const [commitHash, author, commitDate] = commitEntry.split("|");
      const diffCommand = `git diff -U3 --color=always "${commitHash}^!" | grep --color=always -1 "${query}"`;
      const diffOutput = await executeCommand(diffCommand, workspaceFolderPath);
      const diffHtml = convert.toHtml(sanitize(diffOutput));
      content += `<li class="commit-diff">Commit: <a href=${repoUrl}/commit/${commitHash}>${commitHash}</a> by ${author} at ${formatDate(
        commitDate
      )}<br><pre>${diffHtml}</pre></li>`;
    }
    panel.webview.postMessage({
      command: isLoadMore ? "appendResults" : "showResults",
      text: content && `<ul>${content}</ul>`,
      latestQuery,
      isLoadMore: !!content,
    });
  } catch (error) {
    panel.webview.postMessage({
      command: "showResults",
      text: `Error: ${error.message}`,
    });
  }
}

function executeCommand(command, cwd) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) reject(error);
      if (stderr) reject(new Error(stderr));
      resolve(stdout);
    });
  });
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
  handleSearchCommand,
  handleLoadMoreCommand,
  handleResetCommand,
  handleWebviewMessage,
  getRepoUrl,
  getWebviewContent,
  executeGitSearch,
  executeCommand,
};
