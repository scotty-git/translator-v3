import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { ConnectionStatus } from '@/types/database'
import type {
  ConnectionState,
  ChannelConfig,
  RealtimeConnectionEvents,
  RealtimeConnectionConfig,
  IRealtimeConnection,
  ChannelEntry,
  ChannelStatus
} from './types'

/**
 * RealtimeConnection - Centralized Supabase connection management
 * 
 * Handles all real-time connection logic including:
 * - Channel creation and cleanup
 * - Reconnection with exponential backoff
 * - Network resilience
 * - Connection state monitoring
 */
export class RealtimeConnection implements IRealtimeConnection {
  // Connection state
  private connectionState: ConnectionState = 'disconnected'
  private connectionStatus: ConnectionStatus = 'disconnected' // Legacy compatibility
  private isInitialized = false
  
  // Session context
  private currentSessionId: string | null = null
  private currentUserId: string | null = null
  
  // Channel management
  private channels = new Map<string, ChannelEntry>()
  
  // Event handlers
  private events: RealtimeConnectionEvents = {}
  private connectionStateListeners = new Set<(state: ConnectionState) => void>()
  private reconnectCallbacks = new Set<() => void>()
  
  // Network resilience
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private initialReconnectDelay = 1000
  private reconnectTimeout: NodeJS.Timeout | null = null

  /**
   * Initialize the connection with session and user context
   */
  async initialize(config: RealtimeConnectionConfig): Promise<void> {
    console.log('🔗 [RealtimeConnection] Initializing connection:', {
      sessionId: config.sessionId,
      userId: config.userId
    })

    // Store configuration
    this.currentSessionId = config.sessionId
    this.currentUserId = config.userId
    this.events = config.events
    this.maxReconnectAttempts = config.maxReconnectAttempts ?? 5
    this.initialReconnectDelay = config.initialReconnectDelay ?? 1000

    // Update connection state
    this.updateConnectionState('connecting')
    
    try {
      // Clean up any existing connections first
      await this.cleanup()
      
      // Mark as initialized
      this.isInitialized = true
      
      // Connection is ready - but individual channels will be created by services
      this.updateConnectionState('connected')
      console.log('✅ [RealtimeConnection] Connection initialized successfully')
      
    } catch (error) {
      console.error('❌ [RealtimeConnection] Failed to initialize connection:', error)
      this.updateConnectionState('disconnected')
      throw error
    }
  }

  /**
   * Get the current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  /**
   * Get the legacy connection status (for backwards compatibility)
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus
  }

  /**
   * Subscribe to connection state changes
   */
  subscribeToConnectionState(callback: (state: ConnectionState) => void): () => void {
    this.connectionStateListeners.add(callback)
    
    // Return unsubscribe function
    return () => {
      this.connectionStateListeners.delete(callback)
    }
  }

  /**
   * Create a new channel with the given configuration
   */
  async createChannel(config: ChannelConfig): Promise<RealtimeChannel> {
    if (!this.isInitialized || !this.currentSessionId) {
      throw new Error('RealtimeConnection not initialized')
    }

    console.log('📡 [RealtimeConnection] Creating channel:', {
      name: config.name,
      type: config.type,
      sessionId: this.currentSessionId
    })

    // Clean up any existing channel with the same name
    await this.removeChannel(config.name)

    // Generate unique channel name to prevent conflicts
    const uniqueChannelName = `${config.name}:${Date.now()}`
    
    // Create the channel
    const channel = supabase.channel(uniqueChannelName, config.config)
    
    // Store channel entry
    const channelEntry: ChannelEntry = {
      channel,
      name: config.name,
      type: config.type,
      status: 'CLOSED',
      createdAt: new Date()
    }
    
    this.channels.set(config.name, channelEntry)

    // Set up channel status monitoring
    this.setupChannelStatusMonitoring(channelEntry)
    
    console.log('✅ [RealtimeConnection] Channel created:', config.name)
    return channel
  }

  /**
   * Remove a channel by name
   */
  async removeChannel(channelName: string): Promise<void> {
    const channelEntry = this.channels.get(channelName)
    if (!channelEntry) {
      return
    }

    console.log('🗑️ [RealtimeConnection] Removing channel:', channelName)

    try {
      // Unsubscribe and remove from Supabase
      await channelEntry.channel.unsubscribe()
      await supabase.removeChannel(channelEntry.channel)
    } catch (error) {
      console.error('❌ [RealtimeConnection] Error removing channel:', error)
    }

    // Remove from our registry
    this.channels.delete(channelName)
    console.log('✅ [RealtimeConnection] Channel removed:', channelName)
  }

  /**
   * Get an existing channel by name
   */
  getChannel(channelName: string): RealtimeChannel | null {
    const channelEntry = this.channels.get(channelName)
    return channelEntry ? channelEntry.channel : null
  }

  /**
   * Register a callback to be called when reconnection occurs
   */
  onReconnect(callback: () => void): () => void {
    this.reconnectCallbacks.add(callback)
    
    // Return unsubscribe function
    return () => {
      this.reconnectCallbacks.delete(callback)
    }
  }

