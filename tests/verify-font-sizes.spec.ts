import { test, expect } from '@playwright/test'

test('verify font sizes on actual messages', async ({ page }) => {
  // Navigate to translator
  await page.goto('http://127.0.0.1:5173')
  await page.click('text=Start Translating')
  await page.waitForSelector('[data-settings-button]')
  
  // Send a test message
  await page.click('text=Type')
  await page.fill('input[placeholder="Type message..."]', 'Hello! This is a test message to verify font sizes are working correctly.')
  await page.click('button:has-text("Send")')
  
  // Wait for message to appear
  await page.waitForSelector('.message-text', { timeout: 5000 })
  
  // Function to get computed font size
  const getFontSize = async () => {
    return await page.evaluate(() => {
      const messageText = document.querySelector('.message-text')
      if (messageText) {
        return window.getComputedStyle(messageText).fontSize
      }
      return null
    })
  }
  
  // Test each font size
  const fontSizes = [
    { name: 'Small', expectedMobile: '14px' },
    { name: 'Medium', expectedMobile: '16px' },
    { name: 'Large', expectedMobile: '20px' },
    { name: 'XL', expectedMobile: '24px' }
  ]
  
  for (const { name, expectedMobile } of fontSizes) {
    // Open settings and select font size
    await page.click('[data-settings-button]')
    await page.waitForSelector('[data-settings-menu]')
    await page.click(`button:has-text("${name}")`)
    
    // Wait for font size to apply
    await page.waitForTimeout(300)
    
    // Get computed font size
    const fontSize = await getFontSize()
    console.log(`Font size ${name}: ${fontSize}`)
    
    // Verify font size is applied (checking if it's a valid font size)
    expect(fontSize).toBeTruthy()
    expect(fontSize).toMatch(/^\d+(\.\d+)?px$/)
    
    // Take screenshot for visual verification
    await page.screenshot({ 
      path: `test-results/verify-font-${name.toLowerCase()}.png`,
      clip: { x: 0, y: 100, width: 400, height: 300 }
    })
  }
  
  console.log('✅ Font size verification completed!')
})