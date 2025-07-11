import { defineConfig, devices } from '@playwright/test'

/**
 * Visual Regression Testing Configuration
 * 
 * This configuration is specifically designed for UI contract testing
 * and visual regression detection during refactoring.
 */

export default defineConfig({
  testDir: './tests/visual-regression',
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'test-results/visual-regression-report' }],
    ['list'],
    ['junit', { outputFile: 'test-results/visual-regression-results.xml' }]
  ],
  
  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://127.0.0.1:5173',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Collect screenshots on failure
    screenshot: 'only-on-failure',
    
    // Collect videos on failure
    video: 'retain-on-failure',
    
    // Global timeout for all actions
    actionTimeout: 10000,
    
    // Global timeout for navigation
    navigationTimeout: 30000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Ensure consistent rendering for screenshots
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
        hasTouch: false,
        isMobile: false,
        // Disable animations for consistent screenshots
        reducedMotion: 'reduce'
      },
    },
    
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        // Ensure consistent rendering for screenshots
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
        hasTouch: false,
        isMobile: false,
        // Disable animations for consistent screenshots
        reducedMotion: 'reduce'
      },
    },
    
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        // Override viewport for consistent mobile screenshots
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        // Disable animations for consistent screenshots
        reducedMotion: 'reduce'
      },
    },
    
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12 Pro'],
        // Override viewport for consistent mobile screenshots
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        // Disable animations for consistent screenshots
        reducedMotion: 'reduce'
      },
    },
  ],

  // Global setup and teardown
  globalSetup: require.resolve('./tests/visual-regression/global-setup.ts'),
  globalTeardown: require.resolve('./tests/visual-regression/global-teardown.ts'),
  
  // Expect configuration for visual comparisons
  expect: {
    // Threshold for visual comparisons (0.1 = 10% difference allowed)
    toHaveScreenshot: {
      threshold: 0.05, // 5% difference allowed
      mode: 'non-zero-diff', // Only fail if there are actual visual differences
      animations: 'disabled' // Disable animations for consistent screenshots
    },
    
    // Global timeout for expect assertions
    timeout: 10000,
  },
  
  // Output directory for test results
  outputDir: 'test-results/visual-regression',
  
  // Directory for storing screenshots
  snapshotDir: 'tests/visual-regression/screenshots',
  
  // Update snapshots mode
  updateSnapshots: process.env.UPDATE_SNAPSHOTS === 'true' ? 'all' : 'missing',
  
  // Web server configuration
  webServer: {
    command: 'npm run dev',
    port: 5173,
    timeout: 30000,
    reuseExistingServer: !process.env.CI,
    // Wait for the server to be ready
    url: 'http://127.0.0.1:5173',
    // Don't show server logs in test output
    stdout: 'ignore',
    stderr: 'pipe',
  },
})