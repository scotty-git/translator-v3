import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Session UI - Phase 2', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/')
  })

  test('Session UI Verification - displays session code and status', async ({ page }) => {
    // Start a new session
    await page.click('button:has-text("Start Session")')
    
    // Wait for navigation to session page
    await page.waitForURL('**/session')
    
    // Debug screenshot to see what's on the page
    await page.screenshot({ 
      path: path.join('test-results', 'debug-session-page.png'),
      fullPage: true 
    })
    
    // Wait a bit for component to render
    await page.waitForTimeout(1000)
    
    // Verify session header is displayed - try different selector
    await expect(page.locator('.bg-blue-50, .dark\\:bg-blue-900\\/20').first()).toBeVisible()
    
    // Verify 4-digit code is displayed
    const codeText = await page.locator('text=/Session:.*\\d{4}/').textContent()
    expect(codeText).toMatch(/Session:.*\d{4}/)
    
    // Verify connection status shows
    await expect(page.locator('text=Connecting...')).toBeVisible()
    
    // Wait for connection simulation
    await page.waitForTimeout(2000)
    await expect(page.locator('text=Connected')).toBeVisible()
    
    // Screenshot session UI
    await page.screenshot({ 
      path: path.join('test-results', 'phase2-1-session-ui.png'),
      fullPage: true 
    })
  })

  test('Translation Features Work - can record and translate in session mode', async ({ page }) => {
    // Start a new session
    await page.click('button:has-text("Start Session")')
    await page.waitForURL('**/session')
    
    // Check recording button exists
    const recordButton = page.locator('[data-testid="recording-button"]')
    await expect(recordButton).toBeVisible()
    
    // Check welcome message is displayed
    await expect(page.locator('text=Ready to Translate')).toBeVisible()
    
    // Screenshot empty state
    await page.screenshot({ 
      path: path.join('test-results', 'phase2-2-empty-session.png'),
      fullPage: true 
    })
    
    // Note: Can't test actual recording in headless mode
    // but we verify all UI elements are present
    
    // Check audio visualization element exists
    await expect(page.locator('svg').first()).toBeVisible()
    
    // Check language selector exists
    await expect(page.locator('select')).toBeVisible()
  })

  test('Component Reuse Verification - all translator components work', async ({ page }) => {
    // Start a new session
    await page.click('button:has-text("Start Session")')
    await page.waitForURL('**/session')
    
    // Verify recording button with proper styling
    const recordButton = page.locator('[data-testid="recording-button"]')
    await expect(recordButton).toHaveCSS('background-color', 'rgb(59, 130, 246)')
    
    // Verify audio visualization bars
    const audioBars = page.locator('rect').first()
    await expect(audioBars).toBeVisible()
    
    // Verify mode toggle button
    const modeToggle = page.locator('button:has-text("💬")')
    await expect(modeToggle).toBeVisible()
    
    // Click mode toggle and verify it changes
    await modeToggle.click()
    await expect(page.locator('button:has-text("🎉")')).toBeVisible()
    
    // Verify settings button
    await expect(page.locator('button[data-settings-button]')).toBeVisible()
    
    // Screenshot with all components
    await page.screenshot({ 
      path: path.join('test-results', 'phase2-3-components.png'),
      fullPage: true 
    })
  })

  test('State Persistence - session survives page refresh', async ({ page }) => {
    // Start a new session
    await page.click('button:has-text("Start Session")')
    await page.waitForURL('**/session')
    
    // Get the session code
    const codeElement = await page.locator('text=/\\d{4}/').first()
    const sessionCode = await codeElement.textContent()
    
    // Reload the page
    await page.reload()
    
    // Verify still on session page
    expect(page.url()).toContain('/session')
    
    // Verify same session code is displayed
    const newCodeElement = await page.locator('text=/\\d{4}/').first()
    const newSessionCode = await newCodeElement.textContent()
    expect(newSessionCode).toBe(sessionCode)
    
    // Screenshot after reload
    await page.screenshot({ 
      path: path.join('test-results', 'phase2-4-persistence.png'),
      fullPage: true 
    })
  })

  test('Mobile View - responsive design works', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 })
    
    // Start a new session
    await page.click('button:has-text("Start Session")')
    await page.waitForURL('**/session')
    
    // Verify mobile layout
    const recordButton = page.locator('[data-testid="recording-button"]')
    await expect(recordButton).toBeVisible()
    
    // Verify session header is visible on mobile
    await page.waitForTimeout(1000)
    await expect(page.locator('.bg-blue-50, .dark\\:bg-blue-900\\/20').first()).toBeVisible()
    
    // Screenshot mobile view
    await page.screenshot({ 
      path: path.join('test-results', 'phase2-5-mobile-view.png'),
      fullPage: true 
    })
  })

  test('Dark Mode - session UI works in dark theme', async ({ page }) => {
    // Start a new session
    await page.click('button:has-text("Start Session")')
    await page.waitForURL('**/session')
    
    // Open settings menu
    await page.click('button[data-settings-button]')
    
    // Toggle dark mode
    await page.click('button:has-text("Theme")')
    
    // Wait for theme change
    await page.waitForTimeout(500)
    
    // Verify dark mode applied
    const html = page.locator('html')
    await expect(html).toHaveClass(/dark/)
    
    // Screenshot dark mode
    await page.screenshot({ 
      path: path.join('test-results', 'phase2-6-dark-mode.png'),
      fullPage: true 
    })
  })

  test('Error States - handles missing session gracefully', async ({ page }) => {
    // Navigate directly to session without creating one
    await page.goto('http://127.0.0.1:5173/session')
    
    // Wait a bit for redirect
    await page.waitForTimeout(1000)
    
    // Should redirect to home
    await page.waitForURL('**/', { timeout: 5000 })
    expect(page.url()).toBe('http://127.0.0.1:5173/')
    
    // Verify we're back on home screen
    await expect(page.locator('text=Real-time Translator')).toBeVisible()
  })
})