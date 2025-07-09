import { test, expect } from '@playwright/test'

/**
 * Test with the canonical Vercel URL
 */

const CANONICAL_URL = 'https://translator-v3.vercel.app'

test.describe('Test Canonical URL', () => {
  
  test('Check canonical URL accessibility', async ({ page }) => {
    console.log('🔍 Testing canonical URL...')
    
    // Capture console messages
    const consoleMessages: string[] = []
    const consoleErrors: string[] = []
    
    page.on('console', msg => {
      const text = msg.text()
      console.log(`[BROWSER ${msg.type()}] ${text}`)
      consoleMessages.push(`${msg.type()}: ${text}`)
      if (msg.type() === 'error') {
        consoleErrors.push(text)
      }
    })
    
    page.on('pageerror', error => {
      console.log(`[PAGE ERROR] ${error.message}`)
      consoleErrors.push(error.message)
    })
    
    // Navigate to app
    await page.goto(CANONICAL_URL)
    await page.waitForLoadState('networkidle')
    
    // Wait for any dynamic content
    await page.waitForTimeout(2000)
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/canonical-url-page.png', fullPage: true })
    
    // Get page info
    const title = await page.title()
    const url = page.url()
    console.log('Page title:', title)
    console.log('Current URL:', url)
    
    // Check if we're on the login page or the app
    if (url.includes('vercel.com/login')) {
      console.log('❌ Redirected to login - deployment is protected')
      return
    }
    
    // Check for app content
    const bodyText = await page.locator('body').textContent()
    console.log('Page has content:', bodyText && bodyText.length > 0)
    
    // Look for buttons
    const allButtons = await page.locator('button').all()
    console.log(`Found ${allButtons.length} buttons`)
    
    for (let i = 0; i < allButtons.length; i++) {
      const text = await allButtons[i].textContent()
      const isVisible = await allButtons[i].isVisible()
      console.log(`Button ${i}: "${text}" (visible: ${isVisible})`)
    }
    
    // Look for Start Session button specifically
    const startSessionButton = page.locator('button:has-text("Start Session")')
    const joinSessionButton = page.locator('button:has-text("Join Session")')
    
    console.log('Start Session button visible:', await startSessionButton.isVisible())
    console.log('Join Session button visible:', await joinSessionButton.isVisible())
    
    if (await startSessionButton.isVisible()) {
      console.log('✅ Found Start Session button - testing session creation')
      
      // Click Start Session
      await startSessionButton.click()
      await page.waitForTimeout(3000)
      
      // Check if session was created
      const sessionCode = page.locator('[data-testid="session-code"]')
      const sessionHeader = page.locator('[data-testid="session-header"]')
      
      console.log('Session code visible:', await sessionCode.isVisible())
      console.log('Session header visible:', await sessionHeader.isVisible())
      
      // Take screenshot of session page
      await page.screenshot({ path: 'test-results/session-created-canonical.png', fullPage: true })
      
      if (await sessionCode.isVisible()) {
        const code = await sessionCode.textContent()
        console.log('✅ Session code generated:', code)
      }
    }
    
    // Filter critical errors
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('Failed to load resource') &&
      !error.includes('favicon') &&
      !error.includes('manifest') &&
      !error.includes('406') &&
      !error.includes('401') &&
      !error.includes('403')
    )
    
    if (criticalErrors.length > 0) {
      console.log('🚨 Critical errors found:', criticalErrors)
    }
  })
})