const vscode = require("vscode");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const Convert = require("ansi-to-html");
const convert = new Convert({ escapeXML: true });
const sanitize = require("./src/sanitize");

let currentPage = 0;
const pageSize = 10;
let latestQuery = "";
let isLoadMore = false;

function activate(context) {
  let disposable = vscode.commands.registerCommand(
    "git-search.showPanel",
    () => {
      const panel = vscode.window.createWebviewPanel(
        "gitSearch",
        "Git Search",
        vscode.ViewColumn.One,
        { enableScripts: true }
      );

      getRepoUrl().then((repoUrl) => {
        panel.webview.html = getWebviewContent(repoUrl);
      });

      panel.webview.onDidReceiveMessage(
        async (message) => {
          switch (message.command) {
            case "search":
              latestQuery = message.text;
              isLoadMore = false;
              currentPage = 0;
              await executeGitSearch(message.text, panel);
              break;
            case "loadMore":
              currentPage = currentPage + 1;
              isLoadMore = true;
              await executeGitSearch(latestQuery, panel);
              break;
            case "reset":
              latestQuery = "";
              currentPage = 0;
              isLoadMore = false;
              panel.webview.postMessage({ command: "showResults", text: "" });
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

function getWebviewContent(repoUrl) {
  const htmlFilePath = path.join(__dirname, "gitSearchPanel.html");
  let htmlContent = fs.readFileSync(htmlFilePath, "utf8");
  return htmlContent;
}

async function executeGitSearch(query, panel) {
  if (!query.trim()) {
    panel.webview.postMessage({
      command: "showResults",
      text: "Please enter a valid search query.",
    });
    return;
  }

  if (
    !vscode.workspace.workspaceFolders ||
    vscode.workspace.workspaceFolders.length === 0
  ) {
    panel.webview.postMessage({
      command: "showResults",
      text: "No open workspace with a Git repository detected.",
    });
    return;
  }

  const workspaceFolderPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
  const sanitizedQuery = query.replace(/[^a-zA-Z0-9 _-]/g, "");

  try {
    const repoUrl = await getRepoUrl();
    const logCommand = `git log --pretty=format:"%h|%an" -S"${sanitizedQuery}" --skip=${
      currentPage * pageSize
    } -n ${pageSize}`;
    const logOutput = await executeCommand(logCommand, workspaceFolderPath);
    const commits = logOutput.split("\n");

    let content = "<ul>";
    for (const commitEntry of commits) {
      if (commitEntry.trim() === "") continue;
      const [commitHash, author] = commitEntry.split("|");
      const diffCommand = `git diff -U3 --color=always -- '${commitHash}^!' | grep --color=always -1 ${sanitizedQuery}`;
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
      if (error) {
        reject(error);
        return;
      }
      if (stderr) {
        reject(new Error(stderr));
        return;
      }
      resolve(stdout);
    });
  });
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
