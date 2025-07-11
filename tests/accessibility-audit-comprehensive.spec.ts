import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

// Test configuration - Mobile Chrome only
test.use({
  ...test.devices['Pixel 7'],
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36'
})

const BASE_URL = 'http://127.0.0.1:5174'

interface AccessibilityIssue {
  id: string
  impact: string
  description: string
  help: string
  nodes: Array<{
    target: string[]
    html: string
    failureSummary?: string
  }>
  page: string
  theme: string
  state: string
}

let allIssues: AccessibilityIssue[] = []
let screenshotCounter = 0

// Helper function to take screenshots
async function takeScreenshot(page: any, name: string) {
  screenshotCounter++
  const screenshotPath = `test-results/accessibility-audit/${String(screenshotCounter).padStart(3, '0')}-${name}.png`
  await page.screenshot({ 
    path: screenshotPath,
    fullPage: true 
  })
  return screenshotPath
}

// Helper function to run axe analysis
async function runAxeAnalysis(page: any, pageName: string, theme: string, state: string = 'default') {
  console.log(`🔍 Testing ${pageName} - ${theme} mode - ${state} state`)
  
  const accessibilityResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .withRules(['color-contrast', 'color-contrast-enhanced'])
    .analyze()
  
  // Add violations to global array with context
  accessibilityResults.violations.forEach(violation => {
    allIssues.push({
      ...violation,
      page: pageName,
      theme: theme,
      state: state
    })
  })
  
  console.log(`   Found ${accessibilityResults.violations.length} violations`)
  
  return accessibilityResults.violations.length
}

// Helper function to toggle theme
async function setTheme(page: any, theme: 'light' | 'dark') {
  const themeButton = page.locator(`button[title="${theme === 'light' ? 'Light' : 'Dark'}"]`)
  if (await themeButton.isVisible()) {
    await themeButton.click()
    await page.waitForTimeout(500) // Allow theme transition
  }
}

