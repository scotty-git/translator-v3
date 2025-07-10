import { test, expect } from '@playwright/test'

test('Session participant detection - Real-time fix verification', async ({ page }) => {
  console.log('🔍 Testing session participant detection fix...')
  
  // Go to the app
  await page.goto('http://127.0.0.1:5173/')
  
  // Wait for the app to load
  await page.waitForSelector('h1')
  
  // Create a new session
  await page.click('text=Start Session')
  await page.waitForSelector('text=Session:', { timeout: 10000 })
  
  // Get the session code
  const sessionCodeElement = await page.locator('text=Session:').locator('..').locator('span').nth(1)
  const sessionCode = await sessionCodeElement.textContent()
  console.log('📋 Session code:', sessionCode)
  
  // Wait for the session to be created and check console logs
  await page.waitForTimeout(2000)
  
  // Check for MessageSyncService logs indicating participant subscription setup
  const consoleMessages = []
  page.on('console', msg => {
    consoleMessages.push(msg.text())
  })
  
  // Wait for some logs to accumulate
  await page.waitForTimeout(3000)
  
  // Look for the new participant subscription setup logs
  const hasParticipantSubscriptionLog = consoleMessages.some(msg => 
    msg.includes('👥 [MessageSyncService] Setting up participant subscription')
  )
  
  console.log('Console messages related to participant subscription:')
  consoleMessages
    .filter(msg => msg.includes('participant') || msg.includes('MessageSyncService'))
    .forEach(msg => console.log(`  ${msg}`))
  
  // Take a screenshot for debugging
  await page.screenshot({ path: 'test-results/session-participant-fix.png' })
  
  // Verify the participant subscription was set up
  expect(hasParticipantSubscriptionLog).toBe(true)
  
  console.log('✅ Session participant detection fix verified!')
})

test('Two-device session participant detection', async ({ browser }) => {
  console.log('🔍 Testing two-device session participant detection...')
  
  // Create two browser contexts (simulating two devices)
  const context1 = await browser.newContext()
  const context2 = await browser.newContext()
  
  const page1 = await context1.newPage()
  const page2 = await context2.newPage()
  
  // Set up console logging for both pages
  const console1Messages = []
  const console2Messages = []
  const errorMessages = []
  
  page1.on('console', msg => {
    console1Messages.push(`[HOST] ${msg.text()}`)
  })
  
  page2.on('console', msg => {
    console2Messages.push(`[GUEST] ${msg.text()}`)
  })
  
  // Capture any errors
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
  
  // Get the session code
  const sessionCodeElement = await page1.locator('text=Session:').locator('..').locator('span').nth(1)
  const sessionCode = await sessionCodeElement.textContent()
  console.log('📋 Session code:', sessionCode)
  
  // Wait for host to be set up and session to be fully committed to database
  await page1.waitForTimeout(5000)
  
  // GUEST: Join session
  await page2.goto('http://127.0.0.1:5173/')
  console.log('🔍 [GUEST] Clicking Join Session button...')
  await page2.click('text=Join Session')
  console.log('🔍 [GUEST] Waiting for input field...')
  await page2.waitForSelector('input[placeholder="Enter 4-digit code"]', { timeout: 5000 })
  console.log('🔍 [GUEST] Filling in session code:', sessionCode)
  await page2.fill('input[placeholder="Enter 4-digit code"]', sessionCode)
  console.log('🔍 [GUEST] Clicking Join button...')
  await page2.getByRole('button', { name: 'Join', exact: true }).click()
  console.log('🔍 [GUEST] Waiting for join to complete...')
  
  // Wait for guest to join and redirect to session
  await page2.waitForTimeout(3000)
  console.log('🔍 [GUEST] Current URL after join:', page2.url())
  
  // Check if there are any error messages displayed
  const errorSelectors = ['[data-testid="error"]', '.error', 'text=Please enter', 'text=Invalid', 'text=Session not found', 'text=expired']
  for (const selector of errorSelectors) {
    try {
      const errorElement = await page2.locator(selector).first()
      const errorVisible = await errorElement.isVisible()
      if (errorVisible) {
        const errorText = await errorElement.textContent()
        console.log('🔍 [GUEST] Error message found:', errorText)
        break
      }
    } catch (e) {
      // Ignore selector errors
    }
  }
  
  // Check if we're successfully on the session page
  const sessionText = await page2.locator('text=Session:').isVisible()
  console.log('🔍 [GUEST] On session page:', sessionText)
  
  // Wait for both devices to sync
  await page1.waitForTimeout(5000)
  await page2.waitForTimeout(5000)
  
  // Check if host sees "Partner Online" (this was the bug)
  const hostStatus = await page1.locator('text=Partner Online').isVisible()
  const guestStatus = await page2.locator('text=Partner Online').isVisible()
  
  console.log('Host sees partner online:', hostStatus)
  console.log('Guest sees partner online:', guestStatus)
  
  // Print relevant console messages
  console.log('\n🎯 HOST console messages:')
  console1Messages
    .filter(msg => msg.includes('participant') || msg.includes('validateSessionReady') || msg.includes('Partner'))
    .forEach(msg => console.log(`  ${msg}`))
  
  console.log('\n🎯 GUEST console messages:')
  console2Messages
    .filter(msg => msg.includes('participant') || msg.includes('validateSessionReady') || msg.includes('Partner'))
    .forEach(msg => console.log(`  ${msg}`))
  
  console.log('\n❌ ERROR messages:')
  errorMessages.forEach(msg => console.log(`  ${msg}`))
  
  // Take screenshots
  await page1.screenshot({ path: 'test-results/host-participant-detection.png' })
  await page2.screenshot({ path: 'test-results/guest-participant-detection.png' })
  
  // Both should see partner online
  expect(hostStatus).toBe(true)
  expect(guestStatus).toBe(true)
  
  await context1.close()
  await context2.close()
  
  console.log('✅ Two-device session participant detection verified!')
})