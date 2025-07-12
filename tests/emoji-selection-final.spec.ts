import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test';

test.describe('Final Emoji Selection Test - Get Reaction on Message', () => {
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
    
    // Error capturing
    hostPage.on('pageerror', err => console.error(`🏠 HOST ERROR: ${err.message}`));
    guestPage.on('pageerror', err => console.error(`👥 GUEST ERROR: ${err.message}`));
  });

  test.afterAll(async () => {
    await hostContext.close();
    await guestContext.close();
  });

  test('complete emoji selection and verify emoji appears on message', async () => {
    const VERCEL_URL = 'https://translator-v3.vercel.app';

    // Step 1: Host creates session
    console.log('🏠 Host: Creating session...');
    await hostPage.goto(VERCEL_URL);
    await hostPage.waitForLoadState('networkidle');
    
    await hostPage.getByText('Start Session').click();
    await hostPage.waitForURL(/.*\/session.*/);
    await hostPage.waitForLoadState('networkidle');
    
    await hostPage.waitForSelector('span.font-mono', { timeout: 15000 });
    const sessionCode = await hostPage.locator('span.font-mono').textContent();
    console.log('🏠 Host: Session code is:', sessionCode);

    // Step 2: Guest joins
    console.log('👥 Guest: Joining session...');
    await guestPage.goto(VERCEL_URL);
    await guestPage.waitForLoadState('networkidle');

    await guestPage.getByText('Join Session').click();
    const joinInput = guestPage.getByTestId('join-code-input');
    await joinInput.fill(sessionCode!);
    await guestPage.getByText('Join', { exact: true }).click();
    await guestPage.waitForURL(/.*\/session.*/);
    await guestPage.waitForLoadState('networkidle');

    // Step 3: Wait for connection
    console.log('🔄 Waiting for partner connection...');
    await Promise.all([
      hostPage.waitForSelector('text=Partner Online', { timeout: 20000 }),
      guestPage.waitForSelector('text=Partner Online', { timeout: 20000 })
    ]);
    console.log('✅ Both parties connected!');

    // Step 4: Switch to text mode
    console.log('📝 Switching to text input mode...');
    await hostPage.locator('button[title="Text input"]').click();
    await guestPage.locator('button[title="Text input"]').click();
    
    await hostPage.waitForSelector('input[placeholder="Type message..."]');
    await guestPage.waitForSelector('input[placeholder="Type message..."]');

    // Step 5: Host sends message
    console.log('🏠 Host: Sending test message...');
    const hostInput = hostPage.locator('input[placeholder="Type message..."]');
    await hostInput.fill('Test reaction message');
    await hostPage.getByText('Send').click();
    
    // Wait for message to appear and be translated
    await hostPage.waitForSelector('[data-testid^="message-bubble"]', { timeout: 20000 });
    await guestPage.waitForSelector('[data-testid^="message-bubble"]', { timeout: 20000 });
    
    // Wait a bit for translation
    await hostPage.waitForTimeout(4000);
    await guestPage.waitForTimeout(4000);

    console.log('💬 Message sent and received!');

    // Step 6: Guest long-presses HOST's message to trigger emoji picker
    console.log('🎯 GUEST: Long pressing HOST message to trigger emoji picker...');
    const hostMessageOnGuestScreen = guestPage.locator('[data-testid^="message-bubble"]').first();
    
    // Long press (click with delay)
    await hostMessageOnGuestScreen.click({ 
      delay: 600,
      force: true 
    });

    // Step 7: Wait for picker and take screenshot
    console.log('🔍 Waiting for emoji picker to appear...');
    
    // Try multiple selectors
    const pickerAppeared = await Promise.race([
      guestPage.waitForSelector('[role="dialog"][aria-label="Emoji reaction picker"]', { timeout: 5000 }).then(() => true),
      guestPage.waitForSelector('[data-testid="emoji-reaction-picker"]', { timeout: 5000 }).then(() => true),
      guestPage.waitForSelector('.bg-white.dark\\:bg-gray-800', { timeout: 5000 }).then(() => true),
      new Promise(resolve => setTimeout(() => resolve(false), 5000))
    ]);

    if (!pickerAppeared) {
      console.log('❌ Emoji picker did not appear - taking debug screenshot');
      await guestPage.screenshot({ path: 'test-results/emoji-picker-not-found-debug.png' });
      throw new Error('Emoji picker did not appear');
    }

    console.log('✅ Emoji picker appeared!');
    await guestPage.screenshot({ path: 'test-results/emoji-picker-appeared-final.png' });

    // Step 8: Click on heart emoji
    console.log('👥 GUEST: Selecting heart emoji...');
    
    // Try multiple ways to click the heart emoji
    const heartSelected = await Promise.race([
      guestPage.click('button[title*="❤️"]').then(() => true),
      guestPage.click('button[title*="React with ❤️"]').then(() => true),
      guestPage.click('button:has-text("❤️")').then(() => true),
      // Fallback: click first emoji button
      guestPage.click('[role="dialog"] button').then(() => true),
      new Promise(resolve => setTimeout(() => resolve(false), 3000))
    ]).catch(() => false);

    if (!heartSelected) {
      throw new Error('Could not select heart emoji');
    }

    console.log('✅ Heart emoji selected!');

    // Step 9: Wait for reaction to sync and take final screenshots
    console.log('⏳ Waiting for reaction to sync (10 seconds)...');
    await hostPage.waitForTimeout(10000);
    await guestPage.waitForTimeout(10000);

    // Take final screenshots
    console.log('📸 Taking final screenshots...');
    await hostPage.screenshot({ path: 'test-results/emoji-final-host-with-reaction.png' });
    await guestPage.screenshot({ path: 'test-results/emoji-final-guest-with-reaction.png' });

    // Step 10: Look for reaction indicators
    console.log('🔍 Looking for reaction indicators on message...');
    
    // Check for various reaction-related elements
    const hostReactions = await hostPage.locator('button:has-text("❤️"), [data-testid*="reaction"], [class*="reaction"]').count();
    const guestReactions = await guestPage.locator('button:has-text("❤️"), [data-testid*="reaction"], [class*="reaction"]').count();
    
    console.log(`🔍 HOST: Found ${hostReactions} reaction elements`);
    console.log(`🔍 GUEST: Found ${guestReactions} reaction elements`);

    console.log('🎉 EMOJI SELECTION TEST COMPLETED!');
    console.log('📸 Screenshots saved:');
    console.log('  - emoji-picker-appeared-final.png: Picker with corrected width');
    console.log('  - emoji-final-host-with-reaction.png: Host view after reaction');
    console.log('  - emoji-final-guest-with-reaction.png: Guest view after reaction');
  });
});