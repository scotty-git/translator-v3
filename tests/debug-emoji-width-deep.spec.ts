import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test';

test.describe('Deep Debug Emoji Width', () => {
  let hostContext: BrowserContext;
  let hostPage: Page;

  test.beforeAll(async () => {
    const browser = await chromium.launch({ headless: true });
    
    hostContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
    });

    hostPage = await hostContext.newPage();
  });

  test.afterAll(async () => {
    await hostContext.close();
  });

  test('debug emoji picker width measurements', async () => {
    const VERCEL_URL = 'https://translator-v3.vercel.app';

    // Set up session with host only
    await hostPage.goto(VERCEL_URL);
    await hostPage.waitForLoadState('networkidle');
    await hostPage.getByText('Start Session').click();
    await hostPage.waitForURL(/.*\/session.*/);
    await hostPage.waitForLoadState('networkidle');
    
    await hostPage.waitForSelector('span.font-mono', { timeout: 15000 });

    // Switch to text mode and send a message
    await hostPage.locator('button[title="Text input"]').click();
    await hostPage.waitForSelector('input[placeholder="Type message..."]');

    const hostInput = hostPage.locator('input[placeholder="Type message..."]');
    await hostInput.fill('debug test');
    await hostPage.getByText('Send').click();
    
    await hostPage.waitForSelector('[data-testid^="message-bubble"]', { timeout: 20000 });
    await hostPage.waitForTimeout(3000);

    // Try to trigger the emoji picker
    console.log('🔍 Attempting to open emoji picker...');
    const message = hostPage.locator('[data-testid^="message-bubble"]').first();
    await message.click({ delay: 600, force: true });

    const pickerSelector = '[role="dialog"][aria-label="Emoji reaction picker"]';
    await hostPage.waitForSelector(pickerSelector, { timeout: 10000 });
    
    // Debug the actual HTML and CSS
    const pickerElement = await hostPage.locator(pickerSelector);
    
    // Get computed styles
    const computedStyles = await pickerElement.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        width: styles.width,
        maxWidth: styles.maxWidth,
        minWidth: styles.minWidth,
        boxSizing: styles.boxSizing,
        display: styles.display,
        position: styles.position,
        left: styles.left,
        top: styles.top,
        inlineStyles: el.getAttribute('style'),
        classList: Array.from(el.classList),
        innerHTML: el.innerHTML.substring(0, 200) + '...'
      };
    });
    
    console.log('🎯 Computed Styles:', JSON.stringify(computedStyles, null, 2));
    
    // Get bounding box
    const bounds = await pickerElement.boundingBox();
    console.log('📏 Bounding Box:', JSON.stringify(bounds, null, 2));
    
    // Check if our CSS rules are applied
    const cssRules = await hostPage.evaluate(() => {
      const picker = document.querySelector('[role="dialog"][aria-label="Emoji reaction picker"]');
      if (!picker) return null;
      
      const sheets = Array.from(document.styleSheets);
      const rules = [];
      
      for (const sheet of sheets) {
        try {
          const cssRules = Array.from(sheet.cssRules || []);
          for (const rule of cssRules) {
            if (rule.selectorText && rule.selectorText.includes('role="dialog"')) {
              rules.push({
                selector: rule.selectorText,
                styles: rule.style.cssText
              });
            }
          }
        } catch (e) {
          // Skip CORS-blocked stylesheets
        }
      }
      
      return rules;
    });
    
    console.log('📋 Matching CSS Rules:', JSON.stringify(cssRules, null, 2));
    
    // Get all parent elements and their styles
    const parentInfo = await pickerElement.evaluate((el) => {
      const parents = [];
      let current = el.parentElement;
      
      while (current && parents.length < 5) {
        const styles = window.getComputedStyle(current);
        parents.push({
          tagName: current.tagName,
          className: current.className,
          width: styles.width,
          maxWidth: styles.maxWidth,
          minWidth: styles.minWidth,
          overflow: styles.overflow,
          position: styles.position
        });
        current = current.parentElement;
      }
      
      return parents;
    });
    
    console.log('👨‍👩‍👧‍👦 Parent Elements:', JSON.stringify(parentInfo, null, 2));
    
    // Take a screenshot for visual debugging
    await hostPage.screenshot({ path: 'test-results/emoji-picker-debug-deep.png' });
    
    console.log('✅ Deep debug completed!');
  });
});