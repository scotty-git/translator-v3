import { Message, MessageStatus, MessageWithReactions } from '@/types/database'

export interface QueuedMessage extends MessageWithReactions {
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
        // Mark as displayed (in real implementation this would call MessageService)
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
      .filter(m => m.status === 'displayed' || m.status === 'processing' || m.status === 'queued')
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
   * Toggle emoji reaction for a message
   * 
   * This is the core method that powers the entire emoji reaction system.
   * It handles adding/removing reactions and maintaining data consistency.
   * 
   * Features:
   * 1. Lazy initialization of reaction structures
   * 2. Toggle behavior (add if not present, remove if present)
   * 3. Automatic cleanup of empty reactions
   * 4. Real-time UI updates via listener notifications
   * 5. User tracking for proper hasReacted flags
   * 
   * Data Flow:
   * 1. Find target message in queue
   * 2. Initialize reaction structures if needed
   * 3. Check if user already reacted with this emoji
   * 4. Add or remove user from reaction
   * 5. Update counts and flags
   * 6. Clean up empty reactions
   * 7. Notify all subscribers of changes
   * 
   * @param messageId - UUID of the message to react to
   * @param emoji - The emoji character being toggled
   * @param userId - ID of the user performing the action
   */
  toggleReaction(messageId: string, emoji: string, userId: string): void {
    // Find the target message in our queue
    const message = this.queue.get(messageId)
    if (!message) {
      console.warn(`Cannot add reaction: Message ${messageId} not found in queue`)
      return
    }

    /* 
     * STEP 1: Initialize reaction structure if needed
     * This lazy initialization ensures we only create reaction objects when needed
     */
    if (!message.reactions) {
      message.reactions = {}
    }

    // Initialize this specific emoji reaction if it doesn't exist yet
    if (!message.reactions[emoji]) {
      message.reactions[emoji] = {
        emoji,           // Store the emoji character
        count: 0,        // Start with zero count
        users: [],       // Empty array of user IDs
        hasReacted: false // Will be set correctly below
      }
    }

    /*
     * STEP 2: Toggle the user's reaction
     * Check if user has already reacted with this emoji
     */
    const reaction = message.reactions[emoji]
    const userIndex = reaction.users.indexOf(userId)

    if (userIndex === -1) {
      /*
       * USER HASN'T REACTED YET: Add their reaction
       * - Add user to the users array
       * - Increment count
       * - Mark as reacted for this user
       */
      reaction.users.push(userId)
      reaction.count++
      reaction.hasReacted = true
      
      console.debug(`Added ${emoji} reaction from user ${userId} to message ${messageId}`)
    } else {
      /*
       * USER HAS ALREADY REACTED: Remove their reaction
       * - Remove user from the users array
       * - Decrement count
       * - Handle cleanup if no one else has reacted
       */
      reaction.users.splice(userIndex, 1)
      reaction.count--
      
      // If count reaches zero, remove the entire reaction object
      if (reaction.count === 0) {
        delete message.reactions[emoji]
        console.debug(`Removed ${emoji} reaction completely from message ${messageId}`)
      } else {
        // Still has other users, just mark current user as not reacted
        reaction.hasReacted = false
        console.debug(`Removed ${emoji} reaction from user ${userId} on message ${messageId}`)
      }
    }

    /*
     * STEP 3: Update hasReacted flags for all reactions on this message
     * This ensures the UI correctly shows which reactions the current user has made
     */
    Object.values(message.reactions).forEach(r => {
      r.hasReacted = r.users.includes(userId)
    })

    /*
     * STEP 4: Notify all listeners of the change
     * This triggers UI updates across all components showing this message
     */
    this.notifyListeners()
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