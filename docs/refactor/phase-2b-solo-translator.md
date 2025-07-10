# Phase 2b: Build New SoloTranslator Component

## 🎯 Vibe Check

**What we're doing**: Creating a clean, focused SoloTranslator that only handles single-device translation, using our extracted services.

**Why it's awesome**: No more session logic mixed in! Just pure, simple translation functionality in ~300 lines instead of 1600.

**Time estimate**: 60-90 minutes of Claude working autonomously

## ✅ Success Criteria

- [ ] New SoloTranslator component created
- [ ] Uses only MessageQueue and TranslationPipeline services
- [ ] No session-related code whatsoever
- [ ] Clean, readable component under 400 lines
- [ ] All solo mode features work perfectly
- [ ] Better performance than before
- [ ] Passes all existing solo mode tests

## 🚀 Pre-Flight Checklist

Before starting, verify:
- [ ] Phase 2a is complete (shared components ready)
- [ ] All services from Phase 1 are working
- [ ] Dev server is running: `npm run dev`
- [ ] All tests pass: `npm test`
- [ ] Create safety commit: `git add -A && git commit -m "chore: pre-phase-2b checkpoint"`
- [ ] Create git tag: `git tag pre-phase-2b`

## 🧪 Automated Test Suite

```typescript
// tests/refactor/phase-2b-validation.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Phase 2b: SoloTranslator Validation', () => {
  test('Basic translation flow works', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173')
    await page.getByText('Solo').click()
    
    // Verify we're in solo mode (no session UI)
    await expect(page.locator('text="Session:"')).not.toBeVisible()
    await expect(page.locator('text="Partner"')).not.toBeVisible()
    
    // Send text message
    await page.click('button[title="Text input"]')
    await page.fill('input[placeholder="Type message..."]', 'Hello world')
    await page.click('button:has-text("Send")')
    
    // Verify translation
    const bubble = page.locator('.message-bubble').first()
    await expect(bubble.locator('.original-text')).toContainText('Hello world')
    await expect(bubble.locator('.translated-text')).toContainText('Hola mundo')
  })

  test('Audio recording works', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173')
    await page.getByText('Solo').click()
    
    // Grant permissions
    await page.context().grantPermissions(['microphone'])
    
    // Record audio
    await page.click('button[data-testid="recording-button"]')
    await page.waitForTimeout(2000)
    await page.click('button[data-testid="recording-button"]')
    
    // Verify message appears
    await expect(page.locator('.message-bubble')).toBeVisible({ timeout: 10000 })
  })

  test('Language switching works', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173')
    await page.getByText('Solo').click()
    
    // Switch to Portuguese
    await page.selectOption('select', 'pt')
    
    // Send message
    await page.click('button[title="Text input"]')
    await page.fill('input[placeholder="Type message..."]', 'Good morning')
    await page.click('button:has-text("Send")')
    
    // Should translate to Portuguese
    await expect(page.locator('.translated-text').last()).toContainText('Bom dia')
  })

  test('Translation modes work', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173')
    await page.getByText('Solo').click()
    
    // Switch to fun mode
    await page.click('button[title*="casual"]')
    await expect(page.locator('button[title*="fun"]')).toBeVisible()
    
    // Send message
    await page.click('button[title="Text input"]')
    await page.fill('input[placeholder="Type message..."]', 'I am happy')
    await page.click('button:has-text("Send")')
    
    // Translation should exist (fun mode adds personality)
    await expect(page.locator('.translated-text').last()).toBeVisible()
  })

  test('No session features visible', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173')
    await page.getByText('Solo').click()
    
    // These should NOT be visible in solo mode
    await expect(page.locator('text="Session:"')).not.toBeVisible()
    await expect(page.locator('text="Connected"')).not.toBeVisible()
    await expect(page.locator('text="Partner"')).not.toBeVisible()
    await expect(page.locator('text="is recording"')).not.toBeVisible()
  })

  test('Performance is good', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173')
    await page.getByText('Solo').click()
    
    const startTime = Date.now()
    
    // Send multiple messages
    for (let i = 0; i < 5; i++) {
      await page.click('button[title="Text input"]')
      await page.fill('input[placeholder="Type message..."]', `Message ${i}`)
      await page.click('button:has-text("Send")')
    }
    
    // Wait for all translations
    await expect(page.locator('.message-bubble')).toHaveCount(5)
    
    const totalTime = Date.now() - startTime
    expect(totalTime).toBeLessThan(10000) // Should handle 5 messages in < 10s
  })
})
```

## 📝 Implementation Steps

### Step 1: Create new SoloTranslator component
Create `src/features/translator/solo/SoloTranslator.tsx`

### Step 2: Import necessary services and components
```typescript
import { MessageQueueService } from '@/services/queues/MessageQueueService'
import { TranslationPipeline } from '@/services/pipeline/TranslationPipeline'
import { 
  MessageBubble,
  AudioVisualization,
  ErrorDisplay,
  ScrollToBottomButton
} from '../shared/components'
```

### Step 3: Define clean props interface
```typescript
interface SoloTranslatorProps {
  messageQueue?: IMessageQueue
  translationPipeline?: ITranslationPipeline
}
```

### Step 4: Implement core functionality
Focus on:
1. Message display from queue
2. Audio recording UI
3. Text input UI
4. Language selection
5. Mode toggle
6. Error handling

### Step 5: Remove all session-related code
Do NOT include:
- Session status
- Partner activity
- Real-time sync
- Connection states
- Any session UI

### Step 6: Optimize component size
Target: Under 400 lines by:
- Using shared components
- Delegating to services
- Minimal state management
- Clean, focused methods

### Step 7: Update routing
Update App.tsx to use new SoloTranslator for solo route

### Step 8: Verify all tests pass
Ensure existing solo mode tests work with new component

## ✅ Validation Steps

After implementation:

1. **Component Size Check**
   ```bash
   wc -l src/features/translator/solo/SoloTranslator.tsx
   # Should be < 400 lines
   ```

2. **Solo Mode Testing**
   ```bash
   npx playwright test tests/refactor/phase-2b-validation.spec.ts
   ```

3. **Code Quality Check**
   - [ ] No session imports
   - [ ] Clean service usage
   - [ ] Proper error handling
   - [ ] Good TypeScript types

## 🔄 Rollback Plan

If something goes wrong:
```bash
# Quick rollback
git checkout pre-phase-2b
npm install
npm run dev
```

## 📋 Completion Protocol

### Claude will:
1. Update this document with:
   - [ ] Final line count
   - [ ] Services used
   - [ ] State management approach
   - [ ] Performance improvements

2. Create summary commit:
   ```bash
   git add -A
   git commit -m "refactor(phase-2b): create focused SoloTranslator component

   - Clean component using extracted services
   - No session logic mixed in
   - Under 400 lines (was 1600+)
   - Better performance
   - All solo features working
   
   All tests passing: ✓"
   ```

3. Update progress tracker

4. Report completion:
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ PHASE 2B COMPLETED
      - New SoloTranslator: XXX lines
      - 75% size reduction!
      - Clean, focused, maintainable
      - Solo mode better than ever
   
   🎯 READY FOR YOUR REVIEW
      Try solo mode - it's so clean now!
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

---

## Implementation Results
*This section will be filled by Claude after completion*

### Final Stats:
- Line count: XXX
- Components used: X
- Services used: X

### Architecture:
```
SoloTranslator
├── MessageQueueService
├── TranslationPipeline
└── Shared Components
```

### Performance:
- 

### Key Improvements:
-