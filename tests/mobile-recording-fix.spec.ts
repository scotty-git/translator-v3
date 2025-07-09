import { test, expect } from '@playwright/test'

test.describe('Mobile Recording Fix', () => {
  test('handles recording failure gracefully on mobile', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://127.0.0.1:5173')
    
    // Wait for app to load
    await page.waitForLoadState('networkidle')
    
    // Mock getUserMedia to simulate iOS failure
    await page.addInitScript(() => {
      // Save original getUserMedia
      const originalGetUserMedia = navigator.mediaDevices.getUserMedia
      
      // Override to simulate iOS audio context failure
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        if (constraints.audio) {
          throw new Error('iOS requires user interaction to enable audio recording. Please tap to start recording.')
        }
        return originalGetUserMedia.call(navigator.mediaDevices, constraints)
      }
    })
    
    // Try to start recording
    const recordButton = page.locator('[data-testid="recording-button"]')
    await recordButton.click()
    
    // Check that error is displayed
    await expect(page.locator('text=Failed to start recording')).toBeVisible()
    
    // Check that we can click the button again without errors
    await recordButton.click()
    
    // The button should still be clickable and not throw "no active recording to stop"
    await expect(page.locator('text=no active recording to stop')).not.toBeVisible()
    
    // Take a screenshot
    await page.screenshot({ path: 'test-results/mobile-recording-error-handled.png' })
    
    console.log('✅ Mobile recording error is handled gracefully')
  })
  
  test('successful recording flow still works', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://127.0.0.1:5173')
    
    // Wait for app to load
    await page.waitForLoadState('networkidle')
    
    // Mock successful getUserMedia
    await page.addInitScript(() => {
      // Create a mock MediaStream
      navigator.mediaDevices.getUserMedia = async () => {
        const audioContext = new AudioContext()
        const oscillator = audioContext.createOscillator()
        const destination = audioContext.createMediaStreamDestination()
        oscillator.connect(destination)
        oscillator.start()
        return destination.stream
      }
    })
    
    // Start recording
    const recordButton = page.locator('[data-testid="recording-button"]')
    await recordButton.click()
    
    // Wait a moment for recording to start
    await page.waitForTimeout(500)
    
    // Stop recording (same button)
    await recordButton.click()
    
    // Verify no errors appear
    await expect(page.locator('text=Failed to start recording')).not.toBeVisible()
    await expect(page.locator('text=no active recording to stop')).not.toBeVisible()
    
    console.log('✅ Normal recording flow still works correctly')
  })
})