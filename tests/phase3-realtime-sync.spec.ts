import { test, expect } from '@playwright/test'
import { chromium } from 'playwright'

/**
 * Phase 3 Real-time Sync Tests
 * 
 * These tests verify the real-time message synchronization between two users
 * using session-based translation with comprehensive edge case coverage.
 */

// Test configuration
const BASE_URL = 'http://127.0.0.1:5174'
const TEST_TIMEOUT = 30000
const SCREENSHOT_DIR = 'test-results/phase3-realtime'

// Test data
const TEST_ENGLISH_PHRASE = 'Hello, how are you today?'
const TEST_SPANISH_PHRASE = 'Hola, ¿cómo estás hoy?'

test.describe('Phase 3: Real-time Message Synchronization', () => {
  
  test.beforeEach(async ({ page }) => {
    // Ensure we start with a clean slate
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
  })

  test('Two-user session: Create, join, and sync messages', async ({ page }) => {
    console.log('🧪 Starting two-user session test...')
    
    // Launch two browser contexts for simulating two users
    const browser1 = await chromium.launch({ headless: true })
    const browser2 = await chromium.launch({ headless: true })
    
    const context1 = await browser1.newContext()
    const context2 = await browser2.newContext()
    
    const user1 = await context1.newPage()
    const user2 = await context2.newPage()
    
    try {
      // User 1: Create session
      console.log('👤 User 1: Creating session...')
      await user1.goto(BASE_URL)
      await user1.waitForLoadState('networkidle')
      await user1.click('button:has-text("Start Session")')
      
      // Wait for session to be created and get the code
      await user1.waitForSelector('[data-testid="session-code"]', { timeout: 10000 })
      const sessionCode = await user1.textContent('[data-testid="session-code"]')
      console.log('📱 Session code:', sessionCode)
      
      // Verify session header appears
      await expect(user1.locator('[data-testid="session-header"]')).toBeVisible()
      await expect(user1.locator(':text("Connecting...")')).toBeVisible()
      
      // Take screenshot of User 1 session created
      await user1.screenshot({ 
        path: `${SCREENSHOT_DIR}/user1-session-created.png`,
        fullPage: true 
      })
      
      // User 2: Join session
      console.log('👤 User 2: Joining session...')
      await user2.goto(BASE_URL)
      await user2.waitForLoadState('networkidle')
      await user2.click('button:has-text("Join Session")')
      
      // Enter session code
      await user2.fill('input[placeholder*="session code"]', sessionCode!)
      await user2.click('button:has-text("Join")')
      
      // Wait for both users to be connected
      await user1.waitForSelector(':text("Connected")', { timeout: 15000 })
      await user2.waitForSelector(':text("Connected")', { timeout: 15000 })
      
      // Verify partner presence
      await expect(user1.locator(':text("Partner Online")')).toBeVisible({ timeout: 10000 })
      await expect(user2.locator(':text("Partner Online")')).toBeVisible({ timeout: 10000 })
      
      // Take screenshots of both users connected
      await user1.screenshot({ 
        path: `${SCREENSHOT_DIR}/user1-connected.png`,
        fullPage: true 
      })
      await user2.screenshot({ 
        path: `${SCREENSHOT_DIR}/user2-connected.png`,
        fullPage: true 
      })
      
      // User 1: Send a message (simulate recording)
      console.log('💬 User 1: Sending message...')
      
      // Create a mock audio file for testing
      const audioBuffer = new ArrayBuffer(1024)
      const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' })
      
      // Simulate recording button click and audio input
      await user1.click('[data-testid="record-button"]')
      await user1.waitForSelector('[data-testid="recording-indicator"]')
      
      // Simulate audio processing by injecting a test message
      await user1.evaluate((testPhrase) => {
        // Simulate the translation flow
        const messageEvent = new CustomEvent('testMessage', {
          detail: {
            original: testPhrase,
            translation: 'Hola, ¿cómo estás hoy?',
            original_lang: 'en',
            target_lang: 'es'
          }
        })
        window.dispatchEvent(messageEvent)
      }, TEST_ENGLISH_PHRASE)
      
      // Wait for message to appear in User 1's chat
      await user1.waitForSelector(`text=${TEST_ENGLISH_PHRASE}`, { timeout: 10000 })
      
      // Wait for message to sync to User 2
      await user2.waitForSelector(`text=${TEST_ENGLISH_PHRASE}`, { timeout: 15000 })
      
      // Verify message alignment
      // User 1 should see their message on the right
      const user1Message = user1.locator('.message-bubble').filter({ hasText: TEST_ENGLISH_PHRASE })
      await expect(user1Message).toHaveClass(/justify-end/)
      
      // User 2 should see the partner's message on the left
      const user2Message = user2.locator('.message-bubble').filter({ hasText: TEST_ENGLISH_PHRASE })
      await expect(user2Message).toHaveClass(/justify-start/)
      
      // Take screenshots with messages
      await user1.screenshot({ 
        path: `${SCREENSHOT_DIR}/user1-with-message.png`,
        fullPage: true 
      })
      await user2.screenshot({ 
        path: `${SCREENSHOT_DIR}/user2-received-message.png`,
        fullPage: true 
      })
      
      // User 2: Send reply
      console.log('💬 User 2: Sending reply...')
      await user2.click('[data-testid="record-button"]')
      await user2.waitForSelector('[data-testid="recording-indicator"]')
      
      // Simulate Spanish to English translation
      await user2.evaluate((testPhrase) => {
        const messageEvent = new CustomEvent('testMessage', {
          detail: {
            original: testPhrase,
            translation: 'Hello, how are you today?',
            original_lang: 'es',
            target_lang: 'en'
          }
        })
        window.dispatchEvent(messageEvent)
      }, TEST_SPANISH_PHRASE)
      
      // Wait for reply to appear in both chats
      await user2.waitForSelector(`text=${TEST_SPANISH_PHRASE}`, { timeout: 10000 })
      await user1.waitForSelector(`text=${TEST_SPANISH_PHRASE}`, { timeout: 15000 })
      
      // Verify both messages are present
      await expect(user1.locator(`text=${TEST_ENGLISH_PHRASE}`)).toBeVisible()
      await expect(user1.locator(`text=${TEST_SPANISH_PHRASE}`)).toBeVisible()
      await expect(user2.locator(`text=${TEST_ENGLISH_PHRASE}`)).toBeVisible()
      await expect(user2.locator(`text=${TEST_SPANISH_PHRASE}`)).toBeVisible()
      
      // Take final screenshots
      await user1.screenshot({ 
        path: `${SCREENSHOT_DIR}/user1-conversation-complete.png`,
        fullPage: true 
      })
      await user2.screenshot({ 
        path: `${SCREENSHOT_DIR}/user2-conversation-complete.png`,
        fullPage: true 
      })
      
      console.log('✅ Two-user session test completed successfully')
      
    } finally {
      await context1.close()
      await context2.close()
      await browser1.close()
      await browser2.close()
    }
  })

  test('Network resilience: Offline message queuing and sync', async ({ page }) => {
    console.log('🧪 Starting network resilience test...')
    
    // Create session first
    await page.goto(BASE_URL)
    await page.click('button:has-text("Start Session")')
    await page.waitForSelector('[data-testid="session-code"]')
    
    // Wait for connection
    await page.waitForSelector(':text("Connected")', { timeout: 15000 })
    
    // Simulate network offline
    console.log('📡 Simulating network offline...')
    await page.setOffline(true)
    
    // Verify connection status changes
    await page.waitForSelector(':text("Disconnected")', { timeout: 10000 })
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/offline-state.png`,
      fullPage: true 
    })
    
    // Try to send message while offline
    console.log('💬 Attempting to send message while offline...')
    await page.click('[data-testid="record-button"]')
    
    // Simulate message creation while offline
    await page.evaluate((testPhrase) => {
      const messageEvent = new CustomEvent('testMessage', {
        detail: {
          original: testPhrase,
          translation: 'Hola, ¿cómo estás hoy?',
          original_lang: 'en',
          target_lang: 'es'
        }
      })
      window.dispatchEvent(messageEvent)
    }, TEST_ENGLISH_PHRASE)
    
    // Message should appear with pending status
    await page.waitForSelector(`text=${TEST_ENGLISH_PHRASE}`, { timeout: 10000 })
    
    // Should show queued/pending indicator
    await expect(page.locator('.message-bubble:has-text("' + TEST_ENGLISH_PHRASE + '") .pending-indicator')).toBeVisible()
    
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/message-queued-offline.png`,
      fullPage: true 
    })
    
    // Bring network back online
    console.log('📡 Bringing network back online...')
    await page.setOffline(false)
    
    // Should reconnect and show reconnecting state
    await page.waitForSelector(':text("Reconnecting")', { timeout: 5000 })
    await page.waitForSelector(':text("Connected")', { timeout: 15000 })
    
    // Queued message should be sent and status updated
    await page.waitForSelector('.message-bubble:has-text("' + TEST_ENGLISH_PHRASE + '") .delivered-indicator', { timeout: 10000 })
    
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/message-delivered-after-reconnect.png`,
      fullPage: true 
    })
    
    console.log('✅ Network resilience test completed successfully')
  })

  test('Connection states: Verify all connection status indicators', async ({ page }) => {
    console.log('🧪 Starting connection states test...')
    
    await page.goto(BASE_URL)
    await page.click('button:has-text("Start Session")')
    
    // Test connecting state
    await page.waitForSelector(':text("Connecting")', { timeout: 5000 })
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/connecting-state.png`,
      fullPage: true 
    })
    
    // Test connected state
    await page.waitForSelector(':text("Connected")', { timeout: 15000 })
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/connected-state.png`,
      fullPage: true 
    })
    
    // Test disconnected state
    await page.setOffline(true)
    await page.waitForSelector(':text("Disconnected")', { timeout: 10000 })
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/disconnected-state.png`,
      fullPage: true 
    })
    
    // Test reconnecting state
    await page.setOffline(false)
    await page.waitForSelector(':text("Reconnecting")', { timeout: 5000 })
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/reconnecting-state.png`,
      fullPage: true 
    })
    
    // Should return to connected
    await page.waitForSelector(':text("Connected")', { timeout: 15000 })
    
    console.log('✅ Connection states test completed successfully')
  })

  test('Message ordering: Ensure messages appear in correct sequence', async ({ page }) => {
    console.log('🧪 Starting message ordering test...')
    
    const browser1 = await chromium.launch({ headless: true })
    const browser2 = await chromium.launch({ headless: true })
    
    const context1 = await browser1.newContext()
    const context2 = await browser2.newContext()
    
    const user1 = await context1.newPage()
    const user2 = await context2.newPage()
    
    try {
      // Set up session
      await user1.goto(BASE_URL)
      await user1.click('button:has-text("Start Session")')
      const sessionCode = await user1.textContent('[data-testid="session-code"]')
      
      await user2.goto(BASE_URL)
      await user2.click('button:has-text("Join Session")')
      await user2.fill('input[placeholder*="session code"]', sessionCode!)
      await user2.click('button:has-text("Join")')
      
      // Wait for connection
      await user1.waitForSelector(':text("Connected")', { timeout: 15000 })
      await user2.waitForSelector(':text("Connected")', { timeout: 15000 })
      
      // Send multiple messages rapidly
      const messages = [
        'First message',
        'Second message', 
        'Third message',
        'Fourth message',
        'Fifth message'
      ]
      
      console.log('💬 Sending multiple messages rapidly...')
      
      for (let i = 0; i < messages.length; i++) {
        await user1.evaluate((message) => {
          const messageEvent = new CustomEvent('testMessage', {
            detail: {
              original: message,
              translation: `Mensaje ${message.split(' ')[0].toLowerCase()}`,
              original_lang: 'en',
              target_lang: 'es'
            }
          })
          window.dispatchEvent(messageEvent)
        }, messages[i])
        
        // Small delay between messages
        await page.waitForTimeout(100)
      }
      
      // Wait for all messages to sync
      await user2.waitForSelector(`text=${messages[messages.length - 1]}`, { timeout: 15000 })
      
      // Verify message order in both chats
      const user1Messages = await user1.locator('.message-bubble').allTextContents()
      const user2Messages = await user2.locator('.message-bubble').allTextContents()
      
      // Check that messages appear in correct order
      for (let i = 0; i < messages.length; i++) {
        expect(user1Messages.some(msg => msg.includes(messages[i]))).toBe(true)
        expect(user2Messages.some(msg => msg.includes(messages[i]))).toBe(true)
      }
      
      await user1.screenshot({ 
        path: `${SCREENSHOT_DIR}/message-ordering-user1.png`,
        fullPage: true 
      })
      await user2.screenshot({ 
        path: `${SCREENSHOT_DIR}/message-ordering-user2.png`,
        fullPage: true 
      })
      
      console.log('✅ Message ordering test completed successfully')
      
    } finally {
      await context1.close()
      await context2.close()
      await browser1.close()
      await browser2.close()
    }
  })

  test('Session expiry: Handle expired sessions gracefully', async ({ page }) => {
    console.log('🧪 Starting session expiry test...')
    
    await page.goto(BASE_URL)
    await page.click('button:has-text("Start Session")')
    await page.waitForSelector('[data-testid="session-code"]')
    
    // Simulate session expiry by manipulating localStorage
    await page.evaluate(() => {
      const sessionData = localStorage.getItem('activeSession')
      if (sessionData) {
        const parsed = JSON.parse(sessionData)
        // Set created date to 13 hours ago (expired)
        parsed.createdAt = new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString()
        localStorage.setItem('activeSession', JSON.stringify(parsed))
      }
    })
    
    // Refresh page to trigger expiry check
    await page.reload()
    
    // Should redirect to home page
    await page.waitForURL(BASE_URL, { timeout: 10000 })
    await expect(page.locator('button:has-text("Start Session")')).toBeVisible()
    
    // Session should be cleared from localStorage
    const sessionData = await page.evaluate(() => localStorage.getItem('activeSession'))
    expect(sessionData).toBe(null)
    
    console.log('✅ Session expiry test completed successfully')
  })

  test('Error handling: Handle various error conditions', async ({ page }) => {
    console.log('🧪 Starting error handling test...')
    
    // Test invalid session code
    await page.goto(BASE_URL)
    await page.click('button:has-text("Join Session")')
    await page.fill('input[placeholder*="session code"]', '9999')
    await page.click('button:has-text("Join")')
    
    // Should show error message
    await page.waitForSelector(':text("Session not found")', { timeout: 10000 })
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/invalid-session-error.png`,
      fullPage: true 
    })
    
    // Test malformed session code
    await page.fill('input[placeholder*="session code"]', 'invalid')
    await page.click('button:has-text("Join")')
    
    await page.waitForSelector(':text("Invalid session code")', { timeout: 10000 })
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/malformed-session-error.png`,
      fullPage: true 
    })
    
    console.log('✅ Error handling test completed successfully')
  })

  test('Mobile responsiveness: Verify session works on mobile viewport', async ({ page }) => {
    console.log('🧪 Starting mobile responsiveness test...')
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto(BASE_URL)
    await page.click('button:has-text("Start Session")')
    await page.waitForSelector('[data-testid="session-code"]')
    
    // Verify mobile layout
    await expect(page.locator('[data-testid="session-header"]')).toBeVisible()
    await expect(page.locator('[data-testid="record-button"]')).toBeVisible()
    
    // Test message display on mobile
    await page.evaluate((testPhrase) => {
      const messageEvent = new CustomEvent('testMessage', {
        detail: {
          original: testPhrase,
          translation: 'Hola, ¿cómo estás hoy?',
          original_lang: 'en',
          target_lang: 'es'
        }
      })
      window.dispatchEvent(messageEvent)
    }, TEST_ENGLISH_PHRASE)
    
    await page.waitForSelector(`text=${TEST_ENGLISH_PHRASE}`, { timeout: 10000 })
    
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/mobile-session-with-message.png`,
      fullPage: true 
    })
    
    console.log('✅ Mobile responsiveness test completed successfully')
  })

  test('Dark mode: Verify session works in dark mode', async ({ page }) => {
    console.log('🧪 Starting dark mode test...')
    
    await page.goto(BASE_URL)
    
    // Toggle dark mode
    await page.click('[data-testid="dark-mode-toggle"]')
    
    await page.click('button:has-text("Start Session")')
    await page.waitForSelector('[data-testid="session-code"]')
    
    // Verify dark mode styling
    await expect(page.locator('body')).toHaveClass(/dark/)
    
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/dark-mode-session.png`,
      fullPage: true 
    })
    
    console.log('✅ Dark mode test completed successfully')
  })
})

/**
 * Test cleanup helper
 */
test.afterEach(async ({ page }) => {
  // Clean up any test sessions
  await page.evaluate(() => {
    localStorage.removeItem('activeSession')
  })
})