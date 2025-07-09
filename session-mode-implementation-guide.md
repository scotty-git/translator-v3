# Session Mode Implementation Guide

## Overview
This guide outlines the implementation of a two-party session mode for the Real-time Translator app. This feature extends the existing solo translator functionality to enable real-time conversation between two connected users.

**Core Principle**: Reuse ALL existing components, UI/UX patterns, and translation logic from the solo translator mode. We're simply adding session management and real-time synchronization on top of the existing foundation.

## Phase 3 Implementation Status: 100% COMPLETE - STABLE ✅

### What Was Built
1. **Full Session Mode Implementation**
   - Two-user real-time translation with instant message sync
   - 4-digit session codes with 12-hour expiry
   - Partner online/offline presence detection
   - Message queuing and offline resilience
   - UUID-based message IDs for database compatibility

2. **MessageSyncService** 
   - Handles all real-time communication via Supabase
   - Manages message queuing with localStorage persistence
   - Implements exponential backoff for retries
   - Tracks connection states and partner presence
   - Validates and cleans old timestamp-based messages

3. **Database Configuration**
   - Enabled real-time publication for messages table
   - Configured Row Level Security (RLS) policies
   - Fixed Supabase real-time subscriptions

### Key Technical Solutions
- **UUID Generation**: Replaced timestamp IDs with crypto.randomUUID()
- **Subscription Timing**: Wait for SUBSCRIBED status before sending
- **Queue Cleanup**: Filter invalid UUIDs from localStorage on load
- **Presence Tracking**: Real-time online/offline status updates
- **Error Recovery**: Comprehensive retry logic with circuit breakers

## Key Requirements

### Session Management
- **4-digit join codes** for easy session creation/joining
- **12-hour session timeout** with automatic cleanup
- **Maximum 2 participants** per session
- **Persistent sessions** - users can rejoin as long as one person remains connected
- **No lobby screen** - immediate translator access upon joining

### User Experience
- **Standard chat interface**: User's messages on right, partner's on left
- **4-digit code display**: Small, visible in header area
- **Real-time indicators**: Show "translating..." status to other party
- **Online/offline status**: Visual indication of partner's connection state
- **Message persistence**: Full history visible on reconnection
- **Delivered receipts**: Show when messages reach the other party

### Translation Logic (Unchanged from Solo Mode)
- Non-English → English translation
- English → User's target language
- Original text shown below, translation above
- Same recording animations and visual feedback
- Same audio processing pipeline

### Technical Requirements
- **Supabase real-time** for message synchronization
- **Message queuing** for network resilience
- **Offline support**: Queue messages locally when disconnected
- **Order preservation**: Messages appear in correct sequence despite async processing

## Implementation Approach

### 1. Database Schema (Supabase)

```sql
-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code CHAR(4) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '12 hours',
  is_active BOOLEAN DEFAULT true
);

-- Session participants
CREATE TABLE session_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_online BOOLEAN DEFAULT true,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  original_text TEXT NOT NULL,
  translated_text TEXT,
  original_language VARCHAR(10),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_delivered BOOLEAN DEFAULT false,
  sequence_number SERIAL
);

-- Indexes for performance
CREATE INDEX idx_sessions_code ON sessions(code) WHERE is_active = true;
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
```

### 2. Component Structure

#### Reused Components (No Changes Needed)
- `MessageBubble` - Works as-is, just needs sender context
- `AudioVisualization` - Unchanged
- `PersistentAudioManager` - Unchanged
- All translation services - Unchanged
- Recording controls - Unchanged
- Error handling - Unchanged

#### New Components

**`SessionTranslator.tsx`**
- Extends `SingleDeviceTranslator` functionality
- Adds session management layer
- Handles real-time message sync
- Manages online/offline states

**`SessionManager.ts`** (Service)
- Creates/joins sessions
- Generates unique 4-digit codes
- Manages session lifecycle
- Handles participant tracking

**`MessageSyncService.ts`** (Service)
- Supabase real-time subscriptions
- Message queuing and retry logic
- Offline message persistence
- Delivery confirmation

#### Modified Components

**`Home.tsx`**
- Add "Start Session" and "Join Session" buttons
- Simple input for 4-digit code entry
- Route to SessionTranslator instead of SingleDeviceTranslator

**`Layout.tsx`** (if needed)
- Display 4-digit code in header when in session mode
- Show connection status indicator

### 3. Real-time Message Flow

