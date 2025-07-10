# Phase 1d: Extract RealtimeConnection Service

## 🎯 Vibe Check

**What we're doing**: Taking all the Supabase channel management, reconnection logic, and subscription handling into a dedicated service.

**Why it's awesome**: Network issues? Reconnection problems? You'll debug in one focused service instead of bouncing around.

**Time estimate**: 45-60 minutes of Claude working autonomously

## ✅ Success Criteria

- [ ] RealtimeConnection manages all Supabase channels
- [ ] Reconnection logic is centralized and robust
- [ ] Clean subscription/unsubscription patterns
- [ ] Network resilience features work
- [ ] MessageSyncService becomes simpler
- [ ] All real-time features still work
- [ ] Connection state is easily observable

## 🚀 Pre-Flight Checklist

Before starting, verify:
- [ ] Phases 1a, 1b, and 1c are complete
- [ ] Dev server is running: `npm run dev`
- [ ] All tests pass: `npm test`
- [ ] Create safety commit: `git add -A && git commit -m "chore: pre-phase-1d checkpoint"`
- [ ] Create git tag: `git tag pre-phase-1d`

## 🧪 Automated Test Suite

```typescript
// tests/refactor/phase-1d-validation.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Phase 1d: RealtimeConnection Validation', () => {
  test('Connection state management works', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173')
    
    // Create session
    await page.click('button:has-text("Create Session")')
    
    // Should show connecting then connected
    await expect(page.locator('text="Connecting..."')).toBeVisible()
    await expect(page.locator('text="Connected"')).toBeVisible({ timeout: 5000 })
    
    // Connection icon should be green
    await expect(page.locator('[class*="text-green"]')).toBeVisible()
  })

  test('Reconnection after network disruption', async ({ page, context }) => {
    await page.goto('http://127.0.0.1:5173')
    await page.click('button:has-text("Create Session")')
    
    // Wait for connection
    await expect(page.locator('text="Connected"')).toBeVisible()
    
    // Simulate offline
    await context.setOffline(true)
    
    // Should show disconnected
    await expect(page.locator('text="Disconnected"')).toBeVisible()
    
    // Go back online
    await context.setOffline(false)
    
    // Should reconnect
    await expect(page.locator('text="Reconnecting..."')).toBeVisible()
    await expect(page.locator('text="Connected"')).toBeVisible({ timeout: 10000 })
  })

  test('Message sync survives reconnection', async ({ browser }) => {
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
    
    // Send message
    await host.click('button[title="Text input"]')
    await host.fill('input[placeholder="Type message..."]', 'Before disconnect')
    await host.click('button:has-text("Send")')
    
    // Verify received
    await expect(guest.locator('text="Before disconnect"')).toBeVisible()
    
    // Simulate guest disconnect
    await context2.setOffline(true)
    await page.waitForTimeout(1000)
    await context2.setOffline(false)
    
    // Send another message
    await host.click('button[title="Text input"]')
    await host.fill('input[placeholder="Type message..."]', 'After reconnect')
    await host.click('button:has-text("Send")')
    
    // Should still receive
    await expect(guest.locator('text="After reconnect"')).toBeVisible({ timeout: 10000 })
  })

  test('Multiple channel subscriptions work', async ({ page }) => {
    // Monitor console for subscription confirmations
    const subscriptions: string[] = []
    page.on('console', msg => {
      if (msg.text().includes('SUBSCRIBED')) {
        subscriptions.push(msg.text())
      }
    })
    
    await page.goto('http://127.0.0.1:5173')
    await page.click('button:has-text("Create Session")')
    
    // Wait for subscriptions
    await page.waitForTimeout(3000)
    
    // Should have multiple channel subscriptions
    expect(subscriptions.length).toBeGreaterThanOrEqual(2) // messages + presence
    
    // Verify channel cleanup on exit
    await page.click('button[aria-label="Back"]')
    await page.click('button:has-text("Exit")')
    
    // Channels should be cleaned up (check console)
  })
})
```

## 📝 Implementation Steps

### Step 1: Create connection types
Create `src/services/realtime/types.ts`:
```typescript
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

export interface ChannelConfig {
  name: string
  type: 'messages' | 'presence' | 'participant'
  config?: any
}

export interface IRealtimeConnection {
  initialize(): Promise<void>
  getConnectionState(): ConnectionState
  subscribeToConnectionState(callback: (state: ConnectionState) => void): () => void
  
  createChannel(config: ChannelConfig): RealtimeChannel
  removeChannel(channelName: string): void
  
  onReconnect(callback: () => void): void
  cleanup(): void
}
```

### Step 2: Extract connection logic from MessageSyncService
1. Identify all Supabase channel creation code
2. Extract reconnection logic
3. Move network monitoring code
4. Extract channel cleanup logic

### Step 3: Create RealtimeConnection service
Create `src/services/realtime/RealtimeConnection.ts`:
1. Centralize Supabase client usage
2. Implement robust reconnection with exponential backoff
3. Track all active channels
4. Provide connection state monitoring
5. Handle cleanup properly

### Step 4: Update MessageSyncService
1. Remove direct Supabase channel management
2. Use RealtimeConnection for all channels
3. Subscribe to reconnection events
4. Simplify to focus on message logic only

### Step 5: Update PresenceService
1. Use RealtimeConnection for presence channel
2. Handle reconnection gracefully
3. Re-broadcast presence on reconnect

### Step 6: Add connection monitoring UI
1. Update SessionTranslator to show connection state
2. Add visual indicators for reconnecting
3. Show user-friendly error messages

### Step 7: Add comprehensive tests
Create `src/services/realtime/__tests__/RealtimeConnection.test.ts`

## ✅ Validation Steps

After implementation:

1. **Connection Testing**
   ```bash
   npm test -- RealtimeConnection
   ```

2. **Network Resilience Testing**
   ```bash
   npx playwright test tests/refactor/phase-1d-validation.spec.ts
   ```

3. **Manual Network Testing**
   - [ ] Disable WiFi while in session
   - [ ] Re-enable WiFi
   - [ ] Verify automatic reconnection
   - [ ] Verify no lost messages

## 🔄 Rollback Plan

If something goes wrong:
```bash
# Quick rollback
git checkout pre-phase-1d
npm install
npm run dev
```

## 📋 Completion Protocol

### Claude will:
1. Update this document with:
   - [ ] Connection architecture diagram
   - [ ] Reconnection strategy details
   - [ ] Performance impact
   - [ ] Edge cases handled

2. Create summary commit:
   ```bash
   git add -A
   git commit -m "refactor(phase-1d): extract RealtimeConnection service

   - Centralized all Supabase channel management
   - Robust reconnection with exponential backoff
   - Clean connection state monitoring
   - Improved network resilience
   - Simplified MessageSyncService
   
   All tests passing: ✓"
   ```

3. Update progress tracker

4. Report completion:
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ PHASE 1D COMPLETED
      - RealtimeConnection service extracted
      - Network resilience improved
      - Reconnection is now bulletproof
      - Connection state clearly visible
   
   🎯 READY FOR YOUR REVIEW
      Try turning WiFi on/off during a session!
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

---

## Implementation Results
*This section will be filled by Claude after completion*

### Architecture:
```
[Component] → [MessageSync] → [RealtimeConnection] → [Supabase]
           ↘ [PresenceService] ↗
```

### Reconnection Strategy:
- 

### Performance Impact:
- 

### Edge Cases Handled:
-