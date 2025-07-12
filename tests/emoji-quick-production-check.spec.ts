import { test, expect, chromium } from '@playwright/test'

/**
 * Quick check to see what's on the new production deployment
 */
test('quick production deployment check', async ({ page }) => {
  const browser = await chromium.launch({ headless: true })
  
  console.log('🔍 Checking new production deployment...')
  
  // Try the new deployment URL first
  try {
    await page.goto('https://translator-v3-5381mwsu1-scotty-gits-projects.vercel.app')
    console.log('✅ New deployment URL loaded')
  } catch (e) {
    console.log('❌ New deployment URL failed, trying main URL...')
    await page.goto('https://translator-v3.vercel.app')
    console.log('✅ Main production URL loaded')
  }
  
  // Take screenshot to see what's there
  await page.screenshot({ 
    path: 'test-results/current-production-state.png',
    fullPage: true
  })
  console.log('📸 Screenshot: current-production-state.png')
  
  // Check what buttons are available
  const buttons = await page.locator('button').all()
  console.log('🔍 Available buttons:')
  for (let i = 0; i < buttons.length; i++) {
    const text = await buttons[i].textContent()
    console.log(`  - Button ${i}: "${text}"`)
  }
  
  // Check page content
  const content = await page.textContent('body')
  console.log('📄 Page content includes:', content?.substring(0, 200) + '...')
  
  await browser.close()
})