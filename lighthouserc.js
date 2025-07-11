export default {
  ci: {
    collect: {
      // Test our production URL directly
      url: ['https://translator-v3.vercel.app'],
      
      // Don't use static dist directory
      staticDistDir: null,
      
      // Simulate various devices
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
        preset: 'desktop'
      },
      
      // Number of runs for consistent results
      numberOfRuns: 1
    },
    
    assert: {
      // Define what we consider "passing" scores
      assertions: {
        // Performance
        'categories:performance': ['warn', { minScore: 0.8 }],
        
        // Accessibility (this will catch your contrast issues!)
        'categories:accessibility': ['error', { minScore: 0.9 }],
        
        // Best Practices
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        
        // SEO
        'categories:seo': ['warn', { minScore: 0.8 }],
        
        // Specific checks for your issues
        'color-contrast': 'error',
        'touch-targets': 'error',
        'font-size': 'error',
        'tap-targets': 'error'
      }
    },
    
    upload: {
      target: 'temporary-public-storage'
    }
  }
}