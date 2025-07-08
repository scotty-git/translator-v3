import { test, expect } from '@playwright/test'

test.describe('Recording Function Test', () => {
  test('Recording button functionality', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/translator')
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="recording-button"]', { timeout: 10000 })
    
    // Check if recording button is visible and clickable
    const recordingButton = page.locator('[data-testid="recording-button"]')
    await expect(recordingButton).toBeVisible()
    await expect(recordingButton).toBeEnabled()
    
    // Try clicking the recording button
    await recordingButton.click()
    
    console.log('✅ Recording button is clickable')
    
    // Check for any error messages
    const errorMessages = await page.locator('.text-red-600, .text-red-700, .bg-red-100').count()
    console.log(`Found ${errorMessages} error elements on page`)
    
    // Check console for errors
    const logs = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text())
      }
    })
    
    await page.waitForTimeout(2000) // Wait for any async operations
    
    if (logs.length > 0) {
      console.log('Console errors found:', logs)
    }
    
    console.log('✅ Recording function test completed')
  })
})