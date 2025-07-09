import { supabase } from '@/lib/supabase'
import type { 
  QueuedSessionMessage, 
  SessionMessage, 
  ConnectionStatus,
  QueuedMessage 
} from '@/types/database'
import type { RealtimeChannel } from '@supabase/supabase-js'

/**
 * MessageSyncService - Handles real-time message synchronization for sessions
 * 
 * Core Features:
 * - Real-time message sync via Supabase
 * - Offline message queuing with retry logic
 * - Presence tracking for online/offline status
 * - Connection state management
 * - Message delivery confirmations
 */
export class MessageSyncService {
  private messageQueue: Map<string, QueuedSessionMessage> = new Map()
  private messageChannel: RealtimeChannel | null = null
  private presenceChannel: RealtimeChannel | null = null
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map()
  private isProcessingQueue = false
  private sequenceNumber = 0
  
  // Event listeners
  private onMessageReceived?: (message: SessionMessage) => void
  private onConnectionStatusChanged?: (status: ConnectionStatus) => void
  private onPartnerPresenceChanged?: (isOnline: boolean) => void
  private onMessageDelivered?: (messageId: string) => void
  private onMessageFailed?: (messageId: string, error: string) => void

  // Current session state
  private currentSessionId: string | null = null
  private currentUserId: string | null = null
  private connectionStatus: ConnectionStatus = 'disconnected'
  
  // Network resilience
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectTimeout: NodeJS.Timeout | null = null
  private isOnline = navigator.onLine

  constructor() {
    // Set up network monitoring
    this.setupNetworkMonitoring()
    
    // Load persisted queue
    this.loadQueueFromStorage()
  }

  /**
   * Set up network monitoring for resilience
   */
  private setupNetworkMonitoring(): void {
    // Browser online/offline events
    window.addEventListener('online', () => {
      console.log('🌐 [MessageSyncService] Network came online')
      this.isOnline = true
      this.handleNetworkOnline()
    })
    
    window.addEventListener('offline', () => {
      console.log('🚫 [MessageSyncService] Network went offline')
      this.isOnline = false
      this.handleNetworkOffline()
    })
    
    // Supabase connection monitoring
    // Note: Use channel-based connection monitoring instead of global realtime
    console.log('🔌 [MessageSyncService] Network monitoring initialized')
    
    // We'll monitor connection through individual channels
    // Connection state will be monitored per channel
  }

  /**
   * Handle network coming online
   */
  private handleNetworkOnline(): void {
    if (this.currentSessionId && this.currentUserId) {
      this.scheduleReconnect()
    }
  }

  /**
   * Handle network going offline
   */
  private handleNetworkOffline(): void {
    this.updateConnectionStatus('disconnected')
    this.cancelReconnect()
  }

  /**
   * Handle Supabase connection coming online
   */
  private handleSupabaseOnline(): void {
    this.reconnectAttempts = 0 // Reset attempts on successful connection
    this.updateConnectionStatus('connected')
    this.processMessageQueue()
  }

  /**
   * Handle Supabase connection going offline
   */
  private handleSupabaseOffline(): void {
    this.updateConnectionStatus('disconnected')
    if (this.isOnline && this.currentSessionId) {
      this.scheduleReconnect()
    }
  }

