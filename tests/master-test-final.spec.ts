import { test, expect } from '@playwright/test';

test.describe('Master Test Suite Final Results', () => {
  test('should capture final test results and success rates', async ({ page }) => {
    console.log('🎯 Capturing final Master Test Suite results...');
    
    // Navigate to Master Test Suite
    await page.goto('http://127.0.0.1:5173/test/master');
    
    // Wait for page to load
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Click "Run All Tests" button
    const runAllButton = page.locator('button:has-text("Run All Tests")');
    await runAllButton.click();
    
    // Wait for tests to complete (longer timeout for comprehensive tests)
    await page.waitForTimeout(8000);
    
    // Capture the test results from the page
    console.log('\n📊 FINAL TEST RESULTS:');
    
    // Get Phase results from the page
    const phases = await page.locator('[data-testid^="phase-"], .phase-section').all();
    
    for (let i = 0; i < phases.length; i++) {
      try {
        const phaseText = await phases[i].textContent();
        if (phaseText && phaseText.includes('Phase')) {
          console.log(`📋 ${phaseText.substring(0, 100)}...`);
        }
      } catch (e) {
        // Skip if element not accessible
      }
    }
    
    // Look for overall results in the console output section
    const consoleOutput = await page.locator('[class*="console"], [data-testid="console"]').textContent();
    
    // Extract key information
    const lines = consoleOutput?.split('\n') || [];
    const resultLines = lines.filter(line => 
      line.includes('Results:') || 
      line.includes('Score:') || 
      line.includes('Health Score:') ||
      line.includes('passed') ||
      line.includes('failed')
    );
    
    console.log('\n🎯 KEY METRICS:');
    resultLines.forEach(line => {
      if (line.trim()) {
        console.log(`📈 ${line.trim()}`);
      }
    });
    
    // Check for specific success indicators
    const hasValidResults = consoleOutput && (
      consoleOutput.includes('passed') || 
      consoleOutput.includes('Score:') || 
      consoleOutput.includes('Tests:')
    );
    
    console.log(`\n✅ Test Suite Status: ${hasValidResults ? 'COMPLETED' : 'INCOMPLETE'}`);
    console.log('🎉 Master Test Suite analysis complete!');
  });
});