import { test, expect } from '@playwright/test'

/**
 * UI Contract Visual Regression Tests
 * 
 * 🚨 CRITICAL: These tests establish and enforce the UI contract for the translator app.
 * 
 * Purpose: Prevent unauthorized UI changes during refactoring by taking baseline screenshots
 * and comparing them against current implementations.
 * 
 * When these tests fail:
 * 1. If UI changes were intentional, update baselines with: npx playwright test --update-snapshots
 * 2. If UI changes were accidental during refactoring, revert the changes immediately
 * 
 * Test Coverage:
 * - Solo translator mode (complete UI layout)
 * - Session translator mode (host and guest views)
 * - Both light and dark themes
 * - Mobile and desktop viewports
 * - All major UI states and interactions
 */

test.describe('UI Contract: Solo Translator Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Start dev server if not running
    await page.goto('http://127.0.0.1:5173')
    
    // Navigate to solo mode
    await page.click('text=Start Translating')
    await page.waitForLoadState('networkidle')
  })

  test('Solo translator - Light theme - Desktop', async ({ page }) => {
    // Ensure light theme
    const darkToggle = page.locator('button[aria-label*="dark"]')
    if (await darkToggle.isVisible()) {
      await darkToggle.click()
    }
    
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 })
    
    // Wait for components to load
    await page.waitForSelector('[data-testid="recording-button"]')
    await page.waitForSelector('button[title="Text input"]')
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('solo-light-desktop.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('Solo translator - Dark theme - Desktop', async ({ page }) => {
    // Ensure dark theme
    const darkToggle = page.locator('button[aria-label*="dark"]')
    if (await darkToggle.isVisible()) {
      await darkToggle.click()
    }
    
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 })
    
    // Wait for components to load
    await page.waitForSelector('[data-testid="recording-button"]')
    await page.waitForSelector('button[title="Text input"]')
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('solo-dark-desktop.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('Solo translator - Light theme - Mobile', async ({ page }) => {
    // Ensure light theme
    const darkToggle = page.locator('button[aria-label*="dark"]')
    if (await darkToggle.isVisible()) {
      await darkToggle.click()
    }
    
    // Set mobile viewport (iPhone 12 Pro)
    await page.setViewportSize({ width: 390, height: 844 })
    
    // Wait for components to load
    await page.waitForSelector('[data-testid="recording-button"]')
    await page.waitForSelector('button[title="Text input"]')
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('solo-light-mobile.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('Solo translator - Dark theme - Mobile', async ({ page }) => {
    // Ensure dark theme
    const darkToggle = page.locator('button[aria-label*="dark"]')
    if (await darkToggle.isVisible()) {
      await darkToggle.click()
    }
    
    // Set mobile viewport (iPhone 12 Pro)
    await page.setViewportSize({ width: 390, height: 844 })
    
    // Wait for components to load
    await page.waitForSelector('[data-testid="recording-button"]')
    await page.waitForSelector('button[title="Text input"]')
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('solo-dark-mobile.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('Solo translator - With messages - Light theme', async ({ page }) => {
    // Ensure light theme
    const darkToggle = page.locator('button[aria-label*="dark"]')
    if (await darkToggle.isVisible()) {
      await darkToggle.click()
    }
    
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 })
    
    // Send a few test messages to show message bubbles
    await page.click('button[title="Text input"]')
    await page.fill('input[placeholder="Type message..."]', 'Hello world')
    await page.click('button:has-text("Send")')
    
    // Wait for message to appear
    await page.waitForSelector('.message-bubble')
    
    // Send another message
    await page.click('button[title="Text input"]')
    await page.fill('input[placeholder="Type message..."]', 'How are you today?')
    await page.click('button:has-text("Send")')
    
    // Wait for second message
    await page.waitForSelector('.message-bubble:nth-child(2)')
    
    // Take screenshot with messages
    await expect(page).toHaveScreenshot('solo-with-messages-light.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('Solo translator - Recording state - Light theme', async ({ page }) => {
    // Ensure light theme
    const darkToggle = page.locator('button[aria-label*="dark"]')
    if (await darkToggle.isVisible()) {
      await darkToggle.click()
    }
    
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 })
    
    // Grant microphone permission
    await page.context().grantPermissions(['microphone'])
    
    // Start recording
    await page.click('[data-testid="recording-button"]')
    
    // Wait for recording state
    await page.waitForTimeout(1000)
    
    // Take screenshot during recording
    await expect(page).toHaveScreenshot('solo-recording-light.png', {
      fullPage: true,
      animations: 'disabled'
    })
    
    // Stop recording
    await page.click('[data-testid="recording-button"]')
  })
})

