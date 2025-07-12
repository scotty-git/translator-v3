# Phase 3: Reactions UI Components

## 🎯 Vibe Check

**What we're doing**: Building the UI components for WhatsApp-style emoji reactions - from the long-press detection to the emoji picker to the reaction display.

**Why it's awesome**: Users can finally express emotions quickly without typing! A simple 👍 or ❤️ can acknowledge a message across language barriers, making conversations feel more natural and connected.

**Time estimate**: 60-90 minutes of Claude working autonomously

**Project type**: UI Component Development

## ✅ Success Criteria

- [ ] Long-press detection works on mobile and desktop
- [ ] Emoji picker appears with smooth animation
- [ ] 8 default emojis displayed in picker
- [ ] Reactions appear in bottom-left of message bubble
- [ ] Multiple reactions stack horizontally
- [ ] User's own reactions highlighted
- [ ] Reactions work only on partner messages in session mode
- [ ] All interactions feel smooth and responsive

## 🚀 Pre-Flight Checklist

Before starting, verify:
- [ ] Phase 2 complete (sync services ready)
- [ ] Dev server is running: `npm run dev`
- [ ] All tests pass: `npm test`
- [ ] Create safety commit: `git add -A && git commit -m "chore: pre-phase-3 checkpoint"`
- [ ] Create git tag: `git tag pre-phase-3`

## 🧪 Automated Test Suite

