import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://127.0.0.1:5173');
    await page.waitForTimeout(2000); // Wait for page to fully load
    
    // Take screenshot
    await page.screenshot({ 
      path: 'puppeteer-mcp-test.png',
      fullPage: true 
    });
    
    console.log('✅ Screenshot saved as puppeteer-mcp-test.png');
    console.log('✅ Dev server is accessible at http://127.0.0.1:5173');
    
    // Get page title
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();