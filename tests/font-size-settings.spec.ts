import { test, expect, chromium } from '@playwright/test'

test.describe('Font Size Settings', () => {
  test('font size settings functionality and UI/UX', async () => {
    const browser = await chromium.launch({ headless: true })
    const context = await browser.newContext()
    const page = await context.newPage()
    
    // Navigate to the translator page
    await page.goto('http://127.0.0.1:5173')
    await page.click('text=Start Translating')
    
    // Wait for the translator page to load
    await page.waitForSelector('[data-settings-button]')
    
    // Take initial screenshot
    await page.screenshot({ path: 'test-results/font-settings-initial.png', fullPage: true })
    
    // Click settings button to open dropdown
    await page.click('[data-settings-button]')
    await page.waitForSelector('[data-settings-menu]')
    
    // Take screenshot of settings dropdown
    await page.screenshot({ path: 'test-results/font-settings-dropdown.png', fullPage: true })
    
    // Verify all font size options are present
    const smallButton = await page.locator('text=Small')
    const mediumButton = await page.locator('text=Medium')
    const largeButton = await page.locator('text=Large')
    const xlButton = await page.locator('text=XL')
    
    await expect(smallButton).toBeVisible()
    await expect(mediumButton).toBeVisible()
    await expect(largeButton).toBeVisible()
    await expect(xlButton).toBeVisible()
    
    // Verify labels are correct
    await expect(page.locator('text=Font Size')).toBeVisible()
    await expect(page.locator('text=Theme')).toBeVisible()
    
    // First, add some test messages to see font size changes
    await page.click('[data-settings-button]') // Close dropdown
    
    // Send a text message to test font sizes
    await page.click('text=Type')
    await page.fill('input[placeholder="Type message..."]', 'Hello, this is a test message to check font sizes!')
    await page.click('text=Send')
    await page.waitForSelector('.message-text')
    
    // Test each font size
    const fontSizes = ['Small', 'Medium', 'Large', 'XL']
    
    for (const size of fontSizes) {
      // Open settings dropdown
      await page.click('[data-settings-button]')
      await page.waitForSelector('[data-settings-menu]')
      
      // Select font size
      await page.click(`text="${size}"`)
      
      // Wait for font size to apply
      await page.waitForTimeout(500)
      
      // Take screenshot with current font size
      await page.screenshot({ 
        path: `test-results/font-size-${size.toLowerCase()}.png`, 
        fullPage: true 
      })
      
      // Verify the font size class is applied to document
      const htmlClasses = await page.getAttribute('html', 'class')
      const expectedClass = size === 'XL' ? 'font-xl' : `font-${size.toLowerCase()}`
      expect(htmlClasses).toContain(expectedClass)
    }
    
    // Test theme toggle
    await page.click('[data-settings-button]')
    await page.waitForSelector('[data-settings-menu]')
    
    // Click theme toggle
    await page.click('button:has-text("Theme")')
    await page.waitForTimeout(500)
    
    // Check if dark mode is applied
    const isDarkMode = await page.evaluate(() => 
      document.documentElement.classList.contains('dark')
    )
    
    // Take screenshot in opposite theme
    await page.screenshot({ 
      path: `test-results/font-settings-theme-${isDarkMode ? 'dark' : 'light'}.png`, 
      fullPage: true 
    })
    
    // Verify the settings dropdown UI quality
    await page.click('[data-settings-button]')
    await page.waitForSelector('[data-settings-menu]')
    
    // Check dropdown styling
    const dropdown = await page.locator('[data-settings-menu]')
    
    // Verify dropdown has proper styling
    await expect(dropdown).toHaveCSS('background-color', /.+/)
    await expect(dropdown).toHaveCSS('border-radius', /.+/)
    await expect(dropdown).toHaveCSS('box-shadow', /.+/)
    
    // Check font size buttons layout
    const fontSizeGrid = await page.locator('.grid-cols-4')
    await expect(fontSizeGrid).toBeVisible()
    
    // Verify active button styling
    const activeButton = await page.locator('button.bg-blue-500')
    await expect(activeButton).toBeVisible()
    await expect(activeButton).toHaveCSS('color', 'rgb(255, 255, 255)')
    
    await browser.close()
    
    console.log('✅ Font size settings test completed successfully!')
    console.log('📸 Screenshots saved:')
    console.log('   - test-results/font-settings-initial.png')
    console.log('   - test-results/font-settings-dropdown.png')
    console.log('   - test-results/font-size-small.png')
    console.log('   - test-results/font-size-medium.png')
    console.log('   - test-results/font-size-large.png')
    console.log('   - test-results/font-size-xl.png')
    console.log('   - test-results/font-settings-theme-*.png')
  })
})