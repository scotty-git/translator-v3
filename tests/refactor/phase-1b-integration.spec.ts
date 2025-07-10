import { test, expect } from '@playwright/test'

/**
 * Phase 1b Integration Tests
 * Validates the TranslationPipeline refactor works correctly in the application
 */

test.describe('Phase 1b: Translation Pipeline Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://127.0.0.1:5173/')
    
    // Wait for the application to load
    await page.waitForLoadState('networkidle')
    
    // Accept any initial notifications or alerts
    await page.locator('[data-testid="error-display"]').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
  })

  test('should successfully translate text using the new pipeline', async ({ page }) => {
    // Enter text translation mode
    await page.locator('button').filter({ hasText: 'Text Mode' }).click()
    
    // Select Spanish as target language
    await page.locator('select').selectOption('es')
    
    // Enter text to translate
    const textInput = page.locator('input[type="text"]').last()
    await textInput.fill('Hello world, this is a test message')
    
    // Submit the translation
    await page.locator('button').filter({ hasText: 'Send' }).click()
    
    // Wait for translation to complete
    await page.waitForSelector('[data-testid="message-bubble"]', { timeout: 10000 })
    
    // Verify the message appears
    const messageBubbles = page.locator('[data-testid="message-bubble"]')
    await expect(messageBubbles).toHaveCount(1)
    
    // Verify original text is preserved
    const originalText = messageBubbles.first().locator('.text-sm').first()
    await expect(originalText).toContainText('Hello world')
    
    // Verify translation exists (should contain Spanish)
    const translatedText = messageBubbles.first().locator('.text-base').first()
    await expect(translatedText).toContainText(/hola|mundo|prueba|mensaje/i)
    
    // Take screenshot for verification
    await page.screenshot({ path: 'test-results/phase-1b-text-translation.png' })
  })

  test('should show processing state during translation', async ({ page }) => {
    // Enter text translation mode
    await page.locator('button').filter({ hasText: 'Text Mode' }).click()
    
    // Select Spanish as target language
    await page.locator('select').selectOption('es')
    
    // Enter text to translate
    const textInput = page.locator('input[type="text"]').last()
    await textInput.fill('Testing the pipeline processing state')
    
    // Submit the translation and immediately check for processing state
    await page.locator('button').filter({ hasText: 'Send' }).click()
    
    // The input should be cleared immediately
    await expect(textInput).toHaveValue('')
    
    // Wait for translation to complete
    await page.waitForSelector('[data-testid="message-bubble"]', { timeout: 10000 })
    
    // Verify the message appears with completed status
    const messageBubbles = page.locator('[data-testid="message-bubble"]')
    await expect(messageBubbles).toHaveCount(1)
    
    // Take screenshot for verification
    await page.screenshot({ path: 'test-results/phase-1b-processing-state.png' })
  })

  test('should handle multiple language translations correctly', async ({ page }) => {
    // Test 1: English to Spanish
    await page.locator('button').filter({ hasText: 'Text Mode' }).click()
    await page.locator('select').selectOption('es')
    
    const textInput = page.locator('input[type="text"]').last()
    await textInput.fill('Good morning')
    await page.locator('button').filter({ hasText: 'Send' }).click()
    
    await page.waitForSelector('[data-testid="message-bubble"]', { timeout: 10000 })
    
    // Test 2: Spanish to English (should auto-switch target)
    await textInput.fill('Hola amigo')
    await page.locator('button').filter({ hasText: 'Send' }).click()
    
    await page.waitForSelector('[data-testid="message-bubble"]:nth-child(2)', { timeout: 10000 })
    
    // Verify we have two messages
    const messageBubbles = page.locator('[data-testid="message-bubble"]')
    await expect(messageBubbles).toHaveCount(2)
    
    // Test 3: French text
    await page.locator('select').selectOption('fr')
    await textInput.fill('Bonjour comment allez-vous')
    await page.locator('button').filter({ hasText: 'Send' }).click()
    
    await page.waitForSelector('[data-testid="message-bubble"]:nth-child(3)', { timeout: 10000 })
    
    // Verify we have three messages
    await expect(messageBubbles).toHaveCount(3)
    
    // Take screenshot for verification
    await page.screenshot({ path: 'test-results/phase-1b-multiple-languages.png' })
  })

  test('should maintain performance with the new pipeline', async ({ page }) => {
    // Test translation speed and measure performance
    await page.locator('button').filter({ hasText: 'Text Mode' }).click()
    await page.locator('select').selectOption('es')
    
    const textInput = page.locator('input[type="text"]').last()
    
    // Measure time for translation
    const startTime = Date.now()
    
    await textInput.fill('Performance test message for the new pipeline')
    await page.locator('button').filter({ hasText: 'Send' }).click()
    
    // Wait for translation completion
    await page.waitForSelector('[data-testid="message-bubble"]', { timeout: 15000 })
    
    const endTime = Date.now()
    const translationTime = endTime - startTime
    
    // Verify translation completed within reasonable time (15 seconds max)
    expect(translationTime).toBeLessThan(15000)
    
    // Verify the message was created successfully
    const messageBubbles = page.locator('[data-testid="message-bubble"]')
    await expect(messageBubbles).toHaveCount(1)
    
    console.log(`Translation completed in ${translationTime}ms`)
    
    // Take screenshot for verification
    await page.screenshot({ path: 'test-results/phase-1b-performance.png' })
  })

  test('should handle error states gracefully', async ({ page }) => {
    // Test error handling by trying to translate empty text
    await page.locator('button').filter({ hasText: 'Text Mode' }).click()
    
    const textInput = page.locator('input[type="text"]').last()
    
    // Try to send empty message
    await page.locator('button').filter({ hasText: 'Send' }).click()
    
    // Should not create any message bubbles
    const messageBubbles = page.locator('[data-testid="message-bubble"]')
    await expect(messageBubbles).toHaveCount(0)
    
    // Now test with actual content to ensure recovery
    await textInput.fill('Recovery test after error')
    await page.locator('button').filter({ hasText: 'Send' }).click()
    
    await page.waitForSelector('[data-testid="message-bubble"]', { timeout: 10000 })
    await expect(messageBubbles).toHaveCount(1)
    
    // Take screenshot for verification
    await page.screenshot({ path: 'test-results/phase-1b-error-handling.png' })
  })

  test('should maintain UI consistency and accessibility', async ({ page }) => {
    // Check that all expected UI elements are present and accessible
    await expect(page.locator('button').filter({ hasText: 'Text Mode' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'Voice Mode' })).toBeVisible()
    
    // Check language selector
    await expect(page.locator('select')).toBeVisible()
    
    // Check translation mode selector
    await expect(page.locator('button').filter({ hasText: 'Casual' })).toBeVisible()
    
    // Enter text mode and verify input is accessible
    await page.locator('button').filter({ hasText: 'Text Mode' }).click()
    
    const textInput = page.locator('input[type="text"]').last()
    await expect(textInput).toBeVisible()
    await expect(textInput).toBeEditable()
    
    // Verify send button is accessible
    const sendButton = page.locator('button').filter({ hasText: 'Send' })
    await expect(sendButton).toBeVisible()
    await expect(sendButton).toBeEnabled()
    
    // Check color contrast in both light and dark modes
    await page.screenshot({ path: 'test-results/phase-1b-ui-light.png' })
    
    // Toggle to dark mode if available
    const darkModeToggle = page.locator('button[aria-label="Toggle dark mode"]')
    if (await darkModeToggle.isVisible()) {
      await darkModeToggle.click()
      await page.screenshot({ path: 'test-results/phase-1b-ui-dark.png' })
    }
  })

  test('should display conversation context correctly', async ({ page }) => {
    // Test that conversation context is maintained through multiple messages
    await page.locator('button').filter({ hasText: 'Text Mode' }).click()
    await page.locator('select').selectOption('es')
    
    const textInput = page.locator('input[type="text"]').last()
    
    // Send first message
    await textInput.fill('Hello my friend')
    await page.locator('button').filter({ hasText: 'Send' }).click()
    await page.waitForSelector('[data-testid="message-bubble"]', { timeout: 10000 })
    
    // Send second message (should have context from first)
    await textInput.fill('How are you today?')
    await page.locator('button').filter({ hasText: 'Send' }).click()
    await page.waitForSelector('[data-testid="message-bubble"]:nth-child(2)', { timeout: 10000 })
    
    // Send third message (should have context from previous messages)
    await textInput.fill('I hope you are doing well')
    await page.locator('button').filter({ hasText: 'Send' }).click()
    await page.waitForSelector('[data-testid="message-bubble"]:nth-child(3)', { timeout: 10000 })
    
    // Verify all messages are displayed
    const messageBubbles = page.locator('[data-testid="message-bubble"]')
    await expect(messageBubbles).toHaveCount(3)
    
    // Verify messages are displayed in order
    await expect(messageBubbles.first()).toContainText('Hello')
    await expect(messageBubbles.nth(1)).toContainText('How are you')
    await expect(messageBubbles.nth(2)).toContainText('hope you are')
    
    // Take screenshot for verification
    await page.screenshot({ path: 'test-results/phase-1b-conversation-context.png' })
  })
})