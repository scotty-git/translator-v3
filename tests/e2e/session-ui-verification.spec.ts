import { test, expect, devices } from '@playwright/test'

// Run tests in headless mode as per CLAUDE.md requirements
test.use({
  ...devices['iPhone 14'],
  headless: true, // Always headless for background testing
})

test.describe('Session UI Verification - Headless', () => {
  test('Verify all UI fixes are working correctly', async ({ page }) => {
    console.log('🔍 Running headless UI verification tests...')
    
    // Go to home page
    await page.goto('http://127.0.0.1:5174')
    await page.waitForLoadState('networkidle')
    
    // Create a new session
    await page.getByRole('button', { name: /create.*session/i }).click()
    await page.waitForURL(/\/session\/\d{4}/)
    
    // Extract session code
    const url = page.url()
    const sessionCode = url.match(/\/session\/(\d{4})/)?.[1] || ''
    console.log('✅ Session created:', sessionCode)
    
    // Take screenshot for analysis
    await page.screenshot({ 
      path: 'test-results/headless-01-session-light-mode.png',
      fullPage: true 
    })
    
    // Test 1: Voice/Type toggle visibility
    const voiceButton = page.locator('button:has-text("Voice")')
    const typeButton = page.locator('button:has-text("Type")')
    await expect(voiceButton).toBeVisible()
    await expect(typeButton).toBeVisible()
    console.log('✅ Voice/Type toggle is visible')
    
    // Test 2: Check session code visibility in light mode
    const sessionCodeElement = page.locator(`text="${sessionCode}"`)
    await expect(sessionCodeElement).toBeVisible()
    const lightModeColor = await sessionCodeElement.evaluate(el => 
      window.getComputedStyle(el).color
    )
    console.log('✅ Session code visible in light mode, color:', lightModeColor)
    
    // Test 3: Switch to dark mode
    const themeToggle = page.locator('button[aria-label*="theme" i]').or(
      page.locator('button:has(svg[class*="sun"]),button:has(svg[class*="moon"])')
    ).first()
    await themeToggle.click()
    await page.waitForTimeout(500)
    
    // Take dark mode screenshot
    await page.screenshot({ 
      path: 'test-results/headless-02-session-dark-mode.png',
      fullPage: true 
    })
    
    // Test 4: Check session code visibility in dark mode
    const darkModeColor = await sessionCodeElement.evaluate(el => 
      window.getComputedStyle(el).color
    )
    console.log('✅ Session code color in dark mode:', darkModeColor)
    
    // Verify color contrast (should be light color on dark background)
    const rgb = darkModeColor.match(/\d+/g)
    if (rgb) {
      const brightness = (parseInt(rgb[0]) + parseInt(rgb[1]) + parseInt(rgb[2])) / 3
      expect(brightness).toBeGreaterThan(200) // Should be bright text
      console.log('✅ Text has good contrast in dark mode (brightness:', brightness, ')')
    }
    
    // Test 5: Test Voice/Type toggle functionality
    await typeButton.click()
    await page.waitForTimeout(300)
    
    // Check text input appears
    const textInput = page.locator('input[placeholder*="type" i]')
    await expect(textInput).toBeVisible()
    console.log('✅ Type mode shows text input')
    
    await page.screenshot({ 
      path: 'test-results/headless-03-type-mode.png',
      fullPage: true 
    })
    
    // Switch back to voice
    await voiceButton.click()
    await page.waitForTimeout(300)
    
    // Check record button appears
    const recordButton = page.locator('button[data-testid="recording-button"]')
    await expect(recordButton).toBeVisible()
    console.log('✅ Voice mode shows record button')
    
    // Test 6: Check user count display
    const userCount = page.locator('text=/waiting.*partner|1.*user/i').first()
    await expect(userCount).toBeVisible()
    console.log('✅ User count display is visible')
    
    // Test 7: Check all control buttons are present
    const langButton = page.locator('button').filter({ hasText: /ES|PT/i }).first()
    const funButton = page.locator('button:has(svg[class*="sparkles" i])')
    
    await expect(langButton).toBeVisible()
    await expect(funButton).toBeVisible()
    console.log('✅ All control buttons are present')
    
    console.log('\n🎉 All UI verification tests passed!')
    console.log('📸 Screenshots saved in test-results/ for manual review')
  })
})