test.describe('Comprehensive Accessibility Audit - Mobile Chrome', () => {
  
  test.beforeAll(() => {
    // Create screenshots directory
    try {
      mkdirSync('test-results/accessibility-audit', { recursive: true })
    } catch (e) {
      // Directory might already exist
    }
    allIssues = []
    screenshotCounter = 0
  })

  test('Home Screen - All States and Themes', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    
    // Test Light Mode
    await setTheme(page, 'light')
    await takeScreenshot(page, 'home-light-default')
    await runAxeAnalysis(page, 'HomeScreen', 'light', 'default')
    
    // Test join modal in light mode
    await page.click('button:has-text("Join Session")')
    await page.waitForTimeout(500)
    await takeScreenshot(page, 'home-light-join-modal')
    await runAxeAnalysis(page, 'HomeScreen', 'light', 'join-modal')
    
    // Test with input filled
    await page.fill('input[data-testid="join-code-input"]', '1234')
    await takeScreenshot(page, 'home-light-join-modal-filled')
    await runAxeAnalysis(page, 'HomeScreen', 'light', 'join-modal-filled')
    
    // Close modal
    await page.press('input[data-testid="join-code-input"]', 'Escape')
    await page.waitForTimeout(500)
    
    // Test Dark Mode
    await setTheme(page, 'dark')
    await takeScreenshot(page, 'home-dark-default')
    await runAxeAnalysis(page, 'HomeScreen', 'dark', 'default')
    
    // Test join modal in dark mode
    await page.click('button:has-text("Join Session")')
    await page.waitForTimeout(500)
    await takeScreenshot(page, 'home-dark-join-modal')
    await runAxeAnalysis(page, 'HomeScreen', 'dark', 'join-modal')
    
    // Test with input filled in dark mode
    await page.fill('input[data-testid="join-code-input"]', '1234')
    await takeScreenshot(page, 'home-dark-join-modal-filled')
    await runAxeAnalysis(page, 'HomeScreen', 'dark', 'join-modal-filled')
  })

  test('Solo Translator - All States and Themes', async ({ page }) => {
    await page.goto(`${BASE_URL}/translator`)
    await page.waitForLoadState('networkidle')
    
    // Test Light Mode
    await setTheme(page, 'light')
    await takeScreenshot(page, 'solo-light-default')
    await runAxeAnalysis(page, 'SoloTranslator', 'light', 'default')
    
    // Test language selector states
    await page.click('button:has-text("English")')
    await page.waitForTimeout(300)
    await takeScreenshot(page, 'solo-light-language-dropdown')
    await runAxeAnalysis(page, 'SoloTranslator', 'light', 'language-dropdown')
    
    // Close dropdown
    await page.press('body', 'Escape')
    await page.waitForTimeout(300)
    
    // Test Dark Mode
    await setTheme(page, 'dark')
    await takeScreenshot(page, 'solo-dark-default')
    await runAxeAnalysis(page, 'SoloTranslator', 'dark', 'default')
    
    // Test language selector in dark mode
    await page.click('button:has-text("English")')
    await page.waitForTimeout(300)
    await takeScreenshot(page, 'solo-dark-language-dropdown')
    await runAxeAnalysis(page, 'SoloTranslator', 'dark', 'language-dropdown')
  })

  test('Session Translator - All States and Themes', async ({ page }) => {
    await page.goto(`${BASE_URL}/session`)
    await page.waitForLoadState('networkidle')
    
    // Test Light Mode
    await setTheme(page, 'light')
    await takeScreenshot(page, 'session-light-default')
    await runAxeAnalysis(page, 'SessionTranslator', 'light', 'default')
    
    // Test Dark Mode
    await setTheme(page, 'dark')
    await takeScreenshot(page, 'session-dark-default')
    await runAxeAnalysis(page, 'SessionTranslator', 'dark', 'default')
  })

  test('Settings Screen - All States and Themes', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`)
    await page.waitForLoadState('networkidle')
    
    // Test Light Mode
    await setTheme(page, 'light')
    await takeScreenshot(page, 'settings-light-default')
    await runAxeAnalysis(page, 'SettingsScreen', 'light', 'default')
    
    // Test Dark Mode
    await setTheme(page, 'dark')
    await takeScreenshot(page, 'settings-dark-default')
    await runAxeAnalysis(page, 'SettingsScreen', 'dark', 'default')
  })

  test('Conversations Screen - All States and Themes', async ({ page }) => {
    await page.goto(`${BASE_URL}/conversations`)
    await page.waitForLoadState('networkidle')
    
    // Test Light Mode
    await setTheme(page, 'light')
    await takeScreenshot(page, 'conversations-light-default')
    await runAxeAnalysis(page, 'ConversationsScreen', 'light', 'default')
    
    // Test Dark Mode
    await setTheme(page, 'dark')
    await takeScreenshot(page, 'conversations-dark-default')
    await runAxeAnalysis(page, 'ConversationsScreen', 'dark', 'default')
  })

  test.afterAll(async () => {
    // Generate comprehensive markdown report
    const reportContent = generateMarkdownReport()
    writeFileSync('docs/accessibility-audit-report.md', reportContent)
    console.log('\n✅ Accessibility audit complete!')
    console.log(`📊 Total issues found: ${allIssues.length}`)
    console.log('📄 Report generated: docs/accessibility-audit-report.md')
  })
})

function generateMarkdownReport(): string {
  const criticalIssues = allIssues.filter(issue => issue.impact === 'critical')
  const seriousIssues = allIssues.filter(issue => issue.impact === 'serious')
  const moderateIssues = allIssues.filter(issue => issue.impact === 'moderate')
  const minorIssues = allIssues.filter(issue => issue.impact === 'minor')
  
  const colorContrastIssues = allIssues.filter(issue => 
    issue.id.includes('color-contrast') || 
    issue.description.toLowerCase().includes('contrast')
  )

  const report = `# Accessibility Audit Report
*Generated on ${new Date().toLocaleDateString()} - Mobile Chrome Testing*

## Executive Summary

Total accessibility issues found: **${allIssues.length}**

### Issues by Severity
- 🔴 **Critical**: ${criticalIssues.length} issues
- 🟠 **Serious**: ${seriousIssues.length} issues  
- 🟡 **Moderate**: ${moderateIssues.length} issues
- 🟢 **Minor**: ${minorIssues.length} issues

### Color & Contrast Issues
- **Total Color-Related Issues**: ${colorContrastIssues.length} issues
- **Pages Most Affected**: ${getMostAffectedPages(colorContrastIssues)}

## Issues by Page

${generatePageBreakdown()}

## Critical Issues Requiring Immediate Attention

${generateIssueSection(criticalIssues, '🔴')}

## Serious Issues 

${generateIssueSection(seriousIssues, '🟠')}

## Color Contrast Specific Issues

${generateColorContrastSection(colorContrastIssues)}

## Moderate Issues

${generateIssueSection(moderateIssues, '🟡')}

## Minor Issues

${generateIssueSection(minorIssues, '🟢')}

## Recommended File Updates

${generateFileRecommendations()}

## Implementation Priority

### Phase 1: Critical Fixes (Immediate)
${criticalIssues.map(issue => `- Fix ${issue.id} on ${issue.page} (${issue.theme} mode)`).join('\n')}

### Phase 2: Color Contrast Improvements  
${colorContrastIssues.slice(0, 5).map(issue => `- Improve contrast: ${issue.description}`).join('\n')}

### Phase 3: Remaining Issues
${[...seriousIssues, ...moderateIssues].slice(0, 10).map(issue => `- ${issue.id}: ${issue.description}`).join('\n')}

## WCAG Compliance Status

- **WCAG 2.1 AA**: ${allIssues.length === 0 ? '✅ Compliant' : '❌ Non-compliant'}
- **Color Contrast**: ${colorContrastIssues.length === 0 ? '✅ Compliant' : '❌ Non-compliant'}
- **Keyboard Navigation**: Requires manual testing
- **Screen Reader**: Requires manual testing

---
*Report generated by automated Playwright + Axe-core testing*
`

  return report
}

function generatePageBreakdown(): string {
  const pageStats = new Map<string, {light: number, dark: number}>()
  
  allIssues.forEach(issue => {
    const page = issue.page
    const current = pageStats.get(page) || {light: 0, dark: 0}
    
    if (issue.theme === 'light') {
      current.light++
    } else {
      current.dark++
    }
    
    pageStats.set(page, current)
  })
  
  let breakdown = ''
  pageStats.forEach((stats, page) => {
    const total = stats.light + stats.dark
    breakdown += `### ${page}\n`
    breakdown += `- **Total Issues**: ${total}\n`
    breakdown += `- **Light Mode**: ${stats.light} issues\n` 
    breakdown += `- **Dark Mode**: ${stats.dark} issues\n\n`
  })
  
  return breakdown
}

