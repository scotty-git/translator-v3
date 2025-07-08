# Phase 5: Message System & Real-time Updates

## Overview
Implement the complete message system with real-time updates, message queue management, and status indicators.

## Prerequisites
- Phase 0-4 completed
- Supabase real-time configured
- Translation pipeline working
- UI components ready

## Goals
- Build message queue system
- Implement real-time message sync
- Create status indicators
- Handle message ordering
- Display translated messages
- Track performance metrics

## Implementation Steps

### 1. Create Message Queue System

#### Message Queue Manager (src/features/messages/MessageQueue.ts)
```typescript
import { Message, MessageStatus } from '@/types/database'
import { MessageService } from '@/services/supabase'

export interface QueuedMessage extends Message {
  localId: string
  retryCount: number
  displayOrder: number
}

export class MessageQueue {
  private queue: Map<string, QueuedMessage> = new Map()
  private processing = false
  private displayOrder = 0
  private listeners: Set<(messages: QueuedMessage[]) => void> = new Set()

  /**
   * Add a message to the queue
   */
  async add(message: Message): Promise<void> {
    const queuedMessage: QueuedMessage = {
      ...message,
      localId: `local-${Date.now()}-${Math.random()}`,
      retryCount: 0,
      displayOrder: this.displayOrder++,
    }
    
    this.queue.set(message.id, queuedMessage)
    this.notifyListeners()
    
    if (!this.processing) {
      this.processQueue()
    }
  }

  /**
   * Update message status
   */
  updateStatus(messageId: string, status: MessageStatus): void {
    const message = this.queue.get(messageId)
    if (message) {
      message.status = status
      if (status === 'displayed') {
        message.displayed_at = new Date().toISOString()
      }
      this.notifyListeners()
    }
  }

  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    this.processing = true
    
    // Get messages that need processing
    const pendingMessages = Array.from(this.queue.values())
      .filter(m => m.status === 'queued' || m.status === 'processing')
      .sort((a, b) => a.displayOrder - b.displayOrder)
    
    for (const message of pendingMessages) {
      // Wait for previous messages to be displayed
      const previousMessages = Array.from(this.queue.values())
        .filter(m => m.displayOrder < message.displayOrder && m.status !== 'displayed')
      
      if (previousMessages.length > 0) {
        // Wait a bit and check again
        await new Promise(resolve => setTimeout(resolve, 100))
        continue
      }
      
      // Process this message
      if (message.status === 'processing' && message.translation) {
        // Mark as displayed
        await MessageService.markMessageDisplayed(message.id)
        this.updateStatus(message.id, 'displayed')
      }
    }
    
    this.processing = false
    
    // Check if more processing needed
    const hasMore = Array.from(this.queue.values())
      .some(m => m.status !== 'displayed' && m.status !== 'failed')
    
    if (hasMore) {
      setTimeout(() => this.processQueue(), 100)
    }
  }

  /**
   * Get ordered messages for display
   */
  getDisplayMessages(): QueuedMessage[] {
    return Array.from(this.queue.values())
      .filter(m => m.status === 'displayed' || m.status === 'processing')
      .sort((a, b) => a.displayOrder - b.displayOrder)
  }

  /**
   * Subscribe to queue updates
   */
  subscribe(listener: (messages: QueuedMessage[]) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    const messages = this.getDisplayMessages()
    this.listeners.forEach(listener => listener(messages))
  }

  /**
   * Clear old messages (keep last 50)
   */
  cleanup(): void {
    const messages = Array.from(this.queue.values())
      .sort((a, b) => b.displayOrder - a.displayOrder)
    
    if (messages.length > 50) {
      const toRemove = messages.slice(50)
      toRemove.forEach(m => this.queue.delete(m.id))
    }
  }
}

// Singleton instance
export const messageQueue = new MessageQueue()
```

### 2. Create Message Components

