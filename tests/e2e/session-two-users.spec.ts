import { test, expect, devices, Page, Browser } from '@playwright/test'

test.describe('Session with Two Users', () => {
  let browser1: Browser
  let browser2: Browser
  let page1: Page
  let page2: Page
  let sessionCode: string

  test.beforeEach(async ({ playwright }) => {
    // Launch two separate browsers
    browser1 = await playwright.chromium.launch({ headless: false })
    browser2 = await playwright.chromium.launch({ headless: false })
    
    // Create contexts with different viewports
    const context1 = await browser1.newContext({
      ...devices['iPhone 14'],
      permissions: ['microphone'],
    })
    const context2 = await browser2.newContext({
      ...devices['Pixel 7'],
      permissions: ['microphone'],
    })
    
    page1 = await context1.newPage()
    page2 = await context2.newPage()
  })

  test.afterEach(async () => {
    await browser1?.close()
    await browser2?.close()
  })

  test('Two users can join and see proper UI', async () => {
    console.log('🚀 Testing two-user session...')
    
    // User 1: Create session
    await page1.goto('http://127.0.0.1:5174')
    await page1.waitForLoadState('networkidle')
    
    // Take screenshot of home screen
    await page1.screenshot({ path: 'test-results/01-home-screen.png', fullPage: true })
    
    // Create session
    await page1.getByRole('button', { name: /create.*session/i }).click()
    await page1.waitForURL(/\/session\/\d{4}/)
    
    // Extract session code
    const url = page1.url()
    sessionCode = url.match(/\/session\/(\d{4})/)?.[1] || ''
    console.log('📝 Session created with code:', sessionCode)
    
    // Take screenshot of session as user 1
    await page1.screenshot({ path: 'test-results/02-session-user1-alone.png', fullPage: true })
    
    // Check user count shows "Waiting for partner"
    const userCount1 = page1.locator('text=/waiting.*partner|1.*user/i')
    await expect(userCount1).toBeVisible()
    
    // Check Voice/Type toggle is visible
    const voiceTypeToggle1 = page1.locator('button:has-text("Voice")')
    await expect(voiceTypeToggle1).toBeVisible()
    await page1.screenshot({ path: 'test-results/03-voice-type-toggle.png', fullPage: true })
    
    // User 2: Join session
    await page2.goto('http://127.0.0.1:5174')
    await page2.waitForLoadState('networkidle')
    
    // Click join session
    await page2.getByRole('button', { name: /join.*session/i }).click()
    
    // Enter session code
    const codeInput = page2.locator('input[type="tel"]')
    await codeInput.fill(sessionCode)
    await page2.screenshot({ path: 'test-results/04-join-session-dialog.png', fullPage: true })
    
    // Click join button
    await page2.getByRole('button', { name: /join/i }).last().click()
    await page2.waitForURL(/\/session\/\d{4}/)
    
    // Wait a bit for real-time sync
    await page1.waitForTimeout(2000)
    await page2.waitForTimeout(2000)
    
    // Take screenshots of both users
    await page1.screenshot({ path: 'test-results/05-session-user1-with-partner.png', fullPage: true })
    await page2.screenshot({ path: 'test-results/06-session-user2.png', fullPage: true })
    
    // Check user count shows "2 users connected" on both
    const userCount1After = page1.locator('text=/2.*users.*connected/i')
    const userCount2After = page2.locator('text=/2.*users.*connected/i')
    await expect(userCount1After).toBeVisible()
    await expect(userCount2After).toBeVisible()
    
    // Test dark mode visibility
    // User 1: Toggle dark mode
    const themeToggle1 = page1.locator('button[aria-label*="theme" i]').or(page1.locator('button:has(svg[class*="sun"]),button:has(svg[class*="moon"])'))
    await themeToggle1.click()
    await page1.waitForTimeout(500)
    await page1.screenshot({ path: 'test-results/07-dark-mode-session.png', fullPage: true })
    
    // Check session ID is visible in dark mode
    const sessionId1 = page1.locator(`text="${sessionCode}"`)
    await expect(sessionId1).toBeVisible()
    await expect(sessionId1).toHaveCSS('color', /rgb\(24[0-9], 24[0-9], 24[0-9]\)/) // Light color in dark mode
    
    // Test Voice/Type toggle functionality
    // User 1: Click Type button
    const typeButton1 = page1.locator('button:has-text("Type")')
    await typeButton1.click()
    await page1.waitForTimeout(500)
    await page1.screenshot({ path: 'test-results/08-type-mode.png', fullPage: true })
    
    // Check text input is visible
    const textInput1 = page1.locator('input[placeholder*="type" i]')
    await expect(textInput1).toBeVisible()
    
    // User 1: Switch back to Voice
    const voiceButton1 = page1.locator('button:has-text("Voice")')
    await voiceButton1.click()
    await page1.waitForTimeout(500)
    await page1.screenshot({ path: 'test-results/09-voice-mode-back.png', fullPage: true })
    
    // Check record button is visible
    const recordButton1 = page1.locator('button[data-testid="recording-button"]')
    await expect(recordButton1).toBeVisible()
    
    console.log('✅ All two-user session tests passed!')
  })
})