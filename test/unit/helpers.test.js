const { strict: assert } = require("assert");
const sinon = require("sinon");
const path = require("path");

require("./setup");

const helpers = require(path.join(__dirname, "..", "..", "src", "helpers"));

describe("helpers.adjustDate", () => {
  it("returns ISO string minus one second", () => {
    const now = new Date("2020-01-01T00:00:10.000Z");
    const out = helpers.adjustDate(now.toISOString());
    assert.equal(typeof out, "string");
    assert.equal(new Date(out).toISOString(), "2020-01-01T00:00:09.000Z");
  });
});

describe("helpers.formatDate", () => {
  it("formats and includes relative time text", () => {
    const clock = sinon.useFakeTimers({ now: new Date("2020-01-01T00:00:00.000Z") });
    try {
      const out = helpers.formatDate("2020-01-01T00:00:00.000Z");
      assert.equal(typeof out, "string");
      assert.ok(/\d{2}\/\d{2}\/\d{4}/.test(out), `expected dd/mm/yyyy in '${out}'`);
      assert.ok(out.includes("approximately"));
    } finally {
      clock.restore();
    }
  });
});

describe("helpers.executeCommand", () => {
  it("resolves stdout on success (node -v)", async () => {
    const out = await helpers.executeCommand("node -v");
    assert.ok(out.trim().startsWith("v"));
  });

  it("rejects when stderr contains data", async () => {
    let error;
    try {
      await helpers.executeCommand("node -e \"process.stderr.write('boom')\"");
    } catch (e) {
      error = e;
    }
    assert.ok(error instanceof Error);
    assert.ok(String(error.message).includes("boom"));
  });

  it("rejects when process exits with error", async () => {
    let error;
    try {
      await helpers.executeCommand("node -e \"process.exit(2)\"");
    } catch (e) {
      error = e;
    }
    assert.ok(error instanceof Error);
  });
});
