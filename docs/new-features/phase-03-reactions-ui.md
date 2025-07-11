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
import { test, expect } from '@playwright/test'

test.describe('Phase 3: Reactions UI Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Start dev server and navigate to session mode
    await page.goto('http://127.0.0.1:5173')
    await page.click('button:has-text("Join Session")')
    await page.fill('input[placeholder="Enter 4-digit code"]', '1234')
    await page.click('button:has-text("Join")')
    await page.waitForTimeout(1000)
  })
  
  test('long press shows emoji picker', async ({ page }) => {
    // Send a test message as partner
    await page.evaluate(() => {
      window.testHelpers?.addPartnerMessage('Hello from partner!')
    })
    
    // Long press on partner message
    const message = page.locator('[data-testid="message-bubble"]').first()
    await message.click({ delay: 600 }) // Simulate long press
    
    // Verify emoji picker appears
    const picker = page.locator('[data-testid="emoji-reaction-picker"]')
    await expect(picker).toBeVisible()
    
    // Verify 8 emojis are shown
    const emojis = picker.locator('[data-testid="emoji-option"]')
    await expect(emojis).toHaveCount(8)
  })
  
  test('can add and remove reactions', async ({ page }) => {
    // Add partner message
    await page.evaluate(() => {
      window.testHelpers?.addPartnerMessage('Test message')
    })
    
    // Long press and select thumbs up
    const message = page.locator('[data-testid="message-bubble"]').first()
    await message.click({ delay: 600 })
    
    await page.click('[data-testid="emoji-option"]:has-text("👍")')
    
    // Verify reaction appears
    const reaction = message.locator('[data-testid="message-reaction"]:has-text("👍")')
    await expect(reaction).toBeVisible()
    await expect(reaction).toHaveText('👍 1')
    
    // Click again to remove
    await reaction.click()
    await expect(reaction).not.toBeVisible()
  })
  
  test('multiple users can react', async ({ page }) => {
    // Simulate multiple user reactions
    await page.evaluate(() => {
      const message = window.testHelpers?.addPartnerMessage('Popular message')
      window.testHelpers?.addReactionFromUser(message.id, '❤️', 'user-1')
      window.testHelpers?.addReactionFromUser(message.id, '❤️', 'user-2')
      window.testHelpers?.addReactionFromUser(message.id, '😂', 'user-3')
    })
    
    const message = page.locator('[data-testid="message-bubble"]').first()
    
    // Verify reaction counts
    await expect(message.locator('[data-testid="message-reaction"]:has-text("❤️")')).toHaveText('❤️ 2')
    await expect(message.locator('[data-testid="message-reaction"]:has-text("😂")')).toHaveText('😂  1')
  })
  
  test('cannot react to own messages', async ({ page }) => {
    // Send own message
    await page.click('[data-testid="text-input-toggle"]')
    await page.fill('[data-testid="text-input"]', 'My own message')
    await page.press('[data-testid="text-input"]', 'Enter')
    
    // Try to long press own message
    const ownMessage = page.locator('[data-testid="message-bubble"][data-own="true"]').first()
    await ownMessage.click({ delay: 600 })
    
    // Emoji picker should not appear
    await expect(page.locator('[data-testid="emoji-reaction-picker"]')).not.toBeVisible()
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

### Step 4: Update MessageBubble Component

Integrate reactions into the MessageBubble component:

```typescript
// Update src/features/translator/shared/components/MessageBubble.tsx

import { useState } from 'react'
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
  
  // ... existing code ...
  
  // Determine if reactions are allowed
  const canReact = isSessionMode && !isOwnMessage && onReactionToggle
  
  // Long press handler
  const handleLongPress = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (!canReact) return
    
    const rect = messageRef.current?.getBoundingClientRect()
    if (!rect) return
    
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
   npx playwright test tests/features/phase-3-validation.spec.ts
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