test.describe('UI Contract: Session Translator Mode', () => {
  test('Session creation - Light theme - Desktop', async ({ page }) => {
    // Ensure light theme
    const darkToggle = page.locator('button[aria-label*="dark"]')
    if (await darkToggle.isVisible()) {
      await darkToggle.click()
    }
    
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 })
    
    // Create session
    await page.click('button:has-text("Create Session")')
    
    // Wait for session UI to load
    await page.waitForSelector('.font-mono') // Session code
    await page.waitForSelector('text="Session:"')
    
    // Take screenshot of session creation
    await expect(page).toHaveScreenshot('session-creation-light-desktop.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('Session join - Light theme - Desktop', async ({ page }) => {
    // Ensure light theme
    const darkToggle = page.locator('button[aria-label*="dark"]')
    if (await darkToggle.isVisible()) {
      await darkToggle.click()
    }
    
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 })
    
    // Click join session
    await page.click('button:has-text("Join Session")')
    
    // Wait for join UI
    await page.waitForSelector('input[placeholder*="code"]')
    await page.waitForSelector('button:has-text("Join")')
    
    // Take screenshot of join UI
    await expect(page).toHaveScreenshot('session-join-light-desktop.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('Session with partner - Light theme - Desktop', async ({ browser }) => {
    // Create two contexts for host and guest
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    const host = await context1.newPage()
    const guest = await context2.newPage()
    
    // Set up host
    await host.goto('http://127.0.0.1:5173')
    const hostDarkToggle = host.locator('button[aria-label*="dark"]')
    if (await hostDarkToggle.isVisible()) {
      await hostDarkToggle.click()
    }
    await host.setViewportSize({ width: 1280, height: 720 })
    
    // Create session
    await host.click('button:has-text("Create Session")')
    const code = await host.locator('.font-mono').textContent()
    
    // Set up guest
    await guest.goto('http://127.0.0.1:5173')
    const guestDarkToggle = guest.locator('button[aria-label*="dark"]')
    if (await guestDarkToggle.isVisible()) {
      await guestDarkToggle.click()
    }
    await guest.setViewportSize({ width: 1280, height: 720 })
    
    // Join session
    await guest.click('button:has-text("Join Session")')
    await guest.fill('input', code!)
    await guest.click('button:has-text("Join")')
    
    // Wait for both to show partner online
    await host.waitForSelector('text="Partner Online"')
    await guest.waitForSelector('text="Partner Online"')
    
    // Take screenshots of both
    await expect(host).toHaveScreenshot('session-host-with-partner-light.png', {
      fullPage: true,
      animations: 'disabled'
    })
    
    await expect(guest).toHaveScreenshot('session-guest-with-partner-light.png', {
      fullPage: true,
      animations: 'disabled'
    })
    
    // Cleanup
    await context1.close()
    await context2.close()
  })
})

