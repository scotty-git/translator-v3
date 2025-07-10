import { test, expect } from '@playwright/test'

test.describe('Phase 1d: RealtimeConnection Validation', () => {
  test('Connection state management works', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173')
    
    // Create session
    await page.click('button:has-text("Create Session")')
    
    // Should show connecting then connected
    await expect(page.locator('text="Connecting..."')).toBeVisible()
    await expect(page.locator('text="Connected"')).toBeVisible({ timeout: 5000 })
    
    // Connection icon should be green
    await expect(page.locator('[class*="text-green"]')).toBeVisible()
  })

  test('Reconnection after network disruption', async ({ page, context }) => {
    await page.goto('http://127.0.0.1:5173')
    await page.click('button:has-text("Create Session")')
    
    // Wait for connection
    await expect(page.locator('text="Connected"')).toBeVisible()
    
    // Simulate offline
    await context.setOffline(true)
    
    // Should show disconnected
    await expect(page.locator('text="Disconnected"')).toBeVisible()
    
    // Go back online
    await context.setOffline(false)
    
    // Should reconnect
    await expect(page.locator('text="Reconnecting..."')).toBeVisible()
    await expect(page.locator('text="Connected"')).toBeVisible({ timeout: 10000 })
  })

  test('Message sync survives reconnection', async ({ browser }) => {
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
    
    // Send message
    await host.click('button[title="Text input"]')
    await host.fill('input[placeholder="Type message..."]', 'Before disconnect')
    await host.click('button:has-text("Send")')
    
    // Verify received
    await expect(guest.locator('text="Before disconnect"')).toBeVisible()
    
    // Simulate guest disconnect
    await context2.setOffline(true)
    await host.waitForTimeout(1000)
    await context2.setOffline(false)
    
    // Send another message
    await host.click('button[title="Text input"]')
    await host.fill('input[placeholder="Type message..."]', 'After reconnect')
    await host.click('button:has-text("Send")')
    
    // Should still receive
    await expect(guest.locator('text="After reconnect"')).toBeVisible({ timeout: 10000 })
  })

  test('Multiple channel subscriptions work', async ({ page }) => {
    // Monitor console for subscription confirmations
    const subscriptions: string[] = []
    page.on('console', msg => {
      if (msg.text().includes('SUBSCRIBED')) {
        subscriptions.push(msg.text())
      }
    })
    
    await page.goto('http://127.0.0.1:5173')
    await page.click('button:has-text("Create Session")')
    
    // Wait for subscriptions
    await page.waitForTimeout(3000)
    
    // Should have multiple channel subscriptions
    expect(subscriptions.length).toBeGreaterThanOrEqual(2) // messages + presence
    
    // Verify channel cleanup on exit
    await page.click('button[aria-label="Back"]')
    await page.click('button:has-text("Exit")')
    
    // Channels should be cleaned up (check console)
  })

  test('RealtimeConnection centralizes all channel management', async ({ page }) => {
    // Monitor console for RealtimeConnection logs
    const realtimeConnectionLogs: string[] = []
    page.on('console', msg => {
      if (msg.text().includes('[RealtimeConnection]')) {
        realtimeConnectionLogs.push(msg.text())
      }
    })
    
    await page.goto('http://127.0.0.1:5173')
    await page.click('button:has-text("Create Session")')
    
    // Wait for initialization
    await page.waitForTimeout(2000)
    
    // Should see RealtimeConnection initialization logs
    expect(realtimeConnectionLogs.some(log => 
      log.includes('Initializing connection')
    )).toBeTruthy()
    
    // Should see channel creation logs
    expect(realtimeConnectionLogs.some(log => 
      log.includes('Creating channel')
    )).toBeTruthy()
  })

  test('Network resilience features work correctly', async ({ page, context }) => {
    // Monitor console for reconnection attempts
    const reconnectionLogs: string[] = []
    page.on('console', msg => {
      if (msg.text().includes('reconnect') || msg.text().includes('Reconnect')) {
        reconnectionLogs.push(msg.text())
      }
    })
    
    await page.goto('http://127.0.0.1:5173')
    await page.click('button:has-text("Create Session")')
    
    // Wait for initial connection
    await expect(page.locator('text="Connected"')).toBeVisible()
    
    // Simulate network disruption
    await context.setOffline(true)
    await page.waitForTimeout(500)
    await context.setOffline(false)
    
    // Wait for reconnection
    await page.waitForTimeout(2000)
    
    // Should see reconnection logs
    expect(reconnectionLogs.length).toBeGreaterThan(0)
    
    // Should eventually reconnect
    await expect(page.locator('text="Connected"')).toBeVisible({ timeout: 10000 })
  })

  test('Connection state is easily observable', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173')
    await page.click('button:has-text("Create Session")')
    
    // Check that connection state is visible in UI
    // This might be shown as a connection indicator, status text, or icon
    const connectionElements = await page.locator('[class*="connection"], [class*="status"], [aria-label*="connection"], [aria-label*="status"]').count()
    
    // Should have some way to observe connection state
    expect(connectionElements).toBeGreaterThan(0)
  })

  test('MessageSyncService becomes simpler', async ({ page }) => {
    // Monitor console for MessageSyncService logs
    const messageSyncLogs: string[] = []
    page.on('console', msg => {
      if (msg.text().includes('[MessageSyncService]')) {
        messageSyncLogs.push(msg.text())
      }
    })
    
    await page.goto('http://127.0.0.1:5173')
    await page.click('button:has-text("Create Session")')
    
    // Wait for initialization
    await page.waitForTimeout(2000)
    
    // MessageSyncService should focus on message logic, not connection management
    const connectionManagementLogs = messageSyncLogs.filter(log => 
      log.includes('connection') || log.includes('channel') || log.includes('reconnect')
    )
    
    // Should have minimal connection management logs from MessageSyncService
    expect(connectionManagementLogs.length).toBeLessThan(5)
  })

  test('All real-time features still work', async ({ browser }) => {
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
    
    // Test real-time messaging
    await host.click('button[title="Text input"]')
    await host.fill('input[placeholder="Type message..."]', 'Test message')
    await host.click('button:has-text("Send")')
    
    await expect(guest.locator('text="Test message"')).toBeVisible()
    
    // Test activity indicators
    await guest.click('button[title="Voice input"]')
    await expect(host.locator('text="Partner is recording"')).toBeVisible()
    
    // Test partner presence
    await expect(host.locator('text="Partner Online"')).toBeVisible()
    await expect(guest.locator('text="Partner Online"')).toBeVisible()
    
    // Cleanup
    await context1.close()
    await context2.close()
  })
})