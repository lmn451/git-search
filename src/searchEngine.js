const Convert = require("ansi-to-html");
const { adjustDate, formatDate } = require("./helpers");
const { highlightQueryInHtml, escapeHtml } = require("./htmlHelpers");

const convert = new Convert({
  colors: [
    "#000000", // Black
    "#DB7093", // Red
  ],
  stream: true,
});

class SearchEngine {
  constructor(gitCommands, options = {}) {
    this.gitCommands = gitCommands;
    this.pageSize = options.pageSize || 10;
    this.mode = options.mode || "S";
    this.contextLines = options.contextLines || 3;
    this.reset();
  }

  reset() {
    this.latestQuery = "";
    this.isLoadMore = false;
    this.lastCommitDate = "";
    this.currentCommits = [];
    this.redraw = false;
  }

  changeMode(value) {
    if (!(value === "G" || value === "S")) return;
    this.mode = value;
  }

  updateContextLines(lines) {
    this.contextLines = lines;
    this.lastCommitDate = "";
    this.redraw = true;
    this.isLoadMore = false;
  }

  async search(query, workspacePath) {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return { html: "", canLoadMore: false };
    }

    if (query !== this.latestQuery) {
      this.currentCommits = [];
    }
    this.latestQuery = query;
    this.isLoadMore = false;
    this.lastCommitDate = "";

    return this._executeSearch(trimmedQuery, workspacePath);
  }

  async loadMore(workspacePath) {
    this.isLoadMore = true;
    this.redraw = true;
    return this._executeSearch(this.latestQuery, workspacePath);
  }

  async _executeSearch(query, workspacePath) {
    if (!workspacePath) {
      return { html: "No workspace found", canLoadMore: false };
    }

    try {
      const repoUrl = await this.gitCommands.getRepoUrl(workspacePath);

      if (!this.redraw || this.isLoadMore) {
        const logOutput = await this.gitCommands.getRelatedCommitsInfo(
          workspacePath,
          query,
          this.mode,
          this.lastCommitDate,
          this.pageSize
        );

        if (!logOutput) {
          return { html: "No results found", canLoadMore: false };
        }

        const commits = logOutput
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);

        this.currentCommits.push(...commits);
        this.lastCommitDate = adjustDate(commits.at(-1).split("|")[2]);
      }

      const diffPromises = this.currentCommits.map((commitEntry) => {
        const [commitHash, author, commitDate] = commitEntry.split("|");
        return this.gitCommands.getDiff(
          workspacePath,
          commitHash,
          query,
          this.contextLines
        )
          .then((diffOutput) => ({ commitHash, diffOutput, commitDate, author }))
          .catch(() => null); // Continue processing other commits
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

      const content = contentArray.join("");
      const canLoadMore = contentArray.length === this.pageSize;
      
      return {
        html: content || "No results found",
        canLoadMore,
        latestQuery: this.latestQuery,
        isLoadMore: this.isLoadMore || this.redraw
      };
    } catch (error) {
      throw new Error(error.message || error);
    }
  }
}

module.exports = { SearchEngine }; 