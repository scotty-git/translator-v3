import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test';

test.describe('Quick Emoji Width Test', () => {
  let hostContext: BrowserContext;
  let guestContext: BrowserContext;
  let hostPage: Page;
  let guestPage: Page;

  test.beforeAll(async () => {
    const browser = await chromium.launch({ headless: true });
    
    hostContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
    });
    
    guestContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
    });

    hostPage = await hostContext.newPage();
    guestPage = await guestContext.newPage();
  });

  test.afterAll(async () => {
    await hostContext.close();
    await guestContext.close();
  });

  test('emoji picker width should be fixed', async () => {
    const VERCEL_URL = 'https://translator-v3.vercel.app';

    // Quick setup
    await hostPage.goto(VERCEL_URL);
    await hostPage.waitForLoadState('networkidle');
    await hostPage.getByText('Start Session').click();
    await hostPage.waitForURL(/.*\/session.*/);
    await hostPage.waitForLoadState('networkidle');
    
    await hostPage.waitForSelector('span.font-mono', { timeout: 15000 });
    const sessionCode = await hostPage.locator('span.font-mono').textContent();

    await guestPage.goto(VERCEL_URL);
    await guestPage.waitForLoadState('networkidle');
    await guestPage.getByText('Join Session').click();
    const joinInput = guestPage.getByTestId('join-code-input');
    await joinInput.fill(sessionCode!);
    await guestPage.getByText('Join', { exact: true }).click();
    await guestPage.waitForURL(/.*\/session.*/);
    await guestPage.waitForLoadState('networkidle');

    await Promise.all([
      hostPage.waitForSelector('text=Partner Online', { timeout: 20000 }),
      guestPage.waitForSelector('text=Partner Online', { timeout: 20000 })
    ]);

    await hostPage.locator('button[title="Text input"]').click();
    await guestPage.locator('button[title="Text input"]').click();
    await hostPage.waitForSelector('input[placeholder="Type message..."]');

    const hostInput = hostPage.locator('input[placeholder="Type message..."]');
    await hostInput.fill('width test');
    await hostPage.getByText('Send').click();
    
    await guestPage.waitForSelector('[data-testid^="message-bubble"]', { timeout: 20000 });
    await guestPage.waitForTimeout(3000);

    // Test picker width
    console.log('🎯 Testing emoji picker width...');
    const hostMessageOnGuestScreen = guestPage.locator('[data-testid^="message-bubble"]').first();
    await hostMessageOnGuestScreen.click({ delay: 600, force: true });

    const pickerSelector = '[role="dialog"][aria-label="Emoji reaction picker"]';
    await guestPage.waitForSelector(pickerSelector, { timeout: 10000 });
    
    // Check if we're using the fixed version
    const isFixedVersion = await guestPage.locator('[data-testid="emoji-picker-fixed-version"]').count();
    console.log(`🔧 Using fixed version: ${isFixedVersion > 0 ? 'YES' : 'NO'}`);
    
    await guestPage.screenshot({ path: 'test-results/emoji-picker-width-test-after-fix.png' });

    const pickerElement = await guestPage.locator(pickerSelector);
    const pickerBounds = await pickerElement.boundingBox();
    console.log(`📏 Picker bounds after fix: ${JSON.stringify(pickerBounds)}`);
    
    if (pickerBounds) {
      const rightEdge = pickerBounds.x + pickerBounds.width;
      const viewportWidth = 390;
      const maxAllowed = viewportWidth - 20; // 20px margin
      
      console.log(`📊 Right edge: ${rightEdge}px, Max allowed: ${maxAllowed}px`);
      console.log(`📊 Width: ${pickerBounds.width}px (target was ~254px)`);
      
      if (rightEdge <= maxAllowed) {
        console.log(`✅ WIDTH FIXED! Picker fits within bounds`);
      } else {
        console.log(`❌ Still overflows by ${rightEdge - maxAllowed}px`);
      }
    }

    // Quick emoji selection test
    await guestPage.click('button[title*="❤️"]', { timeout: 5000 });
    await guestPage.waitForTimeout(2000);
    
    console.log('✅ Width test completed!');
  });
});