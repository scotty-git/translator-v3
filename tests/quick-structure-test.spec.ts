import { test } from '@playwright/test'

test('Check page structure', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173')
  
  // Take screenshot
  await page.screenshot({ path: 'test-results/homepage.png' })
  
  // Log all buttons
  const buttons = await page.locator('button').allTextContents()
  console.log('Buttons found:', buttons)
  
  // Log any visible text
  const texts = await page.locator('text=/.*Session.*/').allTextContents()
  console.log('Session texts found:', texts)
})