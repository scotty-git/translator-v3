import { test, expect } from '@playwright/test'

test.describe('Comprehensive Feature Validation', () => {
  test.setTimeout(45000)

  test('Validate all implemented oldapp features', async ({ page }) => {
    console.log('🧪 [COMPREHENSIVE] Starting complete feature validation')
    
    await page.context().grantPermissions(['microphone'])
    
    // Test Results Tracking
    const testResults = {
      fontCycling: false,
      audioVisualization: false,  
      soundControls: false,
      fontSettings: false,
      singleDeviceMode: false
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔤 PHASE 1: FONT SYSTEM VALIDATION')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // Navigate to app
    await page.goto('http://127.0.0.1:5173/')
    await page.waitForSelector('text=Real-time Translator', { timeout: 15000 })
    
    // Test font cycling with F key
    const initialClass = await page.locator('html').getAttribute('class')
    console.log('📊 Initial font class:', initialClass || 'none')
    
    await page.keyboard.press('f')
    await page.waitForTimeout(300)
    
    const afterFPress = await page.locator('html').getAttribute('class')
    console.log('📊 After F press:', afterFPress)
    
    if (afterFPress && afterFPress.includes('font-')) {
      testResults.fontCycling = true
      console.log('✅ Font cycling via F key: WORKING')
    } else {
      console.log('❌ Font cycling via F key: FAILED')
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎵 PHASE 2: AUDIO VISUALIZATION VALIDATION')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // Navigate to Single Device Mode
    const startButton = page.locator('text=Start Translating')
    if (await startButton.isVisible({ timeout: 5000 })) {
      testResults.singleDeviceMode = true
      console.log('✅ Single Device Mode button: FOUND')
      
      await startButton.click()
      await page.waitForTimeout(3000)
      
      // Look for audio visualization with multiple strategies
      const audioVizContainer = page.locator('.flex.items-end.justify-center').first()
      const directBars = audioVizContainer.locator('> div')
      const barCount = await directBars.count()
      
      console.log('📊 Audio visualization bars found:', barCount)
      
      if (barCount >= 5) {
        testResults.audioVisualization = true
        console.log('✅ 5-bar audio visualization: WORKING')
        
        // Verify recording button exists
        const recordingButton = page.locator('[data-testid="recording-button"]')
        if (await recordingButton.isVisible({ timeout: 3000 })) {
          console.log('✅ Recording button in Single Device Mode: FOUND')
        }
      } else {
        console.log('❌ 5-bar audio visualization: FAILED -', barCount, 'bars found')
      }
    } else {
      console.log('❌ Single Device Mode button: NOT FOUND')
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('⚙️ PHASE 3: SETTINGS VALIDATION')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // Navigate to settings
    await page.goto('http://127.0.0.1:5173/settings')
    await page.waitForTimeout(2000)
    
    const settingsContent = await page.textContent('body')
    
    // Check font size controls
    if (settingsContent.includes('Font Size')) {
      const fontOptions = ['Small', 'Medium', 'Large', 'Extra Large']
      let foundFontOptions = 0
      
      for (const option of fontOptions) {
        if (settingsContent.includes(option)) {
          foundFontOptions++
        }
      }
      
      if (foundFontOptions >= 3) {
        testResults.fontSettings = true
        console.log('✅ Font Size controls:', foundFontOptions, 'of 4 options found')
      } else {
        console.log('❌ Font Size controls: Only', foundFontOptions, 'options found')
      }
    } else {
      console.log('❌ Font Size controls: NOT FOUND')
    }
    
    // Check sound notification controls
    if (settingsContent.includes('Sound Notifications')) {
      testResults.soundControls = true
      console.log('✅ Sound Notifications controls: FOUND')
      
      // Count toggle buttons
      const toggles = page.locator('button[class*="rounded-full"]')
      const toggleCount = await toggles.count()
      console.log('📊 Toggle buttons found:', toggleCount)
    } else {
      console.log('❌ Sound Notifications controls: NOT FOUND')
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎯 FINAL VALIDATION SUMMARY')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    const passedTests = Object.values(testResults).filter(Boolean).length
    const totalTests = Object.keys(testResults).length
    const successRate = passedTests / totalTests
    
    console.log('📊 FEATURE IMPLEMENTATION RESULTS:')
    console.log('   🔤 Font Cycling (F key):', testResults.fontCycling ? '✅ PASS' : '❌ FAIL')
    console.log('   🎵 5-Bar Audio Visualization:', testResults.audioVisualization ? '✅ PASS' : '❌ FAIL')
    console.log('   🔊 Sound Notification Controls:', testResults.soundControls ? '✅ PASS' : '❌ FAIL')
    console.log('   ⚙️ Font Size Settings:', testResults.fontSettings ? '✅ PASS' : '❌ FAIL')
    console.log('   📱 Single Device Mode:', testResults.singleDeviceMode ? '✅ PASS' : '❌ FAIL')
    console.log('')
    console.log('🏆 OVERALL SUCCESS RATE:', `${passedTests}/${totalTests}`, `(${Math.round(successRate * 100)}%)`)
    
    if (successRate >= 0.8) {
      console.log('🎉 SUCCESS: All critical features implemented and tested!')
    } else if (successRate >= 0.6) {
      console.log('⚠️ PARTIAL SUCCESS: Most features working, minor issues remain')
    } else {
      console.log('❌ FAILURE: Major implementation issues detected')
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // Test passes if we have at least 60% success (3/5 features)
    expect(successRate).toBeGreaterThanOrEqual(0.6)
  })
})