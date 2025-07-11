import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const PRODUCTION_URL = 'https://translator-v3.vercel.app'

test.describe('Screenshot Debug Analysis', () => {
  
  test('Capture screenshots and raw axe output', async ({ page }) => {
    console.log('🔍 Starting screenshot debug analysis...')
    
    // 1. Default homepage state
    await page.goto(PRODUCTION_URL)
    await page.waitForLoadState('networkidle')
    
    // Take screenshot of default state
    await page.screenshot({ 
      path: 'test-results/screenshot-1-default.png',
      fullPage: true
    })
    console.log('📸 Screenshot 1: Default state saved')
    
    // Run axe-core on default state
    const defaultResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    
    console.log('\\n🔍 RAW AXE-CORE OUTPUT - DEFAULT STATE:')
    console.log('=====================================')
    console.log('Violations found:', defaultResults.violations.length)
    
    defaultResults.violations.forEach((violation, index) => {
      console.log(`\\nViolation ${index + 1}:`)
      console.log(`  ID: ${violation.id}`)
      console.log(`  Impact: ${violation.impact}`)
      console.log(`  Description: ${violation.description}`)
      console.log(`  Help: ${violation.help}`)
      console.log(`  Tags: ${violation.tags.join(', ')}`)
      console.log(`  Nodes affected: ${violation.nodes.length}`)
      
      violation.nodes.forEach((node, nodeIndex) => {
        console.log(`    Node ${nodeIndex + 1}:`)
        console.log(`      Target: ${node.target}`)
        console.log(`      HTML: ${node.html}`)
        if (node.failureSummary) {
          console.log(`      Failure: ${node.failureSummary}`)
        }
        if (node.any && node.any.length > 0) {
          console.log(`      Details: ${JSON.stringify(node.any[0].data, null, 6)}`)
        }
      })
    })
    
    // 2. Click Join Session to open modal
    await page.click('button:has-text("Join Session")')
    await page.waitForTimeout(1000) // Give time for modal to open
    
    // Take screenshot of modal state
    await page.screenshot({ 
      path: 'test-results/screenshot-2-modal.png',
      fullPage: true
    })
    console.log('📸 Screenshot 2: Modal state saved')
    
    // Run axe-core on modal state
    const modalResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    
    console.log('\\n🔍 RAW AXE-CORE OUTPUT - MODAL STATE:')
    console.log('====================================')
    console.log('Violations found:', modalResults.violations.length)
    
    modalResults.violations.forEach((violation, index) => {
      console.log(`\\nViolation ${index + 1}:`)
      console.log(`  ID: ${violation.id}`)
      console.log(`  Impact: ${violation.impact}`)
      console.log(`  Description: ${violation.description}`)
      console.log(`  Help: ${violation.help}`)
      console.log(`  Tags: ${violation.tags.join(', ')}`)
      console.log(`  Nodes affected: ${violation.nodes.length}`)
      
      violation.nodes.forEach((node, nodeIndex) => {
        console.log(`    Node ${nodeIndex + 1}:`)
        console.log(`      Target: ${node.target}`)
        console.log(`      HTML: ${node.html}`)
        if (node.failureSummary) {
          console.log(`      Failure: ${node.failureSummary}`)
        }
        if (node.any && node.any.length > 0) {
          console.log(`      Details: ${JSON.stringify(node.any[0].data, null, 6)}`)
        }
      })
    })
    
    // 3. Manual button analysis to debug truncation
    console.log('\\n🔍 MANUAL BUTTON TRUNCATION ANALYSIS:')
    console.log('=====================================')
    
    // Analyze the main grid buttons
    const startButton = page.locator('button:has-text("Start Session")').first()
    const joinButton = page.locator('button:has-text("Join Session")').first()
    
    const startAnalysis = await startButton.evaluate((button) => {
      const rect = button.getBoundingClientRect()
      const computedStyle = window.getComputedStyle(button)
      
      return {
        width: rect.width,
        height: rect.height,
        textContent: button.textContent?.trim(),
        display: computedStyle.display,
        flexDirection: computedStyle.flexDirection,
        alignItems: computedStyle.alignItems,
        justifyContent: computedStyle.justifyContent,
        overflow: computedStyle.overflow,
        whiteSpace: computedStyle.whiteSpace,
        className: button.className
      }
    })
    
    const joinAnalysis = await joinButton.evaluate((button) => {
      const rect = button.getBoundingClientRect()
      const computedStyle = window.getComputedStyle(button)
      
      return {
        width: rect.width,
        height: rect.height,
        textContent: button.textContent?.trim(),
        display: computedStyle.display,
        flexDirection: computedStyle.flexDirection,
        alignItems: computedStyle.alignItems,
        justifyContent: computedStyle.justifyContent,
        overflow: computedStyle.overflow,
        whiteSpace: computedStyle.whiteSpace,
        className: button.className
      }
    })
    
    console.log('Start Session Button Analysis:')
    console.log(JSON.stringify(startAnalysis, null, 2))
    
    console.log('\\nJoin Session Button Analysis:')
    console.log(JSON.stringify(joinAnalysis, null, 2))
    
    console.log('\\n🔍 Analysis complete - check test-results/ for screenshots')
  })
  
})