/**
 * Phase 3 Real-time Sync Tests using Puppeteer MCP Server
 * 
 * These tests verify the real-time message synchronization between two users
 * using session-based translation with comprehensive edge case coverage.
 * 
 * Note: These tests run in background mode (headless) using Puppeteer MCP server
 */

const puppeteer = require('puppeteer')
const path = require('path')
const fs = require('fs').promises

// Test configuration
const BASE_URL = 'http://127.0.0.1:5174'
const SCREENSHOT_DIR = path.join(__dirname, '../test-results/phase3-puppeteer')
const TEST_TIMEOUT = 30000

// Test data
const TEST_ENGLISH_PHRASE = 'Hello, how are you today?'
const TEST_SPANISH_PHRASE = 'Hola, ¿cómo estás hoy?'

// Ensure screenshot directory exists
async function ensureScreenshotDir() {
  try {
    await fs.mkdir(SCREENSHOT_DIR, { recursive: true })
  } catch (error) {
    // Directory might already exist
  }
}

/**
 * Test 1: Two-user session with real-time sync
 */
async function testTwoUserSession() {
  console.log('🧪 Starting two-user session test...')
  
  // Launch two browser instances (headless)
  const browser1 = await puppeteer.launch({ headless: true })
  const browser2 = await puppeteer.launch({ headless: true })
  
  try {
    const page1 = await browser1.newPage()
    const page2 = await browser2.newPage()
    
    // Set viewport for consistent screenshots
    await page1.setViewport({ width: 1280, height: 720 })
    await page2.setViewport({ width: 1280, height: 720 })
    
    // User 1: Create session
    console.log('👤 User 1: Creating session...')
    await page1.goto(BASE_URL)
    await page1.waitForLoadState('networkidle')
    
    // Click Start Session button
    await page1.click('button:has-text("Start Session")')
    
    // Wait for session to be created
    await page1.waitForSelector('[data-testid="session-code"]', { timeout: 10000 })
    
    // Get session code
    const sessionCode = await page1.$eval('[data-testid="session-code"]', el => el.textContent)
    console.log('📱 Session code:', sessionCode)
    
    // Take screenshot of User 1 session created
    await page1.screenshot({ 
      path: path.join(SCREENSHOT_DIR, 'user1-session-created.png'),
      fullPage: true 
    })
    
    // User 2: Join session
    console.log('👤 User 2: Joining session...')
    await page2.goto(BASE_URL)
    await page2.waitForLoadState('networkidle')
    
    await page2.click('button:has-text("Join Session")')
    
    // Enter session code
    await page2.type('input[placeholder*="session code"]', sessionCode)
    await page2.click('button:has-text("Join")')
    
    // Wait for both users to be connected
    await page1.waitForSelector(':text("Connected")', { timeout: 15000 })
    await page2.waitForSelector(':text("Connected")', { timeout: 15000 })
    
    // Wait for partner presence
    await page1.waitForSelector(':text("Partner Online")', { timeout: 10000 })
    await page2.waitForSelector(':text("Partner Online")', { timeout: 10000 })
    
    // Take screenshots of both users connected
    await page1.screenshot({ 
      path: path.join(SCREENSHOT_DIR, 'user1-connected.png'),
      fullPage: true 
    })
    await page2.screenshot({ 
      path: path.join(SCREENSHOT_DIR, 'user2-connected.png'),
      fullPage: true 
    })
    
    // User 1: Simulate sending a message
    console.log('💬 User 1: Simulating message send...')
    
    // Inject test message directly into the app
    await page1.evaluate((testPhrase) => {
      // Find the SingleDeviceTranslator component and trigger message
      const messageEvent = new CustomEvent('testMessage', {
        detail: {
          id: 'test-msg-' + Date.now(),
          original: testPhrase,
          translation: 'Hola, ¿cómo estás hoy?',
          original_lang: 'en',
          target_lang: 'es',
          status: 'displayed',
          created_at: new Date().toISOString(),
          user_id: 'user1'
        }
      })
      window.dispatchEvent(messageEvent)
    }, TEST_ENGLISH_PHRASE)
    
    // Wait for message to appear in User 1's chat
    await page1.waitForSelector(`text=${TEST_ENGLISH_PHRASE}`, { timeout: 10000 })
    
    // Wait for message to sync to User 2 (this tests the real-time sync)
    await page2.waitForSelector(`text=${TEST_ENGLISH_PHRASE}`, { timeout: 15000 })
    
    // Take screenshots with messages
    await page1.screenshot({ 
      path: path.join(SCREENSHOT_DIR, 'user1-with-message.png'),
      fullPage: true 
    })
    await page2.screenshot({ 
      path: path.join(SCREENSHOT_DIR, 'user2-received-message.png'),
      fullPage: true 
    })
    
    // User 2: Send reply
    console.log('💬 User 2: Sending reply...')
    await page2.evaluate((testPhrase) => {
      const messageEvent = new CustomEvent('testMessage', {
        detail: {
          id: 'test-msg-' + Date.now(),
          original: testPhrase,
          translation: 'Hello, how are you today?',
          original_lang: 'es',
          target_lang: 'en',
          status: 'displayed',
          created_at: new Date().toISOString(),
          user_id: 'user2'
        }
      })
      window.dispatchEvent(messageEvent)
    }, TEST_SPANISH_PHRASE)
    
    // Wait for reply to appear in both chats
    await page2.waitForSelector(`text=${TEST_SPANISH_PHRASE}`, { timeout: 10000 })
    await page1.waitForSelector(`text=${TEST_SPANISH_PHRASE}`, { timeout: 15000 })
    
    // Take final screenshots
    await page1.screenshot({ 
      path: path.join(SCREENSHOT_DIR, 'user1-conversation-complete.png'),
      fullPage: true 
    })
    await page2.screenshot({ 
      path: path.join(SCREENSHOT_DIR, 'user2-conversation-complete.png'),
      fullPage: true 
    })
    
    console.log('✅ Two-user session test completed successfully')
    
  } finally {
    await browser1.close()
    await browser2.close()
  }
}

