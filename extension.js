const vscode = require("vscode");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const Convert = require("ansi-to-html");
const convert = new Convert();
const sanitize = require("./src/sanitize");
const { adjustDate } = require("./src/helpers");

const pageSize = 10;
let latestQuery = "";
let isLoadMore = false;
let lastCommitDate = "";

function activate(context) {
  let disposable = vscode.commands.registerCommand(
    "git-search.showPanel",
    () => {
      const panel = vscode.window.createWebviewPanel(
        "gitSearch",
        "Git Search",
        vscode.ViewColumn.One,
        { enableScripts: true, retainContextWhenHidden: true }
      );
      panel.webview.html = getWebviewContent();
      panel.webview.onDidReceiveMessage(
        async (message) => {
          switch (message.command) {
            case "search":
              latestQuery = message.text;
              isLoadMore = false;
              lastCommitDate = "";
              await executeGitSearch(message.text, panel);
              break;
            case "loadMore":
              isLoadMore = true;
              await executeGitSearch(latestQuery, panel);
              break;
            case "reset":
              latestQuery = "";
              isLoadMore = false;
              lastCommitDate = "";
              panel.webview.postMessage({ command: "reset", text: "" });
              break;
          }
        },
        undefined,
        context.subscriptions
      );
    }
  );
  context.subscriptions.push(disposable);
}

function getRepoUrl() {
  return new Promise((resolve, reject) => {
    if (
      vscode.workspace.workspaceFolders &&
      vscode.workspace.workspaceFolders.length > 0
    ) {
      const workspaceFolderPath =
        vscode.workspace.workspaceFolders[0].uri.fsPath;
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
    } else {
      resolve("");
    }
  });
}

function getWebviewContent() {
  const htmlFilePath = path.join(__dirname, "gitSearchPanel.html");
  let htmlContent = fs.readFileSync(htmlFilePath, "utf8");
  return htmlContent;
}

async function executeGitSearch(query, panel) {
  if (!query.trim()) {
    return panel.webview.postMessage({
      command: "showResults",
      text: "",
    });
  }
  const workspaceFolderPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
  const repoUrl = await getRepoUrl();
  const logCommand = `git log --pretty=format:"%h|%an|%cd" -G"${query}" ${
    lastCommitDate ? `--before="${lastCommitDate}"` : ""
  } -n ${pageSize}`;
  const logOutput = await executeCommand(logCommand, workspaceFolderPath);
  const commits = logOutput.split("\n");
  lastCommitDate = adjustDate(commits.at(-1).split("|")[2]);
  let content = "<ul>";
  for (const commitEntry of commits) {
    if (commitEntry.trim() === "") continue;
    const [commitHash, author, commitDate] = commitEntry.split("|");
    const diffCommand = `git diff -U3 --color=always ${commitHash}^! | grep --color=always -1 "${query}"`;
    const diffOutput = await executeCommand(diffCommand, workspaceFolderPath);
    const diffHtml = convert.toHtml(sanitize(diffOutput));
    content += `<li class="commit-diff">Commit: <a href=${repoUrl}/commit/${commitHash}>${commitHash}</a> by ${author}<br><pre>${diffHtml}</pre></li>`;
  }
  content += "</ul>";
  panel.webview.postMessage({
    command: isLoadMore ? "appendResults" : "showResults",
    text: content,
    latestQuery,
  });
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
};
