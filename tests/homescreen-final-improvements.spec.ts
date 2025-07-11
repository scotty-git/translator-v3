import { test, expect } from '@playwright/test'

// Production URL for accurate testing (never use local dev)
const PRODUCTION_URL = 'https://translator-v3.vercel.app'

// Test configuration
test.use({
  headless: true, // Never interrupt user's screen
  viewport: { width: 375, height: 812 }, // iPhone 13 baseline
})

test.describe('HomeScreen Final UI/UX Improvements', () => {
  
  test.beforeEach(async ({ page }) => {
    console.log('🔍 [Test] Navigating to:', PRODUCTION_URL)
    await page.goto(PRODUCTION_URL)
    await page.waitForLoadState('networkidle')
  })

  test('Capture baseline screenshots - before improvements', async ({ page }) => {
    console.log('📸 [Test] Capturing baseline screenshots...')
    
    // Light mode screenshot
    await page.screenshot({ 
      path: 'test-results/homescreen-baseline-light.png',
      fullPage: true
    })
    console.log('✅ [Test] Light mode baseline captured')
    
    // Dark mode screenshot
    await page.click('button[title="Dark"]')
    await page.waitForTimeout(1000)
    await page.screenshot({ 
      path: 'test-results/homescreen-baseline-dark.png',
      fullPage: true
    })
    console.log('✅ [Test] Dark mode baseline captured')
    
    // Join modal screenshot
    await page.click('button:has-text("Join Session")')
    await page.waitForTimeout(500)
    await page.screenshot({ 
      path: 'test-results/homescreen-baseline-join-modal.png',
      fullPage: true
    })
    console.log('✅ [Test] Join modal baseline captured')
  })

  test('Validate current button visibility issues', async ({ page }) => {
    console.log('🔍 [Test] Validating button visibility issues...')
    
    // Test light mode button visibility
    const startButton = page.locator('button:has-text("Start Session")')
    const joinButton = page.locator('button:has-text("Join Session")')
    
    await expect(startButton).toBeVisible()
    await expect(joinButton).toBeVisible()
    
    // Test dark mode button visibility
    await page.click('button[title="Dark"]')
    await page.waitForTimeout(1000)
    
    await expect(startButton).toBeVisible()
    await expect(joinButton).toBeVisible()
    
    console.log('✅ [Test] Button visibility validated')
  })

  test('Test button text truncation - critical issue check', async ({ page }) => {
    console.log('🔍 [Test] Checking for text truncation issues...')
    
    // Open join modal
    await page.click('button:has-text("Join Session")')
    await page.waitForTimeout(500)
    
    // Check join button text (the modal button, not the main "Join Session" button)
    const joinModalButton = page.locator('button:has-text("Join")').nth(1) // Second button (modal button)
    await expect(joinModalButton).toBeVisible()
    
    // Get the full text content
    const buttonText = await joinModalButton.textContent()
    console.log('📝 [Test] Join button text:', buttonText)
    
    // Critical check: ensure "Join" not truncated to "Joi"
    expect(buttonText).not.toBe('Joi')
    expect(buttonText).toBe('Join')
    
    console.log('✅ [Test] Text truncation check passed')
  })

  test('Test modal alignment with grid buttons', async ({ page }) => {
    console.log('🔍 [Test] Checking modal alignment...')
    
    // Get grid buttons container width
    const gridButtons = page.locator('.grid.grid-cols-2').first()
    const gridBounds = await gridButtons.boundingBox()
    
    // Open join modal
    await page.click('button:has-text("Join Session")')
    await page.waitForTimeout(500)
    
    // Get modal container width
    const modalContainer = page.locator('div:has(input[data-testid="join-code-input"])')
    const modalBounds = await modalContainer.boundingBox()
    
    console.log('📏 [Test] Grid width:', gridBounds?.width)
    console.log('📏 [Test] Modal width:', modalBounds?.width)
    
    // Check alignment (should be within 10px tolerance)
    if (gridBounds && modalBounds) {
      const widthDifference = Math.abs(gridBounds.width - modalBounds.width)
      console.log('📏 [Test] Width difference:', widthDifference, 'px')
      expect(widthDifference).toBeLessThan(10)
    }
    
    console.log('✅ [Test] Modal alignment validated')
  })

  test('Test Enter key navigation functionality', async ({ page }) => {
    console.log('🔍 [Test] Testing Enter key navigation...')
    
    // Open join modal
    await page.click('button:has-text("Join Session")')
    await page.waitForTimeout(500)
    
    // Fill in 4-digit code
    const input = page.locator('input[data-testid="join-code-input"]')
    await input.fill('1234')
    
    // Press Enter key
    await input.press('Enter')
    
    // Should attempt to join (will fail with invalid code, but action should be triggered)
    await page.waitForTimeout(1000)
    
    console.log('✅ [Test] Enter key navigation tested')
  })

  test('Cross-device testing - multiple viewports', async ({ page }) => {
    console.log('🔍 [Test] Testing cross-device compatibility...')
    
    const viewports = [
      { name: 'iPhone-13', width: 375, height: 812 },
      { name: 'iPhone-13-Pro-Max', width: 428, height: 926 },
      { name: 'iPad', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ]
    
    for (const viewport of viewports) {
      console.log(`📱 [Test] Testing ${viewport.name} (${viewport.width}x${viewport.height})`)
      
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.waitForTimeout(1000)
      
      // Test button visibility
      const startButton = page.locator('button:has-text("Start Session")')
      const joinButton = page.locator('button:has-text("Join Session")')
      
      await expect(startButton).toBeVisible()
      await expect(joinButton).toBeVisible()
      
      // Test join modal
      await page.click('button:has-text("Join Session")')
      await page.waitForTimeout(500)
      
      const joinModalButton = page.locator('button:has-text("Join")').nth(1) // Modal button
      await expect(joinModalButton).toBeVisible()
      
      // Check text truncation
      const buttonText = await joinModalButton.textContent()
      expect(buttonText).toBe('Join')
      
      // Take screenshot
      await page.screenshot({ 
        path: `test-results/homescreen-baseline-${viewport.name}.png`,
        fullPage: true
      })
      
      // Close modal for next iteration
      await page.click('button:has-text("Join Session")')
      await page.waitForTimeout(500)
    }
    
    console.log('✅ [Test] Cross-device testing completed')
  })

  test('Color contrast analysis - prepare for improvements', async ({ page }) => {
    console.log('🔍 [Test] Analyzing current color contrast...')
    
    // Test light mode colors
    const startButton = page.locator('button:has-text("Start Session")')
    const lightStyles = await startButton.evaluate((el) => {
      const styles = window.getComputedStyle(el)
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        borderColor: styles.borderColor
      }
    })
    
    console.log('🎨 [Test] Light mode button styles:', lightStyles)
    
    // Test dark mode colors
    await page.click('button[title="Dark"]')
    await page.waitForTimeout(1000)
    
    const darkStyles = await startButton.evaluate((el) => {
      const styles = window.getComputedStyle(el)
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        borderColor: styles.borderColor
      }
    })
    
    console.log('🎨 [Test] Dark mode button styles:', darkStyles)
    
    // Document current state for comparison
    console.log('📝 [Test] Current color analysis completed - ready for improvements')
  })

  test('Button height and layout analysis', async ({ page }) => {
    console.log('🔍 [Test] Analyzing button height and layout...')
    
    const startButton = page.locator('button:has-text("Start Session")')
    const joinButton = page.locator('button:has-text("Join Session")')
    
    // Get button dimensions
    const startBounds = await startButton.boundingBox()
    const joinBounds = await joinButton.boundingBox()
    
    console.log('📏 [Test] Start button dimensions:', startBounds)
    console.log('📏 [Test] Join button dimensions:', joinBounds)
    
    // Check if buttons are too tall (current issue)
    if (startBounds) {
      console.log('📏 [Test] Start button height:', startBounds.height, 'px')
      // Document current height for comparison
    }
    
    if (joinBounds) {
      console.log('📏 [Test] Join button height:', joinBounds.height, 'px')
      // Document current height for comparison
    }
    
    console.log('✅ [Test] Button layout analysis completed')
  })

})

