# Phase 1e: Extract SessionStateManager Service

## 🎯 Vibe Check

**What we're doing**: Taking all the session creation, participant management, and session validation logic into one clean service.

**Why it's awesome**: No more hunting through components to figure out session state. One service, one source of truth.

**Time estimate**: 30-45 minutes of Claude working autonomously

## ✅ Success Criteria

- [ ] SessionStateManager handles all session operations
- [ ] Clean separation from UI components
- [ ] Session persistence works correctly
- [ ] Participant management is centralized
- [ ] Session validation is consistent
- [ ] Existing session features work
- [ ] Clear session state observability

## 🚀 Pre-Flight Checklist

Before starting, verify:
- [ ] Phases 1a through 1d are complete
- [ ] Dev server is running: `npm run dev`
- [ ] All tests pass: `npm test`
- [ ] Create safety commit: `git add -A && git commit -m "chore: pre-phase-1e checkpoint"`
- [ ] Create git tag: `git tag pre-phase-1e`

## 🧪 Automated Test Suite

```typescript
// tests/refactor/phase-1e-validation.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Phase 1e: SessionStateManager Validation', () => {
  test('Session creation and code generation', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173')
    
    // Create session
    await page.click('button:has-text("Create Session")')
    
    // Should get 4-digit code
    const code = await page.locator('.font-mono').textContent()
    expect(code).toMatch(/^\d{4}$/)
    
    // Session should be persisted
    await page.reload()
    
    // Should still be in session
    await expect(page.locator('.font-mono')).toContainText(code!)
  })

  test('Session joining and participant management', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    const host = await context1.newPage()
    const guest = await context2.newPage()
    
    // Host creates
    await host.goto('http://127.0.0.1:5173')
    await host.click('button:has-text("Create Session")')
    const code = await host.locator('.font-mono').textContent()
    
    // Guest joins
    await guest.goto('http://127.0.0.1:5173')
    await guest.click('button:has-text("Join Session")')
    await guest.fill('input', code!)
    await guest.click('button:has-text("Join")')
    
    // Both should see partner online
    await expect(host.locator('text="Partner Online"')).toBeVisible()
    await expect(guest.locator('text="Partner Online"')).toBeVisible()
    
    // Session info should match
    await expect(guest.locator('.font-mono')).toContainText(code!)
  })

  test('Session validation and expiry', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173')
    
    // Try invalid code
    await page.click('button:has-text("Join Session")')
    await page.fill('input', '9999')
    await page.click('button:has-text("Join")')
    
    // Should show error
    await expect(page.locator('text="Invalid session code"')).toBeVisible()
    
    // Should stay on home screen
    await expect(page.locator('text="Create Session"')).toBeVisible()
  })

  test('Session persistence across navigation', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173')
    
    // Create session
    await page.click('button:has-text("Create Session")')
    const code = await page.locator('.font-mono').textContent()
    
    // Navigate away
    await page.click('button[aria-label="Back"]')
    await expect(page.locator('text="Create Session"')).toBeVisible()
    
    // Navigate back via URL
    await page.goto('http://127.0.0.1:5173/session')
    
    // Should restore session
    await expect(page.locator('.font-mono')).toContainText(code!)
  })
})
```

## 📝 Implementation Steps

### Step 1: Create session state types
Create `src/services/session/types.ts`:
```typescript
export interface SessionState {
  id: string
  code: string
  role: 'host' | 'guest'
  userId: string
  createdAt: string
  expiresAt: string
}

export interface SessionParticipant {
  id: string
  userId: string
  joinedAt: string
  isOnline: boolean
  lastSeen: string
}

export interface ISessionStateManager {
  createSession(): Promise<SessionState>
  joinSession(code: string): Promise<SessionState>
  validateSession(code: string): Promise<boolean>
  
  getCurrentSession(): SessionState | null
  setCurrentSession(session: SessionState): void
  clearSession(): void
  
  addParticipant(sessionId: string, userId: string): Promise<void>
  getParticipants(sessionId: string): Promise<SessionParticipant[]>
  
  persistSession(session: SessionState): void
  restoreSession(): SessionState | null
}
```

### Step 2: Consolidate SessionManager functionality
1. Review existing SessionManager service
2. Identify all session-related logic in components
3. Plan consolidation strategy

### Step 3: Create SessionStateManager
Create `src/services/session/SessionStateManager.ts`:
1. Merge existing SessionManager functionality
2. Add session persistence logic from components
3. Centralize participant management
4. Add proper error handling
5. Implement session expiry logic

### Step 4: Update HomeScreen
1. Remove direct Supabase calls
2. Use SessionStateManager for create/join
3. Simplify component logic

### Step 5: Update SessionTranslator
1. Use SessionStateManager for session state
2. Remove localStorage management
3. Delegate validation to service

### Step 6: Add session monitoring
1. Track active sessions
2. Clean up expired sessions
3. Monitor participant count

### Step 7: Add tests
Create `src/services/session/__tests__/SessionStateManager.test.ts`

## ✅ Validation Steps

After implementation:

1. **Unit Testing**
   ```bash
   npm test -- SessionStateManager
   ```

2. **Integration Testing**
   ```bash
   npx playwright test tests/refactor/phase-1e-validation.spec.ts
   ```

3. **Session Flow Testing**
   - [ ] Create session → Get code
   - [ ] Join with code → Enter session
   - [ ] Refresh page → Session persists
   - [ ] Invalid code → Proper error

## 🔄 Rollback Plan

If something goes wrong:
```bash
# Quick rollback
git checkout pre-phase-1e
npm install
npm run dev
```

## 📋 Completion Protocol

### Claude will:
1. Update this document with:
   - [ ] Session flow diagram
   - [ ] Persistence strategy
   - [ ] Error handling improvements
   - [ ] Test coverage

2. Create summary commit:
   ```bash
   git add -A
   git commit -m "refactor(phase-1e): extract SessionStateManager service

   - Consolidated all session logic
   - Centralized participant management
   - Improved session persistence
   - Better error handling
   - Clean separation from UI
   
   All tests passing: ✓"
   ```

3. Update progress tracker

4. Report completion:
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ PHASE 1E COMPLETED - SERVICE EXTRACTION DONE!
      - SessionStateManager extracted successfully
      - All 5 services now independent
      - Ready for Phase 2: Component refactor
      - Much cleaner architecture already!
   
   🎯 READY FOR YOUR REVIEW
      Phase 1 complete! Take a break? ☕
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

---

## Implementation Results
*This section will be filled by Claude after completion*

### Session Flow:
```
[HomeScreen] → [SessionStateManager] → [Supabase]
                    ↓
            [SessionTranslator]
```

### Persistence Strategy:
- 

### Error Handling:
- 

### Test Coverage:
-