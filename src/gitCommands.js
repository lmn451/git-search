const { executeCommand, Queue, Cache } = require("./helpers");
const { gitDelimiter } = require("./consts");
const escapedLineDiffStartsWith = "\u001b";
const NUMBER_OF_DIFF_INFO_LINES = 6;
const boldDiff = `${escapedLineDiffStartsWith}[1`;
const addedDiff = `${escapedLineDiffStartsWith}[31`;
const removedDiff = `${escapedLineDiffStartsWith}[32`;
const lineInfoDiff = `${escapedLineDiffStartsWith}[36`;

async function getRepoUrl(workspaceFolderPath) {
  try {
    const repoUrl = await executeCommand(
      "git config --get remote.origin.url",
      workspaceFolderPath,
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
  PAGE_SIZE,
) {
  const logCommand = `git log --pretty=format:"%H${gitDelimiter}%an${gitDelimiter}%cd${gitDelimiter}%s" -${MODE}"${query}" ${
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

const getLineNumber = (line) => {
  const regex = /\-(\d+),(\d+)/;
  const match = regex.exec(line);
  const startLine = parseInt(match[1], 10);
  const numLines = parseInt(match[2], 10);
  return startLine;
};

async function getDiff(
  workspaceFolderPath,
  commitHash,
  query,
  numberOfGrepContextLines = 3,
  numberOfDiffContextLines = 3,
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

  return parseDiffToMap(diff, commitHash, query, numberOfGrepContextLines);
}

const parseDiffToMap = (diff, commitHash, query, numberOfGrepContextLines) => {
  const lines = diff.split("\n");
  const contextLines = new Queue(numberOfGrepContextLines);
  const fileInfoLines = new Queue(NUMBER_OF_DIFF_INFO_LINES);
  let prevLineWasInfoLine = false;
  let currentFileName = "";
  let currentHunkIdx = 0;
  let currentLine = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    //check if line is bold (meaning info line)
    if (line.startsWith(boldDiff)) {
      fileInfoLines.push(line);
      contextLines.reset();
      prevLineWasInfoLine = true;
      continue;
    }
    if (line.startsWith(lineInfoDiff)) {
      currentLine = getLineNumber(line);
    }
    // check if line is diff (meaning diffed (added/removed) line) and includes query)
    if (
      (line.startsWith(addedDiff) || line.startsWith(removedDiff)) &&
      line.includes(query)
    ) {
      if (prevLineWasInfoLine) {
        currentFileName = getFileNameFromGitInfoLines(...fileInfoLines.get());
        prevLineWasInfoLine = false;
        currentHunkIdx = 0;
      }
      //we dont have a diff lines yet for this file
      if (!results[commitHash][currentFileName]) {
        results[commitHash][currentFileName] = [];
      }
      // we have a diff lines and we want to add here more context lines
      // handle antoher case where line is not diffed
      if (results[commitHash][currentFileName]) {
        results[commitHash][currentFileName][currentHunkIdx] = [];
      }
      const currentHunk = results[commitHash][currentFileName][currentHunkIdx];
      const contextLinesArr = contextLines.get();
      contextLinesArr.forEach((line, index) => {
        currentHunk.push({
          line: currentLine - (contextLinesArr.length - index),
          content: line,
        });
      });
      currentHunk.push({
        content: line,
        line: currentLine,
      });
      let lastAddedLineIdx;
      for (let j = 1; j < numberOfGrepContextLines; j++) {
        if (i + j >= lines.length) {
          lastAddedLineIdx = i + j - 1;
          break;
        }
        currentHunk.push({
          content: lines[i + j],
          line: currentLine + j,
        });
      }
      i += Math.min(lastAddedLineIdx, numberOfGrepContextLines) - 1;
      currentHunkIdx++;
      continue;
    }
    contextLines.push(line);
  }
  // if (!results[commitHash][currentFileName][currentHunkIdx]) {
  //   results[commitHash][currentFileName][currentHunkIdx] = [];
  // }

  // const currentHunk = results[commitHash][currentFileName].at(-1);
  // const contextLinesArr = contextLines.get();
  // contextLinesArr.forEach((line, index) => {
  //   currentHunk.push({
  //     line: currentLine - (contextLinesArr.length - index),
  //     content: line,
  //   });
  // });
  return results;
};

async function getFullDiff(
  workspaceFolderPath,
  commitHash,
  filename,
  numberOfDiffContextLines,
) {
  const diffCommand = `git diff -U${numberOfDiffContextLines} --color=always "${commitHash}^!" -- ${filename}`;
  return await executeCommand(diffCommand, workspaceFolderPath);
}

module.exports = {
  getRepoUrl,
  getRelatedCommitsInfo,
  getDiff,
  getFullDiff,
};
