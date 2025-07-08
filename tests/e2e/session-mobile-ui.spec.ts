import { test, expect, devices } from '@playwright/test'

// Test on iPhone viewport
test.use({
  ...devices['iPhone 14'],
  permissions: ['microphone'],
})

test.describe('Session Mobile UI/UX Tests', () => {
  let sessionCode: string

  test.beforeEach(async ({ page }) => {
    // Create a new session
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Create session
    await page.getByRole('button', { name: /create.*session/i }).click()
    await page.waitForURL(/\/session\/\d{4}/)
    
    // Extract session code from URL
    const url = page.url()
    sessionCode = url.match(/\/session\/(\d{4})/)?.[1] || ''
    expect(sessionCode).toMatch(/^\d{4}$/)
  })

  test('1. Voice and keyboard controls match solo session', async ({ page }) => {
    console.log('🎯 Testing voice and keyboard controls consistency...')
    
    // Check for all control buttons
    const controls = page.locator('div').filter({ hasText: 'Hold to record' }).first().locator('..')
    
    // Verify record button
    const recordButton = controls.locator('button').filter({ has: page.locator('svg') }).first()
    await expect(recordButton).toBeVisible()
    await expect(recordButton).toHaveClass(/bg-blue-500/)
    
    // Verify language toggle button
    const langButton = await page.getByRole('button').filter({ hasText: /ES|PT/i }).first()
    await expect(langButton).toBeVisible()
    
    // Verify keyboard toggle button
    const keyboardButton = controls.locator('button').filter({ has: page.locator('svg[class*="keyboard"]') })
    await expect(keyboardButton).toBeVisible()
    
    // Verify fun mode toggle button
    const funButton = controls.locator('button').filter({ has: page.locator('svg[class*="sparkles"]') })
    await expect(funButton).toBeVisible()
    
    // Test keyboard toggle
    await keyboardButton.click()
    await expect(page.locator('input[placeholder*="type"]')).toBeVisible()
    
    // Test language toggle
    await langButton.click()
    const langText = await langButton.textContent()
    expect(langText).toMatch(/PT|ES/)
    
    // Test fun mode toggle
    await funButton.click()
    await expect(funButton).toHaveClass(/primary/)
    
    console.log('✅ All controls match solo session layout')
  })

  test('2. Light and dark mode visibility', async ({ page }) => {
    console.log('🎯 Testing light/dark mode visibility...')
    
    // Test light mode (default)
    await page.waitForTimeout(500)
    
    // Check background
    const body = page.locator('body')
    await expect(body).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    
    // Check text visibility
    const heading = page.getByText('Ready to translate!')
    await expect(heading).toBeVisible()
    await expect(heading).toHaveCSS('color', 'rgb(17, 24, 39)') // gray-900
    
    // Check button visibility
    const recordButton = page.locator('button').filter({ has: page.locator('svg') }).first()
    await expect(recordButton).toHaveCSS('background-color', 'rgb(59, 130, 246)') // blue-500
    
    // Switch to dark mode
    const themeToggle = page.getByRole('button').filter({ has: page.locator('svg[class*="sun"]') })
    if (await themeToggle.isVisible()) {
      await themeToggle.click()
    }
    
    // Wait for theme transition
    await page.waitForTimeout(300)
    
    // Check dark mode colors
    await expect(body).toHaveClass(/dark/)
    
    // Check text visibility in dark mode
    await expect(heading).toBeVisible()
    await expect(heading).toHaveCSS('color', 'rgb(255, 255, 255)') // white in dark mode
    
    // Check controls visibility in dark mode
    await expect(recordButton).toBeVisible()
    await expect(recordButton).toHaveCSS('background-color', 'rgb(59, 130, 246)') // blue-500 stays same
    
    console.log('✅ Light and dark modes have proper visibility')
  })

  test('3. Menu persistence on mobile', async ({ page }) => {
    console.log('🎯 Testing menu persistence...')
    
    // Check header is sticky
    const header = page.locator('header').first()
    await expect(header).toHaveClass(/sticky/)
    await expect(header).toHaveCSS('position', 'sticky')
    await expect(header).toHaveCSS('top', '0px')
    
    // Check session code is visible
    const sessionCodeElement = page.getByText(sessionCode)
    await expect(sessionCodeElement).toBeVisible()
    
    // Check leave button is visible
    const leaveButton = page.getByRole('button', { name: /leave/i })
    await expect(leaveButton).toBeVisible()
    
    // Scroll down (simulate messages)
    await page.evaluate(() => window.scrollBy(0, 500))
    await page.waitForTimeout(300)
    
    // Header should still be visible
    await expect(header).toBeInViewport()
    await expect(sessionCodeElement).toBeVisible()
    await expect(leaveButton).toBeVisible()
    
    console.log('✅ Menu persists properly on scroll')
  })

  test('4. Mobile-specific UI elements', async ({ page }) => {
    console.log('🎯 Testing mobile-specific UI...')
    
    // Check mobile status indicators
    const mobileStatusContainer = page.locator('.sm\\:hidden').filter({ hasText: /waiting|users/i })
    await expect(mobileStatusContainer).toBeVisible()
    
    // Check for "Waiting..." text when alone
    await expect(mobileStatusContainer).toContainText('Waiting...')
    
    // Check mobile-optimized button sizes
    const recordButton = page.locator('button').filter({ has: page.locator('svg') }).first()
    const buttonBox = await recordButton.boundingBox()
    expect(buttonBox?.width).toBeGreaterThan(60) // Should be large enough for touch
    expect(buttonBox?.height).toBeGreaterThan(60)
    
    // Check spacing between controls
    const controls = page.locator('div').filter({ hasText: 'Hold to record' }).first().locator('..')
    const buttons = await controls.locator('button').all()
    expect(buttons.length).toBeGreaterThanOrEqual(4) // Record, Lang, Keyboard, Fun
    
    console.log('✅ Mobile UI elements properly sized and spaced')
  })

  test('5. Touch interactions', async ({ page }) => {
    console.log('🎯 Testing touch interactions...')
    
    // Test record button touch
    const recordButton = page.locator('button').filter({ has: page.locator('svg') }).first()
    
    // Simulate touch start
    await recordButton.dispatchEvent('touchstart')
    await page.waitForTimeout(100)
    
    // Button should change color when recording
    await expect(recordButton).toHaveClass(/bg-red-500/)
    
    // Simulate touch end
    await recordButton.dispatchEvent('touchend')
    await page.waitForTimeout(100)
    
    // Button should return to normal
    await expect(recordButton).toHaveClass(/bg-blue-500/)
    
    // Test keyboard toggle
    const keyboardButton = page.locator('button').filter({ has: page.locator('svg[class*="keyboard"]') })
    await keyboardButton.tap()
    
    const input = page.locator('input[placeholder*="type"]')
    await expect(input).toBeVisible()
    
    // Test text input
    await input.fill('Test message')
    await expect(input).toHaveValue('Test message')
    
    console.log('✅ Touch interactions work correctly')
  })

  test('6. Responsive text and spacing', async ({ page }) => {
    console.log('🎯 Testing responsive text and spacing...')
    
    // Check text sizes
    const heading = page.getByText('Ready to translate!')
    await expect(heading).toHaveCSS('font-size', '18px') // text-lg
    
    const subtitle = page.getByText('Hold the record button')
    await expect(subtitle).toHaveCSS('font-size', '16px') // Default
    
    // Check padding on mobile
    const container = page.locator('.p-4').first()
    await expect(container).toHaveCSS('padding', '16px')
    
    // Check control spacing
    const controlsContainer = page.locator('div').filter({ hasText: 'Hold to record' }).first().locator('..')
    await expect(controlsContainer).toHaveClass(/gap-4/) // Proper spacing between buttons
    
    console.log('✅ Text and spacing are mobile-optimized')
  })

  test('7. Message alignment and visibility', async ({ page }) => {
    console.log('🎯 Testing message alignment...')
    
    // Send a test message using keyboard
    const keyboardButton = page.locator('button').filter({ has: page.locator('svg[class*="keyboard"]') })
    await keyboardButton.click()
    
    const input = page.locator('input[placeholder*="type"]')
    await input.fill('Hello from user')
    await input.press('Enter')
    
    // Wait for message to appear
    await page.waitForTimeout(1000)
    
    // Check user message alignment (should be left)
    const userMessage = page.locator('div').filter({ hasText: 'Hello from user' }).first()
    const messageContainer = userMessage.locator('..').first()
    await expect(messageContainer).toHaveClass(/justify-start/)
    
    // Check message bubble color
    const messageBubble = userMessage.locator('..').first()
    await expect(messageBubble).toHaveClass(/bg-blue-600/)
    
    console.log('✅ Messages properly aligned and styled')
  })

  test('8. Error states and permissions', async ({ page, context }) => {
    console.log('🎯 Testing error states...')
    
    // Revoke microphone permission
    await context.clearPermissions()
    
    // Try to record without permission
    const recordButton = page.locator('button').filter({ has: page.locator('svg') }).first()
    await recordButton.click()
    
    // Should show error message
    await expect(page.getByText(/microphone permission/i)).toBeVisible({ timeout: 5000 })
    
    // Error should be styled properly
    const errorMessage = page.locator('.text-red-600')
    await expect(errorMessage).toBeVisible()
    
    console.log('✅ Error states display correctly')
  })

  test('9. Network status indicators', async ({ page }) => {
    console.log('🎯 Testing network status...')
    
    // Check online status indicator
    const onlineIndicator = page.locator('div').filter({ has: page.locator('svg[class*="wifi"]') }).first()
    await expect(onlineIndicator).toBeVisible()
    
    // Should show "Waiting..." when only one user
    const statusText = page.getByText(/waiting/i).first()
    await expect(statusText).toBeVisible()
    
    console.log('✅ Network status properly displayed')
  })

  test('10. Performance and animations', async ({ page }) => {
    console.log('🎯 Testing performance...')
    
    // Check for smooth transitions
    const recordButton = page.locator('button').filter({ has: page.locator('svg') }).first()
    await expect(recordButton).toHaveClass(/transition-all/)
    
    // Test button press animation
    await recordButton.dispatchEvent('pointerdown')
    await expect(recordButton).toHaveClass(/scale-110/) // Should scale up when recording
    await recordButton.dispatchEvent('pointerup')
    
    // Check for animation classes
    const messageArea = page.getByText('Ready to translate!').locator('..')
    await expect(messageArea).toHaveClass(/animate-fade-in/)
    
    console.log('✅ Animations and transitions work smoothly')
  })
})

// Additional viewport tests
test.describe('Session UI on different devices', () => {
  const testDevices = [
    { name: 'iPhone SE', device: devices['iPhone SE'] },
    { name: 'iPad', device: devices['iPad'] },
    { name: 'Pixel 7', device: devices['Pixel 7'] },
  ]

  for (const { name, device } of testDevices) {
    test(`UI works on ${name}`, async ({ browser }) => {
      const context = await browser.newContext({
        ...device,
        permissions: ['microphone'],
      })
      const page = await context.newPage()
      
      await page.goto('/')
      await page.getByRole('button', { name: /create.*session/i }).click()
      await page.waitForURL(/\/session\/\d{4}/)
      
      // Check all elements are visible
      await expect(page.getByText('Ready to translate!')).toBeVisible()
      await expect(page.locator('button').filter({ has: page.locator('svg') }).first()).toBeVisible()
      
      // Check responsive layout
      const viewport = page.viewportSize()
      if (viewport && viewport.width < 640) {
        // Mobile layout
        await expect(page.locator('.sm\\:hidden')).toBeVisible()
      } else {
        // Tablet/desktop layout
        await expect(page.locator('.hidden.sm\\:flex')).toBeVisible()
      }
      
      await context.close()
    })
  }
})