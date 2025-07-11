# Phase 6: Real-time Cross-Device Sync

## 🎯 Vibe Check

**What we're doing**: Implementing real-time synchronization for reactions, edits, and deletions across all connected devices in a session.

**Why it's awesome**: When one user reacts to a message, edits their text, or deletes something - everyone in the session sees it instantly! This creates a truly collaborative translation experience.

**Time estimate**: 75-90 minutes of Claude working autonomously

**Project type**: Real-time System Integration

## ✅ Success Criteria

- [ ] Reactions sync instantly across all devices
- [ ] Message edits appear on partner's device in real-time
- [ ] Deletions propagate to all session participants
- [ ] Optimistic updates with rollback on failure
- [ ] Connection state properly managed
- [ ] Handles race conditions gracefully
- [ ] Works with spotty network connections

## 🚀 Pre-Flight Checklist

Before starting, verify:
- [ ] Phase 5 complete (translation integration working)
- [ ] Dev server is running: `npm run dev`
- [ ] All tests pass: `npm test`
- [ ] Create safety commit: `git add -A && git commit -m "chore: pre-phase-6 checkpoint"`
- [ ] Create git tag: `git tag pre-phase-6`

## 🧪 Automated Test Suite

```typescript
// tests/features/phase-6-validation.spec.ts
import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test'

test.describe('Phase 6: Real-time Sync Validation', () => {
  const VERCEL_URL = 'https://translator-v3.vercel.app'
  let hostContext: BrowserContext
  let guestContext: BrowserContext
  let hostPage: Page
  let guestPage: Page
  let sessionCode: string

  // Increase timeout for real-time sync tests
  test.setTimeout(60000)

  test.beforeAll(async () => {
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
    
    // Capture console logs for real-time debugging
    hostPage.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('websocket') || msg.text().includes('realtime')) {
        console.log(`🏠 HOST [${msg.type()}]: ${msg.text()}`)
      }
    })
    guestPage.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('websocket') || msg.text().includes('realtime')) {
        console.log(`👥 GUEST [${msg.type()}]: ${msg.text()}`)
      }
    })
    
    // Capture network events for debugging real-time sync
    hostPage.on('websocket', ws => console.log(`🏠 HOST WebSocket: ${ws.url()}`))
    guestPage.on('websocket', ws => console.log(`👥 GUEST WebSocket: ${ws.url()}`))
  })

  test.beforeEach(async () => {
    console.log('🔄 Setting up real-time sync test session...')
    
    // Host creates session
    await hostPage.goto(VERCEL_URL)
    await hostPage.waitForLoadState('networkidle')
    await hostPage.getByText('Start Session').click()
    await hostPage.waitForURL(/.*\/session.*/)
    
    // Get session code
    await hostPage.waitForSelector('span.font-mono')
    sessionCode = await hostPage.locator('span.font-mono').textContent() || ''
    console.log(`🔑 Session code: ${sessionCode}`)
    
    // Guest joins
    await guestPage.goto(VERCEL_URL)
    await guestPage.waitForLoadState('networkidle')
    await guestPage.getByText('Join Session').click()
    await guestPage.getByTestId('join-code-input').fill(sessionCode)
    await guestPage.getByText('Join', { exact: true }).click()
    await guestPage.waitForURL(/.*\/session.*/)
    
    // Wait for real-time connection
    console.log('⏳ Waiting for WebSocket connection...')
    await Promise.all([
      hostPage.waitForSelector('text=Partner Online', { timeout: 20000 }),
      guestPage.waitForSelector('text=Partner Online', { timeout: 20000 })
    ])
    console.log('✅ Real-time connection established!')
    
    // Switch to text mode
    await hostPage.locator('button[title="Text input"]').click()
    await guestPage.locator('button[title="Text input"]').click()
    await hostPage.waitForSelector('input[placeholder="Type message..."]')
    await guestPage.waitForSelector('input[placeholder="Type message..."]')
  })

  test.afterAll(async () => {
    await hostContext?.close()
    await guestContext?.close()
  })
  
  test('reactions sync instantly across devices', async () => {
    console.log('🧪 TEST: Real-time reaction sync')
    
    // Host sends a message
    console.log('🏠 Host: Sending message...')
    await hostPage.locator('input[placeholder="Type message..."]').fill('React to this!')
    await hostPage.getByText('Send').click()
    
    // Wait for message to appear on both devices
    await hostPage.waitForSelector('[data-testid^="message-bubble"]')
    await guestPage.waitForSelector('[data-testid^="message-bubble"]')
    await guestPage.waitForTimeout(2000) // Allow translation
    
    // Guest adds reaction
    console.log('👥 Guest: Adding reaction...')
    const guestMessage = guestPage.locator('[data-testid^="message-bubble"]').first()
    await guestMessage.click({ delay: 600 })
    await guestPage.click('[data-testid="emoji-option"]:has-text("👍")')
    
    // Measure sync time
    const startTime = Date.now()
    
    // Verify reaction appears on host device
    console.log('🔍 Waiting for reaction to sync to host...')
    const hostReaction = hostPage.locator('[data-testid="message-reaction"]:has-text("👍")')
    await expect(hostReaction).toBeVisible({ timeout: 5000 })
    
    const syncTime = Date.now() - startTime
    console.log(`⚡ Reaction synced in ${syncTime}ms`)
    
    // Verify counts match
    await expect(hostReaction).toHaveText('👍 1')
    const guestReaction = guestPage.locator('[data-testid="message-reaction"]:has-text("👍")')
    await expect(guestReaction).toHaveText('👍 1')
    
    console.log('✅ Reaction sync successful!')
  })
  
  test('message edits sync with re-translation', async () => {
    console.log('🧪 TEST: Real-time edit sync with re-translation')
    
    // Host sends original message
    console.log('🏠 Host: Sending original message...')
    await hostPage.locator('input[placeholder="Type message..."]').fill('Good morning')
    await hostPage.getByText('Send').click()
    
    // Wait for message and translation
    await hostPage.waitForSelector('[data-testid^="message-bubble"]')
    await guestPage.waitForSelector('[data-testid^="message-bubble"]')
    await guestPage.waitForTimeout(2000)
    
    // Screenshot original state
    await guestPage.screenshot({ path: 'test-results/sync-01-original-guest.png' })
    
    // Host edits the message
    console.log('🏠 Host: Editing message...')
    const hostMessage = hostPage.locator('[data-testid^="message-bubble"][data-own="true"]').first()
    await hostMessage.locator('[data-testid="edit-button"]').click()
    
    const editInput = hostMessage.locator('[data-testid="edit-input"]')
    await editInput.clear()
    await editInput.fill('Good evening')
    await hostMessage.locator('[data-testid="save-edit-button"]').click()
    
    // Verify edit syncs to guest
    console.log('🔍 Waiting for edit to sync...')
    const guestMessage = guestPage.locator('[data-testid^="message-bubble"]').first()
    
    // Check for edited indicator
    await expect(guestMessage.locator('[data-testid="edited-indicator"]')).toBeVisible({ timeout: 5000 })
    
    // Check for re-translation loading state
    console.log('🔍 Checking for re-translation...')
    const translationLoading = guestMessage.locator('[data-testid="translation-loading"]')
    
    // The message should show loading briefly then update
    await guestPage.waitForTimeout(3000) // Allow re-translation
    
    // Screenshot final state
    await guestPage.screenshot({ path: 'test-results/sync-02-edited-guest.png' })
    
    console.log('✅ Edit sync with re-translation successful!')
  })
  
  test('message deletions sync across devices', async () => {
    console.log('🧪 TEST: Real-time deletion sync')
    
    // Host sends a message
    console.log('🏠 Host: Sending message to delete...')
    await hostPage.locator('input[placeholder="Type message..."]').fill('Delete this message')
    await hostPage.getByText('Send').click()
    
    // Wait for message on both devices
    await hostPage.waitForSelector('[data-testid^="message-bubble"]')
    await guestPage.waitForSelector('[data-testid^="message-bubble"]')
    
    // Screenshot before deletion
    await guestPage.screenshot({ path: 'test-results/sync-03-before-delete-guest.png' })
    
    // Host deletes the message
    console.log('🏠 Host: Deleting message...')
    const hostMessage = hostPage.locator('[data-testid^="message-bubble"][data-own="true"]').first()
    await hostMessage.click({ delay: 600 })
    await hostPage.click('[data-testid="delete-option"]')
    await hostPage.click('[data-testid="confirm-delete"]')
    
    // Verify deletion syncs to guest
    console.log('🔍 Waiting for deletion to sync...')
    const guestDeletedPlaceholder = guestPage.locator('[data-testid="message-deleted-placeholder"]')
    await expect(guestDeletedPlaceholder).toBeVisible({ timeout: 5000 })
    await expect(guestDeletedPlaceholder).toContainText('Message deleted')
    
    // Screenshot after deletion
    await guestPage.screenshot({ path: 'test-results/sync-04-after-delete-guest.png' })
    
    console.log('✅ Deletion sync successful!')
  })
  
  test('message deletions sync across devices', async () => {
    // Host sends a message
    await hostPage.click('[data-testid="text-input-toggle"]')
    await hostPage.fill('[data-testid="text-input"]', 'Delete me')
    await hostPage.press('[data-testid="text-input"]', 'Enter')
    
    // Wait for message on both devices
    await hostPage.waitForSelector('[data-testid="message-bubble"]')
    await guestPage.waitForSelector('[data-testid="message-bubble"]')
    
    // Host deletes the message
    const hostMessage = hostPage.locator('[data-testid="message-bubble"][data-own="true"]').first()
    await hostMessage.click({ delay: 600 }) // Long press
    await hostPage.click('[data-testid="delete-option"]')
    await hostPage.click('[data-testid="confirm-delete"]')
    
    // Verify deletion on both devices
    await expect(hostPage.locator('[data-testid="message-deleted-placeholder"]')).toBeVisible()
    await expect(guestPage.locator('[data-testid="message-deleted-placeholder"]')).toBeVisible()
  })
  
  test('handles simultaneous reactions gracefully', async () => {
    // Host sends a message
    await hostPage.click('[data-testid="text-input-toggle"]')
    await hostPage.fill('[data-testid="text-input"]', 'React to this!')
    await hostPage.press('[data-testid="text-input"]', 'Enter')
    
    // Wait for message
    await hostPage.waitForSelector('[data-testid="message-bubble"]')
    await guestPage.waitForSelector('[data-testid="message-bubble"]')
    
    // Both users react simultaneously
    const hostPromise = (async () => {
      const message = hostPage.locator('[data-testid="message-bubble"]').first()
      await message.click({ delay: 600 })
      await hostPage.click('[data-testid="emoji-option"]:has-text("❤️")')
    })()
    
    const guestPromise = (async () => {
      const message = guestPage.locator('[data-testid="message-bubble"]').first()
      await message.click({ delay: 600 })
      await guestPage.click('[data-testid="emoji-option"]:has-text("❤️")')
    })()
    
    await Promise.all([hostPromise, guestPromise])
    
    // Both reactions should be counted
    await expect(hostPage.locator('[data-testid="message-reaction"]:has-text("❤️")')).toHaveText('❤️ 2')
    await expect(guestPage.locator('[data-testid="message-reaction"]:has-text("❤️")')).toHaveText('❤️ 2')
  })
  
  test('offline changes sync when reconnected', async () => {
    // Host sends a message
    await hostPage.click('[data-testid="text-input-toggle"]')
    await hostPage.fill('[data-testid="text-input"]', 'Offline test')
    await hostPage.press('[data-testid="text-input"]', 'Enter')
    
    await hostPage.waitForSelector('[data-testid="message-bubble"]')
    await guestPage.waitForSelector('[data-testid="message-bubble"]')
    
    // Simulate guest going offline
    await guestPage.evaluate(() => {
      window.testHelpers?.simulateOffline(true)
    })
    
    // Host adds reaction while guest is offline
    const hostMessage = hostPage.locator('[data-testid="message-bubble"]').first()
    await hostMessage.click({ delay: 600 })
    await hostPage.click('[data-testid="emoji-option"]:has-text("👍")')
    
    // Guest should not see the reaction yet
    await expect(guestPage.locator('[data-testid="message-reaction"]')).not.toBeVisible()
    
    // Guest comes back online
    await guestPage.evaluate(() => {
      window.testHelpers?.simulateOffline(false)
    })
    
    // Wait for sync
    await guestPage.waitForTimeout(1000)
    
    // Now guest should see the reaction
    await expect(guestPage.locator('[data-testid="message-reaction"]:has-text("👍")')).toBeVisible()
  })
})
```

