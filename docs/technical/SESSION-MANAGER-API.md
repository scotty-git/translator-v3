# SessionManager API Reference

## Overview

The SessionManager service handles all session-related operations for the two-party translation mode. It manages session creation, joining, validation, and participant tracking.

## Import

```typescript
import { sessionManager } from '@/services/SessionManager'
```

## Methods

### generateUserId()

Generates a unique identifier for the current device/user.

```typescript
generateUserId(): string
```

**Returns:** A unique string identifier

**Example:**
```typescript
const userId = sessionManager.generateUserId()
// Returns: "550e8400-e29b-41d4-a716-446655440000" (if crypto.randomUUID available)
// Returns: "user-1704893421234-a8b2c3d4e" (fallback format)
```

### generateSessionCode()

Generates a unique 4-digit code for a new session.

```typescript
async generateSessionCode(): Promise<string>
```

**Returns:** Promise resolving to a 4-digit string (1000-9999)

**Throws:** Error if unable to generate unique code after 50 attempts

**Example:**
```typescript
try {
  const code = await sessionManager.generateSessionCode()
  console.log(code) // "1234"
} catch (error) {
  console.error('Failed to generate unique code')
}
```

### createSession()

Creates a new session with a unique code.

```typescript
async createSession(): Promise<{ sessionId: string; code: string }>
```

**Returns:** Promise resolving to session details

**Throws:** 
- `DATABASE_ERROR` if session creation fails

**Example:**
```typescript
try {
  const { sessionId, code } = await sessionManager.createSession()
  console.log(`Created session ${sessionId} with code ${code}`)
} catch (error) {
  console.error('Failed to create session:', error)
}
```

### joinSession()

Joins an existing session using a 4-digit code.

```typescript
async joinSession(code: string): Promise<{ sessionId: string; partnerId?: string }>
```

**Parameters:**
- `code`: 4-digit session code

**Returns:** Promise resolving to session details with optional partner ID

**Throws:**
- `VALIDATION_ERROR` if code format is invalid
- `SESSION_NOT_FOUND` if session doesn't exist
- `SESSION_EXPIRED` if session has expired
- `SESSION_FULL` if session already has 2 participants

**Example:**
```typescript
try {
  const { sessionId, partnerId } = await sessionManager.joinSession('1234')
  if (partnerId) {
    console.log(`Joined session with partner ${partnerId}`)
  }
} catch (error) {
  if (error.code === 'SESSION_NOT_FOUND') {
    console.error('Invalid session code')
  }
}
```

### addParticipant()

Adds a participant to a session.

```typescript
async addParticipant(sessionId: string, userId: string): Promise<void>
```

**Parameters:**
- `sessionId`: The session to join
- `userId`: The user identifier

**Throws:**
- `DATABASE_ERROR` if operation fails

**Note:** If participant already exists, updates their online status instead

**Example:**
```typescript
await sessionManager.addParticipant(sessionId, userId)
```

### validateSession()

Checks if a session code is valid and active.

```typescript
async validateSession(code: string): Promise<boolean>
```

**Parameters:**
- `code`: 4-digit session code

**Returns:** Promise resolving to boolean

**Example:**
```typescript
const isValid = await sessionManager.validateSession('1234')
if (!isValid) {
  console.log('Session is invalid or expired')
}
```

### checkSessionExpiry()

Checks if a session has expired.

```typescript
async checkSessionExpiry(sessionId: string): Promise<boolean>
```

**Parameters:**
- `sessionId`: The session ID to check

**Returns:** Promise resolving to boolean (true if expired)

**Example:**
```typescript
const isExpired = await sessionManager.checkSessionExpiry(sessionId)
if (isExpired) {
  console.log('Session has expired')
}
```

### getSessionByCode()

Retrieves session details by code.

```typescript
async getSessionByCode(code: string): Promise<{
  id: string
  code: string
  createdAt: string
  expiresAt: string
} | null>
```

**Parameters:**
- `code`: 4-digit session code

**Returns:** Promise resolving to session details or null

**Example:**
```typescript
const session = await sessionManager.getSessionByCode('1234')
if (session) {
  console.log(`Session expires at ${session.expiresAt}`)
}
```

## Error Codes

The SessionManager uses the following error codes:

- `VALIDATION_ERROR`: Invalid input format
- `SESSION_NOT_FOUND`: Session doesn't exist
- `SESSION_EXPIRED`: Session has expired
- `SESSION_FULL`: Session already has 2 participants
- `DATABASE_ERROR`: Database operation failed

## Usage Example

Complete flow for creating and joining a session:

```typescript
// User A - Create session
const userId_A = sessionManager.generateUserId()
const { sessionId, code } = await sessionManager.createSession()
await sessionManager.addParticipant(sessionId, userId_A)
console.log(`Share this code: ${code}`)

// User B - Join session
const userId_B = sessionManager.generateUserId()
const { sessionId: joinedSessionId, partnerId } = await sessionManager.joinSession(code)
await sessionManager.addParticipant(joinedSessionId, userId_B)
console.log(`Connected with ${partnerId}`)
```

## Singleton Pattern

SessionManager follows the singleton pattern:

```typescript
export const sessionManager = SessionManager.getInstance()
```

This ensures only one instance exists throughout the application.