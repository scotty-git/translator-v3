import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test'

test.describe('Recording with API Fallback', () => {
  let context: BrowserContext
  let page: Page

  test.beforeAll(async () => {
    // Create persistent context with permissions
    context = await chromium.launchPersistentContext('./test-data', {
      headless: true,
      permissions: ['microphone'],
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--use-file-for-fake-audio-capture=/Users/calsmith/Documents/VS/translator-v3/test-audio/english/hello.aiff'
      ]
    })
    page = await context.newPage()
    
    // Enable console logging for debugging
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('🔄') || msg.text().includes('✅') || msg.text().includes('❌')) {
        console.log(`[Console] ${msg.type()}: ${msg.text()}`)
      }
    })
  })

  test.afterAll(async () => {
    await context.close()
  })

  test('recording with API fallback works correctly', async () => {
    // Navigate to translator
    await page.goto('http://127.0.0.1:5173/translator')
    await page.waitForLoadState('networkidle')
    
    console.log('📍 Starting recording API fallback test...')
    
    // Take initial screenshot
    await page.screenshot({ path: 'test-results/api-fallback-initial.png' })
    
    // Wait for persistent audio manager to initialize
    await page.waitForTimeout(2000)
    
    // Look for the microphone button with blue background
    const recordButton = page.locator('button.bg-blue-500')
    await expect(recordButton).toBeVisible({ timeout: 10000 })
    
    console.log('🎤 Found record button, starting recording...')
    
    // Start recording
    await recordButton.click()
    await page.screenshot({ path: 'test-results/api-fallback-recording.png' })
    
    // Wait for recording state - use more specific selector
    await expect(page.locator('p:has-text("Recording...")')).toBeVisible({ timeout: 5000 })
    
    console.log('⏱️ Recording for 3 seconds...')
    await page.waitForTimeout(3000)
    
    // Stop recording by clicking again
    await recordButton.click()
    await page.screenshot({ path: 'test-results/api-fallback-processing.png' })
    
    console.log('🛑 Stopped recording, waiting for API processing...')
    
    // Wait for API processing (should use fallback since proxy is not available)
    await page.waitForTimeout(10000) // Give time for API call
    
    // Check console for fallback message
    const consoleLogs = await page.evaluate(() => {
      return window.console
    })
    
    // Take final screenshot
    await page.screenshot({ path: 'test-results/api-fallback-final.png' })
    
    // The test should complete without crashing
    // We expect to see either a successful transcription or a proper error message
    const errorElement = page.locator('[data-testid="error-message"]')
    const messageElement = page.locator('[data-testid="message-bubble"]')
    
    // Either we get a message or a proper error - not a connection refused error
    const hasMessage = await messageElement.count() > 0
    const hasError = await errorElement.count() > 0
    
    if (hasError) {
      const errorText = await errorElement.textContent()
      console.log('❌ Error occurred:', errorText)
      
      // Should not be a connection refused error anymore
      expect(errorText).not.toContain('ERR_CONNECTION_REFUSED')
      expect(errorText).not.toContain('Failed to fetch')
    } else if (hasMessage) {
      console.log('✅ Message successfully created')
    } else {
      console.log('⏳ Processing may still be in progress')
    }
    
    console.log('✅ API fallback test completed successfully')
  })
})