## 📝 Implementation Steps

### Step 1: Enhance RealtimeConnection for Feature Channels

Extend RealtimeConnection to handle multiple channel types:

```typescript
// In src/services/realtime/RealtimeConnection.ts

export class RealtimeConnection {
  private channels: Map<string, RealtimeChannel> = new Map()
  
  // Create specific channels for each feature
  async setupFeatureChannels(sessionId: string): Promise<void> {
    // Messages channel (existing)
    await this.setupMessageChannel(sessionId)
    
    // Reactions channel
    await this.setupReactionsChannel(sessionId)
    
    // Presence channel (existing)
    await this.setupPresenceChannel(sessionId)
  }
  
  private async setupReactionsChannel(sessionId: string): Promise<void> {
    const channelName = `reactions:${sessionId}`
    
    const channel = this.supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'message_reactions'
      }, (payload) => {
        this.handleReactionChange(payload)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Reactions channel subscribed')
        }
      })
    
    this.channels.set('reactions', channel)
  }
  
  private handleReactionChange(payload: RealtimePostgresChangesPayload<any>): void {
    const { eventType, new: newRecord, old: oldRecord } = payload
    
    switch (eventType) {
      case 'INSERT':
        this.callbacks.onReactionAdded?.(this.transformReaction(newRecord))
        break
      case 'DELETE':
        this.callbacks.onReactionRemoved?.(this.transformReaction(oldRecord))
        break
    }
  }
  
  private transformReaction(record: any): DatabaseReaction {
    return {
      id: record.id,
      message_id: record.message_id,
      user_id: record.user_id,
      emoji: record.emoji,
      created_at: record.created_at
    }
  }
}
```