  /**
   * Schedule automatic reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('💀 [MessageSyncService] Max reconnection attempts reached')
      this.updateConnectionStatus('disconnected')
      return
    }

    this.cancelReconnect()
    
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000) // Cap at 30 seconds
    this.reconnectAttempts++
    
    console.log(`🔄 [MessageSyncService] Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`)
    
    this.updateConnectionStatus('reconnecting')
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null
      this.attemptReconnection()
    }, delay)
  }

  /**
   * Cancel scheduled reconnection
   */
  private cancelReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
  }

  /**
   * Attempt to reconnect to the session
   */
  private async attemptReconnection(): Promise<void> {
    if (!this.currentSessionId || !this.currentUserId) {
      return
    }

    try {
      console.log('🔄 [MessageSyncService] Attempting reconnection...')
      await this.initializeSession(this.currentSessionId, this.currentUserId)
      this.reconnectAttempts = 0
      console.log('✅ [MessageSyncService] Reconnection successful')
    } catch (error) {
      console.error('❌ [MessageSyncService] Reconnection failed:', error)
      this.scheduleReconnect()
    }
  }

  /**
   * Initialize session with real-time subscriptions
   */
  async initializeSession(sessionId: string, userId: string): Promise<void> {
    console.log('🔗 [MessageSyncService] Initializing session:', sessionId)
    
    this.currentSessionId = sessionId
    this.currentUserId = userId
    this.updateConnectionStatus('connecting')

    try {
      // Clean up existing subscriptions
      await this.cleanup()

      // Set up message subscription
      await this.setupMessageSubscription(sessionId)
      
      // Set up presence subscription
      await this.setupPresenceSubscription(sessionId, userId)

      // Add user as participant
      await this.addUserToSession(sessionId, userId)

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
    this.messageChannel = supabase
      .channel(`session:${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        this.handleIncomingMessage(payload.new as SessionMessage)
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        this.handleMessageUpdate(payload.new as SessionMessage)
      })
      .subscribe((status) => {
        console.log('📡 [MessageSyncService] Message subscription status:', status)
        if (status === 'SUBSCRIBED') {
          this.updateConnectionStatus('connected')
        } else if (status === 'CLOSED') {
          this.updateConnectionStatus('disconnected')
        }
      })
  }

  /**
   * Set up presence subscription for online/offline tracking
   */
  private async setupPresenceSubscription(sessionId: string, userId: string): Promise<void> {
    this.presenceChannel = supabase
      .channel(`presence:${sessionId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = this.presenceChannel?.presenceState()
        console.log('👥 [MessageSyncService] Presence sync:', state)
        this.updatePartnerPresence(state)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('👋 [MessageSyncService] User joined:', key, newPresences)
        this.updatePartnerPresence(this.presenceChannel?.presenceState())
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('👋 [MessageSyncService] User left:', key, leftPresences)
        this.updatePartnerPresence(this.presenceChannel?.presenceState())
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track this user's presence
          await this.presenceChannel?.track({
            user_id: userId,
            online_at: new Date().toISOString()
          })
        }
      })
  }

  /**
   * Send a message with offline queuing and retry logic
   */
  async sendMessage(message: QueuedMessage): Promise<void> {
    if (!this.currentSessionId || !this.currentUserId) {
      throw new Error('Session not initialized')
    }
    
    // Validate message content
    if (!message.original || message.original.trim().length === 0) {
      throw new Error('Message content cannot be empty')
    }
    
    // Check if queue is full (prevent memory issues)
    if (this.messageQueue.size >= 100) {
      console.warn('⚠️ [MessageSyncService] Message queue full, removing oldest messages')
      const oldestEntries = Array.from(this.messageQueue.entries())
        .sort((a, b) => a[1].sequence_number - b[1].sequence_number)
        .slice(0, 20)
      
      oldestEntries.forEach(([id]) => this.messageQueue.delete(id))
    }

    const sessionMessage: QueuedSessionMessage = {
      id: message.id,
      tempId: `temp-${Date.now()}-${Math.random()}`,
      session_id: this.currentSessionId,
      sender_id: this.currentUserId,
      original_text: message.original,
      translated_text: message.translation,
      original_language: message.original_lang,
      timestamp: message.created_at,
      is_delivered: false,
      sequence_number: this.sequenceNumber++,
      status: 'pending',
      retryCount: 0,
      lastAttempt: new Date()
    }

    // Add to queue immediately
    this.messageQueue.set(message.id, sessionMessage)
    this.saveQueueToStorage()

    console.log('📤 [MessageSyncService] Queuing message:', message.id)

    // Try to send immediately if connected
    if (this.connectionStatus === 'connected') {
      await this.attemptSendMessage(sessionMessage)
    }
  }

  /**
   * Attempt to send a single message
   */
  private async attemptSendMessage(message: QueuedSessionMessage): Promise<void> {
    try {
      message.status = 'sending'
      message.lastAttempt = new Date()
      
      console.log('🚀 [MessageSyncService] Attempting to send message:', message.id)

      const { data, error } = await supabase
        .from('messages')
        .insert({
          id: message.id,
          session_id: message.session_id,
          sender_id: message.sender_id,
          original_text: message.original_text,
          translated_text: message.translated_text,
          original_language: message.original_language,
          timestamp: message.timestamp,
          sequence_number: message.sequence_number
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Mark as sent
      message.status = 'sent'
      message.is_delivered = true
      this.messageQueue.delete(message.id)
      this.saveQueueToStorage()
      
      console.log('✅ [MessageSyncService] Message sent successfully:', message.id)
      this.onMessageDelivered?.(message.id)

    } catch (error) {
      console.error('❌ [MessageSyncService] Failed to send message:', message.id, error)
      
      message.status = 'failed'
      message.retryCount++

      // Schedule retry if we haven't exceeded max attempts
      if (message.retryCount <= 5) {
        const retryDelay = Math.pow(2, message.retryCount) * 1000 // Exponential backoff
        console.log(`🔄 [MessageSyncService] Scheduling retry ${message.retryCount}/5 in ${retryDelay}ms`)
        
        const timeout = setTimeout(() => {
          this.retryTimeouts.delete(message.id)
          this.attemptSendMessage(message)
        }, retryDelay)
        
        this.retryTimeouts.set(message.id, timeout)
      } else {
        console.error('💀 [MessageSyncService] Message failed permanently:', message.id)
        this.onMessageFailed?.(message.id, error instanceof Error ? error.message : 'Unknown error')
      }
    }
  }

  /**
   * Process all queued messages (called on reconnection)
   */
  private async processMessageQueue(): Promise<void> {
    if (this.isProcessingQueue || this.connectionStatus !== 'connected') {
      return
    }

    this.isProcessingQueue = true
    console.log('🔄 [MessageSyncService] Processing message queue:', this.messageQueue.size, 'messages')

    try {
      const queuedMessages = Array.from(this.messageQueue.values())
        .filter(m => m.status === 'pending' || m.status === 'failed')
        .sort((a, b) => a.sequence_number - b.sequence_number)

      for (const message of queuedMessages) {
        await this.attemptSendMessage(message)
        // Small delay between sends to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } finally {
      this.isProcessingQueue = false
    }
  }

  /**
   * Handle incoming message from real-time subscription
   */
  private handleIncomingMessage(message: SessionMessage): void {
    // Don't process our own messages
    if (message.sender_id === this.currentUserId) {
      return
    }

    console.log('📨 [MessageSyncService] Received message:', message.id)
    this.onMessageReceived?.(message)
  }

  /**
   * Handle message updates (delivery confirmations, etc.)
   */
  private handleMessageUpdate(message: SessionMessage): void {
    if (message.sender_id === this.currentUserId && message.is_delivered) {
      console.log('✅ [MessageSyncService] Message delivered:', message.id)
      this.onMessageDelivered?.(message.id)
      this.messageQueue.delete(message.id)
      this.saveQueueToStorage()
    }
  }

  /**
   * Update partner presence based on channel state
   */
  private updatePartnerPresence(presenceState: any): void {
    if (!presenceState || !this.currentUserId) return

    const allUsers = Object.keys(presenceState)
    const partnerOnline = allUsers.some(key => {
      const presences = presenceState[key]
      return presences.some((p: any) => p.user_id !== this.currentUserId)
    })

    console.log('👥 [MessageSyncService] Partner online:', partnerOnline)
    this.onPartnerPresenceChanged?.(partnerOnline)
  }

  /**
   * Add user as session participant
   */
  private async addUserToSession(sessionId: string, userId: string): Promise<void> {
    try {
      await supabase
        .from('session_participants')
        .upsert({
          session_id: sessionId,
          user_id: userId,
          is_online: true,
          last_seen: new Date().toISOString()
        })
    } catch (error) {
      console.error('Failed to add user to session:', error)
      // Don't throw here as this isn't critical for basic functionality
    }
  }

  /**
   * Update connection status and notify listeners
   */
  private updateConnectionStatus(status: ConnectionStatus): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status
      console.log('🔌 [MessageSyncService] Connection status:', status)
      this.onConnectionStatusChanged?.(status)

      // Process queue when we reconnect
      if (status === 'connected') {
        setTimeout(() => this.processMessageQueue(), 1000)
      }
    }
  }

  /**
   * Save message queue to localStorage for persistence
   */
  private saveQueueToStorage(): void {
    try {
      const queueData = Array.from(this.messageQueue.entries()).map(([id, message]) => ({
        id,
        message: {
          ...message,
          lastAttempt: message.lastAttempt.toISOString()
        }
      }))
      localStorage.setItem('messageQueue', JSON.stringify(queueData))
    } catch (error) {
      console.error('Failed to save queue to storage:', error)
    }
  }

  /**
   * Load message queue from localStorage
   */
  private loadQueueFromStorage(): void {
    try {
      const queueData = localStorage.getItem('messageQueue')
      if (queueData) {
        const parsed = JSON.parse(queueData)
        this.messageQueue.clear()
        
        parsed.forEach(({ id, message }: any) => {
          this.messageQueue.set(id, {
            ...message,
            lastAttempt: new Date(message.lastAttempt)
          })
        })
        
        console.log('📦 [MessageSyncService] Loaded queue from storage:', this.messageQueue.size, 'messages')
      }
    } catch (error) {
      console.error('Failed to load queue from storage:', error)
    }
  }

  /**
   * Set event handlers
   */
  setEventHandlers({
    onMessageReceived,
    onConnectionStatusChanged,
    onPartnerPresenceChanged,
    onMessageDelivered,
    onMessageFailed
  }: {
    onMessageReceived?: (message: SessionMessage) => void
    onConnectionStatusChanged?: (status: ConnectionStatus) => void
    onPartnerPresenceChanged?: (isOnline: boolean) => void
    onMessageDelivered?: (messageId: string) => void
    onMessageFailed?: (messageId: string, error: string) => void
  }): void {
    this.onMessageReceived = onMessageReceived
    this.onConnectionStatusChanged = onConnectionStatusChanged
    this.onPartnerPresenceChanged = onPartnerPresenceChanged
    this.onMessageDelivered = onMessageDelivered
    this.onMessageFailed = onMessageFailed
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
   * Clean up subscriptions and resources
   */
  async cleanup(): Promise<void> {
    console.log('🧹 [MessageSyncService] Cleaning up...')
    
    // Cancel reconnection attempts
    this.cancelReconnect()
    
    // Clear retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout))
    this.retryTimeouts.clear()

    // Unsubscribe from channels
    if (this.messageChannel) {
      await supabase.removeChannel(this.messageChannel)
      this.messageChannel = null
    }

    if (this.presenceChannel) {
      await supabase.removeChannel(this.presenceChannel)
      this.presenceChannel = null
    }

    // Update participant status to offline
    if (this.currentSessionId && this.currentUserId) {
      try {
        await supabase
          .from('session_participants')
          .update({
            is_online: false,
            last_seen: new Date().toISOString()
          })
          .eq('session_id', this.currentSessionId)
          .eq('user_id', this.currentUserId)
      } catch (error) {
        console.error('Failed to update offline status:', error)
      }
    }

    // Reset state
    this.currentSessionId = null
    this.currentUserId = null
    this.reconnectAttempts = 0

    this.updateConnectionStatus('disconnected')
  }

  /**
   * Force reconnection
   */
  async reconnect(): Promise<void> {
    if (!this.currentSessionId || !this.currentUserId) {
      throw new Error('No active session to reconnect')
    }

    console.log('🔄 [MessageSyncService] Forcing reconnection...')
    this.updateConnectionStatus('reconnecting')

    await this.cleanup()
    await this.initializeSession(this.currentSessionId, this.currentUserId)
  }
}

// Export singleton instance
export const messageSyncService = new MessageSyncService()