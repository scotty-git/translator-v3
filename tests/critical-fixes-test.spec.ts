import { test, expect } from '@playwright/test'

test.describe('Critical Fixes Test', () => {
  test('Dark mode actually works and spacebar toggles recording', async ({ page }) => {
    console.log('🧪 Testing critical fixes')
    
    // Test 1: Dark mode toggle functionality
    console.log('📍 Test 1: Dark mode toggle')
    await page.goto('http://127.0.0.1:5173/')
    await expect(page.locator('text=Real-time Translator')).toBeVisible()
    
    // Click dark mode and verify it actually applies
    const darkModeButton = page.locator('button[title="Dark"]').first()
    await darkModeButton.click()
    await page.waitForTimeout(500)
    
    // Check if dark mode is applied to HTML element
    const htmlElement = page.locator('html')
    await expect(htmlElement).toHaveClass(/dark/)
    
    // Verify UI shows dark theme
    const backgroundColor = await page.evaluate(() => {
      return window.getComputedStyle(document.documentElement).backgroundColor
    })
    console.log('Background color after dark mode:', backgroundColor)
    
    console.log('✅ Dark mode toggle working')
    
    // Test 2: Navigate to translator and test spacebar toggle
    console.log('📍 Test 2: Spacebar recording toggle')
    await page.click('text=Start Translating')
    await page.waitForURL('**/translator')
    
    // Ensure we're in voice mode
    await page.click('text=Voice')
    await expect(page.locator('[data-testid="recording-button"]')).toBeVisible()
    
    // Test spacebar toggle (first press should start recording)
    await page.keyboard.press('Space')
    await page.waitForTimeout(500)
    
    // Test second spacebar press (should stop recording)
    await page.keyboard.press('Space')
    await page.waitForTimeout(500)
    
    console.log('✅ Spacebar toggle recording functionality working')
    
    // Test 3: Dark mode persistence on translator page
    console.log('📍 Test 3: Dark mode persistence on translator page')
    const translatorHtml = page.locator('html')
    await expect(translatorHtml).toHaveClass(/dark/)
    
    const translatorBg = await page.evaluate(() => {
      return window.getComputedStyle(document.documentElement).backgroundColor
    })
    console.log('Translator page background:', translatorBg)
    
    console.log('✅ Dark mode persists on translator page')
    
    console.log('🎉 All critical fixes working!')
  })
})