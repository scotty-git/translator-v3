import { test, expect } from '@playwright/test'

const PRODUCTION_URL = 'https://translator-v3.vercel.app'

// Configure headless mode and viewport at the top level
test.use({
  viewport: { width: 375, height: 812 }, // iPhone 13 size
})

test.describe('HomeScreen UI Improvements - Baseline Testing', () => {

  test('Baseline screenshots - Light mode', async ({ page }) => {
    console.log('📸 Taking baseline screenshots in light mode...')
    
    // Navigate to production URL
    await page.goto(PRODUCTION_URL)
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle')
    
    // Ensure we're in light mode
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark')
    })
    
    // Take full page screenshot
    await page.screenshot({ 
      path: 'test-results/homescreen-light-baseline.png',
      fullPage: true
    })
    
    // Take screenshot focusing on buttons
    await page.locator('[data-testid="home-screen"]').screenshot({
      path: 'test-results/homescreen-buttons-light-baseline.png'
    })
    
    console.log('✅ Light mode baseline screenshots captured')
  })

  test('Baseline screenshots - Dark mode', async ({ page }) => {
    console.log('📸 Taking baseline screenshots in dark mode...')
    
    // Navigate to production URL
    await page.goto(PRODUCTION_URL)
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle')
    
    // Switch to dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
    
    // Wait for dark mode to apply
    await page.waitForTimeout(500)
    
    // Take full page screenshot
    await page.screenshot({ 
      path: 'test-results/homescreen-dark-baseline.png',
      fullPage: true
    })
    
    // Take screenshot focusing on buttons
    await page.locator('[data-testid="home-screen"]').screenshot({
      path: 'test-results/homescreen-buttons-dark-baseline.png'
    })
    
    console.log('✅ Dark mode baseline screenshots captured')
  })

  test('Baseline screenshots - Join modal', async ({ page }) => {
    console.log('📸 Taking baseline screenshots of join modal...')
    
    // Navigate to production URL
    await page.goto(PRODUCTION_URL)
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle')
    
    // Test in light mode
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark')
    })
    
    // Click Join Session to show modal
    await page.click('button:has-text("Join Session")')
    
    // Wait for modal to appear
    await page.waitForSelector('input[data-testid="join-code-input"]')
    
    // Take screenshot of modal
    await page.screenshot({ 
      path: 'test-results/join-modal-light-baseline.png',
      fullPage: true
    })
    
    // Test in dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
    
    // Wait for dark mode to apply
    await page.waitForTimeout(500)
    
    // Take screenshot of modal in dark mode
    await page.screenshot({ 
      path: 'test-results/join-modal-dark-baseline.png',
      fullPage: true
    })
    
    console.log('✅ Join modal baseline screenshots captured')
  })

  test('Document current button visibility issues', async ({ page }) => {
    console.log('🔍 Documenting current button visibility issues...')
    
    // Navigate to production URL
    await page.goto(PRODUCTION_URL)
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle')
    
    // Test dark mode button visibility
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
    
    // Wait for dark mode to apply
    await page.waitForTimeout(500)
    
    // Check button visibility
    const startButton = page.locator('button:has-text("Start Session")')
    const joinButton = page.locator('button:has-text("Join Session")')
    
    // Verify buttons exist
    await expect(startButton).toBeVisible()
    await expect(joinButton).toBeVisible()
    
    // Get computed styles to document the contrast issue
    const startButtonStyles = await startButton.evaluate((el) => {
      const styles = window.getComputedStyle(el)
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        borderColor: styles.borderColor,
      }
    })
    
    const joinButtonStyles = await joinButton.evaluate((el) => {
      const styles = window.getComputedStyle(el)
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        borderColor: styles.borderColor,
      }
    })
    
    console.log('📊 Current button styles in dark mode:')
    console.log('Start Button:', startButtonStyles)
    console.log('Join Button:', joinButtonStyles)
    
    // Take detailed screenshot for analysis
    await page.screenshot({ 
      path: 'test-results/button-contrast-analysis-dark.png',
      fullPage: true
    })
    
    console.log('✅ Button visibility issues documented')
  })

  test('Document current modal alignment issues', async ({ page }) => {
    console.log('🔍 Documenting current modal alignment issues...')
    
    // Navigate to production URL
    await page.goto(PRODUCTION_URL)
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle')
    
    // Get grid button dimensions
    const gridContainer = page.locator('.grid.grid-cols-2')
    const gridBox = await gridContainer.boundingBox()
    
    console.log('📊 Grid container dimensions:', gridBox)
    
    // Click Join Session to show modal
    await page.click('button:has-text("Join Session")')
    
    // Wait for modal to appear
    await page.waitForSelector('input[data-testid="join-code-input"]')
    
    // Get modal input dimensions
    const modalContainer = page.locator('.flex.gap-2.justify-center.items-center')
    const modalBox = await modalContainer.boundingBox()
    
    console.log('📊 Modal container dimensions:', modalBox)
    
    // Calculate alignment difference
    const alignmentDiff = gridBox ? gridBox.width - (modalBox?.width || 0) : 0
    console.log('📊 Alignment difference:', alignmentDiff, 'pixels')
    
    // Take screenshot for analysis
    await page.screenshot({ 
      path: 'test-results/modal-alignment-analysis.png',
      fullPage: true
    })
    
    console.log('✅ Modal alignment issues documented')
  })

  test('Test current keyboard navigation', async ({ page }) => {
    console.log('⌨️ Testing current keyboard navigation...')
    
    // Navigate to production URL
    await page.goto(PRODUCTION_URL)
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle')
    
    // Click Join Session to show modal
    await page.click('button:has-text("Join Session")')
    
    // Wait for modal to appear
    await page.waitForSelector('input[data-testid="join-code-input"]')
    
    // Type in code
    await page.fill('input[data-testid="join-code-input"]', '1234')
    
    // Try pressing Enter (should NOT work in current implementation)
    await page.press('input[data-testid="join-code-input"]', 'Enter')
    
    // Wait a moment to see if anything happens
    await page.waitForTimeout(1000)
    
    // Check if we're still on the same page (Enter key should NOT work)
    const currentUrl = page.url()
    console.log('📊 Current URL after Enter key:', currentUrl)
    
    // Should still be on home page
    expect(currentUrl).toBe(PRODUCTION_URL + '/')
    
    console.log('✅ Confirmed Enter key navigation is currently NOT working')
  })

  test('Cross-device baseline testing', async ({ page }) => {
    console.log('📱 Testing across different viewport sizes...')
    
    const viewports = [
      { name: 'iPhone 13', width: 375, height: 812 },
      { name: 'iPhone 13 Pro Max', width: 428, height: 926 },
      { name: 'iPad', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 },
    ]
    
    for (const viewport of viewports) {
      console.log(`📸 Testing ${viewport.name} (${viewport.width}x${viewport.height})`)
      
      // Set viewport
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      
      // Navigate to production URL
      await page.goto(PRODUCTION_URL)
      
      // Wait for page to fully load
      await page.waitForLoadState('networkidle')
      
      // Take screenshot
      await page.screenshot({ 
        path: `test-results/baseline-${viewport.name.toLowerCase().replace(' ', '-')}.png`,
        fullPage: true
      })
      
      // Test dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark')
      })
      
      await page.waitForTimeout(500)
      
      // Take dark mode screenshot
      await page.screenshot({ 
        path: `test-results/baseline-${viewport.name.toLowerCase().replace(' ', '-')}-dark.png`,
        fullPage: true
      })
      
      console.log(`✅ ${viewport.name} baseline screenshots captured`)
    }
  })
})

test.describe('HomeScreen UI Improvements - Functionality Testing', () => {

  test('Verify button functionality still works', async ({ page }) => {
    console.log('🔧 Testing button functionality...')
    
    // Navigate to production URL
    await page.goto(PRODUCTION_URL)
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle')
    
    // Test Start Session button
    await page.click('button:has-text("Start Session")')
    
    // Should navigate to session page
    await page.waitForURL(/\/session/)
    
    console.log('✅ Start Session button works correctly')
    
    // Go back to home
    await page.goto(PRODUCTION_URL)
    
    // Test Join Session button
    await page.click('button:has-text("Join Session")')
    
    // Should show input field
    await expect(page.locator('input[data-testid="join-code-input"]')).toBeVisible()
    
    console.log('✅ Join Session button works correctly')
  })

  test('Verify Solo translator button still works', async ({ page }) => {
    console.log('🔧 Testing Solo translator button...')
    
    // Navigate to production URL
    await page.goto(PRODUCTION_URL)
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle')
    
    // Test Solo translator button
    await page.click('button:has-text("Start Translating")')
    
    // Should navigate to translator page
    await page.waitForURL(/\/translator/)
    
    console.log('✅ Solo translator button works correctly')
  })
})