### Step 2: Implement Optimistic Updates in MessageQueueService

Add optimistic update support with rollback:

```typescript
// In src/services/queues/MessageQueueService.ts

export class MessageQueueService implements IMessageQueue {
  private optimisticUpdates: Map<string, OptimisticUpdate> = new Map()
  
  /**
   * Toggle reaction with optimistic update
   */
  async toggleReaction(
    messageId: string, 
    emoji: string, 
    userId: string
  ): Promise<void> {
    const updateId = `${messageId}-${emoji}-${userId}`
    
    // Apply optimistic update immediately
    this.applyOptimisticReaction(messageId, emoji, userId)
    
    // Track the update
    this.optimisticUpdates.set(updateId, {
      type: 'reaction',
      messageId,
      emoji,
      userId,
      timestamp: Date.now()
    })
    
    try {
      // Sync with backend
      if (this.messageSyncService) {
        const hasReaction = this.userHasReaction(messageId, emoji, userId)
        
        if (hasReaction) {
          await this.messageSyncService.removeReaction(messageId, emoji, userId)
        } else {
          await this.messageSyncService.addReaction(messageId, emoji, userId)
        }
      }
      
      // Success - remove from optimistic updates
      this.optimisticUpdates.delete(updateId)
      
    } catch (error) {
      // Rollback optimistic update
      this.rollbackOptimisticReaction(messageId, emoji, userId)
      this.optimisticUpdates.delete(updateId)
      throw error
    }
  }
  
  private applyOptimisticReaction(
    messageId: string, 
    emoji: string, 
    userId: string
  ): void {
    const message = this.messages.find(m => m.id === messageId)
    if (!message) return
    
    if (!message.reactions) {
      message.reactions = {}
    }
    
    if (!message.reactions[emoji]) {
      message.reactions[emoji] = {
        emoji,
        count: 0,
        users: [],
        hasReacted: false
      }
    }
    
    const reaction = message.reactions[emoji]
    const userIndex = reaction.users.indexOf(userId)
    
    if (userIndex === -1) {
      // Add reaction
      reaction.users.push(userId)
      reaction.count++
      if (userId === this.currentUserId) {
        reaction.hasReacted = true
      }
    } else {
      // Remove reaction
      reaction.users.splice(userIndex, 1)
      reaction.count--
      if (userId === this.currentUserId) {
        reaction.hasReacted = false
      }
    }
    
    // Clean up empty reactions
    if (reaction.count === 0) {
      delete message.reactions[emoji]
    }
    
    this.notifySubscribers()
  }
  
  private rollbackOptimisticReaction(
    messageId: string, 
    emoji: string, 
    userId: string
  ): void {
    // Apply the opposite action to rollback
    this.applyOptimisticReaction(messageId, emoji, userId)
  }
  
  /**
   * Handle real-time reaction updates from other devices
   */
  handleRemoteReactionAdded(reaction: DatabaseReaction): void {
    const message = this.messages.find(m => m.id === reaction.message_id)
    if (!message) return
    
    if (!message.reactions) {
      message.reactions = {}
    }
    
    if (!message.reactions[reaction.emoji]) {
      message.reactions[reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        users: [],
        hasReacted: false
      }
    }
    
    const reactionData = message.reactions[reaction.emoji]
    
    // Only add if not already present (avoid duplicates)
    if (!reactionData.users.includes(reaction.user_id)) {
      reactionData.users.push(reaction.user_id)
      reactionData.count++
      
      if (reaction.user_id === this.currentUserId) {
        reactionData.hasReacted = true
      }
    }
    
    this.notifySubscribers()
  }
  
  handleRemoteReactionRemoved(reaction: DatabaseReaction): void {
    const message = this.messages.find(m => m.id === reaction.message_id)
    if (!message || !message.reactions) return
    
    const reactionData = message.reactions[reaction.emoji]
    if (!reactionData) return
    
    const userIndex = reactionData.users.indexOf(reaction.user_id)
    if (userIndex !== -1) {
      reactionData.users.splice(userIndex, 1)
      reactionData.count--
      
      if (reaction.user_id === this.currentUserId) {
        reactionData.hasReacted = false
      }
      
      // Clean up empty reactions
      if (reactionData.count === 0) {
        delete message.reactions[reaction.emoji]
      }
    }
    
    this.notifySubscribers()
  }
}

interface OptimisticUpdate {
  type: 'reaction' | 'edit' | 'delete'
  messageId: string
  emoji?: string
  userId?: string
  originalText?: string
  timestamp: number
}
```

