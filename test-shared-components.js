import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Navigate to the app
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
    
    // Take a screenshot of the main page
    await page.screenshot({ path: 'test-results/shared-components-main.png' });
    console.log('✅ Main page screenshot taken');
    
    // Click Solo mode to test MessageBubble and other components
    await page.click('button:has-text("Solo")');
    await page.waitForTimeout(2000);
    
    // Take screenshot of solo mode
    await page.screenshot({ path: 'test-results/shared-components-solo.png' });
    console.log('✅ Solo mode screenshot taken');
    
    // Test MessageBubble by sending a text message
    await page.click('button[title="Text input"]');
    await page.fill('input[placeholder="Type message..."]', 'Test shared component');
    await page.click('button:has-text("Send")');
    await page.waitForTimeout(3000);
    
    // Take screenshot with message bubble
    await page.screenshot({ path: 'test-results/shared-components-message.png' });
    console.log('✅ Message bubble screenshot taken');
    
    // Check if components exist
    const messageBubble = await page.locator('[data-testid="message-bubble"]').count();
    const audioVisualization = await page.locator('[data-testid="audio-visualization"]').count();
    
    console.log(`📊 Components found:`);
    console.log(`   MessageBubble instances: ${messageBubble}`);
    console.log(`   AudioVisualization instances: ${audioVisualization}`);
    
    if (messageBubble > 0) {
      console.log('✅ Shared MessageBubble component is working');
    } else {
      console.log('❌ MessageBubble component not found');
    }
    
    console.log('🎉 Shared components validation complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
})();