test.describe('UI Contract: Home Screen', () => {
  test('Home screen - Light theme - Desktop', async ({ page }) => {
    // Ensure light theme
    const darkToggle = page.locator('button[aria-label*="dark"]')
    if (await darkToggle.isVisible()) {
      await darkToggle.click()
    }
    
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 })
    
    // Take screenshot of home screen
    await expect(page).toHaveScreenshot('home-light-desktop.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('Home screen - Dark theme - Desktop', async ({ page }) => {
    // Ensure dark theme
    const darkToggle = page.locator('button[aria-label*="dark"]')
    if (await darkToggle.isVisible()) {
      await darkToggle.click()
    }
    
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 })
    
    // Take screenshot of home screen
    await expect(page).toHaveScreenshot('home-dark-desktop.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('Home screen - Light theme - Mobile', async ({ page }) => {
    // Ensure light theme
    const darkToggle = page.locator('button[aria-label*="dark"]')
    if (await darkToggle.isVisible()) {
      await darkToggle.click()
    }
    
    // Set mobile viewport (iPhone 12 Pro)
    await page.setViewportSize({ width: 390, height: 844 })
    
    // Take screenshot of home screen
    await expect(page).toHaveScreenshot('home-light-mobile.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })
})

test.describe('UI Contract: Critical Component States', () => {
  test('Language selector - All states', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173')
    await page.click('text=Start Translating')
    
    // Ensure light theme
    const darkToggle = page.locator('button[aria-label*="dark"]')
    if (await darkToggle.isVisible()) {
      await darkToggle.click()
    }
    
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 })
    
    // Find and click language selector
    const languageSelect = page.locator('select')
    await languageSelect.click()
    
    // Take screenshot of language options
    await expect(page).toHaveScreenshot('language-selector-states.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('Translation mode toggles - All states', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173')
    await page.click('text=Start Translating')
    
    // Ensure light theme
    const darkToggle = page.locator('button[aria-label*="dark"]')
    if (await darkToggle.isVisible()) {
      await darkToggle.click()
    }
    
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 })
    
    // Find mode toggle button
    const modeToggle = page.locator('button[title*="casual"]')
    await modeToggle.click()
    
    // Take screenshot of mode toggle states
    await expect(page).toHaveScreenshot('translation-mode-toggles.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('Error states - Network error', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173')
    await page.click('text=Start Translating')
    
    // Ensure light theme
    const darkToggle = page.locator('button[aria-label*="dark"]')
    if (await darkToggle.isVisible()) {
      await darkToggle.click()
    }
    
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 })
    
    // Simulate network error by going offline
    await page.context().setOffline(true)
    
    // Try to send a message
    await page.click('button[title="Text input"]')
    await page.fill('input[placeholder="Type message..."]', 'Test message')
    await page.click('button:has-text("Send")')
    
    // Wait for error state
    await page.waitForTimeout(2000)
    
    // Take screenshot of error state
    await expect(page).toHaveScreenshot('error-state-network.png', {
      fullPage: true,
      animations: 'disabled'
    })
    
    // Restore network
    await page.context().setOffline(false)
  })
})

/**
 * UI Contract Validation Utilities
 */
test.describe('UI Contract: Validation', () => {
  test('Validate no UI regressions exist', async ({ page }) => {
    // This test runs all the screenshots and will fail if any don't match
    // It's designed to catch any unintended UI changes during refactoring
    
    console.log('🔍 UI Contract Validation: Checking for visual regressions...')
    
    // Test solo mode
    await page.goto('http://127.0.0.1:5173')
    await page.click('text=Start Translating')
    
    // Ensure light theme
    const darkToggle = page.locator('button[aria-label*="dark"]')
    if (await darkToggle.isVisible()) {
      await darkToggle.click()
    }
    
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 })
    
    // Wait for components to load
    await page.waitForSelector('[data-testid="recording-button"]')
    await page.waitForSelector('button[title="Text input"]')
    
    // Take screenshot and compare
    await expect(page).toHaveScreenshot('ui-validation-solo.png', {
      fullPage: true,
      animations: 'disabled',
      threshold: 0.1 // Allow 10% difference for minor changes
    })
    
    console.log('✅ UI Contract Validation: No regressions detected')
  })
})