# Session Mode

## Overview

Session Mode enables two users to connect their devices for real-time translation conversations. This feature builds on top of the single-device translator, adding network synchronization while maintaining the same core translation functionality.

## How Sessions Work

### Creating a Session
1. From the home screen, tap "Start Session"
2. A unique 4-digit code is generated (e.g., 1234)
3. Share this code with the other person
4. The session is now active and waiting for a partner

### Joining a Session
1. From the home screen, tap "Join Session"
2. Enter the 4-digit code shared by the session creator
3. Tap "Join" to connect to the session
4. Both users are now connected and can start translating

### Session Lifecycle
- Sessions are active for 12 hours from creation
- If both users leave, the session ends
- If one user leaves, they can rejoin using the same code
- Maximum 2 participants per session

## Technical Architecture

### Database Schema
Sessions are managed through three Supabase tables:

**sessions**
- `id`: UUID (primary key)
- `code`: 4-digit unique code
- `created_at`: Session creation timestamp
- `expires_at`: Auto-set to 12 hours from creation
- `is_active`: Boolean flag for active sessions

**session_participants**
- `id`: UUID (primary key)
- `session_id`: Reference to sessions table
- `user_id`: Unique identifier for each participant
- `joined_at`: When user joined
- `is_online`: Current connection status
- `last_seen`: Last activity timestamp

**messages**
- `id`: UUID (primary key)
- `session_id`: Reference to sessions table
- `sender_id`: User who sent the message
- `original_text`: Original spoken text
- `translated_text`: Translated version
- `original_language`: Detected source language
- `timestamp`: Message timestamp
- `is_delivered`: Delivery status
- `sequence_number`: For message ordering

### Services

**SessionManager** (`src/services/SessionManager.ts`)
- Generates unique 4-digit codes
- Creates and validates sessions
- Manages participant tracking
- Handles session expiry

### Components

**HomeScreen** (`src/features/home/HomeScreen.tsx`)
- Added Start/Join session buttons
- 4-digit code input for joining
- Error handling for invalid codes
- Navigation to session mode

**SessionTranslator** (`src/features/translator/SessionTranslator.tsx`)
- Placeholder component for Phase 2
- Manages session state
- Will wrap SingleDeviceTranslator in Phase 2

## User Experience

### Visual Design
- Session buttons appear below solo translator option
- Clear "OR" divider between modes
- Prominent 4-digit code display
- Real-time connection status (Phase 3)
- Message side: user's messages right, partner's left

### Error Handling
- Invalid session code: "Session not found or has expired"
- Expired session: "This session has expired"
- Full session: "This session already has 2 participants"
- Network errors: Graceful fallbacks

### Mobile Optimization
- Touch-friendly button sizes
- Numeric keyboard for code entry
- Responsive layout for all screen sizes
- Works in both portrait and landscape

## Implementation Status

### Phase 1 (Completed)
- ✅ Database schema created
- ✅ SessionManager service implemented
- ✅ Home page UI for creating/joining sessions
- ✅ Basic navigation to session mode
- ✅ Session state persistence
- ✅ Unit tests (21/21 passing)
- ✅ E2E tests with Playwright

### Upcoming Phases
- Phase 2: Session UI with local messages
- Phase 3: Real-time message synchronization
- Phase 4: Polish and production features

## API Reference

### SessionManager Methods

```typescript
// Generate unique user ID for device
generateUserId(): string

// Generate unique 4-digit session code
generateSessionCode(): Promise<string>

// Create new session
createSession(): Promise<{ sessionId: string; code: string }>

// Join existing session
joinSession(code: string): Promise<{ sessionId: string; partnerId?: string }>

// Add participant to session
addParticipant(sessionId: string, userId: string): Promise<void>

// Validate session is active
validateSession(code: string): Promise<boolean>

// Check if session expired
checkSessionExpiry(sessionId: string): Promise<boolean>
```

## Testing

### Unit Tests
Located in `src/services/__tests__/SessionManager.test.ts`
- Code generation uniqueness
- Session creation/joining
- Validation logic
- Error handling
- Expiry detection

### E2E Tests
Located in `tests/session-foundation-focused.spec.ts`
- Home screen UI verification
- Start/Join session flows
- Input validation
- Error scenarios
- Mobile responsiveness

## Security Considerations
- 4-digit codes are randomly generated
- Sessions expire after 12 hours
- No personal data stored
- Participant limits enforced
- Input validation on all entries