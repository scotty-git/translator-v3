import { test, expect } from '@playwright/test'

test.describe('Dark Mode Test', () => {
  test('Dark mode functionality on home page', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/')
    
    // Wait for page to load
    await page.waitForSelector('text=Real-time Translator', { timeout: 10000 })
    
    // Check if there's a dark mode toggle - look for sun/moon icons
    const darkModeToggle = page.locator('button[title="Dark"], button[title="Light"], svg.lucide-sun, svg.lucide-moon')
    const toggleExists = await darkModeToggle.count() > 0
    
    console.log(`Dark mode toggle found: ${toggleExists}`)
    
    if (toggleExists) {
      // Test dark mode toggle
      await darkModeToggle.first().click()
      await page.waitForTimeout(500)
      
      // Check if dark mode classes are applied
      const bodyClasses = await page.locator('body').getAttribute('class')
      const htmlClasses = await page.locator('html').getAttribute('class')
      
      console.log('Body classes:', bodyClasses)
      console.log('HTML classes:', htmlClasses)
      
      const hasDarkMode = (bodyClasses && bodyClasses.includes('dark')) || 
                         (htmlClasses && htmlClasses.includes('dark'))
      
      console.log(`Dark mode active: ${hasDarkMode}`)
    } else {
      console.log('❌ No dark mode toggle found on home page')
    }
    
    // Check for CSS loading issues
    const computedStyle = await page.evaluate(() => {
      const body = document.body
      return {
        backgroundColor: window.getComputedStyle(body).backgroundColor,
        color: window.getComputedStyle(body).color,
        fontFamily: window.getComputedStyle(body).fontFamily
      }
    })
    
    console.log('Computed styles:', computedStyle)
    
    // Check if UnoCSS is loaded
    const stylesheets = await page.evaluate(() => {
      return Array.from(document.styleSheets).map(sheet => {
        try {
          return {
            href: sheet.href,
            rules: sheet.cssRules ? sheet.cssRules.length : 0
          }
        } catch (e) {
          return { href: sheet.href, rules: 'blocked' }
        }
      })
    })
    
    console.log('Stylesheets loaded:', stylesheets)
  })
})