#### Message Bubble Component (src/features/messages/MessageBubble.tsx)
```typescript
import { clsx } from 'clsx'
import { Check, Clock, AlertCircle } from 'lucide-react'
import type { QueuedMessage } from './MessageQueue'
import { useSession } from '../session/SessionContext'

interface MessageBubbleProps {
  message: QueuedMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { userId, isLeft } = useSession()
  const isOwnMessage = message.user_id === userId
  
  // Determine which text to show based on perspective
  const displayText = isOwnMessage
    ? message.original  // Show original language for own messages
    : message.translation || message.original  // Show translation for others
    
  const languageLabel = isOwnMessage
    ? message.original_lang.toUpperCase()
    : message.target_lang.toUpperCase()

  return (
    <div
      className={clsx(
        'flex',
        isOwnMessage ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={clsx(
          'max-w-[80%] rounded-2xl px-4 py-2 shadow-sm',
          'transition-all duration-200',
          {
            'bg-primary-600 text-white': isOwnMessage,
            'bg-white border border-gray-200': !isOwnMessage,
            'opacity-70': message.status === 'queued',
            'animate-pulse': message.status === 'processing',
          }
        )}
      >
        {/* Language indicator */}
        <div
          className={clsx(
            'text-xs font-medium mb-1',
            isOwnMessage ? 'text-primary-200' : 'text-gray-500'
          )}
        >
          {languageLabel}
        </div>
        
        {/* Message text */}
        <p className={clsx(
          'text-sm',
          !isOwnMessage && 'text-gray-900'
        )}>
          {displayText}
        </p>
        
        {/* Status indicator */}
        <div className={clsx(
          'flex items-center justify-end mt-1 gap-1',
          isOwnMessage ? 'text-primary-200' : 'text-gray-400'
        )}>
          <span className="text-xs">
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
          {isOwnMessage && (
            <>
              {message.status === 'queued' && <Clock className="h-3 w-3" />}
              {message.status === 'processing' && <Clock className="h-3 w-3 animate-spin" />}
              {message.status === 'displayed' && <Check className="h-3 w-3" />}
              {message.status === 'failed' && <AlertCircle className="h-3 w-3 text-red-400" />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
```

#### Message List Component (src/features/messages/MessageList.tsx)
```typescript
import { useEffect, useRef, useState } from 'react'
import { MessageBubble } from './MessageBubble'
import { ActivityIndicator } from './ActivityIndicator'
import { messageQueue, QueuedMessage } from './MessageQueue'
import { MessageService, ActivityService } from '@/services/supabase'
import { useSession } from '../session/SessionContext'
import type { Message, UserActivity } from '@/types/database'

export function MessageList() {
  const { session, userId } = useSession()
  const [messages, setMessages] = useState<QueuedMessage[]>([])
  const [activities, setActivities] = useState<UserActivity[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load message history
  useEffect(() => {
    if (!session) return

    const loadHistory = async () => {
      try {
        const history = await MessageService.getSessionMessages(session.id)
        history.forEach(msg => messageQueue.add(msg))
      } catch (error) {
        console.error('Failed to load message history:', error)
      } finally {
        setIsLoadingHistory(false)
      }
    }

    loadHistory()
  }, [session])

  // Subscribe to message queue updates
  useEffect(() => {
    const unsubscribe = messageQueue.subscribe(setMessages)
    return unsubscribe
  }, [])

  // Subscribe to real-time messages
  useEffect(() => {
    if (!session) return

    const channel = MessageService.subscribeToMessages(
      session.id,
      (message: Message) => {
        // Add to queue if not from current user
        if (message.user_id !== userId) {
          messageQueue.add(message)
        }
        // Update existing message if from current user
        else if (message.status === 'processing') {
          messageQueue.updateStatus(message.id, 'processing')
        }
      }
    )

    return () => {
      channel.unsubscribe()
    }
  }, [session, userId])

  // Subscribe to activity updates
  useEffect(() => {
    if (!session) return

    const loadActivities = async () => {
      const currentActivities = await ActivityService.getSessionActivities(session.id)
      setActivities(currentActivities)
    }

    loadActivities()

    const channel = ActivityService.subscribeToActivities(
      session.id,
      (activity: UserActivity) => {
        setActivities(prev => {
          const filtered = prev.filter(a => a.user_id !== activity.user_id)
          if (activity.activity_type !== 'idle') {
            return [...filtered, activity]
          }
          return filtered
        })
      }
    )

    return () => {
      channel.unsubscribe()
    }
  }, [session])

  if (isLoadingHistory) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p>Loading messages...</p>
        </div>
      </div>
    )
  }

  const otherUserActivities = activities.filter(a => a.user_id !== userId)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>No messages yet</p>
            <p className="text-sm mt-2">Start recording to begin translation</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.localId} message={message} />
            ))}
          </>
        )}
        
        {/* Activity indicators */}
        {otherUserActivities.map(activity => (
          <ActivityIndicator key={activity.user_id} activity={activity} />
        ))}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
```

