# Component Reuse Architecture

## Overview

The translator app follows a strict component reuse philosophy where new features extend existing functionality rather than replacing it. This document explains how the session mode was implemented with minimal code changes while maintaining all existing features.

## Design Principles

### 1. Wrapper Pattern Over Modification

Instead of modifying SingleDeviceTranslator directly, we created SessionTranslator as a wrapper:

```typescript
// ❌ Bad: Modifying existing component
function SingleDeviceTranslator({ isSessionMode, sessionId, ... }) {
  if (isSessionMode) {
    // Session-specific logic scattered throughout
  }
}

// ✅ Good: Wrapping existing component
function SessionTranslator() {
  return (
    <Layout>
      <SessionHeader />
      <SingleDeviceTranslator 
        onNewMessage={handleSessionMessage}
        messages={sessionMessages}
      />
    </Layout>
  )
}
```

### 2. Minimal Props Addition

Only three optional props were added to SingleDeviceTranslator:

```typescript
interface SingleDeviceTranslatorProps {
  onNewMessage?: (message: QueuedMessage) => void
  messages?: QueuedMessage[]
  isSessionMode?: boolean
}
```

These props:
- Are optional (component works without them)
- Don't change existing behavior when not provided
- Enable external control when needed

### 3. Composition Over Inheritance

Session features are composed from existing parts:

```
SessionTranslator (new container)
├── Layout (reused)
├── SessionHeader (new, minimal)
└── SingleDeviceTranslator (reused)
    ├── MessageBubble (unchanged)
    ├── AudioVisualization (unchanged)
    ├── RecordingButton (unchanged)
    └── All other components (unchanged)
```

## Implementation Strategy

### What We Added

1. **SessionTranslator Component** (130 lines)
   - Manages session state
   - Wraps SingleDeviceTranslator
   - Handles message context

2. **SessionHeader Component** (67 lines)
   - Displays session info
   - Shows connection status
   - Pure presentation component

3. **Props to SingleDeviceTranslator** (20 lines)
   - Optional callbacks
   - External state option
   - Backward compatible

### What We Didn't Change

- ❌ PersistentAudioManager
- ❌ MessageBubble component
- ❌ Translation services
- ❌ Recording logic
- ❌ Error handling
- ❌ Audio visualization
- ❌ Theme system
- ❌ Internationalization

## Benefits of This Approach

### 1. Maintainability
- Bug fixes in core components benefit both modes
- Features added to solo mode automatically work in sessions
- Clear separation of concerns

### 2. Testing
- Existing tests continue to pass
- New tests only needed for new functionality
- No regression risk in core features

### 3. Performance
- No additional overhead in solo mode
- Shared component instances
- Efficient re-renders

### 4. Developer Experience
- Easy to understand architecture
- Clear boundaries between features
- Minimal cognitive load

## Code Examples

### Message Interception

```typescript
// SingleDeviceTranslator calls this when it has a new message
const handleNewMessage = (message: QueuedMessage) => {
  // Add session context
  const sessionMessage = {
    ...message,
    session_id: sessionState.sessionId,
    user_id: sessionState.userId
  }
  
  // Update session-specific state
  setMessages(prev => [...prev, sessionMessage])
}
```

### State Management

```typescript
// External messages override internal state
const messages = externalMessages || internalMessages

// Conditional state updates
const handleMessageUpdate = (updater) => {
  if (onNewMessage && externalMessages) {
    // Let parent handle it
    const newMessage = extractNewMessage(updater)
    onNewMessage(newMessage)
  } else {
    // Update internal state
    setInternalMessages(updater)
  }
}
```

## Lessons Learned

1. **Plan for Extension**: Design components with extension points
2. **Optional Everything**: New features should be opt-in
3. **Preserve Contracts**: Never break existing prop interfaces
4. **Wrapper Freedom**: Wrappers can add features without touching core
5. **Test Independence**: New features shouldn't break old tests

## Future Applications

This pattern can be applied to:
- Group sessions (3+ participants)
- Broadcast mode (1-to-many)
- Recording sessions
- AI-assisted conversations

Each would be a new wrapper around SingleDeviceTranslator, preserving all existing functionality while adding specific features.