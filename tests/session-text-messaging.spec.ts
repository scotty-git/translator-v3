import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test';

test.describe('Session Text Messaging', () => {
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
  });

  test.afterAll(async () => {
    await hostContext.close();
    await guestContext.close();
  });

  test('should create session, join it, and exchange text messages', async () => {
    const VERCEL_URL = 'https://translator-v3.vercel.app';

    // Step 1: Host creates a session
    console.log('🏠 Host: Navigating to app...');
    await hostPage.goto(VERCEL_URL);
    await hostPage.waitForLoadState('networkidle');
    
    // Take screenshot of homepage
    await hostPage.screenshot({ path: 'test-results/01-homepage.png' });

    // Click "Start Session" button
    console.log('🏠 Host: Starting session...');
    await hostPage.getByText('Start Session').click();
    
    // Wait for session to be created and navigate to session view
    await hostPage.waitForURL(/.*\/session.*/);
    await hostPage.waitForLoadState('networkidle');
    
    // Wait for session code to appear in header
    await hostPage.waitForSelector('span.font-mono', { timeout: 10000 });
    
    // Extract the 4-digit session code from the header
    const sessionCode = await hostPage.locator('span.font-mono').textContent();
    console.log('🏠 Host: Session code is:', sessionCode);
    
    expect(sessionCode).toMatch(/^\d{4}$/); // Should be 4 digits
    
    // Take screenshot showing session code
    await hostPage.screenshot({ path: 'test-results/02-host-session-created.png' });

    // Step 2: Guest joins the session
    console.log('👥 Guest: Navigating to app...');
    await guestPage.goto(VERCEL_URL);
    await guestPage.waitForLoadState('networkidle');

    // Click "Join Session" button
    console.log('👥 Guest: Clicking Join Session...');
    await guestPage.getByText('Join Session').click();
    
    // Enter the session code
    console.log('👥 Guest: Entering session code:', sessionCode);
    const joinInput = guestPage.getByTestId('join-code-input');
    await joinInput.fill(sessionCode!);
    
    // Click Join button
    await guestPage.getByText('Join', { exact: true }).click();
    
    // Wait for guest to join session
    await guestPage.waitForURL(/.*\/session.*/);
    await guestPage.waitForLoadState('networkidle');
    
    // Take screenshot of guest joined
    await guestPage.screenshot({ path: 'test-results/03-guest-joined.png' });

    // Step 3: Wait for both parties to see "Partner Online"
    console.log('🔄 Waiting for partner connection...');
    
    // Wait for partner online status on both sides
    await Promise.all([
      hostPage.waitForSelector('text=Partner Online', { timeout: 15000 }),
      guestPage.waitForSelector('text=Partner Online', { timeout: 15000 })
    ]);
    
    console.log('✅ Both parties connected!');
    
    // Take screenshots showing both connected
    await hostPage.screenshot({ path: 'test-results/04-both-connected-host.png' });
    await guestPage.screenshot({ path: 'test-results/05-both-connected-guest.png' });

    // Step 4: Switch to text input mode on both sides
    console.log('📝 Switching to text input mode...');
    
    // Find and click the text input toggle button (edit icon) on both pages
    const hostTextToggle = hostPage.locator('button[title="Text input"]');
    const guestTextToggle = guestPage.locator('button[title="Text input"]');
    
    await hostTextToggle.click();
    await guestTextToggle.click();
    
    // Wait for text input to appear
    await hostPage.waitForSelector('input[placeholder="Type message..."]');
    await guestPage.waitForSelector('input[placeholder="Type message..."]');
    
    // Take screenshots showing text input mode
    await hostPage.screenshot({ path: 'test-results/06-text-input-mode-host.png' });
    await guestPage.screenshot({ path: 'test-results/07-text-input-mode-guest.png' });

    // Step 5: Host sends "hello" message
    console.log('🏠 Host: Sending "hello" message...');
    
    const hostInput = hostPage.locator('input[placeholder="Type message..."]');
    await hostInput.fill('hello');
    
    // Click Send button
    await hostPage.getByText('Send').click();
    
    // Wait for message to process and appear
    await hostPage.waitForSelector('[data-testid^="message-bubble"]', { timeout: 15000 });
    
    // Take screenshot after host sends message
    await hostPage.screenshot({ path: 'test-results/08-host-sent-hello.png' });

    // Step 6: Guest sends "hello" message
    console.log('👥 Guest: Sending "hello" message...');
    
    const guestInput = guestPage.locator('input[placeholder="Type message..."]');
    await guestInput.fill('hello');
    
    // Click Send button
    await guestPage.getByText('Send').click();
    
    // Wait for message to process and appear
    await guestPage.waitForSelector('[data-testid^="message-bubble"]', { timeout: 15000 });
    
    // Take screenshot after guest sends message
    await guestPage.screenshot({ path: 'test-results/09-guest-sent-hello.png' });

    // Step 7: Wait for real-time sync and check what we have
    console.log('🔄 Waiting for real-time message sync...');
    
    // Wait a bit for messages to process
    await hostPage.waitForTimeout(10000);
    await guestPage.waitForTimeout(10000);
    
    // Take screenshots to see current state
    await hostPage.screenshot({ path: 'test-results/10-post-messages-host.png' });
    await guestPage.screenshot({ path: 'test-results/11-post-messages-guest.png' });
    
    // Step 8: Verify message content and check for the bug
    console.log('✅ Verifying message content...');
    
    // Count all message elements to check for the bug
    const hostMessageElements = await hostPage.locator('[class*="message"], [data-testid*="message"], .MessageBubble').count();
    const guestMessageElements = await guestPage.locator('[class*="message"], [data-testid*="message"], .MessageBubble').count();
    
    console.log(`🔍 HOST: Found ${hostMessageElements} message elements`);
    console.log(`🔍 GUEST: Found ${guestMessageElements} message elements`);
    
    // Check if we can see "hello" text (should be 2 instances now - one from each user)
    const hostHelloCount = await hostPage.locator('text=hello').count();
    const guestHelloCount = await guestPage.locator('text=hello').count();
    
    console.log(`🔍 HOST: Found ${hostHelloCount} instances of "hello"`);
    console.log(`🔍 GUEST: Found ${guestHelloCount} instances of "hello"`);
    
    // Verify that both users can see both messages
    if (hostHelloCount >= 2 && guestHelloCount >= 2) {
      console.log('✅ SUCCESS: Text messages are syncing correctly between users!');
      console.log(`Both users can see both messages: Host=${hostHelloCount}, Guest=${guestHelloCount}`);
    } else {
      console.log('🚨 BUG STILL EXISTS: Text messages are not syncing properly!');
      console.log(`Expected: 2+ messages each, Got: Host=${hostHelloCount}, Guest=${guestHelloCount}`);
    }

    // Step 9: Take final screenshots showing the conversation
    await hostPage.screenshot({ path: 'test-results/12-final-conversation-host.png' });
    await guestPage.screenshot({ path: 'test-results/13-final-conversation-guest.png' });
    
    // Assert that the fix worked - both users should see both messages
    expect(hostHelloCount).toBeGreaterThanOrEqual(2);
    expect(guestHelloCount).toBeGreaterThanOrEqual(2);
    
    console.log('🎉 Test completed successfully!');
    console.log('📸 Screenshots saved to test-results/ directory');
    console.log('🔍 Check test-results/12-final-conversation-host.png or test-results/13-final-conversation-guest.png for the final conversation');
  });
});