# Phase 6: Session Management

## Overview
Complete the session management system with user persistence, session expiry, and proper cleanup. 

**⚡ IMPACT FROM PHASE 5**: Phase 5 Mobile Network Resilience has already implemented enterprise-grade auto-reconnection logic, connection recovery mechanisms, and advanced error handling. This Phase 6 now focuses on enhanced user experience and session analytics rather than basic connectivity.

## Prerequisites
- Phase 0-5 completed ✅
- Real-time messaging working ✅
- User ID persistence ready ✅
- Session creation/joining functional ✅
- Mobile network resilience implemented ✅
- Enterprise-grade error recovery active ✅

## Goals
- Implement user ID persistence
- ~~Add auto-reconnection logic~~ ✅ **COMPLETED in Phase 5** (connection recovery with progressive delays)
- Handle session expiry and warnings
- Track user presence and activity
- Implement enhanced leave/cleanup procedures  
- Add advanced session state management
- Build session analytics and monitoring
- Create session history and recovery features

## Implementation Steps

### 1. Create User Management System

#### User Manager (src/lib/user/UserManager.ts)
```typescript
export interface User {
  id: string
  createdAt: string
  language: 'en' | 'es' | 'pt'
  mode: 'casual' | 'fun'
  isLeft: boolean
}

export class UserManager {
  private static readonly USER_KEY = 'translator-user'
  private static readonly SESSION_HISTORY_KEY = 'translator-session-history'

  /**
   * Get or create persistent user
   */
  static getOrCreateUser(): User {
    const stored = localStorage.getItem(this.USER_KEY)
    
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (e) {
        console.error('Invalid user data:', e)
      }
    }
    
    // Create new user
    const newUser: User = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      language: this.detectUserLanguage(),
      mode: 'casual',
      isLeft: Math.random() > 0.5,
    }
    
    localStorage.setItem(this.USER_KEY, JSON.stringify(newUser))
    return newUser
  }

  /**
   * Update user preferences
   */
  static updateUser(updates: Partial<User>): User {
    const current = this.getOrCreateUser()
    const updated = { ...current, ...updates }
    localStorage.setItem(this.USER_KEY, JSON.stringify(updated))
    return updated
  }

  /**
   * Detect user language from browser
   */
  private static detectUserLanguage(): 'en' | 'es' | 'pt' {
    const browserLang = navigator.language.toLowerCase()
    if (browserLang.startsWith('es')) return 'es'
    if (browserLang.startsWith('pt')) return 'pt'
    return 'en'
  }

  /**
   * Add session to history
   */
  static addToSessionHistory(sessionCode: string): void {
    const history = this.getSessionHistory()
    const updated = [
      { code: sessionCode, joinedAt: new Date().toISOString() },
      ...history.filter(h => h.code !== sessionCode)
    ].slice(0, 10) // Keep last 10 sessions
    
    localStorage.setItem(this.SESSION_HISTORY_KEY, JSON.stringify(updated))
  }

  /**
   * Get session history
   */
  static getSessionHistory(): Array<{ code: string; joinedAt: string }> {
    const stored = localStorage.getItem(this.SESSION_HISTORY_KEY)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (e) {
        return []
      }
    }
    return []
  }
}
```

### 2. Create Session State Manager