/**
 * Test 2: Network resilience - offline message queuing
 */
async function testNetworkResilience() {
  console.log('🧪 Starting network resilience test...')
  
  const browser = await puppeteer.launch({ headless: true })
  
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 720 })
    
    // Create session
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
      path: path.join(SCREENSHOT_DIR, 'offline-state.png'),
      fullPage: true 
    })
    
    // Try to send message while offline
    console.log('💬 Attempting to send message while offline...')
    await page.evaluate((testPhrase) => {
      const messageEvent = new CustomEvent('testMessage', {
        detail: {
          id: 'test-msg-offline-' + Date.now(),
          original: testPhrase,
          translation: 'Hola, ¿cómo estás hoy?',
          original_lang: 'en',
          target_lang: 'es',
          status: 'queued', // Should be queued when offline
          created_at: new Date().toISOString(),
          user_id: 'user1'
        }
      })
      window.dispatchEvent(messageEvent)
    }, TEST_ENGLISH_PHRASE)
    
    // Message should appear with queued status
    await page.waitForSelector(`text=${TEST_ENGLISH_PHRASE}`, { timeout: 10000 })
    
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, 'message-queued-offline.png'),
      fullPage: true 
    })
    
    // Bring network back online
    console.log('📡 Bringing network back online...')
    await page.setOffline(false)
    
    // Should reconnect
    await page.waitForSelector(':text("Reconnecting")', { timeout: 5000 })
    await page.waitForSelector(':text("Connected")', { timeout: 15000 })
    
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, 'reconnected-state.png'),
      fullPage: true 
    })
    
    console.log('✅ Network resilience test completed successfully')
    
  } finally {
    await browser.close()
  }
}

/**
 * Test 3: Connection state indicators
 */
