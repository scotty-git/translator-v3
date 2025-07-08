# 🤝 Contributing Guide - Team Guidelines

Welcome to the Real-time Translator project! This guide helps you contribute effectively while maintaining code quality and team collaboration.

---

## 🎯 Contributing Philosophy

### Vibecoder-Friendly Development

This project follows **vibecoder principles**:
- **Practical over perfect** - Ship working features quickly
- **Clear communication** - Code should explain intent
- **Real-world focused** - Solve actual user problems
- **Minimal friction** - Easy setup, clear processes
- **Quality at speed** - Use tools to maintain quality while moving fast

### Team Values

**🚀 Velocity**: Fast iteration with automated quality checks  
**🎨 User Experience**: Mobile-first, accessibility-first design  
**🧪 Reliability**: Comprehensive testing prevents regressions  
**📚 Knowledge Sharing**: Clear documentation enables team success  
**🌍 Inclusivity**: Accessible to users and contributors worldwide

---

## 🚀 Quick Start for Contributors

### 1. Repository Setup
```bash
# Fork and clone
git clone https://github.com/your-username/translator-v3.git
cd translator-v3

# Set up upstream
git remote add upstream https://github.com/original-repo/translator-v3.git

# Install and verify
npm install
npm run dev
npm test
```

### 2. Development Workflow
```bash
# Get latest changes
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name

# Make changes, test, commit
npm test
git add .
git commit -m "feat: your clear description"

# Push and create PR
git push origin feature/your-feature-name
# Then create PR on GitHub
```

### 3. Before Submitting
```bash
# Quality checklist
npm run type-check     # TypeScript validation
npm run lint           # ESLint checks
npm test              # Unit tests
npx playwright test   # E2E tests
npm run build         # Production build
```

---

## 📋 Code Standards

### Naming Conventions

**Files and Directories**:
```
PascalCase/           # Components, features
kebab-case/           # Utilities, services
camelCase.ts          # General files
UPPERCASE.md          # Documentation
```

**Examples**:
```
✅ Good:
src/components/ui/Button.tsx
src/features/translator/SingleDeviceTranslator.tsx
src/lib/audio-utils.ts
src/services/openai/translation.ts

❌ Bad:
src/Components/UI/button.tsx
src/features/Translator/single_device_translator.tsx
src/lib/AudioUtils.ts
```

**Variables and Functions**:
```typescript
// Variables: camelCase
const userMessage = 'Hello world'
const isRecording = false
const targetLanguage = 'es'

// Functions: camelCase verbs
const translateMessage = (text: string) => { ... }
const handleUserInput = (event: Event) => { ... }
const calculateAudioLevel = (stream: MediaStream) => { ... }

// Constants: SCREAMING_SNAKE_CASE
const MAX_RECORDING_DURATION = 60000
const API_ENDPOINTS = { ... }
const DEFAULT_LANGUAGE_CONFIG = { ... }

// Types/Interfaces: PascalCase
interface TranslationResult {
  originalText: string
  translatedText: string
}

type Language = 'English' | 'Spanish' | 'Portuguese'
```

### TypeScript Standards

**Always Use Types**:
```typescript
// ✅ Good: Explicit types
function translateText(
  text: string, 
  fromLang: Language, 
  toLang: Language
): Promise<TranslationResult> {
  // Implementation
}

// ❌ Bad: Any types
function translateText(text: any, fromLang: any, toLang: any): any {
  // Implementation
}
```

**Interface over Type for Objects**:
```typescript
// ✅ Good: Interface for object shapes
interface ButtonProps {
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
}

// ✅ Good: Type for unions/primitives
type Theme = 'light' | 'dark' | 'system'
type Status = 'loading' | 'success' | 'error'
```

**Proper Error Handling**:
```typescript
// ✅ Good: Specific error types
try {
  const result = await translateText(message)
  return result
} catch (error) {
  if (error instanceof NetworkError) {
    // Handle network error
  } else if (error instanceof ValidationError) {
    // Handle validation error
  } else {
    // Handle unknown error
    console.error('Unexpected error:', error)
  }
}

// ❌ Bad: Generic error handling
try {
  const result = await translateText(message)
  return result
} catch (error) {
  console.log('Something went wrong')
}
```

