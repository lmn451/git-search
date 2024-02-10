module.exports = {
  escapeHtml: function sanitize(str) {
    return str.replace(/[&<>"']/g, (match) => {
      const escape = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return escape[match];
    });
  },
  highlightQueryInHtml: function highlightQueryInHtml(html, query) {
    // const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"); // Escape special regex characters
    const queryRegex = new RegExp(query, "gi"); // Case insensitive search

    // Replace all instances of the query with a highlighted version
    return html.replace(
      queryRegex,
      (match) => `<span class="searched-query">${match}</span>`
    );
  },
};
