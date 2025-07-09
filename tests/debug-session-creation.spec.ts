import { test, expect } from '@playwright/test'

/**
 * Debug Session Creation - Find out why session creation fails
 */

const VERCEL_URL = 'https://translator-v3.vercel.app'

test.describe('Debug Session Creation', () => {
  
  test('Debug session creation step by step', async ({ page }) => {
    console.log('🔍 Debugging session creation...')
    
    // Capture all logs and errors
    page.on('console', msg => {
      console.log(`[BROWSER ${msg.type()}] ${msg.text()}`)
    })
    
    page.on('pageerror', error => {
      console.log(`[PAGE ERROR] ${error.message}`)
    })
    
    // Navigate to app
    await page.goto(VERCEL_URL)
    await page.waitForLoadState('networkidle')
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'test-results/debug-initial-state.png', fullPage: true })
    
    // Check what buttons are available
    const allButtons = await page.locator('button').all()
    console.log(`Found ${allButtons.length} buttons`)
    
    for (let i = 0; i < allButtons.length; i++) {
      const text = await allButtons[i].textContent()
      const isVisible = await allButtons[i].isVisible()
      console.log(`Button ${i}: "${text}" (visible: ${isVisible})`)
    }
    
    // Try to find and click Start Session button
    const startButton = page.locator('button:has-text("Start Session")')
    await expect(startButton).toBeVisible()
    
    console.log('Clicking Start Session button...')
    await startButton.click()
    
    // Wait a moment and take screenshot
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'test-results/debug-after-click.png', fullPage: true })
    
    // Check if we're navigated somewhere
    const currentUrl = page.url()
    console.log('Current URL after click:', currentUrl)
    
    // Look for any loading indicators
    const loadingElements = await page.locator('[data-loading="true"], .loading, .spinner').all()
    console.log(`Found ${loadingElements.length} loading elements`)
    
    // Check for session-related elements
    const sessionElements = await page.locator('[data-testid*="session"], .session').all()
    console.log(`Found ${sessionElements.length} session-related elements`)
    
    // Look for any error messages
    const errorElements = await page.locator('.error, [role="alert"], .alert').all()
    console.log(`Found ${errorElements.length} error elements`)
    
    for (let i = 0; i < errorElements.length; i++) {
      const text = await errorElements[i].textContent()
      console.log(`Error ${i}: "${text}"`)
    }
    
    // Check if we're in session mode by looking for specific elements
    const sessionCode = page.locator('[data-testid="session-code"]')
    const sessionHeader = page.locator('[data-testid="session-header"]')
    const recordButton = page.locator('[data-testid="record-button"]')
    
    console.log('Session code visible:', await sessionCode.isVisible())
    console.log('Session header visible:', await sessionHeader.isVisible())
    console.log('Record button visible:', await recordButton.isVisible())
    
    // Get page content for debugging
    const bodyText = await page.locator('body').textContent()
    console.log('Page contains "session":', bodyText?.toLowerCase().includes('session'))
    console.log('Page contains "code":', bodyText?.toLowerCase().includes('code'))
    
    // Final screenshot
    await page.screenshot({ path: 'test-results/debug-final-state.png', fullPage: true })
  })
})