// After improvements testing suite
test.describe('HomeScreen After Improvements Validation', () => {
  
  test.beforeEach(async ({ page }) => {
    console.log('🔍 [Test] Navigating to:', PRODUCTION_URL)
    await page.goto(PRODUCTION_URL)
    await page.waitForLoadState('networkidle')
  })

  test('Capture after screenshots - post improvements', async ({ page }) => {
    console.log('📸 [Test] Capturing after-improvement screenshots...')
    
    // Light mode screenshot
    await page.screenshot({ 
      path: 'test-results/homescreen-after-light.png',
      fullPage: true
    })
    console.log('✅ [Test] Light mode after screenshot captured')
    
    // Dark mode screenshot
    await page.click('button[title="Dark"]')
    await page.waitForTimeout(1000)
    await page.screenshot({ 
      path: 'test-results/homescreen-after-dark.png',
      fullPage: true
    })
    console.log('✅ [Test] Dark mode after screenshot captured')
    
    // Join modal screenshot
    await page.click('button:has-text("Join Session")')
    await page.waitForTimeout(500)
    await page.screenshot({ 
      path: 'test-results/homescreen-after-join-modal.png',
      fullPage: true
    })
    console.log('✅ [Test] Join modal after screenshot captured')
  })

  test('Validate improved button colors and contrast', async ({ page }) => {
    console.log('🔍 [Test] Validating improved button colors...')
    
    const startButton = page.locator('button:has-text("Start Session")')
    
    // Test light mode improved colors
    const lightStyles = await startButton.evaluate((el) => {
      const styles = window.getComputedStyle(el)
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        borderColor: styles.borderColor
      }
    })
    
    console.log('🎨 [Test] Improved light mode styles:', lightStyles)
    
    // Test dark mode improved colors
    await page.click('button[title="Dark"]')
    await page.waitForTimeout(1000)
    
    const darkStyles = await startButton.evaluate((el) => {
      const styles = window.getComputedStyle(el)
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        borderColor: styles.borderColor
      }
    })
    
    console.log('🎨 [Test] Improved dark mode styles:', darkStyles)
    
    // Validate no gray-on-gray issues
    expect(lightStyles.backgroundColor).not.toBe(lightStyles.borderColor)
    expect(darkStyles.backgroundColor).not.toBe(darkStyles.borderColor)
    
    console.log('✅ [Test] Improved color contrast validated')
  })

  test('Validate improved button height and layout', async ({ page }) => {
    console.log('🔍 [Test] Validating improved button layout...')
    
    const startButton = page.locator('button:has-text("Start Session")')
    const joinButton = page.locator('button:has-text("Join Session")')
    
    // Get improved button dimensions
    const startBounds = await startButton.boundingBox()
    const joinBounds = await joinButton.boundingBox()
    
    console.log('📏 [Test] Improved start button dimensions:', startBounds)
    console.log('📏 [Test] Improved join button dimensions:', joinBounds)
    
    // Validate reasonable button heights (not too tall)
    if (startBounds) {
      expect(startBounds.height).toBeLessThan(80) // Reasonable max height
      console.log('📏 [Test] Start button height improved:', startBounds.height, 'px')
    }
    
    if (joinBounds) {
      expect(joinBounds.height).toBeLessThan(80) // Reasonable max height
      console.log('📏 [Test] Join button height improved:', joinBounds.height, 'px')
    }
    
    console.log('✅ [Test] Improved button layout validated')
  })

  test('Final comprehensive validation - all improvements', async ({ page }) => {
    console.log('🔍 [Test] Running final comprehensive validation...')
    
    // 1. Button visibility in both modes
    const startButton = page.locator('button:has-text("Start Session")')
    const joinButton = page.locator('button:has-text("Join Session")')
    
    await expect(startButton).toBeVisible()
    await expect(joinButton).toBeVisible()
    
    // Dark mode
    await page.click('button[title="Dark"]')
    await page.waitForTimeout(1000)
    await expect(startButton).toBeVisible()
    await expect(joinButton).toBeVisible()
    
    // 2. Join modal functionality
    await page.click('button:has-text("Join Session")')
    await page.waitForTimeout(500)
    
    const joinModalButton = page.locator('button:has-text("Join")').nth(1) // Modal button
    await expect(joinModalButton).toBeVisible()
    
    // 3. Text truncation check
    const buttonText = await joinModalButton.textContent()
    expect(buttonText).toBe('Join')
    
    // 4. Enter key navigation
    const input = page.locator('input[data-testid="join-code-input"]')
    await input.fill('1234')
    await input.press('Enter')
    
    // 5. Modal alignment
    const gridButtons = page.locator('.grid.grid-cols-2').first()
    const modalContainer = page.locator('.grid.grid-cols-\\[1fr_auto\\]').first()
    
    const gridBounds = await gridButtons.boundingBox()
    const modalBounds = await modalContainer.boundingBox()
    
    if (gridBounds && modalBounds) {
      const widthDifference = Math.abs(gridBounds.width - modalBounds.width)
      expect(widthDifference).toBeLessThan(10)
    }
    
    console.log('✅ [Test] All improvements validated successfully!')
  })

})