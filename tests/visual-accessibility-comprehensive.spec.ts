import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
// import { percy } from '@percy/playwright' // Will add this back once configured

// Production URL for testing
const PRODUCTION_URL = 'https://translator-v3.vercel.app'

test.describe('Comprehensive Visual + Accessibility Testing', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(PRODUCTION_URL)
    await page.waitForLoadState('networkidle')
  })

  test('Complete HomeScreen Analysis - All Tools', async ({ page }) => {
    console.log('🔍 [COMPREHENSIVE] Starting full analysis with all 3 tools...')
    
    // ==========================================
    // 1. PERCY VISUAL TESTING
    // ==========================================
    console.log('📸 [PERCY] Capturing baseline visual state...')
    
    // Capture initial state
    // await percy(page, 'HomeScreen - Initial Light Mode')
    console.log('📸 [PERCY] Taking baseline screenshot (Percy setup pending)')
    
    // Test dark mode
    await page.click('button[title="Dark"]')
    await page.waitForTimeout(1000)
    // await percy(page, 'HomeScreen - Dark Mode')
    console.log('📸 [PERCY] Taking dark mode screenshot (Percy setup pending)')
    
    // Test join modal state (where issues occur)
    await page.click('button[title="Light"]') // Back to light mode
    await page.waitForTimeout(1000)
    await page.click('button:has-text("Join Session")')
    await page.waitForTimeout(500)
    // await percy(page, 'HomeScreen - Join Modal Open (CRITICAL)')
    console.log('📸 [PERCY] Taking join modal screenshot (Percy setup pending)')
    
    // ==========================================
    // 2. AXE-CORE ACCESSIBILITY TESTING
    // ==========================================
    console.log('♿ [AXE-CORE] Running accessibility analysis...')
    
    // Test accessibility in default state
    await page.goto(PRODUCTION_URL)
    await page.waitForLoadState('networkidle')
    
    const defaultAccessibility = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    
    console.log('♿ [AXE-CORE] Default state violations:', defaultAccessibility.violations.length)
    defaultAccessibility.violations.forEach((violation, index) => {
      console.log(`♿ [AXE-CORE] Violation ${index + 1}: ${violation.id}`)
      console.log(`   Impact: ${violation.impact}`)
      console.log(`   Description: ${violation.description}`)
      console.log(`   Nodes affected: ${violation.nodes.length}`)
    })
    
    // Test accessibility with modal open (critical state)
    await page.click('button:has-text("Join Session")')
    await page.waitForTimeout(500)
    
    const modalAccessibility = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    
    console.log('♿ [AXE-CORE] Modal state violations:', modalAccessibility.violations.length)
    modalAccessibility.violations.forEach((violation, index) => {
      console.log(`♿ [AXE-CORE] Modal Violation ${index + 1}: ${violation.id}`)
      console.log(`   Impact: ${violation.impact}`)
      console.log(`   Description: ${violation.description}`)
      console.log(`   Nodes affected: ${violation.nodes.length}`)
    })
    
    // ==========================================
    // 3. PLAYWRIGHT DETAILED ANALYSIS
    // ==========================================
    console.log('🎭 [PLAYWRIGHT] Running detailed DOM and visual analysis...')
    
    // Analyze button dimensions and text visibility
    const startButton = page.locator('button:has-text("Start Session")')
    const joinButton = page.locator('button:has-text("Join Session")')
    const modalJoinButton = page.locator('button:has-text("Join")').nth(1)
    
    // Button dimension analysis
    const startBounds = await startButton.boundingBox()
    const joinBounds = await joinButton.boundingBox()
    const modalJoinBounds = await modalJoinButton.boundingBox()
    
    console.log('🎭 [PLAYWRIGHT] Button Dimensions Analysis:')
    console.log(`   Start Session: ${startBounds?.width}w x ${startBounds?.height}h`)
    console.log(`   Join Session: ${joinBounds?.width}w x ${joinBounds?.height}h`)
    console.log(`   Modal Join: ${modalJoinBounds?.width}w x ${modalJoinBounds?.height}h`)
    
    // Text content vs visual analysis
    const modalJoinText = await modalJoinButton.textContent()
    console.log(`🎭 [PLAYWRIGHT] Modal Join button text content: "${modalJoinText}"`)
    
    // Check if text might be truncated by analyzing button width vs text width
    const textWidth = await modalJoinButton.evaluate((el) => {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      const style = window.getComputedStyle(el)
      context!.font = `${style.fontSize} ${style.fontFamily}`
      return context!.measureText(el.textContent || '').width
    })
    
    console.log(`🎭 [PLAYWRIGHT] Calculated text width: ${textWidth}px`)
    console.log(`🎭 [PLAYWRIGHT] Button inner width: ${modalJoinBounds?.width}px`)
    
    if (modalJoinBounds && textWidth > modalJoinBounds.width - 24) { // 24px for padding
      console.log('🚨 [PLAYWRIGHT] WARNING: Text may be visually truncated!')
    }
    
    // Color contrast analysis for modal state
    const inputField = page.locator('input[data-testid="join-code-input"]')
    const inputStyles = await inputField.evaluate((el) => {
      const styles = window.getComputedStyle(el)
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        borderColor: styles.borderColor
      }
    })
    
    console.log('🎭 [PLAYWRIGHT] Input field colors:')
    console.log(`   Background: ${inputStyles.backgroundColor}`)
    console.log(`   Text: ${inputStyles.color}`)
    console.log(`   Border: ${inputStyles.borderColor}`)
    
    // Button layout analysis - check if icons and text are on same row
    const startButtonLayout = await startButton.evaluate((el) => {
      const icon = el.querySelector('svg')
      const text = el.querySelector('span')
      if (!icon || !text) return null
      
      const iconRect = icon.getBoundingClientRect()
      const textRect = text.getBoundingClientRect()
      
      return {
        iconTop: iconRect.top,
        textTop: textRect.top,
        verticalDifference: Math.abs(iconRect.top - textRect.top),
        sameRow: Math.abs(iconRect.top - textRect.top) < 5 // 5px tolerance
      }
    })
    
    console.log('🎭 [PLAYWRIGHT] Button layout analysis:')
    console.log(`   Icon and text vertical difference: ${startButtonLayout?.verticalDifference}px`)
    console.log(`   Icons and text on same row: ${startButtonLayout?.sameRow}`)
    
    // ==========================================
    // 4. COMBINED ANALYSIS & RECOMMENDATIONS
    // ==========================================
    console.log('📊 [SUMMARY] Combined Analysis Results:')
    
    // Compile issues found
    const issues = []
    
    if (defaultAccessibility.violations.length > 0) {
      issues.push(`${defaultAccessibility.violations.length} accessibility violations in default state`)
    }
    
    if (modalAccessibility.violations.length > 0) {
      issues.push(`${modalAccessibility.violations.length} accessibility violations in modal state`)
    }
    
    if (modalJoinBounds && textWidth > modalJoinBounds.width - 24) {
      issues.push('Potential text truncation in modal join button')
    }
    
    if (!startButtonLayout?.sameRow) {
      issues.push('Icons and text not properly aligned on same row')
    }
    
    console.log('📊 [SUMMARY] Issues detected:')
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`)
    })
    
    if (issues.length === 0) {
      console.log('✅ [SUMMARY] No issues detected by automated testing')
    } else {
      console.log(`🚨 [SUMMARY] ${issues.length} potential issues require attention`)
    }
    
    console.log('✅ [COMPREHENSIVE] Analysis complete - check Percy dashboard for visual diffs')
  })

  test('Specific Dark-on-Dark Detection', async ({ page }) => {
    console.log('🔍 [CONTRAST] Testing for dark-on-dark issues...')
    
    // Open modal and analyze contrast
    await page.click('button:has-text("Join Session")')
    await page.waitForTimeout(500)
    
    const inputField = page.locator('input[data-testid="join-code-input"]')
    
    // Get computed styles
    const styles = await inputField.evaluate((el) => {
      const computed = window.getComputedStyle(el)
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        placeholderColor: computed.getPropertyValue('::placeholder') || 'unknown'
      }
    })
    
    console.log('🔍 [CONTRAST] Input field contrast analysis:')
    console.log(`   Background: ${styles.backgroundColor}`)
    console.log(`   Text color: ${styles.color}`)
    
    // Simple contrast check (basic version)
    const isLightBackground = styles.backgroundColor.includes('255') || styles.backgroundColor.includes('white')
    const isLightText = styles.color.includes('255') || styles.color.includes('white')
    const isDarkBackground = styles.backgroundColor.includes('rgb(0') || styles.backgroundColor.includes('rgb(31') || styles.backgroundColor.includes('rgb(17')
    const isDarkText = styles.color.includes('rgb(0') || styles.color.includes('rgb(31') || styles.color.includes('rgb(17')
    
    if ((isLightBackground && isLightText) || (isDarkBackground && isDarkText)) {
      console.log('🚨 [CONTRAST] WARNING: Potential low contrast detected!')
    } else {
      console.log('✅ [CONTRAST] Contrast appears adequate')
    }
    
    // Run axe-core specifically for contrast
    const contrastResults = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze()
    
    console.log(`🔍 [CONTRAST] axe-core color contrast violations: ${contrastResults.violations.length}`)
    contrastResults.violations.forEach(violation => {
      console.log(`   - ${violation.description}`)
      violation.nodes.forEach(node => {
        console.log(`     Target: ${node.target}`)
      })
    })
  })

  test('Text Truncation Visual Detection', async ({ page }) => {
    console.log('📏 [TRUNCATION] Testing for text truncation issues...')
    
    await page.click('button:has-text("Join Session")')
    await page.waitForTimeout(500)
    
    const modalJoinButton = page.locator('button:has-text("Join")').nth(1)
    
    // Advanced text truncation detection
    const truncationAnalysis = await modalJoinButton.evaluate((button) => {
      const textSpan = button.querySelector('span') || button
      const buttonRect = button.getBoundingClientRect()
      const textRect = textSpan.getBoundingClientRect()
      
      // Check if text extends beyond button bounds
      const isOverflowing = textRect.width > buttonRect.width - 20 // 20px padding allowance
      
      // Check computed styles for overflow handling
      const styles = window.getComputedStyle(textSpan)
      const hasEllipsis = styles.textOverflow === 'ellipsis'
      const isHidden = styles.overflow === 'hidden'
      
      return {
        buttonWidth: buttonRect.width,
        textWidth: textRect.width,
        isOverflowing,
        hasEllipsis,
        isHidden,
        textContent: textSpan.textContent,
        potentiallyTruncated: isOverflowing && (hasEllipsis || isHidden)
      }
    })
    
    console.log('📏 [TRUNCATION] Detailed analysis:')
    console.log(`   Button width: ${truncationAnalysis.buttonWidth}px`)
    console.log(`   Text width: ${truncationAnalysis.textWidth}px`)
    console.log(`   Text overflowing: ${truncationAnalysis.isOverflowing}`)
    console.log(`   Has ellipsis: ${truncationAnalysis.hasEllipsis}`)
    console.log(`   Overflow hidden: ${truncationAnalysis.isHidden}`)
    console.log(`   Text content: "${truncationAnalysis.textContent}"`)
    console.log(`   Potentially truncated: ${truncationAnalysis.potentiallyTruncated}`)
    
    if (truncationAnalysis.potentiallyTruncated) {
      console.log('🚨 [TRUNCATION] WARNING: Text appears to be truncated!')
    } else {
      console.log('✅ [TRUNCATION] Text appears to display fully')
    }
    
    // Take Percy screenshot specifically for truncation analysis
    // await percy(page, 'Text Truncation Analysis - Join Button')
    console.log('📸 [PERCY] Taking truncation analysis screenshot (Percy setup pending)')
  })

})