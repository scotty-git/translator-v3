import { test, expect } from '@playwright/test'

test('Debug UI partner status display', async ({ browser }) => {
  console.log('🔍 Debugging UI partner status display...')
  
  // Create two browser contexts
  const context1 = await browser.newContext()
  const context2 = await browser.newContext()
  
  const page1 = await context1.newPage()
  const page2 = await context2.newPage()
  
  // HOST: Create session
  await page1.goto('http://127.0.0.1:5173/')
  await page1.click('text=Start Session')
  await page1.waitForSelector('text=Session:', { timeout: 10000 })
  
  // Get session code
  const sessionCodeElement = await page1.locator('text=Session:').locator('..').locator('span').nth(1)
  const sessionCode = await sessionCodeElement.textContent()
  console.log('📋 Session code:', sessionCode)
  
  // Wait for host setup
  await page1.waitForTimeout(3000)
  
  // Take screenshot of host before guest joins
  await page1.screenshot({ path: 'test-results/host-before-guest.png' })
  
  // Check what status text is showing on host
  const hostInitialText = await page1.textContent('body')
  console.log('🔍 [HOST] Initial status contains "Partner Online":', hostInitialText?.includes('Partner Online'))
  console.log('🔍 [HOST] Initial status contains "Waiting for partner":', hostInitialText?.includes('Waiting for partner'))
  
  // GUEST: Join session
  await page2.goto('http://127.0.0.1:5173/')
  await page2.click('text=Join Session')
  await page2.waitForSelector('input[placeholder="Enter 4-digit code"]', { timeout: 5000 })
  await page2.fill('input[placeholder="Enter 4-digit code"]', sessionCode)
  await page2.getByRole('button', { name: 'Join', exact: true }).click()
  
  // Wait for guest to join
  await page2.waitForTimeout(3000)
  
  // Take screenshots after guest joins
  await page1.screenshot({ path: 'test-results/host-after-guest.png' })
  await page2.screenshot({ path: 'test-results/guest-after-join.png' })
  
  // Check what status text is showing after guest joins
  const hostFinalText = await page1.textContent('body')
  const guestFinalText = await page2.textContent('body')
  
  console.log('🔍 [HOST] Final status contains "Partner Online":', hostFinalText?.includes('Partner Online'))
  console.log('🔍 [HOST] Final status contains "Waiting for partner":', hostFinalText?.includes('Waiting for partner'))
  console.log('🔍 [GUEST] Final status contains "Partner Online":', guestFinalText?.includes('Partner Online'))
  console.log('🔍 [GUEST] Final status contains "Waiting for partner":', guestFinalText?.includes('Waiting for partner'))
  
  // Look for specific UI elements that should show partner status
  const hostPartnerElements = await page1.locator('*').evaluateAll(elements => {
    return elements
      .filter(el => el.textContent?.toLowerCase().includes('partner') || el.textContent?.toLowerCase().includes('waiting'))
      .map(el => ({
        tag: el.tagName,
        text: el.textContent?.trim(),
        className: el.className
      }))
      .slice(0, 10) // Limit to first 10 matches
  })
  
  const guestPartnerElements = await page2.locator('*').evaluateAll(elements => {
    return elements
      .filter(el => el.textContent?.toLowerCase().includes('partner') || el.textContent?.toLowerCase().includes('waiting'))
      .map(el => ({
        tag: el.tagName,
        text: el.textContent?.trim(),
        className: el.className
      }))
      .slice(0, 10) // Limit to first 10 matches
  })
  
  console.log('🔍 [HOST] Partner-related UI elements:')
  hostPartnerElements.forEach((el, i) => {
    console.log(`   ${i + 1}. ${el.tag}: "${el.text}" (class: ${el.className})`)
  })
  
  console.log('🔍 [GUEST] Partner-related UI elements:')
  guestPartnerElements.forEach((el, i) => {
    console.log(`   ${i + 1}. ${el.tag}: "${el.text}" (class: ${el.className})`)
  })
  
  await context1.close()
  await context2.close()
})