import { test, expect } from '@playwright/test'

/**
 * Quick Load Test - Check basic app functionality
 * Tests the real Vercel deployment: https://translator-v3.vercel.app
 */

const VERCEL_URL = 'https://translator-v3.vercel.app'

test.describe('Quick Load Test - Vercel App', () => {
  
  test('App loads without console errors', async ({ page }) => {
    console.log('🔍 Testing app load on Vercel...')
    
    // Capture console messages
    const consoleMessages: string[] = []
    const consoleErrors: string[] = []
    
    page.on('console', msg => {
      const text = msg.text()
      consoleMessages.push(`${msg.type()}: ${text}`)
      if (msg.type() === 'error') {
        consoleErrors.push(text)
      }
    })
    
    // Navigate to the app
    await page.goto(VERCEL_URL)
    await page.waitForLoadState('networkidle')
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/vercel-app-load.png', fullPage: true })
    
    // Check if the main UI elements are visible
    const startSessionButton = page.locator('button:has-text("Start Session")')
    const joinSessionButton = page.locator('button:has-text("Join Session")')
    
    await expect(startSessionButton).toBeVisible({ timeout: 10000 })
    await expect(joinSessionButton).toBeVisible({ timeout: 10000 })
    
    // Log console messages for debugging
    console.log('📊 Console Messages:', consoleMessages.length)
    if (consoleMessages.length > 0) {
      console.log('Console output:', consoleMessages.slice(0, 10)) // First 10 messages
    }
    
    // Log any errors
    if (consoleErrors.length > 0) {
      console.log('❌ Console Errors:', consoleErrors)
    }
    
    // Verify no critical errors
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('Failed to load resource') && // Ignore resource loading errors
      !error.includes('favicon') && // Ignore favicon errors
      !error.includes('manifest') // Ignore manifest errors
    )
    
    if (criticalErrors.length > 0) {
      console.log('🚨 Critical errors found:', criticalErrors)
    }
    
    expect(criticalErrors.length).toBe(0)
    
    console.log('✅ App loaded successfully')
  })
  
  test('Session creation works', async ({ page }) => {
    console.log('🧪 Testing session creation...')
    
    await page.goto(VERCEL_URL)
    await page.waitForLoadState('networkidle')
    
    // Click Start Session
    await page.click('button:has-text("Start Session")')
    
    // Wait for session code to appear
    const sessionCodeElement = page.locator('[data-testid="session-code"]')
    await expect(sessionCodeElement).toBeVisible({ timeout: 15000 })
    
    // Get the session code
    const sessionCode = await sessionCodeElement.textContent()
    console.log('📱 Session code generated:', sessionCode)
    
    // Verify session header is visible
    await expect(page.locator('[data-testid="session-header"]')).toBeVisible()
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/session-created.png', fullPage: true })
    
    console.log('✅ Session creation successful')
  })
  
  test('Mobile responsiveness', async ({ page }) => {
    console.log('📱 Testing mobile responsiveness...')
    
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 })
    
    await page.goto(VERCEL_URL)
    await page.waitForLoadState('networkidle')
    
    // Check mobile layout
    await expect(page.locator('button:has-text("Start Session")')).toBeVisible()
    await expect(page.locator('button:has-text("Join Session")')).toBeVisible()
    
    // Take mobile screenshot
    await page.screenshot({ path: 'test-results/mobile-layout.png', fullPage: true })
    
    console.log('✅ Mobile layout working')
  })
})