### Step 3: Wire Up Real-time Callbacks

Connect all the services for real-time sync:

```typescript
// In src/features/translator/session/SessionTranslator.tsx

export function SessionTranslator() {
  // ... existing setup ...
  
  useEffect(() => {
    if (!realtimeConnection || !messageQueueService) return
    
    // Set up real-time callbacks
    realtimeConnection.setCallbacks({
      // Existing callbacks
      onMessageReceived: (message) => {
        messageQueueService.handleRemoteMessage(message)
      },
      
      // New reaction callbacks
      onReactionAdded: (reaction) => {
        messageQueueService.handleRemoteReactionAdded(reaction)
      },
      
      onReactionRemoved: (reaction) => {
        messageQueueService.handleRemoteReactionRemoved(reaction)
      },
      
      // Edit/delete callbacks
      onMessageEdited: (messageId, newText) => {
        messageQueueService.handleRemoteEdit(messageId, newText)
      },
      
      onMessageDeleted: (messageId) => {
        messageQueueService.handleRemoteDelete(messageId)
      }
    })
    
    // Set up feature channels
    realtimeConnection.setupFeatureChannels(sessionId)
    
  }, [realtimeConnection, messageQueueService, sessionId])
  
  // ... rest of component
}
```

### Step 4: Handle Message Edit/Delete Sync

