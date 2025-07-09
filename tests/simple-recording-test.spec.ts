import { test, expect } from '@playwright/test'

test.describe('Simple Recording Test', () => {
  test('Check if recording button exists and is clickable', async ({ page }) => {
    console.log('🧪 Starting Simple Recording Test')
    
    // Navigate to the translator page
    await page.goto('http://127.0.0.1:5173/translator')
    console.log('✅ Navigated to translator page')
    
    // Grant microphone permissions
    await page.context().grantPermissions(['microphone'])
    console.log('✅ Granted microphone permissions')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    console.log('✅ Page loaded')
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/simple-test-initial.png' })
    
    // Find recording button
    const recordingButton = await page.waitForSelector('[data-testid="recording-button"]', { timeout: 10000 })
    expect(recordingButton).toBeTruthy()
    console.log('✅ Recording button found')
    
    // Check button properties
    const isVisible = await recordingButton.isVisible()
    const isEnabled = await recordingButton.isEnabled()
    console.log('📊 Button state:', { isVisible, isEnabled })
    
    // Click the button
    console.log('🖱️ Clicking recording button...')
    await recordingButton.click()
    
    // Wait a moment
    await page.waitForTimeout(2000)
    
    // Take screenshot after click
    await page.screenshot({ path: 'test-results/simple-test-after-click.png' })
    
    console.log('✅ Test completed')
  })
})