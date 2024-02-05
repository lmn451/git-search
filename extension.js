const vscode = require("vscode");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const Convert = require("ansi-to-html");
const convert = new Convert({
  colors: [
    "#000000", // Black
    "#DB7093", // Red
    // "#00FF00", // Green
  ],
  stream: true,
});
const sanitize = require("./src/sanitize");
const { adjustDate, formatDate } = require("./src/helpers");

let PAGE_SIZE = 10;
let latestQuery = "";
let isLoadMore = false;
let lastCommitDate = "";
let MODE = "S";

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

function handleChangeMode(value) {
  if (!(value === "G" || value === "S")) return;
  MODE = value;
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
    const logCommand = `git log --pretty=format:"%H|%an|%cd" -${MODE}"${query}" ${
      lastCommitDate ? `--before="${lastCommitDate}"` : ""
    } -n ${PAGE_SIZE}`;
    const logOutput = await executeCommand(logCommand, workspaceFolderPath);
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
      const diffCommand = `git diff -U3 --color=always "${commitHash}^!" | grep --color=always -1 "${query}"`;
      return executeCommand(diffCommand, workspaceFolderPath)
        .then((diffOutput) => {
          return { commitHash, diffOutput, commitDate, author };
        })
        .catch((error) => {
          vscode.window.showInformationMessage(error);
          return null; // Continue processing other commits
        });
    });

    const diffResults = await Promise.all(diffPromises);
    const contentArray = diffResults.map((diff) => {
      if (!diff) return "";
      const { commitHash, diffOutput, commitDate, author } = diff;
      const diffHtml = convert.toHtml(sanitize(diffOutput));
      return `<li class="commit-diff">Commit: <a href=${repoUrl}/commit/${commitHash}>${commitHash}</a> by ${author} at ${formatDate(
        commitDate
      )}<br><pre>${diffHtml}</pre></li>`;
    });

    let content = contentArray.join("");
    panel.webview.postMessage({
      command: isLoadMore ? "appendResults" : "showResults",
      text: content ? `<ul>${content}</ul>` : "No results found",
      latestQuery,
      isLoadMore: contentArray ? contentArray.length == PAGE_SIZE : false,
    });
  } catch (error) {
    panel.webview.postMessage({
      command: "showResults",
      text: `Error: ${error}`,
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
