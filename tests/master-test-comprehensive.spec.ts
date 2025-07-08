import { test, expect } from '@playwright/test';

test.describe('Master Test Suite Comprehensive Analysis', () => {
  test('should run all tests and capture detailed results for iteration', async ({ page }) => {
    console.log('🚀 Starting comprehensive Master Test Suite analysis...');
    
    // Capture all console messages for detailed logging
    const allConsoleMessages: string[] = [];
    const errors: string[] = [];
    
    page.on('console', msg => {
      const message = `[${msg.type().toUpperCase()}] ${msg.text()}`;
      allConsoleMessages.push(message);
      
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      const errorMsg = `[PAGE ERROR] ${error.message}`;
      allConsoleMessages.push(errorMsg);
      errors.push(error.message);
    });

    // Navigate to Master Test Suite
    console.log('📍 Navigating to Master Test Suite...');
    await page.goto('http://127.0.0.1:5173/test/master');
    
    // Wait for page to load
    await page.waitForSelector('h1', { timeout: 15000 });
    console.log('✅ Page loaded successfully');
    
    // Verify page title
    const title = await page.textContent('h1');
    console.log(`📋 Page Title: ${title}`);
    
    // Wait for test suite initialization
    await page.waitForTimeout(2000);
    
    // Find and click "Run All Tests" button
    console.log('🎯 Looking for Run All Tests button...');
    const runAllButton = page.locator('button:has-text("Run All Tests")');
    const buttonCount = await runAllButton.count();
    console.log(`🔍 Found ${buttonCount} "Run All Tests" buttons`);
    
    if (buttonCount > 0) {
      console.log('▶️ Clicking Run All Tests button...');
      await runAllButton.click();
      
      // Wait for tests to complete with longer timeout
      console.log('⏳ Waiting for tests to complete...');
      await page.waitForTimeout(10000);
      
      // Try to find test results sections on the page
      console.log('📊 Analyzing test results...');
      
      // Look for phase sections and their results
      const phaseSections = await page.locator('[class*="phase"], [data-testid*="phase"]').all();
      console.log(`📋 Found ${phaseSections.length} phase sections`);
      
      for (let i = 0; i < phaseSections.length; i++) {
        try {
          const sectionText = await phaseSections[i].textContent();
          if (sectionText && sectionText.includes('Phase')) {
            // Extract phase name and status
            const lines = sectionText.split('\n').filter(line => line.trim());
            const phaseName = lines.find(line => line.includes('Phase')) || `Phase ${i + 1}`;
            console.log(`\n📌 ${phaseName}:`);
            
            // Look for test results in this section
            const testResults = lines.filter(line => 
              line.includes('/') || 
              line.includes('%') || 
              line.includes('passed') || 
              line.includes('failed')
            );
            
            testResults.forEach(result => {
              console.log(`   ${result}`);
            });
          }
        } catch (e) {
          console.log(`⚠️ Could not read phase section ${i + 1}: ${e.message}`);
        }
      }
      
      // Look for overall summary
      console.log('\n🎯 SEARCHING FOR OVERALL SUMMARY:');
      const bodyText = await page.textContent('body');
      const summaryLines = bodyText.split('\n').filter(line => 
        line.includes('Results:') || 
        line.includes('Score:') || 
        line.includes('Health Score:') ||
        (line.includes('tests') && line.includes('passed')) ||
        line.includes('System Health')
      );
      
      summaryLines.forEach(line => {
        if (line.trim()) {
          console.log(`📈 ${line.trim()}`);
        }
      });
      
    } else {
      console.log('❌ No "Run All Tests" button found');
    }
    
    // Analyze console messages for test failures
    console.log('\n🔍 ANALYZING CONSOLE MESSAGES:');
    console.log(`📊 Total console messages: ${allConsoleMessages.length}`);
    console.log(`❌ Total errors: ${errors.length}`);
    
    // Filter for test-related messages
    const testMessages = allConsoleMessages.filter(msg => 
      msg.includes('🧪') || 
      msg.includes('✅') || 
      msg.includes('❌') || 
      msg.includes('Phase') ||
      msg.includes('failed') ||
      msg.includes('passed') ||
      msg.includes('Test') ||
      msg.includes('Results:')
    );
    
    console.log('\n📋 RELEVANT TEST MESSAGES:');
    testMessages.slice(-30).forEach((msg, index) => {
      console.log(`${index + 1}. ${msg}`);
    });
    
    // Show errors if any
    if (errors.length > 0) {
      console.log('\n🚨 ERRORS TO FIX:');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    console.log('\n🎉 Comprehensive analysis complete!');
    console.log('📝 Use this detailed log to identify and fix failing tests');
  });
});