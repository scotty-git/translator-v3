import { supabase } from '@/lib/supabase'
import type { 
  QueuedSessionMessage, 
  SessionMessage, 
  ConnectionStatus,
  QueuedMessage 
} from '@/types/database'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { PresenceService } from './presence'

/**
 * MessageSyncService - Handles real-time message synchronization for sessions
 * 
 * Core Features:
 * - Real-time message sync via Supabase
 * - Offline message queuing with retry logic
 * - Connection state management
 * - Message delivery confirmations
 * 
 * Note: Presence tracking moved to PresenceService (Phase 1c refactor)
 */
export class MessageSyncService {
  private messageQueue: Map<string, QueuedSessionMessage> = new Map()
  private messageChannel: RealtimeChannel | null = null
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map()
  private isProcessingQueue = false
  private sequenceNumber = 0
  
  // Event listeners
  private onMessageReceived?: (message: SessionMessage) => void
  private onConnectionStatusChanged?: (status: ConnectionStatus) => void
  private onMessageDelivered?: (messageId: string) => void
  private onMessageFailed?: (messageId: string, error: string) => void

  // Current session state
  private currentSessionId: string | null = null
  private currentUserId: string | null = null
  private connectionStatus: ConnectionStatus = 'disconnected'
  private subscriptionReady: boolean = false
  
  // PresenceService dependency (injected)
  private presenceService?: PresenceService
  
  // Network resilience
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectTimeout: NodeJS.Timeout | null = null

  /**
   * Update connection status and notify listeners
   */
  private updateConnectionStatus(status: ConnectionStatus): void {
    const previousStatus = this.connectionStatus
    this.connectionStatus = status
    
    console.log(`🔗 [MessageSyncService] Connection status changed: ${previousStatus} → ${status}`)
    this.onConnectionStatusChanged?.(status)
  }

