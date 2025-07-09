import { test, expect } from '@playwright/test'

test('mobile recording error handling', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://127.0.0.1:5173')
  
  // Wait for the recording button to be visible
  await page.waitForSelector('[data-testid="recording-button"]', { timeout: 10000 })
  
  // Mock getUserMedia to fail (simulating iOS error)
  await page.evaluate(() => {
    // Override to simulate iOS audio context failure
    navigator.mediaDevices.getUserMedia = async () => {
      throw new Error('iOS requires user interaction to enable audio recording.')
    }
  })
  
  // Click record button
  const recordButton = page.locator('[data-testid="recording-button"]')
  await recordButton.click()
  
  // Should show error
  await expect(page.locator('text=Failed to start recording')).toBeVisible({ timeout: 5000 })
  
  // Click again - should not throw "no active recording to stop"
  await recordButton.click()
  
  // Verify the specific error we were getting is NOT shown
  const noActiveRecordingError = page.locator('text=no active recording to stop')
  await expect(noActiveRecordingError).not.toBeVisible()
  
  // Take screenshot
  await page.screenshot({ path: 'test-results/mobile-recording-fix-verified.png' })
  
  console.log('✅ Mobile recording error is handled gracefully - no "no active recording to stop" error!')
})