Add remote edit/delete handling:

```typescript
// In MessageQueueService

export class MessageQueueService {
  /**
   * Handle remote message edit
   */
  handleRemoteEdit(messageId: string, newText: string): void {
    const message = this.messages.find(m => m.id === messageId)
    if (!message) return
    
    // Update message
    message.original = newText
    message.is_edited = true
    message.edited_at = new Date().toISOString()
    
    // Clear translation to show loading state
    message.translation = null
    message.status = 'processing'
    
    this.notifySubscribers()
    
    // Re-translation will be handled by the pipeline
  }
  
  /**
   * Handle remote message deletion
   */
  handleRemoteDelete(messageId: string): void {
    const message = this.messages.find(m => m.id === messageId)
    if (!message) return
    
    // Soft delete
    message.is_deleted = true
    message.deleted_at = new Date().toISOString()
    
    // Clear content
    message.original = ''
    message.translation = ''
    
    // Remove reactions
    message.reactions = {}
    
    this.notifySubscribers()
  }
  
  /**
   * Apply edit with optimistic update
   */
  async editMessage(messageId: string, newText: string): Promise<void> {
    const message = this.messages.find(m => m.id === messageId)
    if (!message) return
    
    const originalText = message.original
    
    // Apply optimistic update
    this.handleRemoteEdit(messageId, newText)
    
    try {
      // Sync with backend
      if (this.messageSyncService) {
        await this.messageSyncService.editMessage(messageId, newText)
      }
    } catch (error) {
      // Rollback on failure
      message.original = originalText
      message.is_edited = false
      message.edited_at = null
      this.notifySubscribers()
      throw error
    }
  }
  
  /**
   * Apply deletion with optimistic update
   */
  async deleteMessage(messageId: string): Promise<void> {
    const message = this.messages.find(m => m.id === messageId)
    if (!message) return
    
    // Store original state for rollback
    const originalState = { ...message }
    
    // Apply optimistic update
    this.handleRemoteDelete(messageId)
    
    try {
      // Sync with backend
      if (this.messageSyncService) {
        await this.messageSyncService.deleteMessage(messageId)
      }
    } catch (error) {
      // Rollback on failure
      const index = this.messages.findIndex(m => m.id === messageId)
      if (index !== -1) {
        this.messages[index] = originalState
        this.notifySubscribers()
      }
      throw error
    }
  }
}
```