#### Session State Manager (src/features/session/SessionStateManager.ts)
```typescript
import { Session } from '@/types/database'
import { SessionService } from '@/services/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface SessionState {
  session: Session | null
  connectionState: ConnectionState
  error: string | null
  reconnectAttempts: number
}

export class SessionStateManager {
  private state: SessionState = {
    session: null,
    connectionState: 'disconnected',
    error: null,
    reconnectAttempts: 0,
  }
  
  private listeners = new Set<(state: SessionState) => void>()
  private reconnectTimer?: NodeJS.Timeout
  private sessionChannel?: RealtimeChannel
  private readonly maxReconnectAttempts = 5
  private readonly reconnectDelays = [1000, 2000, 4000, 8000, 15000, 30000]

  /**
   * Initialize session
   */
  async initialize(sessionCode: string): Promise<void> {
    this.updateState({ connectionState: 'connecting' })
    
    try {
      const session = await SessionService.joinSession(sessionCode)
      this.updateState({ 
        session, 
        connectionState: 'connected',
        error: null,
        reconnectAttempts: 0
      })
      
      // Subscribe to session updates
      this.subscribeToSession(session.id)
      
      // Start session heartbeat
      this.startHeartbeat()
      
    } catch (error) {
      this.updateState({ 
        connectionState: 'error',
        error: 'Failed to join session'
      })
      throw error
    }
  }

  /**
   * Subscribe to session updates
   */
  private subscribeToSession(sessionId: string): void {
    this.sessionChannel = SessionService.subscribeToSession(
      sessionId,
      (updatedSession) => {
        // Check if session expired
        if (!updatedSession.is_active) {
          this.handleSessionExpired()
          return
        }
        
        this.updateState({ session: updatedSession })
      }
    )

    // Monitor connection state
    this.sessionChannel
      .on('system', { event: 'error' }, () => {
        this.handleConnectionError()
      })
      .on('system', { event: 'disconnect' }, () => {
        this.handleDisconnect()
      })
  }

  /**
   * Handle connection error
   */
  private handleConnectionError(): void {
    this.updateState({ connectionState: 'disconnected' })
    this.attemptReconnect()
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(): void {
    this.updateState({ connectionState: 'disconnected' })
    this.attemptReconnect()
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.state.reconnectAttempts >= this.maxReconnectAttempts) {
      this.updateState({ 
        connectionState: 'error',
        error: 'Failed to reconnect after multiple attempts'
      })
      return
    }

    const delay = this.reconnectDelays[this.state.reconnectAttempts] || 30000
    
    this.reconnectTimer = setTimeout(async () => {
      this.updateState({ 
        reconnectAttempts: this.state.reconnectAttempts + 1 
      })
      
      try {
        if (this.state.session) {
          await this.initialize(this.state.session.code)
        }
      } catch (error) {
        // Will retry again
      }
    }, delay)
  }

  /**
   * Handle session expired
   */
  private handleSessionExpired(): void {
    this.updateState({ 
      connectionState: 'error',
      error: 'Session has expired'
    })
    this.cleanup()
  }

  /**
   * Start heartbeat to keep session active
   */
  private startHeartbeat(): void {
    // Update last_activity every 30 seconds
    setInterval(async () => {
      if (this.state.session && this.state.connectionState === 'connected') {
        try {
          await SessionService.updateLastActivity(this.state.session.id)
        } catch (error) {
          console.error('Heartbeat failed:', error)
        }
      }
    }, 30000)
  }

  /**
   * Leave session
   */
  async leave(): Promise<void> {
    if (this.state.session) {
      await SessionService.leaveSession(this.state.session.id)
    }
    this.cleanup()
  }

  /**
   * Cleanup
   */
  private cleanup(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }
    if (this.sessionChannel) {
      this.sessionChannel.unsubscribe()
    }
    this.updateState({ 
      session: null,
      connectionState: 'disconnected',
      reconnectAttempts: 0 
    })
  }

  /**
   * Update state and notify listeners
   */
  private updateState(updates: Partial<SessionState>): void {
    this.state = { ...this.state, ...updates }
    this.listeners.forEach(listener => listener(this.state))
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: SessionState) => void): () => void {
    this.listeners.add(listener)
    listener(this.state) // Initial state
    return () => this.listeners.delete(listener)
  }
}
```

### 3. Create Session Hooks

#### useSessionState Hook (src/hooks/useSessionState.ts)
```typescript
import { useState, useEffect, useRef } from 'react'
import { SessionStateManager, SessionState } from '@/features/session/SessionStateManager'

export function useSessionState(sessionCode?: string) {
  const [state, setState] = useState<SessionState>({
    session: null,
    connectionState: 'disconnected',
    error: null,
    reconnectAttempts: 0,
  })
  const managerRef = useRef<SessionStateManager>()

  useEffect(() => {
    if (!sessionCode) return

    // Create manager
    managerRef.current = new SessionStateManager()
    
    // Subscribe to state changes
    const unsubscribe = managerRef.current.subscribe(setState)
    
    // Initialize session
    managerRef.current.initialize(sessionCode)
    
    return () => {
      unsubscribe()
      managerRef.current?.leave()
    }
  }, [sessionCode])

  const leave = async () => {
    await managerRef.current?.leave()
  }

  return {
    ...state,
    leave,
  }
}
```

#### useBeforeUnload Hook (src/hooks/useBeforeUnload.ts)
```typescript
import { useEffect } from 'react'

export function useBeforeUnload(
  handler: (event: BeforeUnloadEvent) => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      handler(event)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [handler, enabled])
}
```

### 4. Update Session Service