  /**
   * Get the exponential backoff delay for retry attempts
   */
  private getRetryDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s (max)
    return Math.min(1000 * Math.pow(2, attempt), 16000)
  }

  /**
   * Queue a message for sending when connection is available
   */
  queueMessage(message: Omit<QueuedSessionMessage, 'id' | 'queuedAt' | 'retryCount' | 'status'>): string {
    console.log('📬 [MessageSyncService] Queuing message:', {
      messageText: message.original_text?.substring(0, 50) + '...',
      sessionId: message.session_id,
      isConnected: this.connectionStatus === 'connected'
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
    if (this.connectionStatus === 'connected') {
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
    if (this.isProcessingQueue || this.connectionStatus !== 'connected') {
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
      source_language: queuedMessage.source_language,
      target_language: queuedMessage.target_language,
      created_at: queuedMessage.created_at,
      is_audio: queuedMessage.is_audio || false,
      audio_duration: queuedMessage.audio_duration
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
   * Initialize session with real-time message subscriptions
   * Note: PresenceService should be initialized separately
   */
  async initializeSession(sessionId: string, userId: string, presenceService?: PresenceService): Promise<void> {
    console.log('🔗 [MessageSyncService] Initializing session:', { sessionId, userId })
    
    this.currentSessionId = sessionId
    this.currentUserId = userId
    this.presenceService = presenceService
    console.log('📝 [MessageSyncService] Set current user ID:', this.currentUserId)
    
    this.updateConnectionStatus('connecting')

    try {
      // Clean up existing subscriptions (but preserve session info)
      await this.cleanupSubscriptions()

      // Set up message subscription
      await this.setupMessageSubscription(sessionId)

      // Process any queued messages
      await this.processMessageQueue()

      this.updateConnectionStatus('connected')
      console.log('✅ [MessageSyncService] Session initialized successfully')
      
    } catch (error) {
      console.error('❌ [MessageSyncService] Failed to initialize session:', error)
      this.updateConnectionStatus('disconnected')
      throw error
    }
  }

  /**
   * Set up real-time message subscription
   */
  private async setupMessageSubscription(sessionId: string): Promise<void> {
    console.log('📡 [MessageSyncService] Setting up message subscription for session:', sessionId)
    
    // Generate unique channel name with timestamp to prevent conflicts
    const channelName = `session:${sessionId}:${Date.now()}`
    
    // Check if we already have active channels and clean them up
    const existingChannels = supabase.getChannels()
    const sessionChannels = existingChannels.filter(ch => ch.topic.startsWith(`session:${sessionId}`))
    
    if (sessionChannels.length > 0) {
      console.warn('⚠️ [MessageSyncService] Found existing channels for session, cleaning up:', sessionChannels.length)
      for (const channel of sessionChannels) {
        try {
          await channel.unsubscribe()
          await supabase.removeChannel(channel)
        } catch (error) {
          console.error('❌ [MessageSyncService] Error removing existing channel:', error)
        }
      }
    }
    
    this.messageChannel = supabase
      .channel(channelName)
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
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [MessageSyncService] Message subscription error')
          this.subscriptionReady = false
          this.updateConnectionStatus('disconnected')
          this.scheduleReconnect()
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ [MessageSyncService] Message subscription timed out')
          this.subscriptionReady = false
          this.updateConnectionStatus('disconnected')
          this.scheduleReconnect()
        } else if (status === 'CLOSED') {
          console.warn('🔒 [MessageSyncService] Message subscription closed')
          this.subscriptionReady = false
          this.updateConnectionStatus('disconnected')
          this.scheduleReconnect()
        }
      })
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

    console.log('📥 [MessageSyncService] Processing incoming message:', {
      messageId: message.id,
      senderId: message.sender_id,
      originalText: message.original_text?.substring(0, 100),
      translatedText: message.translated_text?.substring(0, 100)
    })

    this.onMessageReceived?.(message)
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return
    }

    const delay = this.getRetryDelay(this.reconnectAttempts)
    this.reconnectAttempts++

    console.log(`🔄 [MessageSyncService] Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`)
    this.updateConnectionStatus('reconnecting')

    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null
      
      if (!this.currentSessionId || !this.currentUserId) {
        console.warn('⚠️ [MessageSyncService] Cannot reconnect - no session info')
        return
      }

      try {
        console.log('🔄 [MessageSyncService] Attempting to reconnect...')
        await this.setupMessageSubscription(this.currentSessionId)
        this.reconnectAttempts = 0 // Reset on successful reconnect
        console.log('✅ [MessageSyncService] Reconnected successfully')
      } catch (error) {
        console.error('❌ [MessageSyncService] Reconnect failed:', error)
        this.scheduleReconnect() // Try again
      }
    }, delay)
  }

  /**
   * Cancel any pending reconnection attempts
   */
  private cancelReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    this.reconnectAttempts = 0
  }

  /**
   * Set event handlers for message sync
   */
  setEventHandlers({
    onMessageReceived,
    onConnectionStatusChanged,
    onMessageDelivered,
    onMessageFailed
  }: {
    onMessageReceived?: (message: SessionMessage) => void
    onConnectionStatusChanged?: (status: ConnectionStatus) => void
    onMessageDelivered?: (messageId: string) => void
    onMessageFailed?: (messageId: string, error: string) => void
  }): void {
    this.onMessageReceived = onMessageReceived
    this.onConnectionStatusChanged = onConnectionStatusChanged
    this.onMessageDelivered = onMessageDelivered
    this.onMessageFailed = onMessageFailed
    
    console.log('✅ [MessageSyncService] Event handlers set successfully')
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus
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
    
    // Cancel reconnection attempts
    this.cancelReconnect()
    
    // Clear retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout))
    this.retryTimeouts.clear()

    // Properly remove Supabase channels to prevent zombies
    if (this.messageChannel) {
      console.log('🔌 [MessageSyncService] Removing message channel...')
      try {
        await this.messageChannel.unsubscribe()
        await supabase.removeChannel(this.messageChannel)
      } catch (error) {
        console.error('❌ [MessageSyncService] Error removing message channel:', error)
      }
      this.messageChannel = null
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
    
    // Clear message queue
    this.messageQueue.clear()
    this.sequenceNumber = 0
    
    // Reset connection state
    this.updateConnectionStatus('disconnected')
    
    // Clear event handlers
    this.onMessageReceived = undefined
    this.onConnectionStatusChanged = undefined
    this.onMessageDelivered = undefined
    this.onMessageFailed = undefined
    
    console.log('✅ [MessageSyncService] Complete cleanup finished')
  }
}

// Export singleton instance
export const messageSyncService = new MessageSyncService()