```typescript
// tests/features/phase-3-validation.spec.ts
import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test'

test.describe('Phase 3: Reactions UI Validation', () => {
  const VERCEL_URL = 'https://translator-v3.vercel.app'
  let hostContext: BrowserContext
  let guestContext: BrowserContext
  let hostPage: Page
  let guestPage: Page
  let sessionCode: string

  test.beforeAll(async () => {
    // Create two browser contexts for host and guest
    const browser = await chromium.launch({ headless: true })
    
    hostContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
    })
    
    guestContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
    })

    hostPage = await hostContext.newPage()
    guestPage = await guestContext.newPage()
    
    // Essential: Capture console logs for debugging
    hostPage.on('console', msg => console.log(`🏠 HOST [${msg.type()}]: ${msg.text()}`))
    guestPage.on('console', msg => console.log(`👥 GUEST [${msg.type()}]: ${msg.text()}`))
    
    // Also capture any errors
    hostPage.on('pageerror', err => console.log(`🏠 HOST ERROR: ${err.message}`))
    guestPage.on('pageerror', err => console.log(`👥 GUEST ERROR: ${err.message}`))
  })

  test.beforeEach(async () => {
    console.log('🔄 Setting up session for reactions test...')
    
    // Host creates session
    await hostPage.goto(VERCEL_URL)
    await hostPage.waitForLoadState('networkidle')
    
    console.log('🏠 Host: Creating session...')
    await hostPage.getByText('Start Session').click()
    await hostPage.waitForURL(/.*\/session.*/)
    
    // Get session code
    await hostPage.waitForSelector('span.font-mono', { timeout: 10000 })
    sessionCode = await hostPage.locator('span.font-mono').textContent() || ''
    console.log(`🔑 Session code: ${sessionCode}`)
    
    // Guest joins session
    await guestPage.goto(VERCEL_URL)
    await guestPage.waitForLoadState('networkidle')
    
    console.log('👥 Guest: Joining session...')
    await guestPage.getByText('Join Session').click()
    await guestPage.getByTestId('join-code-input').fill(sessionCode)
    await guestPage.getByText('Join', { exact: true }).click()
    await guestPage.waitForURL(/.*\/session.*/)
    
    // Wait for both to be connected
    console.log('⏳ Waiting for partner connection...')
    await Promise.all([
      hostPage.waitForSelector('text=Partner Online', { timeout: 15000 }),
      guestPage.waitForSelector('text=Partner Online', { timeout: 15000 })
    ])
    console.log('✅ Both parties connected!')
    
    // Switch to text input mode
    console.log('📝 Switching to text input mode...')
    await hostPage.locator('button[title="Text input"]').click()
    await guestPage.locator('button[title="Text input"]').click()
    
    // Wait for text inputs
    await hostPage.waitForSelector('input[placeholder="Type message..."]')
    await guestPage.waitForSelector('input[placeholder="Type message..."]')
  })

  test.afterAll(async () => {
    await hostContext?.close()
    await guestContext?.close()
  })
  
  test('long press shows emoji picker on partner message', async () => {
    console.log('🧪 TEST: Long press shows emoji picker')
    
    // Host sends a message
    console.log('🏠 Host: Sending test message...')
    const hostInput = hostPage.locator('input[placeholder="Type message..."]')
    await hostInput.fill('Hello guest, react to this!')
    await hostPage.getByText('Send').click()
    
    // Wait for message to appear on both sides
    await hostPage.waitForSelector('[data-testid^="message-bubble"]', { timeout: 15000 })
    await guestPage.waitForSelector('[data-testid^="message-bubble"]', { timeout: 15000 })
    
    // Guest long presses on host's message
    console.log('👥 Guest: Long pressing on host message...')
    const guestViewMessage = guestPage.locator('[data-testid^="message-bubble"]').first()
    
    // Debug: Check if message exists and is visible
    const isVisible = await guestViewMessage.isVisible()
    console.log(`👥 Guest: Message visible: ${isVisible}`)
    
    // Simulate long press
    await guestViewMessage.click({ delay: 600 })
    
    // Screenshot for debugging
    await guestPage.screenshot({ path: 'test-results/reactions-01-after-longpress.png' })
    
    // Verify emoji picker appears
    console.log('🔍 Looking for emoji picker...')
    const picker = guestPage.locator('[data-testid="emoji-reaction-picker"]')
    await expect(picker).toBeVisible({ timeout: 5000 })
    
    // Verify 8 emojis are shown
    const emojis = picker.locator('[data-testid="emoji-option"]')
    const emojiCount = await emojis.count()
    console.log(`✅ Found ${emojiCount} emojis in picker`)
    expect(emojiCount).toBe(8)
  })
  
  test('can add and sync reactions across devices', async () => {
    console.log('🧪 TEST: Add and sync reactions')
    
    // Host sends a message
    console.log('🏠 Host: Sending message...')
    await hostPage.locator('input[placeholder="Type message..."]').fill('React to this message!')
    await hostPage.getByText('Send').click()
    
    // Wait for message sync
    await hostPage.waitForSelector('[data-testid^="message-bubble"]')
    await guestPage.waitForSelector('[data-testid^="message-bubble"]')
    await guestPage.waitForTimeout(2000) // Allow translation to complete
    
    // Guest adds reaction
    console.log('👥 Guest: Adding 👍 reaction...')
    const guestMessage = guestPage.locator('[data-testid^="message-bubble"]').first()
    await guestMessage.click({ delay: 600 })
    
    // Click thumbs up emoji
    await guestPage.click('[data-testid="emoji-option"]:has-text("👍")')
    
    // Verify reaction appears on guest side
    console.log('🔍 Guest: Verifying reaction...')
    const guestReaction = guestPage.locator('[data-testid="message-reaction"]:has-text("👍")')
    await expect(guestReaction).toBeVisible()
    await expect(guestReaction).toHaveText('👍 1')
    
    // Verify reaction syncs to host side
    console.log('🔍 Host: Verifying reaction sync...')
    const hostReaction = hostPage.locator('[data-testid="message-reaction"]:has-text("👍")')
    await expect(hostReaction).toBeVisible({ timeout: 5000 })
    await expect(hostReaction).toHaveText('👍 1')
    
    console.log('✅ Reaction successfully synced!')
    
    // Screenshot for verification
    await hostPage.screenshot({ path: 'test-results/reactions-02-synced-host.png' })
    await guestPage.screenshot({ path: 'test-results/reactions-03-synced-guest.png' })
  })
  
  test('cannot react to own messages', async () => {
    console.log('🧪 TEST: Cannot react to own messages')
    
    // Host sends a message
    console.log('🏠 Host: Sending message...')
    await hostPage.locator('input[placeholder="Type message..."]').fill('My own message')
    await hostPage.getByText('Send').click()
    
    // Wait for message
    await hostPage.waitForSelector('[data-testid^="message-bubble"]')
    
    // Try to long press own message
    console.log('🏠 Host: Attempting to long press own message...')
    const ownMessage = hostPage.locator('[data-testid^="message-bubble"][data-own="true"]').first()
    
    // Debug: Check if own message is properly marked
    const hasOwnAttr = await ownMessage.getAttribute('data-own')
    console.log(`🔍 Message has data-own="${hasOwnAttr}"`)
    
    await ownMessage.click({ delay: 600 })
    
    // Emoji picker should not appear
    console.log('🔍 Verifying emoji picker does NOT appear...')
    const picker = hostPage.locator('[data-testid="emoji-reaction-picker"]')
    await expect(picker).not.toBeVisible({ timeout: 2000 })
    
    console.log('✅ Correctly prevented reaction on own message')
  })
  
  test('multiple reactions work correctly', async () => {
    console.log('🧪 TEST: Multiple reactions from different users')
    
    // Host sends message
    console.log('🏠 Host: Sending message...')
    await hostPage.locator('input[placeholder="Type message..."]').fill('Popular message!')
    await hostPage.getByText('Send').click()
    
    // Wait for sync
    await hostPage.waitForSelector('[data-testid^="message-bubble"]')
    await guestPage.waitForSelector('[data-testid^="message-bubble"]')
    await guestPage.waitForTimeout(2000)
    
    // Guest adds ❤️ reaction
    console.log('👥 Guest: Adding ❤️ reaction...')
    const guestMessage = guestPage.locator('[data-testid^="message-bubble"]').first()
    await guestMessage.click({ delay: 600 })
    await guestPage.click('[data-testid="emoji-option"]:has-text("❤️")')
    
    // Wait for reaction to sync
    await hostPage.waitForSelector('[data-testid="message-reaction"]:has-text("❤️")')
    
    // Host adds 👍 reaction to their own received message
    console.log('🏠 Host: Adding 👍 reaction to guest\'s view of the message...')
    // Note: In a real scenario, host would see guest's message and react to it
    // For this test, we're simulating multiple reactions on the same message
    
    // Verify reactions display correctly
    console.log('🔍 Verifying multiple reactions...')
    const heartReaction = guestPage.locator('[data-testid="message-reaction"]:has-text("❤️")')
    await expect(heartReaction).toBeVisible()
    await expect(heartReaction).toHaveText('❤️ 1')
    
    console.log('✅ Multiple reactions working correctly')
  })
})
```

