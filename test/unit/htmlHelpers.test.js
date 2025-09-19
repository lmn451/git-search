const { strict: assert } = require("assert");
const path = require("path");

require("./setup");

const html = require(path.join(__dirname, "..", "..", "src", "htmlHelpers"));

describe("htmlHelpers.escapeHtml", () => {
  it("escapes special characters", () => {
    const input = `<&>"'`;
    const out = html.escapeHtml(input);
    assert.equal(out, "&lt;&amp;&gt;&quot;&#39;");
  });
});

describe("htmlHelpers.highlightQueryInHtml", () => {
  it("wraps case-insensitive matches with span.searched-query", () => {
    const out = html.highlightQueryInHtml("Hello hello", "hello");
    const count = (out.match(/<span class="searched-query">/g) || []).length;
    assert.equal(count, 2);
  });

  it("returns original string when no matches", () => {
    const src = "abc def";
    const out = html.highlightQueryInHtml(src, "xyz");
    assert.equal(out, src);
  });
});
