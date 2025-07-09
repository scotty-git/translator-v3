# Phase 2: Session UI & Local Messages

## Overview
This phase creates the SessionTranslator component that extends SingleDeviceTranslator functionality, adding session-specific UI elements while maintaining all existing translation features. **No real-time sync yet** - this phase focuses on the UI wrapper and local message handling.

## Prerequisites
- Phase 1 completed: SessionManager service working, database schema created
- Home page navigation to /session with session state
- 4-digit codes generating and validating properly

## Goals
1. Create SessionTranslator component that wraps SingleDeviceTranslator
2. Display 4-digit session code in the header
3. Show session connection status (preparing for Phase 3)
4. Ensure all existing translator features work unchanged
5. Store messages locally with session context (no sync yet)

## Implementation Details

### 1. SessionTranslator Component (`src/features/translator/SessionTranslator.tsx`)

**Critical Design Decision**: SessionTranslator is a WRAPPER around SingleDeviceTranslator, not a replacement.

```typescript
// Pseudocode structure
function SessionTranslator() {
  // Get session state from navigation/context
  const { sessionCode, sessionId, userId } = useSessionState()
  
  // Local message state (will sync in Phase 3)
  const [messages, setMessages] = useState<Message[]>([])
  
  // Connection status (mock for now, real in Phase 3)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  
  // Override SingleDeviceTranslator's onNewMessage
  const handleNewMessage = (message: Message) => {
    // Add session context to message
    const sessionMessage = {
      ...message,
      sessionId,
      senderId: userId,
      side: 'right' // User's own messages always on right
    }
    setMessages([...messages, sessionMessage])
  }
  
  return (
    <Layout>
      {/* Session Header */}
      <SessionHeader 
        code={sessionCode}
        status={connectionStatus}
        partnerOnline={false} // Will be real in Phase 3
      />
      
      {/* Reuse SingleDeviceTranslator with custom message handler */}
      <SingleDeviceTranslator 
        onNewMessage={handleNewMessage}
        messages={messages}
        // All other props passed through
      />
    </Layout>
  )
}
```

### 2. SessionHeader Component (`src/components/SessionHeader.tsx`)

Simple header showing:
- 4-digit code (prominently but not huge)
- Connection status indicator
- Partner online/offline status (prepare UI for Phase 3)

```typescript
// Visual example:
// [Session: 1234] • Connected • Partner: Offline
```

### 3. Message Side Logic

**Important**: In session mode, message sides work differently than solo mode:
- User's own messages: Always RIGHT side
- Partner's messages: Always LEFT side
- This is standard chat interface pattern

Prepare the logic now (will be fully used in Phase 3):
```typescript
function determineMessageSide(message: Message, currentUserId: string): 'left' | 'right' {
  return message.senderId === currentUserId ? 'right' : 'left'
}
```

### 4. Reusing Existing Components

**Components that work without ANY changes:**
- `MessageBubble` - Already supports left/right via props
- `AudioVisualization` - Completely unchanged
- `RecordingButton` - Completely unchanged
- `PersistentAudioManager` - Completely unchanged
- All translation services - Completely unchanged
- All error handling - Completely unchanged

**Components that need minor prop additions:**
- `SingleDeviceTranslator` - Add optional `onNewMessage` callback prop
- `SingleDeviceTranslator` - Add optional `messages` prop to override internal state

### 5. Session State Persistence

Store session info in localStorage to survive page refreshes:
```typescript
// On session create/join
localStorage.setItem('activeSession', JSON.stringify({
  sessionId,
  sessionCode,
  userId,
  role: 'host' | 'guest'
}))

// On SessionTranslator mount
const savedSession = localStorage.getItem('activeSession')
if (!savedSession) {
  // Redirect to home
}
```

## Testing Requirements

### Unit Tests
1. Test SessionTranslator renders with session code
2. Test message side determination logic
3. Test session state persistence
4. Test SingleDeviceTranslator integration
5. Test all translation features still work

### Playwright E2E Tests (`tests/session-ui.spec.ts`)
1. **Session UI Verification**
   - Navigate to session with code
   - Verify code displays in header
   - Verify connection status shows
   - Screenshot session UI
   
2. **Translation Features Work**
   - Record audio in session mode
   - Verify transcription works
   - Verify translation works
   - Verify message appears locally
   - Screenshot with messages
   
3. **Component Reuse Verification**
   - Verify audio visualization works
   - Verify recording button works
   - Verify all animations work
   - Verify error handling works

4. **State Persistence**
   - Refresh page
   - Verify session state restored
   - Verify can continue using session

## Visual Testing Checklist
Screenshot these states:
1. Empty session with code displayed
2. Session with messages (both sides)
3. Recording in progress
4. Error states
5. Mobile view
6. Dark mode

## Documentation Updates Required
After tests pass, create/update:
1. `/docs/components/session-translator.md` - Component architecture
2. `/docs/features/session-ui.md` - How session UI works
3. `/docs/architecture/component-reuse.md` - How we extend vs modify

## Success Criteria
- [ ] SessionTranslator displays 4-digit code
- [ ] All SingleDeviceTranslator features work unchanged
- [ ] Messages stored with session context
- [ ] Connection status UI ready for Phase 3
- [ ] Session state persists across refreshes
- [ ] All unit tests pass
- [ ] All Playwright tests pass with screenshots
- [ ] Documentation updated

## Important Implementation Notes

### DO NOT:
- Modify PersistentAudioManager
- Modify MessageBubble component
- Modify translation services
- Modify recording logic
- Create new translation pipelines
- Change existing error handling

### DO:
- Wrap SingleDeviceTranslator
- Add session context layer
- Prepare for real-time (but don't implement yet)
- Reuse ALL existing components
- Keep changes minimal and focused

## Validation Questions for Implementation
Before considering this phase complete, verify:
1. Can you record and see translations just like solo mode?
2. Does the session code display clearly?
3. Do all existing features work exactly the same?
4. Is the code ready to add real-time in Phase 3?

## Next Phase Preview
Phase 3 will add Supabase real-time subscriptions, message synchronization between users, and handle offline scenarios. The UI and local functionality must be solid before adding network complexity.