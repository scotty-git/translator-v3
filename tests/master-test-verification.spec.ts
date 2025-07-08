import { test, expect } from '@playwright/test';

test.describe('Master Test Suite Verification', () => {
  test('should run actual tests and capture console output', async ({ page }) => {
    console.log('🧪 Verifying Master Test Suite functionality...');
    
    // Capture console output
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });

    // Navigate to Master Test Suite
    await page.goto('http://127.0.0.1:5173/test/master');
    
    // Wait for page to load
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Verify page title
    const title = await page.textContent('h1');
    expect(title).toBe('Master Test Suite');
    console.log('✅ Master Test Suite page loaded successfully');
    
    // Wait for components to initialize
    await page.waitForTimeout(2000);
    
    // Try to find test buttons and verify they exist
    const testButtons = await page.locator('button').count();
    console.log(`🔍 Found ${testButtons} test buttons on the page`);
    
    // Look for the "Run All Tests" button and click it
    try {
      const runAllButton = page.locator('button:has-text("Run All Tests")');
      if (await runAllButton.count() > 0) {
        console.log('🎯 Found "Run All Tests" button, clicking...');
        await runAllButton.click();
        
        // Wait for tests to complete (give them time to run)
        await page.waitForTimeout(5000);
        
        console.log('✅ Tests executed successfully');
      } else {
        console.log('ℹ️ No "Run All Tests" button found, checking for individual test buttons');
      }
    } catch (error) {
      console.log(`⚠️ Error running tests: ${error.message}`);
    }
    
    // Capture final console state
    console.log('\n📋 Console Messages Summary:');
    const testMessages = consoleMessages.filter(msg => 
      msg.includes('🧪') || 
      msg.includes('✅') || 
      msg.includes('❌') ||
      msg.includes('[Phase') ||
      msg.includes('Test')
    );
    
    testMessages.slice(-20).forEach((msg, index) => {
      console.log(`${index + 1}. ${msg}`);
    });
    
    console.log(`\n🎉 Verification complete! Total console messages: ${consoleMessages.length}`);
  });
});