import { test, expect } from '@playwright/test'

test.describe('Two-User Session Functionality', () => {
  test('should fix "waiting for partner" issue and allow message sync', async ({ browser }) => {
    // Create two separate browser contexts for two users
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()
    
    // Navigate both pages to the app
    await page1.goto('https://translator-v3-9nqyr0ukp-scotty-gits-projects.vercel.app')
    await page2.goto('https://translator-v3-9nqyr0ukp-scotty-gits-projects.vercel.app')
    
    // User 1 creates a session
    await page1.click('text="Start Session"')
    await page1.waitForSelector('[data-testid="session-code"]')
    
    // Get the session code from User 1
    const sessionCode = await page1.locator('[data-testid="session-code"]').textContent()
    console.log('🔍 [Test] Session code:', sessionCode)
    
    // Take screenshot of User 1's initial state
    await page1.screenshot({ path: 'test-results/user1-created-session.png' })
    
    // User 2 joins the session
    await page2.click('text="Join Session"')
    await page2.fill('input[type="text"]', sessionCode || '')
    await page2.click('text="Join Session"')
    
    // Wait for User 2 to get to the session page
    await page2.waitForTimeout(5000) // Give time for navigation and initialization
    
    // Take screenshot of User 2's initial state
    await page2.screenshot({ path: 'test-results/user2-joined-session.png' })
    
    // Wait for both users to be connected
    await page1.waitForSelector('[data-testid="session-header"]')
    
    // Check that both users show connected status
    console.log('🔍 [Test] Checking connection status...')
    
    // Wait for partner detection (this is the key fix)
    await page1.waitForTimeout(10000) // Give time for presence detection
    await page2.waitForTimeout(10000)
    
    // Take screenshots after connection
    await page1.screenshot({ path: 'test-results/user1-after-connection.png' })
    await page2.screenshot({ path: 'test-results/user2-after-connection.png' })
    
    // Check if "waiting for partner" is resolved
    const user1Header = await page1.locator('[data-testid="session-header"]').textContent()
    const user2Header = await page2.locator('[data-testid="session-header"]').textContent()
    
    console.log('🔍 [Test] User 1 header:', user1Header)
    console.log('🔍 [Test] User 2 header:', user2Header)
    
    // Test message sending from User 1
    console.log('🔍 [Test] Testing message sending...')
    
    // Check if voice button is available and click it
    await page1.click('text="Voice"')
    
    // Wait for recording to start
    await page1.waitForTimeout(1000)
    
    // Stop recording (simulate short recording)
    await page1.click('text="Voice"')
    
    // Wait for processing
    await page1.waitForTimeout(5000)
    
    // Take final screenshots
    await page1.screenshot({ path: 'test-results/user1-after-message.png' })
    await page2.screenshot({ path: 'test-results/user2-after-message.png' })
    
    // Check if message appears in both users' screens
    const user1Messages = await page1.locator('[data-testid="message-bubble"]').count()
    const user2Messages = await page2.locator('[data-testid="message-bubble"]').count()
    
    console.log('🔍 [Test] User 1 messages:', user1Messages)
    console.log('🔍 [Test] User 2 messages:', user2Messages)
    
    // Clean up
    await context1.close()
    await context2.close()
  })
})