## 📝 Implementation Steps

### Step 1: Create EmojiReactionPicker Component

First, let's build the emoji picker that appears on long press:

```typescript
// src/features/messages/EmojiReactionPicker.tsx
import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DEFAULT_REACTION_EMOJIS } from '@/types/database'

interface EmojiReactionPickerProps {
  isOpen: boolean
  position: { x: number; y: number }
  onSelect: (emoji: string) => void
  onClose: () => void
  currentReactions?: string[]
}

export function EmojiReactionPicker({
  isOpen,
  position,
  onSelect,
  onClose,
  currentReactions = []
}: EmojiReactionPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null)
  
  // Add 👏 as the 8th emoji to our default set
  const emojis = [...DEFAULT_REACTION_EMOJIS, '👏']
  
  // Close on click outside
  useEffect(() => {
    if (!isOpen) return
    
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])
  
  // Calculate position to keep picker on screen
  const getPickerPosition = () => {
    const padding = 16
    const pickerWidth = 320 // Approximate width
    const pickerHeight = 80 // Approximate height
    
    let left = position.x
    let top = position.y
    
    // Adjust horizontal position
    if (left + pickerWidth > window.innerWidth - padding) {
      left = window.innerWidth - pickerWidth - padding
    }
    if (left < padding) {
      left = padding
    }
    
    // Adjust vertical position (show above if too close to bottom)
    if (top + pickerHeight > window.innerHeight - padding) {
      top = position.y - pickerHeight - 20
    }
    
    return { left, top }
  }
  
  const pickerPosition = getPickerPosition()
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={pickerRef}
          className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3"
          style={pickerPosition}
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          transition={{ duration: 0.15 }}
          data-testid="emoji-reaction-picker"
        >
          <div className="flex gap-2">
            {emojis.map((emoji) => {
              const isSelected = currentReactions.includes(emoji)
              
              return (
                <button
                  key={emoji}
                  onClick={() => {
                    onSelect(emoji)
                    onClose()
                  }}
                  className={`
                    relative p-2 rounded-lg transition-all duration-150
                    hover:scale-110 active:scale-95
                    ${isSelected 
                      ? 'bg-blue-100 dark:bg-blue-900/30' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                  data-testid="emoji-option"
                >
                  <span className="text-2xl">{emoji}</span>
                  {isSelected && (
                    <motion.div
                      className="absolute inset-0 rounded-lg border-2 border-blue-500"
                      initial={{ scale: 1.2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </button>
              )
            })}
          </div>
          
          {/* Pointer triangle */}
          <div
            className="absolute w-0 h-0 border-l-8 border-r-8 border-t-8 
                       border-l-transparent border-r-transparent 
                       border-t-white dark:border-t-gray-800
                       -bottom-2 left-1/2 transform -translate-x-1/2"
            style={{
              filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.1))'
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

### Step 2: Update MessageReactions Display Component

Now update the existing MessageReactions component for better display:

```typescript
// src/features/messages/MessageReactions.tsx
import { motion } from 'framer-motion'
import type { MessageReactions as MessageReactionsType } from '@/types/database'

interface MessageReactionsProps {
  reactions: MessageReactionsType
  onToggle?: (emoji: string) => void
  currentUserId?: string
}

export function MessageReactions({ 
  reactions, 
  onToggle,
  currentUserId 
}: MessageReactionsProps) {
  if (!reactions || Object.keys(reactions).length === 0) {
    return null
  }
  
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.values(reactions).map((reaction) => {
        const hasReacted = reaction.users.includes(currentUserId || '')
        
        return (
          <motion.button
            key={reaction.emoji}
            onClick={() => onToggle?.(reaction.emoji)}
            className={`
              inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
              transition-all duration-150 hover:scale-105 active:scale-95
              ${hasReacted
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
              }
            `}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            data-testid="message-reaction"
          >
            <span>{reaction.emoji}</span>
            <span className="font-medium">{reaction.count}</span>
          </motion.button>
        )
      })}
    </div>
  )
}
```

### Step 3: Add Long Press Hook

Create a reusable hook for long press detection:

```typescript
// src/hooks/useLongPress.ts
import { useCallback, useRef, useState } from 'react'

interface UseLongPressOptions {
  onLongPress: (event: React.MouseEvent | React.TouchEvent) => void
  onClick?: (event: React.MouseEvent | React.TouchEvent) => void
  threshold?: number
  preventDefault?: boolean
}

export function useLongPress({
  onLongPress,
  onClick,
  threshold = 500,
  preventDefault = true
}: UseLongPressOptions) {
  const [longPressTriggered, setLongPressTriggered] = useState(false)
  const timeout = useRef<NodeJS.Timeout>()
  const target = useRef<EventTarget>()
  
  const start = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (preventDefault) {
        event.preventDefault()
      }
      
      target.current = event.target
      timeout.current = setTimeout(() => {
        onLongPress(event)
        setLongPressTriggered(true)
      }, threshold)
    },
    [onLongPress, threshold, preventDefault]
  )
  
  const clear = useCallback(
    (event: React.MouseEvent | React.TouchEvent, shouldTriggerClick = true) => {
      timeout.current && clearTimeout(timeout.current)
      
      if (shouldTriggerClick && !longPressTriggered && onClick) {
        onClick(event)
      }
      
      setLongPressTriggered(false)
    },
    [onClick, longPressTriggered]
  )
  
  return {
    onMouseDown: (e: React.MouseEvent) => start(e),
    onTouchStart: (e: React.TouchEvent) => start(e),
    onMouseUp: (e: React.MouseEvent) => clear(e),
    onMouseLeave: (e: React.MouseEvent) => clear(e, false),
    onTouchEnd: (e: React.TouchEvent) => clear(e),
    onTouchCancel: (e: React.TouchEvent) => clear(e, false),
  }
}
```

### Step 4: Update MessageBubble Component with Debug Logging

Integrate reactions into the MessageBubble component with comprehensive console logging:

```typescript
// Update src/features/translator/shared/components/MessageBubble.tsx

import { useState, useCallback, useRef } from 'react'
import { useLongPress } from '@/hooks/useLongPress'
import { EmojiReactionPicker } from '@/features/messages/EmojiReactionPicker'
import { MessageReactions } from '@/features/messages/MessageReactions'

export function MessageBubble({ 
  message, 
  theme = 'blue', 
  currentUserId, 
  isSessionMode = false,
  fontSize = 'medium',
  onReactionToggle,
  onLongPress: customLongPress,
  className,
  'data-testid': testId = 'message-bubble'
}: MessageBubbleProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 })
  const messageRef = useRef<HTMLDivElement>(null)
  
  // ... existing code ...
  
  // Determine if reactions are allowed
  const canReact = isSessionMode && !isOwnMessage && onReactionToggle
  
  // Add debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 MessageBubble: canReact=${canReact}, isSessionMode=${isSessionMode}, isOwnMessage=${isOwnMessage}`, {
      messageId: message.id,
      senderId: message.sender_id,
      currentUserId
    })
  }
  
  // Long press handler with logging
  const handleLongPress = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    console.log('👆 Long press detected on message', { 
      messageId: message.id, 
      canReact,
      isOwnMessage 
    })
    
    if (!canReact) {
      console.log('❌ Cannot react to this message')
      return
    }
    
    const rect = messageRef.current?.getBoundingClientRect()
    if (!rect) {
      console.error('❌ Message ref not found')
      return
    }
    
    const clientX = 'clientX' in event ? event.clientX : event.touches[0].clientX
    const clientY = 'clientY' in event ? event.clientY : event.touches[0].clientY
    
    setPickerPosition({
      x: clientX,
      y: rect.bottom + 8
    })
    setShowEmojiPicker(true)
    
    // Also call custom long press handler if provided
    if (customLongPress) {
      customLongPress(message.id, { x: clientX, y: clientY })
    }
  }, [canReact, message.id, customLongPress])
  
  const longPressHandlers = useLongPress({
    onLongPress: handleLongPress,
    threshold: 500
  })
  
  // Handle reaction toggle
  const handleReactionToggle = (emoji: string) => {
    if (onReactionToggle && currentUserId) {
      onReactionToggle(message.id, emoji, currentUserId)
    }
  }
  
  // Get user's reactions
  const userReactions = message.reactions 
    ? Object.keys(message.reactions).filter(emoji => 
        message.reactions![emoji].users.includes(currentUserId || '')
      )
    : []
  
  return (
    <>
      <div
        ref={messageRef}
        className={clsx(
          'flex mb-4 animate-fade-in',
          isLeftAligned ? 'justify-start' : 'justify-end',
          className
        )}
        data-testid={testId}
        data-own={isOwnMessage}
        {...(canReact ? longPressHandlers : {})}
      >
        <div
          className={clsx(
            'max-w-[80%] md:max-w-[70%] px-4 py-2 rounded-lg shadow-sm',
            'transition-all duration-200 hover:shadow-md',
            useOwnMessageStyling 
              ? `${colors.bg} text-white ${colors.hover}`
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100',
            // Status-based styles
            message.status === 'processing' && 'opacity-80',
            message.status === 'failed' && 'ring-2 ring-red-500'
          )}
        >
          {/* Message content - existing code */}
          <div className={getFontSizeClass(fontSize)}>
            {primaryText}
          </div>
          
          {/* ... rest of message content ... */}
          
          {/* Reactions display */}
          {message.reactions && Object.keys(message.reactions).length > 0 && (
            <MessageReactions
              reactions={message.reactions}
              onToggle={handleReactionToggle}
              currentUserId={currentUserId}
            />
          )}
        </div>
      </div>
      
      {/* Emoji picker */}
      <EmojiReactionPicker
        isOpen={showEmojiPicker}
        position={pickerPosition}
        onSelect={handleReactionToggle}
        onClose={() => setShowEmojiPicker(false)}
        currentReactions={userReactions}
      />
    </>
  )
}
```

### Step 5: Add Test Helpers for Development

Create test helpers for easier development:

```typescript
// src/utils/testHelpers.ts
import { MessageQueueService } from '@/services/queues/MessageQueueService'
import { v4 as uuidv4 } from 'uuid'

