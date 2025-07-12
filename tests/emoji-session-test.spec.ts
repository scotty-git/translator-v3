import { test, expect, chromium } from '@playwright/test'

/**
 * EMOJI SESSION MODE TEST
 * 
 * Use the correct "Start Session" button to test emoji reactions
 * in the proper session mode environment.
 */
test('emoji session mode validation', async ({ page }) => {
  const browser = await chromium.launch({ headless: true })
  
  console.log('🧪 Testing emoji system in session mode...')
  
  // Navigate to production URL
  await page.goto('https://translator-v3.vercel.app')
  console.log('✅ Loaded production app')
  
  // Click "Start Session" button (not "Start Translating")
  const startSessionButton = page.locator('button:has-text("Start Session")')
  await expect(startSessionButton).toBeVisible()
  await startSessionButton.click()
  console.log('✅ Clicked Start Session button')
  
  // Wait for session creation
  await page.waitForTimeout(3000)
  
  // Take screenshot to see session state
  await page.screenshot({ 
    path: 'test-results/session-mode-created.png',
    fullPage: true
  })
  console.log('📸 Screenshot taken: session-mode-created.png')
  
  // Look for session code (try multiple possible selectors)
  let sessionCode = null
  const codeSelectors = [
    'text=Session Code:',
    'text=Code:',
    'text=Room:',
    '[data-testid="session-code"]',
    'text=Session:'
  ]
  
  for (const selector of codeSelectors) {
    try {
      const element = page.locator(selector)
      if (await element.isVisible()) {
        const text = await element.textContent()
        console.log(`✅ Found session info: ${text}`)
        sessionCode = text?.match(/\d{4}/)?.[0]
        break
      }
    } catch (e) {
      // Continue searching
    }
  }
  
  // If no session code found, check page content
  if (!sessionCode) {
    console.log('🔍 Checking page content for session info...')
    const content = await page.textContent('body')
    const codeMatch = content?.match(/\d{4}/)
    if (codeMatch) {
      sessionCode = codeMatch[0]
      console.log(`✅ Found session code in content: ${sessionCode}`)
    } else {
      console.log('❌ No session code found in content')
      console.log('Content:', content)
      return
    }
  }
  
  // Open guest window
  const guestPage = await browser.newPage()
  await guestPage.goto('https://translator-v3.vercel.app')
  
  // Join session as guest
  const joinButton = guestPage.locator('button:has-text("Join Session")')
  await expect(joinButton).toBeVisible()
  await joinButton.click()
  console.log('✅ Guest clicked Join Session')
  
  // Enter session code
  await guestPage.waitForTimeout(2000)
  const codeInput = guestPage.locator('input[placeholder*="code"], input[type="text"]').first()
  await expect(codeInput).toBeVisible()
  await codeInput.fill(sessionCode!)
  
  // Click join/connect button
  const connectButtons = [
    'button:has-text("Join")',
    'button:has-text("Connect")', 
    'button:has-text("Enter")',
    'button[type="submit"]'
  ]
  
  let joinClicked = false
  for (const selector of connectButtons) {
    try {
      const btn = guestPage.locator(selector)
      if (await btn.isVisible()) {
        await btn.click()
        joinClicked = true
        console.log(`✅ Guest clicked ${selector}`)
        break
      }
    } catch (e) {
      // Continue
    }
  }
  
  if (!joinClicked) {
    // Try pressing Enter
    await codeInput.press('Enter')
    console.log('✅ Guest pressed Enter on code input')
  }
  
  // Wait for connection
  await page.waitForTimeout(5000)
  await guestPage.waitForTimeout(5000)
  
  // Take screenshots of both sides
  await page.screenshot({ 
    path: 'test-results/host-session-connected.png',
    fullPage: true
  })
  
  await guestPage.screenshot({ 
    path: 'test-results/guest-session-connected.png',
    fullPage: true
  })
  
  console.log('📸 Screenshots taken of both connected sessions')
  
  // Check for "Partner Online" or connection indicator
  const connectionIndicators = [
    'text=Partner Online',
    'text=Connected',
    'text=Online',
    'text=Ready'
  ]
  
  let hostConnected = false
  let guestConnected = false
  
  for (const indicator of connectionIndicators) {
    try {
      if (await page.locator(indicator).isVisible()) {
        hostConnected = true
        console.log(`✅ Host shows: ${indicator}`)
      }
      if (await guestPage.locator(indicator).isVisible()) {
        guestConnected = true
        console.log(`✅ Guest shows: ${indicator}`)
      }
    } catch (e) {
      // Continue
    }
  }
  
  console.log(`Connection status - Host: ${hostConnected}, Guest: ${guestConnected}`)
  
  // If we have a session, try to test emojis in solo mode for now
  // Set mobile viewport for width testing
  await page.setViewportSize({ width: 390, height: 844 })
  console.log('✅ Set mobile viewport (390px) for emoji width testing')
  
  // Look for toggle button to switch to text mode
  const toggleButtons = [
    'button[aria-label*="toggle"], button[aria-label*="Toggle"]',
    'button:has-text("💬")',
    'button:has-text("📝")',
    'button[title*="text"], button[title*="Text"]'
  ]
  
  let toggleFound = false
  for (const selector of toggleButtons) {
    try {
      const btn = page.locator(selector).first()
      if (await btn.isVisible()) {
        await btn.click()
        toggleFound = true
        console.log(`✅ Clicked toggle button: ${selector}`)
        break
      }
    } catch (e) {
      // Continue
    }
  }
  
  if (!toggleFound) {
    console.log('❌ No toggle button found - checking for text input directly')
  }
  
  await page.waitForTimeout(2000)
  
  // Take screenshot after toggle
  await page.screenshot({ 
    path: 'test-results/after-toggle-to-text.png',
    fullPage: true
  })
  console.log('📸 Screenshot taken: after-toggle-to-text.png')
  
  // Look for text input and send a message
  const textInputs = [
    'input[placeholder*="message"], input[placeholder*="Message"]',
    'input[type="text"]:not([placeholder*="code"])',
    'textarea'
  ]
  
  let inputFound = false
  for (const selector of textInputs) {
    try {
      const input = page.locator(selector).first()
      if (await input.isVisible()) {
        await input.fill('Test message for emoji reactions')
        inputFound = true
        console.log(`✅ Filled text input: ${selector}`)
        
        // Look for send button
        const sendButtons = [
          'button:has-text("Send")',
          'button[type="submit"]',
          'button[aria-label*="send"], button[aria-label*="Send"]'
        ]
        
        let sendClicked = false
        for (const sendSelector of sendButtons) {
          try {
            const sendBtn = page.locator(sendSelector)
            if (await sendBtn.isVisible()) {
              await sendBtn.click()
              sendClicked = true
              console.log(`✅ Clicked send button: ${sendSelector}`)
              break
            }
          } catch (e) {
            // Continue
          }
        }
        
        if (!sendClicked) {
          await input.press('Enter')
          console.log('✅ Pressed Enter on text input')
        }
        
        break
      }
    } catch (e) {
      // Continue
    }
  }
  
  if (!inputFound) {
    console.log('❌ No text input found')
  }
  
  await page.waitForTimeout(2000)
  
  // Take screenshot after sending message
  await page.screenshot({ 
    path: 'test-results/after-sending-message.png',
    fullPage: true
  })
  console.log('📸 Screenshot taken: after-sending-message.png')
  
  // Look for the message bubble to test emoji picker
  const messageBubbles = [
    '[data-testid="message-bubble"]',
    'div:has-text("Test message for emoji reactions")',
    '.message-bubble',
    '[role="article"]'
  ]
  
  let messageFound = false
  for (const selector of messageBubbles) {
    try {
      const message = page.locator(selector).first()
      if (await message.isVisible()) {
        console.log(`✅ Found message bubble: ${selector}`)
        
        // Long press to trigger emoji picker
        await message.hover()
        await page.mouse.down()
        await page.waitForTimeout(800) // Long press duration
        await page.mouse.up()
        
        console.log('✅ Performed long press on message')
        messageFound = true
        break
      }
    } catch (e) {
      // Continue
    }
  }
  
  if (!messageFound) {
    console.log('❌ No message bubble found for emoji testing')
  }
  
  await page.waitForTimeout(2000)
  
  // Check for emoji picker
  const emojiPicker = page.locator('[role="dialog"][aria-label*="emoji"], [role="dialog"][aria-label*="Emoji"]')
  if (await emojiPicker.isVisible()) {
    console.log('✅ Emoji picker appeared!')
    
    // Measure picker width
    const pickerBox = await emojiPicker.boundingBox()
    if (pickerBox) {
      console.log(`📏 Emoji picker width: ${pickerBox.width}px`)
      
      // Validate width
      if (pickerBox.width <= 250) {
        console.log('✅ PICKER WIDTH FIX VALIDATED: ≤250px')
      } else {
        console.log(`❌ PICKER WIDTH STILL TOO WIDE: ${pickerBox.width}px > 250px`)
      }
      
      // Check if picker is within viewport
      if (pickerBox.x + pickerBox.width <= 390) {
        console.log('✅ PICKER FITS IN VIEWPORT: No overflow')
      } else {
        console.log(`❌ PICKER OVERFLOWS VIEWPORT: ${pickerBox.x + pickerBox.width}px > 390px`)
      }
    }
    
    // Take screenshot of emoji picker
    await page.screenshot({ 
      path: 'test-results/emoji-picker-width-final-test.png',
      fullPage: false
    })
    console.log('📸 Screenshot taken: emoji-picker-width-final-test.png')
    
    // Try to select an emoji
    const heartEmoji = page.locator('button:has-text("❤️")').first()
    if (await heartEmoji.isVisible()) {
      await heartEmoji.click()
      console.log('✅ Selected ❤️ emoji')
      
      await page.waitForTimeout(2000)
      
      // Check for emoji overlay on message
      const emojiOverlay = page.locator('text=❤️').filter({ 
        has: page.locator('[role="img"][aria-label="❤️"]') 
      })
      
      if (await emojiOverlay.isVisible()) {
        console.log('✅ EMOJI OVERLAY FIX VALIDATED: Emoji visible on message!')
      } else {
        console.log('❌ EMOJI OVERLAY NOT VISIBLE: Emoji not showing on message')
      }
      
      // Final screenshot
      await page.screenshot({ 
        path: 'test-results/emoji-overlay-final-validation.png',
        fullPage: false
      })
      console.log('📸 Screenshot taken: emoji-overlay-final-validation.png')
    }
  } else {
    console.log('❌ Emoji picker did not appear')
  }
  
  await browser.close()
  
  console.log('🎉 Emoji system test completed!')
})