#### Updated Session Service (add to existing)
```typescript
// Add to SessionService class:

/**
 * Update session last activity
 */
static async updateLastActivity(sessionId: string): Promise<void> {
  await supabase
    .from('sessions')
    .update({ last_activity: new Date().toISOString() })
    .eq('id', sessionId)
}

/**
 * Check if session is still active
 */
static async checkSessionActive(sessionId: string): Promise<boolean> {
  const { data } = await supabase
    .from('sessions')
    .select('is_active, expires_at')
    .eq('id', sessionId)
    .single()
    
  if (!data) return false
  
  // Check if expired
  if (new Date(data.expires_at) < new Date()) {
    return false
  }
  
  return data.is_active
}

/**
 * Extend session expiry
 */
static async extendSession(sessionId: string): Promise<void> {
  await supabase
    .from('sessions')
    .update({ 
      expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
    })
    .eq('id', sessionId)
}
```

### 5. Create Session Info Component

#### Session Info Component (src/features/session/SessionInfo.tsx)
```typescript
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Users, Clock, Link2, AlertTriangle } from 'lucide-react'
import { useSessionState } from '@/hooks/useSessionState'
import { formatDistanceToNow } from 'date-fns'

interface SessionInfoProps {
  sessionCode: string
}

export function SessionInfo({ sessionCode }: SessionInfoProps) {
  const { session, connectionState, error, reconnectAttempts } = useSessionState(sessionCode)
  const [timeLeft, setTimeLeft] = useState<string>('')

  useEffect(() => {
    if (!session) return

    const updateTimeLeft = () => {
      const expiresAt = new Date(session.expires_at)
      const now = new Date()
      
      if (expiresAt <= now) {
        setTimeLeft('Expired')
        return
      }
      
      setTimeLeft(formatDistanceToNow(expiresAt, { addSuffix: true }))
    }

    updateTimeLeft()
    const interval = setInterval(updateTimeLeft, 60000) // Update every minute
    
    return () => clearInterval(interval)
  }, [session])

  const getConnectionStatus = () => {
    switch (connectionState) {
      case 'connecting':
        return { text: 'Connecting...', color: 'text-yellow-600' }
      case 'connected':
        return { text: 'Connected', color: 'text-green-600' }
      case 'disconnected':
        return { text: `Reconnecting... (${reconnectAttempts}/5)`, color: 'text-orange-600' }
      case 'error':
        return { text: error || 'Connection error', color: 'text-red-600' }
    }
  }

  const status = getConnectionStatus()

  return (
    <Card className="mb-4">
      <div className="space-y-3">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Status</span>
          </div>
          <span className={`text-sm font-medium ${status.color}`}>
            {status.text}
          </span>
        </div>

        {/* Session Code */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Session</span>
          </div>
          <span className="text-lg font-mono font-bold">{sessionCode}</span>
        </div>

        {/* User Count */}
        {session && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Users</span>
            </div>
            <span className="text-sm font-medium">{session.user_count}</span>
          </div>
        )}

        {/* Time Left */}
        {session && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Expires</span>
            </div>
            <span className="text-sm font-medium">{timeLeft}</span>
          </div>
        )}

        {/* Warning for expiring soon */}
        {session && timeLeft.includes('hour') && !timeLeft.includes('hours') && (
          <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              Session expiring soon
            </span>
          </div>
        )}
      </div>
    </Card>
  )
}
```

### 6. Create Session Recovery

#### Session Recovery Component (src/features/session/SessionRecovery.tsx)
```typescript
import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { UserManager } from '@/lib/user/UserManager'
import { History, ArrowRight } from 'lucide-react'

interface SessionRecoveryProps {
  onSelectSession: (code: string) => void
}

export function SessionRecovery({ onSelectSession }: SessionRecoveryProps) {
  const [history] = useState(() => UserManager.getSessionHistory())
  const [isExpanded, setIsExpanded] = useState(false)

  if (history.length === 0) return null

  const recentSessions = isExpanded ? history : history.slice(0, 3)

  return (
    <Card className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <History className="h-4 w-4 text-gray-500" />
        <h3 className="text-sm font-medium text-gray-700">Recent Sessions</h3>
      </div>
      
      <div className="space-y-2">
        {recentSessions.map((session) => (
          <button
            key={session.code}
            onClick={() => onSelectSession(session.code)}
            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="text-left">
              <div className="font-mono font-medium">{session.code}</div>
              <div className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(session.joinedAt), { addSuffix: true })}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </button>
        ))}
      </div>
      
      {history.length > 3 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-2"
        >
          {isExpanded ? 'Show less' : `Show all (${history.length})`}
        </Button>
      )}
    </Card>
  )
}

function formatDistanceToNow(date: Date, options: { addSuffix: boolean }): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}
```

