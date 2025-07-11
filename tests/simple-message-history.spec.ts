import { test, expect } from '@playwright/test'

test('Simple message history test', async ({ page }) => {
  // First, let's manually test if the message history loading is working
  await page.goto('http://127.0.0.1:5173')
  
  // Enable console logging to see what's happening
  page.on('console', msg => {
    if (msg.text().includes('MessageSyncService')) {
      console.log('Console:', msg.text())
    }
  })
  
  // Wait for page to load
  await page.waitForTimeout(2000)
  
  // Take screenshot to see current state
  await page.screenshot({ path: 'test-results/page-loaded.png' })
  
  console.log('Test completed - check console logs above for MessageSyncService activity')
})