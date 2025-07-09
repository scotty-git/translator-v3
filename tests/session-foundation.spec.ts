import { test, expect, chromium } from '@playwright/test'

// Mock session code for testing
const TEST_SESSION_CODE = '9999'

test.describe('Session Foundation - Phase 1', () => {

  test.beforeEach(async ({ page }) => {
    // Start from home page
    await page.goto('http://127.0.0.1:5173/')
    await page.waitForLoadState('networkidle')
  })

  test('should display home screen with session options', async ({ page }) => {
    // Verify solo translator button
    await expect(page.getByText('Start Translating')).toBeVisible()
    
    // Verify OR divider
    await expect(page.getByText('OR')).toBeVisible()
    
    // Verify session buttons
    await expect(page.getByText('Start Session')).toBeVisible()
    await expect(page.getByText('Join Session')).toBeVisible()
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/phase1-home-screen.png',
      fullPage: true 
    })
  })

  test('should show join input when Join Session is clicked', async ({ page }) => {
    // Click Join Session button
    await page.getByText('Join Session').click()
    
    // Verify input appears
    await expect(page.getByTestId('join-code-input')).toBeVisible()
    await expect(page.getByPlaceholderText('Enter 4-digit code')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Join' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Join' })).toBeDisabled()
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/phase1-join-input.png',
      fullPage: true 
    })
  })

  test('should validate 4-digit code format', async ({ page }) => {
    // Click Join Session
    await page.getByText('Join Session').click()
    
    const input = page.getByTestId('join-code-input')
    const joinButton = page.getByRole('button', { name: 'Join' })
    
    // Test invalid inputs
    await input.fill('abc')
    await expect(input).toHaveValue('')
    await expect(joinButton).toBeDisabled()
    
    await input.fill('12')
    await expect(input).toHaveValue('12')
    await expect(joinButton).toBeDisabled()
    
    await input.fill('12345')
    await expect(input).toHaveValue('1234') // Should truncate to 4 digits
    await expect(joinButton).toBeEnabled()
    
    // Clear and enter valid code
    await input.clear()
    await input.fill('1234')
    await expect(input).toHaveValue('1234')
    await expect(joinButton).toBeEnabled()
  })

  test('should start a new session and navigate', async ({ page }) => {
    // Mock Supabase response for session creation
    await page.route('**/rest/v1/sessions*', async (route) => {
      const method = route.request().method()
      
      if (method === 'POST') {
        // Create session response
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-session-id',
            code: '1234'
          })
        })
      } else if (method === 'GET') {
        // Check for existing session
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: { code: 'PGRST116' } })
        })
      }
    })

    // Mock participant addition
    await page.route('**/rest/v1/session_participants*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({})
      })
    })

    // Click Start Session
    await page.getByText('Start Session').click()
    
    // Wait for navigation
    await page.waitForURL('**/session', { timeout: 5000 })
    
    // Verify we're on session page (placeholder for now)
    await expect(page.locator('text=Session Mode')).toBeVisible()
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/phase1-session-started.png',
      fullPage: true 
    })
  })

  test('should join an existing session and navigate', async ({ page }) => {
    // Mock Supabase responses
    await page.route('**/rest/v1/sessions*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'existing-session-id',
          code: '5678',
          is_active: true,
          expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString()
        })
      })
    })

    await page.route('**/rest/v1/session_participants*', async (route) => {
      const url = route.request().url()
      
      if (url.includes('select')) {
        // Check participants
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ user_id: 'other-user' }])
        })
      } else {
        // Add participant
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({})
        })
      }
    })

    // Click Join Session and enter code
    await page.getByText('Join Session').click()
    await page.getByTestId('join-code-input').fill('5678')
    await page.getByRole('button', { name: 'Join' }).click()
    
    // Wait for navigation
    await page.waitForURL('**/session', { timeout: 5000 })
    
    // Verify we're on session page
    await expect(page.locator('text=Session Mode')).toBeVisible()
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/phase1-session-joined.png',
      fullPage: true 
    })
  })

  test('should show error for invalid session code', async ({ page }) => {
    // Mock Supabase error response
    await page.route('**/rest/v1/sessions*', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: { code: 'PGRST116', message: 'Session not found' } 
        })
      })
    })

    // Click Join Session and enter invalid code
    await page.getByText('Join Session').click()
    await page.getByTestId('join-code-input').fill('9999')
    await page.getByRole('button', { name: 'Join' }).click()
    
    // Verify error message appears
    await expect(page.locator('text=Session not found')).toBeVisible()
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/phase1-invalid-code-error.png',
      fullPage: true 
    })
  })

  test('should show error for expired session', async ({ page }) => {
    // Mock Supabase response with expired session
    await page.route('**/rest/v1/sessions*', async (route) => {
      const method = route.request().method()
      
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'expired-session-id',
            code: '8888',
            is_active: true,
            expires_at: new Date(Date.now() - 1000).toISOString() // Expired
          })
        })
      } else if (method === 'PATCH') {
        // Update session to inactive
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({})
        })
      }
    })

    // Click Join Session and enter code
    await page.getByText('Join Session').click()
    await page.getByTestId('join-code-input').fill('8888')
    await page.getByRole('button', { name: 'Join' }).click()
    
    // Verify error message
    await expect(page.locator('text=session has expired')).toBeVisible()
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/phase1-expired-session-error.png',
      fullPage: true 
    })
  })

  test('should maintain session state across page refresh', async ({ page }) => {
    // Create a session first
    await page.route('**/rest/v1/sessions*', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'persistent-session-id',
            code: '7777'
          })
        })
      } else {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: { code: 'PGRST116' } })
        })
      }
    })

    await page.route('**/rest/v1/session_participants*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({})
      })
    })

    // Start session
    await page.getByText('Start Session').click()
    await page.waitForURL('**/session')
    
    // Verify session info is stored
    const sessionInfo = await page.evaluate(() => localStorage.getItem('activeSession'))
    expect(sessionInfo).toBeTruthy()
    const parsed = JSON.parse(sessionInfo!)
    expect(parsed.sessionCode).toBe('7777')
    expect(parsed.role).toBe('host')
    
    // Refresh page
    await page.reload()
    
    // Should still be on session page
    await expect(page).toHaveURL(/.*\/session/)
    await expect(page.locator('text=Session Mode')).toBeVisible()
  })

  test('should navigate back to home when leaving session', async ({ page }) => {
    // Set up active session in localStorage
    await page.evaluate(() => {
      localStorage.setItem('activeSession', JSON.stringify({
        sessionId: 'test-session',
        sessionCode: '1111',
        userId: 'test-user',
        role: 'host',
        createdAt: new Date().toISOString()
      }))
    })

    // Navigate directly to session page
    await page.goto('http://127.0.0.1:5173/session')
    await page.waitForLoadState('networkidle')
    
    // Click back to home
    await page.getByText('Back to Home').click()
    
    // Verify navigation and session cleared
    await expect(page).toHaveURL('http://127.0.0.1:5173/')
    const sessionInfo = await page.evaluate(() => localStorage.getItem('activeSession'))
    expect(sessionInfo).toBeNull()
  })

  test('should handle mobile viewport', async ({ browser }) => {
    // Create mobile context
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    })
    
    const page = await mobileContext.newPage()
    await page.goto('http://127.0.0.1:5173/')
    await page.waitForLoadState('networkidle')
    
    // Verify mobile layout
    await expect(page.getByText('Start Translating')).toBeVisible()
    await expect(page.getByText('Start Session')).toBeVisible()
    await expect(page.getByText('Join Session')).toBeVisible()
    
    // Take mobile screenshot
    await page.screenshot({ 
      path: 'test-results/phase1-mobile-home.png',
      fullPage: true 
    })
    
    await mobileContext.close()
  })

  test('should handle dark mode', async ({ page }) => {
    // Toggle dark mode
    await page.getByRole('button', { name: 'Toggle dark mode' }).click()
    
    // Verify dark mode applied
    const isDarkMode = await page.evaluate(() => 
      document.documentElement.classList.contains('dark')
    )
    expect(isDarkMode).toBe(true)
    
    // Take dark mode screenshot
    await page.screenshot({ 
      path: 'test-results/phase1-dark-mode.png',
      fullPage: true 
    })
    
    // Verify session UI looks good in dark mode
    await page.getByText('Join Session').click()
    await page.screenshot({ 
      path: 'test-results/phase1-dark-mode-join.png',
      fullPage: true 
    })
  })
})