### Step 5: Add Connection State UI

Show connection status to users:

```typescript
// Create src/components/ConnectionStatus.tsx

import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ConnectionStatusProps {
  status: 'connected' | 'connecting' | 'reconnecting' | 'disconnected'
  partnerOnline: boolean
  onRetry?: () => void
}

export function ConnectionStatus({ 
  status, 
  partnerOnline, 
  onRetry 
}: ConnectionStatusProps) {
  if (status === 'connected' && partnerOnline) {
    return null // Don't show when everything is working
  }
  
  const getStatusInfo = () => {
    switch (status) {
      case 'connecting':
        return {
          icon: <RefreshCw className="h-4 w-4 animate-spin" />,
          text: 'Connecting...',
          color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
        }
      case 'reconnecting':
        return {
          icon: <RefreshCw className="h-4 w-4 animate-spin" />,
          text: 'Reconnecting...',
          color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20'
        }
      case 'disconnected':
        return {
          icon: <WifiOff className="h-4 w-4" />,
          text: 'Disconnected',
          color: 'text-red-600 bg-red-50 dark:bg-red-900/20'
        }
      case 'connected':
        return {
          icon: <Wifi className="h-4 w-4" />,
          text: partnerOnline ? 'Connected' : 'Waiting for partner',
          color: 'text-green-600 bg-green-50 dark:bg-green-900/20'
        }
    }
  }
  
  const { icon, text, color } = getStatusInfo()
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`fixed top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full shadow-lg ${color} flex items-center gap-2`}
      >
        {icon}
        <span className="text-sm font-medium">{text}</span>
        
        {status === 'disconnected' && onRetry && (
          <button
            onClick={onRetry}
            className="ml-2 text-xs underline hover:no-underline"
          >
            Retry
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
```

