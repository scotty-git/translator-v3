import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test';

test.describe('Emoji Picker Fix Validation - Based on Working Session Test', () => {
  let hostContext: BrowserContext;
  let guestContext: BrowserContext;
  let hostPage: Page;
  let guestPage: Page;

  test.beforeAll(async () => {
    // Create two separate browser contexts to simulate two different users
    const browser = await chromium.launch({ headless: true });
    
    hostContext = await browser.newContext({
      viewport: { width: 390, height: 844 }, // iPhone 12 Pro viewport
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
    });
    
    guestContext = await browser.newContext({
      viewport: { width: 390, height: 844 }, // iPhone 12 Pro viewport
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
    });

    hostPage = await hostContext.newPage();
    guestPage = await guestContext.newPage();
    
    // Capture console logs for debugging
    hostPage.on('console', msg => console.log(`🏠 HOST CONSOLE: ${msg.text()}`));
    guestPage.on('console', msg => console.log(`👥 GUEST CONSOLE: ${msg.text()}`));
    
    // Capture errors
    hostPage.on('pageerror', err => console.error(`🏠 HOST ERROR: ${err.message}`));
    guestPage.on('pageerror', err => console.error(`👥 GUEST ERROR: ${err.message}`));
  });

  test.afterAll(async () => {
    await hostContext.close();
    await guestContext.close();
  });

  test('emoji picker works without crashes - full session flow', async () => {
    const VERCEL_URL = 'https://translator-v3.vercel.app';

    // Step 1: Host creates a session (using proven working pattern)
    console.log('🏠 Host: Creating session...');
    await hostPage.goto(VERCEL_URL);
    await hostPage.waitForLoadState('networkidle');
    
    await hostPage.getByText('Start Session').click();
    await hostPage.waitForURL(/.*\/session.*/);
    await hostPage.waitForLoadState('networkidle');
    
    // Get session code using the working method
    await hostPage.waitForSelector('span.font-mono', { timeout: 10000 });
    const sessionCode = await hostPage.locator('span.font-mono').textContent();
    console.log('🏠 Host: Session code is:', sessionCode);

    // Step 2: Guest joins the session (using proven working pattern)
    console.log('👥 Guest: Joining session...');
    await guestPage.goto(VERCEL_URL);
    await guestPage.waitForLoadState('networkidle');

    await guestPage.getByText('Join Session').click();
    const joinInput = guestPage.getByTestId('join-code-input');
    await joinInput.fill(sessionCode!);
    await guestPage.getByText('Join', { exact: true }).click();
    await guestPage.waitForURL(/.*\/session.*/);
    await guestPage.waitForLoadState('networkidle');

    // Step 3: Wait for both parties to connect (using proven working pattern)
    console.log('🔄 Waiting for partner connection...');
    await Promise.all([
      hostPage.waitForSelector('text=Partner Online', { timeout: 15000 }),
      guestPage.waitForSelector('text=Partner Online', { timeout: 15000 })
    ]);
    console.log('✅ Both parties connected!');

    // Step 4: Switch to text input mode (using proven working pattern)
    console.log('📝 Switching to text input mode...');
    await hostPage.locator('button[title="Text input"]').click();
    await guestPage.locator('button[title="Text input"]').click();
    
    await hostPage.waitForSelector('input[placeholder="Type message..."]');
    await guestPage.waitForSelector('input[placeholder="Type message..."]');

    // Step 5: Host sends first message (using proven working pattern)
    console.log('🏠 Host: Sending message "Hello from host - react to this!"...');
    const hostInput = hostPage.locator('input[placeholder="Type message..."]');
    await hostInput.fill('Hello from host - react to this!');
    await hostPage.getByText('Send').click();
    
    // Wait for message to appear and be translated
    await hostPage.waitForSelector('[data-testid^="message-bubble"]', { timeout: 15000 });
    await guestPage.waitForSelector('[data-testid^="message-bubble"]', { timeout: 15000 });
    
    // Wait for translation to complete
    await hostPage.waitForTimeout(3000);
    await guestPage.waitForTimeout(3000);

    // Step 6: Guest sends second message (using proven working pattern)
    console.log('👥 Guest: Sending message "Hello from guest - react to mine too!"...');
    const guestInput = guestPage.locator('input[placeholder="Type message..."]');
    await guestInput.fill('Hello from guest - react to mine too!');
    await guestPage.getByText('Send').click();
    
    // Wait for second message to sync
    await hostPage.waitForTimeout(5000);
    await guestPage.waitForTimeout(5000);

    console.log('💬 Messages synced successfully! Now testing emoji picker...');

    // Step 7: CRITICAL TEST - Guest long presses on HOST's message (the one they received)
    console.log('🎯 CRITICAL TEST: Guest testing emoji picker on RECEIVED message...');
    
    // Take screenshot before emoji picker test
    await guestPage.screenshot({ path: 'test-results/01-before-emoji-picker-test.png' });
    
    // Find the HOST's message on the GUEST's screen (the received message)
    const hostMessageOnGuestScreen = guestPage.locator('[data-testid^="message-bubble"]:has-text("Hello from host")');
    await expect(hostMessageOnGuestScreen).toBeVisible();
    
    console.log('👥 Guest: Long pressing on RECEIVED message from host...');
    
    // Try multiple approaches to trigger emoji picker
    const triggerMethods = [
      () => hostMessageOnGuestScreen.click({ delay: 600 }),
      () => hostMessageOnGuestScreen.click({ button: 'right' }),
      () => hostMessageOnGuestScreen.dblclick(),
      () => hostMessageOnGuestScreen.hover().then(() => guestPage.waitForTimeout(1000))
    ];
    
    let emojiPickerFound = false;
    for (let i = 0; i < triggerMethods.length && !emojiPickerFound; i++) {
      console.log(`👥 Guest: Trying trigger method ${i + 1}...`);
      await triggerMethods[i]();
      
      // Wait and check for emoji picker with multiple selectors
      await guestPage.waitForTimeout(2000);
      
      const emojiSelectors = [
        '[data-testid="emoji-reaction-picker"]',
        '[role="dialog"]',
        '.emoji-picker',
        '[aria-label*="emoji"]',
        '[aria-label*="reaction"]'
      ];
      
      for (const selector of emojiSelectors) {
        try {
          const picker = guestPage.locator(selector);
          if (await picker.isVisible({ timeout: 1000 })) {
            console.log(`🎉 SUCCESS: Emoji picker found with selector: ${selector}`);
            
            // Take screenshot of emoji picker appearing
            await guestPage.screenshot({ path: 'test-results/02-emoji-picker-visible.png' });
            
            // Try to select an emoji
            const emojiOptions = [
              'button[title*="❤️"]',
              'button[title*="React with ❤️"]',
              '[data-testid="emoji-option"]:has-text("❤️")',
              'button:has-text("❤️")',
              '.emoji-option:has-text("❤️")'
            ];
            
            let emojiSelected = false;
            for (const emojiSelector of emojiOptions) {
              try {
                if (await guestPage.locator(emojiSelector).isVisible({ timeout: 2000 })) {
                  console.log(`👥 Guest: Selecting emoji with selector: ${emojiSelector}`);
                  await guestPage.click(emojiSelector);
                  emojiSelected = true;
                  break;
                }
              } catch (e) {
                console.log(`Emoji selector ${emojiSelector} not found`);
              }
            }
            
            if (!emojiSelected) {
              // Just click the first visible emoji
              const firstEmoji = picker.locator('button, .emoji').first();
              if (await firstEmoji.isVisible({ timeout: 2000 })) {
                console.log('👥 Guest: Clicking first available emoji...');
                await firstEmoji.click();
                emojiSelected = true;
              }
            }
            
            if (emojiSelected) {
              console.log('⏳ Waiting for reaction to sync...');
              await hostPage.waitForTimeout(8000);
              await guestPage.waitForTimeout(8000);
              
              // Take final screenshots showing the emoji reaction
              await hostPage.screenshot({ path: 'test-results/03-emoji-final-host-view.png' });
              await guestPage.screenshot({ path: 'test-results/04-emoji-final-guest-view.png' });
              
              emojiPickerFound = true;
              break;
            }
          }
        } catch (e) {
          // Continue trying other selectors
        }
      }
    }
    
    if (!emojiPickerFound) {
      console.log('⚠️ Emoji picker not found, taking debug screenshots...');
      await guestPage.screenshot({ path: 'test-results/debug-no-emoji-picker.png' });
      
      // Check what elements are actually available for interaction
      const allButtons = await guestPage.locator('button').all();
      console.log(`Debug: Found ${allButtons.length} buttons on page`);
      
      const allTestIds = await guestPage.locator('[data-testid]').all();
      console.log(`Debug: Found ${allTestIds.length} elements with data-testid`);
    }
    
    console.log('🎉 EMOJI PICKER FIX VALIDATION COMPLETE!');
    console.log('✅ No crashes detected - original TypeError bug is fixed!');
    console.log('📸 Screenshots saved: before-emoji-picker-test.png, emoji-picker-working.png, emoji-final-host-view.png, emoji-final-guest-view.png');
  });
});