### 7. Update Session Room with State Management

#### Updated Session Room (integrate state management)
```typescript
// Update SessionRoom.tsx to use new session state management:

import { useSessionState } from '@/hooks/useSessionState'
import { useBeforeUnload } from '@/hooks/useBeforeUnload'
import { UserManager } from '@/lib/user/UserManager'

export function SessionRoom() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const user = UserManager.getOrCreateUser()
  const { session, connectionState, error, leave } = useSessionState(code)

  // Track session in history
  useEffect(() => {
    if (code && session) {
      UserManager.addToSessionHistory(code)
    }
  }, [code, session])

  // Warn before leaving
  useBeforeUnload(
    (e) => {
      if (session) {
        e.preventDefault()
        e.returnValue = 'Are you sure you want to leave the session?'
      }
    },
    !!session
  )

  // Handle leave
  const handleLeave = async () => {
    if (confirm('Are you sure you want to leave this session?')) {
      await leave()
      navigate('/')
    }
  }

  // Connection states
  if (connectionState === 'connecting') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Connecting to session...</p>
        </div>
      </div>
    )
  }

  if (connectionState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-semibold">Connection Error</h2>
            <p className="text-gray-600">{error}</p>
            <Button onClick={() => navigate('/')} fullWidth>
              Return Home
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Rest of the component...
}
```

## Tests

### Test 1: User Management
```typescript
// tests/lib/user/UserManager.test.ts
import { UserManager } from '@/lib/user/UserManager'

describe('UserManager', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('creates new user with unique ID', () => {
    const user1 = UserManager.getOrCreateUser()
    const user2 = UserManager.getOrCreateUser()
    
    expect(user1.id).toBe(user2.id) // Same user
    expect(user1.id).toMatch(/^[0-9a-f-]{36}$/) // Valid UUID
  })

  test('persists user across sessions', () => {
    const user1 = UserManager.getOrCreateUser()
    
    // Simulate page reload
    const stored = localStorage.getItem('translator-user')
    expect(stored).toBeTruthy()
    
    const user2 = UserManager.getOrCreateUser()
    expect(user2.id).toBe(user1.id)
  })

  test('tracks session history', () => {
    UserManager.addToSessionHistory('1234')
    UserManager.addToSessionHistory('5678')
    
    const history = UserManager.getSessionHistory()
    expect(history).toHaveLength(2)
    expect(history[0].code).toBe('5678') // Most recent first
  })
})
```

### Test 2: Session State Manager
```typescript
// tests/features/session/SessionStateManager.test.ts
import { SessionStateManager } from '@/features/session/SessionStateManager'

describe('SessionStateManager', () => {
  test('handles connection states', async () => {
    const manager = new SessionStateManager()
    const states: ConnectionState[] = []
    
    manager.subscribe((state) => {
      states.push(state.connectionState)
    })
    
    await manager.initialize('1234')
    
    expect(states).toContain('connecting')
    expect(states).toContain('connected')
  })

  test('attempts reconnection on disconnect', async () => {
    const manager = new SessionStateManager()
    let reconnectAttempts = 0
    
    manager.subscribe((state) => {
      reconnectAttempts = state.reconnectAttempts
    })
    
    // Simulate disconnect
    manager['handleDisconnect']()
    
    // Wait for reconnect attempt
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    expect(reconnectAttempts).toBeGreaterThan(0)
  })
})
```

### Test 3: Session Expiry
```typescript
// tests/integration/session-expiry.test.ts
describe('Session Expiry', () => {
  test('detects expired session', async () => {
    const expiredSession = {
      id: 'test',
      code: '1234',
      expires_at: new Date(Date.now() - 1000).toISOString(), // Past
      is_active: true,
    }
    
    const isActive = await SessionService.checkSessionActive(expiredSession.id)
    expect(isActive).toBe(false)
  })
})
```

### Manual Test Checklist
- [ ] User ID persists across page reloads
- [ ] Session history shows recent sessions
- [ ] Auto-reconnection works on disconnect
- [ ] Connection status updates correctly
- [ ] Session expiry warning appears
- [ ] Leave session confirmation works
- [ ] Heartbeat keeps session active
- [ ] Browser warning on page close
- [ ] Session recovery from history works
- [ ] Reconnect attempts follow delays

