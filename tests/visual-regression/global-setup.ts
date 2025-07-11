import { chromium, FullConfig } from '@playwright/test'

/**
 * Global setup for visual regression testing
 * 
 * This runs before all tests and ensures:
 * 1. The application is in a clean state
 * 2. No cached data affects screenshots
 * 3. All services are ready
 */

async function globalSetup(config: FullConfig) {
  console.log('🔧 Visual Regression Setup: Initializing test environment...')
  
  const browser = await chromium.launch()
  const page = await browser.newPage()
  
  try {
    // Navigate to the app to ensure it's running
    await page.goto('http://127.0.0.1:5173')
    
    // Clear any existing data
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    
    // Wait for app to fully load
    await page.waitForLoadState('networkidle')
    
    // Ensure we're on the home page
    await page.waitForSelector('text=Start Translating')
    await page.waitForSelector('text=Start Session')
    
    console.log('✅ Visual Regression Setup: Application is ready for testing')
    
  } catch (error) {
    console.error('❌ Visual Regression Setup: Failed to initialize application:', error)
    throw error
  } finally {
    await browser.close()
  }
}

export default globalSetup