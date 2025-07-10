import { test, expect } from '@playwright/test'

test('Debug guest join flow', async ({ browser }) => {
  console.log('🔍 Debugging guest join flow...')
  
  // Create two browser contexts
  const context1 = await browser.newContext()
  const context2 = await browser.newContext()
  
  const page1 = await context1.newPage()
  const page2 = await context2.newPage()
  
  // Set up console logging
  const console1Messages = []
  const console2Messages = []
  const errorMessages = []
  
  page1.on('console', msg => {
    console1Messages.push(`[HOST] ${msg.text()}`)
  })
  
  page2.on('console', msg => {
    console2Messages.push(`[GUEST] ${msg.text()}`)
  })
  
  page1.on('pageerror', error => {
    errorMessages.push(`[HOST ERROR] ${error.message}`)
  })
  
  page2.on('pageerror', error => {
    errorMessages.push(`[GUEST ERROR] ${error.message}`)
  })
  
  // HOST: Create session
  await page1.goto('http://127.0.0.1:5173/')
  await page1.click('text=Start Session')
  await page1.waitForSelector('text=Session:', { timeout: 10000 })
  
  // Get session code
  const sessionCodeElement = await page1.locator('text=Session:').locator('..').locator('span').nth(1)
  const sessionCode = await sessionCodeElement.textContent()
  console.log('📋 Session code:', sessionCode)
  
  // Wait for host setup
  await page1.waitForTimeout(3000)
  
  // GUEST: Navigate to home
  await page2.goto('http://127.0.0.1:5173/')
  await page2.waitForSelector('h1')
  
  // Take screenshot before clicking Join Session
  await page2.screenshot({ path: 'test-results/guest-before-join-session.png' })
  
  // Try to click Join Session button
  console.log('🔍 [GUEST] Looking for Join Session button...')
  const joinSessionButton = await page2.locator('text=Join Session')
  const joinSessionVisible = await joinSessionButton.isVisible()
  console.log('🔍 [GUEST] Join Session button visible:', joinSessionVisible)
  
  if (joinSessionVisible) {
    console.log('🔍 [GUEST] Clicking Join Session button...')
    await joinSessionButton.click()
    await page2.waitForTimeout(1000)
    
    // Take screenshot after clicking Join Session
    await page2.screenshot({ path: 'test-results/guest-after-join-session-click.png' })
    
    // Check if input field appears
    const inputField = await page2.locator('input[placeholder="Enter 4-digit code"]')
    const inputVisible = await inputField.isVisible()
    console.log('🔍 [GUEST] Input field visible:', inputVisible)
    
    if (inputVisible) {
      console.log('🔍 [GUEST] Filling in session code:', sessionCode)
      await inputField.fill(sessionCode)
      await page2.waitForTimeout(500)
      
      // Take screenshot after filling code
      await page2.screenshot({ path: 'test-results/guest-after-code-fill.png' })
      
      // Look for Join button (the small one inside the input area)
      const joinButton = await page2.getByRole('button', { name: 'Join', exact: true })
      const joinButtonVisible = await joinButton.isVisible()
      const joinButtonEnabled = await joinButton.isEnabled()
      console.log('🔍 [GUEST] Join button visible:', joinButtonVisible)
      console.log('🔍 [GUEST] Join button enabled:', joinButtonEnabled)
      
      if (joinButtonVisible && joinButtonEnabled) {
        console.log('🔍 [GUEST] Clicking Join button...')
        await joinButton.click()
        await page2.waitForTimeout(2000)
        
        // Take screenshot after clicking Join
        await page2.screenshot({ path: 'test-results/guest-after-join-click.png' })
        
        // Check current URL
        const currentUrl = page2.url()
        console.log('🔍 [GUEST] Current URL after join:', currentUrl)
        
        // Check if error message appears
        const errorElement = await page2.locator('.text-red-600')
        const errorVisible = await errorElement.isVisible()
        if (errorVisible) {
          const errorText = await errorElement.textContent()
          console.log('🔍 [GUEST] Error message:', errorText)
        }
      }
    }
  }
  
  // Wait for console logs to accumulate
  await page2.waitForTimeout(3000)
  
  // Print all console messages
  console.log('\\n🎯 HOST console messages:')
  console1Messages.forEach(msg => console.log(`  ${msg}`))
  
  console.log('\\n🎯 GUEST console messages:')
  console2Messages.forEach(msg => console.log(`  ${msg}`))
  
  console.log('\\n❌ ERROR messages:')
  errorMessages.forEach(msg => console.log(`  ${msg}`))
  
  await context1.close()
  await context2.close()
})