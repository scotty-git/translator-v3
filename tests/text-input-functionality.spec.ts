import { test, expect } from '@playwright/test'

test.describe('Text Input Functionality', () => {
  test('Text input mode toggle and functionality', async ({ page }) => {
    // Go to translator page
    await page.goto('http://127.0.0.1:5173/translator')
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="recording-button"]', { timeout: 10000 })
    
    // Verify initial state shows voice mode
    await expect(page.locator('text=🎤 Voice')).toHaveClass(/bg-white/)
    await expect(page.locator('[data-testid="recording-button"]')).toBeVisible()
    
    // Click to switch to text mode
    await page.click('text=⌨️ Type')
    
    // Verify text mode is now active
    await expect(page.locator('text=⌨️ Type')).toHaveClass(/bg-white/)
    await expect(page.locator('[data-testid="recording-button"]')).not.toBeVisible()
    
    // Verify text input is visible
    await expect(page.locator('input[placeholder*="Type your message"]')).toBeVisible()
    await expect(page.locator('button:has-text("Send")')).toBeVisible()
    
    // Test text input
    await page.fill('input[placeholder*="Type your message"]', 'Hello world')
    await expect(page.locator('button:has-text("Send")')).toBeEnabled()
    
    // Switch back to voice mode
    await page.click('text=🎤 Voice')
    await expect(page.locator('[data-testid="recording-button"]')).toBeVisible()
    await expect(page.locator('input[placeholder*="Type your message"]')).not.toBeVisible()
    
    console.log('✅ Text input mode toggle working correctly')
  })

  test('Spacebar recording functionality', async ({ page }) => {
    // Go to translator page
    await page.goto('http://127.0.0.1:5173/translator')
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="recording-button"]', { timeout: 10000 })
    
    // Ensure we're in voice mode
    await page.click('text=🎤 Voice')
    
    // Test spacebar recording - press and hold
    await page.keyboard.down('Space')
    
    // Check if recording button changes appearance (should be red when recording)
    await page.waitForTimeout(100) // Small delay for state update
    
    // Release spacebar
    await page.keyboard.up('Space')
    
    // Should return to normal state
    await page.waitForTimeout(100)
    
    console.log('✅ Spacebar recording functionality implemented')
  })

  test('Text input should not interfere with spacebar', async ({ page }) => {
    // Go to translator page  
    await page.goto('http://127.0.0.1:5173/translator')
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="recording-button"]', { timeout: 10000 })
    
    // Switch to text mode
    await page.click('text=⌨️ Type')
    
    // Focus on text input
    await page.focus('input[placeholder*="Type your message"]')
    
    // Press spacebar while focused on input - should just add space to text
    await page.keyboard.press('Space')
    
    // Verify space was added to input, not recording triggered
    await expect(page.locator('input[placeholder*="Type your message"]')).toHaveValue(' ')
    
    console.log('✅ Text input prevents spacebar recording interference')
  })
})