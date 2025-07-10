import { test, expect } from '@playwright/test'

test('Debug Session Join Process', async ({ browser }) => {
  // Create two browser contexts to simulate two devices
  const context1 = await browser.newContext()
  const context2 = await browser.newContext()
  
  const page1 = await context1.newPage()
  const page2 = await context2.newPage()
  
  console.log('🔍 Debugging session join process...')
  
  // Enable console logging for both pages
  page1.on('console', msg => console.log('📱 Device 1:', msg.text()))
  page2.on('console', msg => console.log('📱 Device 2:', msg.text()))
  
  try {
    // Navigate both pages to the app
    await page1.goto('http://127.0.0.1:5175/')
    await page2.goto('http://127.0.0.1:5175/')
    
    // Device 1: Create a session
    await page1.click('button:has-text("Start Session")')
    await page1.waitForSelector('text="Session:"', { timeout: 10000 })
    
    // Get the session code
    const sessionCodeElement = await page1.locator('text=/^\\d{4}$/').first()
    const sessionCode = await sessionCodeElement.textContent()
    console.log('📝 Session code:', sessionCode)
    
    // Take screenshot of Device 1 after session creation
    await page1.screenshot({ path: 'test-results/device1-session-created.png' })
    
    // Device 2: Join the session
    console.log('📱 Device 2 starting join process...')
    await page2.click('button:has-text("Join Session")')
    
    // Wait for input to appear
    await page2.waitForSelector('input[data-testid="join-code-input"]', { timeout: 5000 })
    
    // Fill in the session code
    await page2.fill('input[data-testid="join-code-input"]', sessionCode)
    
    // Take screenshot before clicking Join
    await page2.screenshot({ path: 'test-results/device2-before-join.png' })
    
    // Click Join
    await page2.click('button:has-text("Join")')
    
    // Wait and take screenshot after join
    await page2.waitForTimeout(3000)
    await page2.screenshot({ path: 'test-results/device2-after-join.png' })
    
    // Check if Device 2 is in session mode
    const device2SessionIndicator = await page2.locator('text="Session:"').isVisible()
    console.log('📊 Device 2 in session mode:', device2SessionIndicator)
    
    // Check Device 1 participants
    await page1.waitForTimeout(2000)
    await page1.screenshot({ path: 'test-results/device1-after-join.png' })
    
    // Check for partner status on both devices
    const device1PartnerVisible = await page1.locator('text="Partner"').isVisible()
    const device2PartnerVisible = await page2.locator('text="Partner"').isVisible()
    
    console.log('📊 Device 1 partner text visible:', device1PartnerVisible)
    console.log('📊 Device 2 partner text visible:', device2PartnerVisible)
    
    // Check if there are any error messages
    const device2ErrorVisible = await page2.locator('text="error"').isVisible()
    console.log('📊 Device 2 error visible:', device2ErrorVisible)
    
    console.log('✅ Debug session join process completed')
    
  } catch (error) {
    console.error('❌ Debug session join failed:', error)
    
    // Take error screenshots
    await page1.screenshot({ path: 'test-results/device1-join-error.png' })
    await page2.screenshot({ path: 'test-results/device2-join-error.png' })
    
    throw error
  } finally {
    await context1.close()
    await context2.close()
  }
})