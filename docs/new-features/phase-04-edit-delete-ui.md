# Phase 4: Edit & Delete UI Components

## 🎯 Vibe Check

**What we're doing**: Building the UI for message editing and deletion - adding an edit button to messages, creating inline edit mode, and implementing the delete functionality with proper visual feedback.

**Why it's awesome**: Users can finally fix those pesky speech-to-text errors without sending a new message! Plus, they can remove messages they sent by accident, keeping conversations clean and organized.

**Time estimate**: 75-90 minutes of Claude working autonomously

**Project type**: UI Component Enhancement

## ✅ Success Criteria

- [ ] Edit button appears next to tick and audio buttons on own messages
- [ ] Clicking edit transforms message into editable text input
- [ ] Save/Cancel buttons appear during edit mode
- [ ] Original text is editable, triggers re-translation on save
- [ ] "(edited)" indicator shows on edited messages
- [ ] Long-press own messages shows delete option
- [ ] Deleted messages show "Message deleted" placeholder
- [ ] All animations are smooth and intuitive
- [ ] Works for both voice and text-originated messages

## 🚀 Pre-Flight Checklist

Before starting, verify:
- [ ] Phase 3 complete (reactions UI working)
- [ ] Dev server is running: `npm run dev`
- [ ] All tests pass: `npm test`
- [ ] Create safety commit: `git add -A && git commit -m "chore: pre-phase-4 checkpoint"`
- [ ] Create git tag: `git tag pre-phase-4`

## 🧪 Automated Test Suite

```typescript
// tests/features/phase-4-validation.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Phase 4: Edit & Delete UI Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5173')
    
    // Send a test message using text input
    await page.click('[data-testid="text-input-toggle"]')
    await page.fill('[data-testid="text-input"]', 'Hello world')
    await page.press('[data-testid="text-input"]', 'Enter')
    await page.waitForTimeout(1000)
  })
  
  test('edit button appears on own messages', async ({ page }) => {
    const message = page.locator('[data-testid="message-bubble"]').first()
    
    // Verify edit button is visible
    const editButton = message.locator('[data-testid="edit-button"]')
    await expect(editButton).toBeVisible()
    
    // Should be alongside tick and audio buttons
    await expect(message.locator('[data-testid="status-icon"]')).toBeVisible()
    await expect(message.locator('[data-testid="tts-button"]')).toBeVisible()
  })
  
  test('can edit message text', async ({ page }) => {
    const message = page.locator('[data-testid="message-bubble"]').first()
    
    // Click edit button
    await message.locator('[data-testid="edit-button"]').click()
    
    // Verify edit mode UI
    const editInput = message.locator('[data-testid="edit-input"]')
    await expect(editInput).toBeVisible()
    await expect(editInput).toHaveValue('Hello world')
    
    // Verify save/cancel buttons
    await expect(message.locator('[data-testid="save-edit-button"]')).toBeVisible()
    await expect(message.locator('[data-testid="cancel-edit-button"]')).toBeVisible()
    
    // Edit the text
    await editInput.clear()
    await editInput.fill('Hello universe')
    await message.locator('[data-testid="save-edit-button"]').click()
    
    // Verify message updated
    await expect(message.locator('[data-testid="message-text"]')).toContainText('Hello universe')
    await expect(message.locator('[data-testid="edited-indicator"]')).toBeVisible()
  })
  
  test('cancel edit restores original text', async ({ page }) => {
    const message = page.locator('[data-testid="message-bubble"]').first()
    
    // Enter edit mode
    await message.locator('[data-testid="edit-button"]').click()
    
    // Change text
    const editInput = message.locator('[data-testid="edit-input"]')
    await editInput.clear()
    await editInput.fill('Changed text')
    
    // Cancel edit
    await message.locator('[data-testid="cancel-edit-button"]').click()
    
    // Verify original text restored
    await expect(message.locator('[data-testid="message-text"]')).toContainText('Hello world')
    await expect(message.locator('[data-testid="edited-indicator"]')).not.toBeVisible()
  })
  
  test('can delete own messages', async ({ page }) => {
    // Switch to session mode for delete functionality
    await page.goto('http://127.0.0.1:5173')
    await page.click('button:has-text("Join Session")')
    await page.fill('input[placeholder="Enter 4-digit code"]', '1234')
    await page.click('button:has-text("Join")')
    await page.waitForTimeout(1000)
    
    // Send a message
    await page.click('[data-testid="text-input-toggle"]')
    await page.fill('[data-testid="text-input"]', 'Delete me')
    await page.press('[data-testid="text-input"]', 'Enter')
    await page.waitForTimeout(1000)
    
    // Long press own message
    const message = page.locator('[data-testid="message-bubble"][data-own="true"]').first()
    await message.click({ delay: 600 })
    
    // Click delete option
    await page.click('[data-testid="delete-option"]')
    
    // Confirm deletion
    await page.click('[data-testid="confirm-delete"]')
    
    // Verify message deleted
    await expect(message.locator('[data-testid="message-deleted-placeholder"]')).toBeVisible()
    await expect(message.locator('[data-testid="message-deleted-placeholder"]')).toContainText('Message deleted')
  })
  
  test('edited indicator persists after page reload', async ({ page }) => {
    // Edit a message
    const message = page.locator('[data-testid="message-bubble"]').first()
    await message.locator('[data-testid="edit-button"]').click()
    
    const editInput = message.locator('[data-testid="edit-input"]')
    await editInput.clear()
    await editInput.fill('Edited message')
    await message.locator('[data-testid="save-edit-button"]').click()
    
    // Reload page
    await page.reload()
    await page.waitForTimeout(1000)
    
    // Verify edited indicator still shows
    const reloadedMessage = page.locator('[data-testid="message-bubble"]').first()
    await expect(reloadedMessage.locator('[data-testid="edited-indicator"]')).toBeVisible()
  })
})
```

