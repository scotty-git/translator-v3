import { test, expect, chromium } from '@playwright/test'

/**
 * COMPREHENSIVE EMOJI SYSTEM VALIDATION
 * 
 * Tests BOTH critical issues:
 * 1. Emoji picker width (must be ≤250px, safe for 390px viewport)
 * 2. Emoji overlay display (WhatsApp-style on message bubble)
 * 
 * This test validates the complete rebuilt emoji system.
 */
test('emoji system complete validation - width and overlay display', async ({ page }) => {
  const browser = await chromium.launch({ headless: true })
  
  console.log('🧪 Starting comprehensive emoji system validation...')
  
  // Navigate to production URL
  await page.goto('https://translator-v3.vercel.app')
  console.log('✅ Loaded production app')
  
  // Create a session
  const createButton = page.locator('button:has-text("Create New Session")')
  await expect(createButton).toBeVisible()
  await createButton.click()
  
  // Wait for session creation and get session code
  await page.waitForSelector('text=Session Code:')
  const sessionCode = await page.locator('text=Session Code:').textContent()
  const code = sessionCode?.match(/\d{4}/)?.[0]
  expect(code).toBeTruthy()
  console.log(`✅ Session created with code: ${code}`)
  
  // Open a second browser window for guest
  const guestPage = await browser.newPage()
  await guestPage.goto('https://translator-v3.vercel.app')
  
  // Join the session as guest
  const joinButton = guestPage.locator('button:has-text("Join Session")')
  await expect(joinButton).toBeVisible()
  await joinButton.click()
  
  // Enter session code
  const codeInput = guestPage.locator('input[placeholder="Enter 4-digit code"]')
  await expect(codeInput).toBeVisible()
  await codeInput.fill(code!)
  await guestPage.locator('button:has-text("Join")').click()
  
  // Wait for both to be connected
  await page.waitForSelector('text=Partner Online', { timeout: 10000 })
  await guestPage.waitForSelector('text=Partner Online', { timeout: 10000 })
  console.log('✅ Both users connected to session')
  
  // Host switches to text mode and sends a message
  const hostToggle = page.locator('button[aria-label="Toggle between voice and text input"]')
  await hostToggle.click()
  
  const hostInput = page.locator('input[placeholder="Type message..."]')
  await hostInput.fill('Test message for emoji reactions')
  await page.locator('button:has-text("Send")').click()
  console.log('✅ Host sent text message')
  
  // Wait for message to appear on guest side
  await guestPage.waitForSelector('text=Test message for emoji reactions', { timeout: 10000 })
  console.log('✅ Message synced to guest')
  
  // Guest also switches to text mode and sends a reply
  const guestToggle = guestPage.locator('button[aria-label="Toggle between voice and text input"]')
  await guestToggle.click()
  
  const guestInput = guestPage.locator('input[placeholder="Type message..."]')
  await guestInput.fill('Reply message to test reactions')
  await guestPage.locator('button:has-text("Send")').click()
  console.log('✅ Guest sent reply message')
  
  // Wait for reply to appear on host side
  await page.waitForSelector('text=Reply message to test reactions', { timeout: 10000 })
  console.log('✅ Reply synced to host')
  
  // Set viewport to mobile size (390px) to test width issue
  await page.setViewportSize({ width: 390, height: 844 })
  await guestPage.setViewportSize({ width: 390, height: 844 })
  console.log('✅ Set mobile viewport (390px) for width testing')
  
  // HOST: Test emoji picker on guest's message (long press)
  console.log('🎯 Testing emoji picker width on host side...')
  const guestMessageOnHost = page.locator('text=Reply message to test reactions').first()
  
  // Long press to trigger emoji picker
  await guestMessageOnHost.hover()
  await page.mouse.down()
  await page.waitForTimeout(800) // Long press duration
  await page.mouse.up()
  
  // Wait for emoji picker to appear
  await page.waitForSelector('[role="dialog"][aria-label="Emoji reaction picker"]', { timeout: 5000 })
  console.log('✅ Emoji picker appeared on host side')
  
  // Take screenshot of emoji picker for width validation
  await page.screenshot({ 
    path: 'test-results/emoji-picker-width-test-rebuilt.png',
    fullPage: false
  })
  console.log('📸 Screenshot taken: emoji-picker-width-test-rebuilt.png')
  
  // Measure picker width
  const pickerElement = page.locator('[role="dialog"][aria-label="Emoji reaction picker"]')
  const pickerBox = await pickerElement.boundingBox()
  expect(pickerBox).toBeTruthy()
  
  const pickerWidth = pickerBox!.width
  console.log(`📏 Emoji picker measured width: ${pickerWidth}px`)
  
  // CRITICAL: Picker must be ≤250px and not overflow 390px viewport
  expect(pickerWidth).toBeLessThanOrEqual(250)
  expect(pickerBox!.x + pickerWidth).toBeLessThanOrEqual(390)
  console.log('✅ PICKER WIDTH FIX VALIDATED: ≤250px and within viewport')
  
  // Select an emoji to test reaction overlay
  const heartEmoji = page.locator('button:has-text("❤️")').first()
  await expect(heartEmoji).toBeVisible()
  await heartEmoji.click()
  console.log('✅ Selected ❤️ emoji reaction')
  
  // Wait for picker to close
  await page.waitForSelector('[role="dialog"][aria-label="Emoji reaction picker"]', { 
    state: 'hidden',
    timeout: 3000 
  })
  console.log('✅ Emoji picker closed after selection')
  
  // CRITICAL: Check for emoji overlay on message bubble
  console.log('🎯 Testing emoji overlay display...')
  
  // Wait for reaction to appear (might take a moment for real-time sync)
  await page.waitForTimeout(2000)
  
  // Look for the emoji reaction overlay on the message
  // Should appear as bare emoji (WhatsApp style) positioned on message bubble
  const reactionOverlay = page.locator('text=❤️').filter({ 
    has: page.locator('[role="img"][aria-label="❤️"]') 
  })
  
  // Take screenshot showing the emoji overlay
  await page.screenshot({ 
    path: 'test-results/emoji-overlay-display-test.png',
    fullPage: false
  })
  console.log('📸 Screenshot taken: emoji-overlay-display-test.png')
  
  // Verify emoji is visible on message
  await expect(reactionOverlay).toBeVisible({ timeout: 5000 })
  console.log('✅ EMOJI OVERLAY FIX VALIDATED: Emoji visible on message bubble')
  
  // Additional validation: Check if emoji appears on guest side too
  await guestPage.waitForTimeout(2000)
  const reactionOnGuest = guestPage.locator('text=❤️').filter({ 
    has: guestPage.locator('[role="img"][aria-label="❤️"]') 
  })
  
  await guestPage.screenshot({ 
    path: 'test-results/emoji-overlay-guest-side.png',
    fullPage: false
  })
  console.log('📸 Screenshot taken: emoji-overlay-guest-side.png')
  
  await expect(reactionOnGuest).toBeVisible({ timeout: 5000 })
  console.log('✅ Emoji reaction synced and visible on guest side')
  
  // Test guest side emoji picker as well
  console.log('🎯 Testing emoji picker on guest side...')
  
  const hostMessageOnGuest = guestPage.locator('text=Test message for emoji reactions').first()
  await hostMessageOnGuest.hover()
  await guestPage.mouse.down()
  await guestPage.waitForTimeout(800)
  await guestPage.mouse.up()
  
  await guestPage.waitForSelector('[role="dialog"][aria-label="Emoji reaction picker"]', { timeout: 5000 })
  
  const guestPickerElement = guestPage.locator('[role="dialog"][aria-label="Emoji reaction picker"]')
  const guestPickerBox = await guestPickerElement.boundingBox()
  const guestPickerWidth = guestPickerBox!.width
  
  console.log(`📏 Guest side emoji picker width: ${guestPickerWidth}px`)
  expect(guestPickerWidth).toBeLessThanOrEqual(250)
  console.log('✅ Guest side picker width also fixed')
  
  // Select a different emoji on guest side
  const laughEmoji = guestPage.locator('button:has-text("😂")').first()
  await laughEmoji.click()
  
  await guestPage.waitForTimeout(2000)
  
  // Final comprehensive screenshot
  await page.screenshot({ 
    path: 'test-results/emoji-system-final-validation.png',
    fullPage: false
  })
  
  await guestPage.screenshot({ 
    path: 'test-results/emoji-system-guest-final.png',
    fullPage: false
  })
  
  console.log('🎉 BOTH EMOJI ISSUES COMPLETELY FIXED AND VALIDATED!')
  console.log('✅ Issue 1: Picker width ≤250px (was >400px)')
  console.log('✅ Issue 2: Emoji overlays visible on message bubbles (WhatsApp style)')
  
  await browser.close()
})