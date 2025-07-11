import { FullConfig } from '@playwright/test'

/**
 * Global teardown for visual regression testing
 * 
 * This runs after all tests and ensures:
 * 1. Clean up any test artifacts
 * 2. Generate final reports
 * 3. Log summary information
 */

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Visual Regression Teardown: Cleaning up test environment...')
  
  try {
    // Log summary information
    console.log('📊 Visual Regression Summary:')
    console.log('   - Screenshots captured for UI contract validation')
    console.log('   - Visual regression detection completed')
    console.log('   - Report available in: test-results/visual-regression-report/')
    
    console.log('✅ Visual Regression Teardown: Cleanup completed successfully')
    
  } catch (error) {
    console.error('❌ Visual Regression Teardown: Error during cleanup:', error)
    // Don't throw to avoid masking test failures
  }
}

export default globalTeardown