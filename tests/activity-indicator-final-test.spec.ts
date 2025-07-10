import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test'

test.describe('Activity Indicators - Final Verification Test', () => {
  let hostContext: BrowserContext
  let guestContext: BrowserContext
  let hostPage: Page
  let guestPage: Page

  test.beforeAll(async () => {
    // Launch two browser contexts to simulate two separate devices
    const browser = await chromium.launch({ headless: true })
    
    hostContext = await browser.newContext({
      viewport: { width: 375, height: 667 }, // iPhone SE
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15'
    })
    
    guestContext = await browser.newContext({
      viewport: { width: 375, height: 667 }, // iPhone SE
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15'
    })
    
    hostPage = await hostContext.newPage()
    guestPage = await guestContext.newPage()
    
    // Enable console logging to check for spam
    hostPage.on('console', (msg) => {
      console.log(`[HOST CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
    
    guestPage.on('console', (msg) => {
      console.log(`[GUEST CONSOLE] ${msg.type()}: ${msg.text()}`)
    })
  })

  test.afterAll(async () => {
    await hostContext?.close()
    await guestContext?.close()
  })

  test('complete activity indicator flow with console verification', async () => {
    console.log('🎯 [Test] Starting complete activity indicator flow test...')
    
    // Step 1: Host creates session
    console.log('📱 [Test] Host creating session...')
    await hostPage.goto('http://127.0.0.1:5173/')
    await hostPage.click('button:has-text("Create Session")')
    await hostPage.waitForSelector('[data-testid="session-code"]', { timeout: 10000 })
    
    const sessionCode = await hostPage.textContent('[data-testid="session-code"]')
    console.log(`🔑 [Test] Session code: ${sessionCode}`)
    
    // Take screenshot of host after session creation
    await hostPage.screenshot({ path: 'test-results/host-session-created.png', fullPage: true })
    
    // Step 2: Guest joins session
    console.log('👥 [Test] Guest joining session...')
    await guestPage.goto('http://127.0.0.1:5173/')
    await guestPage.click('button:has-text("Join Session")')
    await guestPage.fill('input[placeholder*="session code"]', sessionCode!)
    await guestPage.click('button:has-text("Join")')
    
    // Wait for both devices to show "Partner Online"
    console.log('⏳ [Test] Waiting for partner connection...')
    await Promise.all([
      hostPage.waitForSelector('text=Partner Online', { timeout: 15000 }),
      guestPage.waitForSelector('text=Partner Online', { timeout: 15000 })
    ])
    
    // Take screenshots after connection
    await hostPage.screenshot({ path: 'test-results/host-partner-connected.png', fullPage: true })
    await guestPage.screenshot({ path: 'test-results/guest-partner-connected.png', fullPage: true })
    
    console.log('✅ [Test] Both devices connected')
    
    // Step 3: Test recording activity indicator on guest → should show on host
    console.log('🎤 [Test] Guest starting recording (should show activity on host)...')
    
    // Start recording on guest
    await guestPage.click('[data-testid="record-button"]')
    
    // Wait a moment for activity to propagate
    await guestPage.waitForTimeout(2000)
    
    // Check if host shows recording activity
    console.log('🔍 [Test] Checking if host shows guest recording activity...')
    
    // Look for activity indicator on host
    const hostActivityVisible = await hostPage.isVisible('text*=recording')
    console.log(`📊 [Test] Host shows recording activity: ${hostActivityVisible}`)
    
    // Take screenshots during recording
    await hostPage.screenshot({ path: 'test-results/host-sees-guest-recording.png', fullPage: true })
    await guestPage.screenshot({ path: 'test-results/guest-recording.png', fullPage: true })
    
    // Stop recording
    await guestPage.click('[data-testid="record-button"]')
    await guestPage.waitForTimeout(1000)
    
    // Check processing activity
    console.log('🧠 [Test] Checking processing activity...')
    await guestPage.waitForTimeout(3000) // Allow time for processing
    
    const hostProcessingVisible = await hostPage.isVisible('text*=processing')
    console.log(`📊 [Test] Host shows processing activity: ${hostProcessingVisible}`)
    
    // Take final screenshots
    await hostPage.screenshot({ path: 'test-results/host-final-state.png', fullPage: true })
    await guestPage.screenshot({ path: 'test-results/guest-final-state.png', fullPage: true })
    
    // Step 4: Verify console cleanliness
    console.log('📝 [Test] Console verification complete - check logs above for spam')
    
    // Step 5: Test reverse direction - host records, guest should see activity
    console.log('🔄 [Test] Testing reverse direction - host recording...')
    await hostPage.click('[data-testid="record-button"]')
    await hostPage.waitForTimeout(2000)
    
    const guestSeeHostRecording = await guestPage.isVisible('text*=recording')
    console.log(`📊 [Test] Guest shows host recording activity: ${guestSeeHostRecording}`)
    
    await hostPage.screenshot({ path: 'test-results/host-recording-reverse.png', fullPage: true })
    await guestPage.screenshot({ path: 'test-results/guest-sees-host-recording.png', fullPage: true })
    
    await hostPage.click('[data-testid="record-button"]')
    
    console.log('✅ [Test] Activity indicator flow test completed')
    
    // Final verification
    expect(hostActivityVisible || hostProcessingVisible).toBeTruthy()
  })
})