### React Standards

**Component Structure**:
```typescript
// Component file structure
import { ... } from 'react'           // React imports first
import { ... } from 'external-lib'    // External libraries
import { ... } from '@/lib/...'       // Internal utilities
import { ... } from '@/components/...' // Internal components

// Types/interfaces
interface ComponentProps {
  // Props definition
}

// Main component
export function ComponentName({ prop1, prop2 }: ComponentProps) {
  // Hooks
  const [state, setState] = useState()
  const { data } = useCustomHook()
  
  // Event handlers
  const handleClick = () => {
    // Handler logic
  }
  
  // Effects
  useEffect(() => {
    // Effect logic
  }, [dependencies])
  
  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

**Hooks Best Practices**:
```typescript
// ✅ Good: Custom hooks for reusable logic
function useTranslation() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const translate = useCallback(async (text: string) => {
    setIsLoading(true)
    setError(null)
    try {
      // Translation logic
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  return { translate, isLoading, error }
}

// ✅ Good: Dependency arrays
useEffect(() => {
  fetchData()
}, [userId, filters]) // Clear dependencies

// ❌ Bad: Missing dependencies
useEffect(() => {
  fetchData()
}, []) // Missing userId, filters
```

---

## 🎨 UI/UX Guidelines

### Mobile-First Development

**Always start with mobile layout**:
```css
/* ✅ Good: Mobile first */
.component {
  /* Mobile styles (default) */
  padding: 1rem;
  font-size: 1rem;
}

@media (min-width: 768px) {
  .component {
    /* Tablet styles */
    padding: 1.5rem;
    font-size: 1.125rem;
  }
}

/* ❌ Bad: Desktop first */
.component {
  /* Desktop styles */
  padding: 2rem;
  font-size: 1.25rem;
}

@media (max-width: 768px) {
  .component {
    /* Mobile styles as afterthought */
    padding: 1rem;
    font-size: 1rem;
  }
}
```

### Accessibility Requirements

**All interactive elements must**:
```typescript
// ✅ Required accessibility features
<Button
  ariaLabel="Start recording"           // Screen reader text
  ariaDescribedBy="recording-help"      // Additional context
  disabled={isProcessing}               // Proper disabled state
  onClick={handleClick}                 // Keyboard accessible
>
  🎤 Record
</Button>

// ✅ Form accessibility
<Input
  label="Session Code"                  // Visible label
  description="Enter 4-digit room code" // Help text
  required                              // Required indicator
  error={hasError}                      // Error state
  errorMessage="Invalid code format"    // Error message
/>
```

**Color and Contrast**:
```css
/* ✅ Good: Sufficient contrast */
.text-primary { color: #1d4ed8; }      /* 7:1 contrast ratio */
.text-secondary { color: #4b5563; }    /* 4.5:1 contrast ratio */

/* ❌ Bad: Poor contrast */
.text-light-gray { color: #d1d5db; }   /* 2:1 contrast ratio */
```

### Performance Guidelines

**Component Optimization**:
```typescript
// ✅ Good: Memoized expensive components
const ExpensiveComponent = memo(({ data }) => {
  const processedData = useMemo(() => 
    heavyCalculation(data), [data]
  )
  
  return <div>{processedData}</div>
})

// ✅ Good: Debounced user input
const SearchInput = () => {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)
  
  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery)
    }
  }, [debouncedQuery])
}

