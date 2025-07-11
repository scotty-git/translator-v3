import { test, expect } from '@playwright/test'

const PRODUCTION_URL = 'https://translator-v3.vercel.app'

test.describe('HomeScreen Baseline Screenshots', () => {
  test('Light mode baseline', async ({ page }) => {
    console.log('📸 Taking light mode baseline screenshot...')
    
    await page.goto(PRODUCTION_URL)
    await page.waitForLoadState('networkidle')
    
    // Ensure light mode
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark')
    })
    
    await page.waitForTimeout(1000)
    
    // Take full page screenshot
    await page.screenshot({ 
      path: 'test-results/homescreen-light-baseline.png',
      fullPage: true
    })
    
    console.log('✅ Light mode baseline captured')
  })

  test('Dark mode baseline', async ({ page }) => {
    console.log('📸 Taking dark mode baseline screenshot...')
    
    await page.goto(PRODUCTION_URL)
    await page.waitForLoadState('networkidle')
    
    // Enable dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
    
    await page.waitForTimeout(1000)
    
    // Take full page screenshot
    await page.screenshot({ 
      path: 'test-results/homescreen-dark-baseline.png',
      fullPage: true
    })
    
    console.log('✅ Dark mode baseline captured')
  })

  test('Join modal baseline', async ({ page }) => {
    console.log('📸 Taking join modal baseline screenshot...')
    
    await page.goto(PRODUCTION_URL)
    await page.waitForLoadState('networkidle')
    
    // Click Join Session
    await page.click('button:has-text("Join Session")')
    await page.waitForTimeout(1000)
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/join-modal-light-baseline.png',
      fullPage: true
    })
    
    // Switch to dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
    
    await page.waitForTimeout(1000)
    
    // Take dark mode screenshot
    await page.screenshot({ 
      path: 'test-results/join-modal-dark-baseline.png',
      fullPage: true
    })
    
    console.log('✅ Join modal baseline captured')
  })

  test('Document button contrast issue', async ({ page }) => {
    console.log('🔍 Documenting button contrast issues...')
    
    await page.goto(PRODUCTION_URL)
    await page.waitForLoadState('networkidle')
    
    // Switch to dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
    
    await page.waitForTimeout(1000)
    
    // Get button styles
    const buttonStyles = await page.evaluate(() => {
      const startButton = document.querySelector('button:has-text("Start Session")')
      const joinButton = document.querySelector('button:has-text("Join Session")')
      
      if (startButton && joinButton) {
        const startStyles = window.getComputedStyle(startButton)
        const joinStyles = window.getComputedStyle(joinButton)
        
        return {
          startButton: {
            backgroundColor: startStyles.backgroundColor,
            color: startStyles.color,
            borderColor: startStyles.borderColor,
          },
          joinButton: {
            backgroundColor: joinStyles.backgroundColor,
            color: joinStyles.color,
            borderColor: joinStyles.borderColor,
          }
        }
      }
      return null
    })
    
    console.log('📊 Button styles in dark mode:', buttonStyles)
    
    // Take screenshot for documentation
    await page.screenshot({ 
      path: 'test-results/button-contrast-dark-issue.png',
      fullPage: true
    })
    
    console.log('✅ Button contrast issue documented')
  })
})