  /**
   * Force a reconnection attempt
   */
  async forceReconnect(): Promise<void> {
    console.log('🔄 [RealtimeConnection] Force reconnecting...')
    
    if (!this.currentSessionId || !this.currentUserId) {
      throw new Error('Cannot reconnect - no session context')
    }

    // Cancel any pending reconnection
    this.cancelReconnect()
    
    // Update state
    this.updateConnectionState('reconnecting')
    
    try {
      // Recreate all channels
      await this.recreateAllChannels()
      
      // Reset reconnection attempts on success
      this.reconnectAttempts = 0
      
      // Update state to connected
      this.updateConnectionState('connected')
      
      // Notify reconnect callbacks
      this.reconnectCallbacks.forEach(callback => {
        try {
          callback()
        } catch (error) {
          console.error('❌ [RealtimeConnection] Error in reconnect callback:', error)
        }
      })
      
      console.log('✅ [RealtimeConnection] Force reconnection successful')
      
    } catch (error) {
      console.error('❌ [RealtimeConnection] Force reconnection failed:', error)
      this.updateConnectionState('disconnected')
      throw error
    }
  }

  /**
   * Clean up all channels and subscriptions
   */
  async cleanup(): Promise<void> {
    console.log('🧹 [RealtimeConnection] Starting cleanup...')
    
    // Cancel reconnection attempts
    this.cancelReconnect()
    
    // Clean up all channels
    const channelNames = Array.from(this.channels.keys())
    for (const channelName of channelNames) {
      await this.removeChannel(channelName)
    }
    
    // Clear all state
    this.channels.clear()
    this.connectionStateListeners.clear()
    this.reconnectCallbacks.clear()
    
    // Reset connection state
    this.updateConnectionState('disconnected')
    this.isInitialized = false
    
    console.log('✅ [RealtimeConnection] Cleanup completed')
  }

  /**
   * Update connection state and notify listeners
   */
  private updateConnectionState(state: ConnectionState): void {
    const previousState = this.connectionState
    this.connectionState = state
    
    // Map to legacy status for backwards compatibility
    this.connectionStatus = this.mapConnectionStateToStatus(state)
    
    console.log(`🔗 [RealtimeConnection] Connection state changed: ${previousState} → ${state}`)
    
    // Notify state listeners
    this.connectionStateListeners.forEach(callback => {
      try {
        callback(state)
      } catch (error) {
        console.error('❌ [RealtimeConnection] Error in state callback:', error)
      }
    })
    
    // Notify legacy status listeners
    this.events.onConnectionStatusChanged?.(this.connectionStatus)
  }

  /**
   * Map connection state to legacy status
   */
  private mapConnectionStateToStatus(state: ConnectionState): ConnectionStatus {
    switch (state) {
      case 'connecting':
      case 'reconnecting':
        return 'connecting'
      case 'connected':
        return 'connected'
      case 'disconnected':
      default:
        return 'disconnected'
    }
  }

  /**
   * Set up channel status monitoring
   */
  private setupChannelStatusMonitoring(channelEntry: ChannelEntry): void {
    // We'll set up monitoring when the channel is subscribed
    // This is handled by the services that use the channels
  }

  /**
   * Handle channel errors and trigger reconnection if needed
   */
  private handleChannelError(channelEntry: ChannelEntry, status: ChannelStatus): void {
    console.error('❌ [RealtimeConnection] Channel error:', {
      name: channelEntry.name,
      status
    })

    channelEntry.status = status
    
    // If channel failed, mark connection as disconnected and schedule reconnect
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      this.updateConnectionState('disconnected')
      this.scheduleReconnect()
    }

    // Notify error callback
    this.events.onChannelError?.({ channelName: channelEntry.name, status })
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout || this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('💀 [RealtimeConnection] Max reconnection attempts reached')
      }
      return
    }

    const delay = this.getRetryDelay(this.reconnectAttempts)
    this.reconnectAttempts++

    console.log(`🔄 [RealtimeConnection] Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`)
    this.updateConnectionState('reconnecting')
    
    // Notify reconnect attempt
    this.events.onReconnectAttempt?.(this.reconnectAttempts)

    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null
      
      try {
        await this.forceReconnect()
      } catch (error) {
        console.error('❌ [RealtimeConnection] Scheduled reconnect failed:', error)
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
   * Get the exponential backoff delay for retry attempts
   */
  private getRetryDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s (max)
    return Math.min(this.initialReconnectDelay * Math.pow(2, attempt), 16000)
  }

  /**
   * Recreate all existing channels (used during reconnection)
   */
  private async recreateAllChannels(): Promise<void> {
    console.log('🔄 [RealtimeConnection] Recreating all channels...')
    
    const channelEntries = Array.from(this.channels.values())
    
    for (const channelEntry of channelEntries) {
      try {
        // Remove the old channel
        await this.removeChannel(channelEntry.name)
        
        // The individual services will recreate their channels as needed
        // by calling createChannel again
        
      } catch (error) {
        console.error('❌ [RealtimeConnection] Error recreating channel:', error)
      }
    }
    
    console.log('✅ [RealtimeConnection] All channels recreated')
  }
}