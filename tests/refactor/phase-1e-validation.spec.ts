import { test, expect } from '@playwright/test'

test.describe('Phase 1e: SessionStateManager Validation', () => {
  test('Session creation and code generation', async ({ page }) => {
    await page.goto('http://127.0.0.1:5177')
    
    // Create session
    await page.click('button:has-text("Start Session")')
    
    // Should get 4-digit code
    const code = await page.locator('.font-mono').textContent()
    expect(code).toMatch(/^\d{4}$/)
    
    // Session should be persisted
    await page.reload()
    
    // Should still be in session
    await expect(page.locator('.font-mono')).toContainText(code!)
  })

  test('Session joining and participant management', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    const host = await context1.newPage()
    const guest = await context2.newPage()
    
    // Host creates
    await host.goto('http://127.0.0.1:5177')
    await host.click('button:has-text("Start Session")')
    const code = await host.locator('.font-mono').textContent()
    
    // Guest joins
    await guest.goto('http://127.0.0.1:5177')
    await guest.click('button:has-text("Join Session")')
    await guest.fill('input', code!)
    await guest.click('button:has-text("Join")')
    
    // Both should see partner online
    await expect(host.locator('text="Partner Online"')).toBeVisible()
    await expect(guest.locator('text="Partner Online"')).toBeVisible()
    
    // Session info should match
    await expect(guest.locator('.font-mono')).toContainText(code!)
  })

  test('Session validation and expiry', async ({ page }) => {
    await page.goto('http://127.0.0.1:5177')
    
    // Try invalid code
    await page.click('button:has-text("Join Session")')
    await page.fill('input', '9999')
    await page.click('button:has-text("Join")')
    
    // Should show error
    await expect(page.locator('text*="Invalid"')).toBeVisible()
    
    // Should stay on home screen
    await expect(page.locator('text="Start Session"')).toBeVisible()
  })

  test('Session persistence across navigation', async ({ page }) => {
    await page.goto('http://127.0.0.1:5177')
    
    // Create session
    await page.click('button:has-text("Start Session")')
    const code = await page.locator('.font-mono').textContent()
    
    // Navigate away
    await page.click('button[aria-label*="Back"]')
    await expect(page.locator('text="Start Session"')).toBeVisible()
    
    // Navigate back via URL
    await page.goto('http://127.0.0.1:5177/session')
    
    // Should restore session
    await expect(page.locator('.font-mono')).toContainText(code!)
  })
})