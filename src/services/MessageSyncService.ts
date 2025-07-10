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
  private participantChannel: RealtimeChannel | null = null
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map()
  private isProcessingQueue = false
  private sequenceNumber = 0
  
  // Event listeners
  private onMessageReceived?: (message: SessionMessage) => void
  private onConnectionStatusChanged?: (status: ConnectionStatus) => void
  private onPartnerPresenceChanged?: (isOnline: boolean) => void
  private onMessageDelivered?: (messageId: string) => void
  private onMessageFailed?: (messageId: string, error: string) => void
  private onPartnerActivityChanged?: (activity: 'idle' | 'recording' | 'processing' | 'typing') => void

  // Current session state
  private currentSessionId: string | null = null
  private currentUserId: string | null = null
  private connectionStatus: ConnectionStatus = 'disconnected'
  private subscriptionReady: boolean = false
  
  // Track participant state for immediate presence updates
  private sessionParticipants = new Set<string>()
  private lastPartnerPresenceState = false
  
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
    console.log('🔗 [MessageSyncService] Initializing session:', { sessionId, userId })
    
    this.currentSessionId = sessionId
    this.currentUserId = userId
    console.log('📝 [MessageSyncService] Set current user ID:', this.currentUserId)
    
    // Initialize participant tracking
    this.sessionParticipants.clear()
    this.sessionParticipants.add(userId)
    this.lastPartnerPresenceState = false
    console.log('🔄 [MessageSyncService] Initialized participant tracking with current user:', userId)
    
    this.updateConnectionStatus('connecting')

    try {
      // Clean up existing subscriptions (but preserve session info)
      await this.cleanupSubscriptions()

      // Set up message subscription
      await this.setupMessageSubscription(sessionId)
      
      // Set up presence subscription
      await this.setupPresenceSubscription(sessionId, userId)

      // Set up participant subscription to detect when partners join
      await this.setupParticipantSubscription(sessionId)

      // Note: User participant management is handled by SessionManager
      // No need to add user here as it causes duplicate key conflicts

      // Process any queued messages
      await this.processMessageQueue()

      this.updateConnectionStatus('connected')
      console.log('✅ [MessageSyncService] Session initialized successfully')
      
      // Load existing participants from database to initialize tracking
      await this.loadExistingParticipants()
      
      // Check if we need to validate partner presence
      await this.validateSessionReady()
      
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
          isDelivered: payload.new.is_delivered
        })
        this.handleMessageUpdate(payload.new as SessionMessage)
      })
      .subscribe((status) => {
        console.log('📡 [MessageSyncService] Message subscription status changed:', {
          status,
          sessionId,
          channelName,
          currentUserId: this.currentUserId,
          timestamp: new Date().toISOString()
        })
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ [MessageSyncService] Message subscription is now ACTIVE')
          this.subscriptionReady = true
          this.updateConnectionStatus('connected')
          // Process any queued messages now that subscription is ready
          setTimeout(() => this.processMessageQueue(), 500)
        } else if (status === 'CLOSED') {
          console.log('❌ [MessageSyncService] Message subscription CLOSED')
          this.subscriptionReady = false
          this.updateConnectionStatus('disconnected')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [MessageSyncService] Message subscription ERROR')
          this.subscriptionReady = false
          this.updateConnectionStatus('disconnected')
        }
      })
      
    console.log('📡 [MessageSyncService] Message subscription setup completed for session:', sessionId)
  }

  /**
   * Set up presence subscription for online/offline tracking
   */
  private async setupPresenceSubscription(sessionId: string, userId: string): Promise<void> {
    // Generate unique channel name with timestamp
    const channelName = `presence:${sessionId}:${Date.now()}`
    
    // Clean up any existing presence channels for this session
    const existingChannels = supabase.getChannels()
    const presenceChannels = existingChannels.filter(ch => ch.topic.startsWith(`presence:${sessionId}`))
    
    if (presenceChannels.length > 0) {
      console.warn('⚠️ [MessageSyncService] Found existing presence channels, cleaning up:', presenceChannels.length)
      for (const channel of presenceChannels) {
        try {
          await channel.unsubscribe()
          await supabase.removeChannel(channel)
        } catch (error) {
          console.error('❌ [MessageSyncService] Error removing existing presence channel:', error)
        }
      }
    }
    
    this.presenceChannel = supabase
      .channel(channelName)
      .on('presence', { event: 'sync' }, () => {
        const state = this.presenceChannel?.presenceState()
        console.log('👥 [MessageSyncService] Presence sync:', state)
        this.updatePartnerPresence(state).catch(console.error)
        this.validateSessionReady()
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('👋 [MessageSyncService] User joined:', key, newPresences)
        this.updatePartnerPresence(this.presenceChannel?.presenceState()).catch(console.error)
        this.validateSessionReady()
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('👋 [MessageSyncService] User left:', key, leftPresences)
        this.updatePartnerPresence(this.presenceChannel?.presenceState()).catch(console.error)
        this.validateSessionReady()
      })
      .on('broadcast', { event: 'activity' }, ({ payload }) => {
        console.log(`🎧 [ActivityIndicator] Raw broadcast received:`, {
          payloadUserId: payload.userId,
          currentUserId: userId,
          payloadSessionId: payload.sessionId,
          currentSessionId: this.currentSessionId,
          activity: payload.activity,
          isOwnMessage: payload.userId === userId
        })
        
        // Validate the activity is for our current session
        if (payload.sessionId && payload.sessionId !== this.currentSessionId) {
          console.warn('⚠️ [ActivityIndicator] Received activity for different session')
          return
        }
        if (payload.userId !== userId && payload.activity) {
          console.log(`📥 [ActivityIndicator] Received: ${payload.activity} from partner`)
          console.log(`🎯 [ActivityIndicator] Calling onPartnerActivityChanged(${payload.activity})`)
          this.onPartnerActivityChanged?.(payload.activity)
        } else {
          console.log(`⏭️ [ActivityIndicator] Skipping own activity or missing data:`, {
            isOwnMessage: payload.userId === userId,
            hasActivity: !!payload.activity
          })
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track this user's presence
          await this.presenceChannel?.track({
            user_id: userId,
            session_id: sessionId,
            online_at: new Date().toISOString(),
            activity: 'idle'
          })
        }
      })
  }

  /**
   * Set up participant subscription to detect when partners join
   */
  private async setupParticipantSubscription(sessionId: string): Promise<void> {
    console.log('👥 [MessageSyncService] Setting up participant subscription for session:', sessionId)
    
    // Listen for INSERT and UPDATE events on session_participants table
    this.participantChannel = supabase
      .channel(`participants:${sessionId}:${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'session_participants',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        console.log('👤 [MessageSyncService] New participant joined:', {
          sessionId,
          userId: payload.new.user_id,
          isOnline: payload.new.is_online
        })
        
        // Add participant to our tracking set if online
        if (payload.new.is_online) {
          this.sessionParticipants.add(payload.new.user_id)
        }
        
        // Immediately update partner presence
        this.updatePartnerPresenceImmediate()
        
        // Also validate session readiness
        this.validateSessionReady()
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'session_participants',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        console.log('👤 [MessageSyncService] Participant updated:', {
          sessionId,
          userId: payload.new.user_id,
          isOnline: payload.new.is_online
        })
        
        // Update participant tracking based on online status
        if (payload.new.is_online) {
          this.sessionParticipants.add(payload.new.user_id)
          console.log('✅ [MessageSyncService] Added participant to tracking set:', payload.new.user_id)
        } else {
          this.sessionParticipants.delete(payload.new.user_id)
          console.log('❌ [MessageSyncService] Removed participant from tracking set:', payload.new.user_id)
        }
        
        // Immediately update partner presence
        this.updatePartnerPresenceImmediate()
        
        // Also validate session readiness
        this.validateSessionReady()
      })
      .subscribe((status) => {
        console.log('👥 [MessageSyncService] Participant subscription status:', status)
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

    // Check if session is ready for messaging (both users connected)
    try {
      const { data: participants, error } = await supabase
        .from('session_participants')
        .select('user_id, is_online')
        .eq('session_id', this.currentSessionId)

      if (error) {
        console.error('❌ [MessageSyncService] Failed to check session participants:', error)
        throw new Error('Failed to validate session state')
      }

      if (!participants || participants.length < 2) {
        console.log('⚠️ [MessageSyncService] Session not ready - waiting for partner to join')
        throw new Error('Session not ready - waiting for partner to join')
      }

      const partnerOnline = participants.some(p => p.user_id !== this.currentUserId && p.is_online)
      if (!partnerOnline) {
        console.log('⚠️ [MessageSyncService] Partner not online - queuing message')
        // Don't throw error here - we'll queue the message for later delivery
      }

    } catch (error) {
      // If validation fails, still queue the message for retry
      console.warn('⚠️ [MessageSyncService] Session validation failed, queuing message for retry:', error)
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

    // Try to send immediately if connected and subscription is ready
    if (this.connectionStatus === 'connected' && this.subscriptionReady) {
      console.log('⚡ [MessageSyncService] Subscription ready, sending message immediately')
      await this.attemptSendMessage(sessionMessage)
    } else {
      console.log('⏳ [MessageSyncService] Waiting for subscription to be ready:', {
        connectionStatus: this.connectionStatus,
        subscriptionReady: this.subscriptionReady
      })
    }
  }

  /**
   * Attempt to send a single message
   */
  private async attemptSendMessage(message: QueuedSessionMessage): Promise<void> {
    try {
      message.status = 'sending'
      message.lastAttempt = new Date()
      
      console.log('🚀 [MessageSyncService] Attempting to send message:', {
        messageId: message.id,
        sessionId: message.session_id,
        senderId: message.sender_id,
        currentSessionId: this.currentSessionId,
        currentUserId: this.currentUserId,
        originalText: message.original_text,
        translatedText: message.translated_text,
        connectionStatus: this.connectionStatus
      })

      const insertData = {
        id: message.id,
        session_id: message.session_id,
        sender_id: message.sender_id,
        original_text: message.original_text,
        translated_text: message.translated_text,
        original_language: message.original_language,
        timestamp: message.timestamp,
        sequence_number: message.sequence_number
      }
      
      console.log('💾 [MessageSyncService] Inserting message to database:', insertData)

      const { data, error } = await supabase
        .from('messages')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        // Handle specific database conflicts
        if (error.code === '23505') {
          console.warn('⚠️ [MessageSyncService] Duplicate message detected:', message.id)
          // Mark as sent since it's already in the database
          message.status = 'sent'
          message.is_delivered = true
          this.messageQueue.delete(message.id)
          this.saveQueueToStorage()
          this.onMessageDelivered?.(message.id)
          return
        }
        
        // Handle other specific error codes
        if (error.code === '23503') {
          console.error('❌ [MessageSyncService] Foreign key constraint violation:', error.message)
          throw new Error('Session or user not found')
        }
        
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
    if (this.isProcessingQueue || this.connectionStatus !== 'connected' || !this.subscriptionReady) {
      console.log('⏳ [MessageSyncService] Skipping queue processing:', {
        isProcessingQueue: this.isProcessingQueue,
        connectionStatus: this.connectionStatus,
        subscriptionReady: this.subscriptionReady
      })
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
    console.log('📨 [MessageSyncService] handleIncomingMessage called:', {
      messageId: message.id,
      sessionId: message.session_id,
      senderId: message.sender_id,
      currentUserId: this.currentUserId,
      currentSessionId: this.currentSessionId,
      originalText: message.original_text,
      translatedText: message.translated_text,
      timestamp: message.timestamp
    })
    
    // Validate session ID matches current session
    if (message.session_id !== this.currentSessionId) {
      console.warn('⚠️ [MessageSyncService] Message for different session, ignoring:', {
        messageSessionId: message.session_id,
        currentSessionId: this.currentSessionId
      })
      return
    }
    
    // Don't process our own messages
    if (message.sender_id === this.currentUserId) {
      console.log('⚠️ [MessageSyncService] Skipping own message:', message.id)
      return
    }

    console.log('✅ [MessageSyncService] Processing partner message:', message.id)
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
   * Load existing participants from database to initialize tracking
   */
  private async loadExistingParticipants(): Promise<void> {
    if (!this.currentSessionId) {
      return
    }

    try {
      const { data: participants, error } = await supabase
        .from('session_participants')
        .select('user_id, is_online')
        .eq('session_id', this.currentSessionId)

      if (error) {
        console.error('❌ [MessageSyncService] Failed to load existing participants:', error)
        return
      }

      // Update participant tracking with existing online participants
      participants?.forEach(participant => {
        if (participant.is_online) {
          this.sessionParticipants.add(participant.user_id)
        }
      })

      console.log('📥 [MessageSyncService] Loaded existing participants:', {
        participants: participants?.map(p => ({ user_id: p.user_id, is_online: p.is_online })),
        trackingSet: Array.from(this.sessionParticipants)
      })

      // Update partner presence immediately
      this.updatePartnerPresenceImmediate()
      
    } catch (error) {
      console.error('❌ [MessageSyncService] Error loading existing participants:', error)
    }
  }

  /**
   * Update partner presence immediately based on realtime participant events
   */
  private updatePartnerPresenceImmediate(): void {
    if (!this.currentUserId || !this.currentSessionId) {
      return
    }

    // Check if we have a partner (someone other than current user)
    const hasPartner = Array.from(this.sessionParticipants).some(userId => userId !== this.currentUserId)
    
    console.log('🚀 [MessageSyncService] Immediate presence update:', {
      sessionParticipants: Array.from(this.sessionParticipants),
      currentUserId: this.currentUserId,
      hasPartner,
      participantCount: this.sessionParticipants.size
    })
    
    // Only trigger callback if presence state actually changed
    if (hasPartner !== this.lastPartnerPresenceState) {
      console.log('👥 [MessageSyncService] Partner presence changed (immediate):', {
        from: this.lastPartnerPresenceState,
        to: hasPartner
      })
      
      this.lastPartnerPresenceState = hasPartner
      this.onPartnerPresenceChanged?.(hasPartner)
    }
  }

  /**
   * Update partner presence based on database state (DATABASE-FIRST APPROACH)
   */
  private async updatePartnerPresence(presenceState: any): Promise<void> {
    console.log('👥 [MessageSyncService] updatePartnerPresence called:', {
      hasPresenceState: !!presenceState,
      currentUserId: this.currentUserId,
      presenceKeys: presenceState ? Object.keys(presenceState) : 'none'
    })

    if (!this.currentUserId || !this.currentSessionId) {
      console.log('❌ [MessageSyncService] Missing session or user ID for presence check')
      this.onPartnerPresenceChanged?.(false)
      return
    }

    try {
      // DATABASE-FIRST APPROACH: Check database for reliable presence detection
      const { data: participants, error } = await supabase
        .from('session_participants')
        .select('user_id, is_online')
        .eq('session_id', this.currentSessionId)

      if (error) {
        console.error('❌ [MessageSyncService] Failed to check participants for presence:', error)
        // Fallback to presence channel if database fails
        this.fallbackToPresenceChannel(presenceState)
        return
      }

      console.log('🔍 [MessageSyncService] Database presence check:', {
        sessionId: this.currentSessionId,
        currentUserId: this.currentUserId,
        participants: participants?.map(p => ({ user_id: p.user_id, is_online: p.is_online })),
        participantCount: participants?.length
      })

      // Check if we have at least 2 participants and partner is online
      if (!participants || participants.length < 2) {
        console.log('👥 [MessageSyncService] Less than 2 participants, partner not online')
        this.onPartnerPresenceChanged?.(false)
        return
      }

      // Check if partner is online in database
      const partnerOnline = participants.some(p => p.user_id !== this.currentUserId && p.is_online)

      console.log('👥 [MessageSyncService] Database partner presence check:', {
        partnerOnline,
        participants: participants.map(p => ({ user_id: p.user_id, is_online: p.is_online }))
      })

      this.onPartnerPresenceChanged?.(partnerOnline)

    } catch (error) {
      console.error('❌ [MessageSyncService] Error checking partner presence:', error)
      // Fallback to presence channel if database fails
      this.fallbackToPresenceChannel(presenceState)
    }
  }

  /**
   * Fallback to presence channel when database check fails
   */
  private fallbackToPresenceChannel(presenceState: any): void {
    console.log('🔄 [MessageSyncService] Falling back to presence channel detection')
    
    if (!presenceState) {
      this.onPartnerPresenceChanged?.(false)
      return
    }

    // Check if there are any other users present besides the current user
    const otherUsers = Object.keys(presenceState).filter(key => {
      const presences = presenceState[key]
      return Array.isArray(presences) && presences.some((p: any) => {
        return p && p.user_id && p.user_id !== this.currentUserId
      })
    })

    const partnerOnline = otherUsers.length > 0
    console.log('👥 [MessageSyncService] Fallback presence check:', { partnerOnline })
    this.onPartnerPresenceChanged?.(partnerOnline)
  }

  /**
   * Validate if session is ready for both users (public for external calling)
   */
  async validateSessionReady(): Promise<void> {
    console.log('🔍 [MessageSyncService] validateSessionReady called:', {
      currentSessionId: this.currentSessionId,
      currentUserId: this.currentUserId
    })

    if (!this.currentSessionId || !this.currentUserId) {
      console.log('❌ [MessageSyncService] Missing session ID or user ID for validation')
      return
    }

    try {
      // Check how many participants are in the session
      const { data: participants, error } = await supabase
        .from('session_participants')
        .select('user_id, is_online')
        .eq('session_id', this.currentSessionId)

      if (error) {
        console.error('❌ [MessageSyncService] Failed to validate session participants:', error)
        return
      }

      console.log('🔍 [MessageSyncService] Session participants check:', {
        sessionId: this.currentSessionId,
        currentUserId: this.currentUserId,
        participants: participants?.map(p => ({ user_id: p.user_id, is_online: p.is_online })),
        participantCount: participants?.length
      })

      // If we have less than 2 participants, keep waiting
      if (!participants || participants.length < 2) {
        console.log('👥 [MessageSyncService] Waiting for partner to join...')
        this.onPartnerPresenceChanged?.(false)
        return
      }

      // Check if both participants are online
      const allOnline = participants.every(p => p.is_online)
      const partnerOnline = participants.some(p => p.user_id !== this.currentUserId && p.is_online)

      console.log('🔍 [MessageSyncService] Session readiness check:', {
        allOnline,
        partnerOnline,
        participants: participants.map(p => ({ user_id: p.user_id, is_online: p.is_online }))
      })

      this.onPartnerPresenceChanged?.(partnerOnline)

    } catch (error) {
      console.error('❌ [MessageSyncService] Failed to validate session readiness:', error)
    }
  }

  /**
   * Update user online status in session (called by SessionManager only)
   */
  async updateUserOnlineStatus(sessionId: string, userId: string, isOnline: boolean): Promise<void> {
    try {
      console.log('👤 [MessageSyncService] Updating user online status:', { sessionId, userId, isOnline })
      
      const { error } = await supabase
        .from('session_participants')
        .update({
          is_online: isOnline,
          last_seen: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .eq('user_id', userId)
      
      if (error) {
        console.error('❌ [MessageSyncService] Failed to update user online status:', error)
        throw error
      }
      
      console.log('✅ [MessageSyncService] User online status updated successfully')
      
    } catch (error) {
      console.error('❌ [MessageSyncService] Critical error updating user online status:', error)
      throw error
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

      // Process queue when we reconnect and subscription is ready
      if (status === 'connected' && this.subscriptionReady) {
        console.log('🔄 [MessageSyncService] Connection ready, processing queue')
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
   * Validate if a string is a valid UUID format
   */
  private isValidUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(id)
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
        
        let loadedCount = 0
        let skippedCount = 0
        
        parsed.forEach(({ id, message }: any) => {
          // Skip messages with invalid UUID format (old timestamp-based IDs)
          if (!this.isValidUUID(id)) {
            console.log('⚠️ [MessageSyncService] Skipping invalid UUID message:', id)
            skippedCount++
            return
          }
          
          this.messageQueue.set(id, {
            ...message,
            lastAttempt: new Date(message.lastAttempt)
          })
          loadedCount++
        })
        
        console.log('📦 [MessageSyncService] Loaded queue from storage:', {
          loaded: loadedCount,
          skipped: skippedCount,
          total: parsed.length
        })
        
        // If we skipped any messages, save the cleaned queue back to storage
        if (skippedCount > 0) {
          console.log('🧹 [MessageSyncService] Cleaning up localStorage - removing invalid UUID messages')
          this.saveQueueToStorage()
        }
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
    onMessageFailed,
    onPartnerActivityChanged
  }: {
    onMessageReceived?: (message: SessionMessage) => void
    onConnectionStatusChanged?: (status: ConnectionStatus) => void
    onPartnerPresenceChanged?: (isOnline: boolean) => void
    onMessageDelivered?: (messageId: string) => void
    onMessageFailed?: (messageId: string, error: string) => void
    onPartnerActivityChanged?: (activity: 'idle' | 'recording' | 'processing' | 'typing') => void
  }): void {
    
    this.onMessageReceived = onMessageReceived
    this.onConnectionStatusChanged = onConnectionStatusChanged
    this.onPartnerPresenceChanged = onPartnerPresenceChanged
    this.onMessageDelivered = onMessageDelivered
    this.onMessageFailed = onMessageFailed
    this.onPartnerActivityChanged = onPartnerActivityChanged
    
console.log('✅ [MessageSyncService] Event handlers set successfully')
  }

  /**
   * Broadcast activity to other participants
   */
  async broadcastActivity(activity: 'idle' | 'recording' | 'processing' | 'typing'): Promise<void> {
    if (!this.presenceChannel || !this.currentUserId) {
      console.warn('⚠️ [MessageSyncService] Cannot broadcast activity - no active channel')
      return
    }

    try {
      // Streamlined activity broadcast logging
      console.log(`📡 [ActivityIndicator] Sent: ${activity}`)
      await this.presenceChannel.send({
        type: 'broadcast',
        event: 'activity',
        payload: {
          userId: this.currentUserId,
          sessionId: this.currentSessionId,
          activity,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('❌ [ActivityIndicator] Broadcast failed:', error)
    }
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

    if (this.presenceChannel) {
      console.log('🔌 [MessageSyncService] Removing presence channel...')
      try {
        await this.presenceChannel.unsubscribe()
        await supabase.removeChannel(this.presenceChannel)
      } catch (error) {
        console.error('❌ [MessageSyncService] Error removing presence channel:', error)
      }
      this.presenceChannel = null
    }

    if (this.participantChannel) {
      console.log('🔌 [MessageSyncService] Removing participant channel...')
      try {
        await this.participantChannel.unsubscribe()
        await supabase.removeChannel(this.participantChannel)
      } catch (error) {
        console.error('❌ [MessageSyncService] Error removing participant channel:', error)
      }
      this.participantChannel = null
    }

    // Reset subscription ready state
    this.subscriptionReady = false

    // Note: Don't reset session state here as we're reinitializing
  }

  /**
   * Clean up subscriptions and resources
   */
  async cleanup(): Promise<void> {
    console.log('🧹 [MessageSyncService] Full cleanup...')
    console.log('   • Current session:', this.currentSessionId)
    console.log('   • Current user:', this.currentUserId)
    
    // Clean up subscriptions first
    await this.cleanupSubscriptions()

    // Update participant status to offline
    if (this.currentSessionId && this.currentUserId) {
      try {
        console.log('👤 [MessageSyncService] Marking user as offline...')
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

    // Clear message queue to prevent cross-session contamination
    this.messageQueue.clear()
    this.saveQueueToStorage()

    // Reset all state
    this.currentSessionId = null
    this.currentUserId = null
    this.reconnectAttempts = 0
    this.subscriptionReady = false
    
    // Clear participant tracking
    this.sessionParticipants.clear()
    this.lastPartnerPresenceState = false

    // Clear all event handlers to prevent memory leaks
    this.onMessageReceived = undefined
    this.onConnectionStatusChanged = undefined
    this.onPartnerPresenceChanged = undefined
    this.onMessageDelivered = undefined
    this.onMessageFailed = undefined
    this.onPartnerActivityChanged = undefined

    this.updateConnectionStatus('disconnected')
    console.log('✅ [MessageSyncService] Cleanup complete')
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

    // Only cleanup subscriptions, preserve event handlers during reconnection
    await this.cleanupSubscriptions()
    await this.initializeSession(this.currentSessionId, this.currentUserId)
  }
}

// Export singleton instance
export const messageSyncService = new MessageSyncService()