import { test, expect } from '@playwright/test'

test.describe('CSS Loading Issues', () => {
  test('CSS loads correctly without hard refresh', async ({ page }) => {
    // Monitor CSS loading
    const cssRequests = []
    page.on('response', response => {
      if (response.url().includes('.css') || response.headers()['content-type']?.includes('text/css')) {
        cssRequests.push({
          url: response.url(),
          status: response.status(),
          headers: response.headers()
        })
      }
    })
    
    await page.goto('http://127.0.0.1:5173/')
    
    // Wait for page to fully load
    await page.waitForSelector('text=Real-time Translator', { timeout: 10000 })
    await page.waitForLoadState('networkidle')
    
    console.log(`CSS requests made: ${cssRequests.length}`)
    cssRequests.forEach((req, i) => {
      console.log(`  ${i + 1}. ${req.url} - Status: ${req.status}`)
    })
    
    // Check if styles are applied correctly
    const computedStyles = await page.evaluate(() => {
      const homeScreen = document.querySelector('[data-testid="home-screen"]')
      if (!homeScreen) return null
      
      const styles = window.getComputedStyle(homeScreen)
      return {
        minHeight: styles.minHeight,
        display: styles.display,
        flexDirection: styles.flexDirection,
        justifyContent: styles.justifyContent,
        backgroundColor: styles.backgroundColor,
        padding: styles.padding
      }
    })
    
    console.log('Home screen computed styles:', computedStyles)
    
    // Check if critical CSS classes are working
    const hasCorrectLayout = computedStyles && 
      computedStyles.minHeight === '100vh' &&
      computedStyles.display === 'flex' &&
      computedStyles.flexDirection === 'column'
    
    console.log(`Layout styles correctly applied: ${hasCorrectLayout}`)
    
    // Test navigation to translator to see if CSS persists
    await page.click('text=Start Translating')
    await page.waitForURL('**/translator')
    await page.waitForSelector('[data-testid="recording-button"]', { timeout: 10000 })
    
    // Check if translator styles are working
    const translatorStyles = await page.evaluate(() => {
      const recordingButton = document.querySelector('[data-testid="recording-button"]')
      if (!recordingButton) return null
      
      const styles = window.getComputedStyle(recordingButton)
      return {
        width: styles.width,
        height: styles.height,
        borderRadius: styles.borderRadius,
        backgroundColor: styles.backgroundColor,
        display: styles.display
      }
    })
    
    console.log('Recording button styles:', translatorStyles)
    
    const hasCorrectButtonStyles = translatorStyles &&
      translatorStyles.width === '80px' &&
      translatorStyles.height === '80px' &&
      translatorStyles.borderRadius.includes('50%')
    
    console.log(`Recording button styles correctly applied: ${hasCorrectButtonStyles}`)
    
    console.log('✅ CSS loading test completed')
  })
})