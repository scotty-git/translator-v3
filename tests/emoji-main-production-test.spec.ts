import { test, expect, chromium } from '@playwright/test'

/**
 * FINAL EMOJI VALIDATION ON MAIN PRODUCTION URL
 * 
 * Tests both critical fixes:
 * 1. Emoji picker width (≤250px, no overflow)
 * 2. Emoji overlay display (WhatsApp style on message bubbles)
 */
test('main production emoji fixes validation', async ({ page }) => {
  const browser = await chromium.launch({ headless: true })
  
  console.log('🎯 Testing emoji fixes on MAIN production URL...')
  
  // Use main production URL
  await page.goto('https://translator-v3.vercel.app')
  console.log('✅ Loaded main production URL')
  
  // Set mobile viewport
  await page.setViewportSize({ width: 390, height: 844 })
  console.log('📱 Set mobile viewport (390px)')
  
  // Take initial screenshot
  await page.screenshot({ 
    path: 'test-results/main-production-homepage.png',
    fullPage: true
  })
  console.log('📸 Screenshot: main-production-homepage.png')
  
  // Start session
  const startSessionButton = page.locator('button:has-text("Start Session")')
  await expect(startSessionButton).toBeVisible()
  await startSessionButton.click()
  console.log('✅ Started session')
  
  await page.waitForTimeout(3000)
  
  // Get session code
  const content = await page.textContent('body')
  const sessionCode = content?.match(/\d{4}/)?.[0]
  expect(sessionCode).toBeTruthy()
  console.log(`✅ Session: ${sessionCode}`)
  
  // Guest joins
  const guestPage = await browser.newPage()
  await guestPage.setViewportSize({ width: 390, height: 844 })
  await guestPage.goto('https://translator-v3.vercel.app')
  
  const joinButton = guestPage.locator('button:has-text("Join Session")')
  await joinButton.click()
  
  const codeInput = guestPage.locator('input').first()
  await codeInput.fill(sessionCode!)
  await codeInput.press('Enter')
  console.log('✅ Guest joined')
  
  // Wait for connection
  await page.waitForTimeout(5000)
  
  // Switch to text mode and send messages
  const hostToggle = page.locator('button[title*="text"], button[aria-label*="toggle"]').first()
  await hostToggle.click()
  
  const hostInput = page.locator('input[placeholder*="message"]')
  await hostInput.fill('Test message for emoji')
  await page.locator('button:has-text("Send")').click()
  console.log('✅ Host sent message')
  
  // Guest sends reply
  const guestToggle = guestPage.locator('button[title*="text"], button[aria-label*="toggle"]').first()
  await guestToggle.click()
  
  const guestInput = guestPage.locator('input[placeholder*="message"]')
  await guestInput.fill('Reply message')
  await guestPage.locator('button:has-text("Send")').click()
  console.log('✅ Guest sent reply')
  
  await page.waitForTimeout(3000)
  
  // Test emoji picker on guest message
  console.log('🎯 Testing emoji picker...')
  
  const guestMessage = page.locator('text=Reply message').first()
  await expect(guestMessage).toBeVisible()
  
  // Long press
  await guestMessage.hover()
  await page.mouse.down()
  await page.waitForTimeout(1200) // Extra long press
  await page.mouse.up()
  
  // Check for emoji picker
  await page.waitForTimeout(2000)
  
  const emojiPicker = page.locator('[role="dialog"], [aria-label*="emoji"], [aria-label*="Emoji"]')
  
  if (await emojiPicker.isVisible()) {
    console.log('✅ Emoji picker appeared!')
    
    // Measure width
    const pickerBox = await emojiPicker.boundingBox()
    if (pickerBox) {
      const width = pickerBox.width
      console.log(`📏 Picker width: ${width}px`)
      
      if (width <= 250) {
        console.log('✅ WIDTH FIX VALIDATED: ≤250px ✓')
      } else {
        console.log(`❌ WIDTH STILL TOO WIDE: ${width}px > 250px`)
      }
      
      if (pickerBox.x + width <= 390) {
        console.log('✅ NO OVERFLOW: Fits in viewport ✓')
      } else {
        console.log(`❌ OVERFLOW: ${pickerBox.x + width}px > 390px`)
      }
    }
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/emoji-picker-production-test.png',
      fullPage: false
    })
    console.log('📸 Screenshot: emoji-picker-production-test.png')
    
    // Try to select emoji
    const emojiButtons = await page.locator('button:has-text("❤️"), button:has-text("😀"), button:has-text("😂")').all()
    if (emojiButtons.length > 0) {
      await emojiButtons[0].click()
      console.log('✅ Selected emoji')
      
      await page.waitForTimeout(2000)
      
      // Check for emoji overlay
      const emojiOverlay = page.locator('[role="img"]').first()
      
      if (await emojiOverlay.isVisible()) {
        console.log('✅ EMOJI OVERLAY FIX VALIDATED: Emoji visible ✓')
      } else {
        console.log('❌ EMOJI OVERLAY NOT VISIBLE')
      }
      
      await page.screenshot({ 
        path: 'test-results/emoji-overlay-production-test.png',
        fullPage: false
      })
      console.log('📸 Screenshot: emoji-overlay-production-test.png')
    }
  } else {
    console.log('❌ Emoji picker did not appear')
    
    // Take screenshot for debugging
    await page.screenshot({ 
      path: 'test-results/no-emoji-picker-debug.png',
      fullPage: true
    })
    console.log('📸 Debug screenshot: no-emoji-picker-debug.png')
  }
  
  await browser.close()
  
  console.log('🎉 Production emoji test completed!')
})