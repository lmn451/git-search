const { strict: assert } = require("assert");
const sinon = require("sinon");
const path = require("path");

require("./setup");

function prepareWithStubbedHelpers(execImpl) {
  const helpersPath = path.join(__dirname, "..", "..", "src", "helpers.js");
  const gitCommandsPath = path.join(__dirname, "..", "..", "src", "gitCommands.js");

  const helpers = require(helpersPath);
  const seen = { cmd: null };
  sinon.stub(helpers, "executeCommand").callsFake(async (cmd) => {
    seen.cmd = cmd;
    return "abc|author|2020-01-01T00:00:00Z\n";
  });

  delete require.cache[require.resolve(gitCommandsPath)];
  const git = require(gitCommandsPath);
  return { git, seen };
}

describe("gitCommands.getRelatedCommitsInfo", () => {
  it("composes git log command with S mode and count", async () => {
    const { git, seen } = prepareWithStubbedHelpers();
    const res = await git.getRelatedCommitsInfo(".", "symbol", "S", "", 5);
    assert.equal(typeof res, "string");
    assert.ok(seen.cmd.includes("git log"));
    assert.ok(seen.cmd.includes("-S\"symbol\""));
    assert.ok(seen.cmd.includes("-n 5"));
    assert.ok(!seen.cmd.includes("--before="));
  });

  it("includes --before when lastCommitDate is provided", async () => {
    const { git, seen } = prepareWithStubbedHelpers();
    await git.getRelatedCommitsInfo(".", "sym", "G", "2020-01-02T00:00:00Z", 3);
    assert.ok(seen.cmd.includes("-G\"sym\""));
    assert.ok(seen.cmd.includes("--before=\"2020-01-02T00:00:00Z\""));
  });
});
