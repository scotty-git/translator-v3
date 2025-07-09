// Puppeteer MCP Mobile Testing Guide
// This shows how to configure Puppeteer for iPhone testing

// Example launch options for iPhone testing
const iPhoneLaunchOptions = {
  headless: true, // Run in background (set to false to see browser)
  defaultViewport: {
    width: 390,      // iPhone 14 Pro width
    height: 844,     // iPhone 14 Pro height
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3
  },
  args: [
    '--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  ]
};

// When using Puppeteer MCP in Claude, you would use these options like this:
// puppeteer_navigate with launchOptions parameter

/* Example MCP calls in Claude:

1. Navigate with iPhone settings:
mcp__puppeteer__puppeteer_navigate
- url: "http://127.0.0.1:5173"
- launchOptions: {
    "headless": true,
    "defaultViewport": {
      "width": 390,
      "height": 844,
      "isMobile": true,
      "hasTouch": true,
      "deviceScaleFactor": 3
    },
    "args": ["--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)..."]
  }

2. Take screenshot:
mcp__puppeteer__puppeteer_screenshot
- name: "test-screenshot"
- width: 390
- height: 844

3. Click element:
mcp__puppeteer__puppeteer_click
- selector: "button[aria-label='Start Translating']"

4. Fill input:
mcp__puppeteer__puppeteer_fill
- selector: "input[name='sessionCode']"
- value: "ABC123"

5. Execute JavaScript:
mcp__puppeteer__puppeteer_evaluate
- script: "document.querySelector('.message').innerText"
*/

// Different iPhone models viewport sizes:
const deviceViewports = {
  'iPhone SE': { width: 375, height: 667, deviceScaleFactor: 2 },
  'iPhone 12/13 mini': { width: 375, height: 812, deviceScaleFactor: 3 },
  'iPhone 12/13': { width: 390, height: 844, deviceScaleFactor: 3 },
  'iPhone 12/13 Pro Max': { width: 428, height: 926, deviceScaleFactor: 3 },
  'iPhone 14 Pro': { width: 393, height: 852, deviceScaleFactor: 3 },
  'iPhone 14 Pro Max': { width: 430, height: 932, deviceScaleFactor: 3 },
  'iPhone 15': { width: 393, height: 852, deviceScaleFactor: 3 },
  'iPhone 15 Pro Max': { width: 430, height: 932, deviceScaleFactor: 3 }
};

// Key differences between Puppeteer MCP and Playwright:
/*
1. Puppeteer MCP runs in a persistent browser session
2. You can change launch options by passing them with navigate
3. Screenshots can be base64 encoded for text output
4. All selectors use CSS syntax (no Playwright's text= or xpath=)
5. No built-in assertions - use puppeteer_evaluate to check values
6. Headless mode works perfectly in background
*/

// Testing workflow example:
/*
1. Navigate to page with iPhone settings
2. Wait for elements using evaluate with promises
3. Take screenshots to verify UI
4. Interact with elements (click, fill, etc)
5. Verify results with evaluate
6. Take final screenshot
*/

// Tips for mobile testing:
/*
- Always set isMobile: true for touch events
- Use appropriate deviceScaleFactor for retina displays
- Set proper user agent for accurate rendering
- Test both portrait and landscape (swap width/height)
- Consider testing different iPhone models
- Use hasTouch: true for touch interactions
*/