import { test, expect } from '@playwright/test'

test('Debug Real-time Fix - Screenshot Analysis', async ({ browser }) => {
  // Create two browser contexts to simulate two devices
  const context1 = await browser.newContext()
  const page1 = await context1.newPage()
  
  console.log('🔍 Debugging real-time fix UI...')
  
  // Enable console logging
  page1.on('console', msg => console.log('📱 Device 1:', msg.text()))
  
  try {
    // Navigate to the app
    await page1.goto('http://127.0.0.1:5175/')
    
    // Wait for page to load
    await page1.waitForTimeout(3000)
    
    // Take initial screenshot
    await page1.screenshot({ path: 'test-results/debug-initial.png' })
    console.log('📸 Initial screenshot taken')
    
    // Try to find the "Start Session" button
    const startButton = await page1.locator('button:has-text("Start Session")')
    const startButtonVisible = await startButton.isVisible()
    console.log('🔍 Start Session button visible:', startButtonVisible)
    
    if (startButtonVisible) {
      // Click the button
      await startButton.click()
      console.log('✅ Clicked Start Session button')
      
      // Wait a moment for UI to update
      await page1.waitForTimeout(2000)
      
      // Take screenshot after click
      await page1.screenshot({ path: 'test-results/debug-after-click.png' })
      console.log('📸 After click screenshot taken')
      
      // Check what elements are available
      const sessionCodeElement = await page1.locator('[data-testid="session-code"]')
      const sessionCodeVisible = await sessionCodeElement.isVisible()
      console.log('🔍 Session code element visible:', sessionCodeVisible)
      
      // Try alternative selectors
      const codeElements = await page1.locator('text=/^\\d{4}$/')
      const codeCount = await codeElements.count()
      console.log('🔍 4-digit code elements found:', codeCount)
      
      // Get all text content on page
      const pageText = await page1.textContent('body')
      console.log('📝 Page text contains "Session":', pageText?.includes('Session'))
      
    } else {
      console.log('❌ Start Session button not found')
      
      // Get all button text
      const buttons = await page1.locator('button')
      const buttonCount = await buttons.count()
      console.log('🔍 Total buttons found:', buttonCount)
      
      for (let i = 0; i < buttonCount; i++) {
        const buttonText = await buttons.nth(i).textContent()
        console.log(`🔍 Button ${i}:`, buttonText)
      }
    }
    
  } catch (error) {
    console.error('❌ Debug test failed:', error)
    await page1.screenshot({ path: 'test-results/debug-error.png' })
  } finally {
    await context1.close()
  }
})