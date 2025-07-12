import { test, expect } from '@playwright/test'

test.describe('Phase 2: Basic App Load Test', () => {
  test('app loads successfully on production', async ({ page }) => {
    // Navigate to production
    await page.goto('https://translator-v3.vercel.app')
    
    // Wait for app to load
    await page.waitForLoadState('networkidle')
    
    // Take screenshot for verification
    await page.screenshot({ path: 'test-results/phase2-app-load.png' })
    
    // Check basic elements exist
    const title = await page.title()
    expect(title).toContain('Translator')
    
    // Check if we can find basic UI elements (without specific data-test attributes)
    const bodyContent = await page.locator('body').textContent()
    expect(bodyContent).toContain('Translator')
    
    console.log('✅ App loaded successfully')
    console.log('📸 Screenshot saved to test-results/phase2-app-load.png')
  })
})