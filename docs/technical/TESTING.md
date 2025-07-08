# 🧪 Testing Guide - Quality Assurance

Comprehensive guide to testing strategies, tools, and best practices for the Real-time Translator.

---

## 🎯 Testing Philosophy

### Testing Pyramid

```
        🔺 Manual Testing (5%)
       /   \  - User experience validation
      /     \  - Cross-device testing
     /       \  - Accessibility testing
    /_________\
   🔺 E2E Tests (25%)
  /   \        - Critical user flows
 /     \       - Integration testing  
/       \      - Real-time features
/_______\
🔺 Unit Tests (70%)
- Component logic
- Service functions
- Utility functions
- Error handling
```

### Testing Strategy

**Unit Tests (Vitest)**:
- Individual component behavior
- Service function logic
- Utility calculations
- Error handling edge cases

**E2E Tests (Playwright)**:
- Complete user workflows
- Real-time features
- Cross-browser compatibility
- Performance validation

**Manual Testing**:
- Accessibility with screen readers
- Mobile device testing
- Voice input quality
- Network condition validation

---

## 🚀 Running Tests

### Quick Commands

```bash
# Unit Tests
npm test                 # Run all unit tests
npm run test:ui         # Run with visual UI
npm run test:coverage   # Generate coverage report

# E2E Tests  
npx playwright test                           # All E2E tests
npx playwright test tests/critical-fixes-test.spec.ts  # Specific test
npx playwright test --headed                 # Visual browser (debugging)
npx playwright test --ui                     # Interactive test runner

# Quality Checks
npm run lint            # ESLint validation
npm run type-check      # TypeScript validation
npm run build           # Production build test
```

### Test Environments

**Local Development**:
```bash
# Start dev server first
npm run dev

# Run tests in another terminal
npm test                # Unit tests (no server needed)
npx playwright test     # E2E tests (needs server running)
```

**CI/CD Pipeline**:
```bash
# Automated testing sequence
npm run type-check && npm run lint && npm test && npm run build
```

---

## 🧪 Unit Testing (Vitest)

### Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'happy-dom',  // Fast DOM simulation
    globals: true,             // No import needed for test functions
    setupFiles: './src/test/setup.ts'
  }
})
```

### Component Testing Patterns

**Basic Component Test**:
```typescript
// Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'

describe('Button Component', () => {
  test('renders correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Click me')
  })

  test('handles click events', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  test('shows loading state', () => {
    render(<Button loading>Loading</Button>)
    
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  test('supports accessibility', () => {
    render(<Button ariaLabel="Save document">Save</Button>)
    
    expect(screen.getByLabelText('Save document')).toBeInTheDocument()
  })
})
```

**Service Testing**:
```typescript
// TranslationService.test.ts
import { TranslationService } from './TranslationService'

// Mock OpenAI API
vi.mock('@/lib/openai', () => ({
  getOpenAIClient: () => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Hola mundo' } }],
          usage: { prompt_tokens: 10, completion_tokens: 5 }
        })
      }
    }
  })
}))

describe('TranslationService', () => {
  test('translates text correctly', async () => {
    const result = await TranslationService.translate(
      'Hello world',
      'English',
      'Spanish',
      'casual'
    )

    expect(result.translatedText).toBe('Hola mundo')
    expect(result.originalLanguage).toBe('English')
    expect(result.targetLanguage).toBe('Spanish')
  })

  test('handles API errors gracefully', async () => {
    // Mock API error
    vi.mocked(getOpenAIClient().chat.completions.create)
      .mockRejectedValueOnce(new Error('API Error'))

    await expect(
      TranslationService.translate('test', 'English', 'Spanish', 'casual')
    ).rejects.toThrow('API Error')
  })
})
```

**Hook Testing**:
```typescript
// useAccessibility.test.ts
import { renderHook, act } from '@testing-library/react'
import { useAccessibility } from './useAccessibility'

describe('useAccessibility', () => {
  test('detects reduced motion preference', () => {
    // Mock media query
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    })

    const { result } = renderHook(() => useAccessibility())
    expect(result.current.reducedMotion).toBe(true)
  })

  test('announces messages to screen readers', () => {
    const { result } = renderHook(() => useAccessibility())
    
    act(() => {
      result.current.announce('Test message', 'polite')
    })

    // Verify announcement was made (implementation depends on announcement method)
  })
})
```

### Testing Utilities

**Test Setup** (`src/test/setup.ts`):
```typescript
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock browser APIs
global.fetch = vi.fn()
global.navigator.mediaDevices = {
  getUserMedia: vi.fn().mockResolvedValue(new MediaStream())
}

// Mock environment variables
vi.mock.env = {
  VITE_OPENAI_API_KEY: 'test-key',
  VITE_SUPABASE_URL: 'https://test.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'test-anon-key'
}

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks()
})
```

**Custom Render Function**:
```typescript
// test-utils.tsx
import { render } from '@testing-library/react'
import { ThemeProvider } from '@/contexts/ThemeContext'

export function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ThemeProvider>
      {ui}
    </ThemeProvider>
  )
}

