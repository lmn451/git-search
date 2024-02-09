const assert = require("assert");
const sinon = require("sinon");
const vscode = require("vscode");
const child_process = require("child_process");
const fs = require("fs");
const extension = require("../../extension");
const { executeCommand } = require("../../src/gitCommands");

describe("Git Search Extension Tests", () => {
  beforeEach(() => {
    sinon.stub(child_process, "exec");
    sinon.stub(fs, "readFileSync");
    sinon.stub(vscode.window, "createWebviewPanel");
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should handle search command correctly", async () => {
    const mockPanel = { webview: { postMessage: sinon.spy() } };
    extension.handleWebviewMessage(
      { command: "search", text: "test query" },
      mockPanel
    );
    assert.ok(
      mockPanel.webview.postMessage.calledWith({
        command: "showResults",
        text: "Loading",
      })
    );
  });

  it("should handle load more command correctly", async () => {
    const mockPanel = { webview: { postMessage: sinon.spy() } };
    extension.handleWebviewMessage({ command: "loadMore" }, mockPanel);
    assert.ok(mockPanel.webview.postMessage.called);
  });

  it("should handle reset command correctly", () => {
    const mockPanel = { webview: { postMessage: sinon.spy() } };
    extension.handleWebviewMessage({ command: "reset" }, mockPanel);
    assert.ok(
      mockPanel.webview.postMessage.calledWith({ command: "reset", text: "" })
    );
  });

  it("should execute Git search and update panel", async () => {
    const mockPanel = { webview: { postMessage: sinon.spy() } };
    child_process.exec.callsArgWith(
      2,
      null,
      "commitHash|authorName|commitDate\n"
    );
    await extension.executeGitSearch("test query", mockPanel);
    assert.ok(mockPanel.webview.postMessage.called);
  });

  xit("should execute command and return result", async () => {
    child_process.exec.callsArgWith(2, null, "output", "");
    const result = await executeCommand("git status", ".");
    assert.equal(result, "output");
  });

  xit("should get repository URL", async () => {
    child_process.exec.callsArgWith(
      2,
      null,
      "git@github.com:user/repo.git",
      ""
    );
    const url = await extension.getRepoUrl(".");
    assert.equal(url, "https://github.com/user/repo");
  });

  it("should load HTML content for Webview", () => {
    fs.readFileSync.returns("<html>Mock Content</html>");
    const content = extension.getWebviewContent();
    assert.ok(content.includes("<html>"));
  });
});