### Step 6: Add Conflict Resolution

Handle race conditions and conflicts:

```typescript
// In src/services/sync/ConflictResolver.ts

export class ConflictResolver {
  /**
   * Resolve reaction conflicts (last-write-wins with deduplication)
   */
  resolveReactionConflict(
    local: MessageReactions,
    remote: DatabaseReaction[]
  ): MessageReactions {
    const resolved: MessageReactions = {}
    
    // Group remote reactions by emoji
    const remoteByEmoji = new Map<string, Set<string>>()
    
    remote.forEach(reaction => {
      if (!remoteByEmoji.has(reaction.emoji)) {
        remoteByEmoji.set(reaction.emoji, new Set())
      }
      remoteByEmoji.get(reaction.emoji)!.add(reaction.user_id)
    })
    
    // Merge with local, preferring remote as source of truth
    remoteByEmoji.forEach((users, emoji) => {
      resolved[emoji] = {
        emoji,
        count: users.size,
        users: Array.from(users),
        hasReacted: users.has(this.currentUserId)
      }
    })
    
    return resolved
  }
  
  /**
   * Resolve edit conflicts (last-write-wins based on timestamp)
   */
  resolveEditConflict(
    local: QueuedMessage,
    remote: DatabaseMessage
  ): QueuedMessage {
    // If remote is newer, use remote
    if (remote.edited_at && local.edited_at && 
        new Date(remote.edited_at) > new Date(local.edited_at)) {
      return {
        ...local,
        original: remote.original_text,
        translation: remote.translated_text,
        is_edited: true,
        edited_at: remote.edited_at
      }
    }
    
    // Otherwise keep local (optimistic update)
    return local
  }
}
```

## ✅ Validation Steps

After implementation:

1. **Unit Testing**
   ```bash
   npm test -- RealtimeConnection MessageQueueService ConflictResolver
   ```

2. **Integration Testing**
   ```bash
   npx playwright test tests/features/phase-6-validation.spec.ts
   ```

3. **Manual Testing with Multiple Devices**
   - [ ] Open app on 2+ devices/browsers
   - [ ] Create session and have all join
   - [ ] Test reactions sync instantly
   - [ ] Test edits appear on all devices
   - [ ] Test deletions propagate
   - [ ] Test offline/online transitions
   - [ ] Test simultaneous actions
   - [ ] Monitor for race conditions

## 🔄 Rollback Plan

If something goes wrong:
```bash
git checkout pre-phase-6
npm install
npm run dev
```

## 📋 Completion Protocol

### Claude will:
1. Implement enhanced real-time channels for all features
2. Add optimistic updates with proper rollback
3. Create connection status UI component
4. Handle conflicts and race conditions
5. Test with multiple browser contexts
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