// Re-export everything
export * from '@testing-library/react'
export { renderWithProviders as render }
```

---

## 🎭 E2E Testing (Playwright)

### Configuration

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ]
})
```

### E2E Test Patterns

**Basic User Flow Test**:
```typescript
// basic-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Translation Flow', () => {
  test('user can translate text message', async ({ page }) => {
    console.log('🧪 Testing basic translation flow')
    
    // Navigate to translator
    await page.goto('/translator')
    await expect(page.locator('text=Voice')).toBeVisible()
    
    // Switch to text mode
    await page.click('text=Type')
    await expect(page.locator('input[placeholder*="Type your message"]')).toBeVisible()
    
    // Enter text and submit
    const input = page.locator('input[placeholder*="Type your message"]')
    await input.fill('Hello world')
    await input.press('Enter')
    
    // Wait for translation to appear
    await page.waitForTimeout(3000)
    
    // Verify translation appeared
    const messageList = page.locator('[data-testid="message-list"]')
    await expect(messageList).toContainText('Hello world')
    
    console.log('✅ Translation flow completed successfully')
  })
})
```

**Real-time Features Test**:
```typescript
// realtime.spec.ts
test('real-time message synchronization', async ({ browser }) => {
  // Create two browser contexts (simulate two users)
  const context1 = await browser.newContext()
  const context2 = await browser.newContext()
  
  const page1 = await context1.newPage()
  const page2 = await context2.newPage()
  
  // User 1 creates session
  await page1.goto('/')
  await page1.click('text=Create Session')
  const sessionCode = await page1.locator('[data-testid="session-code"]').textContent()
  
  // User 2 joins session
  await page2.goto('/')
  await page2.click('text=Join Session')
  await page2.fill('input[placeholder="Enter session code"]', sessionCode!)
  await page2.click('text=Join')
  
  // User 1 sends message
  await page1.click('text=Type')
  await page1.fill('input[placeholder*="message"]', 'Hello from user 1')
  await page1.press('Enter')
  
  // Verify User 2 receives message
  await expect(page2.locator('text=Hello from user 1')).toBeVisible({ timeout: 5000 })
  
  await context1.close()
  await context2.close()
})
```

**Performance Testing**:
```typescript
// performance.spec.ts
test('translation performance meets requirements', async ({ page }) => {
  await page.goto('/translator')
  
  // Start performance monitoring
  const startTime = Date.now()
  
  // Trigger translation
  await page.click('text=Type')
  await page.fill('input[placeholder*="message"]', 'Performance test message')
  await page.press('Enter')
  
  // Wait for translation to complete
  await page.waitForSelector('[data-testid="translation-complete"]')
  
  const endTime = Date.now()
  const duration = endTime - startTime
  
  // Assert performance requirement (sub-100ms feedback + ~3s total)
  expect(duration).toBeLessThan(5000) // 5 second maximum
  
  console.log(`⚡ Translation completed in ${duration}ms`)
})
```

**Accessibility Testing**:
```typescript
// accessibility.spec.ts
test('keyboard navigation works correctly', async ({ page }) => {
  await page.goto('/translator')
  
  // Test tab navigation
  await page.keyboard.press('Tab') // Should focus first interactive element
  await expect(page.locator(':focus')).toBeVisible()
  
  // Test arrow key navigation (if applicable)
  await page.keyboard.press('ArrowDown')
  
  // Test Enter key activation
  await page.keyboard.press('Enter')
  
  // Verify screen reader announcements
  const announcements = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[aria-live]'))
      .map(el => el.textContent)
      .filter(Boolean)
  })
  
  expect(announcements.length).toBeGreaterThan(0)
})
```

### Console Logging in E2E Tests

**Comprehensive Logging Pattern**:
```typescript
test('feature with detailed logging', async ({ page }) => {
  console.log('🧪 Starting feature test')
  
  // Capture console logs from the page
  const consoleLogs: string[] = []
  page.on('console', msg => {
    const text = msg.text()
    consoleLogs.push(text)
    
    // Log important messages to test output
    if (text.includes('🎯') || text.includes('✅') || text.includes('❌')) {
      console.log(`📱 Page log: ${text}`)
    }
  })
  
  // Test implementation
  await page.goto('/translator')
  await page.waitForTimeout(1000)
  
  // Analyze console logs
  const errors = consoleLogs.filter(log => log.includes('ERROR') || log.includes('❌'))
  const successes = consoleLogs.filter(log => log.includes('✅'))
  
  console.log(`📊 Test results: ${successes.length} successes, ${errors.length} errors`)
  
  if (errors.length > 0) {
    console.log('❌ Errors found:', errors)
  }
  
  expect(errors.length).toBe(0)
  console.log('🎉 Test completed successfully')
})
```

---

## 🛠️ Testing Best Practices

### Test Organization

**File Structure**:
```
tests/
├── unit/
│   ├── components/
│   ├── services/
│   └── utils/
├── e2e/
│   ├── critical-flows/
│   ├── regression/
│   └── performance/
└── fixtures/
    ├── mock-data.ts
    └── test-utils.ts
```

