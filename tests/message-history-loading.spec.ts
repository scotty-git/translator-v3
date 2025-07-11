import { test, expect } from '@playwright/test'

test.describe('Message History Loading', () => {
  test('User B sees all previous messages when joining', async ({ browser }) => {
    // Create two browser contexts for User A and User B
    const contextA = await browser.newContext()
    const contextB = await browser.newContext()
    
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()
    
    // User A creates session
    await pageA.goto('http://127.0.0.1:5173')
    await pageA.click('button:has-text("Start Session")')
    await pageA.waitForSelector('text=/Session: \\d{4}/')
    
    // Get session code
    const sessionCode = await pageA.locator('text=/\\d{4}/').textContent()
    console.log('📍 Session code:', sessionCode)
    
    // User A sends messages before User B joins
    // We'll use text input for testing since it's more reliable than audio
    await pageA.waitForSelector('textarea[placeholder*="Type a message"]')
    
    // Send first message
    await pageA.fill('textarea[placeholder*="Type a message"]', 'Message 1 from User A')
    await pageA.keyboard.press('Enter')
    await pageA.waitForSelector('text=Message 1 from User A')
    console.log('✅ User A sent message 1')
    
    // Send second message
    await pageA.fill('textarea[placeholder*="Type a message"]', 'Message 2 from User A')
    await pageA.keyboard.press('Enter')
    await pageA.waitForSelector('text=Message 2 from User A')
    console.log('✅ User A sent message 2')
    
    // Send third message
    await pageA.fill('textarea[placeholder*="Type a message"]', 'Message 3 from User A')
    await pageA.keyboard.press('Enter')
    await pageA.waitForSelector('text=Message 3 from User A')
    console.log('✅ User A sent message 3')
    
    // User B joins session
    await pageB.goto('http://127.0.0.1:5173')
    await pageB.click('button:has-text("Join Session")')
    
    // Fill in the session code
    const inputs = await pageB.locator('input[type="text"]').all()
    const codeDigits = sessionCode!.split('')
    for (let i = 0; i < 4; i++) {
      await inputs[i].fill(codeDigits[i])
    }
    
    // Click the Join button in the modal
    await pageB.click('div[role="dialog"] button:has-text("Join")')
    
    // Wait for session to load
    await pageB.waitForSelector('text=/Session: \\d{4}/', { timeout: 10000 })
    console.log('✅ User B joined session')
    
    // CRITICAL TEST: User B should see all 3 messages from User A
    await expect(pageB.locator('text=Message 1 from User A')).toBeVisible({ timeout: 5000 })
    await expect(pageB.locator('text=Message 2 from User A')).toBeVisible()
    await expect(pageB.locator('text=Message 3 from User A')).toBeVisible()
    console.log('✅ User B sees all historical messages!')
    
    // Verify no duplicates by counting messages
    const messageCount = await pageB.locator('text=/Message \\d from User A/').count()
    expect(messageCount).toBe(3)
    console.log('✅ No duplicate messages found')
    
    // Test real-time still works - User A sends a new message
    await pageA.fill('textarea[placeholder*="Type a message"]', 'Message 4 from User A - real-time test')
    await pageA.keyboard.press('Enter')
    
    // User B should see the new message in real-time
    await expect(pageB.locator('text=Message 4 from User A - real-time test')).toBeVisible({ timeout: 5000 })
    console.log('✅ Real-time messaging still works after history load')
    
    // Clean up
    await contextA.close()
    await contextB.close()
  })
  
  test('No duplicate messages when loading history', async ({ browser }) => {
    // Test that messages aren't duplicated between history load and real-time
    const contextA = await browser.newContext()
    const contextB = await browser.newContext()
    
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()
    
    // Setup session with messages
    await pageA.goto('http://127.0.0.1:5173')
    await pageA.click('button:has-text("Start Session")')
    const sessionCode = await pageA.locator('text=/\\d{4}/').textContent()
    
    // Send a test message
    await pageA.waitForSelector('textarea[placeholder*="Type a message"]')
    await pageA.fill('textarea[placeholder*="Type a message"]', 'Test message for duplicate check')
    await pageA.keyboard.press('Enter')
    await pageA.waitForSelector('text=Test message for duplicate check')
    
    // User B joins
    await pageB.goto('http://127.0.0.1:5173')
    await pageB.click('button:has-text("Join Session")')
    
    // Fill in the session code
    const inputs = await pageB.locator('input[type="text"]').all()
    const codeDigits = sessionCode!.split('')
    for (let i = 0; i < 4; i++) {
      await inputs[i].fill(codeDigits[i])
    }
    
    await pageB.click('div[role="dialog"] button:has-text("Join")')
    await pageB.waitForSelector('text=/Session: \\d{4}/')
    
    // Wait for message to appear
    await pageB.waitForSelector('text=Test message for duplicate check', { timeout: 5000 })
    
    // Wait a bit more to ensure no duplicates appear
    await pageB.waitForTimeout(2000)
    
    // Count messages - should be exactly 1
    const messages = await pageB.locator('text=Test message for duplicate check').count()
    expect(messages).toBe(1) // Exactly one message, no duplicates
    console.log('✅ No duplicate messages detected')
    
    // Clean up
    await contextA.close()
    await contextB.close()
  })
})