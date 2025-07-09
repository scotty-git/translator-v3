import { test, expect } from '@playwright/test'

test.describe('Session Foundation - Simple Test', () => {
  test('should load home page', async ({ page }) => {
    console.log('Navigating to home page...')
    await page.goto('http://127.0.0.1:5173/', { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    })
    
    console.log('Waiting for Start Translating button...')
    const startButton = page.getByText('Start Translating')
    await expect(startButton).toBeVisible({ timeout: 10000 })
    
    console.log('Taking screenshot...')
    await page.screenshot({ 
      path: 'test-results/phase1-simple-test.png',
      fullPage: true 
    })
    
    console.log('Test completed!')
  })
})