**Naming Conventions**:
```typescript
// Unit tests
ComponentName.test.tsx
serviceName.test.ts
utilityName.test.ts

// E2E tests  
feature-flow.spec.ts
critical-path.spec.ts
regression-fix.spec.ts
```

### Test Data Management

**Mock Data**:
```typescript
// fixtures/mock-data.ts
export const mockSession = {
  id: 'test-session-id',
  code: '1234',
  created_at: '2025-01-01T00:00:00Z',
  expires_at: '2025-01-01T04:00:00Z',
  is_active: true,
  user_count: 2,
  last_activity: '2025-01-01T00:00:00Z'
}

export const mockMessage = {
  id: 'test-message-id',
  session_id: 'test-session-id',
  user_id: 'test-user-id',
  original: 'Hello world',
  translation: 'Hola mundo',
  original_lang: 'en',
  target_lang: 'es',
  status: 'displayed' as const,
  timestamp: '2025-01-01T00:00:00Z'
}
```

**Environment Variables**:
```typescript
// test environment setup
process.env.VITE_OPENAI_API_KEY = 'test-key'
process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
```

### Debugging Tests

**Test Debugging Strategies**:

1. **Verbose Logging**:
```typescript
test('debug test', async ({ page }) => {
  // Enable verbose logging
  page.on('console', msg => console.log(`🔍 ${msg.text()}`))
  page.on('pageerror', err => console.error(`💥 Page error:`, err))
  page.on('requestfailed', req => console.error(`🌐 Request failed:`, req.url()))
  
  // Your test implementation
})
```

2. **Screenshots on Failure**:
```typescript
// playwright.config.ts
use: {
  screenshot: 'only-on-failure',
  video: 'retain-on-failure'
}
```

3. **Interactive Debugging**:
```bash
# Run single test with UI
npx playwright test specific-test.spec.ts --ui

# Run with headed browser
npx playwright test --headed --timeout=0
```

4. **Test Isolation**:
```typescript
test.describe.configure({ mode: 'serial' }) // Run tests in order
test.describe.configure({ mode: 'parallel' }) // Run tests in parallel
```

---

## 🎯 Critical Test Scenarios

### Must-Have Test Coverage

**1. Translation Pipeline**:
```typescript
// Complete translation flow
test('end-to-end translation pipeline', async ({ page }) => {
  // Voice input → Whisper → Translation → Display
  // Text input → Translation → Display
  // Error handling and retry logic
})
```

**2. Real-time Synchronization**:
```typescript
// Multi-user session testing
test('real-time message sync between users', async ({ browser }) => {
  // Session creation and joining
  // Message broadcasting
  // Activity indicators
  // Connection recovery
})
```

**3. Mobile Experience**:
```typescript
// Mobile-specific testing
test('mobile touch interactions', async ({ page }) => {
  // Touch recording controls
  // Swipe gestures
  // Keyboard behavior
  // Audio permissions
})
```

**4. Network Resilience**:
```typescript
// Network condition testing
test('handles network interruptions', async ({ page }) => {
  // Slow network simulation
  // Connection loss/recovery
  // Retry mechanisms
  // Offline mode
})
```

**5. Accessibility Compliance**:
```typescript
// A11y testing
test('meets WCAG 2.1 AA standards', async ({ page }) => {
  // Keyboard navigation
  // Screen reader compatibility
  // Color contrast
  // Focus management
})
```

### Performance Benchmarks

**Response Time Requirements**:
```typescript
// Performance assertions
expect(userFeedbackTime).toBeLessThan(100) // Sub-100ms feedback
expect(translationTime).toBeLessThan(5000) // 5 second max translation
expect(uiRenderTime).toBeLessThan(16) // 60fps UI updates
```

---

## 🔧 CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm test
      - run: npm run build
      
      - name: Run E2E Tests
        run: |
          npm run dev &
          npx wait-on http://127.0.0.1:5173
          npx playwright test
```

### Quality Gates

**Pre-commit Hooks**:
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run type-check && npm test",
      "pre-push": "npm run lint && npm run build"
    }
  }
}
```

**Coverage Requirements**:
```typescript
// vitest.config.ts
test: {
  coverage: {
    reporter: ['text', 'html'],
    thresholds: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    }
  }
}
```

---

## 🔗 Related Documentation

- **[SETUP.md](./SETUP.md)** - Development environment setup for testing
- **[API.md](./API.md)** - Service mocking and integration testing
- **[COMPONENTS.md](./COMPONENTS.md)** - Component testing patterns
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Test debugging solutions

---

## 📋 Testing Checklist

### Before Committing
- [ ] All unit tests pass (`npm test`)
- [ ] Type checking passes (`npm run type-check`) 
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Critical E2E tests pass

### Before Releasing
- [ ] Full E2E test suite passes
- [ ] Cross-browser testing completed
- [ ] Mobile device testing completed
- [ ] Accessibility testing completed
- [ ] Performance benchmarks met
- [ ] Test coverage > 80%

### Writing New Tests
- [ ] Test covers happy path and error cases
- [ ] Accessibility considerations included
- [ ] Mobile-specific behavior tested
- [ ] Performance implications considered
- [ ] Documentation updated