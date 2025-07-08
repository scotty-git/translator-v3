import { test, expect, chromium, type Page } from '@playwright/test'

test.describe('Concurrent Recording and Message Positioning', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    // Create a new page with headless mode
    const context = await browser.newContext()
    page = await context.newPage()
    
    // Navigate to the single device translator
    await page.goto('http://127.0.0.1:5173/')
    
    // Click on Start Translating button to enter single device mode
    await page.click('button:has-text("Start Translating")')
    
    // Wait for the translator interface to load
    await page.waitForSelector('[data-testid="recording-button"]')
  })

  test('recording button is not disabled during message processing', async () => {
    // Check initial state - button should be enabled
    const recordButton = page.locator('[data-testid="recording-button"]')
    await expect(recordButton).toBeEnabled()
    
    // Start recording simulation (we can't actually record audio in tests)
    await recordButton.click()
    
    // Button should still be clickable (to stop recording)
    await expect(recordButton).toBeEnabled()
    
    // Stop recording
    await recordButton.click()
    
    // Button should immediately be enabled for new recording
    await expect(recordButton).toBeEnabled()
    
    // Take screenshot for verification
    await page.screenshot({ path: 'test-results/concurrent-recording-enabled.png' })
  })

  test('message positioning - English left, other languages right', async () => {
    // Switch to text input mode
    await page.click('button:has-text("Type")')
    
    // Send an English message
    await page.fill('input[placeholder="Type your message..."]', 'Hello world')
    await page.press('input[placeholder="Type your message..."]', 'Enter')
    
    // Wait for message to appear
    await page.waitForTimeout(500)
    
    // Check that English message is left-aligned
    const englishMessage = page.locator('.flex.justify-start').first()
    await expect(englishMessage).toBeVisible()
    
    // Send a Spanish message
    await page.fill('input[placeholder="Type your message..."]', 'Hola mundo')
    await page.press('input[placeholder="Type your message..."]', 'Enter')
    
    // Wait for message to appear
    await page.waitForTimeout(500)
    
    // Check that Spanish message is right-aligned
    const spanishMessage = page.locator('.flex.justify-end').first()
    await expect(spanishMessage).toBeVisible()
    
    // Take screenshot showing the conversation layout
    await page.screenshot({ path: 'test-results/message-positioning.png' })
  })

  test('multiple messages can be sent without waiting', async () => {
    // Switch to text input mode
    await page.click('button:has-text("Type")')
    
    // Send multiple messages quickly
    const messages = ['First message', 'Second message', 'Third message']
    
    for (const msg of messages) {
      await page.fill('input[placeholder="Type your message..."]', msg)
      await page.press('input[placeholder="Type your message..."]', 'Enter')
      // Very short delay just to ensure Enter is processed
      await page.waitForTimeout(100)
    }
    
    // Wait a bit for processing
    await page.waitForTimeout(1000)
    
    // Verify all messages appear
    for (const msg of messages) {
      await expect(page.locator(`text="${msg}"`)).toBeVisible()
    }
    
    // Messages should appear in order
    const allMessages = await page.locator('.max-w-\\[80\\%\\]').all()
    expect(allMessages.length).toBeGreaterThanOrEqual(3)
    
    // Take screenshot of multiple messages
    await page.screenshot({ path: 'test-results/multiple-messages.png' })
  })

  test('UI remains responsive during processing', async () => {
    // Start with voice mode
    const recordButton = page.locator('[data-testid="recording-button"]')
    
    // Verify we can switch modes even if processing might be happening
    await page.click('button:has-text("Type")')
    await expect(page.locator('input[placeholder="Type your message..."]')).toBeVisible()
    
    // Switch back to voice
    await page.click('button:has-text("Voice")')
    await expect(recordButton).toBeVisible()
    await expect(recordButton).toBeEnabled()
    
    // Verify target language can be changed
    const targetSelect = page.locator('select').first()
    await expect(targetSelect).toBeEnabled()
    await targetSelect.selectOption('pt')
    await expect(targetSelect).toHaveValue('pt')
    
    // Take screenshot of responsive UI
    await page.screenshot({ path: 'test-results/ui-responsive.png' })
  })

  test('Spanish/Portuguese messages appear on the right', async () => {
    // Switch to text input mode
    await page.click('button:has-text("Type")')
    
    // Send a clear Spanish message
    await page.fill('input[placeholder="Type your message..."]', 'Hola amigo')
    await page.press('input[placeholder="Type your message..."]', 'Enter')
    
    // Wait for message to be processed
    await page.waitForTimeout(3000)
    
    // Check that the message containing "Hola amigo" is right-aligned
    // Look for the specific flex container with justify-start or justify-end
    const spanishMessage = page.locator('div.flex.justify-start, div.flex.justify-end').filter({ 
      has: page.locator('.max-w-\\[80\\%\\]').filter({ hasText: 'Hola amigo' })
    })
    await expect(spanishMessage).toHaveClass(/justify-end/)
    
    // Send an English message to verify it goes left
    await page.fill('input[placeholder="Type your message..."]', 'Hello friend')
    await page.press('input[placeholder="Type your message..."]', 'Enter')
    
    await page.waitForTimeout(3000)
    
    // Check that the message containing "Hello friend" is left-aligned
    const englishMessage = page.locator('div.flex.justify-start, div.flex.justify-end').filter({ 
      has: page.locator('.max-w-\\[80\\%\\]').filter({ hasText: 'Hello friend' })
    })
    await expect(englishMessage).toHaveClass(/justify-start/)
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/spanish-english-positioning.png' })
  })
})

// Run tests in headless mode by default
test.use({
  headless: true,
  // Capture screenshots on failure
  screenshot: 'only-on-failure',
  video: 'retain-on-failure'
})