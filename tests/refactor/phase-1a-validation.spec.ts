import { test, expect } from '@playwright/test'

test.describe('Phase 1a: MessageQueue Extraction Validation', () => {
  test('Solo mode message flow works', async ({ page }) => {
    await page.goto('http://127.0.0.1:5176')
    await page.getByText('Solo').click()
    
    // Test text message
    await page.click('button[title="Text input"]')
    await page.fill('input[placeholder="Type message..."]', 'Hola amigo')
    await page.click('button:has-text("Send")')
    
    // Verify message appears
    await expect(page.locator('.message-bubble').first()).toContainText('Hola amigo')
    await expect(page.locator('.message-bubble').first()).toContainText('Hello friend')
  })

  test('Session mode message sync works', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    const host = await context1.newPage()
    const guest = await context2.newPage()
    
    // Create session
    await host.goto('http://127.0.0.1:5176')
    await host.click('button:has-text("Create Session")')
    const code = await host.locator('.font-mono').textContent()
    
    // Join session
    await guest.goto('http://127.0.0.1:5176')
    await guest.click('button:has-text("Join Session")')
    await guest.fill('input', code!)
    await guest.click('button:has-text("Join")')
    
    // Send message from host
    await host.click('button[title="Text input"]')
    await host.fill('input[placeholder="Type message..."]', 'Hello guest')
    await host.click('button:has-text("Send")')
    
    // Verify on both sides
    await expect(host.locator('.message-bubble').first()).toContainText('Hello guest')
    await expect(guest.locator('.message-bubble').first()).toContainText('Hello guest')
  })

  test('Performance benchmark', async ({ page }) => {
    await page.goto('http://127.0.0.1:5176')
    await page.getByText('Solo').click()
    
    const startTime = Date.now()
    
    // Send 10 messages rapidly
    for (let i = 0; i < 10; i++) {
      await page.click('button[title="Text input"]')
      await page.fill('input[placeholder="Type message..."]', `Message ${i}`)
      await page.click('button:has-text("Send")')
    }
    
    // Wait for all to appear
    await expect(page.locator('.message-bubble')).toHaveCount(10)
    
    const endTime = Date.now()
    const totalTime = endTime - startTime
    
    // Should process 10 messages in under 5 seconds
    expect(totalTime).toBeLessThan(5000)
    console.log(`Performance: Processed 10 messages in ${totalTime}ms`)
  })

  test('MessageQueueService dependency injection works', async ({ page }) => {
    // Test that both solo and session modes work, proving injection is successful
    await page.goto('http://127.0.0.1:5176')
    
    // Test solo mode
    await page.getByText('Solo').click()
    await page.click('button[title="Text input"]')
    await page.fill('input[placeholder="Type message..."]', 'DI Test Solo')
    await page.click('button:has-text("Send")')
    await expect(page.locator('.message-bubble').first()).toContainText('DI Test Solo')
    
    // Go back and test session creation
    await page.goBack()
    await page.click('button:has-text("Create Session")')
    
    // Verify session starts without errors (proving SessionTranslator injection works)
    await expect(page.locator('.font-mono')).toBeVisible()
  })
})