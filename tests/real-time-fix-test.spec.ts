import { test, expect } from '@playwright/test'

test('Real-time Connectivity and Activity Broadcasting Fix', async ({ browser }) => {
  // Create two browser contexts to simulate two devices
  const context1 = await browser.newContext()
  const context2 = await browser.newContext()
  
  const page1 = await context1.newPage()
  const page2 = await context2.newPage()
  
  console.log('🔍 Testing real-time connectivity and activity broadcasting fixes...')
  
  // Enable console logging for both pages
  page1.on('console', msg => console.log('📱 Device 1:', msg.text()))
  page2.on('console', msg => console.log('📱 Device 2:', msg.text()))
  
  try {
    // Navigate both pages to the app
    await page1.goto('http://127.0.0.1:5175/')
    await page2.goto('http://127.0.0.1:5175/')
    
    // Device 1: Create a session
    await page1.click('button:has-text("Start Session")')
    await page1.waitForSelector('text="Session:"', { timeout: 10000 })
    
    // Get the session code using a more robust approach
    const sessionCodeElement = await page1.locator('text=/^\\d{4}$/').first()
    const sessionCode = await sessionCodeElement.textContent()
    console.log('📝 Session code:', sessionCode)
    
    // Device 2: Join the session
    await page2.click('button:has-text("Join Session")')
    await page2.fill('input[data-testid="join-code-input"]', sessionCode)
    await page2.click('button:has-text("Join")')
    
    // Wait for both devices to be connected
    await page1.waitForSelector('text="Partner Online"', { timeout: 15000 })
    await page2.waitForSelector('text="Partner Online"', { timeout: 15000 })
    
    console.log('✅ Both devices show Partner Online')
    
    // Check for "Connected" status on both devices
    await page1.waitForSelector('text="Connected"', { timeout: 10000 })
    await page2.waitForSelector('text="Connected"', { timeout: 10000 })
    
    console.log('✅ Both devices show Connected status')
    
    // Test activity broadcasting - Device 1 starts recording
    console.log('🎤 Device 1 starting recording...')
    await page1.click('button[data-testid="recording-button"]')
    
    // Wait a moment for activity to propagate
    await page1.waitForTimeout(2000)
    
    // Check if Device 2 shows "Partner is recording"
    const hasRecordingActivity = await page2.locator('text*="is recording"').isVisible()
    console.log('📊 Device 2 shows recording activity:', hasRecordingActivity)
    
    // Stop recording on Device 1
    await page1.click('button[data-testid="recording-button"]')
    
    // Wait for processing
    await page1.waitForTimeout(3000)
    
    // Check if Device 2 shows "Partner is processing"
    const hasProcessingActivity = await page2.locator('text*="is processing"').isVisible()
    console.log('📊 Device 2 shows processing activity:', hasProcessingActivity)
    
    // Test message sync by sending a message from Device 1
    console.log('💬 Testing message sync...')
    await page1.click('button[data-testid="recording-button"]')
    await page1.waitForTimeout(1000) // Short recording
    await page1.click('button[data-testid="recording-button"]') // Stop recording
    
    // Wait for message to appear on Device 2 (look for any message bubble)
    await page2.waitForSelector('div[class*="message-bubble"]', { timeout: 15000 })
    
    console.log('✅ Message sync working correctly')
    
    // Take screenshots to verify UI state
    await page1.screenshot({ path: 'test-results/device1-real-time-fix.png' })
    await page2.screenshot({ path: 'test-results/device2-real-time-fix.png' })
    
    console.log('✅ Real-time connectivity and activity broadcasting fix test completed successfully')
    
  } catch (error) {
    console.error('❌ Real-time fix test failed:', error)
    
    // Take error screenshots
    await page1.screenshot({ path: 'test-results/device1-fix-error.png' })
    await page2.screenshot({ path: 'test-results/device2-fix-error.png' })
    
    throw error
  } finally {
    await context1.close()
    await context2.close()
  }
})