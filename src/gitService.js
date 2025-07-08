const { exec } = require("child_process");
const { promisify } = require("util");
const vscode = require("vscode");

const execPromise = promisify(exec);

/**
 * Gets the file system path of the first workspace folder.
 * @returns {string|null} The path of the workspace folder, or null if none is open.
 */
function getWorkspacePath() {
  const folders = vscode.workspace.workspaceFolders;
  if (folders && folders.length > 0) {
    return folders[0].uri.fsPath;
  }
  // In case of E2E tests, the workspace might be slow to load
  if (vscode.workspace.rootPath) {
    return vscode.workspace.rootPath;
  }
  return null;
}

/**
 * Executes a shell command and returns the output.
 * @param {string} command The command to execute.
 * @param {string} cwd The working directory to run the command in.
 * @returns {Promise<string>} The stdout from the command.
 */
async function executeCommand(command, cwd) {
  try {
    const { stdout, stderr } = await execPromise(command, { cwd });
    if (stderr) {
      console.warn(`Command "${command}" produced stderr: ${stderr}`);
    }
    return stdout.trim();
  } catch (error) {
    console.error(`Error executing command: ${command}`, error);
    vscode.window.showErrorMessage(`Git Search Error: ${error.message}`);
    return ""; // Return empty string on error to prevent breaking the caller
  }
}

/**
 * Retrieves the remote URL of the git repository and formats it for browser access.
 * @param {string} cwd The working directory.
 * @returns {Promise<string|null>} The repository's web URL, or null.
 */
async function getRepoUrl(cwd) {
  try {
    const remoteUrl = await executeCommand(
      "git config --get remote.origin.url",
      cwd,
    );
    if (!remoteUrl) return null;

    // Convert git@ SSH URLs to https://
    if (remoteUrl.startsWith("git@")) {
      return remoteUrl
        .replace(":", "/")
        .replace("git@", "https://")
        .replace(".git", "");
    }

    // Assume http/https URLs are fine, just remove the .git suffix
    if (remoteUrl.startsWith("http")) {
      return remoteUrl.replace(".git", "");
    }

    // Handle other formats if necessary, otherwise return null
    return null;
  } catch (error) {
    console.warn(
      "Could not get repository URL. The project may not have a remote 'origin'.",
      error,
    );
    return null;
  }
}

/**
 * Performs a git log search using the -S (pickaxe) option.
 * @param {object} options
 * @param {string} options.query The search query.
 * @param {string} options.cwd The working directory.
 * @param {number} [options.page=1] The page number for pagination.
 * @param {number} [options.pageSize=50] The number of results per page.
 * @returns {Promise<string>} The formatted git log output.
 */
async function searchGitLog({ query, cwd, page = 1, pageSize = 50 }) {
  if (!query) {
    return "";
  }
  const offset = (page - 1) * pageSize;
  // Using a specific format for easy parsing later.
  // %H: commit hash, %an: author name, %cr: committer date, relative
  const command = `git log -S"${query}" --format="%H|%an|%cr" --skip=${offset} -n${pageSize}`;
  return executeCommand(command, cwd);
}

module.exports = {
  getWorkspacePath,
  getRepoUrl,
  searchGitLog,
};
