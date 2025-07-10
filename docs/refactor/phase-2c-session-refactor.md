# Phase 2c: Refactor SessionTranslator

## 🎯 Vibe Check

**What we're doing**: Cleaning up SessionTranslator to be a pure orchestrator that combines SoloTranslator with real-time services.

**Why it's awesome**: Session mode becomes just "solo mode + real-time sync" instead of a completely different beast.

**Time estimate**: 45-60 minutes of Claude working autonomously

## ✅ Success Criteria

- [ ] SessionTranslator becomes a thin orchestration layer
- [ ] Reuses SoloTranslator for core functionality
- [ ] Clean integration with all services
- [ ] No duplicate translation logic
- [ ] Session features work perfectly
- [ ] Better separation of concerns
- [ ] Easier to understand and debug

## 🚀 Pre-Flight Checklist

Before starting, verify:
- [ ] Phase 2b is complete (SoloTranslator working)
- [ ] All Phase 1 services are working
- [ ] Dev server is running: `npm run dev`
- [ ] All tests pass: `npm test`
- [ ] Create safety commit: `git add -A && git commit -m "chore: pre-phase-2c checkpoint"`
- [ ] Create git tag: `git tag pre-phase-2c`

## 🧪 Automated Test Suite

```typescript
// tests/refactor/phase-2c-validation.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Phase 2c: SessionTranslator Refactor Validation', () => {
  test('Session creation and joining works', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    const host = await context1.newPage()
    const guest = await context2.newPage()
    
    // Host creates session
    await host.goto('http://127.0.0.1:5173')
    await host.click('button:has-text("Create Session")')
    const code = await host.locator('.font-mono').textContent()
    
    // Should show session UI
    await expect(host.locator('text="Session:"')).toBeVisible()
    await expect(host.locator('.font-mono')).toContainText(code!)
    
    // Guest joins
    await guest.goto('http://127.0.0.1:5173')
    await guest.click('button:has-text("Join Session")')
    await guest.fill('input', code!)
    await guest.click('button:has-text("Join")')
    
    // Both see partner online
    await expect(host.locator('text="Partner Online"')).toBeVisible()
    await expect(guest.locator('text="Partner Online"')).toBeVisible()
  })

  test('Real-time message sync works', async ({ browser }) => {
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
    
    // Send message from host
    await host.click('button[title="Text input"]')
    await host.fill('input[placeholder="Type message..."]', 'Hello from host')
    await host.click('button:has-text("Send")')
    
    // Both should see it
    await expect(host.locator('text="Hello from host"')).toBeVisible()
    await expect(guest.locator('text="Hello from host"')).toBeVisible()
    
    // Send from guest
    await guest.click('button[title="Text input"]')
    await guest.fill('input[placeholder="Type message..."]', 'Hi from guest')
    await guest.click('button:has-text("Send")')
    
    // Both should see it
    await expect(host.locator('text="Hi from guest"')).toBeVisible()
    await expect(guest.locator('text="Hi from guest"')).toBeVisible()
  })

  test('Activity indicators work', async ({ browser }) => {
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
    
    // Host records
    await host.context().grantPermissions(['microphone'])
    await host.click('button[data-testid="recording-button"]')
    
    // Guest sees indicator
    await expect(guest.locator('text="Partner is recording"')).toBeVisible()
    
    // Stop recording
    await host.click('button[data-testid="recording-button"]')
    
    // Indicator disappears
    await expect(guest.locator('text="Partner is recording"')).not.toBeVisible({ timeout: 3000 })
  })

  test('Connection status shows correctly', async ({ page, context }) => {
    await page.goto('http://127.0.0.1:5173')
    await page.click('button:has-text("Create Session")')
    
    // Should show connected
    await expect(page.locator('text="Connected"')).toBeVisible()
    
    // Simulate offline
    await context.setOffline(true)
    await expect(page.locator('text="Disconnected"')).toBeVisible()
    
    // Back online
    await context.setOffline(false)
    await expect(page.locator('text="Reconnecting"')).toBeVisible()
    await expect(page.locator('text="Connected"')).toBeVisible({ timeout: 10000 })
  })
})
```

## 📝 Implementation Steps

### Step 1: Analyze current SessionTranslator
1. Identify what's truly session-specific
2. Note what duplicates SoloTranslator functionality
3. Plan the refactor approach

### Step 2: Create enhanced props for SoloTranslator
```typescript
interface SessionEnhancedProps {
  // Base translator props
  messageQueue: IMessageQueue
  translationPipeline: ITranslationPipeline
  
  // Session enhancements
  isSessionMode: true
  sessionInfo: SessionInfo
  onMessageSend?: (message: Message) => void
  partnerActivity?: ActivityState
}
```

### Step 3: Refactor SessionTranslator as orchestrator
1. Remove duplicate translation logic
2. Use SoloTranslator as main component
3. Add session services on top:
   - MessageSyncService for real-time sync
   - PresenceService for activity indicators
   - SessionStateManager for session state
   - RealtimeConnection for connection management

### Step 4: Implement message synchronization
1. Intercept messages from SoloTranslator
2. Send through MessageSyncService
3. Receive partner messages
4. Add to shared message queue

### Step 5: Add session UI enhancements
1. Session header with code and status
2. Partner online/offline indicator
3. Connection status display
4. Activity indicators from PresenceService

### Step 6: Handle cleanup properly
1. Clean up services on unmount
2. Clear session state
3. Unsubscribe from all channels

### Step 7: Update imports and routing
Ensure App.tsx uses refactored SessionTranslator

## ✅ Validation Steps

After implementation:

1. **Session Testing**
   ```bash
   npx playwright test tests/refactor/phase-2c-validation.spec.ts
   ```

2. **Service Integration**
   - [ ] All services initialize correctly
   - [ ] Clean cleanup on exit
   - [ ] No memory leaks

3. **Code Quality**
   - [ ] No duplicate logic with SoloTranslator
   - [ ] Clean service orchestration
   - [ ] Good error handling

## 🔄 Rollback Plan

If something goes wrong:
```bash
# Quick rollback
git checkout pre-phase-2c
npm install
npm run dev
```

## 📋 Completion Protocol

### Claude will:
1. Update this document with:
   - [ ] Architecture diagram
   - [ ] Service integration approach
   - [ ] Lines of code saved
   - [ ] Complexity reduction metrics

2. Create summary commit:
   ```bash
   git add -A
   git commit -m "refactor(phase-2c): clean SessionTranslator orchestration

   - Reuses SoloTranslator for core functionality
   - Clean service orchestration
   - No duplicate translation logic
   - Better separation of concerns
   - Easier to understand and debug
   
   All tests passing: ✓"
   ```

3. Update progress tracker

4. Report completion:
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ PHASE 2C COMPLETED
      - SessionTranslator is now an orchestrator
      - Reuses SoloTranslator + services
      - Much cleaner architecture
      - Ready for final cleanup!
   
   🎯 READY FOR YOUR REVIEW
      Session mode is so much cleaner now!
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

---

## Implementation Results
*This section will be filled by Claude after completion*

### Architecture:
```
SessionTranslator (orchestrator)
├── SoloTranslator (core UI)
├── MessageSyncService
├── PresenceService
├── SessionStateManager
└── RealtimeConnection
```

### Code Reduction:
- Before: XXX lines
- After: XXX lines
- Saved: XX%

### Complexity Metrics:
-