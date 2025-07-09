# Phase 3: Real-time Sync & Resilience

## Overview
This phase adds the real-time magic - connecting two users through Supabase real-time subscriptions, syncing messages bidirectionally, and handling network failures gracefully. The UI from Phase 2 now becomes truly collaborative.

## Prerequisites
- Phase 1 & 2 completed: Session creation, UI wrapper, local messages working
- SessionTranslator component displaying messages locally
- Database tables created and indexed
- Connection status UI ready to show real states

## Goals
1. Implement MessageSyncService for real-time message synchronization
2. Set up Supabase real-time subscriptions for messages and presence
3. Implement offline message queuing with automatic retry
4. Handle connection/disconnection gracefully
5. Add delivery confirmations and status updates

## Implementation Details

### 1. MessageSyncService (`src/services/MessageSyncService.ts`)

This service handles all real-time communication and resilience:

```typescript
class MessageSyncService {
  private messageQueue: QueuedMessage[] = []
  private subscriptions: RealtimeChannel[] = []
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map()
  
  // Initialize subscriptions for a session
  async initializeSession(sessionId: string, userId: string) {
    // Subscribe to new messages
    // Subscribe to participant presence
    // Subscribe to delivery confirmations
  }
  
  // Send message with queuing and retry
  async sendMessage(message: Message): Promise<void> {
    // Try to send immediately
    // If offline, queue for later
    // Handle delivery confirmation
  }
  
  // Process queued messages when reconnected
  async processMessageQueue(): Promise<void> {
    // Send all queued messages in order
    // Retry with exponential backoff
    // Update UI with status
  }
  
  // Clean up subscriptions
  async cleanup(): void
}
```

### 2. Real-time Subscriptions

**Message Subscription**:
```typescript
// Subscribe to new messages in session
supabase
  .channel(`session:${sessionId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `session_id=eq.${sessionId}`
  }, (payload) => {
    // Add message to UI if from partner
    // Update delivery status if own message
  })
  .subscribe()
```

**Presence Subscription**:
```typescript
// Track online/offline status
supabase
  .channel(`presence:${sessionId}`)
  .on('presence', { event: 'sync' }, () => {
    // Update partner online/offline status
  })
  .on('presence', { event: 'join' }, (payload) => {
    // Partner came online
  })
  .on('presence', { event: 'leave' }, (payload) => {
    // Partner went offline
  })
  .subscribe()
```

### 3. Message Queue Implementation

```typescript
interface QueuedMessage {
  id: string
  tempId: string  // For optimistic UI updates
  content: Message
  retryCount: number
  lastAttempt: Date
  status: 'pending' | 'sending' | 'failed'
}

// Queue operations
- Add message to queue when offline
- Persist queue to localStorage
- Process queue on reconnection
- Exponential backoff: 1s, 2s, 4s, 8s...
- Max 5 retries before marking failed
```

### 4. Connection State Management

```typescript
// Network state detection
const [connectionState, setConnectionState] = useState<
  'connected' | 'connecting' | 'disconnected' | 'reconnecting'
>('connecting')

// Monitor Supabase connection
supabase.realtime.on('connection_state_change', (state) => {
  // Update UI connection indicator
  // Trigger queue processing if reconnected
  // Show appropriate user feedback
})

// Browser online/offline events
window.addEventListener('online', handleOnline)
window.addEventListener('offline', handleOffline)
```

### 5. Message Delivery Flow

1. **Optimistic Updates**: Show message immediately in UI
2. **Queue & Send**: Add to queue, attempt to send
3. **Delivery Confirmation**: Update UI when delivered
4. **Retry on Failure**: Automatic retry with backoff
5. **Failure Handling**: Show error after max retries

### 6. UI Updates for Real-time

**MessageBubble Updates**:
- Show "pending" state for queued messages
- Show "delivered" checkmark when confirmed
- Different opacity for pending vs delivered

**SessionHeader Updates**:
- Real connection status from Supabase
- Real partner online/offline status
- Reconnection spinner when reconnecting

**Status Messages**:
- "Partner is typing..." (from translation in progress)
- "Reconnecting..." during connection issues
- "Partner has left the session"

## Testing Requirements

### Integration Tests (`tests/realtime-sync.test.ts`)
1. Test message sync between two clients
2. Test presence updates work correctly
3. Test message ordering is preserved
4. Test delivery confirmations
5. Test reconnection resends queued messages

### Playwright E2E Tests (`tests/session-realtime.spec.ts`)

1. **Two Browser Test**
   ```typescript
   // Open two browser contexts
   const browser1 = await chromium.launch()
   const browser2 = await chromium.launch()
   
   // User 1 creates session
   // User 2 joins session
   // Verify both see same code
   // User 1 sends message
   // Verify User 2 receives it
   // Screenshot both sides
   ```

2. **Offline Scenario Test**
   - Simulate offline (network.setOffline)
   - Send messages while offline
   - Verify messages queued (visual indicator)
   - Go back online
   - Verify messages delivered
   - Screenshot queue states

3. **Connection Status Test**
   - Verify "connecting" on initial load
   - Verify "connected" when ready
   - Simulate disconnect
   - Verify "reconnecting" shows
   - Verify auto-reconnect works

4. **Message Ordering Test**
   - Send multiple messages quickly
   - Verify order preserved
   - Send while offline
   - Verify order maintained after sync

### Network Simulation Testing
```typescript
// Playwright network conditions
await page.route('**/*', route => {
  // Simulate slow network
  setTimeout(() => route.continue(), 2000)
})

// Test various conditions:
- Fast 4G
- Slow 3G  
- Offline
- Flaky connection (intermittent failures)
```

## Error Scenarios to Handle

1. **Network Errors**
   - Connection timeout
   - Supabase service down
   - Invalid session (expired)
   - Rate limiting

2. **State Conflicts**
   - Both users typing simultaneously
   - Messages sent during partner disconnect
   - Session expiry during active use

3. **Edge Cases**
   - Rapid message sending
   - Large messages
   - Special characters in messages
   - Clock skew between devices

## Documentation Updates Required
After tests pass, create/update:
1. `/docs/architecture/realtime-sync.md` - How sync works
2. `/docs/features/offline-support.md` - Offline queue behavior
3. `/docs/troubleshooting/connection-issues.md` - Common issues

## Success Criteria
- [ ] Messages sync in real-time between users
- [ ] Partner online/offline status accurate
- [ ] Offline messages queue and sync when reconnected
- [ ] Connection status shows accurate state
- [ ] Message delivery confirmations work
- [ ] All integration tests pass
- [ ] All Playwright multi-browser tests pass
- [ ] Network resilience verified
- [ ] Documentation updated

## Performance Considerations

1. **Message Batching**: Don't send one at a time when reconnecting
2. **Subscription Cleanup**: Properly unsubscribe on unmount
3. **Queue Limits**: Max 50 messages in offline queue
4. **Retry Limits**: Max 5 retries with exponential backoff
5. **Memory Management**: Clear old messages periodically

## Security Considerations

1. **Message Validation**: Verify sender is session participant
2. **Session Access**: Check user is authorized for session
3. **Rate Limiting**: Prevent message spam
4. **Input Sanitization**: Clean messages before display

## Next Phase Preview
Phase 4 will add the final polish: better status indicators, message history, session management features, and production-ready optimizations. The core functionality must be rock-solid before adding these enhancements.