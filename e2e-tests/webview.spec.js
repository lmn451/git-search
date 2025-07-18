const { test, expect } = require('@playwright/test');

test('Git Search Webview should load and display search elements', async ({ page }) => {
  // Navigate to the webview URL served by the extension's local server
  await page.goto('http://localhost:3000/gitSearchPanel.html');

  // Wait for the iframe to load
  const iframe = await page.frameLocator('iframe');
  expect(iframe).not.toBeNull();

  // Wait for the search input to be visible within the iframe
  const searchInput = iframe.locator('#searchQuery');
  await expect(searchInput).toBeVisible();

  // Assert that the search button is visible within the iframe
  const searchButton = iframe.locator('#searchBtn');
  await expect(searchButton).toBeVisible();

  // Assert that the reset button is visible within the iframe
  const resetButton = iframe.locator('#resetBtn');
  await expect(resetButton).toBeVisible();
});