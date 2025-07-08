import { test } from '@playwright/test';

test('Check translation system behavior', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://127.0.0.1:5173/');
  
  // Take screenshot of initial state
  await page.screenshot({ path: 'test-results/translation-initial.png' });
  
  // Wait for app to load
  await page.waitForTimeout(2000);
  
  // Take another screenshot
  await page.screenshot({ path: 'test-results/translation-loaded.png' });
  
  console.log('✅ Screenshots captured - check test-results folder');
});