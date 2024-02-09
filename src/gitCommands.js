const { executeCommand } = require("./helpers");

async function getRepoUrl(workspaceFolderPath) {
  try {
    const repoUrl = await executeCommand(
      "git config --get remote.origin.url",
      workspaceFolderPath
    );
    // Remove .git from the end if present
    // Convert SSH and Git protocol URLs to HTTPS format
    return repoUrl
      .trim()
      .replace(/\.git$/, "")
      .replace(/^git@github\.com:/, "https://github.com/")
      .replace(/^git@gitlab\.com:/, "https://gitlab.com/")
      .replace(/^git@bitbucket\.org:/, "https://bitbucket.org/")
      .replace(/^ssh:\/\/git@/, "https://")
      .replace(/:(?=[^\/]+)/, "/"); // Replace colon before username/project with a slash
  } catch (e) {
    console.log(e.stack);
    return e;
  }
}

async function getRelatedCommitsInfo(
  workspaceFolderPath,
  query,
  MODE,
  lastCommitDate,
  PAGE_SIZE
) {
  const logCommand = `git log --pretty=format:"%H|%an|%cd" -${MODE}"${query}" ${
    lastCommitDate ? `--before="${lastCommitDate}"` : ""
  } -n ${PAGE_SIZE}`;
  return await executeCommand(logCommand, workspaceFolderPath);
}

async function getRelatedDiffs(workspaceFolderPath, commitHash, query) {
  const diffCommand = `git diff -U3 --color=always "${commitHash}^!" | grep --color=none -1 "${query}"`;
  return await executeCommand(diffCommand, workspaceFolderPath);
}

module.exports = {
  getRepoUrl,
  getRelatedCommitsInfo,
  getRelatedDiffs,
  executeCommand,
};
