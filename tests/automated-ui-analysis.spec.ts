import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const PRODUCTION_URL = 'https://translator-v3.vercel.app'

test.describe('Automated UI/UX Analysis', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(PRODUCTION_URL)
    await page.waitForLoadState('networkidle')
  })

  test('Complete Accessibility Analysis with Actionable Feedback', async ({ page }) => {
    console.log('🔍 [ANALYSIS] Running comprehensive UI/UX analysis...')
    
    // 1. Test default state
    console.log('📋 [ANALYSIS] Testing default state...')
    const defaultResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    
    console.log(`🎯 [RESULTS] Default state: ${defaultResults.violations.length} violations`)
    
    // 2. Test modal state (where your issues are)
    await page.click('button:has-text("Join Session")')
    await page.waitForTimeout(500)
    
    console.log('📋 [ANALYSIS] Testing modal state (critical)...')
    const modalResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    
    console.log(`🎯 [RESULTS] Modal state: ${modalResults.violations.length} violations`)
    
    // 3. Detailed analysis and actionable feedback
    const allViolations = [...defaultResults.violations, ...modalResults.violations]
    
    if (allViolations.length > 0) {
      console.log('🚨 [ACTIONABLE FIXES NEEDED]:')
      
      allViolations.forEach((violation, index) => {
        console.log(`\n${index + 1}. ${violation.id.toUpperCase()}`)
        console.log(`   Problem: ${violation.description}`)
        console.log(`   Impact: ${violation.impact}`)
        console.log(`   How to fix: ${violation.help}`)
        console.log(`   Elements affected: ${violation.nodes.length}`)
        
        violation.nodes.forEach((node, nodeIndex) => {
          console.log(`   Target ${nodeIndex + 1}: ${node.target}`)
          if (node.failureSummary) {
            console.log(`   Issue: ${node.failureSummary}`)
          }
        })
      })
      
      // Create specific fix suggestions
      console.log('\n🔧 [SPECIFIC FIX SUGGESTIONS]:')
      
      allViolations.forEach((violation, index) => {
        if (violation.id === 'color-contrast') {
          console.log(`${index + 1}. COLOR CONTRAST FIXES:`)
          violation.nodes.forEach(node => {
            console.log(`   - Change ${node.target} to use darker text or lighter background`)
            console.log(`   - Try: text-gray-900 instead of text-gray-500`)
            console.log(`   - Or: bg-white/bg-gray-50 for better contrast`)
          })
        }
        
        if (violation.id === 'meta-viewport') {
          console.log(`${index + 1}. VIEWPORT FIXES:`)
          console.log(`   - Update <meta name="viewport"> to allow user scaling`)
          console.log(`   - Remove user-scalable=no or maximum-scale limitations`)
        }
      })
      
    } else {
      console.log('✅ [RESULTS] No accessibility violations found!')
    }
    
    // 4. Button layout analysis (your specific issue)
    console.log('\n📏 [BUTTON ANALYSIS] Checking button layouts...')
    
    const joinModalButton = page.locator('button:has-text("Join")').nth(1)
    const buttonAnalysis = await joinModalButton.evaluate((button) => {
      const rect = button.getBoundingClientRect()
      const textContent = button.textContent || ''
      
      return {
        width: rect.width,
        height: rect.height,
        textContent,
        isFullyVisible: rect.width > 0 && rect.height > 0,
        textLength: textContent.length
      }
    })
    
    console.log('📏 [BUTTON ANALYSIS] Modal join button:')
    console.log(`   Width: ${buttonAnalysis.width}px`)
    console.log(`   Height: ${buttonAnalysis.height}px`) 
    console.log(`   Text: "${buttonAnalysis.textContent}"`)
    console.log(`   Text length: ${buttonAnalysis.textLength} characters`)
    
    if (buttonAnalysis.width < 80) {
      console.log('🚨 [BUTTON FIX NEEDED]: Button too narrow - may cause text truncation')
      console.log('   Suggestion: Add min-width: 100px to button')
    }
    
    console.log('\n✅ [ANALYSIS] Complete! Review suggestions above.')
  })

})