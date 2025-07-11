import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test';

test.describe('Session Message Alignment', () => {
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

  test('messages should appear on correct sides - host right, guest left for host view', async () => {
    const VERCEL_URL = 'https://translator-v3.vercel.app';

    // Step 1: Host creates a session
    console.log('🏠 Host: Creating session...');
    await hostPage.goto(VERCEL_URL);
    await hostPage.waitForLoadState('networkidle');
    
    await hostPage.getByText('Start Session').click();
    await hostPage.waitForURL(/.*\/session.*/);
    await hostPage.waitForLoadState('networkidle');
    
    // Get session code
    await hostPage.waitForSelector('span.font-mono', { timeout: 10000 });
    const sessionCode = await hostPage.locator('span.font-mono').textContent();
    console.log('🏠 Host: Session code is:', sessionCode);

    // Step 2: Guest joins the session
    console.log('👥 Guest: Joining session...');
    await guestPage.goto(VERCEL_URL);
    await guestPage.waitForLoadState('networkidle');

    await guestPage.getByText('Join Session').click();
    const joinInput = guestPage.getByTestId('join-code-input');
    await joinInput.fill(sessionCode!);
    await guestPage.getByText('Join', { exact: true }).click();
    await guestPage.waitForURL(/.*\/session.*/);
    await guestPage.waitForLoadState('networkidle');

    // Step 3: Wait for both parties to connect
    console.log('🔄 Waiting for partner connection...');
    await Promise.all([
      hostPage.waitForSelector('text=Partner Online', { timeout: 15000 }),
      guestPage.waitForSelector('text=Partner Online', { timeout: 15000 })
    ]);
    console.log('✅ Both parties connected!');

    // Step 4: Switch to text input mode
    console.log('📝 Switching to text input mode...');
    await hostPage.locator('button[title="Text input"]').click();
    await guestPage.locator('button[title="Text input"]').click();
    
    await hostPage.waitForSelector('input[placeholder="Type message..."]');
    await guestPage.waitForSelector('input[placeholder="Type message..."]');

    // Step 5: Host sends first message
    console.log('🏠 Host: Sending message "Hello from host"...');
    const hostInput = hostPage.locator('input[placeholder="Type message..."]');
    await hostInput.fill('Hello from host');
    await hostPage.getByText('Send').click();
    
    // Wait for message to appear and be translated
    await hostPage.waitForSelector('[data-testid^="message-bubble"]', { timeout: 15000 });
    await guestPage.waitForSelector('[data-testid^="message-bubble"]', { timeout: 15000 });
    
    // Wait for translation to complete
    await hostPage.waitForTimeout(3000);
    await guestPage.waitForTimeout(3000);

    // Step 6: Guest sends second message  
    console.log('👥 Guest: Sending message "Hello from guest"...');
    const guestInput = guestPage.locator('input[placeholder="Type message..."]');
    await guestInput.fill('Hello from guest');
    await guestPage.getByText('Send').click();
    
    // Wait for second message to sync
    await hostPage.waitForTimeout(5000);
    await guestPage.waitForTimeout(5000);

    // Step 7: Take screenshots before verification
    await hostPage.screenshot({ path: 'test-results/alignment-host-view.png' });
    await guestPage.screenshot({ path: 'test-results/alignment-guest-view.png' });

    // Step 8: Verify message alignment on HOST view
    console.log('🔍 Verifying message alignment on HOST view...');
    
    // Get all message bubbles on host page
    const hostMessages = await hostPage.locator('[data-testid^="message-bubble"]').all();
    console.log(`🏠 HOST: Found ${hostMessages.length} messages`);
    
    expect(hostMessages.length).toBeGreaterThanOrEqual(2); // Should have at least 2 messages
    
    // Check first message (host's own message) - should be on the RIGHT
    const hostFirstMessage = hostMessages[0];
    const hostFirstMessageBox = await hostFirstMessage.boundingBox();
    const hostViewportWidth = 390; // iPhone width
    const hostFirstMessageRightEdge = hostFirstMessageBox!.x + hostFirstMessageBox!.width;
    
    console.log(`🏠 HOST: First message (own) right edge: ${hostFirstMessageRightEdge}, viewport width: ${hostViewportWidth}`);
    
    // Host's own message should be on the right side (right edge close to viewport width)
    expect(hostFirstMessageRightEdge).toBeGreaterThan(hostViewportWidth * 0.6); // At least 60% to the right
    
    if (hostMessages.length >= 2) {
      // Check second message (guest's message) - should be on the LEFT
      const hostSecondMessage = hostMessages[1];
      const hostSecondMessageBox = await hostSecondMessage.boundingBox();
      
      console.log(`🏠 HOST: Second message (partner) left edge: ${hostSecondMessageBox!.x}`);
      
      // Guest's message should be on the left side (left edge close to 0)
      expect(hostSecondMessageBox!.x).toBeLessThan(hostViewportWidth * 0.4); // At most 40% from left
    }

    // Step 9: Verify message alignment on GUEST view
    console.log('🔍 Verifying message alignment on GUEST view...');
    
    // Get all message bubbles on guest page
    const guestMessages = await guestPage.locator('[data-testid^="message-bubble"]').all();
    console.log(`👥 GUEST: Found ${guestMessages.length} messages`);
    
    expect(guestMessages.length).toBeGreaterThanOrEqual(2); // Should have at least 2 messages
    
    // Check first message (host's message) - should be on the LEFT
    const guestFirstMessage = guestMessages[0];
    const guestFirstMessageBox = await guestFirstMessage.boundingBox();
    
    console.log(`👥 GUEST: First message (partner) left edge: ${guestFirstMessageBox!.x}`);
    
    // Host's message should be on the left side for guest
    expect(guestFirstMessageBox!.x).toBeLessThan(hostViewportWidth * 0.4); // At most 40% from left
    
    if (guestMessages.length >= 2) {
      // Check second message (guest's own message) - should be on the RIGHT
      const guestSecondMessage = guestMessages[1];
      const guestSecondMessageBox = await guestSecondMessage.boundingBox();
      const guestSecondMessageRightEdge = guestSecondMessageBox!.x + guestSecondMessageBox!.width;
      
      console.log(`👥 GUEST: Second message (own) right edge: ${guestSecondMessageRightEdge}`);
      
      // Guest's own message should be on the right side
      expect(guestSecondMessageRightEdge).toBeGreaterThan(hostViewportWidth * 0.6); // At least 60% to the right
    }

    console.log('✅ Message alignment verification completed successfully!');
  });
});