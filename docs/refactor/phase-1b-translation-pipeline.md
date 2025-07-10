# Phase 1b: Extract TranslationPipeline Service

## 🎯 Vibe Check

**What we're doing**: Taking the audio → whisper → translation → display pipeline and making it a clean, testable service.

**Why it's awesome**: When translations are slow or failing, you'll have one place to debug instead of jumping between component methods.

**Time estimate**: 60-90 minutes of Claude working autonomously

## ✅ Success Criteria

- [ ] TranslationPipeline service handles full translation flow
- [ ] Clean separation from UI components
- [ ] Maintains all current features (modes, languages, etc.)
- [ ] Performance metrics are easily accessible
- [ ] Error handling is centralized
- [ ] All existing tests pass
- [ ] New pipeline tests provide confidence

## 🚀 Pre-Flight Checklist

Before starting, verify:
- [ ] Phase 1a is complete and working
- [ ] Dev server is running: `npm run dev`
- [ ] All tests pass: `npm test`
- [ ] Create safety commit: `git add -A && git commit -m "chore: pre-phase-1b checkpoint"`
- [ ] Create git tag: `git tag pre-phase-1b`

## 🧪 Automated Test Suite

```typescript
// tests/refactor/phase-1b-validation.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Phase 1b: TranslationPipeline Validation', () => {
  test('Audio recording and translation works', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173')
    await page.getByText('Solo').click()
    
    // Grant microphone permission
    await page.context().grantPermissions(['microphone'])
    
    // Start recording
    await page.click('button[data-testid="recording-button"]')
    await page.waitForTimeout(2000) // Record for 2 seconds
    await page.click('button[data-testid="recording-button"]')
    
    // Wait for translation
    await expect(page.locator('.message-bubble')).toBeVisible({ timeout: 10000 })
    
    // Verify both original and translation exist
    const bubble = page.locator('.message-bubble').first()
    await expect(bubble.locator('.original-text')).toBeVisible()
    await expect(bubble.locator('.translated-text')).toBeVisible()
  })

  test('Text translation pipeline works', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173')
    await page.getByText('Solo').click()
    
    // Switch to text mode
    await page.click('button[title="Text input"]')
    
    // Test each language
    const testCases = [
      { text: 'Hello world', lang: 'es', expected: 'Hola mundo' },
      { text: 'Bonjour', lang: 'en', expected: 'Hello' },
      { text: 'Guten Tag', lang: 'en', expected: 'Good day' }
    ]
    
    for (const testCase of testCases) {
      await page.fill('input[placeholder="Type message..."]', testCase.text)
      await page.click('button:has-text("Send")')
      
      // Verify translation appears
      const bubble = page.locator('.message-bubble').last()
      await expect(bubble).toContainText(testCase.text)
    }
  })

  test('Translation modes work correctly', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173')
    await page.getByText('Solo').click()
    
    // Test casual mode
    await page.click('button[title="Current mode: casual"]')
    await expect(page.locator('button[title*="fun"]')).toBeVisible()
    
    // Send message in fun mode
    await page.click('button[title="Text input"]')
    await page.fill('input[placeholder="Type message..."]', 'I love pizza')
    await page.click('button:has-text("Send")')
    
    // Fun mode should have more expressive translation
    await expect(page.locator('.message-bubble').last()).toBeVisible()
  })

  test('Performance metrics are captured', async ({ page }) => {
    // Intercept console logs
    const metrics: any[] = []
    page.on('console', msg => {
      if (msg.text().includes('Performance:')) {
        metrics.push(msg.text())
      }
    })
    
    await page.goto('http://127.0.0.1:5173')
    await page.getByText('Solo').click()
    
    // Send message
    await page.click('button[title="Text input"]')
    await page.fill('input[placeholder="Type message..."]', 'Test message')
    await page.click('button:has-text("Send")')
    
    // Wait for translation
    await expect(page.locator('.message-bubble')).toBeVisible()
    
    // Verify metrics were logged
    expect(metrics.length).toBeGreaterThan(0)
  })
})
```

## 📝 Implementation Steps

### Step 1: Create pipeline interfaces
Create `src/services/pipeline/types.ts`:
```typescript
export interface TranslationRequest {
  input: string | Blob
  inputType: 'text' | 'audio'
  sourceLanguage?: string
  targetLanguage: string
  mode: 'casual' | 'fun'
  context?: ConversationContext
}

export interface TranslationResult {
  original: string
  translation: string
  detectedLanguage: string
  metrics: {
    whisperTime?: number
    translationTime: number
    totalTime: number
  }
}

export interface ITranslationPipeline {
  translate(request: TranslationRequest): Promise<TranslationResult>
  setWhisperService(service: IWhisperService): void
  setTranslationService(service: ITranslationService): void
}
```

### Step 2: Create TranslationPipeline service
Create `src/services/pipeline/TranslationPipeline.ts`:
1. Extract processAudioMessage logic from SingleDeviceTranslator
2. Extract processTextMessage logic
3. Unify into single translate method
4. Add proper error handling and metrics

### Step 3: Extract Whisper integration
1. Move Whisper service calls into pipeline
2. Handle audio processing
3. Add retry logic

### Step 4: Extract Translation integration  
1. Move GPT translation calls into pipeline
2. Handle language detection
3. Manage conversation context

### Step 5: Update SingleDeviceTranslator
1. Remove processAudioMessage and processTextMessage methods
2. Replace with calls to TranslationPipeline
3. Simplify component to focus on UI

### Step 6: Add comprehensive tests
Create `src/services/pipeline/__tests__/TranslationPipeline.test.ts`

### Step 7: Add performance monitoring
1. Create metrics collection
2. Add timing for each stage
3. Export metrics for debugging

## ✅ Validation Steps

After implementation:

1. **Pipeline Testing**
   ```bash
   npm test -- TranslationPipeline
   ```

2. **Integration Testing**
   ```bash
   npx playwright test tests/refactor/phase-1b-validation.spec.ts
   ```

3. **Performance Check**
   - [ ] Audio translations complete in < 5 seconds
   - [ ] Text translations complete in < 2 seconds
   - [ ] No memory leaks in pipeline

## 🔄 Rollback Plan

If something goes wrong:
```bash
# Quick rollback
git checkout pre-phase-1b
npm install
npm run dev
```

## 📋 Completion Protocol

### Claude will:
1. Update this document with:
   - [ ] Pipeline architecture diagram
   - [ ] Performance improvements found
   - [ ] Test coverage report
   - [ ] Any API changes needed

2. Create summary commit:
   ```bash
   git add -A
   git commit -m "refactor(phase-1b): extract TranslationPipeline service

   - Unified audio and text translation flows
   - Centralized performance metrics
   - Improved error handling
   - Added comprehensive pipeline tests
   - Performance: [metrics here]
   
   All tests passing: ✓"
   ```

3. Update progress in README.md

4. Report completion:
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ PHASE 1B COMPLETED
      - TranslationPipeline extracted successfully
      - Unified audio/text processing
      - Performance metrics now trackable
      - Tests: X unit, Y integration passing
   
   🎯 READY FOR YOUR REVIEW
      The translation flow is now much cleaner!
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

---

## Implementation Results
*This section will be filled by Claude after completion*

### Architecture Diagram:
```
[Component] → [Pipeline] → [Whisper]
                        ↓
                    [Translation]
                        ↓
                    [Result]
```

### Performance Improvements:
- 

### Test Coverage:
- 

### API Changes:
-