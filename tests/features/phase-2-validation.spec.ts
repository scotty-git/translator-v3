import { test, expect } from '@playwright/test'
import { chromium } from '@playwright/test'

test.describe('Phase 2: Sync Service Validation', () => {
  const testSessionId = `test-${Date.now()}`
  const testUserId = 'test-user-123'
  const testMessageId = 'test-msg-123'
  
  test.beforeEach(async ({ page }) => {
    // Navigate to production environment 
    await page.goto('https://translator-v3.vercel.app')
    
    // Set up console logging for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text())
      }
    })
    
    page.on('pageerror', err => {
      console.error('Page error:', err.message)
    })
  })
  
  test('can add and sync reactions', async ({ browser }) => {
    // Create two browser contexts to simulate two users
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()
    
    try {
      // Both users navigate to the app
      await page1.goto('https://translator-v3.vercel.app')
      await page2.goto('https://translator-v3.vercel.app')
      
      // Take screenshots to verify UI appearance
      await page1.screenshot({ path: 'test-results/phase2-reactions-page1.png' })
      await page2.screenshot({ path: 'test-results/phase2-reactions-page2.png' })
      
      // User 1 creates a session
      await page1.click('[data-test="create-session"]')
      
      // Get the session code
      const sessionCode = await page1.locator('[data-test="session-code"]').textContent()
      expect(sessionCode).toMatch(/^\d{4}$/)
      
      // User 2 joins the session
      await page2.fill('[data-test="session-code-input"]', sessionCode!)
      await page2.click('[data-test="join-session"]')
      
      // Wait for connection
      await page1.waitForSelector('[data-test="partner-online"]', { timeout: 10000 })
      await page2.waitForSelector('[data-test="partner-online"]', { timeout: 10000 })
      
      // User 1 sends a message
      await page1.fill('[data-test="text-input"]', 'Hello from user 1!')
      await page1.press('[data-test="text-input"]', 'Enter')
      
      // Wait for message to appear on both sides
      await page1.waitForSelector('[data-test="message"]:has-text("Hello from user 1!")')
      await page2.waitForSelector('[data-test="message"]:has-text("Hello from user 1!")')
      
      // User 2 long-presses the message to add a reaction
      const message = await page2.locator('[data-test="message"]:has-text("Hello from user 1!")').first()
      await message.click({ button: 'right', delay: 1000 }) // Simulate long press
      
      // Select emoji from reaction picker
      await page2.click('[data-test="emoji-👍"]')
      
      // Verify reaction appears on both sides
      await page1.waitForSelector('[data-test="reaction-👍"]')
      await page2.waitForSelector('[data-test="reaction-👍"]')
      
      // Take final screenshots
      await page1.screenshot({ path: 'test-results/phase2-reactions-synced-page1.png' })
      await page2.screenshot({ path: 'test-results/phase2-reactions-synced-page2.png' })
      
    } finally {
      await context1.close()
      await context2.close()
    }
  })
  
  test('can edit messages and trigger re-translation', async ({ page }) => {
    // Navigate and create a session
    await page.click('[data-test="create-session"]')
    
    // Send a message
    await page.fill('[data-test="text-input"]', 'Original message text')
    await page.press('[data-test="text-input"]', 'Enter')
    
    // Wait for message to appear
    const message = await page.waitForSelector('[data-test="message"]:has-text("Original message text")')
    
    // Click edit button
    await message.locator('[data-test="edit-button"]').click()
    
    // Edit the message
    await page.fill('[data-test="edit-input"]', 'Edited message text')
    await page.click('[data-test="save-edit"]')
    
    // Verify message is updated with edited indicator
    await page.waitForSelector('[data-test="message"]:has-text("Edited message text")')
    await page.waitForSelector('[data-test="edited-indicator"]')
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/phase2-edit-message.png' })
  })
  
  test('can soft delete messages', async ({ page }) => {
    // Navigate and create a session
    await page.click('[data-test="create-session"]')
    
    // Send a message
    await page.fill('[data-test="text-input"]', 'Message to delete')
    await page.press('[data-test="text-input"]', 'Enter')
    
    // Wait for message to appear
    const message = await page.waitForSelector('[data-test="message"]:has-text("Message to delete")')
    
    // Long press to access delete option
    await message.click({ button: 'right', delay: 1000 })
    
    // Click delete option
    await page.click('[data-test="delete-message"]')
    
    // Confirm deletion
    await page.click('[data-test="confirm-delete"]')
    
    // Verify message shows as deleted
    await page.waitForSelector('[data-test="message-deleted"]')
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/phase2-delete-message.png' })
  })
  
  test('offline queue handles new operations', async ({ page, context }) => {
    // Navigate and create a session
    await page.click('[data-test="create-session"]')
    
    // Send a message
    await page.fill('[data-test="text-input"]', 'Test message for reactions')
    await page.press('[data-test="text-input"]', 'Enter')
    
    // Wait for message
    const message = await page.waitForSelector('[data-test="message"]:has-text("Test message for reactions")')
    
    // Go offline
    await context.setOffline(true)
    
    // Try to add reaction while offline
    await message.click({ button: 'right', delay: 1000 })
    await page.click('[data-test="emoji-❤️"]')
    
    // Verify reaction is shown optimistically
    await page.waitForSelector('[data-test="reaction-❤️"]')
    
    // Go back online
    await context.setOffline(false)
    
    // Wait a moment for sync
    await page.waitForTimeout(2000)
    
    // Verify reaction is still there after sync
    await expect(page.locator('[data-test="reaction-❤️"]')).toBeVisible()
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/phase2-offline-sync.png' })
  })
  
  test('message history loads with reactions', async ({ browser }) => {
    // Create first user session
    const context1 = await browser.newContext()
    const page1 = await context1.newPage()
    
    await page1.goto('https://translator-v3.vercel.app')
    await page1.click('[data-test="create-session"]')
    
    const sessionCode = await page1.locator('[data-test="session-code"]').textContent()
    
    // Send message and add reaction
    await page1.fill('[data-test="text-input"]', 'Historical message')
    await page1.press('[data-test="text-input"]', 'Enter')
    
    // Add reaction to own message (if allowed)
    const message = await page1.waitForSelector('[data-test="message"]:has-text("Historical message")')
    await message.click({ button: 'right', delay: 1000 })
    await page1.click('[data-test="emoji-🔥"]')
    
    // Close first user
    await context1.close()
    
    // Create second user and join same session
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()
    
    await page2.goto('https://translator-v3.vercel.app')
    await page2.fill('[data-test="session-code-input"]', sessionCode!)
    await page2.click('[data-test="join-session"]')
    
    // Verify historical message and reaction are loaded
    await page2.waitForSelector('[data-test="message"]:has-text("Historical message")')
    await page2.waitForSelector('[data-test="reaction-🔥"]')
    
    // Take screenshot
    await page2.screenshot({ path: 'test-results/phase2-history-with-reactions.png' })
    
    await context2.close()
  })
})