## 📝 Implementation Steps

### Step 1: Add Edit Button to MessageBubble

First, let's add the edit button alongside existing controls:

```typescript
// Update src/features/translator/shared/components/MessageBubble.tsx

import { Edit2, Check, Volume2 } from 'lucide-react'

export function MessageBubble({
  // ... existing props
  onEdit,
  // ... rest of props
}: MessageBubbleProps & {
  onEdit?: (messageId: string, newText: string) => void
}) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [editText, setEditText] = useState(message.original || '')
  const [isSaving, setIsSaving] = useState(false)
  
  // ... existing code ...
  
  // Determine if edit is allowed (only own messages, not deleted)
  const canEdit = isOwnMessage && onEdit && !message.is_deleted
  
  // Handle edit save
  const handleSaveEdit = async () => {
    if (!editText.trim() || editText === message.original) {
      setIsEditMode(false)
      return
    }
    
    setIsSaving(true)
    try {
      await onEdit?.(message.id, editText.trim())
      setIsEditMode(false)
    } catch (error) {
      console.error('Failed to save edit:', error)
    } finally {
      setIsSaving(false)
    }
  }
  
  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditText(message.original || '')
    setIsEditMode(false)
  }
  
  // Render deleted message placeholder
  if (message.is_deleted) {
    return (
      <div
        className={clsx(
          'flex mb-4',
          isLeftAligned ? 'justify-start' : 'justify-end'
        )}
      >
        <div
          className={clsx(
            'max-w-[80%] md:max-w-[70%] px-4 py-2 rounded-lg shadow-sm',
            'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 italic'
          )}
          data-testid="message-deleted-placeholder"
        >
          <span className="text-sm">Message deleted</span>
        </div>
      </div>
    )
  }
  
  return (
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
          message.status === 'processing' && 'opacity-80',
          message.status === 'failed' && 'ring-2 ring-red-500'
        )}
      >
        {/* Edit Mode */}
        {isEditMode ? (
          <div className="space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className={clsx(
                'w-full p-2 rounded border resize-none',
                'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100',
                'border-gray-300 dark:border-gray-600',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
                getFontSizeClass(fontSize)
              )}
              rows={3}
              autoFocus
              disabled={isSaving}
              data-testid="edit-input"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSaveEdit()
                }
                if (e.key === 'Escape') {
                  handleCancelEdit()
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="px-3 py-1 text-xs rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
                data-testid="cancel-edit-button"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving || !editText.trim()}
                className="px-3 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
                data-testid="save-edit-button"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Normal Message Display */}
            <div className={getFontSizeClass(fontSize)} data-testid="message-text">
              {primaryText}
            </div>
            
            {/* Show edited indicator */}
            {message.is_edited && (
              <span className="text-xs opacity-60 ml-1" data-testid="edited-indicator">
                (edited)
              </span>
            )}
            
            {/* Message Controls */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-3">
                {/* Status indicator */}
                <div className="flex items-center" data-testid="status-icon">
                  {getStatusIcon()}
                </div>
                
                {/* Timestamp */}
                <span className="text-xs opacity-60">
                  {formatTime(message.displayed_at || message.timestamp)}
                </span>
              </div>
              
              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {/* Edit button - only for own messages */}
                {canEdit && (
                  <button
                    onClick={() => setIsEditMode(true)}
                    className={clsx(
                      'p-1.5 rounded-full transition-all duration-200',
                      useOwnMessageStyling
                        ? 'hover:bg-white/20 text-white/80 hover:text-white'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                    )}
                    title="Edit message"
                    data-testid="edit-button"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                )}
                
                {/* TTS button - existing code */}
                {primaryText && (
                  <button
                    onClick={handleTTSClick}
                    disabled={ttsStatus === 'loading'}
                    className={clsx(
                      'p-1.5 rounded-full transition-all duration-200',
                      // ... existing styles
                    )}
                    title={getTTSTooltip()}
                    data-testid="tts-button"
                  >
                    {getTTSButton()}
                  </button>
                )}
              </div>
            </div>
            
            {/* Original text dropdown - existing code */}
            {secondaryText && (
              <div className="mt-2">
                <button
                  onClick={() => setShowOriginal(!showOriginal)}
                  className="flex items-center gap-1 text-xs opacity-60 hover:opacity-80 transition-opacity"
                >
                  <span>Original</span>
                  {showOriginal ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                
                {showOriginal && (
                  <div className="mt-1 p-2 bg-black/10 dark:bg-white/10 rounded text-sm">
                    {secondaryText}
                  </div>
                )}
              </div>
            )}
            
            {/* Reactions - existing code */}
            {message.reactions && Object.keys(message.reactions).length > 0 && (
              <MessageReactions
                reactions={message.reactions}
                onToggle={handleReactionToggle}
                currentUserId={currentUserId}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
```

