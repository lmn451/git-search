const {
  getRelatedCommitsInfo,
  getDiff,
  getRepoUrl,
  getFullDiff,
} = require("./gitCommands");
const vscode = require("vscode");
const Convert = require("ansi-to-html");
const { adjustDate, formatDate } = require("./helpers");
const { highlightQueryInHtml, escapeHtml } = require("./htmlHelpers");
const { gitDelimiter } = require("./consts");

const convert = new Convert({
  colors: [
    "#000000", // Black
    "#DB7093", // Red
  ],
  stream: true,
});

const getWorkspace = () => {
  try {
    return vscode.workspace.workspaceFolders[0].uri.fsPath;
  } catch (err) {
    return null;
  }
};

async function executeGitSearch(rawQuery, panel, state) {
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

    if (!state.redraw || state.isLoadMore) {
      const logOutput = await getRelatedCommitsInfo(
        workspaceFolderPath,
        query,
        state.MODE,
        state.lastCommitDate,
        state.PAGE_SIZE,
      );
      if (!logOutput)
        return panel.webview.postMessage({
          command: state.isLoadMore ? "appendResults" : "showResults",
          text: null,
          isLoadMore: false,
        });

      const commits = logOutput
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      state.currentCommits.push(...commits);
      state.lastCommitDate = adjustDate(commits.at(-1).split(gitDelimiter)[2]);
    }

    const results = {};
    const diffPromises = state.currentCommits.map((commitEntry) => {
      const [commitHash, author, commitDate, commitMessage] =
        commitEntry.split(gitDelimiter);
      return getDiff(
        workspaceFolderPath,
        commitHash,
        query,
        results,
        state.NUMBER_OF_CONTEXT_LINES,
      )
        .then((diffOutput) => ({
          commitHash,
          diffOutput,
          commitDate,
          author,
          commitMessage,
        }))
        .catch((error) => {
          vscode.window.showErrorMessage(error.stack);
          return null; // Continue processing other commits
        });
    });

    const diffResults = await Promise.all(diffPromises);
    const contentArray = diffResults.map((diff) => {
      if (!diff) return "";
      const { commitHash, diffOutput, commitDate, author, commitMessage } =
        diff;

      return `<li class="commit-diff">Commit: <a title="${commitHash}" href=${repoUrl}/commit/${commitHash}>
            ${commitMessage}
            </a> by ${author} at ${formatDate(commitDate)}
            ${Object.entries(diffOutput[commitHash])
              .map(
                ([filename, diffs]) =>
                  `<details id='${commitHash}|${filename}'>
                  <summary>${filename}  <button id="dialogBtn" onclick="window.q('${commitHash}', '${filename}')">Show Full Diff</button></summary>
                  <pre>${convert.toHtml(
                    diffs
                      .map((diff) =>
                        highlightQueryInHtml(
                          escapeHtml(diff.join("\n")),
                          escapeHtml(query),
                        ),
                      )
                      .join("\n\n=======\n"),
                  )}</pre>
              </details>`,
              )
              .join("")}
            </li>`;
    });

    let content = contentArray.join("");
    panel.webview.postMessage({
      command: state.redraw
        ? "showResults"
        : state.isLoadMore
          ? "appendResults"
          : "showResults",
      text: content || "No results found",
      latestQuery: state.latestQuery,
      isLoadMore: contentArray ? contentArray.length == state.PAGE_SIZE : false,
    });
  } catch (error) {
    vscode.window.showErrorMessage(error.stack);
    panel.webview.postMessage({
      command: "showResults",
      text: error,
    });
  }
}

async function handleGetFullDiff(message, panel, state) {
  const diff = await getFullDiff(
    getWorkspace(),
    message.commitHash,
    message.filename,
    state.NUMBER_OF_CONTEXT_LINES,
  );
  panel.webview.postMessage({
    command: "showDialog",
    text: `<pre>${convert.toHtml(
      highlightQueryInHtml(escapeHtml(diff), escapeHtml(state.latestQuery)),
    )}</pre>`,
    title: "Full Diff for " + message.commitHash,
  });
}

async function handleUpdateNumberOfContextLines(message, panel, state) {
  await vscode.workspace
    .getConfiguration("git-search")
    .update("numberOfContextLines", message.value, true);
  state.NUMBER_OF_CONTEXT_LINES = message.value;
  state.lastCommitDate = "";
  state.redraw = true;
  state.isLoadMore = false;
  await executeGitSearch(state.latestQuery, panel, state);
}

async function handleSearchCommand(query, panel, state) {
  if (query !== state.latestQuery) {
    state.currentCommits = [];
  }
  state.latestQuery = query;
  state.isLoadMore = false;
  state.lastCommitDate = "";
  panel.webview.postMessage({ command: "showResults", text: "Loading" });
  await executeGitSearch(query, panel, state);
}

async function handleLoadMoreCommand(panel, state) {
  state.isLoadMore = true;
  state.redraw = true;
  await executeGitSearch(state.latestQuery, panel, state);
}

function handleResetCommand(panel, state) {
  state.latestQuery = "";
  state.isLoadMore = false;
  state.lastCommitDate = "";
  state.currentCommits = [];
  panel.webview.postMessage({ command: "reset", text: "" });
}

function handleChangeMode(value, state) {
  if (!(value === "G" || value === "S")) return;
  state.MODE = value;
}

function handleWebviewMessage(message, panel, state) {
  switch (message.command) {
    case "search":
      handleSearchCommand(message.text, panel, state);
      break;
    case "loadMore":
      handleLoadMoreCommand(panel, state);
      break;
    case "reset":
      handleResetCommand(panel, state);
      break;
    case "changeMode":
      handleChangeMode(message.mode, state);
      break;
    case "updateNumberOfContextLines":
      handleUpdateNumberOfContextLines(message, panel, state);
      break;
    case "getFullDiff":
      handleGetFullDiff(message, panel, state);
      break;
  }
}

module.exports = { handleWebviewMessage };
