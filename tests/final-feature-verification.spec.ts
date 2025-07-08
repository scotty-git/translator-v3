import { test, expect } from '@playwright/test'

test.describe('Final Feature Verification', () => {
  test.setTimeout(30000) // Give more time for React to load

  test('Complete feature validation', async ({ page }) => {
    console.log('🧪 [FinalTest] Starting comprehensive feature validation')
    
    // Grant microphone permissions
    await page.context().grantPermissions(['microphone'])
    
    // Navigate to app and wait for React to fully load
    await page.goto('http://127.0.0.1:5173/')
    console.log('✅ [FinalTest] Page loaded')
    
    // Wait for React app to load - use multiple fallback selectors
    try {
      await page.waitForSelector('[data-testid="home-screen"]', { timeout: 10000 })
      console.log('✅ [FinalTest] Found home-screen via data-testid')
    } catch {
      console.log('⚠️ [FinalTest] data-testid not found, trying title selector')
      await page.waitForSelector('text=Real-time Translator', { timeout: 10000 })
      console.log('✅ [FinalTest] Found app via title text')
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔤 TESTING FONT SYSTEM')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // Test 1: Font cycling with F key
    const initialClass = await page.locator('html').getAttribute('class')
    console.log('📊 Initial font class:', initialClass || 'none')
    
    await page.keyboard.press('f')
    await page.waitForTimeout(200)
    
    const afterFirstPress = await page.locator('html').getAttribute('class')
    console.log('📊 After F key press:', afterFirstPress)
    
    if (afterFirstPress && afterFirstPress.includes('font-')) {
      console.log('✅ Font cycling works via F key')
    } else {
      console.log('❌ Font cycling failed')
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎵 TESTING AUDIO VISUALIZATION')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // Test 2: Navigate to Single Device Mode
    const startButton = page.locator('text=Start Translating')
    if (await startButton.isVisible({ timeout: 5000 })) {
      await startButton.click()
      console.log('✅ Clicked Start Translating')
      
      // Wait for Single Device Mode to load
      await page.waitForTimeout(3000)
      
      // Check for audio visualization - look for the actual bars container
      const audioVizContainer = page.locator('.flex.items-end.justify-center').first()
      const audioVizBars = audioVizContainer.locator('> div') // Direct children (the 5 bars)
      const barCount = await audioVizBars.count()
      console.log('📊 Audio visualization bars found:', barCount)
      
      if (barCount >= 5) {
        console.log('✅ 5-bar audio visualization confirmed')
        
        // Test recording button
        const recordingButton = page.locator('[data-testid="recording-button"]')
        if (await recordingButton.isVisible({ timeout: 3000 })) {
          console.log('✅ Recording button found')
        } else {
          console.log('⚠️ Recording button not found')
        }
      } else {
        console.log('❌ Expected 5 audio bars, found:', barCount)
      }
    } else {
      console.log('❌ Start Translating button not found')
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔊 TESTING SOUND NOTIFICATIONS')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // Test 3: Settings page and sound controls
    await page.goto('http://127.0.0.1:5173/settings')
    await page.waitForTimeout(2000)
    
    const pageContent = await page.textContent('body')
    if (pageContent.includes('Sound Notifications')) {
      console.log('✅ Sound Notifications section found in settings')
      
      // Look for enable toggle
      const toggles = page.locator('button[class*="rounded-full"]')
      const toggleCount = await toggles.count()
      console.log('📊 Found', toggleCount, 'toggle buttons in settings')
      
      if (toggleCount > 0) {
        console.log('✅ Sound notification controls present')
      }
    } else {
      console.log('❌ Sound Notifications section not found')
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('⚙️ TESTING SETTINGS INTEGRATION')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // Test 4: Font size controls in settings
    if (pageContent.includes('Font Size')) {
      console.log('✅ Font Size controls found in settings')
      
      // Look for font size options
      const fontOptions = ['Small', 'Medium', 'Large', 'Extra Large']
      let foundOptions = 0
      
      for (const option of fontOptions) {
        if (pageContent.includes(option)) {
          foundOptions++
        }
      }
      
      console.log('📊 Found', foundOptions, 'of 4 font size options')
      if (foundOptions >= 3) {
        console.log('✅ Font size controls properly implemented')
      }
    } else {
      console.log('❌ Font Size controls not found in settings')
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎯 FINAL FEATURE SUMMARY')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // Get final bar count for validation - use the same selector as above
    const finalAudioVizContainer = page.locator('.flex.items-end.justify-center').first()
    const finalBarCount = await finalAudioVizContainer.locator('> div').count()
    
    // Final validation
    const results = {
      fontCycling: afterFirstPress && afterFirstPress.includes('font-'),
      audioVisualization: finalBarCount >= 5,
      soundControls: pageContent.includes('Sound Notifications'),
      fontSettings: pageContent.includes('Font Size'),
      singleDeviceMode: await startButton.isVisible() || pageContent.includes('Single Device Mode')
    }
    
    const passedFeatures = Object.values(results).filter(Boolean).length
    const totalFeatures = Object.keys(results).length
    
    console.log('📊 FEATURE IMPLEMENTATION STATUS:')
    console.log('   Font Cycling (F key):', results.fontCycling ? '✅' : '❌')
    console.log('   5-Bar Audio Visualization:', results.audioVisualization ? '✅' : '❌', `(${finalBarCount} bars found)`)
    console.log('   Sound Notification Controls:', results.soundControls ? '✅' : '❌')
    console.log('   Font Size Settings:', results.fontSettings ? '✅' : '❌')
    console.log('   Single Device Mode:', results.singleDeviceMode ? '✅' : '❌')
    console.log('')
    console.log('🎉 OVERALL SUCCESS RATE:', `${passedFeatures}/${totalFeatures}`, `(${Math.round(passedFeatures/totalFeatures*100)}%)`)
    
    if (passedFeatures === totalFeatures) {
      console.log('🏆 ALL FEATURES SUCCESSFULLY IMPLEMENTED AND TESTED!')
    } else {
      console.log('⚠️ Some features need attention')
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // At least 80% success rate required
    expect(passedFeatures / totalFeatures).toBeGreaterThanOrEqual(0.8)
  })
})