### Step 2: Create Message Context Menu for Delete

Create a context menu component for long-press actions:

```typescript
// src/features/messages/MessageContextMenu.tsx
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, X } from 'lucide-react'
import { useEffect, useRef } from 'react'

interface MessageContextMenuProps {
  isOpen: boolean
  position: { x: number; y: number }
  onDelete: () => void
  onClose: () => void
}

export function MessageContextMenu({
  isOpen,
  position,
  onDelete,
  onClose
}: MessageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  
  // Close on click outside
  useEffect(() => {
    if (!isOpen) return
    
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])
  
  // Calculate position to keep menu on screen
  const getMenuPosition = () => {
    const padding = 16
    const menuWidth = 200
    const menuHeight = 100
    
    let left = position.x
    let top = position.y
    
    if (left + menuWidth > window.innerWidth - padding) {
      left = window.innerWidth - menuWidth - padding
    }
    if (left < padding) {
      left = padding
    }
    
    if (top + menuHeight > window.innerHeight - padding) {
      top = position.y - menuHeight - 20
    }
    
    return { left, top }
  }
  
  const menuPosition = getMenuPosition()
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Menu */}
          <motion.div
            ref={menuRef}
            className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            style={menuPosition}
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <button
              onClick={() => {
                onDelete()
                onClose()
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
              data-testid="delete-option"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
              <span className="text-sm text-gray-900 dark:text-gray-100">Delete message</span>
            </button>
            
            <div className="border-t border-gray-200 dark:border-gray-700" />
            
            <button
              onClick={onClose}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <X className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-900 dark:text-gray-100">Cancel</span>
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

### Step 3: Create Delete Confirmation Dialog

Add a confirmation dialog for message deletion:

```typescript
// src/components/ui/ConfirmDialog.tsx
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'warning' | 'info'
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger'
}: ConfirmDialogProps) {
  const variantStyles = {
    danger: {
      icon: 'text-red-500',
      button: 'bg-red-500 hover:bg-red-600 text-white'
    },
    warning: {
      icon: 'text-yellow-500',
      button: 'bg-yellow-500 hover:bg-yellow-600 text-white'
    },
    info: {
      icon: 'text-blue-500',
      button: 'bg-blue-500 hover:bg-blue-600 text-white'
    }
  }
  
  const styles = variantStyles[variant]
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
          />
          
          {/* Dialog */}
          <motion.div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm mx-auto"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-full bg-gray-100 dark:bg-gray-700 ${styles.icon}`}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
                
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {message}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={onCancel}
                  className="flex-1 px-4 py-2 text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm()
                    onCancel() // Close dialog
                  }}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${styles.button}`}
                  data-testid="confirm-delete"
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

### Step 4: Update MessageBubble with Delete Functionality

Add delete handling to MessageBubble:

```typescript
// Continue updating MessageBubble.tsx

