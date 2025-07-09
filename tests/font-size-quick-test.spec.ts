import { test, expect } from '@playwright/test'

test('font size settings quick UI/UX check', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://127.0.0.1:5173')
  
  // Go to translator
  await page.click('text=Start Translating')
  
  // Wait for page to load
  await page.waitForSelector('[data-settings-button]', { timeout: 5000 })
  
  // Take initial screenshot
  await page.screenshot({ path: 'test-results/font-initial.png' })
  
  // Open settings dropdown
  await page.click('[data-settings-button]')
  
  // Wait for dropdown to appear
  await page.waitForSelector('[data-settings-menu]', { timeout: 2000 })
  
  // Take screenshot of dropdown
  await page.screenshot({ path: 'test-results/font-dropdown.png' })
  
  // Check if all size buttons are visible
  const sizes = ['Small', 'Medium', 'Large', 'XL']
  for (const size of sizes) {
    const button = page.locator(`button:has-text("${size}")`)
    await expect(button).toBeVisible()
  }
  
  // Check labels
  await expect(page.locator('text=Font Size')).toBeVisible()
  await expect(page.locator('text=Theme')).toBeVisible()
  
  // Send a test message first
  await page.click('[data-settings-button]') // Close dropdown
  await page.click('text=Type')
  await page.fill('input[placeholder="Type message..."]', 'Testing font sizes')
  await page.click('button:has-text("Send")')
  
  // Wait for message to appear
  await page.waitForSelector('.message-text', { timeout: 3000 })
  
  // Test XL font size
  await page.click('[data-settings-button]')
  await page.click('button:has-text("XL")')
  await page.waitForTimeout(500)
  
  // Take screenshot with XL font
  await page.screenshot({ path: 'test-results/font-xl-applied.png' })
  
  // Test Small font size
  await page.click('[data-settings-button]')
  await page.click('button:has-text("Small")')
  await page.waitForTimeout(500)
  
  // Take screenshot with Small font
  await page.screenshot({ path: 'test-results/font-small-applied.png' })
  
  // Test theme toggle
  await page.click('[data-settings-button]')
  await page.click('button:has-text("Theme")')
  await page.waitForTimeout(500)
  
  // Take final screenshot
  await page.screenshot({ path: 'test-results/font-theme-changed.png' })
  
  console.log('✅ Font size UI/UX test completed!')
  console.log('📸 Screenshots saved in test-results/')
})