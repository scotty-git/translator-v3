import { test, expect } from '@playwright/test'

test('Debug props flow from MessageSyncService to UI', async ({ browser }) => {
  console.log('🔍 Debugging complete props flow...')
  
  // Create two browser contexts
  const context1 = await browser.newContext()
  const context2 = await browser.newContext()
  
  const page1 = await context1.newPage()
  const page2 = await context2.newPage()
  
  // Add console listeners to catch debug logs
  page1.on('console', msg => {
    if (msg.text().includes('Partner presence changed') || msg.text().includes('sessionInfo') || 
        msg.text().includes('CALLBACK') || msg.text().includes('Event handlers')) {
      console.log('🔍 [HOST CONSOLE]:', msg.text())
    }
  })
  
  page2.on('console', msg => {
    if (msg.text().includes('Partner presence changed') || msg.text().includes('sessionInfo') || 
        msg.text().includes('CALLBACK') || msg.text().includes('Event handlers')) {
      console.log('🔍 [GUEST CONSOLE]:', msg.text())
    }
  })
  
  // HOST: Create session
  await page1.goto('http://127.0.0.1:5173/')
  await page1.click('text=Start Session')
  await page1.waitForSelector('text=Session:', { timeout: 10000 })
  
  // Get session code
  const sessionCodeElement = await page1.locator('text=Session:').locator('..').locator('span').nth(1)
  const sessionCode = await sessionCodeElement.textContent()
  console.log('📋 Session code:', sessionCode)
  
  // Add temporary logging to check sessionInfo prop
  await page1.evaluate(() => {
    // Override console.log to capture sessionInfo updates
    const originalLog = console.log
    console.log = (...args) => {
      const message = args.join(' ')
      if (message.includes('sessionInfo') || message.includes('partnerOnline')) {
        originalLog('🎯 [HOST] SessionInfo update:', ...args)
      }
      return originalLog(...args)
    }
  })
  
  // Wait for host setup
  await page1.waitForTimeout(3000)
  
  // GUEST: Join session
  await page2.goto('http://127.0.0.1:5173/')
  await page2.click('text=Join Session')
  await page2.waitForSelector('input[placeholder="Enter 4-digit code"]', { timeout: 5000 })
  await page2.fill('input[placeholder="Enter 4-digit code"]', sessionCode)
  await page2.getByRole('button', { name: 'Join', exact: true }).click()
  
  // Wait for guest to join and participant events to fire
  await page2.waitForTimeout(5000)
  
  // Check React state by evaluating the component tree
  const hostPartnerOnlineState = await page1.evaluate(() => {
    // Try to find React components in the DOM
    const elements = document.querySelectorAll('*')
    for (const element of elements) {
      const reactKeys = Object.keys(element).filter(key => key.startsWith('__reactInternalInstance') || key.startsWith('_reactInternalInstance'))
      if (reactKeys.length > 0) {
        const reactInstance = (element as any)[reactKeys[0]]
        // Try to traverse the React fiber tree to find SessionTranslator
        let current = reactInstance
        while (current) {
          if (current.type && current.type.name === 'SessionTranslator') {
            return {
              partnerOnline: current.memoizedState?.[1], // Second state (partnerOnline)
              sessionInfo: current.memoizedProps?.sessionInfo
            }
          }
          current = current.child || current.sibling || current.return
        }
      }
    }
    return null
  })
  
  console.log('🔍 [HOST] React state analysis:', hostPartnerOnlineState)
  
  // Check if the DOM elements actually contain the expected text
  const hostBodyText = await page1.textContent('body')
  const guestBodyText = await page2.textContent('body')
  
  console.log('🔍 [HOST] Body contains "Partner Online":', hostBodyText?.includes('Partner Online'))
  console.log('🔍 [HOST] Body contains "Waiting for partner":', hostBodyText?.includes('Waiting for partner'))
  console.log('🔍 [GUEST] Body contains "Partner Online":', guestBodyText?.includes('Partner Online'))
  console.log('🔍 [GUEST] Body contains "Waiting for partner":', guestBodyText?.includes('Waiting for partner'))
  
  // Look for the specific partner status elements
  const hostPartnerElements = await page1.locator('span').evaluateAll(spans => {
    return spans
      .filter(span => span.textContent && (span.textContent.includes('Partner Online') || span.textContent.includes('Waiting for partner')))
      .map(span => ({
        text: span.textContent,
        className: span.className,
        style: span.style.cssText
      }))
  })
  
  console.log('🔍 [HOST] Partner status elements:', hostPartnerElements)
  
  await context1.close()
  await context2.close()
})