import { MessageContextMenu } from '@/features/messages/MessageContextMenu'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export function MessageBubble({
  // ... existing props
  onDelete,
  // ... rest of props
}: MessageBubbleProps & {
  onEdit?: (messageId: string, newText: string) => void
  onDelete?: (messageId: string) => void
}) {
  // ... existing state ...
  
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  // Determine if delete is allowed (only own messages in session mode)
  const canDelete = isSessionMode && isOwnMessage && onDelete && !message.is_deleted
  
  // Update long press handler for own messages
  const handleOwnMessageLongPress = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (!canDelete) return
    
    const clientX = 'clientX' in event ? event.clientX : event.touches[0].clientX
    const clientY = 'clientY' in event ? event.clientY : event.touches[0].clientY
    
    setContextMenuPosition({ x: clientX, y: clientY })
    setShowContextMenu(true)
  }, [canDelete])
  
  // Use different long press handlers based on message ownership
  const contextLongPressHandlers = useLongPress({
    onLongPress: canDelete ? handleOwnMessageLongPress : handleLongPress,
    threshold: 500
  })
  
  // Handle delete
  const handleDelete = () => {
    setShowDeleteConfirm(true)
  }
  
  const confirmDelete = () => {
    onDelete?.(message.id)
    setShowDeleteConfirm(false)
  }
  
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
        {...((canReact || canDelete) ? contextLongPressHandlers : {})}
      >
        {/* Message bubble content - existing code */}
      </div>
      
      {/* Context menu for delete */}
      {canDelete && (
        <MessageContextMenu
          isOpen={showContextMenu}
          position={contextMenuPosition}
          onDelete={handleDelete}
          onClose={() => setShowContextMenu(false)}
        />
      )}
      
      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete message?"
        message="This message will be deleted for everyone. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        variant="danger"
      />
      
      {/* Emoji picker - existing code */}
      {canReact && (
        <EmojiReactionPicker
          isOpen={showEmojiPicker}
          position={pickerPosition}
          onSelect={handleReactionToggle}
          onClose={() => setShowEmojiPicker(false)}
          currentReactions={userReactions}
        />
      )}
    </>
  )
}
```

### Step 5: Add Edit Animation Styles

Add smooth transitions for edit mode:

```css
/* In src/styles/animations.css */

/* Edit mode transitions */
.edit-mode-enter {
  animation: edit-slide-down 0.2s ease-out;
}

.edit-mode-exit {
  animation: edit-slide-up 0.2s ease-out;
}

@keyframes edit-slide-down {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes edit-slide-up {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-10px);
  }
}

/* Edited indicator pulse */
.edited-indicator {
  animation: edited-pulse 2s ease-in-out;
}

@keyframes edited-pulse {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

/* Delete animation */
.message-delete-animation {
  animation: message-delete 0.3s ease-out forwards;
}

@keyframes message-delete {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.95);
  }
  100% {
    opacity: 0;
    transform: scale(0.9);
  }
}
```

### Step 6: Update Types for Edit/Delete Support

Extend message types to include edit/delete properties:

```typescript
// In src/types/database.ts

export interface QueuedMessage extends MessageWithReactions {
  // ... existing fields ...
  is_edited?: boolean
  edited_at?: string | null
  is_deleted?: boolean
  deleted_at?: string | null
}

// Update MessageBubbleProps
export interface MessageBubbleProps {
  message: QueuedMessage
  onPlayAudio?: (audioUrl: string) => void
  theme?: 'blue' | 'emerald' | 'purple' | 'rose' | 'amber'
  currentUserId?: string
  isSessionMode?: boolean
  fontSize?: 'small' | 'medium' | 'large' | 'xl'
  onReactionToggle?: (messageId: string, emoji: string, userId: string) => void
  onLongPress?: (messageId: string, position: { x: number, y: number }) => void
  onEdit?: (messageId: string, newText: string) => void
  onDelete?: (messageId: string) => void
  className?: string
  'data-testid'?: string
}
```

## ✅ Validation Steps

After implementation:

1. **Unit Testing**
   ```bash
   npm test -- MessageBubble MessageContextMenu ConfirmDialog
   ```

2. **Integration Testing**
   ```bash
   npx playwright test tests/features/phase-4-validation.spec.ts
   ```

3. **Manual Testing**
   - [ ] Edit button visible on own messages
   - [ ] Click edit opens inline editor with current text
   - [ ] Save updates message and shows "(edited)"
   - [ ] Cancel restores original display
   - [ ] Long-press own message shows delete option
   - [ ] Delete confirmation dialog appears
   - [ ] Deleted message shows placeholder
   - [ ] Edit works for both voice and text messages
   - [ ] Keyboard shortcuts work (Enter to save, Esc to cancel)

## 🔄 Rollback Plan

If something goes wrong:
```bash
git checkout pre-phase-4
npm install
npm run dev
```

## 📋 Completion Protocol

### Claude will:
1. Implement edit UI with inline text editing
2. Add delete functionality with confirmation
3. Create smooth animations for all transitions
4. Ensure mobile touch compatibility
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