// ❌ Bad: Unoptimized re-renders
const Component = ({ data }) => {
  const processedData = heavyCalculation(data) // Runs every render
  return <div>{processedData}</div>
}
```

---

## 🧪 Testing Requirements

### Test Coverage Expectations

**Minimum Coverage**:
- **Unit Tests**: 80% line coverage
- **Integration Tests**: All critical user flows
- **E2E Tests**: Happy path + error scenarios
- **Accessibility Tests**: Keyboard navigation, screen reader

### Testing Patterns

**Component Testing**:
```typescript
// ✅ Good: Comprehensive component test
describe('Button Component', () => {
  test('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Click me')
  })

  test('handles click events', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  test('supports accessibility', () => {
    render(<Button ariaLabel="Save document">Save</Button>)
    expect(screen.getByLabelText('Save document')).toBeInTheDocument()
  })

  test('shows loading state', () => {
    render(<Button loading>Loading</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
  })
})
```

**Service Testing**:
```typescript
// ✅ Good: Service with mocked dependencies
describe('TranslationService', () => {
  beforeEach(() => {
    vi.mocked(openaiClient.chat.completions.create).mockResolvedValue({
      choices: [{ message: { content: 'Hola mundo' } }],
      usage: { prompt_tokens: 10, completion_tokens: 5 }
    })
  })

  test('translates text correctly', async () => {
    const result = await TranslationService.translate(
      'Hello world', 'English', 'Spanish', 'casual'
    )

    expect(result.translatedText).toBe('Hola mundo')
    expect(result.originalLanguage).toBe('English')
    expect(result.targetLanguage).toBe('Spanish')
  })

  test('handles API errors gracefully', async () => {
    vi.mocked(openaiClient.chat.completions.create)
      .mockRejectedValueOnce(new Error('API Error'))

    await expect(
      TranslationService.translate('test', 'English', 'Spanish', 'casual')
    ).rejects.toThrow('API Error')
  })
})
```

---

## 🌊 Git Workflow

### Branch Naming

```bash
# Feature development
feature/translation-improvements
feature/mobile-ui-updates
feature/performance-optimization

# Bug fixes
fix/audio-recording-issue
fix/dark-mode-persistence
fix/session-expiry-bug

# Documentation
docs/setup-guide-update
docs/api-documentation

# Hotfixes (production)
hotfix/critical-security-patch
```

### Commit Message Format

```bash
# Format: type(scope): description
#
# Examples:
feat(translator): add voice activity detection
fix(ui): resolve dark mode toggle issue
docs(setup): update environment configuration
test(e2e): add session management tests
perf(audio): optimize recording compression
refactor(services): simplify translation pipeline

# Breaking changes:
feat(api)!: change translation response format

# Longer descriptions:
feat(translator): add voice activity detection

- Implement VAD using Web Audio API
- Add visual feedback for voice detection
- Reduce false positive recordings
- Improve battery life on mobile devices

Closes #123
```

### Pull Request Process

**1. Pre-PR Checklist**:
```bash
# Before creating PR
✅ All tests pass (npm test && npx playwright test)
✅ Code follows style guidelines (npm run lint)
✅ TypeScript compiles (npm run type-check)
✅ Build succeeds (npm run build)
✅ Documentation updated (if needed)
✅ Screenshots included (for UI changes)
```

**2. PR Description Template**:
```markdown
## 🎯 What This PR Does
Brief description of the changes and why they're needed.

## 🧪 Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated  
- [ ] Manual testing completed
- [ ] Accessibility testing completed

## 📱 Mobile Testing
- [ ] iOS Safari tested
- [ ] Android Chrome tested
- [ ] Touch interactions verified

## 🎨 UI Changes
[Screenshots/videos if applicable]

## 📋 Checklist
- [ ] Code follows project standards
- [ ] Documentation updated
- [ ] No console errors
- [ ] Performance impact considered
- [ ] Accessibility maintained

## 🔗 Related Issues
Closes #[issue number]
```

**3. Review Process**:
- **1 Approval Required** for most changes
- **2 Approvals Required** for breaking changes
- **All Checks Must Pass** before merge
- **Squash and Merge** to keep history clean

---

## 🚀 Feature Development Process

### 1. Planning Phase

**Before Writing Code**:
1. **Create Issue** - Document the problem/feature
2. **Design Discussion** - UI/UX considerations
3. **Technical Design** - Architecture decisions
4. **Acceptance Criteria** - Definition of done

### 2. Development Phase

**Feature Branch Workflow**:
```bash
# 1. Create feature branch
git checkout -b feature/amazing-new-feature

