import type { 
  QueuedSessionMessage, 
  SessionMessage, 
  ConnectionStatus,
  QueuedMessage,
  DatabaseReaction,
  MessageReactions,
  EmojiReaction
} from '@/types/database'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { PresenceService } from './presence'
import { RealtimeConnection } from './realtime'
import type { RealtimeConnectionConfig } from './realtime'
import { supabase } from '@/lib/supabase'
import type { 
  SyncOperation,
  QueuedSyncOperation,
  MessageSyncCallbacks,
  MessageWithReactionsData,
  ReactionOperation,
  EditOperation,
  DeleteOperation
} from './types/sync.types'

/**
 * MessageSyncService - Handles real-time message synchronization for sessions
 * 
 * Core Features:
 * - Real-time message sync via RealtimeConnection
 * - Offline message queuing with retry logic
 * - Message delivery confirmations
 * 
 * Note: Connection management moved to RealtimeConnection (Phase 1d refactor)
 * Note: Presence tracking moved to PresenceService (Phase 1c refactor)
 */
export class MessageSyncService {
  private messageQueue: Map<string, QueuedSessionMessage> = new Map()
  private syncQueue: Map<string, QueuedSyncOperation> = new Map()
  private messageChannel: RealtimeChannel | null = null
  private reactionChannel: RealtimeChannel | null = null
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map()
  private isProcessingQueue = false
  private sequenceNumber = 0
  private processedMessageIds: Set<string> = new Set() // Track processed messages to prevent duplicates
  
  // Event listeners
  private onMessageReceived?: (message: SessionMessage) => void
  private onMessageDelivered?: (messageId: string) => void
  private onMessageFailed?: (messageId: string, error: string) => void
  
  // New event listeners for Phase 2
  private onReactionAdded?: (reaction: DatabaseReaction) => void
  private onReactionRemoved?: (reaction: DatabaseReaction) => void
  private onMessageEdited?: (messageId: string, newText: string) => void
  private onMessageDeleted?: (messageId: string) => void
  private onReTranslationNeeded?: (messageId: string, originalText: string) => void
  private onMessagesLoaded?: (messages: any[]) => void

  // Current session state
  private currentSessionId: string | null = null
  private currentUserId: string | null = null
  private subscriptionReady: boolean = false
  
  // Dependencies (injected)
  private presenceService?: PresenceService
  private realtimeConnection?: RealtimeConnection

