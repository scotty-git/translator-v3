import { test, expect } from '@playwright/test'

/**
 * Check what's actually on the deployed page
 */

const VERCEL_URL = 'https://translator-v3-i3ugop7qv-scotty-gits-projects.vercel.app'

test.describe('Check Deployed Page', () => {
  
  test('See what is actually loaded', async ({ page }) => {
    console.log('🔍 Checking what is actually on the deployed page...')
    
    // Navigate to app
    await page.goto(VERCEL_URL)
    await page.waitForLoadState('networkidle')
    
    // Wait a bit for any dynamic content
    await page.waitForTimeout(2000)
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/actual-deployed-page.png', fullPage: true })
    
    // Get page title
    const title = await page.title()
    console.log('Page title:', title)
    
    // Get current URL
    const url = page.url()
    console.log('Current URL:', url)
    
    // Check if page has any content
    const bodyText = await page.locator('body').textContent()
    console.log('Page has content:', bodyText && bodyText.length > 0)
    console.log('Content length:', bodyText?.length || 0)
    
    // Look for any buttons
    const allButtons = await page.locator('button').all()
    console.log(`Found ${allButtons.length} buttons`)
    
    for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
      const text = await allButtons[i].textContent()
      const isVisible = await allButtons[i].isVisible()
      console.log(`Button ${i}: "${text}" (visible: ${isVisible})`)
    }
    
    // Look for any text content
    const headings = await page.locator('h1, h2, h3').all()
    console.log(`Found ${headings.length} headings`)
    
    for (let i = 0; i < headings.length; i++) {
      const text = await headings[i].textContent()
      console.log(`Heading ${i}: "${text}"`)
    }
    
    // Check for specific text
    const hasSession = bodyText?.toLowerCase().includes('session')
    const hasTranslator = bodyText?.toLowerCase().includes('translator')
    const hasStart = bodyText?.toLowerCase().includes('start')
    
    console.log('Contains "session":', hasSession)
    console.log('Contains "translator":', hasTranslator)
    console.log('Contains "start":', hasStart)
    
    // Log first 500 characters of content
    if (bodyText) {
      console.log('First 500 chars:', bodyText.substring(0, 500))
    }
    
    // Check HTML structure
    const html = await page.content()
    console.log('Page contains React root:', html.includes('root'))
    console.log('Page contains app div:', html.includes('app'))
    
    // Look for any error messages
    const errorElements = await page.locator('.error, .alert, [role="alert"]').all()
    if (errorElements.length > 0) {
      console.log(`Found ${errorElements.length} error elements`)
      for (let i = 0; i < errorElements.length; i++) {
        const text = await errorElements[i].textContent()
        console.log(`Error ${i}: "${text}"`)
      }
    }
  })
})