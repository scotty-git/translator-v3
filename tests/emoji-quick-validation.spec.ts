import { test, expect, chromium } from '@playwright/test'

/**
 * QUICK EMOJI VALIDATION - Check current state
 * 
 * First, let's see what's actually on the production page
 * and validate our emoji fixes step by step.
 */
test('emoji quick validation - check production state', async ({ page }) => {
  const browser = await chromium.launch({ headless: true })
  
  console.log('🧪 Checking production app state...')
  
  // Navigate to production URL
  await page.goto('https://translator-v3.vercel.app')
  console.log('✅ Loaded production app')
  
  // Take a screenshot to see what's actually there
  await page.screenshot({ 
    path: 'test-results/production-homepage-state.png',
    fullPage: true
  })
  console.log('📸 Screenshot taken: production-homepage-state.png')
  
  // Check for different possible button texts
  const buttons = await page.locator('button').all()
  console.log('🔍 Available buttons on page:')
  for (let i = 0; i < buttons.length; i++) {
    const text = await buttons[i].textContent()
    console.log(`  - Button ${i}: "${text}"`)
  }
  
  // Look for Create or Host session buttons
  const createSelectors = [
    'button:has-text("Create")',
    'button:has-text("Host")', 
    'button:has-text("New Session")',
    'button:has-text("Start")',
    'button[data-testid="create-session"]',
    'button[data-testid="host-session"]'
  ]
  
  let createButton = null
  for (const selector of createSelectors) {
    try {
      const btn = page.locator(selector).first()
      if (await btn.isVisible()) {
        createButton = btn
        console.log(`✅ Found create button with selector: ${selector}`)
        break
      }
    } catch (e) {
      // Continue searching
    }
  }
  
  if (!createButton) {
    console.log('❌ No create session button found')
    console.log('🔍 All page content:')
    const content = await page.textContent('body')
    console.log(content)
    return
  }
  
  // Click the create button
  await createButton.click()
  console.log('✅ Clicked create session button')
  
  // Wait for session creation
  await page.waitForTimeout(3000)
  
  // Take another screenshot
  await page.screenshot({ 
    path: 'test-results/session-created-state.png',
    fullPage: true
  })
  console.log('📸 Screenshot taken: session-created-state.png')
  
  // Look for session code
  const codeSelectors = [
    'text=Session Code:',
    'text=Code:',
    'text=Room:',
    '[data-testid="session-code"]'
  ]
  
  let sessionCode = null
  for (const selector of codeSelectors) {
    try {
      const element = page.locator(selector)
      if (await element.isVisible()) {
        const text = await element.textContent()
        console.log(`✅ Found session info: ${text}`)
        sessionCode = text?.match(/\d{4}/)?.[0]
        break
      }
    } catch (e) {
      // Continue searching
    }
  }
  
  if (!sessionCode) {
    console.log('🔍 Page content after clicking create:')
    const content = await page.textContent('body')
    console.log(content)
  } else {
    console.log(`✅ Session code found: ${sessionCode}`)
  }
  
  await browser.close()
})