#### Activity Indicator Component (src/features/messages/ActivityIndicator.tsx)
```typescript
import { clsx } from 'clsx'
import type { UserActivity } from '@/types/database'

interface ActivityIndicatorProps {
  activity: UserActivity
}

export function ActivityIndicator({ activity }: ActivityIndicatorProps) {
  const getActivityText = () => {
    switch (activity.activity_type) {
      case 'typing':
        return 'Partner is typing'
      case 'recording':
        return 'Partner is recording'
      case 'processing':
        return 'Partner is processing'
      default:
        return ''
    }
  }

  const getActivityAnimation = () => {
    switch (activity.activity_type) {
      case 'typing':
        return (
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )
      case 'recording':
        return (
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <div className="text-xs text-gray-600">REC</div>
          </div>
        )
      case 'processing':
        return (
          <div className="w-4 h-4">
            <svg className="animate-spin" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex justify-start">
      <div className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-2xl">
        {getActivityAnimation()}
        <span className="text-sm text-gray-600 italic">
          {getActivityText()}...
        </span>
      </div>
    </div>
  )
}
```

### 3. Create Message State Management

#### Message Store Hook (src/hooks/useMessageStore.ts)
```typescript
import { useState, useEffect, useCallback } from 'react'
import { MessageService } from '@/services/supabase'
import { messageQueue } from '@/features/messages/MessageQueue'
import type { Message } from '@/types/database'

export interface UseMessageStoreReturn {
  isLoading: boolean
  error: string | null
  sendMessage: (text: string) => Promise<void>
  retryMessage: (messageId: string) => Promise<void>
}

export function useMessageStore(sessionId: string, userId: string): UseMessageStoreReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (text: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // This would be called from the translation pipeline
      // For now, just create the message
      const message = await MessageService.createMessage(
        sessionId,
        userId,
        text,
        'en', // TODO: Detect from user settings
        'es', // TODO: Get from session settings
      )
      
      // Add to queue
      await messageQueue.add(message)
      
    } catch (err) {
      setError('Failed to send message')
      console.error('Send message error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, userId])

  const retryMessage = useCallback(async (messageId: string) => {
    // TODO: Implement retry logic
    console.log('Retry message:', messageId)
  }, [])

  return {
    isLoading,
    error,
    sendMessage,
    retryMessage,
  }
}
```

### 4. Update Translation Pipeline Integration

#### Updated Translation Pipeline (add to existing)
```typescript
// In TranslationPipeline.ts, update the processAudioTranslation method:

// After creating the message, add it to the queue
await messageQueue.add(message)

// After updating with translation
messageQueue.updateStatus(message.id, 'processing')

// After successful completion
messageQueue.updateStatus(message.id, 'displayed')
```

### 5. Create Performance Monitoring

#### Performance Monitor (src/features/messages/PerformanceMonitor.tsx)
```typescript
import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp } from 'lucide-react'

interface PerformanceStats {
  avgWhisperTime: number
  avgTranslationTime: number
  avgTotalTime: number
  messageCount: number
}

export function PerformanceMonitor() {
  const [stats, setStats] = useState<PerformanceStats>({
    avgWhisperTime: 0,
    avgTranslationTime: 0,
    avgTotalTime: 0,
    messageCount: 0,
  })
  const [isVisible, setIsVisible] = useState(false)

  // In development, show performance stats
  useEffect(() => {
    if (import.meta.env.DEV) {
      setIsVisible(true)
    }
  }, [])

  if (!isVisible) return null

  return (
    <div className="fixed bottom-20 right-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="h-4 w-4" />
        <span className="font-bold">Performance</span>
      </div>
      <div className="space-y-1">
        <div>Whisper: {stats.avgWhisperTime}ms</div>
        <div>Translation: {stats.avgTranslationTime}ms</div>
        <div>Total: {stats.avgTotalTime}ms</div>
        <div className="pt-1 border-t border-white/20">
          Messages: {stats.messageCount}
        </div>
      </div>
    </div>
  )
}
```

### 6. Create Typing Indicator Hook

#### useTypingIndicator Hook (src/hooks/useTypingIndicator.ts)
```typescript
import { useEffect, useRef } from 'react'
import { ActivityService } from '@/services/supabase'

export function useTypingIndicator(
  sessionId: string,
  userId: string,
  isTyping: boolean
) {
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!sessionId) return

    if (isTyping) {
      // Update activity to typing
      ActivityService.updateActivity(sessionId, userId, 'typing')
      
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      // Set timeout to mark as idle
      timeoutRef.current = setTimeout(() => {
        ActivityService.updateActivity(sessionId, userId, 'idle')
      }, 3000)
    } else {
      // Mark as idle
      ActivityService.updateActivity(sessionId, userId, 'idle')
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [sessionId, userId, isTyping])
}
```

