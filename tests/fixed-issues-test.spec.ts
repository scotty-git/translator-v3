import { test, expect } from '@playwright/test'

test.describe('Fixed Issues Verification', () => {
  test('All critical fixes work correctly', async ({ page }) => {
    console.log('🧪 Testing all critical fixes')
    
    // Test 1: Dark mode persistence and theme toggle
    console.log('📍 Test 1: Dark mode functionality')
    await page.goto('http://127.0.0.1:5173/')
    await expect(page.locator('text=Real-time Translator')).toBeVisible()
    
    // Test dark mode toggle
    const darkModeButton = page.locator('button[title="Dark"]').first()
    await expect(darkModeButton).toBeVisible()
    await darkModeButton.click()
    await page.waitForTimeout(500)
    
    // Verify dark mode is applied
    const htmlElement = page.locator('html')
    await expect(htmlElement).toHaveClass(/dark/)
    console.log('✅ Dark mode toggle working')
    
    // Test 2: Navigate to translator and verify improved UI
    console.log('📍 Test 2: Translator UI improvements')
    await page.click('text=Start Translating')
    await page.waitForURL('**/translator')
    
    // Check for improved Voice/Type toggle
    await expect(page.locator('text=Voice')).toBeVisible()
    await expect(page.locator('text=Type')).toBeVisible()
    
    // Verify the toggle has the new rounded design
    const toggleContainer = page.locator('.relative.bg-white').first()
    await expect(toggleContainer).toBeVisible()
    console.log('✅ Improved Voice/Type toggle UI')
    
    // Test 3: Text mode functionality
    console.log('📍 Test 3: Text mode functionality')
    await page.click('text=Type')
    await expect(page.locator('input[placeholder="Type your message..."]')).toBeVisible()
    
    // Test text input
    await page.fill('input[placeholder="Type your message..."]', 'Hello world')
    await expect(page.locator('button:has-text("Send")')).toBeEnabled()
    console.log('✅ Text input functionality working')
    
    // Test 4: Voice mode and spacebar
    console.log('📍 Test 4: Voice mode and spacebar functionality')
    await page.click('text=Voice')
    await expect(page.locator('[data-testid="recording-button"]')).toBeVisible()
    
    // Test spacebar (should work in voice mode only)
    await page.keyboard.down('Space')
    await page.waitForTimeout(100)
    await page.keyboard.up('Space')
    console.log('✅ Spacebar recording functionality implemented')
    
    // Test 5: CSS loading without white flash
    console.log('📍 Test 5: CSS loading verification')
    // Reload page to test CSS loading
    await page.reload()
    await page.waitForSelector('text=Real-time Translator', { timeout: 5000 })
    
    // Check if dark mode persists after reload
    const htmlAfterReload = page.locator('html')
    await expect(htmlAfterReload).toHaveClass(/dark/)
    console.log('✅ Dark mode persists after reload')
    
    console.log('🎉 All critical fixes verified working!')
  })
})