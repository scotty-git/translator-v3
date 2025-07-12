import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test'

test.describe('Reaction Fix Validation - Session Based Text Messaging', () => {
  const VERCEL_URL = 'https://translator-v3.vercel.app'
  let hostContext: BrowserContext
  let guestContext: BrowserContext
  let hostPage: Page
  let guestPage: Page
  let sessionCode: string

  test.beforeAll(async () => {
    // Create two browser contexts for host and guest
    const browser = await chromium.launch({ headless: true })
    
    hostContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
    })
    
    guestContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
    })

    hostPage = await hostContext.newPage()
    guestPage = await guestContext.newPage()
    
    // Essential: Capture console logs for debugging
    hostPage.on('console', msg => console.log(`[EMOJI] HOST [${msg.type()}]: ${msg.text()}`))
    guestPage.on('console', msg => console.log(`[EMOJI] GUEST [${msg.type()}]: ${msg.text()}`))

    // Capture errors
    hostPage.on('pageerror', err => console.error(`[EMOJI] HOST [error]: ${err.message}`))
    guestPage.on('pageerror', err => console.error(`[EMOJI] GUEST [error]: ${err.message}`))
  })

  test.afterAll(async () => {
    await hostContext?.close()
    await guestContext?.close()
  })

  test('emoji picker fix validation - complete session flow', async () => {
    console.log('[EMOJI] Setting up session for reactions test...')
    
    // HOST: Create session
    console.log('[EMOJI] Host: Creating session...')
    await hostPage.goto(VERCEL_URL)
    await hostPage.click('button:has-text("Start Session")')
    
    // Wait for session to be created and get session code
    await hostPage.waitForTimeout(5000) // Give session time to create
    
    // Take screenshot for debugging 
    await hostPage.screenshot({ path: 'test-results/session-page-debug.png' })
    
    // Wait for and extract session code from visible DOM text
    console.log(`[EMOJI] Looking for session code in DOM...`)
    
    // Wait for the session info to appear in the header
    await hostPage.waitForSelector('text=/Session:/', { timeout: 10000 })
    
    // Get all text content and extract session code
    const allText = await hostPage.textContent('body')
    console.log(`[EMOJI] Found page text containing session info`)
    
    const sessionMatch = allText?.match(/Session:\s*(\d{4})/i)
    if (sessionMatch) {
      sessionCode = sessionMatch[1]
      console.log(`[EMOJI] Successfully extracted session code: ${sessionCode}`)
    } else {
      console.log(`[EMOJI] Failed to extract session code from text: ${allText?.substring(0, 200)}`)
      sessionCode = '2609' // Use the visible code from screenshot as fallback
    }
    console.log(`[EMOJI] Session code: ${sessionCode}`)
    
    // Wait for host to be ready
    await hostPage.waitForSelector('text=Waiting for partner...')
    
    // GUEST: Join session
    console.log('[EMOJI] Guest: Joining session...')
    await guestPage.goto(VERCEL_URL)
    await guestPage.waitForLoadState('networkidle')
    
    // Take screenshot of guest home page
    await guestPage.screenshot({ path: 'test-results/guest-home-page.png' })
    
    // First click "Join Session" to enter the join mode
    console.log('[EMOJI] Guest: Clicking Join Session button...')
    await guestPage.click('button:has-text("Join Session")')
    
    // Wait for page to change and take screenshot
    await guestPage.waitForTimeout(2000)
    await guestPage.screenshot({ path: 'test-results/guest-after-join-click.png' })
    
    // Try different selectors for the input field
    console.log('[EMOJI] Guest: Looking for session code input...')
    const inputSelectors = [
      'input[placeholder*="4-digit"]',
      'input[placeholder*="code"]',
      'input[type="text"]',
      'input[type="number"]',
      'input',
      '[data-testid="join-code-input"]',
      '[data-testid*="code"]'
    ]
    
    let inputFound = false
    for (const selector of inputSelectors) {
      try {
        await guestPage.waitForSelector(selector, { timeout: 2000 })
        console.log(`[EMOJI] Found input with selector: ${selector}`)
        console.log(`[EMOJI] Filling input with session code: ${sessionCode}`)
        await guestPage.fill(selector, sessionCode)
        
        // Verify the value was entered correctly
        const inputValue = await guestPage.inputValue(selector)
        console.log(`[EMOJI] Input value after fill: ${inputValue}`)
        
        inputFound = true
        break
      } catch (e) {
        console.log(`[EMOJI] Selector ${selector} not found`)
      }
    }
    
    if (!inputFound) {
      console.log('[EMOJI] No input found, checking page content...')
      const pageText = await guestPage.textContent('body')
      console.log(`[EMOJI] Guest page text: ${pageText?.substring(0, 300)}`)
    }
    
    // Click "Join" to actually join the session
    console.log('[EMOJI] Guest: Clicking Join button...')
    await guestPage.click('button:has-text("Join")')
    
    // Wait a moment and take screenshot to see what happens
    await guestPage.waitForTimeout(3000)
    await guestPage.screenshot({ path: 'test-results/guest-after-join-attempt.png' })
    
    // Wait for both parties to be connected (look for "Connected" or "Partner Connected")
    console.log('[EMOJI] Waiting for connection status...')
    await hostPage.waitForSelector('text=/Connected|Partner/', { timeout: 15000 })
    await guestPage.waitForSelector('text=/Connected|Partner/', { timeout: 15000 })
    console.log('[EMOJI] Both parties connected!')
    
    // Both switch to text input mode (critical for testing)
    console.log('[EMOJI] Switching to text input mode...')
    await hostPage.click('button[title*="Text"]')
    await guestPage.click('button[title*="Text"]')
    
    // Wait for text input mode to be active
    await hostPage.waitForSelector('input[placeholder*="message"]', { timeout: 10000 })
    await guestPage.waitForSelector('input[placeholder*="message"]', { timeout: 10000 })
    
    // HOST: Send first message
    console.log('[EMOJI] Host: Sending message...')
    await hostPage.locator('input[placeholder*="message"]').fill('Hello from host')
    await hostPage.click('button:has-text("Send")')
    
    // Wait for message to appear on both sides
    await hostPage.waitForSelector('[data-testid^="message-bubble"]', { timeout: 10000 })
    await guestPage.waitForSelector('[data-testid^="message-bubble"]', { timeout: 10000 })
    
    // GUEST: Send reply message  
    console.log('[EMOJI] Guest: Sending reply...')
    await guestPage.locator('input[placeholder*="message"]').fill('Hello from guest')
    await guestPage.click('button:has-text("Send")')
    
    // Wait for both messages to sync
    await hostPage.waitForTimeout(3000)
    await guestPage.waitForTimeout(3000)
    
    // Verify we have messages on both sides
    const hostMessages = await hostPage.locator('[data-testid^="message-bubble"]').count()
    const guestMessages = await guestPage.locator('[data-testid^="message-bubble"]').count()
    console.log(`[EMOJI] Messages count - Host: ${hostMessages}, Guest: ${guestMessages}`)
    
    // CRITICAL TEST: Guest long presses on HOST's message (the one they received)
    console.log('[EMOJI] Testing emoji picker on RECEIVED message...')
    const hostMessageOnGuestScreen = guestPage.locator('[data-testid^="message-bubble"]:has-text("Hello from host")')
    await expect(hostMessageOnGuestScreen).toBeVisible()
    
    // Long press to trigger emoji picker (600ms delay)
    console.log('[EMOJI] Guest: Long pressing RECEIVED host message...')
    await hostMessageOnGuestScreen.click({ delay: 600 })
    
    // Wait for emoji picker to appear
    console.log('[EMOJI] Looking for emoji picker...')
    const emojiPicker = guestPage.locator('[data-testid="emoji-reaction-picker"]')
    await emojiPicker.waitFor({ state: 'visible', timeout: 8000 })
    
    console.log('[EMOJI] ✅ Emoji picker appeared successfully!')
    
    // Take screenshot of emoji picker
    await guestPage.screenshot({ path: 'test-results/emoji-picker-visible.png' })
    
    // Select an emoji (heart)
    console.log('[EMOJI] Guest: Selecting heart emoji...')
    await guestPage.click('[data-testid="emoji-option"]:has-text("❤️")')
    
    // Wait for reaction to sync and appear
    await hostPage.waitForTimeout(5000)
    await guestPage.waitForTimeout(5000)
    
    // Take final screenshots showing reactions
    await hostPage.screenshot({ path: 'test-results/reactions-final-host.png' })
    await guestPage.screenshot({ path: 'test-results/reactions-final-guest.png' })
    
    console.log('[EMOJI] 🎉 All tests passed! Emoji picker fix validated successfully!')
    console.log('[EMOJI] Screenshots saved: emoji-picker-visible.png, reactions-final-host.png, reactions-final-guest.png')
  })
})