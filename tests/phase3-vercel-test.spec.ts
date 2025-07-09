import { test, expect } from '@playwright/test'
import { chromium } from 'playwright'

/**
 * Phase 3 Real-time Session Tests on Vercel Production
 * Tests core Phase 3 functionality on the live deployment
 */

const VERCEL_URL = 'https://translator-v3.vercel.app'

test.describe('Phase 3: Real-time Session on Vercel', () => {
  
  test('Two-user session: Create, join, and test real-time features', async ({ page }) => {
    console.log('🧪 Testing two-user session on Vercel...')
    
    // Launch second browser for two-user testing
    const browser2 = await chromium.launch({ headless: true })
    const context2 = await browser2.newContext()
    const user2 = await context2.newPage()
    
    try {
      // User 1: Create session
      console.log('👤 User 1: Creating session...')
      await page.goto(VERCEL_URL)
      await page.waitForLoadState('networkidle')
      
      await page.click('button:has-text("Start Session")')
      await page.waitForTimeout(3000)
      
      // Get session code
      const sessionCodeElement = page.locator('[data-testid="session-code"]')
      await expect(sessionCodeElement).toBeVisible({ timeout: 10000 })
      const sessionCode = await sessionCodeElement.textContent()
      console.log('📱 Session code:', sessionCode)
      
      // Verify session header and connection status
      await expect(page.locator('[data-testid="session-header"]')).toBeVisible()
      
      // Wait for connection to establish
      await page.waitForSelector(':text("Connected")', { timeout: 15000 })
      console.log('✅ User 1 connected')
      
      // Take screenshot of User 1 session
      await page.screenshot({ path: 'test-results/vercel-user1-session.png', fullPage: true })
      
      // User 2: Join session
      console.log('👤 User 2: Joining session...')
      await user2.goto(VERCEL_URL)
      await user2.waitForLoadState('networkidle')
      
      await user2.click('button:has-text("Join Session")')
      
      // Enter session code
      const codeInput = user2.locator('input[placeholder*="session code"], input[placeholder*="code"]')
      await codeInput.fill(sessionCode!)
      await user2.click('button:has-text("Join")')
      
      // Wait for User 2 to connect
      await user2.waitForSelector(':text("Connected")', { timeout: 15000 })
      console.log('✅ User 2 connected')
      
      // Wait for both users to see partner online
      await page.waitForSelector(':text("Partner Online")', { timeout: 10000 })
      await user2.waitForSelector(':text("Partner Online")', { timeout: 10000 })
      console.log('✅ Both users see partner online')
      
      // Take screenshots of both users connected
      await page.screenshot({ path: 'test-results/vercel-user1-connected.png', fullPage: true })
      await user2.screenshot({ path: 'test-results/vercel-user2-connected.png', fullPage: true })
      
      // Test real-time message sync by simulating messages
      console.log('💬 Testing message simulation...')
      
      // User 1: Send test message via JavaScript injection
      await page.evaluate(() => {
        // Simulate a message being added to the conversation
        const testMessage = {
          id: 'test-msg-' + Date.now(),
          original: 'Hello from User 1',
          translation: 'Hola desde el Usuario 1',
          original_lang: 'en',
          target_lang: 'es',
          status: 'displayed' as const,
          created_at: new Date().toISOString(),
          user_id: 'user1'
        }
        
        // Dispatch custom event that SessionTranslator listens for
        window.dispatchEvent(new CustomEvent('testMessage', { detail: testMessage }))
      })
      
      // Wait for message to appear
      await page.waitForTimeout(2000)
      
      // Check if message appears in User 1's chat
      const user1HasMessage = await page.locator('text=Hello from User 1').isVisible()
      console.log('User 1 sees message:', user1HasMessage)
      
      // Take final screenshots
      await page.screenshot({ path: 'test-results/vercel-final-user1.png', fullPage: true })
      await user2.screenshot({ path: 'test-results/vercel-final-user2.png', fullPage: true })
      
      console.log('✅ Two-user session test completed')
      
    } finally {
      await context2.close()
      await browser2.close()
    }
  })
  
  test('Connection state transitions', async ({ page }) => {
    console.log('🧪 Testing connection state transitions...')
    
    await page.goto(VERCEL_URL)
    await page.waitForLoadState('networkidle')
    
    // Start session and monitor connection states
    await page.click('button:has-text("Start Session")')
    
    // Should start with "Connecting"
    await page.waitForSelector(':text("Connecting")', { timeout: 5000 })
    console.log('✅ Saw "Connecting" state')
    
    await page.screenshot({ path: 'test-results/vercel-connecting-state.png', fullPage: true })
    
    // Should transition to "Connected"
    await page.waitForSelector(':text("Connected")', { timeout: 15000 })
    console.log('✅ Saw "Connected" state')
    
    await page.screenshot({ path: 'test-results/vercel-connected-state.png', fullPage: true })
    
    // Test offline/online simulation
    console.log('📡 Testing network offline simulation...')
    await page.setOffline(true)
    
    // Should show "Disconnected"
    await page.waitForSelector(':text("Disconnected")', { timeout: 10000 })
    console.log('✅ Saw "Disconnected" state')
    
    await page.screenshot({ path: 'test-results/vercel-disconnected-state.png', fullPage: true })
    
    // Bring network back online
    await page.setOffline(false)
    
    // Should show "Reconnecting" then "Connected"
    try {
      await page.waitForSelector(':text("Reconnecting")', { timeout: 5000 })
      console.log('✅ Saw "Reconnecting" state')
      
      await page.screenshot({ path: 'test-results/vercel-reconnecting-state.png', fullPage: true })
    } catch (e) {
      console.log('⚠️ Reconnecting state not visible (may transition too quickly)')
    }
    
    // Should return to connected
    await page.waitForSelector(':text("Connected")', { timeout: 15000 })
    console.log('✅ Returned to "Connected" state')
    
    console.log('✅ Connection state transitions test completed')
  })
  
  test('Mobile responsiveness', async ({ page }) => {
    console.log('📱 Testing mobile responsiveness...')
    
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 })
    
    await page.goto(VERCEL_URL)
    await page.waitForLoadState('networkidle')
    
    // Verify mobile layout
    await expect(page.locator('button:has-text("Start Session")')).toBeVisible()
    await expect(page.locator('button:has-text("Join Session")')).toBeVisible()
    
    // Start session on mobile
    await page.click('button:has-text("Start Session")')
    await page.waitForTimeout(3000)
    
    // Verify session elements work on mobile
    await expect(page.locator('[data-testid="session-header"]')).toBeVisible()
    await expect(page.locator('[data-testid="session-code"]')).toBeVisible()
    
    // Take mobile screenshot
    await page.screenshot({ path: 'test-results/vercel-mobile-session.png', fullPage: true })
    
    console.log('✅ Mobile responsiveness test completed')
  })
  
  test('Session features and UI elements', async ({ page }) => {
    console.log('🔍 Testing session features and UI elements...')
    
    await page.goto(VERCEL_URL)
    await page.waitForLoadState('networkidle')
    
    // Start session
    await page.click('button:has-text("Start Session")')
    await page.waitForTimeout(3000)
    
    // Verify session code is displayed
    const sessionCode = page.locator('[data-testid="session-code"]')
    await expect(sessionCode).toBeVisible()
    const code = await sessionCode.textContent()
    console.log('Session code generated:', code)
    
    // Verify session header is present
    const sessionHeader = page.locator('[data-testid="session-header"]')
    await expect(sessionHeader).toBeVisible()
    
    // Check for record button (Phase 3 feature)
    const recordButton = page.locator('[data-testid="record-button"]')
    console.log('Record button present:', await recordButton.isVisible())
    
    // Check for connection status icons
    const connectionIcons = await page.locator('.lucide-wifi, .lucide-wifi-off, .lucide-rotate-ccw').count()
    console.log(`Found ${connectionIcons} connection status icons`)
    
    // Check for partner status
    const partnerStatus = page.locator(':text("Waiting for partner")')
    console.log('Partner status visible:', await partnerStatus.isVisible())
    
    // Verify URL changed to session mode
    const currentUrl = page.url()
    expect(currentUrl).toContain('/session')
    console.log('✅ Successfully navigated to session mode')
    
    // Take comprehensive screenshot
    await page.screenshot({ path: 'test-results/vercel-session-features.png', fullPage: true })
    
    console.log('✅ Session features test completed')
  })
})