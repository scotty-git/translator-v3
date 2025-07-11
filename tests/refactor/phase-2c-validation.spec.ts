import { test, expect } from '@playwright/test'

test.describe('Phase 2c: SessionTranslator Refactor Validation', () => {
  test('Session creation and joining works', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    const host = await context1.newPage()
    const guest = await context2.newPage()
    
    // Host creates session
    await host.goto('http://127.0.0.1:5173')
    await host.click('button:has-text("Create Session")')
    const code = await host.locator('.font-mono').textContent()
    
    // Should show session UI
    await expect(host.locator('text="Session:"')).toBeVisible()
    await expect(host.locator('.font-mono')).toContainText(code!)
    
    // Guest joins
    await guest.goto('http://127.0.0.1:5173')
    await guest.click('button:has-text("Join Session")')
    await guest.fill('input', code!)
    await guest.click('button:has-text("Join")')
    
    // Both see partner online
    await expect(host.locator('text="Partner Online"')).toBeVisible()
    await expect(guest.locator('text="Partner Online"')).toBeVisible()
  })

  test('Real-time message sync works', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    const host = await context1.newPage()
    const guest = await context2.newPage()
    
    // Set up session
    await host.goto('http://127.0.0.1:5173')
    await host.click('button:has-text("Create Session")')
    const code = await host.locator('.font-mono').textContent()
    
    await guest.goto('http://127.0.0.1:5173')
    await guest.click('button:has-text("Join Session")')
    await guest.fill('input', code!)
    await guest.click('button:has-text("Join")')
    
    // Send message from host
    await host.click('button[title="Text input"]')
    await host.fill('input[placeholder="Type message..."]', 'Hello from host')
    await host.click('button:has-text("Send")')
    
    // Both should see it
    await expect(host.locator('text="Hello from host"')).toBeVisible()
    await expect(guest.locator('text="Hello from host"')).toBeVisible()
    
    // Send from guest
    await guest.click('button[title="Text input"]')
    await guest.fill('input[placeholder="Type message..."]', 'Hi from guest')
    await guest.click('button:has-text("Send")')
    
    // Both should see it
    await expect(host.locator('text="Hi from guest"')).toBeVisible()
    await expect(guest.locator('text="Hi from guest"')).toBeVisible()
  })

  test('Activity indicators work', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    const host = await context1.newPage()
    const guest = await context2.newPage()
    
    // Set up session
    await host.goto('http://127.0.0.1:5173')
    await host.click('button:has-text("Create Session")')
    const code = await host.locator('.font-mono').textContent()
    
    await guest.goto('http://127.0.0.1:5173')
    await guest.click('button:has-text("Join Session")')
    await guest.fill('input', code!)
    await guest.click('button:has-text("Join")')
    
    // Host records
    await host.context().grantPermissions(['microphone'])
    await host.click('button[data-testid="recording-button"]')
    
    // Guest sees indicator
    await expect(guest.locator('text="Partner is recording"')).toBeVisible()
    
    // Stop recording
    await host.click('button[data-testid="recording-button"]')
    
    // Indicator disappears
    await expect(guest.locator('text="Partner is recording"')).not.toBeVisible({ timeout: 3000 })
  })

  test('Connection status shows correctly', async ({ page, context }) => {
    await page.goto('http://127.0.0.1:5173')
    await page.click('button:has-text("Create Session")')
    
    // Should show connected
    await expect(page.locator('text="Connected"')).toBeVisible()
    
    // Simulate offline
    await context.setOffline(true)
    await expect(page.locator('text="Disconnected"')).toBeVisible()
    
    // Back online
    await context.setOffline(false)
    await expect(page.locator('text="Reconnecting"')).toBeVisible()
    await expect(page.locator('text="Connected"')).toBeVisible({ timeout: 10000 })
  })

  test('Phase 2C: Solo mode still works perfectly', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173')
    
    // Should see main page
    await expect(page.locator('button:has-text("Create Session")')).toBeVisible()
    await expect(page.locator('button:has-text("Join Session")')).toBeVisible()
    await expect(page.locator('button:has-text("Solo Mode")')).toBeVisible()
    
    // Click Solo Mode
    await page.click('button:has-text("Solo Mode")')
    
    // Should see solo translator
    await expect(page.locator('button[data-testid="recording-button"]')).toBeVisible()
    
    // Test text input in solo mode
    await page.click('button[title="Text input"]')
    await page.fill('input[placeholder="Type message..."]', 'Hello solo mode')
    await page.click('button:has-text("Send")')
    
    // Should see the message
    await expect(page.locator('text="Hello solo mode"')).toBeVisible()
  })

  test('Phase 2C: UI preservation validation', async ({ page }) => {
    // Test that session mode UI looks exactly the same as before
    await page.goto('http://127.0.0.1:5173')
    await page.click('button:has-text("Create Session")')
    
    // Should see session header elements
    await expect(page.locator('text="Session:"')).toBeVisible()
    await expect(page.locator('.font-mono')).toBeVisible() // Session code
    
    // Should see translation controls
    await expect(page.locator('button[data-testid="recording-button"]')).toBeVisible()
    await expect(page.locator('button[title="Text input"]')).toBeVisible()
    
    // Should see status indicators
    await expect(page.locator('text="Connected"')).toBeVisible()
    await expect(page.locator('text="Waiting for partner"')).toBeVisible()
  })
})