import { test, expect } from '@playwright/test'

test.describe('Complete Functionality Check', () => {
  test('Home page navigation and translator access', async ({ page }) => {
    // Check home page loads
    await page.goto('http://127.0.0.1:5173/')
    await expect(page.locator('text=Real-time Translator')).toBeVisible()
    await expect(page.locator('text=Start Translating')).toBeVisible()
    
    // Go to translator
    await page.click('text=Start Translating')
    await page.waitForURL('**/translator')
    
    // Verify translator page loads with voice mode by default
    await expect(page.locator('[data-testid="recording-button"]')).toBeVisible()
    await expect(page.locator('text=🎤 Voice')).toBeVisible()
    await expect(page.locator('text=⌨️ Type')).toBeVisible()
    
    console.log('✅ Home page navigation and translator access working')
  })

  test('Text and voice mode functionality', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/translator')
    
    // Test voice mode (default)
    await expect(page.locator('[data-testid="recording-button"]')).toBeVisible()
    
    // Switch to text mode
    await page.click('text=⌨️ Type')
    await expect(page.locator('input[placeholder="Type your message..."]')).toBeVisible()
    await expect(page.locator('button:has-text("Send")')).toBeVisible()
    
    // Type a message
    await page.fill('input[placeholder="Type your message..."]', 'Test message')
    await expect(page.locator('button:has-text("Send")')).toBeEnabled()
    
    // Switch back to voice
    await page.click('text=🎤 Voice')
    await expect(page.locator('[data-testid="recording-button"]')).toBeVisible()
    
    console.log('✅ Text and voice mode switching working correctly')
  })

  test('Session code input with mobile keypad', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/')
    
    // Click join session
    await page.click('text=Join Session')
    
    // Check the session code input attributes
    const sessionInput = page.locator('input[maxlength="4"]')
    await expect(sessionInput).toBeVisible()
    
    // Verify mobile attributes are set
    await expect(sessionInput).toHaveAttribute('type', 'tel')
    await expect(sessionInput).toHaveAttribute('inputMode', 'numeric')
    await expect(sessionInput).toHaveAttribute('pattern', '[0-9]*')
    
    console.log('✅ Session code input optimized for mobile keyboards')
  })
})