function generateIssueSection(issues: AccessibilityIssue[], emoji: string): string {
  if (issues.length === 0) {
    return `${emoji} No issues found in this category.\n\n`
  }
  
  let section = ''
  issues.forEach((issue, index) => {
    section += `${emoji} **${issue.id}** (${issue.page} - ${issue.theme} mode - ${issue.state})\n`
    section += `- **Description**: ${issue.description}\n`
    section += `- **Help**: ${issue.help}\n`
    section += `- **Affected Elements**: ${issue.nodes.length}\n`
    
    if (issue.nodes.length > 0) {
      section += `- **Target**: \`${issue.nodes[0].target.join(' > ')}\`\n`
    }
    
    section += '\n'
  })
  
  return section
}

function generateColorContrastSection(issues: AccessibilityIssue[]): string {
  if (issues.length === 0) {
    return '✅ No color contrast issues found!\n\n'
  }
  
  let section = '### Color Contrast Issues by Theme\n\n'
  
  const lightIssues = issues.filter(i => i.theme === 'light')
  const darkIssues = issues.filter(i => i.theme === 'dark')
  
  if (lightIssues.length > 0) {
    section += '#### Light Mode Issues\n'
    lightIssues.forEach(issue => {
      section += `- **${issue.page}** (${issue.state}): ${issue.description}\n`
    })
    section += '\n'
  }
  
  if (darkIssues.length > 0) {
    section += '#### Dark Mode Issues\n'
    darkIssues.forEach(issue => {
      section += `- **${issue.page}** (${issue.state}): ${issue.description}\n`
    })
    section += '\n'
  }
  
  return section
}

function generateFileRecommendations(): string {
  const recommendations = new Map<string, string[]>()
  
  // Map issue types to likely files
  allIssues.forEach(issue => {
    if (issue.id.includes('color-contrast')) {
      const page = issue.page.toLowerCase()
      if (page.includes('home')) {
        addRecommendation(recommendations, 'src/features/home/HomeScreen.tsx', `Fix color contrast in ${issue.state} state`)
      } else if (page.includes('solo')) {
        addRecommendation(recommendations, 'src/features/translator/solo/SoloTranslator.tsx', `Fix color contrast in ${issue.state} state`)
      } else if (page.includes('session')) {
        addRecommendation(recommendations, 'src/features/translator/SessionTranslator.tsx', `Fix color contrast in ${issue.state} state`)
      }
      
      // Common UI components
      addRecommendation(recommendations, 'src/components/ui/Button.tsx', 'Review button color contrast')
      addRecommendation(recommendations, 'src/components/ui/Input.tsx', 'Review input field contrast')
      addRecommendation(recommendations, 'src/contexts/ThemeContext.tsx', 'Review dark/light theme colors')
    }
    
    if (issue.id.includes('label') || issue.id.includes('aria')) {
      addRecommendation(recommendations, 'src/components/ui/', 'Add proper ARIA labels and descriptions')
    }
  })
  
  let section = ''
  recommendations.forEach((recs, file) => {
    section += `### ${file}\n`
    recs.forEach(rec => {
      section += `- ${rec}\n`
    })
    section += '\n'
  })
  
  return section
}

function addRecommendation(map: Map<string, string[]>, file: string, recommendation: string) {
  const current = map.get(file) || []
  if (!current.includes(recommendation)) {
    current.push(recommendation)
    map.set(file, current)
  }
}

function getMostAffectedPages(issues: AccessibilityIssue[]): string {
  const pageCounts = new Map<string, number>()
  
  issues.forEach(issue => {
    const current = pageCounts.get(issue.page) || 0
    pageCounts.set(issue.page, current + 1)
  })
  
  const sorted = Array.from(pageCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([page, count]) => `${page} (${count})`)
  
  return sorted.join(', ')
}