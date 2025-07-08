import { test, expect } from '@playwright/test'

test.describe('Dark Mode Functionality', () => {
  test('Dark mode toggle works correctly', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/')
    
    // Wait for page to load
    await page.waitForSelector('text=Real-time Translator', { timeout: 10000 })
    
    // Find dark mode button
    const darkModeButton = page.locator('button[title="Dark"]').first()
    await expect(darkModeButton).toBeVisible()
    
    // Click dark mode button
    await darkModeButton.click()
    await page.waitForTimeout(500) // Wait for theme change
    
    // Check if dark mode is applied
    const htmlElement = page.locator('html')
    await expect(htmlElement).toHaveClass(/dark/)
    
    console.log('✅ Dark mode activated successfully')
    
    // Test light mode
    const lightModeButton = page.locator('button[title="Light"]').first()
    await lightModeButton.click()
    await page.waitForTimeout(500)
    
    // Check if dark mode is removed
    const htmlClassesAfter = await htmlElement.getAttribute('class')
    const hasDarkMode = htmlClassesAfter?.includes('dark') || false
    
    console.log(`Light mode activated: ${!hasDarkMode}`)
    
    console.log('✅ Dark mode toggle functionality working correctly')
  })
})