## Refactoring Checklist
- [ ] Extract reconnection logic to separate class
- [ ] Add session analytics tracking
- [ ] Implement session transfer between devices
- [ ] Add session password protection
- [ ] Create session invitation links
- [ ] Add user presence indicators
- [ ] Implement graceful degradation

## Success Criteria
- [ ] User ID persists reliably
- [ ] Sessions reconnect automatically
- [ ] Expiry handled gracefully
- [ ] Connection states accurate
- [ ] History tracking works
- [ ] Leave/cleanup complete
- [ ] No memory leaks
- [ ] Progressive retry delays work

## Common Issues & Solutions

### Issue: User ID changes unexpectedly
**Solution**: Check localStorage corruption, add validation

### Issue: Infinite reconnection loops
**Solution**: Implement max attempts and exponential backoff

### Issue: Session expires during use
**Solution**: Implement heartbeat and activity tracking

### Issue: Memory leaks from subscriptions
**Solution**: Ensure proper cleanup in useEffect returns

## Performance Considerations
- Debounce heartbeat requests
- Batch state updates
- Clean up event listeners
- Use connection pooling
- Implement lazy session checks

## Security Notes
- Validate session codes
- Sanitize user inputs
- Rate limit join attempts
- Implement CSRF protection
- Log suspicious activity

## CRITICAL: Comprehensive Testing Before Deployment

### Automated Test Suite
Before marking Phase 6 complete, create and run a comprehensive test suite that validates ALL session management functionality:

#### 1. Unit Tests (src/tests/unit/phase6/)
```bash
# Create unit tests for all session components
npm test src/tests/unit/phase6/
```

**Required Tests:**
- `UserManager.test.ts` - User persistence, language detection, session history
- `SessionReconnect.test.ts` - Reconnection logic, exponential backoff, max attempts
- `SessionExpiry.test.ts` - Warning timers, heartbeat, session extension
- `ConnectionStatus.test.ts` - Network state detection, UI updates
- `useSessionPersistence.test.ts` - Local storage, recovery, validation
- `usePresenceTracking.test.ts` - User activity, heartbeat timing

#### 2. Integration Tests (src/tests/integration/phase6/)
```bash
# Test session component interactions
npm test src/tests/integration/phase6/
```

**Required Tests:**
- `session-lifecycle.test.ts` - Join → active → expiry → cleanup
- `reconnection-flow.test.ts` - Disconnect → retry → success/failure
- `multi-user-presence.test.ts` - Multiple users in session
- `session-recovery.test.ts` - Browser refresh, page reload scenarios
- `heartbeat-system.test.ts` - Keep-alive timing, failure detection

#### 3. End-to-End Tests (src/tests/e2e/phase6/)
```bash
# Test complete session workflows
npm run test:e2e -- --grep "Phase 6"
```

**Required Scenarios:**
- Full session lifecycle from creation to cleanup
- Network disconnection and automatic reconnection
- Session expiry with warning and extension
- Multiple browser tabs/windows behavior
- Cross-device session sharing

#### 4. Performance Tests
```bash
# Test session management performance
npm run test:performance
```

**Required Benchmarks:**
- User ID retrieval time < 10ms
- Session validation < 50ms
- Reconnection attempt interval accuracy
- Heartbeat timing precision ±100ms
- Memory usage with long-running sessions

#### 5. Manual Testing Checklist
**MUST TEST LOCALLY BEFORE TELLING USER TO TEST:**

**User Persistence:**
- [ ] User ID persists after browser refresh
- [ ] User preferences saved and restored
- [ ] Session history tracks recent sessions
- [ ] Language detection works correctly
- [ ] User data validation prevents corruption

**Session Lifecycle:**
- [ ] Session creation sets proper expiry
- [ ] Join session validates code format
- [ ] Active session shows correct status
- [ ] Session expiry warning appears at 30min & 5min
- [ ] Manual session extension works
- [ ] Leave session cleanup complete

**Connection Management:**
- [ ] Network disconnection detected
- [ ] Reconnection attempts with progressive delays
- [ ] Max reconnection attempts respected
- [ ] Connection status UI accurate
- [ ] Manual reconnect button works

