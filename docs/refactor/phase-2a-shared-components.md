# Phase 2a: Create TranslatorShared Component Library

## 🎯 Vibe Check

**What we're doing**: Extracting all the shared UI components (MessageBubble, ActivityIndicator, etc.) into a clean component library.

**Why it's awesome**: Both SoloTranslator and SessionTranslator will use the same components. Change once, update everywhere.

**Time estimate**: 30-45 minutes of Claude working autonomously

## ✅ Success Criteria

- [ ] TranslatorShared directory with organized components
- [ ] Clean component interfaces with proper props
- [ ] Components work in both solo and session contexts
- [ ] Consistent styling and behavior
- [ ] TypeScript types are well-defined
- [ ] Components are properly exported
- [ ] No breaking changes to existing UI

## 🚀 Pre-Flight Checklist

Before starting, verify:
- [ ] All Phase 1 services are complete and working
- [ ] Dev server is running: `npm run dev`
- [ ] All tests pass: `npm test`
- [ ] Create safety commit: `git add -A && git commit -m "chore: pre-phase-2a checkpoint"`
- [ ] Create git tag: `git tag pre-phase-2a`

## 🧪 Automated Test Suite

```typescript
// tests/refactor/phase-2a-validation.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Phase 2a: Shared Components Validation', () => {
  test('MessageBubble renders correctly in solo mode', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173')
    await page.getByText('Solo').click()
    
    // Send a message
    await page.click('button[title="Text input"]')
    await page.fill('input[placeholder="Type message..."]', 'Test message')
    await page.click('button:has-text("Send")')
    
    // Verify bubble structure
    const bubble = page.locator('.message-bubble').first()
    await expect(bubble).toBeVisible()
    await expect(bubble.locator('.original-text')).toContainText('Test message')
    await expect(bubble.locator('.translated-text')).toBeVisible()
  })

  test('ActivityIndicator shows in session mode', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    const host = await context1.newPage()
    const guest = await context2.newPage()
    
    // Set up session
    await host.goto('http://127.0.0.1:5173')
    await host.click('button:has-text("Create Session")')
    const code = await host.locator('.font-mono').textContent()
    
    await guest.goto('http://127.0.0.1:5173')
    await guest.click('button:has-text("Join Session")')
    await guest.fill('input', code!)
    await guest.click('button:has-text("Join")')
    
    // Start recording
    await host.context().grantPermissions(['microphone'])
    await host.click('button[data-testid="recording-button"]')
    
    // Verify activity indicator structure
    const indicator = guest.locator('[data-testid="activity-indicator"]')
    await expect(indicator).toBeVisible()
    await expect(indicator).toContainText('Partner is recording')
  })

  test('AudioVisualization component works', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173')
    await page.getByText('Solo').click()
    
    // Grant permissions
    await page.context().grantPermissions(['microphone'])
    
    // Start recording
    await page.click('button[data-testid="recording-button"]')
    
    // Verify visualization
    const viz = page.locator('[data-testid="audio-visualization"]')
    await expect(viz).toBeVisible()
    
    // Stop recording
    await page.click('button[data-testid="recording-button"]')
  })

  test('Shared components maintain consistent styling', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173')
    await page.getByText('Solo').click()
    
    // Take screenshot for visual regression
    await page.screenshot({ path: 'test-results/phase-2a-components.png' })
    
    // Test dark mode
    await page.click('button[data-settings-button]')
    await page.click('button:has-text("Theme")')
    
    // Take dark mode screenshot
    await page.screenshot({ path: 'test-results/phase-2a-components-dark.png' })
  })
})
```

## 📝 Implementation Steps

### Step 1: Create shared components structure
```bash
mkdir -p src/features/translator/shared/components
mkdir -p src/features/translator/shared/types
```

### Step 2: Extract and refactor MessageBubble
1. Copy MessageBubble to shared/components
2. Remove any direct dependencies on parent components
3. Create clean props interface
4. Ensure it works with both solo and session contexts
5. Add data-testid attributes for testing

### Step 3: Extract ActivityIndicator
1. Move to shared/components
2. Make it purely presentational
3. Accept activity state and user info as props
4. Remove any service dependencies

