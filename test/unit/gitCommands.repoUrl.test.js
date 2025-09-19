const { strict: assert } = require("assert");
const sinon = require("sinon");
const path = require("path");

require("./setup");

function prepareWithStubbedHelpers(execImpl) {
  // Clear cached gitCommands before requiring
  const helpersPath = path.join(__dirname, "..", "..", "src", "helpers.js");
  const gitCommandsPath = path.join(__dirname, "..", "..", "src", "gitCommands.js");

  // Load helpers and stub executeCommand before requiring gitCommands
  const helpers = require(helpersPath);
  sinon.stub(helpers, "executeCommand").callsFake(execImpl);

  delete require.cache[require.resolve(gitCommandsPath)];
  const git = require(gitCommandsPath);
  return { git, helpers };
}

describe("gitCommands.getRepoUrl", () => {
  it("normalizes SSH URL to https without .git", async () => {
    const { git } = prepareWithStubbedHelpers(async () => "git@github.com:user/repo.git\n");
    const url = await git.getRepoUrl(".");
    assert.equal(url, "https://github.com/user/repo");
  });

  it("normalizes HTTPS URL and strips .git", async () => {
    const { git } = prepareWithStubbedHelpers(async () => "https://github.com/user/repo.git\n");
    const url = await git.getRepoUrl(".");
    assert.equal(url, "https://github.com/user/repo");
  });

  it("returns Error object on failure", async () => {
    const { git } = prepareWithStubbedHelpers(async () => { throw new Error("no remote"); });
    const url = await git.getRepoUrl(".");
    assert.ok(url instanceof Error);
  });
});