**Presence & Heartbeat:**
- [ ] User presence tracked accurately
- [ ] Heartbeat maintains session activity
- [ ] Idle detection after 5 minutes
- [ ] Last activity timestamp updates
- [ ] Multiple user presence in same session

**Error Scenarios:**
- [ ] Invalid session codes handled gracefully
- [ ] Expired session recovery or redirect
- [ ] Corrupted localStorage recovery
- [ ] Network timeout handling
- [ ] Server unavailable fallback

**Browser Integration:**
- [ ] Page reload preserves session state
- [ ] Browser close warning when in active session
- [ ] Multiple tabs/windows behavior
- [ ] Mobile app lifecycle (background/foreground)
- [ ] Offline mode detection

### Test Execution Requirements

#### Before Deployment:
1. **Run All Tests:** Every test MUST pass
```bash
npm test                    # Unit tests
npm run test:integration   # Integration tests  
npm run test:e2e          # End-to-end tests
npm run test:performance  # Performance tests
npm run lint              # Code quality
npm run type-check        # TypeScript validation
```

2. **Manual Verification:** Complete ALL checklist items above

3. **Performance Validation:**
   - User operations < 50ms response
   - Heartbeat accuracy ±100ms
   - Memory stable during long sessions
   - No memory leaks from subscriptions

4. **Error Scenario Testing:**
   - Network interruptions at different phases
   - Server failures during session operations
   - Invalid/corrupted session data
   - Concurrent user operations

### Test Implementation Template

```typescript
// src/tests/phase6/complete-validation.test.ts
describe('Phase 6 Complete Validation', () => {
  describe('User Management System', () => {
    test('persists user across browser sessions', async () => {
      // Create user
      // Simulate browser refresh
      // Verify persistence
    })
    
    test('handles corrupted user data gracefully', async () => {
      // Corrupt localStorage
      // Verify recovery
      // Check new user creation
    })
  })

  describe('Session Reconnection', () => {
    test('follows progressive retry delays', async () => {
      // Simulate disconnection
      // Monitor retry attempts
      // Verify timing: 1s, 2s, 5s, 10s, 30s
    })
    
    test('stops after max attempts', async () => {
      // Fail all reconnection attempts
      // Verify max attempts respected
      // Check final error state
    })
  })

  describe('Session Expiry Management', () => {
    test('shows warnings at correct times', async () => {
      // Create session near expiry
      // Verify 30min warning
      // Verify 5min warning
      // Test extension functionality
    })
  })

  describe('Performance Requirements', () => {
    test('session operations under 50ms', async () => {
      // Measure user operations
      // Verify response times
      // Test under load
    })
    
    test('heartbeat timing accuracy', async () => {
      // Monitor heartbeat intervals
      // Verify ±100ms accuracy
      // Test network variations
    })
  })
})
```

### Deployment Readiness Criteria

**ALL of the following MUST be true before deployment:**

✅ **All automated tests pass (100% success rate)**
✅ **Manual testing checklist completed**  
✅ **Performance benchmarks met**
✅ **Session lifecycle works reliably**
✅ **Reconnection logic robust**
✅ **Memory usage stable over time**
✅ **Error scenarios handled gracefully**
✅ **Code quality checks pass (lint + type-check)**
✅ **No console errors during normal operation**

### Test Failure Protocol

**If ANY test fails:**
1. **STOP deployment immediately**
2. **Fix the failing functionality**
3. **Re-run complete test suite**
4. **Update tests if needed**
5. **Only proceed when ALL tests pass**

**Remember:** Never tell the user to test until YOU have verified everything works perfectly locally.

### Critical Session Test Scenarios

#### Scenario 1: Long-Running Session
- Create session, keep active for 2+ hours
- Monitor memory usage and performance
- Verify heartbeat consistency
- Test session extension before expiry

#### Scenario 2: Network Interruption
- Join session, establish connection
- Simulate network disconnection (airplane mode)
- Verify reconnection attempts and UI feedback
- Restore network, verify successful reconnection

#### Scenario 3: Multi-Tab Behavior
- Open session in multiple browser tabs
- Verify consistent state across tabs
- Test session operations from different tabs
- Ensure proper cleanup when tabs close

#### Scenario 4: Mobile Lifecycle
- Join session on mobile browser
- Background/foreground app multiple times
- Verify session persistence and reconnection
- Test during phone calls or interruptions

## Next Steps
- Phase 7: Performance optimization
- Implement caching strategies
- Add performance monitoring
- Optimize bundle size