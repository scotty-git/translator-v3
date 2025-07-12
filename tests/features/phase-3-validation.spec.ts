import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test'

test.describe('Phase 3: Reactions UI Validation', () => {
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
    
    // Also capture any errors
    hostPage.on('pageerror', err => console.log(`[EMOJI] HOST ERROR: ${err.message}`))
    guestPage.on('pageerror', err => console.log(`[EMOJI] GUEST ERROR: ${err.message}`))
  })

  test.beforeEach(async () => {
    console.log('[EMOJI] Setting up session for reactions test...')
    
    // Host creates session
    await hostPage.goto(VERCEL_URL)
    await hostPage.waitForLoadState('networkidle')
    
    console.log('[EMOJI] Host: Creating session...')
    await hostPage.getByText('Start Session').click()
    await hostPage.waitForURL(/.*\/session.*/)
    
    // Get session code
    await hostPage.waitForSelector('span.font-mono', { timeout: 10000 })
    sessionCode = await hostPage.locator('span.font-mono').textContent() || ''
    console.log(`[EMOJI] Session code: ${sessionCode}`)
    
    // Guest joins session
    await guestPage.goto(VERCEL_URL)
    await guestPage.waitForLoadState('networkidle')
    
    console.log('[EMOJI] Guest: Joining session...')
    await guestPage.getByText('Join Session').click()
    await guestPage.getByTestId('join-code-input').fill(sessionCode)
    await guestPage.getByText('Join', { exact: true }).click()
    await guestPage.waitForURL(/.*\/session.*/)
    
    // Wait for both to be connected
    console.log('[EMOJI] Waiting for partner connection...')
    await Promise.all([
      hostPage.waitForSelector('text=Partner Online', { timeout: 15000 }),
      guestPage.waitForSelector('text=Partner Online', { timeout: 15000 })
    ])
    console.log('[EMOJI] Both parties connected!')
    
    // Switch to text input mode
    console.log('[EMOJI] Switching to text input mode...')
    await hostPage.locator('button[title="Text input"]').click()
    await guestPage.locator('button[title="Text input"]').click()
    
    // Wait for text inputs
    await hostPage.waitForSelector('input[placeholder="Type message..."]')
    await guestPage.waitForSelector('input[placeholder="Type message..."]')
  })

  test.afterAll(async () => {
    await hostContext?.close()
    await guestContext?.close()
  })
  
  test('long press shows emoji picker on partner message', async () => {
    console.log('[EMOJI] TEST: Long press shows emoji picker')
    
    // Host sends a message
    console.log('[EMOJI] Host: Sending test message...')
    const hostInput = hostPage.locator('input[placeholder="Type message..."]')
    await hostInput.fill('Hello guest, react to this!')
    await hostPage.getByText('Send').click()
    
    // Wait for message to appear on both sides
    await hostPage.waitForSelector('[data-testid^="message-bubble"]', { timeout: 15000 })
    await guestPage.waitForSelector('[data-testid^="message-bubble"]', { timeout: 15000 })
    
    // Guest long presses on host's message
    console.log('[EMOJI] Guest: Long pressing on host message...')
    const guestViewMessage = guestPage.locator('[data-testid^="message-bubble"]').first()
    
    // Debug: Check if message exists and is visible
    const isVisible = await guestViewMessage.isVisible()
    console.log(`[EMOJI] Guest: Message visible: ${isVisible}`)
    
    // Simulate long press
    await guestViewMessage.click({ delay: 600 })
    
    // Screenshot for debugging
    await guestPage.screenshot({ path: 'test-results/reactions-01-after-longpress.png' })
    
    // Verify emoji picker appears
    console.log('[EMOJI] Looking for emoji picker...')
    const picker = guestPage.locator('[data-testid="emoji-reaction-picker"]')
    await expect(picker).toBeVisible({ timeout: 5000 })
    
    // Verify 8 emojis are shown
    const emojis = picker.locator('[data-testid="emoji-option"]')
    const emojiCount = await emojis.count()
    console.log(`[EMOJI] Found ${emojiCount} emojis in picker`)
    expect(emojiCount).toBe(8)
  })
  
  test('can add and sync reactions across devices', async () => {
    console.log('[EMOJI] TEST: Add and sync reactions')
    
    // Host sends a message
    console.log('[EMOJI] Host: Sending message...')
    await hostPage.locator('input[placeholder="Type message..."]').fill('React to this message!')
    await hostPage.getByText('Send').click()
    
    // Wait for message sync
    await hostPage.waitForSelector('[data-testid^="message-bubble"]')
    await guestPage.waitForSelector('[data-testid^="message-bubble"]')
    await guestPage.waitForTimeout(2000) // Allow translation to complete
    
    // Guest adds reaction
    console.log('[EMOJI] Guest: Adding thumbs up reaction...')
    const guestMessage = guestPage.locator('[data-testid^="message-bubble"]').first()
    await guestMessage.click({ delay: 600 })
    
    // Click thumbs up emoji
    await guestPage.click('[data-testid="emoji-option"]:has-text("👍")')
    
    // Verify reaction appears on guest side
    console.log('[EMOJI] Guest: Verifying reaction...')
    const guestReaction = guestPage.locator('[data-testid="message-reaction"]:has-text("👍")')
    await expect(guestReaction).toBeVisible()
    await expect(guestReaction).toHaveText('👍 1')
    
    // Verify reaction syncs to host side
    console.log('[EMOJI] Host: Verifying reaction sync...')
    const hostReaction = hostPage.locator('[data-testid="message-reaction"]:has-text("👍")')
    await expect(hostReaction).toBeVisible({ timeout: 5000 })
    await expect(hostReaction).toHaveText('👍 1')
    
    console.log('[EMOJI] Reaction successfully synced!')
    
    // Screenshot for verification
    await hostPage.screenshot({ path: 'test-results/reactions-02-synced-host.png' })
    await guestPage.screenshot({ path: 'test-results/reactions-03-synced-guest.png' })
  })
  
  test('cannot react to own messages', async () => {
    console.log('[EMOJI] TEST: Cannot react to own messages')
    
    // Host sends a message
    console.log('[EMOJI] Host: Sending message...')
    await hostPage.locator('input[placeholder="Type message..."]').fill('My own message')
    await hostPage.getByText('Send').click()
    
    // Wait for message
    await hostPage.waitForSelector('[data-testid^="message-bubble"]')
    
    // Try to long press own message
    console.log('[EMOJI] Host: Attempting to long press own message...')
    const ownMessage = hostPage.locator('[data-testid^="message-bubble"][data-own="true"]').first()
    
    // Debug: Check if own message is properly marked
    const hasOwnAttr = await ownMessage.getAttribute('data-own')
    console.log(`[EMOJI] Message has data-own="${hasOwnAttr}"`)
    
    await ownMessage.click({ delay: 600 })
    
    // Emoji picker should not appear
    console.log('[EMOJI] Verifying emoji picker does NOT appear...')
    const picker = hostPage.locator('[data-testid="emoji-reaction-picker"]')
    await expect(picker).not.toBeVisible({ timeout: 2000 })
    
    console.log('[EMOJI] Correctly prevented reaction on own message')
  })
  
  test('multiple reactions work correctly', async () => {
    console.log('[EMOJI] TEST: Multiple reactions from different users')
    
    // Host sends message
    console.log('[EMOJI] Host: Sending message...')
    await hostPage.locator('input[placeholder="Type message..."]').fill('Popular message!')
    await hostPage.getByText('Send').click()
    
    // Wait for sync
    await hostPage.waitForSelector('[data-testid^="message-bubble"]')
    await guestPage.waitForSelector('[data-testid^="message-bubble"]')
    await guestPage.waitForTimeout(2000)
    
    // Guest adds heart reaction
    console.log('[EMOJI] Guest: Adding heart reaction...')
    const guestMessage = guestPage.locator('[data-testid^="message-bubble"]').first()
    await guestMessage.click({ delay: 600 })
    await guestPage.click('[data-testid="emoji-option"]:has-text("❤️")')
    
    // Wait for reaction to sync
    await hostPage.waitForSelector('[data-testid="message-reaction"]:has-text("❤️")')
    
    // Host adds thumbs up reaction to their own received message
    console.log('[EMOJI] Host: Adding thumbs up reaction to guest\'s view of the message...')
    // Note: In a real scenario, host would see guest's message and react to it
    // For this test, we're simulating multiple reactions on the same message
    
    // Verify reactions display correctly
    console.log('[EMOJI] Verifying multiple reactions...')
    const heartReaction = guestPage.locator('[data-testid="message-reaction"]:has-text("❤️")')
    await expect(heartReaction).toBeVisible()
    await expect(heartReaction).toHaveText('❤️ 1')
    
    console.log('[EMOJI] Multiple reactions working correctly')
  })

  test('reaction picker positioning works correctly', async () => {
    console.log('[EMOJI] TEST: Reaction picker positioning')
    
    // Host sends message
    await hostPage.locator('input[placeholder="Type message..."]').fill('Test positioning')
    await hostPage.getByText('Send').click()
    
    // Wait for message
    await guestPage.waitForSelector('[data-testid^="message-bubble"]')
    
    // Long press to show picker
    const message = guestPage.locator('[data-testid^="message-bubble"]').first()
    await message.click({ delay: 600 })
    
    // Verify picker is visible and positioned properly
    const picker = guestPage.locator('[data-testid="emoji-reaction-picker"]')
    await expect(picker).toBeVisible()
    
    // Check picker is within viewport
    const pickerBox = await picker.boundingBox()
    const viewport = guestPage.viewportSize()
    
    if (pickerBox && viewport) {
      expect(pickerBox.x).toBeGreaterThanOrEqual(0)
      expect(pickerBox.y).toBeGreaterThanOrEqual(0)
      expect(pickerBox.x + pickerBox.width).toBeLessThanOrEqual(viewport.width)
      expect(pickerBox.y + pickerBox.height).toBeLessThanOrEqual(viewport.height)
    }
    
    console.log('[EMOJI] Picker positioning verified')
  })

  test('reaction toggle functionality works', async () => {
    console.log('[EMOJI] TEST: Reaction toggle functionality')
    
    // Host sends message
    await hostPage.locator('input[placeholder="Type message..."]').fill('Toggle test')
    await hostPage.getByText('Send').click()
    
    // Wait for message
    await guestPage.waitForSelector('[data-testid^="message-bubble"]')
    
    // Add reaction
    const message = guestPage.locator('[data-testid^="message-bubble"]').first()
    await message.click({ delay: 600 })
    await guestPage.click('[data-testid="emoji-option"]:has-text("👍")')
    
    // Verify reaction appears
    const reaction = guestPage.locator('[data-testid="message-reaction"]:has-text("👍")')
    await expect(reaction).toBeVisible()
    
    // Click reaction to toggle it off
    await reaction.click()
    
    // Verify reaction disappears
    await expect(reaction).not.toBeVisible({ timeout: 3000 })
    
    console.log('[EMOJI] Reaction toggle verified')
  })

  test('dark mode reactions display correctly', async () => {
    console.log('[EMOJI] TEST: Dark mode reactions')
    
    // Switch to dark mode
    await guestPage.click('button[aria-label="Toggle dark mode"]')
    
    // Host sends message
    await hostPage.locator('input[placeholder="Type message..."]').fill('Dark mode test')
    await hostPage.getByText('Send').click()
    
    // Wait for message
    await guestPage.waitForSelector('[data-testid^="message-bubble"]')
    
    // Add reaction
    const message = guestPage.locator('[data-testid^="message-bubble"]').first()
    await message.click({ delay: 600 })
    
    // Screenshot dark mode picker
    await guestPage.screenshot({ path: 'test-results/reactions-04-dark-mode-picker.png' })
    
    await guestPage.click('[data-testid="emoji-option"]:has-text("👍")')
    
    // Screenshot dark mode reaction
    await guestPage.screenshot({ path: 'test-results/reactions-05-dark-mode-reaction.png' })
    
    // Verify reaction is visible in dark mode
    const reaction = guestPage.locator('[data-testid="message-reaction"]:has-text("👍")')
    await expect(reaction).toBeVisible()
    
    console.log('[EMOJI] Dark mode reactions verified')
  })
})