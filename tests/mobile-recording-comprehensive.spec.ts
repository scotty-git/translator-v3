import { test, expect } from '@playwright/test'

test.describe('Mobile Recording Comprehensive Test', () => {
  test('Complete mobile recording flow with detailed logging', async ({ page }) => {
    console.log('📱 Starting Mobile Recording Test')
    
    // Set mobile viewport (iPhone 12 Pro)
    await page.setViewportSize({ width: 390, height: 844 })
    console.log('✅ Set mobile viewport (390x844)')
    
    // Navigate to the translator page
    await page.goto('http://127.0.0.1:5173/translator')
    console.log('✅ Navigated to translator page')
    
    // Grant microphone permissions
    await page.context().grantPermissions(['microphone'])
    console.log('✅ Granted microphone permissions')
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle')
    console.log('✅ Page loaded completely')
    
    // Take initial mobile screenshot
    await page.screenshot({ 
      path: 'test-results/mobile-recording-initial.png',
      fullPage: true
    })
    console.log('✅ Initial mobile screenshot taken')
    
    // Wait for recording button to be visible
    console.log('🔍 Waiting for recording button...')
    const recordingButton = await page.waitForSelector('[data-testid="recording-button"]', { 
      timeout: 10000,
      state: 'visible' 
    })
    expect(recordingButton).toBeTruthy()
    console.log('✅ Recording button found and visible')
    
    // Check if button is in viewport
    const buttonBox = await recordingButton.boundingBox()
    console.log('📐 Button position:', buttonBox)
    
    // Take screenshot before clicking
    await page.screenshot({ 
      path: 'test-results/mobile-recording-before-click.png',
      fullPage: true
    })
    
    // Set up console log monitoring
    const consoleLogs: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'log' || msg.type() === 'error') {
        consoleLogs.push(`[${msg.type()}] ${msg.text()}`)
      }
    })
    
    // Use tap instead of click for mobile
    console.log('📱 Tapping recording button to start recording...')
    await recordingButton.tap()
    
    // Wait a moment for the tap to register
    await page.waitForTimeout(1000)
    
    // Check if recording state changed
    await page.screenshot({ 
      path: 'test-results/mobile-recording-after-start-tap.png',
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
      path: 'test-results/mobile-recording-during-recording.png',
      fullPage: true
    })
    
    // Tap to stop recording
    console.log('🛑 Tapping recording button to stop recording...')
    await recordingButton.tap()
    
    // Wait for processing to complete
    await page.waitForTimeout(2000)
    
    // Take screenshot after stop
    await page.screenshot({ 
      path: 'test-results/mobile-recording-after-stop.png',
      fullPage: true
    })
    
    // Wait for message to appear (up to 30 seconds)
    console.log('⏳ Waiting for message to appear...')
    try {
      await page.waitForSelector('.message-bubble', { timeout: 30000 })
      console.log('✅ Message bubble appeared')
      
      // Take final screenshot
      await page.screenshot({ 
        path: 'test-results/mobile-recording-final-with-message.png',
        fullPage: true
      })
    } catch (e) {
      console.log('⚠️ Message bubble did not appear within 30 seconds')
      
      // Take screenshot of final state
      await page.screenshot({ 
        path: 'test-results/mobile-recording-final-no-message.png',
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
    
    // Check for mobile-specific issues
    console.log('📱 Mobile-specific checks:')
    
    // Check if debug console is present
    try {
      const debugConsole = await page.waitForSelector('[data-testid="debug-console"]', { timeout: 2000 })
      if (debugConsole) {
        console.log('✅ Debug console found')
        // Get debug console content
        const debugContent = await debugConsole.textContent()
        console.log('📝 Debug console content:', debugContent?.substring(0, 200) + '...')
      }
    } catch (e) {
      console.log('⚠️ Debug console not found')
    }
    
    console.log('🏁 Mobile Recording Test Complete')
  })
})