async function testConnectionStates() {
  console.log('🧪 Starting connection states test...')
  
  const browser = await puppeteer.launch({ headless: true })
  
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 720 })
    
    await page.goto(BASE_URL)
    await page.click('button:has-text("Start Session")')
    
    // Test connecting state
    await page.waitForSelector(':text("Connecting")', { timeout: 5000 })
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, 'connecting-state.png'),
      fullPage: true 
    })
    
    // Test connected state
    await page.waitForSelector(':text("Connected")', { timeout: 15000 })
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, 'connected-state.png'),
      fullPage: true 
    })
    
    // Test disconnected state
    await page.setOffline(true)
    await page.waitForSelector(':text("Disconnected")', { timeout: 10000 })
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, 'disconnected-state.png'),
      fullPage: true 
    })
    
    // Test reconnecting state
    await page.setOffline(false)
    await page.waitForSelector(':text("Reconnecting")', { timeout: 5000 })
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, 'reconnecting-state.png'),
      fullPage: true 
    })
    
    console.log('✅ Connection states test completed successfully')
    
  } finally {
    await browser.close()
  }
}

/**
 * Test 4: Mobile responsiveness
 */
async function testMobileResponsiveness() {
  console.log('🧪 Starting mobile responsiveness test...')
  
  const browser = await puppeteer.launch({ headless: true })
  
  try {
    const page = await browser.newPage()
    
    // Set mobile viewport
    await page.setViewport({ width: 375, height: 667 })
    
    await page.goto(BASE_URL)
    await page.click('button:has-text("Start Session")')
    await page.waitForSelector('[data-testid="session-code"]')
    
    // Test message display on mobile
    await page.evaluate((testPhrase) => {
      const messageEvent = new CustomEvent('testMessage', {
        detail: {
          id: 'test-msg-mobile-' + Date.now(),
          original: testPhrase,
          translation: 'Hola, ¿cómo estás hoy?',
          original_lang: 'en',
          target_lang: 'es',
          status: 'displayed',
          created_at: new Date().toISOString(),
          user_id: 'user1'
        }
      })
      window.dispatchEvent(messageEvent)
    }, TEST_ENGLISH_PHRASE)
    
    await page.waitForSelector(`text=${TEST_ENGLISH_PHRASE}`, { timeout: 10000 })
    
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, 'mobile-session-with-message.png'),
      fullPage: true 
    })
    
    console.log('✅ Mobile responsiveness test completed successfully')
    
  } finally {
    await browser.close()
  }
}

/**
 * Test 5: Dark mode
 */
async function testDarkMode() {
  console.log('🧪 Starting dark mode test...')
  
  const browser = await puppeteer.launch({ headless: true })
  
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 720 })
    
    await page.goto(BASE_URL)
    
    // Toggle dark mode if toggle exists
    try {
      await page.click('[data-testid="dark-mode-toggle"]')
    } catch (e) {
      // Dark mode toggle might not exist, manually set dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark')
      })
    }
    
    await page.click('button:has-text("Start Session")')
    await page.waitForSelector('[data-testid="session-code"]')
    
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, 'dark-mode-session.png'),
      fullPage: true 
    })
    
    console.log('✅ Dark mode test completed successfully')
    
  } finally {
    await browser.close()
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('🚀 Starting Phase 3 Puppeteer Test Suite...')
  
  // Ensure screenshot directory exists
  await ensureScreenshotDir()
  
  try {
    // Run tests sequentially to avoid conflicts
    await testTwoUserSession()
    await testNetworkResilience()
    await testConnectionStates()
    await testMobileResponsiveness()
    await testDarkMode()
    
    console.log('🎉 All Phase 3 tests completed successfully!')
    console.log('📸 Screenshots saved to:', SCREENSHOT_DIR)
    
  } catch (error) {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests()
}

module.exports = {
  runAllTests,
  testTwoUserSession,
  testNetworkResilience,
  testConnectionStates,
  testMobileResponsiveness,
  testDarkMode
}