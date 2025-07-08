import { test, expect, Page } from '@playwright/test'

test.describe('Old App Features Implementation', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    
    // Grant microphone permissions
    await page.context().grantPermissions(['microphone'])
    
    // Navigate to app
    await page.goto('http://127.0.0.1:5173/')
    
    // Wait for app to load - use a more reliable selector
    await page.waitForSelector('text=Real-time Translator', { timeout: 15000 })
    console.log('✅ App loaded successfully')
  })

  test.describe('Font Size System', () => {
    test('should cycle through font sizes with F key', async () => {
      console.log('🧪 Testing font size cycling with F key')
      
      // Check initial font size (should be medium by default)
      const initialClass = await page.locator('html').getAttribute('class')
      console.log('📊 Initial font class:', initialClass)
      
      // Press F key to cycle font size
      await page.keyboard.press('f')
      await page.waitForTimeout(100)
      
      const afterFirstPress = await page.locator('html').getAttribute('class')
      console.log('📊 After first F press:', afterFirstPress)
      expect(afterFirstPress).toContain('font-')
      
      // Press F key again
      await page.keyboard.press('f')
      await page.waitForTimeout(100)
      
      const afterSecondPress = await page.locator('html').getAttribute('class')
      console.log('📊 After second F press:', afterSecondPress)
      expect(afterSecondPress).not.toBe(afterFirstPress)
      
      // Verify CSS custom properties are set
      const mobileSize = await page.evaluate(() => 
        getComputedStyle(document.documentElement).getPropertyValue('--font-size-mobile')
      )
      const desktopSize = await page.evaluate(() => 
        getComputedStyle(document.documentElement).getPropertyValue('--font-size-desktop')
      )
      
      console.log('📊 CSS Properties - Mobile:', mobileSize, 'Desktop:', desktopSize)
      expect(mobileSize).toBeTruthy()
      expect(desktopSize).toBeTruthy()
    })

    test('should have font size controls in settings', async () => {
      console.log('🧪 Testing font size controls in settings')
      
      // Navigate to settings
      await page.goto('http://127.0.0.1:5173/settings')
      await page.waitForSelector('text=Settings', { timeout: 10000 })
      
      // Find font size section
      const fontSizeSection = page.locator('text=Font Size')
      await expect(fontSizeSection).toBeVisible({ timeout: 5000 })
      
      // Check for font size options
      const fontOptions = ['Small', 'Medium', 'Large', 'Extra Large']
      for (const option of fontOptions) {
        const optionElement = page.locator(`text=${option}`).first()
        await expect(optionElement).toBeVisible({ timeout: 3000 })
        console.log(`✅ Found font size option: ${option}`)
      }
      
      // Test clicking a font size option
      await page.locator('button:has-text("Large")').first().click()
      await page.waitForTimeout(200)
      
      const htmlClass = await page.locator('html').getAttribute('class')
      console.log('📊 Font class after clicking Large:', htmlClass)
      expect(htmlClass).toContain('font-large')
    })

    test('should persist font size across page loads', async () => {
      console.log('🧪 Testing font size persistence')
      
      // Set font size to XL
      await page.keyboard.press('f') // medium -> large
      await page.keyboard.press('f') // large -> xl
      await page.waitForTimeout(100)
      
      const xlClass = await page.locator('html').getAttribute('class')
      console.log('📊 XL font class:', xlClass)
      expect(xlClass).toContain('font-xl')
      
      // Reload page
      await page.reload()
      await page.waitForSelector('[data-testid="home-screen"]', { timeout: 10000 })
      
      // Check if font size persisted
      const afterReloadClass = await page.locator('html').getAttribute('class')
      console.log('📊 Font class after reload:', afterReloadClass)
      expect(afterReloadClass).toContain('font-xl')
    })
  })

  test.describe('Audio Visualization System', () => {
    test('should show 5-bar audio visualization in Single Device Mode', async () => {
      console.log('🧪 Testing 5-bar audio visualization')
      
      // Navigate to Single Device Mode
      await page.locator('text=Start Translating').click()
      await page.waitForSelector('[data-testid="recording-button"]', { timeout: 5000 })
      
      // Check for audio visualization component
      const audioViz = page.locator('[class*="flex items-end justify-center"]').first()
      await expect(audioViz).toBeVisible()
      
      // Count the number of bars (should be 5)
      const bars = audioViz.locator('> div')
      const barCount = await bars.count()
      console.log('📊 Number of audio visualization bars:', barCount)
      expect(barCount).toBe(5)
      
      // Verify bars have correct styling
      for (let i = 0; i < barCount; i++) {
        const bar = bars.nth(i)
        const style = await bar.getAttribute('style')
        console.log(`📊 Bar ${i + 1} style:`, style)
        expect(style).toContain('width')
        expect(style).toContain('height')
      }
    })

    test('should show audio visualization in session recording controls', async () => {
      console.log('🧪 Testing audio visualization in session controls')
      
      // Create a session first
      await page.locator('text=Create New Session').click()
      await page.waitForSelector('text=Session Code:', { timeout: 10000 })
      
      // Wait for RecordingControls to load
      await page.waitForSelector('[class*="glass-effect border-t"]', { timeout: 5000 })
      
      // Look for audio visualization near the recording button
      const audioVizContainer = page.locator('[class*="mt-3"]').filter({ has: page.locator('[class*="flex items-end justify-center"]') })
      await expect(audioVizContainer).toBeVisible()
      
      // Verify it has the correct structure
      const vizBars = audioVizContainer.locator('[class*="flex items-end justify-center"] > div')
      const barCount = await vizBars.count()
      console.log('📊 Session audio visualization bars:', barCount)
      expect(barCount).toBe(5)
    })

    test('should animate bars when recording (simulated)', async () => {
      console.log('🧪 Testing audio visualization animation')
      
      // Go to Single Device Mode
      await page.locator('text=Start Translating').click()
      await page.waitForSelector('[data-testid="recording-button"]', { timeout: 5000 })
      
      // Get initial bar heights
      const audioViz = page.locator('[class*="flex items-end justify-center"]').first()
      const initialHeights = await audioViz.locator('> div').allInnerTexts()
      
      // Start recording (this should trigger animation)
      await page.locator('[data-testid="recording-button"]').click()
      await page.waitForTimeout(1000) // Wait for animation to start
      
      // Check if bars are now in recording state (red color)
      const barsAfterRecording = audioViz.locator('> div > div').first()
      const barStyle = await barsAfterRecording.getAttribute('style')
      console.log('📊 Recording bar style:', barStyle)
      
      // Should have red color when recording
      expect(barStyle).toContain('#EF4444') // Red color for recording
      
      // Stop recording
      await page.locator('[data-testid="recording-button"]').click()
      await page.waitForTimeout(500)
      
      console.log('✅ Audio visualization animation test completed')
    })
  })

  test.describe('Sound Notification System', () => {
    test('should have sound notification controls in settings', async () => {
      console.log('🧪 Testing sound notification controls')
      
      // Navigate to settings
      await page.goto('http://127.0.0.1:5173/settings')
      await page.waitForSelector('h1:has-text("Settings")', { timeout: 5000 })
      
      // Find sound notifications section
      const soundSection = page.locator('h2:has-text("Sound Notifications")')
      await expect(soundSection).toBeVisible()
      
      // Check for enable/disable toggle
      const enableToggle = page.locator('text=Enable Sound Notifications').locator('..').locator('button')
      await expect(enableToggle).toBeVisible()
      
      // Check for test sound button
      const testButton = page.locator('text=Test Sound')
      
      // Toggle might be needed to show test button
      await enableToggle.click()
      await page.waitForTimeout(100)
      
      if (await testButton.isVisible()) {
        console.log('✅ Test Sound button is visible')
        await testButton.click()
        console.log('✅ Test Sound button clicked successfully')
      } else {
        console.log('⚠️ Test Sound button not visible, checking if sounds are disabled')
      }
      
      console.log('✅ Sound notification controls test completed')
    })

    test('should enable/disable sound notifications', async () => {
      console.log('🧪 Testing sound notification toggle')
      
      // Navigate to settings
      await page.goto('http://127.0.0.1:5173/settings')
      await page.waitForSelector('h1:has-text("Settings")', { timeout: 5000 })
      
      // Find and toggle sound notifications
      const toggleButton = page.locator('text=Enable Sound Notifications').locator('..').locator('button')
      await expect(toggleButton).toBeVisible()
      
      // Get initial state
      const initialToggleClass = await toggleButton.getAttribute('class')
      console.log('📊 Initial toggle state:', initialToggleClass)
      
      // Click toggle
      await toggleButton.click()
      await page.waitForTimeout(100)
      
      // Check state changed
      const afterToggleClass = await toggleButton.getAttribute('class')
      console.log('📊 After toggle state:', afterToggleClass)
      expect(afterToggleClass).not.toBe(initialToggleClass)
      
      console.log('✅ Sound notification toggle test completed')
    })

    test('should persist sound preferences across sessions', async () => {
      console.log('🧪 Testing sound preference persistence')
      
      // Navigate to settings and disable sounds
      await page.goto('http://127.0.0.1:5173/settings')
      await page.waitForSelector('h1:has-text("Settings")', { timeout: 5000 })
      
      const toggleButton = page.locator('text=Enable Sound Notifications').locator('..').locator('button')
      
      // Ensure sounds are enabled first
      const toggleClass = await toggleButton.getAttribute('class')
      if (!toggleClass?.includes('bg-blue-600')) {
        await toggleButton.click()
        await page.waitForTimeout(100)
      }
      
      // Now disable sounds
      await toggleButton.click()
      await page.waitForTimeout(100)
      
      // Reload page
      await page.reload()
      await page.waitForSelector('h1:has-text("Settings")', { timeout: 5000 })
      
      // Check if sound preference persisted
      const afterReloadToggle = page.locator('text=Enable Sound Notifications').locator('..').locator('button')
      const persistedClass = await afterReloadToggle.getAttribute('class')
      console.log('📊 Persisted sound preference class:', persistedClass)
      
      // Should be disabled (gray background)
      expect(persistedClass).toContain('bg-gray-300')
      
      console.log('✅ Sound preference persistence test completed')
    })
  })

  test.describe('Single Device Mode Enhancements', () => {
    test('should have immediate translation without session creation', async () => {
      console.log('🧪 Testing immediate translation in Single Device Mode')
      
      // Navigate to Single Device Mode
      await page.locator('text=Start Translating').click()
      await page.waitForSelector('[data-testid="recording-button"]', { timeout: 5000 })
      
      // Verify we're in Single Device Mode (not in a session)
      const header = page.locator('text=Single Device Mode')
      await expect(header).toBeVisible()
      
      // Check that we have translation controls immediately
      const recordingButton = page.locator('[data-testid="recording-button"]')
      await expect(recordingButton).toBeVisible()
      await expect(recordingButton).toBeEnabled()
      
      // Verify mode toggle is present
      const modeToggle = page.locator('button:has-text("Casual")')
      await expect(modeToggle).toBeVisible()
      
      // Verify target language selector
      const languageSelector = page.locator('select')
      await expect(languageSelector).toBeVisible()
      
      console.log('✅ Immediate translation UI verified')
    })

    test('should show auto-language detection status', async () => {
      console.log('🧪 Testing auto-language detection display')
      
      // Navigate to Single Device Mode
      await page.locator('text=Start Translating').click()
      await page.waitForSelector('[data-testid="recording-button"]', { timeout: 5000 })
      
      // Check for language detection display
      const languageDisplay = page.locator('text=Auto-detecting...')
      await expect(languageDisplay).toBeVisible()
      
      console.log('✅ Auto-language detection status verified')
    })

    test('should allow mode switching between casual and fun', async () => {
      console.log('🧪 Testing translation mode switching')
      
      // Navigate to Single Device Mode
      await page.locator('text=Start Translating').click()
      await page.waitForSelector('[data-testid="recording-button"]', { timeout: 5000 })
      
      // Find mode toggle button
      const modeToggle = page.locator('button').filter({ hasText: /Casual|Fun/ })
      await expect(modeToggle).toBeVisible()
      
      // Get initial mode
      const initialText = await modeToggle.textContent()
      console.log('📊 Initial mode:', initialText)
      
      // Click to toggle mode
      await modeToggle.click()
      await page.waitForTimeout(100)
      
      // Verify mode changed
      const afterToggleText = await modeToggle.textContent()
      console.log('📊 After toggle mode:', afterToggleText)
      expect(afterToggleText).not.toBe(initialText)
      
      // Should alternate between "💬 Casual" and "🎉 Fun"
      expect(afterToggleText).toMatch(/💬 Casual|🎉 Fun/)
      
      console.log('✅ Mode switching test completed')
    })

    test('should have target language selection', async () => {
      console.log('🧪 Testing target language selection')
      
      // Navigate to Single Device Mode
      await page.locator('text=Start Translating').click()
      await page.waitForSelector('[data-testid="recording-button"]', { timeout: 5000 })
      
      // Find language selector
      const languageSelector = page.locator('select')
      await expect(languageSelector).toBeVisible()
      
      // Check available options
      const options = ['es', 'en', 'pt'] // Spanish, English, Portuguese
      for (const option of options) {
        const optionElement = languageSelector.locator(`option[value="${option}"]`)
        await expect(optionElement).toBeAttached()
      }
      
      // Test changing language
      await languageSelector.selectOption('pt')
      await page.waitForTimeout(100)
      
      const selectedValue = await languageSelector.inputValue()
      console.log('📊 Selected language:', selectedValue)
      expect(selectedValue).toBe('pt')
      
      console.log('✅ Target language selection test completed')
    })
  })

  test.describe('Integration Tests', () => {
    test('should maintain all features together', async () => {
      console.log('🧪 Testing integrated functionality')
      
      // Test font size cycling
      await page.keyboard.press('f')
      await page.waitForTimeout(100)
      
      const fontClass = await page.locator('html').getAttribute('class')
      console.log('📊 Font applied:', fontClass)
      expect(fontClass).toContain('font-')
      
      // Navigate to Single Device Mode
      await page.locator('text=Start Translating').click()
      await page.waitForSelector('[data-testid="recording-button"]', { timeout: 5000 })
      
      // Verify audio visualization is present
      const audioViz = page.locator('[class*="flex items-end justify-center"]').first()
      await expect(audioViz).toBeVisible()
      
      // Test mode toggle
      const modeToggle = page.locator('button').filter({ hasText: /Casual|Fun/ })
      await modeToggle.click()
      await page.waitForTimeout(100)
      
      // Verify recording button is still functional
      const recordingButton = page.locator('[data-testid="recording-button"]')
      await expect(recordingButton).toBeEnabled()
      
      console.log('✅ All integrated features working together')
    })

    test('should work with different viewport sizes', async () => {
      console.log('🧪 Testing responsive behavior')
      
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      await page.locator('text=Start Translating').click()
      await page.waitForSelector('[data-testid="recording-button"]', { timeout: 5000 })
      
      // Verify UI elements are still visible and functional
      const recordingButton = page.locator('[data-testid="recording-button"]')
      await expect(recordingButton).toBeVisible()
      
      const audioViz = page.locator('[class*="flex items-end justify-center"]').first()
      await expect(audioViz).toBeVisible()
      
      // Test desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 })
      await page.waitForTimeout(500)
      
      // Elements should still be visible
      await expect(recordingButton).toBeVisible()
      await expect(audioViz).toBeVisible()
      
      console.log('✅ Responsive behavior test completed')
    })
  })

  test.afterEach(async () => {
    console.log('🧹 Cleaning up test environment')
    await page.close()
  })
})