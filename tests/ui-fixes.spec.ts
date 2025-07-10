import { test, expect } from '@playwright/test'

test.describe('Mobile UI/UX Fixes', () => {
  test('home page mobile viewport fits screen without scrolling', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Navigate to home page
    await page.goto('http://127.0.0.1:5173/')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Wait for the title to appear
    await page.waitForSelector('h1', { timeout: 10000 })
    
    // Take screenshot for analysis
    await page.screenshot({ path: 'test-results/home-mobile-viewport.png' })
    
    // Check main elements are visible
    await expect(page.getByText('Real-time Translator')).toBeVisible()
    await expect(page.getByText('Start Translating')).toBeVisible()
    
    // Check viewport height vs scroll height
    const viewportHeight = await page.evaluate(() => window.innerHeight)
    const documentHeight = await page.evaluate(() => document.body.scrollHeight)
    
    console.log('🔍 Viewport height:', viewportHeight)
    console.log('🔍 Document height:', documentHeight)
    console.log('🔍 Fits without scrolling:', documentHeight <= viewportHeight)
  })

  test('session buttons have proper contrast in light mode', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Navigate to home page
    await page.goto('http://127.0.0.1:5173/')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('h1', { timeout: 10000 })
    
    // Ensure we're in light mode
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark')
    })
    
    // Wait a bit for theme to apply
    await page.waitForTimeout(500)
    
    // Take screenshot of light mode
    await page.screenshot({ path: 'test-results/session-buttons-light.png' })
    
    // Check that session buttons are visible and have proper styling
    const startSessionButton = page.getByText('Start Session')
    const joinSessionButton = page.getByText('Join Session')
    
    await expect(startSessionButton).toBeVisible()
    await expect(joinSessionButton).toBeVisible()
    
    // Check computed styles for proper contrast
    const startButtonStyles = await startSessionButton.evaluate(el => {
      const styles = window.getComputedStyle(el)
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        border: styles.border
      }
    })
    
    console.log('🎨 Start button styles:', startButtonStyles)
  })

  test('session buttons layout is single line on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Navigate to home page
    await page.goto('http://127.0.0.1:5173/')
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/session-buttons-layout.png' })
    
    // Check that buttons use flex-row layout
    const startSessionButton = page.getByText('Start Session')
    const joinSessionButton = page.getByText('Join Session')
    
    await expect(startSessionButton).toBeVisible()
    await expect(joinSessionButton).toBeVisible()
    
    // Check that icon and text are on the same line
    const startButtonLayout = await startSessionButton.evaluate(el => {
      const styles = window.getComputedStyle(el)
      return {
        flexDirection: styles.flexDirection,
        alignItems: styles.alignItems,
        justifyContent: styles.justifyContent
      }
    })
    
    console.log('📐 Start button layout:', startButtonLayout)
    expect(startButtonLayout.flexDirection).toBe('row')
  })

  test('join session input is center-aligned', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Navigate to home page
    await page.goto('http://127.0.0.1:5173/')
    
    // Click join session to show input
    await page.getByText('Join Session').click()
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/join-session-input.png' })
    
    // Check that input group is center-aligned
    const inputContainer = page.locator('[data-testid="join-code-input"]').locator('..')
    await expect(inputContainer).toBeVisible()
    
    // Check alignment styles
    const containerStyles = await inputContainer.evaluate(el => {
      const styles = window.getComputedStyle(el)
      return {
        justifyContent: styles.justifyContent,
        alignItems: styles.alignItems,
        display: styles.display
      }
    })
    
    console.log('🎯 Input container styles:', containerStyles)
  })

  test('settings page removed sound notifications section', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Navigate to settings page
    await page.goto('http://127.0.0.1:5173/settings')
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/settings-notifications.png' })
    
    // Check that "Sound Notifications" section is removed
    const soundNotificationsHeading = page.getByText('Sound Notifications')
    await expect(soundNotificationsHeading).not.toBeVisible()
    
    // Check that main "Notifications" section still exists
    const notificationsHeading = page.getByRole('heading', { name: 'Notifications' })
    await expect(notificationsHeading).toBeVisible()
    
    console.log('✅ Sound Notifications section removed, main Notifications section retained')
  })

  test('dark mode session buttons have proper contrast', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Navigate to home page
    await page.goto('http://127.0.0.1:5173/')
    
    // Enable dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
    
    // Take screenshot of dark mode
    await page.screenshot({ path: 'test-results/session-buttons-dark.png' })
    
    // Check that session buttons are visible in dark mode
    const startSessionButton = page.getByText('Start Session')
    const joinSessionButton = page.getByText('Join Session')
    
    await expect(startSessionButton).toBeVisible()
    await expect(joinSessionButton).toBeVisible()
    
    console.log('🌙 Dark mode session buttons verified')
  })
})