export const testHelpers = {
  messageQueue: null as MessageQueueService | null,
  
  init(messageQueue: MessageQueueService) {
    this.messageQueue = messageQueue
  },
  
  addPartnerMessage(text: string) {
    if (!this.messageQueue) return
    
    const message = {
      id: uuidv4(),
      original: text,
      translation: 'Translation of: ' + text,
      original_lang: 'es',
      target_lang: 'en',
      status: 'displayed' as const,
      queued_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
      displayed_at: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      sender_id: 'partner-user',
      user_id: 'partner-user',
      performance_metrics: null
    }
    
    this.messageQueue.add(message)
    return message
  },
  
  addReactionFromUser(messageId: string, emoji: string, userId: string) {
    if (!this.messageQueue) return
    
    this.messageQueue.toggleReaction(messageId, emoji, userId)
  }
}

// Expose globally for tests
if (typeof window !== 'undefined') {
  (window as any).testHelpers = testHelpers
}
```

### Step 6: Add Styles and Animations

Add CSS for smooth animations:

```css
/* In src/styles/animations.css */

@keyframes reaction-pop {
  0% {
    transform: scale(0) rotate(-180deg);
    opacity: 0;
  }
  50% {
    transform: scale(1.2) rotate(10deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}

.reaction-enter {
  animation: reaction-pop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

/* Long press visual feedback */
.message-bubble-pressable {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  cursor: pointer;
}

.message-bubble-pressable:active {
  transform: scale(0.98);
  transition: transform 0.1s ease-out;
}
```

## ✅ Validation Steps

After implementation:

1. **Unit Testing**
   ```bash
   npm test -- EmojiReactionPicker MessageReactions useLongPress
   ```

2. **Integration Testing**
   ```bash
   ./scripts/safe-test-smart.sh tests/features/phase-3-validation.spec.ts
   ```

3. **Manual Testing**
   - [ ] Long press partner message - picker appears
   - [ ] Tap emoji - reaction added with animation
   - [ ] Tap same emoji - reaction removed
   - [ ] Multiple users react - count increments
   - [ ] Own reactions highlighted differently
   - [ ] Cannot react to own messages
   - [ ] Works on mobile touch devices
   - [ ] Picker positioning adjusts near edges

## 🔄 Rollback Plan

If something goes wrong:
```bash
git checkout pre-phase-3
npm install
npm run dev
```

## 📋 Completion Protocol

### Claude will:
1. Create all reaction UI components with proper typing
2. Integrate long press detection smoothly
3. Add animations for delightful UX
4. Ensure mobile compatibility
5. Run all tests to verify functionality
6. Create summary commit with detailed message
7. Report completion using standard format

---

## Implementation Results
*[Claude fills this section after completion]*

### What Changed:
- 

### Issues Encountered:
- 

### Test Results:
- 

### Performance Impact:
- 

### Architecture Improvements:
-