import { test, expect } from '@playwright/test'

test.describe('Verify UI Fixes', () => {
  test('Check dark mode session ID visibility', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 }, // iPhone 14
    })
    const page = await context.newPage()
    
    // Navigate and create session
    await page.goto('http://127.0.0.1:5174')
    await page.getByRole('button', { name: /create.*session/i }).click()
    await page.waitForURL(/\/session\/\d{4}/)
    
    const sessionCode = page.url().match(/\/session\/(\d{4})/)?.[1] || ''
    
    // Switch to dark mode
    const themeToggle = page.locator('button[aria-label*="theme" i]').or(
      page.locator('button:has(svg[class*="sun"]),button:has(svg[class*="moon"])')
    ).first()
    await themeToggle.click()
    await page.waitForTimeout(500)
    
    // Check session code color in dark mode
    const sessionCodeElement = page.locator(`text="${sessionCode}"`).first()
    const color = await sessionCodeElement.evaluate(el => 
      window.getComputedStyle(el).color
    )
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/dark-mode-session-id-check.png',
      fullPage: true 
    })
    
    console.log('Session code color in dark mode:', color)
    
    // Parse RGB and check brightness
    const rgb = color.match(/\d+/g)
    if (rgb) {
      const brightness = (parseInt(rgb[0]) + parseInt(rgb[1]) + parseInt(rgb[2])) / 3
      console.log('Brightness level:', brightness)
      expect(brightness).toBeGreaterThan(200) // Should be light text
    }
    
    await context.close()
  })
  
  test('Check Voice/Type toggle on mobile', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 }, // iPhone 14
    })
    const page = await context.newPage()
    
    // Navigate and create session
    await page.goto('http://127.0.0.1:5174')
    await page.getByRole('button', { name: /create.*session/i }).click()
    await page.waitForURL(/\/session\/\d{4}/)
    
    // Take screenshot of controls
    await page.screenshot({ 
      path: 'test-results/mobile-controls-check.png',
      fullPage: true 
    })
    
    // Check Voice/Type toggle exists
    const voiceButton = page.locator('button:has-text("Voice")')
    const typeButton = page.locator('button:has-text("Type")')
    
    await expect(voiceButton).toBeVisible()
    await expect(typeButton).toBeVisible()
    
    console.log('✅ Voice/Type toggle is visible on mobile')
    
    await context.close()
  })
})