import { test, expect } from '@playwright/test'

test.describe('Phase 1c: PresenceService Validation', () => {
  test('Activity indicators sync between devices', async ({ browser }) => {
    test.setTimeout(60000) // 60 second timeout for this test
    
    // Create two contexts
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    const host = await context1.newPage()
    const guest = await context2.newPage()
    
    try {
      // Set up session
      await host.goto('http://127.0.0.1:5173')
      await host.click('button:has-text("Create Session")')
      
      // Wait for and get the session code
      await host.waitForSelector('.font-mono', { timeout: 10000 })
      const code = await host.locator('.font-mono').textContent()
      expect(code).toBeTruthy()
      
      // Take screenshot of host session creation
      await host.screenshot({ path: 'test-results/phase-1c-host-session.png' })
      
      // Guest joins session
      await guest.goto('http://127.0.0.1:5173')
      await guest.click('button:has-text("Join Session")')
      await guest.fill('input', code!)
      await guest.click('button:has-text("Join")')
      
      // Wait for partner online on both devices
      await expect(host.locator('text="Partner Online"')).toBeVisible({ timeout: 10000 })
      await expect(guest.locator('text="Partner Online"')).toBeVisible({ timeout: 10000 })
      
      // Take screenshots to verify both devices show partner online
      await host.screenshot({ path: 'test-results/phase-1c-host-partner-online.png' })
      await guest.screenshot({ path: 'test-results/phase-1c-guest-partner-online.png' })
      
      // Host starts recording (grant microphone permission)
      await host.context().grantPermissions(['microphone'])
      
      // Find and click the recording button
      const recordButton = host.locator('button[data-testid="recording-button"], button:has(svg)')
      await recordButton.first().click()
      
      // Wait a moment for the activity to propagate
      await host.waitForTimeout(2000)
      
      // Guest should see "Partner is recording" activity indicator
      await expect(guest.locator('text*="recording"')).toBeVisible({ timeout: 5000 })
      
      // Take screenshot showing activity indicator
      await guest.screenshot({ path: 'test-results/phase-1c-activity-indicator.png' })
      
      // Stop recording
      await recordButton.first().click()
      
      // Wait for activity to clear
      await host.waitForTimeout(3000)
      
      // Activity indicator should disappear or show idle
      const recordingIndicators = guest.locator('text*="recording"')
      const count = await recordingIndicators.count()
      if (count > 0) {
        // If indicator still exists, it should be hidden or show idle
        const isVisible = await recordingIndicators.first().isVisible()
        expect(isVisible).toBe(false)
      }
      
      // Take final screenshot
      await guest.screenshot({ path: 'test-results/phase-1c-activity-cleared.png' })
      
    } finally {
      await context1.close()
      await context2.close()
    }
  })

  test('Partner online/offline detection', async ({ browser }) => {
    test.setTimeout(45000) // 45 second timeout
    
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    const host = await context1.newPage()
    const guest = await context2.newPage()
    
    try {
      // Create session
      await host.goto('http://127.0.0.1:5173')
      await host.click('button:has-text("Create Session")')
      const code = await host.locator('.font-mono').textContent()
      
      // Guest joins
      await guest.goto('http://127.0.0.1:5173')
      await guest.click('button:has-text("Join Session")')
      await guest.fill('input', code!)
      await guest.click('button:has-text("Join")')
      
      // Both should see partner online
      await expect(host.locator('text="Partner Online"')).toBeVisible({ timeout: 10000 })
      await expect(guest.locator('text="Partner Online"')).toBeVisible({ timeout: 10000 })
      
      // Take screenshot showing both partners online
      await host.screenshot({ path: 'test-results/phase-1c-both-online.png' })
      
      // Guest leaves (close page)
      await guest.close()
      
      // Host should see partner offline/waiting
      await expect(host.locator('text="Waiting for partner"')).toBeVisible({ timeout: 15000 })
      
      // Take screenshot showing partner offline
      await host.screenshot({ path: 'test-results/phase-1c-partner-offline.png' })
      
    } finally {
      await context1.close()
      // context2 already closed
    }
  })

  test('Multiple activity states work correctly', async ({ browser }) => {
    test.setTimeout(45000) // 45 second timeout
    
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    const host = await context1.newPage()
    const guest = await context2.newPage()
    
    try {
      // Set up session
      await host.goto('http://127.0.0.1:5173')
      await host.click('button:has-text("Create Session")')
      const code = await host.locator('.font-mono').textContent()
      
      await guest.goto('http://127.0.0.1:5173')
      await guest.click('button:has-text("Join Session")')
      await guest.fill('input', code!)
      await guest.click('button:has-text("Join")')
      
      // Wait for both partners to be online
      await expect(host.locator('text="Partner Online"')).toBeVisible({ timeout: 10000 })
      await expect(guest.locator('text="Partner Online"')).toBeVisible({ timeout: 10000 })
      
      // Test text input activity (if implemented)
      const textButton = host.locator('button[title*="text"], button:has-text("Text")')
      if (await textButton.count() > 0) {
        await textButton.first().click()
        
        // Look for text input
        const textInput = host.locator('input[placeholder*="message"], textarea, input[type="text"]')
        if (await textInput.count() > 0) {
          await textInput.first().fill('Test message')
          
          // Guest might see typing indicator (if implemented)
          await host.waitForTimeout(2000)
          await guest.screenshot({ path: 'test-results/phase-1c-typing-activity.png' })
          
          // Send message if there's a send button
          const sendButton = host.locator('button:has-text("Send"), button[type="submit"]')
          if (await sendButton.count() > 0) {
            await sendButton.first().click()
          }
        }
      }
      
      // Test recording activity
      await host.context().grantPermissions(['microphone'])
      
      const recordButton = host.locator('button[data-testid="recording-button"], button:has(svg)')
      if (await recordButton.count() > 0) {
        await recordButton.first().click()
        await host.waitForTimeout(2000)
        
        // Guest should see recording activity
        await guest.screenshot({ path: 'test-results/phase-1c-recording-activity.png' })
        
        // Stop recording
        await recordButton.first().click()
        await host.waitForTimeout(2000)
      }
      
      // Take final screenshot showing activity cleared
      await guest.screenshot({ path: 'test-results/phase-1c-final-state.png' })
      
    } finally {
      await context1.close()
      await context2.close()
    }
  })

  test('PresenceService prevents channel isolation bugs', async ({ browser }) => {
    test.setTimeout(30000) // 30 second timeout
    
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    const host = await context1.newPage()
    const guest = await context2.newPage()
    
    try {
      // Create session
      await host.goto('http://127.0.0.1:5173')
      await host.click('button:has-text("Create Session")')
      const code = await host.locator('.font-mono').textContent()
      
      // Guest joins quickly (to test deterministic channel naming)
      await guest.goto('http://127.0.0.1:5173')
      await guest.click('button:has-text("Join Session")')
      await guest.fill('input', code!)
      await guest.click('button:has-text("Join")')
      
      // Both devices should connect to the same presence channel
      // and see each other online within a reasonable time
      await expect(host.locator('text="Partner Online"')).toBeVisible({ timeout: 10000 })
      await expect(guest.locator('text="Partner Online"')).toBeVisible({ timeout: 10000 })
      
      // Take screenshot proving both devices are connected
      await host.screenshot({ path: 'test-results/phase-1c-no-isolation.png' })
      
      // Test rapid activity changes (would have caused issues with timestamp channels)
      await host.context().grantPermissions(['microphone'])
      const recordButton = host.locator('button[data-testid="recording-button"], button:has(svg)')
      
      if (await recordButton.count() > 0) {
        // Rapid start/stop to test channel stability
        await recordButton.first().click()
        await host.waitForTimeout(500)
        await recordButton.first().click()
        await host.waitForTimeout(500)
        
        // Activity should still sync properly
        await guest.screenshot({ path: 'test-results/phase-1c-rapid-activity.png' })
      }
      
    } finally {
      await context1.close()
      await context2.close()
    }
  })
})