  /**
   * Load existing messages from database when joining a session
   * This ensures users see the full conversation history with reactions
   */
  private async loadMessageHistory(sessionId: string): Promise<void> {
    console.log('📚 [MessageSyncService] Loading message history for session:', sessionId)
    
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          message_reactions (
            id,
            user_id,
            emoji,
            created_at
          )
        `)
        .eq('session_id', sessionId)
        .eq('is_deleted', false) // Don't load deleted messages
        .order('sequence_number', { ascending: true })
      
      if (error) {
        console.error('❌ [MessageSyncService] Failed to load message history:', error)
        return
      }
      
      if (!messages || messages.length === 0) {
        console.log('📭 [MessageSyncService] No historical messages found')
        return
      }
      
      console.log(`📚 [MessageSyncService] Found ${messages.length} historical messages`)
      
      // Process each historical message
      messages.forEach((message: MessageWithReactionsData) => {
        // Skip our own messages (we already have them locally)
        if (message.sender_id !== this.currentUserId) {
          console.log('📥 [MessageSyncService] Processing historical message:', {
            messageId: message.id,
            senderId: message.sender_id,
            timestamp: message.timestamp,
            reactionsCount: message.message_reactions?.length || 0
          })
          
          // Convert to SessionMessage format and include reactions
          const sessionMessage: SessionMessage & { reactions?: MessageReactions } = {
            id: message.id,
            session_id: message.session_id,
            sender_id: message.sender_id,
            original_text: message.original_text,
            translated_text: message.translated_text,
            original_language: message.original_language,
            timestamp: message.timestamp,
            is_delivered: message.is_delivered,
            sequence_number: message.sequence_number,
            is_edited: message.is_edited,
            edited_at: message.edited_at,
            is_deleted: message.is_deleted,
            deleted_at: message.deleted_at,
            reactions: this.processReactions(message.message_reactions || [])
          }
          
          // Use the existing handler to process the message
          this.handleIncomingMessage(sessionMessage)
        }
      })
      
      console.log('✅ [MessageSyncService] Message history loaded successfully')
    } catch (error) {
      console.error('❌ [MessageSyncService] Error loading message history:', error)
    }
  }

  /**
   * Process raw reactions into grouped format
   */
  private processReactions(reactions: DatabaseReaction[]): MessageReactions {
    const grouped: MessageReactions = {}
    
    reactions.forEach((reaction) => {
      if (!grouped[reaction.emoji]) {
        grouped[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          users: [],
          hasReacted: false
        }
      }
      
      grouped[reaction.emoji].users.push(reaction.user_id)
      grouped[reaction.emoji].count++
      
      if (reaction.user_id === this.currentUserId) {
        grouped[reaction.emoji].hasReacted = true
      }
    })
    
    return grouped
  }

  /**
   * Queue a message for sending when connection is available
   */
  queueMessage(message: Omit<QueuedSessionMessage, 'id' | 'queuedAt' | 'retryCount' | 'status'>): string {
    const currentStatus = this.getConnectionStatus()
    console.log('📬 [MessageSyncService] Queuing message:', {
      messageText: message.original_text?.substring(0, 50) + '...',
      sessionId: message.session_id,
      isConnected: currentStatus === 'connected'
    })

    const messageId = crypto.randomUUID()
    const queuedMessage: QueuedSessionMessage = {
      id: messageId,
      ...message,
      queuedAt: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
      sequence: this.sequenceNumber++
    }

    this.messageQueue.set(messageId, queuedMessage)

    // Try to send immediately if connected
    if (currentStatus === 'connected') {
      this.processMessageQueue().catch(console.error)
    } else {
      console.log('📡 [MessageSyncService] Not connected, message will be sent when connection is restored')
    }

    return messageId
  }

  /**
   * Process all queued messages
   */
  private async processMessageQueue(): Promise<void> {
    if (this.isProcessingQueue || this.getConnectionStatus() !== 'connected') {
      return
    }

    this.isProcessingQueue = true
    console.log('🔄 [MessageSyncService] Processing message queue...')

    try {
      const pendingMessages = Array.from(this.messageQueue.values())
        .filter(m => m.status === 'pending' || m.status === 'failed')
        .sort((a, b) => a.sequence - b.sequence)

      console.log(`📦 [MessageSyncService] Found ${pendingMessages.length} messages to process`)

      for (const queuedMessage of pendingMessages) {
        try {
          await this.sendQueuedMessage(queuedMessage)
        } catch (error) {
          console.error('❌ [MessageSyncService] Failed to process queued message:', error)
          this.handleMessageFailure(queuedMessage, error)
        }
      }
    } finally {
      this.isProcessingQueue = false
    }
  }

  /**
   * Send a specific queued message to the database
   */
  private async sendQueuedMessage(queuedMessage: QueuedSessionMessage): Promise<void> {
    console.log('📤 [MessageSyncService] Sending queued message:', {
      messageId: queuedMessage.id,
      attempt: queuedMessage.retryCount + 1,
      sessionId: queuedMessage.session_id
    })

    // Update message status to sending
    queuedMessage.status = 'sending'
    this.messageQueue.set(queuedMessage.id, queuedMessage)

    const messageData = {
      id: queuedMessage.id,
      session_id: queuedMessage.session_id,
      sender_id: queuedMessage.sender_id,
      original_text: queuedMessage.original_text,
      translated_text: queuedMessage.translated_text,
      original_language: queuedMessage.original_language,
      timestamp: queuedMessage.timestamp
      // Note: Removed non-existent columns: source_language, target_language, created_at, is_audio, audio_duration
    }

    const { error } = await supabase
      .from('messages')
      .insert(messageData)

    if (error) {
      throw error
    }

    // Message sent successfully
    console.log('✅ [MessageSyncService] Message sent successfully:', queuedMessage.id)
    queuedMessage.status = 'sent'
    queuedMessage.sentAt = new Date().toISOString()
    this.messageQueue.set(queuedMessage.id, queuedMessage)
    
    this.onMessageDelivered?.(queuedMessage.id)

    // Remove from queue after successful delivery
    setTimeout(() => {
      this.messageQueue.delete(queuedMessage.id)
    }, 5000) // Keep for 5 seconds for delivery confirmation
  }

  /**
   * Handle message sending failure
   */
  private handleMessageFailure(queuedMessage: QueuedSessionMessage, error: any): void {
    queuedMessage.retryCount++
    queuedMessage.status = 'failed'
    queuedMessage.lastError = error?.message || 'Unknown error'
    this.messageQueue.set(queuedMessage.id, queuedMessage)

    console.error(`❌ [MessageSyncService] Message failed (attempt ${queuedMessage.retryCount}):`, {
      messageId: queuedMessage.id,
      error: queuedMessage.lastError,
      willRetry: queuedMessage.retryCount < 3
    })

    this.onMessageFailed?.(queuedMessage.id, queuedMessage.lastError)

    // Schedule retry if we haven't exceeded max attempts
    if (queuedMessage.retryCount < 3) {
      const delay = this.getRetryDelay(queuedMessage.retryCount - 1)
      
      const timeoutId = setTimeout(() => {
        this.retryTimeouts.delete(queuedMessage.id)
        queuedMessage.status = 'pending'
        this.messageQueue.set(queuedMessage.id, queuedMessage)
        this.processMessageQueue().catch(console.error)
      }, delay)
      
      this.retryTimeouts.set(queuedMessage.id, timeoutId)
      console.log(`⏰ [MessageSyncService] Scheduled retry for message ${queuedMessage.id} in ${delay}ms`)
    } else {
      console.error(`💀 [MessageSyncService] Message ${queuedMessage.id} failed permanently after ${queuedMessage.retryCount} attempts`)
    }
  }

  /**
   * Get exponential backoff delay for retry attempts
   */
  private getRetryDelay(attempt: number): number {
    return Math.min(1000 * Math.pow(2, attempt), 10000) // Cap at 10 seconds
  }

  /**
   * Initialize session with real-time message subscriptions
   * Note: PresenceService should be initialized separately
   */
  async initializeSession(
    sessionId: string, 
    userId: string, 
    realtimeConnection: RealtimeConnection,
    presenceService?: PresenceService
  ): Promise<void> {
    console.log('🔗 [MessageSyncService] Initializing session:', { sessionId, userId })
    
    this.currentSessionId = sessionId
    this.currentUserId = userId
    this.presenceService = presenceService
    this.realtimeConnection = realtimeConnection
    console.log('📝 [MessageSyncService] Set current user ID:', this.currentUserId)

    try {
      // Clean up existing subscriptions (but preserve session info)
      await this.cleanupSubscriptions()

      // NEW: Load message history BEFORE setting up subscription
      // This ensures we don't miss any messages sent before we joined
      await this.loadMessageHistory(sessionId)

      // Set up message subscription using RealtimeConnection
      await this.setupMessageSubscription(sessionId)
      
      // Set up reaction subscription for real-time reaction updates
      await this.setupReactionSubscription(sessionId)

      // Process any queued messages
      await this.processMessageQueue()
      
      // Process any queued sync operations
      await this.processSyncQueue()

      console.log('✅ [MessageSyncService] Session initialized with history and subscriptions')
      
    } catch (error) {
      console.error('❌ [MessageSyncService] Failed to initialize session:', error)
      throw error
    }
  }

  /**
   * Set up real-time message subscription via RealtimeConnection
   */
  private async setupMessageSubscription(sessionId: string): Promise<void> {
    if (!this.realtimeConnection) {
      throw new Error('RealtimeConnection not available')
    }

    console.log('📡 [MessageSyncService] Setting up message subscription for session:', sessionId)
    
    // Create the messages channel via RealtimeConnection
    this.messageChannel = await this.realtimeConnection.createChannel({
      name: `messages:${sessionId}`,
      type: 'messages'
    })
    
    // Set up message event handlers
    this.messageChannel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        // Validate that the message is for our current session
        if (payload.new.session_id !== this.currentSessionId) {
          console.warn('⚠️ [MessageSyncService] Received message for different session:', {
            messageSessionId: payload.new.session_id,
            currentSessionId: this.currentSessionId
          })
          return
        }
        
        console.log('📨 [MessageSyncService] Postgres INSERT event received:', {
          messageId: payload.new.id,
          sessionId: payload.new.session_id,
          senderId: payload.new.sender_id,
          currentUserId: this.currentUserId,
          originalText: payload.new.original_text,
          translatedText: payload.new.translated_text
        })
        this.handleIncomingMessage(payload.new as SessionMessage)
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        // Validate that the message is for our current session
        if (payload.new.session_id !== this.currentSessionId) {
          console.warn('⚠️ [MessageSyncService] Received update for different session:', {
            messageSessionId: payload.new.session_id,
            currentSessionId: this.currentSessionId
          })
          return
        }
        
        console.log('📨 [MessageSyncService] Postgres UPDATE event received:', {
          messageId: payload.new.id,
          sessionId: payload.new.session_id,
          senderId: payload.new.sender_id,
          currentUserId: this.currentUserId,
          originalText: payload.new.original_text,
          translatedText: payload.new.translated_text
        })
        this.handleIncomingMessage(payload.new as SessionMessage)
      })
      .subscribe(async (status) => {
        console.log('📡 [MessageSyncService] Message subscription status:', status)
        
        if (status === 'SUBSCRIBED') {
          this.subscriptionReady = true
          console.log('✅ [MessageSyncService] Message subscription ready')
          
          // Process any queued messages now that we're subscribed
          await this.processMessageQueue()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error(`❌ [MessageSyncService] Message subscription ${status}`)
          this.subscriptionReady = false
          // RealtimeConnection will handle reconnection automatically
        }
      })
  }

  /**
   * Set up real-time reaction subscription
   */
  private async setupReactionSubscription(sessionId: string): Promise<void> {
    if (!this.realtimeConnection) {
      throw new Error('RealtimeConnection not available')
    }

    console.log('👍 [MessageSyncService] Setting up reaction subscription for session:', sessionId)
    
    // Create the reactions channel via RealtimeConnection
    this.reactionChannel = await this.realtimeConnection.createChannel({
      name: `reactions:${sessionId}`,
      type: 'reactions'
    })
    
    // Set up reaction event handlers
    this.reactionChannel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'message_reactions'
      }, (payload) => {
        console.log('👍 [MessageSyncService] Reaction INSERT event received:', {
          messageId: payload.new.message_id,
          emoji: payload.new.emoji,
          userId: payload.new.user_id
        })
        
        // Notify listeners about the new reaction
        this.onReactionAdded?.(payload.new as DatabaseReaction)
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'message_reactions'
      }, (payload) => {
        console.log('👎 [MessageSyncService] Reaction DELETE event received:', {
          messageId: payload.old.message_id,
          emoji: payload.old.emoji,
          userId: payload.old.user_id
        })
        
        // Notify listeners about the removed reaction
        this.onReactionRemoved?.(payload.old as DatabaseReaction)
      })
      .subscribe(async (status) => {
        console.log('👍 [MessageSyncService] Reaction subscription status:', status)
      })
  }

  /**
   * Process queued sync operations (reactions, edits, deletes)
   */
  private async processSyncQueue(): Promise<void> {
    if (this.syncQueue.size === 0 || this.getConnectionStatus() !== 'connected') {
      return
    }
    
    console.log('🔄 [MessageSyncService] Processing sync queue...')
    const operations = Array.from(this.syncQueue.values())
      .sort((a, b) => a.sequence - b.sequence)
    
    for (const queuedOp of operations) {
      try {
        await this.processSyncOperation(queuedOp)
        this.syncQueue.delete(queuedOp.id)
      } catch (error) {
        console.error('❌ [MessageSyncService] Failed to process sync operation:', error)
        this.handleSyncOperationFailure(queuedOp, error)
      }
    }
  }

  /**
   * Process a single sync operation
   */
  private async processSyncOperation(queuedOp: QueuedSyncOperation): Promise<void> {
    const { operation } = queuedOp
    
    switch (operation.type) {
      case 'add_reaction':
        await this.addReaction(
          operation.messageId,
          operation.emoji,
          operation.userId
        )
        break
        
      case 'remove_reaction':
        await this.removeReaction(
          operation.messageId,
          operation.emoji,
          operation.userId
        )
        break
        
      case 'edit_message':
        await this.editMessage(
          operation.messageId,
          operation.originalText
        )
        break
        
      case 'delete_message':
        await this.deleteMessage(operation.messageId)
        break
        
      default:
        console.warn('⚠️ [MessageSyncService] Unknown operation type:', operation)
    }
  }

  /**
   * Handle sync operation failure
   */
  private handleSyncOperationFailure(queuedOp: QueuedSyncOperation, error: any): void {
    queuedOp.retryCount++
    queuedOp.lastAttempt = new Date().toISOString()
    queuedOp.error = error?.message || 'Unknown error'
    
    if (queuedOp.retryCount < 3) {
      // Schedule retry
      const delay = this.getRetryDelay(queuedOp.retryCount - 1)
      setTimeout(() => {
        this.processSyncQueue().catch(console.error)
      }, delay)
      
      console.log(`⏰ [MessageSyncService] Scheduled sync retry in ${delay}ms`)
    } else {
      // Max retries exceeded, remove from queue
      this.syncQueue.delete(queuedOp.id)
      console.error(`💀 [MessageSyncService] Sync operation failed permanently:`, queuedOp)
    }
  }

  /**
   * Handle incoming message from real-time subscription
   */
  private handleIncomingMessage(message: SessionMessage): void {
    // Don't process our own messages
    if (message.sender_id === this.currentUserId) {
      console.log('⏭️ [MessageSyncService] Skipping own message:', message.id)
      return
    }

    // NEW: Check if we've already processed this message ID
    // This prevents duplicates between history load and real-time events
    if (this.processedMessageIds.has(message.id)) {
      console.log('⏭️ [MessageSyncService] Skipping duplicate message:', message.id)
      return
    }

    console.log('📥 [MessageSyncService] Processing incoming message:', {
      messageId: message.id,
      senderId: message.sender_id,
      originalText: message.original_text?.substring(0, 100),
      translatedText: message.translated_text?.substring(0, 100)
    })

    // Mark this message as processed
    this.processedMessageIds.add(message.id)

    // Deliver the message
    this.onMessageReceived?.(message)
  }


  /**
   * Set event handlers for message sync
   */
  setEventHandlers(callbacks: MessageSyncCallbacks): void {
    // Set all callbacks from the MessageSyncCallbacks interface
    this.onMessageReceived = callbacks.onMessageReceived
    this.onMessageDelivered = callbacks.onMessageDelivered
    this.onMessageFailed = callbacks.onMessageFailed
    this.onReactionAdded = callbacks.onReactionAdded
    this.onReactionRemoved = callbacks.onReactionRemoved
    this.onMessageEdited = callbacks.onMessageEdited
    this.onMessageDeleted = callbacks.onMessageDeleted
    this.onReTranslationNeeded = callbacks.onReTranslationNeeded
    this.onMessagesLoaded = callbacks.onMessagesLoaded
    
    console.log('✅ [MessageSyncService] Event handlers set successfully')
  }

  /**
   * Add a reaction to a message
   */
  async addReaction(messageId: string, emoji: string, userId: string): Promise<void> {
    const operation: ReactionOperation = {
      type: 'add_reaction',
      messageId,
      userId,
      emoji,
      timestamp: new Date().toISOString()
    }
    
    if (this.getConnectionStatus() === 'connected') {
      try {
        const { error } = await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: userId,
            emoji: emoji
          })
        
        if (error) throw error
        
        console.log('✅ [MessageSyncService] Reaction added successfully:', {
          messageId,
          emoji,
          userId
        })
        
      } catch (error) {
        console.error('❌ [MessageSyncService] Failed to add reaction:', error)
        this.queueSyncOperation(operation)
      }
    } else {
      this.queueSyncOperation(operation)
    }
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(messageId: string, emoji: string, userId: string): Promise<void> {
    const operation: ReactionOperation = {
      type: 'remove_reaction',
      messageId,
      userId,
      emoji,
      timestamp: new Date().toISOString()
    }
    
    if (this.getConnectionStatus() === 'connected') {
      try {
        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', userId)
          .eq('emoji', emoji)
        
        if (error) throw error
        
        console.log('✅ [MessageSyncService] Reaction removed successfully:', {
          messageId,
          emoji,
          userId
        })
        
      } catch (error) {
        console.error('❌ [MessageSyncService] Failed to remove reaction:', error)
        this.queueSyncOperation(operation)
      }
    } else {
      this.queueSyncOperation(operation)
    }
  }

  /**
   * Edit a message and trigger re-translation
   */
  async editMessage(messageId: string, newOriginalText: string): Promise<void> {
    const operation: EditOperation = {
      type: 'edit_message',
      messageId,
      originalText: newOriginalText,
      previousText: '', // Will be filled from current message
      timestamp: new Date().toISOString()
    }
    
    if (this.getConnectionStatus() === 'connected') {
      try {
        // Get current message for history
        const { data: currentMessage, error: fetchError } = await supabase
          .from('messages')
          .select('original_text')
          .eq('id', messageId)
          .single()
        
        if (fetchError) throw fetchError
        
        operation.previousText = currentMessage.original_text
        
        // Update message
        const { error: updateError } = await supabase
          .from('messages')
          .update({
            original_text: newOriginalText,
            is_edited: true,
            edited_at: new Date().toISOString(),
            // Clear translation to trigger re-translation
            translated_text: null
          })
          .eq('id', messageId)
        
        if (updateError) throw updateError
        
        console.log('✅ [MessageSyncService] Message edited successfully:', messageId)
        
        // Notify listeners
        this.onMessageEdited?.(messageId, newOriginalText)
        this.onReTranslationNeeded?.(messageId, newOriginalText)
        
      } catch (error) {
        console.error('❌ [MessageSyncService] Failed to edit message:', error)
        this.queueSyncOperation(operation)
      }
    } else {
      this.queueSyncOperation(operation)
    }
  }

  /**
   * Soft delete a message
   */
  async deleteMessage(messageId: string): Promise<void> {
    const operation: DeleteOperation = {
      type: 'delete_message',
      messageId,
      timestamp: new Date().toISOString()
    }
    
    if (this.getConnectionStatus() === 'connected') {
      try {
        const { error } = await supabase
          .from('messages')
          .update({
            is_deleted: true,
            deleted_at: new Date().toISOString(),
            // Clear sensitive content
            original_text: '',
            translated_text: ''
          })
          .eq('id', messageId)
        
        if (error) throw error
        
        // Also delete all reactions
        await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', messageId)
        
        console.log('✅ [MessageSyncService] Message deleted successfully:', messageId)
        
        // Notify listeners
        this.onMessageDeleted?.(messageId)
        
      } catch (error) {
        console.error('❌ [MessageSyncService] Failed to delete message:', error)
        this.queueSyncOperation(operation)
      }
    } else {
      this.queueSyncOperation(operation)
    }
  }

  /**
   * Queue a sync operation for later processing
   */
  private queueSyncOperation(operation: SyncOperation): void {
    const operationId = crypto.randomUUID()
    const queuedOperation: QueuedSyncOperation = {
      id: operationId,
      operation,
      retryCount: 0,
      queuedAt: new Date().toISOString(),
      sequence: this.sequenceNumber++
    }
    
    this.syncQueue.set(operationId, queuedOperation)
    console.log('📦 [MessageSyncService] Sync operation queued:', {
      type: operation.type,
      operationId
    })
  }

  /**
   * Get current connection status from RealtimeConnection
   */
  getConnectionStatus(): ConnectionStatus {
    return this.realtimeConnection?.getConnectionStatus() ?? 'disconnected'
  }

  /**
   * Get pending message count
   */
  getPendingMessageCount(): number {
    return Array.from(this.messageQueue.values()).filter(m => 
      m.status === 'pending' || m.status === 'failed'
    ).length
  }

  /**
   * Clean up only subscriptions (used during initialization)
   */
  private async cleanupSubscriptions(): Promise<void> {
    console.log('🧹 [MessageSyncService] Cleaning up subscriptions only...')
    
    // Clear retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout))
    this.retryTimeouts.clear()

    // Remove message channel via RealtimeConnection
    if (this.messageChannel && this.realtimeConnection) {
      console.log('🔌 [MessageSyncService] Removing message channel...')
      try {
        await this.realtimeConnection.removeChannel(`messages:${this.currentSessionId}`)
      } catch (error) {
        console.error('❌ [MessageSyncService] Error removing message channel:', error)
      }
      this.messageChannel = null
    }
    
    // Remove reaction channel via RealtimeConnection
    if (this.reactionChannel && this.realtimeConnection) {
      console.log('🔌 [MessageSyncService] Removing reaction channel...')
      try {
        await this.realtimeConnection.removeChannel(`reactions:${this.currentSessionId}`)
      } catch (error) {
        console.error('❌ [MessageSyncService] Error removing reaction channel:', error)
      }
      this.reactionChannel = null
    }

    // Reset subscription ready state
    this.subscriptionReady = false
  }

  /**
   * Complete cleanup - clear everything
   */
  async cleanup(): Promise<void> {
    console.log('🧹 [MessageSyncService] Starting complete cleanup...')
    
    // Clean up subscriptions first
    await this.cleanupSubscriptions()
    
    // Clear session data
    this.currentSessionId = null
    this.currentUserId = null
    this.presenceService = undefined
    this.realtimeConnection = undefined
    
    // Clear message queue
    this.messageQueue.clear()
    this.syncQueue.clear()
    this.sequenceNumber = 0
    
    // Clear processed messages tracking
    this.processedMessageIds.clear()
    
    // Clear event handlers
    this.onMessageReceived = undefined
    this.onMessageDelivered = undefined
    this.onMessageFailed = undefined
    this.onReactionAdded = undefined
    this.onReactionRemoved = undefined
    this.onMessageEdited = undefined
    this.onMessageDeleted = undefined
    this.onReTranslationNeeded = undefined
    this.onMessagesLoaded = undefined
    
    console.log('✅ [MessageSyncService] Complete cleanup finished')
  }
}

// Export singleton instance
export const messageSyncService = new MessageSyncService()