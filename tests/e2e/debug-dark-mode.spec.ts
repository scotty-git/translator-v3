import { test, expect } from '@playwright/test'

test('Debug dark mode classes', async ({ page }) => {
  await page.goto('http://127.0.0.1:5174')
  await page.getByRole('button', { name: /create.*session/i }).click()
  await page.waitForURL(/\/session\/\d{4}/)
  
  const sessionCode = page.url().match(/\/session\/(\d{4})/)?.[1] || ''
  
  // Check initial state
  const htmlClass1 = await page.locator('html').getAttribute('class')
  console.log('HTML class before dark mode:', htmlClass1)
  
  // Toggle dark mode
  const themeToggle = page.locator('button[aria-label*="theme" i]').or(
    page.locator('button:has(svg[class*="sun"]),button:has(svg[class*="moon"])')
  ).first()
  await themeToggle.click()
  await page.waitForTimeout(500)
  
  // Check after toggle
  const htmlClass2 = await page.locator('html').getAttribute('class')
  console.log('HTML class after dark mode:', htmlClass2)
  
  // Check session code element
  const sessionCodeElement = page.locator(`text="${sessionCode}"`).first()
  const classes = await sessionCodeElement.getAttribute('class')
  const computedStyle = await sessionCodeElement.evaluate(el => {
    const styles = window.getComputedStyle(el)
    return {
      color: styles.color,
      backgroundColor: styles.backgroundColor,
      parentBg: window.getComputedStyle(el.parentElement!).backgroundColor
    }
  })
  
  console.log('Session code element classes:', classes)
  console.log('Computed styles:', computedStyle)
  
  // Check if dark class is properly applied
  const hasDarkClass = await page.locator('html.dark').count()
  console.log('Has dark class on HTML:', hasDarkClass > 0)
})