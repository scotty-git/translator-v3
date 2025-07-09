# Phase 1: Session Foundation

## Overview
This phase establishes the core foundation for session-based translation, focusing on database setup, session management, and basic UI entry points. **Critical: This phase reuses ALL existing translator components and only adds session management on top.**

## Goals
1. Set up Supabase database schema for sessions
2. Implement SessionManager service for 4-digit code generation and validation
3. Modify Home page to add Start/Join session options
4. Create navigation flow to /session route
5. Establish session state management pattern

## Context from Implementation Guide

### Core Requirements
- **4-digit join codes** for easy session creation/joining
- **12-hour session timeout** with automatic cleanup
- **Maximum 2 participants** per session
- **No lobby screen** - immediate translator access upon joining
- **Session persistence** - users can rejoin if one person remains connected

### Database Schema (To be run by user)
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

-- Messages table (for future phases)
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

## Implementation Details

### 1. SessionManager Service (`src/services/SessionManager.ts`)
```typescript
class SessionManager {
  // Generate unique 4-digit code (1000-9999)
  async generateSessionCode(): Promise<string>
  
  // Create new session with generated code
  async createSession(): Promise<{ sessionId: string, code: string }>
  
  // Join existing session with code
  async joinSession(code: string): Promise<{ sessionId: string, partnerId?: string }>
  
  // Validate session is active and not full
  async validateSession(code: string): Promise<boolean>
  
  // Generate unique user ID for this device
  generateUserId(): string
  
  // Check if session has expired
  async checkSessionExpiry(sessionId: string): Promise<boolean>
}
```

### 2. Home Page Modifications (`src/features/home/Home.tsx`)
**Important**: The existing Home component already has navigation to `/translator` for solo mode. We're ADDING options, not replacing.

Add two new buttons:
- "Start Session" - Creates session and navigates to /session with code in state
- "Join Session" - Shows input for 4-digit code, validates, then navigates

UI Layout:
```
[Existing Solo Translator Button]
    --- OR ---
[Start Session] [Join Session]
```

### 3. Session State Management
Create a React Context or use local state to manage:
```typescript
interface SessionState {
  sessionId: string
  sessionCode: string
  userId: string  // Generated for this device
  role: 'host' | 'guest'
  createdAt: Date
}
```

### 4. Route Configuration (`src/App.tsx`)
Add new route:
```typescript
<Route path="/session" element={<SessionTranslator />} />
```

Note: SessionTranslator will be implemented in Phase 2, for now just create placeholder.

### 5. Error Handling
- Invalid session codes: "Session not found"
- Expired sessions: "This session has expired"
- Full sessions: "This session already has 2 participants"
- Network errors: Reuse existing error handling patterns

## Testing Requirements

### Unit Tests (`src/services/__tests__/SessionManager.test.ts`)
1. Test unique code generation (no collisions in 1000 attempts)
2. Test session creation returns valid session object
3. Test joining valid session succeeds
4. Test joining invalid code fails appropriately
5. Test joining full session (2 participants) fails
6. Test expired session detection
7. Test user ID generation is consistent

### Playwright E2E Tests (`tests/session-foundation.spec.ts`)
1. **Start Session Flow**
   - Click "Start Session" button
   - Verify navigation to /session
   - Verify 4-digit code is displayed
   - Screenshot for visual verification

2. **Join Session Flow**
   - Click "Join Session" button
   - Enter valid 4-digit code
   - Verify navigation to /session
   - Verify session state is maintained

3. **Error Cases**
   - Enter invalid code → See error message
   - Enter expired session code → See appropriate error
   - Screenshot error states

### Test Data
For Playwright tests, use mock Supabase responses to avoid database dependencies:
- Mock session creation
- Mock session validation
- Mock error scenarios

## Documentation Updates Required
After tests pass, update:
1. `/docs/features/sessions.md` - How sessions work
2. `/docs/api/session-manager.md` - SessionManager API documentation
3. `/docs/user-guide/creating-sessions.md` - User-facing documentation

## Success Criteria
- [ ] Database schema created and verified
- [ ] SessionManager generates unique 4-digit codes
- [ ] Home page shows Start/Join options
- [ ] Navigation to /session works with state
- [ ] All unit tests pass (100% coverage)
- [ ] All Playwright tests pass with screenshots
- [ ] Documentation updated

## Important Reminders for Implementation
1. **DO NOT** modify existing translator components
2. **DO NOT** change existing routes or navigation
3. **REUSE** all existing error handling patterns
4. **REUSE** all existing UI components and styles
5. **ADD** session functionality as a layer on top
6. User runs SQL commands - implementation provides them

## Next Phase Preview
Phase 2 will create the SessionTranslator component that wraps SingleDeviceTranslator with session-aware functionality, but for now we just need the foundation in place.