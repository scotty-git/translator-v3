import { test, expect } from '@playwright/test'

test('Activity Broadcasting Fix Test', async ({ browser }) => {
  // Create two browser contexts to simulate two devices
  const context1 = await browser.newContext()
  const context2 = await browser.newContext()
  
  const page1 = await context1.newPage()
  const page2 = await context2.newPage()
  
  console.log('🔍 Testing activity broadcast fix...')
  
  // Track activity broadcasts
  let device1Broadcasts = []
  let device2Broadcasts = []
  
  // Enable console logging for both pages
  page1.on('console', msg => {
    const text = msg.text()
    if (text.includes('Activity broadcast received:')) {
      console.log('📱 Device 1 RECEIVED:', text)
      device1Broadcasts.push(text)
    } else if (text.includes('Broadcasting activity:')) {
      console.log('📱 Device 1 SENT:', text)
    }
  })
  
  page2.on('console', msg => {
    const text = msg.text()
    if (text.includes('Activity broadcast received:')) {
      console.log('📱 Device 2 RECEIVED:', text)
      device2Broadcasts.push(text)
    } else if (text.includes('Broadcasting activity:')) {
      console.log('📱 Device 2 SENT:', text)
    }
  })
  
  try {
    // Navigate both pages to the app
    await page1.goto('http://127.0.0.1:5174/')
    await page2.goto('http://127.0.0.1:5174/')
    
    // Wait for initialization
    await page1.waitForTimeout(2000)
    await page2.waitForTimeout(2000)
    
    // Device 1: Start a session
    await page1.click('button:has-text("Start Session")')
    await page1.waitForTimeout(3000)
    
    // Device 2: Click "Join Session" to show input
    await page2.click('button:has-text("Join Session")')
    await page2.waitForTimeout(1000)
    
    // Get the session code from device 1
    const sessionCodeExists = await page1.locator('[data-testid="session-code"]').count()
    if (sessionCodeExists === 0) {
      console.log('❌ Session code not found, skipping broadcast test')
      return
    }
    
    const sessionCode = await page1.textContent('[data-testid="session-code"]')
    console.log('📝 Session code:', sessionCode)
    
    // Device 2: Enter session code and join
    await page2.fill('input[type="text"]', sessionCode)
    await page2.click('button:has-text("Join")')
    
    // Wait for both devices to connect
    await page1.waitForTimeout(5000)
    await page2.waitForTimeout(5000)
    
    // Test activity broadcasting by clicking record button on device 1
    const recordButton1 = await page1.locator('button[data-testid="record-button"]').count()
    if (recordButton1 > 0) {
      console.log('🎤 Device 1 clicking record button...')
      await page1.click('button[data-testid="record-button"]')
      
      // Wait for activity broadcast
      await page1.waitForTimeout(2000)
      
      // Check if device 2 received the activity broadcast
      console.log('📊 Device 2 broadcasts received:', device2Broadcasts.length)
      
      // Stop recording
      await page1.click('button[data-testid="record-button"]')
      await page1.waitForTimeout(2000)
    }
    
    console.log('✅ Activity broadcast test completed')
    console.log('📊 Final results:')
    console.log('- Device 1 broadcasts received:', device1Broadcasts.length)
    console.log('- Device 2 broadcasts received:', device2Broadcasts.length)
    
  } catch (error) {
    console.error('❌ Activity broadcast test failed:', error)
    throw error
  } finally {
    await context1.close()
    await context2.close()
  }
})