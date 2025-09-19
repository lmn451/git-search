const { strict: assert } = require("assert");
const sinon = require("sinon");
const path = require("path");

require("./setup");

function prepareWithStubbedHelpers(diffText) {
  const helpersPath = path.join(__dirname, "..", "..", "src", "helpers.js");
  const gitCommandsPath = path.join(__dirname, "..", "..", "src", "gitCommands.js");

  const helpers = require(helpersPath);
  const execStub = sinon.stub(helpers, "executeCommand").callsFake(async () => diffText);

  delete require.cache[require.resolve(gitCommandsPath)];
  const git = require(gitCommandsPath);
  return { git, execStub };
}

describe("gitCommands.getDiff", () => {
  it("parses diff and includes matching lines with context and headers", async () => {
    const ESC = "\u001b";
    const diffOut = [
      `${ESC}[1 diff --git a/file.js b/file.js`,
      `${ESC}[1 --- a/file.js`,
      `${ESC}[1 +++ b/file.js`,
      `${ESC}[1 @@ -1,3 +1,3 @@`,
      " context line 1",
      `${ESC}[3+ new line with term`,
      " context line 2"
    ].join("\n");

    const { git } = prepareWithStubbedHelpers(diffOut);
    const res = await git.getDiff(".", "abcdef", "term", 2, 3);
    assert.ok(typeof res === "string");
    assert.ok(res.includes("new line with term"));
    // Header lines are included; assert presence of filename from header
    assert.ok(res.includes("file.js"));
  });

  it("uses cache to avoid duplicate exec calls for the same commit and context size", async () => {
    const ESC = "\u001b";
    const diffOut = `${ESC}[1 header\n${ESC}[3+ x\n`;

    const helpersPath = path.join(__dirname, "..", "..", "src", "helpers.js");
    const gitCommandsPath = path.join(__dirname, "..", "..", "src", "gitCommands.js");

    const helpers = require(helpersPath);
    const execStub = sinon.stub(helpers, "executeCommand").callsFake(async () => diffOut);

    delete require.cache[require.resolve(gitCommandsPath)];
    const git = require(gitCommandsPath);

    await git.getDiff(".", "abcd", "x", 3, 3);
    await git.getDiff(".", "abcd", "x", 3, 3);

    assert.equal(execStub.callCount, 1);
  });
});
