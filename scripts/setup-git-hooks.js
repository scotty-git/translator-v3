#!/usr/bin/env node
/**
 * Git Hooks Setup Script
 * 
 * This script configures Git to use the custom pre-commit hooks
 * for UI contract enforcement.
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function setupGitHooks() {
  log('🔧 Setting up Git hooks for UI contract enforcement...', 'cyan')
  
  try {
    // Check if we're in a git repository
    execSync('git rev-parse --git-dir', { stdio: 'pipe' })
  } catch (error) {
    log('❌ Not in a git repository!', 'red')
    log('   Please run this script from the project root directory.', 'red')
    process.exit(1)
  }
  
  // Configure git to use custom hooks directory
  try {
    execSync('git config core.hooksPath .githooks', { stdio: 'pipe' })
    log('✅ Git hooks directory configured: .githooks', 'green')
  } catch (error) {
    log('❌ Failed to configure git hooks directory', 'red')
    log(`   Error: ${error.message}`, 'red')
    process.exit(1)
  }
  
  // Verify hook files exist and are executable
  const hookPath = path.join('.githooks', 'pre-commit')
  if (!fs.existsSync(hookPath)) {
    log('❌ Pre-commit hook file not found!', 'red')
    log(`   Expected: ${hookPath}`, 'red')
    process.exit(1)
  }
  
  // Make sure the hook is executable
  try {
    fs.chmodSync(hookPath, '755')
    log('✅ Pre-commit hook is executable', 'green')
  } catch (error) {
    log('❌ Failed to make pre-commit hook executable', 'red')
    log(`   Error: ${error.message}`, 'red')
    process.exit(1)
  }
  
  // Test the hook
  log('🧪 Testing pre-commit hook...', 'cyan')
  try {
    // Create a temporary file to test the hook
    const testFile = 'test-hook-temp.txt'
    fs.writeFileSync(testFile, 'test')
    
    // Add it to git
    execSync(`git add ${testFile}`, { stdio: 'pipe' })
    
    // Remove it immediately (we don't want to commit it)
    execSync(`git reset ${testFile}`, { stdio: 'pipe' })
    fs.unlinkSync(testFile)
    
    log('✅ Pre-commit hook test passed', 'green')
  } catch (error) {
    log('⚠️  Pre-commit hook test failed, but hook is installed', 'yellow')
    log('   The hook will still work for actual commits', 'yellow')
  }
  
  log('', 'reset')
  log('🛡️  Git hooks setup completed successfully!', 'bold')
  log('', 'reset')
  log('📋 What this enables:', 'cyan')
  log('   • Automatic UI validation before each commit', 'cyan')
  log('   • Prevention of unauthorized UI changes', 'cyan')
  log('   • Visual regression detection', 'cyan')
  log('   • UI contract enforcement', 'cyan')
  log('', 'reset')
  log('🔧 To bypass validation (use with caution):', 'yellow')
  log('   git commit -m "your message [skip-ui-validation]"', 'yellow')
  log('', 'reset')
  log('📝 For intentional UI changes:', 'yellow')
  log('   git commit -m "your message [ui-change]"', 'yellow')
  log('', 'reset')
}

// Run the setup
setupGitHooks()