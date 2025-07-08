const vscode = require("vscode");
const { store } = require("alien-signals");

const defaultState = {
  PAGE_SIZE: 100,
  MODE: "S",
  NUMBER_OF_CONTEXT_LINES: 3,
  latestQuery: "",
  isLoadMore: false,
  lastCommitDate: "",
  currentCommits: [],
  redraw: false,
};

function createState() {
  const config = vscode.workspace.getConfiguration("git-search");
  const initialState = {
    ...defaultState,
    PAGE_SIZE: config.get("pageSize"),
    NUMBER_OF_CONTEXT_LINES: config.get("numberOfContextLines"),
  };
  return store(initialState);
}

module.exports = { createState };
