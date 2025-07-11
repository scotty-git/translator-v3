#!/usr/bin/env node
/**
 * Pre-commit UI Validation Hook
 * 
 * This script runs before every git commit to ensure no unauthorized UI changes
 * are being committed. It's part of the UI Contract enforcement system.
 * 
 * Usage: This script is called automatically by git pre-commit hooks
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// ANSI color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function checkForUIChanges() {
  log('🔍 UI Contract Validation: Checking for UI changes...', 'cyan')
  
  try {
    // Check if we're in a git repository
    execSync('git rev-parse --git-dir', { stdio: 'pipe' })
  } catch (error) {
    log('⚠️  Not in a git repository, skipping UI validation', 'yellow')
    return true
  }
  
  // Get list of staged files
  let stagedFiles
  try {
    stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' }).trim().split('\n').filter(f => f)
  } catch (error) {
    log('⚠️  Could not get staged files, skipping UI validation', 'yellow')
    return true
  }
  
  if (stagedFiles.length === 0) {
    log('✅ No staged files, UI validation passed', 'green')
    return true
  }
  
  // Check if any UI-related files are being changed
  const uiFiles = stagedFiles.filter(file => 
    file.includes('src/') && 
    (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css') || file.endsWith('.scss'))
  )
  
  if (uiFiles.length === 0) {
    log('✅ No UI files changed, UI validation passed', 'green')
    return true
  }
  
  log(`📝 Found ${uiFiles.length} UI-related files in commit:`, 'blue')
  uiFiles.forEach(file => log(`   - ${file}`, 'blue'))
  
  // Check for specific UI preservation bypass
  const commitMessage = process.env.COMMIT_MESSAGE || ''
  if (commitMessage.includes('[skip-ui-validation]')) {
    log('⚠️  UI validation bypassed with [skip-ui-validation] flag', 'yellow')
    log('🚨 Remember: This bypass should only be used for intentional UI changes!', 'red')
    return true
  }
  
  // Run UI validation tests
  log('🧪 Running UI contract validation tests...', 'cyan')
  
  try {
    // Check if dev server is running
    const serverCheck = execSync('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5173/', { encoding: 'utf8' })
    if (serverCheck !== '200') {
      log('❌ Dev server not running at http://127.0.0.1:5173/', 'red')
      log('   Please start the dev server with: npm run dev', 'red')
      return false
    }
    
    // Run UI validation tests
    const testResult = execSync('npm run ui:validate', { 
      encoding: 'utf8',
      stdio: 'pipe'
    })
    
    log('✅ UI contract validation passed!', 'green')
    log('   All UI elements match baseline screenshots', 'green')
    return true
    
  } catch (error) {
    log('❌ UI contract validation failed!', 'red')
    log('', 'reset')
    log('🚨 CRITICAL: Unauthorized UI changes detected!', 'red')
    log('', 'reset')
    log('This commit contains changes that modify the user interface.', 'red')
    log('According to the UI Contract, no visual changes are allowed during refactoring.', 'red')
    log('', 'reset')
    log('📋 To fix this:', 'yellow')
    log('1. Review the visual differences in the test report', 'yellow')
    log('2. If changes are accidental: Revert the UI changes', 'yellow')
    log('3. If changes are intentional: Get approval and update baselines', 'yellow')
    log('', 'reset')
    log('🔧 Commands:', 'cyan')
    log('   npm run test:visual:report  # View visual differences', 'cyan')
    log('   npm run ui:baseline         # Update baselines (only for approved changes)', 'cyan')
    log('', 'reset')
    log('⚠️  To bypass this check (use with caution):', 'yellow')
    log('   git commit -m "your message [skip-ui-validation]"', 'yellow')
    log('', 'reset')
    
    return false
  }
}

function checkForBaselineChanges() {
  log('📸 Checking for baseline screenshot changes...', 'cyan')
  
  try {
    // Check if baseline screenshots are being committed
    const baselineFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(f => f && f.includes('tests/visual-regression/screenshots/'))
    
    if (baselineFiles.length > 0) {
      log('⚠️  Baseline screenshots are being updated:', 'yellow')
      baselineFiles.forEach(file => log(`   - ${file}`, 'yellow'))
      log('', 'reset')
      log('🚨 IMPORTANT: This indicates intentional UI changes!', 'yellow')
      log('   Make sure these changes are approved and documented.', 'yellow')
      log('', 'reset')
      
      // Check for documentation of UI changes
      const commitMessage = process.env.COMMIT_MESSAGE || ''
      if (!commitMessage.includes('[ui-change]')) {
        log('❌ Baseline updates require [ui-change] flag in commit message', 'red')
        log('   This ensures UI changes are intentional and documented.', 'red')
        log('', 'reset')
        log('📝 Example:', 'cyan')
        log('   git commit -m "feat: add new button [ui-change]"', 'cyan')
        log('', 'reset')
        return false
      }
      
      log('✅ Baseline updates properly documented with [ui-change] flag', 'green')
    }
    
    return true
    
  } catch (error) {
    log('⚠️  Could not check baseline changes, allowing commit', 'yellow')
    return true
  }
}

function main() {
  log('', 'reset')
  log('🛡️  UI Contract Enforcement System', 'bold')
  log('   Validating UI preservation before commit...', 'cyan')
  log('', 'reset')
  
  // Check for UI changes
  const uiValidation = checkForUIChanges()
  if (!uiValidation) {
    process.exit(1)
  }
  
  // Check for baseline changes
  const baselineValidation = checkForBaselineChanges()
  if (!baselineValidation) {
    process.exit(1)
  }
  
  log('✅ UI Contract validation completed successfully!', 'green')
  log('   Commit approved - no unauthorized UI changes detected.', 'green')
  log('', 'reset')
  
  process.exit(0)
}

// Run the validation
main()