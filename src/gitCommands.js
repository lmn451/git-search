const { executeCommand, Queue, Cache } = require("./helpers");
const escapedLineDiffStartsWith = "\u001b";
const NUMBER_OF_DIFF_INFO_LINES = 4;

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

const cache = new Cache();

async function getDiff(
  workspaceFolderPath,
  commitHash,
  query,
  numberOfGrepContextLines = 3,
  numberOfDiffContextLines = 3
) {
  const resultsLines = [];
  let diff = cache.get(`${commitHash}_${numberOfDiffContextLines}`);
  if (!diff) {
    const diffCommand = `git diff  -U${numberOfDiffContextLines} --color=always "${commitHash}^!"`;
    diff = await executeCommand(diffCommand, workspaceFolderPath);
    cache.set(`${commitHash}_${numberOfDiffContextLines}`, diff);
  }
  const lines = diff.split("\n");
  const contextLines = new Queue(numberOfGrepContextLines);
  const fileInfoLines = new Queue(NUMBER_OF_DIFF_INFO_LINES);
  for (const line of lines) {
    //check if line is bold (meaning info line)
    if (line.startsWith(`${escapedLineDiffStartsWith}[1`)) {
      fileInfoLines.push(line);
      contextLines.reset();
      continue;
    }
    // check if line is diff (meaning diffed (added/removed) line) and includes query)
    if (
      line.startsWith(`${escapedLineDiffStartsWith}[3`) &&
      line.includes(query)
    ) {
      resultsLines.push(...fileInfoLines.get());
      resultsLines.push(...contextLines.get());
      resultsLines.push(line);
      continue;
    }
    contextLines.push(line);
  }
  resultsLines.push(...contextLines.get());
  return resultsLines.join("\n");
}

module.exports = {
  getRepoUrl,
  getRelatedCommitsInfo,
  getDiff,
};
