function highlightQueryInHtml(html, query) {
  // const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"); // Escape special regex characters
  const queryRegex = new RegExp(query, "gi"); // Case insensitive search

  // Replace all instances of the query with a highlighted version
  return html.replace(
    queryRegex,
    (match) => `<span class="searched-query">${match}</span>`
  );
}

module.exports = {
  highlightQueryInHtml,
};