# 2. Develop in small commits
git commit -m "feat: add basic UI structure"
git commit -m "feat: implement core logic"
git commit -m "test: add unit tests"
git commit -m "docs: update API documentation"

# 3. Keep branch updated
git fetch upstream
git rebase upstream/main

# 4. Final testing
npm test
npx playwright test
npm run build
```

### 3. Integration Phase

**Pre-merge Requirements**:
- All automated tests pass
- Manual testing completed
- Code review approved
- Documentation updated
- Performance impact assessed

---

## 📚 Documentation Standards

### Code Documentation

**JSDoc for Public APIs**:
```typescript
/**
 * Translates text from one language to another using OpenAI GPT-4o-mini
 * 
 * @param text - The text to translate
 * @param fromLang - Source language (full name: "English", "Spanish", "Portuguese") 
 * @param toLang - Target language (full name: "English", "Spanish", "Portuguese")
 * @param mode - Translation mode: "casual" for natural speech, "fun" for emoji enhancement
 * @param context - Optional conversation context for better translations
 * @returns Promise containing translation result with metadata
 * 
 * @example
 * ```typescript
 * const result = await TranslationService.translate(
 *   "Hello world",
 *   "English", 
 *   "Spanish",
 *   "casual"
 * )
 * console.log(result.translatedText) // "Hola mundo"
 * ```
 */
async function translate(
  text: string,
  fromLang: Language,
  toLang: Language, 
  mode: TranslationMode,
  context?: PromptContext
): Promise<TranslationResult>
```

**Inline Comments for Complex Logic**:
```typescript
// Translation logic: Respect user's target language selection
// If input is already in target language, translate to English instead
if (detectedLangCode === targetLanguage) {
  console.log('📝 RULE: Input already in target language - translating to English instead')
  actualTargetLanguage = 'en'
} else {
  actualTargetLanguage = targetLanguage
  console.log('📝 RULE: Translating to user selected target language')
}
```

### README Updates

**When to Update Documentation**:
- New features added
- API changes
- Setup process changes
- New dependencies
- Breaking changes

---

## 🔧 Development Tools

### Required Tools

**Editor Setup**:
```json
// .vscode/settings.json (recommended)
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

**Extensions** (VSCode):
- ESLint
- TypeScript Hero
- Auto Rename Tag
- Tailwind CSS IntelliSense (for UnoCSS)
- GitLens

### Quality Tools

**Pre-commit Hooks** (Husky):
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run type-check && npm run lint",
      "pre-push": "npm test"
    }
  }
}
```

**Automated Formatting**:
```bash
# Format code
npm run format

# Lint and fix
npm run lint -- --fix

# Type check
npm run type-check
```

---

## 🎯 Performance Guidelines

### Bundle Size

**Keep Bundle Small**:
- **Initial Bundle**: <500KB gzipped
- **Lazy Load**: Non-critical features
- **Tree Shake**: Remove unused code
- **Optimize Images**: Use appropriate formats

**Check Bundle Size**:
```bash
# Analyze bundle
npm run build
npx bundlephobia analyze