```typescript
// Simplified flow
1. User A speaks → Recording → Transcription → Translation
2. Message saved to Supabase with sender_id
3. Real-time broadcast to session channel
4. User B receives via subscription
5. User B's app determines message side (left for partner)
6. Message displayed with appropriate styling
```

### 4. Session Code Generation

```typescript
// Generate unique 4-digit code
function generateSessionCode(): string {
  // Generate random 4-digit code (1000-9999)
  // Check uniqueness against active sessions
  // Retry if collision
  return code;
}
```

### 5. Message Queuing Strategy

```typescript
interface QueuedMessage {
  id: string;
  tempId: string;
  content: Message;
  retryCount: number;
  lastAttempt: Date;
}

// Queue messages when offline
// Retry with exponential backoff
// Mark as delivered when confirmed
// Preserve order using sequence numbers
```

### 6. Route Structure

```
/                    → Home (Start/Join options)
/session             → SessionTranslator (code stored in state/context)
/translator          → SingleDeviceTranslator (unchanged)
/settings           → Settings (unchanged)
/conversations      → Conversations (unchanged)
```

### 7. State Management

```typescript
interface SessionState {
  sessionId: string;
  sessionCode: string;
  partnerId?: string;
  isPartnerOnline: boolean;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  messageQueue: QueuedMessage[];
}
```

### 8. Real-time Subscriptions

```typescript
// Subscribe to session messages
// Subscribe to participant presence
// Handle connection/disconnection events
// Update UI based on real-time events
```

### 9. Error Handling

- Invalid session codes
- Session full (already 2 participants)
- Expired sessions
- Network disconnections
- Permission errors (reuse existing)

### 10. Mobile Network Resilience

- Detect connection quality
- Adjust retry strategies
- Local message caching
- Progressive sync on reconnection
- Visual feedback for pending messages

## Implementation Steps

1. **Database Setup**
   - Run SQL commands to create tables
   - Set up row-level security policies
   - Configure real-time publications

2. **Service Layer**
   - Implement SessionManager
   - Implement MessageSyncService
   - Add session-aware message handling

3. **UI Integration**
   - Modify Home component
   - Create SessionTranslator wrapper
   - Add session UI elements (code display, status)

4. **Testing**
   - Test session creation/joining
   - Test real-time sync
   - Test offline scenarios
   - Test 12-hour expiration

## Key Principles

1. **Maximum Reuse**: Don't recreate anything that already exists
2. **Minimal Changes**: Extend rather than modify existing components
3. **Same UX**: Users familiar with solo mode instantly understand session mode
4. **Resilient**: Handle all network conditions gracefully
5. **Simple**: 4-digit codes, no complex authentication

## Success Criteria (ALL MET ✅)

- ✅ Users can create/join sessions within seconds
- ✅ Messages sync in real-time across devices
- ✅ Translations work identically to solo mode
- ✅ Offline messages queue and sync when reconnected
- ✅ UI remains responsive under all conditions
- ✅ 12-hour sessions auto-expire
- ✅ Clear visual feedback for all states (Partner Online indicator)

## Phase 3 Testing Validation

### Working Features:
1. **Session Creation & Joining**
   - Host creates session, gets 4-digit code
   - Guest joins with code, both see "Partner Online"
   - Session persists in localStorage for rejoining

2. **Real-time Message Sync**
   - Messages appear instantly on both devices
   - Proper UUID generation for database compatibility
   - Postgres real-time subscriptions working correctly

3. **Translation Pipeline**
   - English → Target language (Spanish/Portuguese)
   - Non-English → English
   - Original text shown below translation
   - Performance metrics tracked

4. **Network Resilience**
   - Messages queue when offline
   - Automatic retry with exponential backoff
   - Connection state management
   - localStorage persistence for queued messages

### Fixed Issues:
1. **UUID Validation Error**: Replaced timestamp IDs with proper UUIDs
2. **Real-time Not Working**: Enabled Supabase publication for messages table
3. **Partner Detection**: Fixed presence tracking and "Waiting for partner" issue
4. **Duplicate Participants**: Proper upsert with conflict handling
5. **Message Queue Cleanup**: Filter invalid UUIDs from localStorage

### Database Setup Required:
```sql
-- Enable real-time for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view messages in their session" 
  ON public.messages FOR SELECT 
  USING (session_id IS NOT NULL);

CREATE POLICY "Users can insert their own messages" 
  ON public.messages FOR INSERT 
  WITH CHECK (sender_id IS NOT NULL);
```

## Next Steps: Phase 4
With Phase 3 stable and all real-time features working, we're ready to move to Phase 4 implementation.