### Step 4: Extract AudioVisualization
1. Move to shared/components
2. Make it accept audioLevel as prop
3. Remove any direct audio manager references
4. Keep visualization logic pure

### Step 5: Extract smaller components
Move these to shared:
- ScrollToBottomButton
- UnreadMessagesDivider
- ErrorDisplay
- Any other shared UI pieces

### Step 6: Create shared types
Create `src/features/translator/shared/types/index.ts`:
```typescript
export interface TranslatorMessage {
  id: string
  original: string
  translation: string | null
  originalLang: string
  targetLang: string
  status: 'queued' | 'processing' | 'displayed' | 'failed'
  timestamp: string
  userId?: string
  sessionId?: string
}

export interface TranslatorProps {
  messages: TranslatorMessage[]
  onSendMessage: (message: TranslatorMessage) => void
  // ... other shared props
}
```

### Step 7: Create index exports
Create `src/features/translator/shared/index.ts` with clean exports

### Step 8: Update imports in SingleDeviceTranslator
Replace local imports with shared component imports

## ✅ Validation Steps

After implementation:

1. **Component Testing**
   ```bash
   npm test -- "shared/components"
   ```

2. **Visual Testing**
   ```bash
   npx playwright test tests/refactor/phase-2a-validation.spec.ts
   ```

3. **Import Verification**
   - [ ] No circular dependencies
   - [ ] Clean import paths
   - [ ] TypeScript happy

## 🔄 Rollback Plan

If something goes wrong:
```bash
# Quick rollback
git checkout pre-phase-2a
npm install
npm run dev
```

## 📋 Completion Protocol

### Claude will:
1. Update this document with:
   - [ ] List of components extracted
   - [ ] Component dependency graph
   - [ ] Any styling adjustments made
   - [ ] TypeScript improvements

2. Create summary commit:
   ```bash
   git add -A
   git commit -m "refactor(phase-2a): create TranslatorShared component library

   - Extracted shared UI components
   - Clean component interfaces
   - Consistent props across contexts
   - Better TypeScript types
   - Ready for component split
   
   All tests passing: ✓"
   ```

3. Update progress tracker

4. Report completion:
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ PHASE 2A COMPLETED
      - Shared component library created
      - X components extracted
      - Clean, reusable interfaces
      - Ready for SoloTranslator build!
   
   🎯 READY FOR YOUR REVIEW
      UI components are now properly organized
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

---

## Implementation Results
*✅ PHASE 2A COMPLETED SUCCESSFULLY - July 10, 2025*

### Components Extracted:
- **MessageBubble** - Complex message display with translation states, TTS, reactions
- **ActivityIndicator** - Real-time status display (recording/processing/idle)
- **AudioVisualization** - 60fps audio level visualization with Web Audio API
- **ScrollToBottomButton** - WhatsApp-style message navigation with unread count
- **UnreadMessagesDivider** - Visual separator for unread messages with auto-fade
- **ErrorDisplay** - Comprehensive error handling with retry actions

### Component Graph:
```
src/features/translator/shared/
├── components/
│   ├── MessageBubble.tsx (self-contained, simplified TTS)
│   ├── ActivityIndicator.tsx (pure presentational)
│   ├── AudioVisualization.tsx (independent animation system)
│   ├── ScrollToBottomButton.tsx (no dependencies)
│   ├── UnreadMessagesDivider.tsx (self-contained timers)
│   ├── ErrorDisplay.tsx (simplified error handling)
│   └── index.ts (clean exports)
├── types/
│   └── index.ts (shared TypeScript interfaces)
└── index.ts (main library export)
```

### Styling Changes:
- **Preserved all existing styles** - zero visual changes
- **Added data-testid attributes** for testing integration
- **Enhanced dark mode support** in ActivityIndicator
- **Maintained responsive design** across all components
- **Kept animation systems intact** (pulse, scale, fade effects)

### TypeScript Improvements:
- **Created TranslatorMessage interface** for component compatibility
- **Added SessionInfo and UserActivity types** for shared state
- **Backward compatibility** with existing QueuedMessage interface
- **Clean prop interfaces** with optional parameters for flexibility
- **Proper generic support** for theme and size variants