# Visual bundle analyzer
npm install --save-dev rollup-plugin-visualizer
# Add to vite.config.ts and run npm run build
```

### Runtime Performance

**Performance Targets**:
- **First Contentful Paint**: <1.5s
- **Largest Contentful Paint**: <2.5s
- **Cumulative Layout Shift**: <0.1
- **First Input Delay**: <100ms

**Performance Testing**:
```typescript
// Performance measurement in tests
test('translation completes within performance target', async ({ page }) => {
  const start = Date.now()
  
  await page.fill('input', 'Hello world')
  await page.press('input', 'Enter')
  await page.waitForSelector('[data-testid="translation-complete"]')
  
  const duration = Date.now() - start
  expect(duration).toBeLessThan(5000) // 5 second max
})
```

---

## 🌍 Internationalization

### Adding New Languages

**1. Update Type Definitions**:
```typescript
// src/types/languages.ts
type Language = 'English' | 'Spanish' | 'Portuguese' | 'French' // Add French
```

**2. Add Translation Keys**:
```typescript
// src/lib/i18n/translations.ts
export const translations = {
  en: { /* English translations */ },
  es: { /* Spanish translations */ },
  pt: { /* Portuguese translations */ },
  fr: { /* French translations */ } // Add French
}
```

**3. Update Services**:
```typescript
// Update OpenAI prompt templates
// Update language detection logic
// Update UI language selector
```

### Translation Guidelines

**Keys Should Be**:
- **Descriptive**: `navigation.home` not `nav1`
- **Hierarchical**: `settings.audio.quality` 
- **Consistent**: Use same verbs/patterns

**Text Should Be**:
- **Inclusive**: Gender-neutral when possible
- **Clear**: Avoid idioms and slang
- **Contextual**: Consider where text appears

---

## 🚨 Security Guidelines

### API Security

**Environment Variables**:
```typescript
// ✅ Good: Use environment variables
const apiKey = import.meta.env.VITE_OPENAI_API_KEY

// ❌ Bad: Hardcoded secrets
const apiKey = 'sk-proj-hardcoded-key'
```

**Input Validation**:
```typescript
// ✅ Good: Validate all inputs
function validateSessionCode(code: string): boolean {
  if (typeof code !== 'string') return false
  if (code.length !== 4) return false
  if (!/^\d{4}$/.test(code)) return false
  return true
}

// ❌ Bad: Trust user input
function joinSession(code: any) {
  // Direct usage without validation
}
```

### Content Security

**Sanitize User Content**:
```typescript
// ✅ Good: Sanitize display content
function displayMessage(text: string) {
  const sanitized = text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  
  return sanitized
}
```

---

## 🎉 Recognition & Rewards

### Contribution Recognition

**Types of Contributions**:
- 🐛 **Bug Fixes** - Resolving issues
- ✨ **Features** - New functionality
- 📚 **Documentation** - Improving guides
- 🧪 **Testing** - Adding test coverage
- 🎨 **UI/UX** - Design improvements
- ⚡ **Performance** - Speed optimizations
- ♿ **Accessibility** - Inclusive design

### Getting Featured

**Hall of Fame** (README.md):
- Major feature contributors
- Significant bug fixes
- Documentation improvements
- Performance optimizations

**How to Get Recognized**:
1. Consistent quality contributions
2. Help others in discussions
3. Improve team processes
4. Mentor new contributors

---

## 📞 Getting Help

### Communication Channels

**For Questions**:
- 💬 **GitHub Discussions** - General questions
- 🐛 **GitHub Issues** - Bug reports
- 📧 **Direct Message** - Sensitive topics

**Response Times**:
- **Bug Reports**: Within 24 hours
- **Feature Requests**: Within 48 hours  
- **Questions**: Within 24 hours
- **Pull Reviews**: Within 48 hours

### Escalation Path

1. **Check Documentation** - README, guides, FAQs
2. **Search Issues** - Existing discussions
3. **Ask Questions** - GitHub Discussions
4. **Create Issue** - For bugs/features
5. **Direct Contact** - For urgent matters

---

## 📋 Onboarding Checklist

### New Contributor Setup

- [ ] **Fork repository** and clone locally
- [ ] **Install dependencies** and verify setup
- [ ] **Run test suite** and ensure all pass
- [ ] **Read documentation** (README, SETUP, ARCHITECTURE)
- [ ] **Make small PR** (fix typo, update docs)
- [ ] **Join discussions** and introduce yourself
- [ ] **Pick good first issue** to start contributing

### First Month Goals

- [ ] **Complete setup** and submit first PR
- [ ] **Fix one bug** or implement small feature
- [ ] **Add tests** for your contributions
- [ ] **Update documentation** for your changes
- [ ] **Help another contributor** in discussions

Welcome to the team! 🎉 Your contributions make this project better for everyone.