## Tests

### Test 1: Message Queue
```typescript
// tests/features/messages/MessageQueue.test.ts
import { MessageQueue } from '@/features/messages/MessageQueue'
import type { Message } from '@/types/database'

describe('MessageQueue', () => {
  let queue: MessageQueue

  beforeEach(() => {
    queue = new MessageQueue()
  })

  test('maintains message order', async () => {
    const message1 = createMockMessage('1', 'queued')
    const message2 = createMockMessage('2', 'queued')
    
    await queue.add(message1)
    await queue.add(message2)
    
    const displayed = queue.getDisplayMessages()
    expect(displayed[0].id).toBe('1')
    expect(displayed[1].id).toBe('2')
  })

  test('processes messages in order', async () => {
    const message1 = createMockMessage('1', 'processing')
    const message2 = createMockMessage('2', 'queued')
    
    await queue.add(message1)
    await queue.add(message2)
    
    // Message 2 should wait for message 1
    queue.updateStatus('1', 'displayed')
    
    // Now message 2 can be processed
    const displayed = queue.getDisplayMessages()
    expect(displayed.every(m => m.status !== 'queued')).toBe(true)
  })
})
```

### Test 2: Activity Indicators
```typescript
// tests/features/messages/ActivityIndicator.test.ts
import { render, screen } from '@testing-library/react'
import { ActivityIndicator } from '@/features/messages/ActivityIndicator'

describe('ActivityIndicator', () => {
  test('shows correct text for activities', () => {
    const activity = {
      id: '1',
      session_id: 'test',
      user_id: 'user1',
      activity_type: 'recording' as const,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    
    render(<ActivityIndicator activity={activity} />)
    expect(screen.getByText(/Partner is recording/)).toBeInTheDocument()
  })
})
```

### Test 3: Real-time Updates
```typescript
// tests/integration/realtime-messages.test.ts
describe('Real-time Message Updates', () => {
  test('receives and displays new messages', async () => {
    // Setup mock Supabase channel
    const mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    }
    
    // Test that messages appear in correct order
    // Test that status updates work
    // Test that activities update in real-time
  })
})
```

### Manual Test Checklist
- [ ] Messages appear in correct order
- [ ] Message status updates (queued → processing → displayed)
- [ ] Activity indicators show and hide correctly
- [ ] Messages scroll to bottom on new message
- [ ] Real-time updates work across sessions
- [ ] Performance metrics tracked
- [ ] Message queue handles concurrent messages
- [ ] Failed messages show error state
- [ ] Typing indicators work
- [ ] Old messages cleaned up (>50)

## Refactoring Checklist
- [ ] Extract message rendering logic
- [ ] Add virtual scrolling for long conversations
- [ ] Implement message retry mechanism
- [ ] Add message search functionality
- [ ] Create message export feature
- [ ] Add message reactions
- [ ] Implement message editing

## Success Criteria
- [ ] Messages display in guaranteed order
- [ ] Real-time updates under 100ms
- [ ] Status indicators accurate
- [ ] Message queue prevents out-of-order display
- [ ] Activity indicators show partner status
- [ ] Performance metrics collected
- [ ] Smooth scrolling behavior
- [ ] Memory efficient with many messages

## Common Issues & Solutions

### Issue: Messages out of order
**Solution**: Check queue processing logic and display order

### Issue: Duplicate messages
**Solution**: Implement deduplication by message ID

### Issue: Activity indicators stuck
**Solution**: Ensure cleanup timers working properly

### Issue: Performance degradation
**Solution**: Implement virtual scrolling and message cleanup

## Performance Considerations
- Use React.memo for message components
- Implement virtual scrolling for long chats
- Batch real-time updates
- Clean up old messages periodically
- Optimize re-renders with proper keys

## Security Notes
- Validate all real-time messages
- Sanitize message content
- Check session permissions
- Rate limit activity updates
- Prevent XSS in message display

## CRITICAL: Comprehensive Testing Before Deployment

### Automated Test Suite
Before marking Phase 5 complete, create and run a comprehensive test suite that validates ALL functionality:

