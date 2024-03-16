const { executeCommand, Queue, Cache } = require("./helpers");
const escapedLineDiffStartsWith = "\u001b";
const NUMBER_OF_DIFF_INFO_LINES = 4;
const boldDiff = `${escapedLineDiffStartsWith}[1`;
const changedDiff = `${escapedLineDiffStartsWith}[3`;

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
  const logCommand = `git log --pretty=format:"%H|%an|%cd|%s" -${MODE}"${query}" ${
    lastCommitDate ? `--before="${lastCommitDate}"` : ""
  } -n ${PAGE_SIZE}`;
  return await executeCommand(logCommand, workspaceFolderPath);
}

const cache = new Cache();

const results = {};

const getFileNameFromGitInfoLines = (...diffInfoLines) => {
  let prefixA = "--- a/";
  let prefixB = "+++ b/";
  let filename = null;

  for (const line of diffInfoLines) {
    // Replace common ANSI codes that might be used for bold text. You may need to
    // extend this list based on the actual ANSI codes used in your environment.
    const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, "");

    if (cleanLine.startsWith(prefixA)) {
      filename = cleanLine.slice(prefixA.length);
      if (filename === "/dev/null") {
        filename = null;
      } else {
        break; // Stop if we find the filename after '--- a/'
      }
    } else if (cleanLine.startsWith(prefixB)) {
      filename = cleanLine.slice(prefixB.length);
      if (filename !== "/dev/null") {
        break; // Stop if we find the filename after '+++ b/'
      }
    }
  }

  return filename;
};

async function getDiff(
  workspaceFolderPath,
  commitHash,
  query,
  numberOfGrepContextLines = 3,
  numberOfDiffContextLines = 3
) {
  const diffCacheKey = `${commitHash}_${numberOfDiffContextLines}`;
  if (!results[commitHash]) {
    results[commitHash] = {};
  }
  let diff = cache.get(diffCacheKey);
  if (!diff) {
    const diffCommand = `git diff -U${numberOfDiffContextLines} --color=always "${commitHash}^!"`;
    diff = await executeCommand(diffCommand, workspaceFolderPath);
    cache.set(diffCacheKey, diff);
  }
  const lines = diff.split("\n");
  const contextLines = new Queue(numberOfGrepContextLines);
  const fileInfoLines = new Queue(NUMBER_OF_DIFF_INFO_LINES);
  let prevLineWasInfoLine = false;
  let currentFileName = "";
  for (const line of lines) {
    //check if line is bold (meaning info line)
    if (line.startsWith(boldDiff)) {
      fileInfoLines.push(line);
      contextLines.reset();
      prevLineWasInfoLine = true;
      continue;
    }
    // check if line is diff (meaning diffed (added/removed) line) and includes query)
    if (line.startsWith(changedDiff) && line.includes(query)) {
      if (prevLineWasInfoLine) {
        currentFileName = getFileNameFromGitInfoLines(...fileInfoLines.get());
        prevLineWasInfoLine = false;
      }
      //we dont have a diff lines yet for this file
      if (!results[commitHash][currentFileName]) {
        results[commitHash][currentFileName] = [];
      }
      //we have a diff lines and we want to add here more context lines
      if (results[commitHash][currentFileName][0]) {
        results[commitHash][currentFileName] = [];
      }
      results[commitHash][currentFileName].push(...contextLines.get());
      results[commitHash][currentFileName].push(line);
      continue;
    }
    contextLines.push(line);
  }
  results[commitHash][currentFileName].push(...contextLines.get());
  console.log(results);
  return results;
}

module.exports = {
  getRepoUrl,
  getRelatedCommitsInfo,
  getDiff,
};
