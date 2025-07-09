import { test, expect } from '@playwright/test'

test.describe('Session Foundation - Phase 1 Complete', () => {
  test.use({
    timeout: 30000,
    actionTimeout: 10000,
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/')
    await page.waitForSelector('text=Start Translating', { timeout: 10000 })
  })

  test('Phase 1: Complete UI and Navigation Flow', async ({ page }) => {
    console.log('=== Phase 1 Complete Test Suite ===')
    
    // 1. Verify home screen with session options
    console.log('1. Testing home screen UI...')
    await expect(page.getByText('Start Translating')).toBeVisible()
    await expect(page.getByText('OR', { exact: true })).toBeVisible()
    await expect(page.getByText('Start Session')).toBeVisible()
    await expect(page.getByText('Join Session')).toBeVisible()
    await expect(page.getByText('Connect two devices for remote translation')).toBeVisible()
    
    await page.screenshot({ 
      path: 'test-results/phase1-1-home-complete.png',
      fullPage: true 
    })
    
    // 2. Test Join Session UI flow
    console.log('2. Testing Join Session UI...')
    await page.getByText('Join Session').click()
    const joinInput = page.locator('input[placeholder="Enter 4-digit code"]')
    await expect(joinInput).toBeVisible()
    
    // Test input validation
    const joinButton = page.getByRole('button', { name: 'Join', exact: true })
    await expect(joinButton).toBeDisabled()
    
    // Test invalid input (letters)
    await joinInput.fill('abcd')
    await expect(joinInput).toHaveValue('')
    
    // Test partial input
    await joinInput.fill('12')
    await expect(joinButton).toBeDisabled()
    
    // Test valid input
    await joinInput.fill('1234')
    await expect(joinButton).toBeEnabled()
    
    await page.screenshot({ 
      path: 'test-results/phase1-2-join-validation.png',
      fullPage: true 
    })
    
    // 3. Test Start Session flow
    console.log('3. Testing Start Session...')
    // Clear join input first
    await page.getByText('Join Session').click() // Toggle it closed
    
    // Mock API for session creation
    await page.route('**/rest/v1/sessions*', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-session-id',
            code: '7890'
          })
        })
      } else {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Not found' })
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
    
    await page.getByText('Start Session').click()
    await page.waitForURL('**/session', { timeout: 5000 })
    
    // Verify navigation and session storage
    const sessionData = await page.evaluate(() => localStorage.getItem('activeSession'))
    expect(sessionData).toBeTruthy()
    const session = JSON.parse(sessionData!)
    expect(session.sessionCode).toBe('7890')
    expect(session.role).toBe('host')
    
    await page.screenshot({ 
      path: 'test-results/phase1-3-session-created.png',
      fullPage: true 
    })
    
    // 4. Test back navigation
    console.log('4. Testing back navigation...')
    await page.getByText('Back to Home').click()
    await expect(page).toHaveURL('http://127.0.0.1:5173/')
    
    // Verify session cleared
    const clearedSession = await page.evaluate(() => localStorage.getItem('activeSession'))
    expect(clearedSession).toBeNull()
    
    // 5. Test Join Session error handling
    console.log('5. Testing error handling...')
    
    // Mock error response
    await page.route('**/rest/v1/sessions*', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Session not found' })
      })
    })
    
    await page.getByText('Join Session').click()
    await joinInput.fill('9999')
    await page.getByRole('button', { name: 'Join', exact: true }).click()
    
    // Look for error message
    await page.waitForTimeout(1000)
    const errorText = await page.locator('.text-red-600, .text-red-400').textContent()
    expect(errorText).toBeTruthy()
    
    await page.screenshot({ 
      path: 'test-results/phase1-4-error-handling.png',
      fullPage: true 
    })
    
    // 6. Test mobile viewport
    console.log('6. Testing mobile responsiveness...')
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)
    
    // Verify mobile layout still works
    await expect(page.getByText('Start Translating')).toBeVisible()
    await expect(page.getByText('Start Session')).toBeVisible()
    await expect(page.getByText('Join Session')).toBeVisible()
    
    await page.screenshot({ 
      path: 'test-results/phase1-5-mobile-view.png',
      fullPage: true 
    })
    
    // 7. Test dark mode
    console.log('7. Testing dark mode...')
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.getByRole('button', { name: 'Toggle dark mode' }).click()
    
    const isDarkMode = await page.evaluate(() => 
      document.documentElement.classList.contains('dark')
    )
    expect(isDarkMode).toBe(true)
    
    await page.screenshot({ 
      path: 'test-results/phase1-6-dark-mode.png',
      fullPage: true 
    })
    
    console.log('=== Phase 1 Tests Complete ===')
  })

  test('Phase 1: Session Persistence', async ({ page }) => {
    console.log('Testing session persistence across refresh...')
    
    // Set up mock session
    await page.evaluate(() => {
      localStorage.setItem('activeSession', JSON.stringify({
        sessionId: 'persist-test-id',
        sessionCode: '5555',
        userId: 'test-user',
        role: 'host',
        createdAt: new Date().toISOString()
      }))
    })
    
    // Navigate to session page
    await page.goto('http://127.0.0.1:5173/session')
    await page.waitForLoadState('networkidle')
    
    // Should still be on session page
    await expect(page).toHaveURL(/.*\/session/)
    await expect(page.locator('text=Session Mode')).toBeVisible()
    
    // Verify session data still exists
    const sessionData = await page.evaluate(() => localStorage.getItem('activeSession'))
    expect(sessionData).toBeTruthy()
    const session = JSON.parse(sessionData!)
    expect(session.sessionCode).toBe('5555')
    
    await page.screenshot({ 
      path: 'test-results/phase1-7-persistence.png',
      fullPage: true 
    })
  })

  test('Phase 1: Join Existing Session', async ({ page }) => {
    console.log('Testing join existing session flow...')
    
    // Mock successful join
    await page.route('**/rest/v1/sessions*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'existing-session',
          code: '3333',
          is_active: true,
          expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString()
        })
      })
    })

    await page.route('**/rest/v1/session_participants*', async (route) => {
      if (route.request().url().includes('select')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ user_id: 'first-user' }])
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({})
        })
      }
    })
    
    // Join session
    await page.getByText('Join Session').click()
    const input = page.locator('input[placeholder="Enter 4-digit code"]')
    await input.fill('3333')
    await page.getByRole('button', { name: 'Join', exact: true }).click()
    
    // Wait for navigation
    await page.waitForURL('**/session', { timeout: 5000 })
    
    // Verify session joined
    const sessionData = await page.evaluate(() => localStorage.getItem('activeSession'))
    const session = JSON.parse(sessionData!)
    expect(session.sessionCode).toBe('3333')
    expect(session.role).toBe('guest')
    expect(session.partnerId).toBe('first-user')
    
    await page.screenshot({ 
      path: 'test-results/phase1-8-joined-session.png',
      fullPage: true 
    })
  })
})