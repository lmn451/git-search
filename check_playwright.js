try {
  require('@playwright/test');
  console.log('@playwright/test module found.');
} catch (e) {
  console.error('Error requiring @playwright/test:', e.message);
}