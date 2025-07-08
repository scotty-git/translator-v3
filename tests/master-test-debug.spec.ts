import { test, expect } from '@playwright/test';

test.describe('Master Test Suite Debug', () => {
  test.beforeEach(async ({ page }) => {
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ Browser Error: ${msg.text()}`);
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      console.log(`💥 Page Error: ${error.message}`);
    });
  });

  test('should test basic test page loads without errors', async ({ page }) => {
    console.log('🧪 Testing basic test page...');
    await page.goto('http://127.0.0.1:5173/test/basic');
    
    // Wait for page to load
    await page.waitForSelector('h1', { timeout: 5000 });
    
    // Check if page loaded successfully
    const title = await page.textContent('h1');
    expect(title).toBe('Basic Test');
    
    console.log('✅ Basic test page loads successfully');
  });

  test('should test simple master test suite', async ({ page }) => {
    console.log('🧪 Testing simple master test suite...');
    await page.goto('http://127.0.0.1:5173/test/master-simple');
    
    // Wait for page to load
    await page.waitForSelector('h1', { timeout: 5000 });
    
    // Check if page loaded successfully
    const title = await page.textContent('h1');
    expect(title).toBe('Master Test Suite (Simplified)');
    
    console.log('✅ Simple master test suite loads successfully');
  });

  test('should identify what breaks in full master test suite', async ({ page }) => {
    console.log('🧪 Testing full master test suite...');
    
    // Capture any errors
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    try {
      await page.goto('http://127.0.0.1:5173/test/master', { timeout: 10000 });
      
      // Try to wait for the page to load
      await page.waitForSelector('h1', { timeout: 5000 });
      
      const title = await page.textContent('h1');
      console.log(`✅ Full master test suite loads! Title: ${title}`);
      
    } catch (error) {
      console.log('❌ Full master test suite failed to load');
      console.log(`Error: ${error.message}`);
      
      // Print all captured errors
      if (errors.length > 0) {
        console.log('\n📋 Captured Errors:');
        errors.forEach((err, index) => {
          console.log(`${index + 1}. ${err}`);
        });
      }
      
      // Check if error boundary is shown
      try {
        const errorBoundary = await page.textContent('body');
        if (errorBoundary?.includes('Something went wrong')) {
          console.log('🛡️ Error boundary activated - React component crashed');
        }
      } catch {}
      
      throw error;
    }
  });

  test('should test working master test suite', async ({ page }) => {
    console.log('🧪 Testing working master test suite...');
    
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    try {
      await page.goto('http://127.0.0.1:5173/test/master-working', { timeout: 10000 });
      
      await page.waitForSelector('h1', { timeout: 5000 });
      
      const title = await page.textContent('h1');
      console.log(`✅ Working master test suite loads! Title: ${title}`);
      
    } catch (error) {
      console.log('❌ Working master test suite failed to load');
      console.log(`Error: ${error.message}`);
      
      if (errors.length > 0) {
        console.log('\n📋 Captured Errors:');
        errors.forEach((err, index) => {
          console.log(`${index + 1}. ${err}`);
        });
      }
      
      throw error;
    }
  });

  test('should test individual imports systematically', async ({ page }) => {
    console.log('🧪 Testing imports systematically...');
    
    // Create a test page that imports one service at a time
    const importTests = [
      '@/services/supabase',
      '@/lib/openai', 
      '@/lib/performance',
      '@/lib/network-quality',
      '@/lib/quality-degradation',
      '@/lib/progress-preservation',
      '@/lib/cache/CacheManager',
      '@/lib/errors/ErrorManager',
      '@/lib/retry/RetryManager',
      '@/lib/permissions/PermissionManager',
      '@/lib/accessibility/AccessibilityManager',
      '@/lib/pwa/PWAManager',
      '@/features/conversation/ConversationManager',
      '@/lib/user/UserManager',
      '@/lib/ios-audio-context'
    ];

    for (let i = 0; i < importTests.length; i++) {
      const importPath = importTests[i];
      console.log(`🔍 Testing import ${i + 1}/${importTests.length}: ${importPath}`);
      
      const errors: string[] = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      page.on('pageerror', error => {
        errors.push(error.message);
      });

      // Test the import by evaluating it in the browser
      try {
        await page.goto('http://127.0.0.1:5173/test/basic');
        
        const result = await page.evaluate(async (importPath) => {
          try {
            // @ts-ignore
            const module = await import(importPath);
            return { success: true, exports: Object.keys(module) };
          } catch (error) {
            return { success: false, error: error.message };
          }
        }, importPath);

        if (result.success) {
          console.log(`✅ Import ${i + 1} successful: ${importPath} (exports: ${result.exports?.join(', ')})`);
        } else {
          console.log(`❌ Import ${i + 1} failed: ${importPath}`);
          console.log(`   Error: ${result.error}`);
        }
        
        if (errors.length > 0) {
          console.log(`   Console errors: ${errors.join(', ')}`);
        }
        
      } catch (error) {
        console.log(`❌ Import ${i + 1} failed: ${importPath}`);
        console.log(`   Error: ${error.message}`);
      }
      
      // Clear errors for next test
      errors.length = 0;
    }
  });
});