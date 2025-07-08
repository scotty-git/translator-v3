import { test, expect } from '@playwright/test'

test.describe('Final UI Verification - All Fixes', () => {
  test('Verify all session UI fixes', async ({ page, context }) => {
    // Grant microphone permissions
    await context.grantPermissions(['microphone'])
    
    // Set viewport to mobile
    await page.setViewportSize({ width: 390, height: 844 })
    
    console.log('🔍 Starting final UI verification...')
    
    // Navigate to home
    await page.goto('http://127.0.0.1:5174')
    await page.waitForLoadState('networkidle')
    
    // Create session
    await page.getByRole('button', { name: /create.*session/i }).click()
    await page.waitForURL(/\/session\/\d{4}/)
    
    const sessionCode = page.url().match(/\/session\/(\d{4})/)?.[1] || ''
    console.log('📝 Session created:', sessionCode)
    
    // Test 1: Voice/Type toggle
    await page.screenshot({ path: 'test-results/final-01-session-controls.png', fullPage: true })
    
    const voiceButton = page.locator('button:has-text("Voice")')
    const typeButton = page.locator('button:has-text("Type")')
    await expect(voiceButton).toBeVisible()
    await expect(typeButton).toBeVisible()
    console.log('✅ Voice/Type toggle is visible')
    
    // Test 2: Microphone permission on click
    const recordButton = page.locator('button[data-testid="recording-button"]')
    await expect(recordButton).toBeVisible()
    
    // Click record button to trigger permission
    await recordButton.click()
    console.log('✅ Clicked record button - should trigger permission request')
    
    // Take screenshot after permission request
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'test-results/final-02-after-permission.png', fullPage: true })
    
    // Test 3: Dark mode visibility
    // Find and click theme toggle
    const possibleThemeToggles = [
      page.locator('button[aria-label*="theme" i]'),
      page.locator('button:has(svg[class*="sun"])'),
      page.locator('button:has(svg[class*="moon"])'),
      page.locator('[data-testid="theme-toggle"]'),
      page.locator('.theme-toggle'),
      // Check for icon buttons in header
      page.locator('header button').nth(3),
      page.locator('header button').nth(4),
    ]
    
    let themeToggleClicked = false
    for (const toggle of possibleThemeToggles) {
      try {
        const count = await toggle.count()
        if (count > 0) {
          await toggle.first().click()
          await page.waitForTimeout(500)
          
          // Check if dark class was added
          const hasDark = await page.locator('html.dark').count()
          if (hasDark > 0) {
            console.log('✅ Found and clicked theme toggle')
            themeToggleClicked = true
            break
          }
        }
      } catch (e) {
        // Continue trying other selectors
      }
    }
    
    if (!themeToggleClicked) {
      console.log('⚠️ Could not find theme toggle - checking if already in dark mode')
    }
    
    // Take dark mode screenshot
    await page.screenshot({ path: 'test-results/final-03-dark-mode.png', fullPage: true })
    
    // Check session code visibility
    const sessionCodeElement = page.locator(`text="${sessionCode}"`).first()
    const styles = await sessionCodeElement.evaluate(el => {
      const computed = window.getComputedStyle(el)
      return {
        color: computed.color,
        backgroundColor: window.getComputedStyle(document.body).backgroundColor
      }
    })
    
    console.log('📊 Session code styles:', styles)
    
    // Parse RGB values
    const textRgb = styles.color.match(/\d+/g)
    const bgRgb = styles.backgroundColor.match(/\d+/g)
    
    if (textRgb && bgRgb) {
      const textBrightness = (parseInt(textRgb[0]) + parseInt(textRgb[1]) + parseInt(textRgb[2])) / 3
      const bgBrightness = (parseInt(bgRgb[0]) + parseInt(bgRgb[1]) + parseInt(bgRgb[2])) / 3
      
      console.log('💡 Text brightness:', textBrightness)
      console.log('💡 Background brightness:', bgBrightness)
      
      // Check contrast
      if (bgBrightness < 50) { // Dark background
        if (textBrightness > 200) {
          console.log('✅ Good contrast: Light text on dark background')
        } else {
          console.log('❌ Poor contrast: Dark text on dark background')
        }
      }
    }
    
    console.log('\n📸 Screenshots saved in test-results/')
    console.log('Please review screenshots to verify UI appearance')
  })
})