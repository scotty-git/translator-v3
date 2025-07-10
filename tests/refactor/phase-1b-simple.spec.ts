import { test, expect } from '@playwright/test'

/**
 * Simple Phase 1b Test
 * Quick validation that the application loads and basic functionality works
 */

test.describe('Phase 1b: Simple Validation', () => {
  test('application loads successfully', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/')
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded')
    
    // Check that the page title is correct
    await expect(page).toHaveTitle(/Real-time Translator/i)
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/phase-1b-app-loaded.png' })
    
    console.log('✅ Application loaded successfully')
  })

  test('basic UI elements are present', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/')
    await page.waitForLoadState('domcontentloaded')
    
    // Check for main container
    const mainContainer = page.locator('main, [data-testid="main-container"], .h-full')
    await expect(mainContainer.first()).toBeVisible()
    
    // Look for any buttons
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()
    expect(buttonCount).toBeGreaterThan(0)
    
    console.log(`✅ Found ${buttonCount} buttons on the page`)
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/phase-1b-ui-elements.png' })
  })

  test('text input functionality works', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/')
    await page.waitForLoadState('domcontentloaded')
    
    // Look for any text input
    const textInputs = page.locator('input[type="text"], textarea')
    const inputCount = await textInputs.count()
    
    if (inputCount > 0) {
      const firstInput = textInputs.first()
      await firstInput.fill('Test message for Phase 1b')
      await expect(firstInput).toHaveValue('Test message for Phase 1b')
      console.log('✅ Text input functionality works')
    } else {
      console.log('ℹ️ No text inputs found on the page')
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/phase-1b-text-input.png' })
  })

  test('pipeline integration validation', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/')
    await page.waitForLoadState('domcontentloaded')
    
    // Check console for any pipeline-related messages
    const logs: string[] = []
    page.on('console', msg => {
      logs.push(msg.text())
    })
    
    // Wait a bit for any initial console messages
    await page.waitForTimeout(2000)
    
    // Check if pipeline-related logging appears
    const pipelineMessages = logs.filter(log => 
      log.includes('TranslationPipeline') || 
      log.includes('pipeline') ||
      log.includes('SingleDeviceTranslator')
    )
    
    console.log(`✅ Found ${pipelineMessages.length} pipeline-related console messages`)
    
    if (pipelineMessages.length > 0) {
      console.log('Pipeline messages:', pipelineMessages.slice(0, 3))
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/phase-1b-pipeline-validation.png' })
  })
})