#### 1. Unit Tests (src/tests/unit/phase5/)
```bash
# Create unit tests for all components
npm test src/tests/unit/phase5/
```

**Required Tests:**
- `MessageQueue.test.ts` - Queue ordering, status updates, cleanup
- `MessageBubble.test.ts` - Rendering, status indicators, language display
- `MessageList.test.ts` - Real-time updates, scrolling, history loading
- `ActivityIndicator.test.ts` - All activity types, animations
- `useMessageStore.test.ts` - Message operations, error handling
- `useTypingIndicator.test.ts` - Timing, cleanup, status updates

#### 2. Integration Tests (src/tests/integration/phase5/)
```bash
# Test component interactions
npm test src/tests/integration/phase5/
```

**Required Tests:**
- `real-time-sync.test.ts` - End-to-end message flow
- `message-ordering.test.ts` - Concurrent message handling
- `activity-flow.test.ts` - Status transitions
- `performance-tracking.test.ts` - Metrics collection
- `error-recovery.test.ts` - Failed message handling

#### 3. End-to-End Tests (src/tests/e2e/phase5/)
```bash
# Test full user workflows
npm run test:e2e -- --grep "Phase 5"
```

**Required Scenarios:**
- Two-user conversation with real-time updates
- Message queue with rapid sending
- Activity indicators during different states
- Network interruption recovery
- Long conversation performance

#### 4. Performance Tests
```bash
# Load testing with multiple users
npm run test:performance
```

**Required Benchmarks:**
- Message display latency < 100ms
- Queue processing time < 50ms
- Memory usage with 1000+ messages
- Real-time subscription stability
- Activity indicator responsiveness

#### 5. Manual Testing Checklist
**MUST TEST LOCALLY BEFORE TELLING USER TO TEST:**

**Basic Message Flow:**
- [ ] Send message → appears in queue → shows processing → displays
- [ ] Receive message → appears immediately → correct translation shown
- [ ] Message ordering preserved under rapid sending
- [ ] Message status indicators accurate (queued/processing/displayed/failed)

**Real-time Features:**
- [ ] Activity indicators appear/disappear correctly
- [ ] Typing indicators timeout after 3 seconds
- [ ] Recording indicators show during audio capture  
- [ ] Processing indicators during translation
- [ ] Multiple activities handled simultaneously

**Performance & UX:**
- [ ] Messages scroll to bottom automatically
- [ ] No visible lag in message display
- [ ] Smooth animations for status changes
- [ ] Memory usage stable over time
- [ ] Message history loads quickly

**Error Scenarios:**
- [ ] Network disconnection → reconnection works
- [ ] Failed message → retry mechanism works
- [ ] Corrupted message → error handling graceful
- [ ] Supabase connection issues → fallback behavior

**Load Testing:**
- [ ] Send 50+ messages rapidly → all appear in order
- [ ] Multiple users active → no conflicts
- [ ] Long conversation → cleanup works
- [ ] Performance metrics accurate throughout

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
   - Message latency < 100ms
   - Queue processing < 50ms
   - No memory leaks
   - Stable real-time connections

4. **Error Scenario Testing:**
   - Network interruptions
   - Server failures  
   - Invalid messages
   - Concurrent operations

### Test Implementation Template

```typescript
// src/tests/phase5/complete-validation.test.ts
describe('Phase 5 Complete Validation', () => {
  describe('Message Queue System', () => {
    test('handles concurrent messages correctly', async () => {
      // Test rapid message sending
      // Verify order preservation
      // Check status updates
    })
    
    test('processes failed messages with retry', async () => {
      // Simulate failures
      // Test retry mechanism
      // Verify error states
    })
  })

  describe('Real-time Synchronization', () => {
    test('maintains sync across multiple users', async () => {
      // Multi-user simulation
      // Real-time updates
      // Activity indicators
    })
  })

  describe('Performance Requirements', () => {
    test('meets latency requirements', async () => {
      // Measure message display time
      // Verify < 100ms requirement
      // Test under load
    })
  })
})
```

### Deployment Readiness Criteria

**ALL of the following MUST be true before deployment:**

✅ **All automated tests pass (100% success rate)**
✅ **Manual testing checklist completed**  
✅ **Performance benchmarks met**
✅ **Error scenarios handled gracefully**
✅ **Memory usage stable**
✅ **Real-time features working reliably**
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

## Next Steps
- Phase 6: Complete session management
- Add user presence tracking  
- Implement session expiry
- Add reconnection logic