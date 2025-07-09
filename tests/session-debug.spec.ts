import { test, expect } from '@playwright/test'

test.describe('Session Debug', () => {
  test('debug home page', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()))
    page.on('pageerror', error => console.log('PAGE ERROR:', error))
    
    console.log('1. Navigating to page...')
    await page.goto('http://127.0.0.1:5173/')
    
    console.log('2. Waiting for page to load...')
    await page.waitForTimeout(3000)
    
    console.log('3. Getting page content...')
    const bodyText = await page.textContent('body')
    console.log('Body text:', bodyText?.substring(0, 200))
    
    console.log('4. Looking for buttons...')
    const buttons = await page.locator('button').all()
    console.log('Found buttons:', buttons.length)
    
    for (let i = 0; i < buttons.length; i++) {
      const text = await buttons[i].textContent()
      console.log(`Button ${i}:`, text)
    }
    
    console.log('5. Taking screenshot...')
    await page.screenshot({ 
      path: 'test-results/debug-home-page.png',
      fullPage: true 
    })
    
    console.log('Test complete!')
  })
})