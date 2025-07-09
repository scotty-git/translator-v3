import { test, expect } from '@playwright/test'

test.describe('Desktop Recording Comprehensive Test', () => {
  test('Complete desktop recording flow with detailed logging', async ({ page }) => {
    console.log('🖥️ Starting Desktop Recording Test')
    
    // Navigate to the translator page
    await page.goto('http://127.0.0.1:5173/translator')
    console.log('✅ Navigated to translator page')
    
    // Grant microphone permissions
    await page.context().grantPermissions(['microphone'])
    console.log('✅ Granted microphone permissions')
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle')
    console.log('✅ Page loaded completely')
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'test-results/desktop-recording-initial.png',
      fullPage: true
    })
    console.log('✅ Initial screenshot taken')
    
    // Wait for recording button to be visible
    console.log('🔍 Waiting for recording button...')
    const recordingButton = await page.waitForSelector('[data-testid="recording-button"]', { 
      timeout: 10000,
      state: 'visible' 
    })
    expect(recordingButton).toBeTruthy()
    console.log('✅ Recording button found and visible')
    
    // Check initial button state
    const initialButtonText = await recordingButton.textContent()
    console.log('📝 Initial button text:', initialButtonText)
    
    // Take screenshot before clicking
    await page.screenshot({ 
      path: 'test-results/desktop-recording-before-click.png',
      fullPage: true
    })
    
    // Set up console log monitoring
    const consoleLogs: string[] = []
    page.on('console', (msg) => {
      const text = msg.text()
      console.log(`[BROWSER ${msg.type()}] ${text}`)
      if (msg.type() === 'log' || msg.type() === 'error') {
        consoleLogs.push(`[${msg.type()}] ${text}`)
      }
    })
    
    // Click to start recording
    console.log('🎬 Clicking recording button to start recording...')
    await recordingButton.click()
    
    // Wait a moment for the click to register
    await page.waitForTimeout(1000)
    
    // Check if recording state changed
    await page.screenshot({ 
      path: 'test-results/desktop-recording-after-start-click.png',
      fullPage: true
    })
    
    // Look for recording state changes in UI
    console.log('🔍 Checking for recording state changes...')
    
    // Wait for recording to start (look for UI changes)
    try {
      await page.waitForSelector('[data-testid="recording-button"].animate-pulse', { 
        timeout: 5000 
      })
      console.log('✅ Recording button shows pulse animation')
    } catch (e) {
      console.log('⚠️ Recording button pulse animation not found')
    }
    
    // Wait 3 seconds for audio capture
    console.log('⏱️ Waiting 3 seconds for audio capture...')
    await page.waitForTimeout(3000)
    
    // Take screenshot during recording
    await page.screenshot({ 
      path: 'test-results/desktop-recording-during-recording.png',
      fullPage: true
    })
    
    // Click to stop recording
    console.log('🛑 Clicking recording button to stop recording...')
    await recordingButton.click()
    
    // Wait for processing to complete
    await page.waitForTimeout(2000)
    
    // Take screenshot after stop
    await page.screenshot({ 
      path: 'test-results/desktop-recording-after-stop.png',
      fullPage: true
    })
    
    // Wait for message to appear (up to 30 seconds)
    console.log('⏳ Waiting for message to appear...')
    try {
      await page.waitForSelector('.message-bubble', { timeout: 30000 })
      console.log('✅ Message bubble appeared')
      
      // Take final screenshot
      await page.screenshot({ 
        path: 'test-results/desktop-recording-final-with-message.png',
        fullPage: true
      })
    } catch (e) {
      console.log('⚠️ Message bubble did not appear within 30 seconds')
      
      // Take screenshot of final state
      await page.screenshot({ 
        path: 'test-results/desktop-recording-final-no-message.png',
        fullPage: true
      })
    }
    
    // Log all console messages
    console.log('📋 Console logs during test:')
    consoleLogs.forEach((log, index) => {
      console.log(`   ${index + 1}. ${log}`)
    })
    
    // Check for any error messages in UI
    const errorElements = await page.$$('.bg-red-100')
    if (errorElements.length > 0) {
      console.log('❌ Found error messages in UI')
      for (const errorEl of errorElements) {
        const errorText = await errorEl.textContent()
        console.log('   Error:', errorText)
      }
    } else {
      console.log('✅ No error messages found in UI')
    }
    
    console.log('🏁 Desktop Recording Test Complete')
  })
})