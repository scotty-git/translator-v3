/**
 * Comprehensive Session Fixes Test Suite
 * 
 * This test suite verifies all the critical fixes implemented for session mode:
 * 1. Invalid session redirect functionality 
 * 2. Dark mode input visibility
 * 3. Session state management and user counts
 * 4. Microphone permission handling
 */

import { test, expect, Page, BrowserContext } from '@playwright/test'

test.describe('Session Fixes - Comprehensive Tests', () => {
  
  test.describe('Invalid Session Redirect', () => {
    test('should redirect to home page when accessing non-existent session URL', async ({ page }) => {
      console.log('🔄 Testing invalid session redirect...')
      
      // Navigate to an invalid session URL
      await page.goto('/session/9999')
      
      // Should show error state first
      await expect(page.locator('text=Session connection error')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('text=404')).toBeVisible()
      
      // Should show "Redirecting to home page..." message
      await expect(page.locator('text=Redirecting to home page')).toBeVisible()
      
      // Should redirect to home page after 2 seconds
      await expect(page).toHaveURL('/', { timeout: 10000 })
      
      // Should display error message on home page
      await expect(page.locator('text=Session 9999 was not found or has expired')).toBeVisible()
      
      console.log('✅ Invalid session redirect test passed')
    })

    test('should redirect when accessing expired session URLs', async ({ page }) => {
      console.log('🔄 Testing expired session redirect...')
      
      // Test with old session ID that user mentioned (3860)
      await page.goto('/session/3860')
      
      // Should eventually redirect to home with error
      await expect(page).toHaveURL('/', { timeout: 15000 })
      await expect(page.locator('text=was not found or has expired')).toBeVisible()
      
      console.log('✅ Expired session redirect test passed')
    })
  })

  test.describe('Dark Mode Input Visibility', () => {
    test('should display session code input visibly in dark mode', async ({ page }) => {
      console.log('🌙 Testing dark mode input visibility...')
      
      await page.goto('/')
      
      // Enable dark mode
      await page.locator('button[aria-label*="theme"], button[title*="theme"], [data-testid="theme-toggle"]').click()
      
      // Click "Join Session" to show the input
      await page.locator('button:has-text("Join Session")').click()
      
      // Session code input should be visible and have proper styling
      const sessionInput = page.locator('input[placeholder="0000"]')
      await expect(sessionInput).toBeVisible()
      
      // Test that text is visible by typing and checking the value
      await sessionInput.fill('1234')
      await expect(sessionInput).toHaveValue('1234')
      
      // Check that the input has proper dark mode styling classes
      await expect(sessionInput).toHaveClass(/dark:bg-gray-800/)
      await expect(sessionInput).toHaveClass(/dark:text-gray-100/)
      
      console.log('✅ Dark mode input visibility test passed')
    })

    test('should display session code input properly in light mode', async ({ page }) => {
      console.log('☀️ Testing light mode input visibility...')
      
      await page.goto('/')
      
      // Ensure light mode (default)
      await page.locator('button:has-text("Join Session")').click()
      
      const sessionInput = page.locator('input[placeholder="0000"]')
      await expect(sessionInput).toBeVisible()
      
      // Test typing
      await sessionInput.fill('5678')
      await expect(sessionInput).toHaveValue('5678')
      
      console.log('✅ Light mode input visibility test passed')
    })
  })

  test.describe('Session State Management', () => {
    let context: BrowserContext
    let creatorPage: Page
    let joinerPage: Page

    test.beforeAll(async ({ browser }) => {
      context = await browser.newContext()
      creatorPage = await context.newPage()
      joinerPage = await context.newPage()
    })

    test.afterAll(async () => {
      await context.close()
    })

    test('should show correct user counts when users join and leave sessions', async () => {
      console.log('👥 Testing session user count management...')
      
      // Creator creates a session
      await creatorPage.goto('/')
      await creatorPage.locator('button:has-text("Create Session")').click()
      
      // Wait for session creation and extract session code
      await expect(creatorPage).toHaveURL(/\/session\/\d{4}/)
      const sessionUrl = creatorPage.url()
      const sessionCode = sessionUrl.match(/\/session\/(\d{4})/)?.[1]
      expect(sessionCode).toBeTruthy()
      
      // Creator should see "Waiting for partner to join..." or "1 users"
      await expect(creatorPage.locator('text=Waiting')).toBeVisible({ timeout: 10000 })
      
      // Joiner joins the session
      await joinerPage.goto('/')
      await joinerPage.locator('button:has-text("Join Session")').click()
      await joinerPage.locator('input[placeholder="0000"]').fill(sessionCode!)
      await joinerPage.locator('button:has-text("Join Session")').click()
      
      // Both pages should now show 2 users connected
      await expect(creatorPage.locator('text=2 users')).toBeVisible({ timeout: 10000 })
      await expect(joinerPage.locator('text=2 users')).toBeVisible({ timeout: 10000 })
      
      // Creator leaves
      await creatorPage.locator('button:has-text("Leave")').click()
      
      // Joiner should see user count decrease (may show "Waiting" again)
      await expect(joinerPage.locator('text=Waiting, text=1 user')).toBeVisible({ timeout: 10000 })
      
      console.log('✅ Session user count test passed')
    })
  })

  test.describe('Microphone Permission Handling', () => {
    test('should handle microphone permissions gracefully', async ({ page, context }) => {
      console.log('🎙️ Testing microphone permission handling...')
      
      // Grant microphone permissions
      await context.grantPermissions(['microphone'])
      
      // Create a session
      await page.goto('/')
      await page.locator('button:has-text("Create Session")').click()
      
      // Wait for session to load
      await expect(page).toHaveURL(/\/session\/\d{4}/)
      
      // Recording button should be enabled (not gray)
      const recordButton = page.locator('[data-testid="recording-button"]')
      await expect(recordButton).toBeVisible()
      await expect(recordButton).not.toHaveClass(/bg-gray-400/)
      await expect(recordButton).not.toBeDisabled()
      
      // Should not show permission error
      await expect(page.locator('text=Microphone access')).not.toBeVisible()
      
      console.log('✅ Microphone permission (granted) test passed')
    })

    test('should show appropriate error when microphone permission is denied', async ({ page, context }) => {
      console.log('🚫 Testing denied microphone permission...')
      
      // Block microphone permissions
      await context.grantPermissions([])
      
      // Create a session  
      await page.goto('/')
      await page.locator('button:has-text("Create Session")').click()
      
      // Wait for session to load
      await expect(page).toHaveURL(/\/session\/\d{4}/)
      
      // Should show permission error
      await expect(page.locator('text=Microphone access')).toBeVisible({ timeout: 10000 })
      
      // Recording button should be disabled/grayed out
      const recordButton = page.locator('[data-testid="recording-button"]')
      await expect(recordButton).toBeVisible()
      await expect(recordButton).toBeDisabled()
      
      console.log('✅ Microphone permission (denied) test passed')
    })
  })

  test.describe('Voice Recording Functionality', () => {
    test('should use simple tap-to-start, tap-to-stop recording pattern', async ({ page, context }) => {
      console.log('🎤 Testing voice recording pattern...')
      
      // Grant permissions
      await context.grantPermissions(['microphone'])
      
      // Create session
      await page.goto('/')
      await page.locator('button:has-text("Create Session")').click()
      await expect(page).toHaveURL(/\/session\/\d{4}/)
      
      const recordButton = page.locator('[data-testid="recording-button"]')
      
      // Initial state: blue button
      await expect(recordButton).toHaveClass(/bg-blue-500/)
      
      // Click to start recording
      await recordButton.click()
      
      // Should change to red when recording
      await expect(recordButton).toHaveClass(/bg-red-500/, { timeout: 5000 })
      await expect(page.locator('text=Recording')).toBeVisible()
      
      // Click again to stop recording  
      await recordButton.click()
      
      // Should show processing state
      await expect(page.locator('text=Processing')).toBeVisible()
      
      // Should return to blue when done (may take a while due to API calls)
      await expect(recordButton).toHaveClass(/bg-blue-500/, { timeout: 15000 })
      
      console.log('✅ Voice recording pattern test passed')
    })
  })

  test.describe('Audio Visualization', () => {
    test('should display audio visualization during recording', async ({ page, context }) => {
      console.log('📊 Testing audio visualization...')
      
      await context.grantPermissions(['microphone'])
      
      await page.goto('/')
      await page.locator('button:has-text("Create Session")').click()
      await expect(page).toHaveURL(/\/session\/\d{4}/)
      
      // Audio visualization should be present
      const visualization = page.locator('[class*="flex items-end justify-center"]')
      await expect(visualization).toBeVisible()
      
      // Start recording to test visualization activity
      await page.locator('[data-testid="recording-button"]').click()
      
      // Visualization should show activity (check for multiple bars)
      const visualBars = visualization.locator('div')
      await expect(visualBars.first()).toBeVisible()
      
      // Stop recording
      await page.locator('[data-testid="recording-button"]').click()
      
      console.log('✅ Audio visualization test passed')
    })
  })

  test.describe('UI Component Styling', () => {
    test('should have proper styling for translation mode and target language buttons', async ({ page, context }) => {
      console.log('🎨 Testing UI component styling...')
      
      await context.grantPermissions(['microphone'])
      
      await page.goto('/')
      await page.locator('button:has-text("Create Session")').click()
      await expect(page).toHaveURL(/\/session\/\d{4}/)
      
      // Translation mode button should have pill styling
      const modeButton = page.locator('button:has-text("Casual")')
      await expect(modeButton).toBeVisible()
      await expect(modeButton).toHaveClass(/rounded-full/)
      await expect(modeButton).toHaveClass(/px-3/)
      await expect(modeButton).toHaveClass(/py-1/)
      
      // Target language selector should be visible and functional
      const languageSelect = page.locator('select').first()
      await expect(languageSelect).toBeVisible()
      await expect(languageSelect).toHaveValue('es')
      
      // Should be able to change language
      await languageSelect.selectOption('pt')
      await expect(languageSelect).toHaveValue('pt')
      
      console.log('✅ UI component styling test passed')
    })
  })

  test.describe('Integration Test - Complete User Journey', () => {
    test('should complete full session creation and joining flow without errors', async ({ page, context }) => {
      console.log('🚀 Running complete integration test...')
      
      await context.grantPermissions(['microphone'])
      
      // 1. Start on home page
      await page.goto('/')
      await expect(page.locator('h1:has-text("Real-time Translator")')).toBeVisible()
      
      // 2. Create session
      await page.locator('button:has-text("Create Session")').click()
      await expect(page).toHaveURL(/\/session\/\d{4}/)
      
      // 3. Verify session UI elements
      await expect(page.locator('text=Session')).toBeVisible()
      await expect(page.locator('[data-testid="recording-button"]')).toBeVisible()
      await expect(page.locator('button:has-text("Casual")')).toBeVisible()
      
      // 4. Test mode toggle
      await page.locator('button:has-text("Casual")').click()
      await expect(page.locator('button:has-text("Fun")')).toBeVisible()
      
      // 5. Test language selection
      const languageSelect = page.locator('select').first()
      await languageSelect.selectOption('pt')
      await expect(languageSelect).toHaveValue('pt')
      
      // 6. Test voice/type toggle
      await page.locator('button:has-text("Type")').click()
      await expect(page.locator('input[placeholder*="message"]')).toBeVisible()
      
      await page.locator('button:has-text("Voice")').click()
      await expect(page.locator('[data-testid="recording-button"]')).toBeVisible()
      
      // 7. Test recording functionality
      const recordButton = page.locator('[data-testid="recording-button"]')
      await recordButton.click()
      await expect(recordButton).toHaveClass(/bg-red-500/, { timeout: 5000 })
      
      // Stop recording quickly to avoid long API calls
      await recordButton.click()
      await expect(page.locator('text=Processing')).toBeVisible()
      
      console.log('✅ Complete integration test passed')
    })
  })
})

// Console logging helper for test visibility
test.beforeEach(async ({ page }) => {
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('🚨 Browser Console Error:', msg.text())
    }
  })
})

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === 'failed') {
    console.error(`❌ Test failed: ${testInfo.title}`)
  } else {
    console.log(`✅ Test passed: ${testInfo.title}`)
  }
})