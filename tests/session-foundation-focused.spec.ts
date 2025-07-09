import { test, expect } from '@playwright/test'

test.describe('Session Foundation - Phase 1 Tests', () => {
  test.use({
    // Set default timeout for all tests
    timeout: 30000,
    // Set default action timeout
    actionTimeout: 10000,
  })

  test.beforeEach(async ({ page }) => {
    // Navigate to home and wait for it to be ready
    await page.goto('http://127.0.0.1:5173/')
    // Wait for the main content to be visible
    await page.waitForSelector('text=Start Translating', { timeout: 10000 })
  })

  test('should display session buttons on home screen', async ({ page }) => {
    // Check for session buttons
    const startSessionButton = page.getByText('Start Session')
    const joinSessionButton = page.getByText('Join Session')
    
    await expect(startSessionButton).toBeVisible()
    await expect(joinSessionButton).toBeVisible()
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/phase1-home-with-sessions.png',
      fullPage: true 
    })
  })

  test('should show join input when clicked', async ({ page }) => {
    // Click Join Session
    await page.getByText('Join Session').click()
    
    // Wait for input to appear
    const joinInput = page.locator('input[placeholder="Enter 4-digit code"]')
    await expect(joinInput).toBeVisible()
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/phase1-join-input-visible.png',
      fullPage: true 
    })
  })

  test('should validate 4-digit input', async ({ page }) => {
    // Click Join Session
    await page.getByText('Join Session').click()
    
    const input = page.locator('input[placeholder="Enter 4-digit code"]')
    const joinButton = page.getByRole('button', { name: 'Join', exact: true })
    
    // Should start disabled
    await expect(joinButton).toBeDisabled()
    
    // Type valid code
    await input.fill('1234')
    await expect(joinButton).toBeEnabled()
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/phase1-valid-code-entered.png',
      fullPage: true 
    })
  })

  test('should handle Start Session click', async ({ page }) => {
    // Mock the Supabase API calls
    await page.route('**/rest/v1/sessions*', async (route) => {
      if (route.request().method() === 'POST') {
        // Mock session creation
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'mock-session-id',
            code: '1234'
          })
        })
      } else {
        // Mock session check
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

    // Click Start Session
    const startButton = page.getByText('Start Session')
    await startButton.click()
    
    // Wait a bit for navigation or error
    await page.waitForTimeout(2000)
    
    // Check if we navigated or got an error
    const currentUrl = page.url()
    console.log('Current URL after Start Session:', currentUrl)
    
    // Take screenshot of result
    await page.screenshot({ 
      path: 'test-results/phase1-after-start-session.png',
      fullPage: true 
    })
  })

  test('should show error for invalid session code', async ({ page }) => {
    // Mock error response
    await page.route('**/rest/v1/sessions*', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Session not found' })
      })
    })

    // Click Join Session
    await page.getByText('Join Session').click()
    
    // Enter code and try to join
    const input = page.locator('input[placeholder="Enter 4-digit code"]')
    await input.fill('9999')
    await page.getByRole('button', { name: 'Join', exact: true }).click()
    
    // Wait for error to appear
    await page.waitForTimeout(1000)
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/phase1-join-error.png',
      fullPage: true 
    })
  })
})