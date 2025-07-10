import type { RealtimeChannel } from '@supabase/supabase-js'
import type { SessionMessage, ConnectionStatus } from '@/types/database'

/**
 * Connection state for the realtime connection
 */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

/**
 * Channel configuration for creating channels
 */
export interface ChannelConfig {
  name: string
  type: 'messages' | 'presence' | 'participant'
  config?: any
}

/**
 * Events that can be emitted by the realtime connection
 */
export interface RealtimeConnectionEvents {
  onConnectionStatusChanged?: (status: ConnectionStatus) => void
  onMessageReceived?: (message: SessionMessage) => void
  onChannelError?: (error: any) => void
  onReconnectAttempt?: (attempt: number) => void
}

/**
 * Configuration for initializing the realtime connection
 */
export interface RealtimeConnectionConfig {
  sessionId: string
  userId: string
  events: RealtimeConnectionEvents
  maxReconnectAttempts?: number
  initialReconnectDelay?: number
}

/**
 * Interface for the RealtimeConnection service
 */
export interface IRealtimeConnection {
  /**
   * Initialize the connection with session and user context
   */
  initialize(config: RealtimeConnectionConfig): Promise<void>

  /**
   * Get the current connection state
   */
  getConnectionState(): ConnectionState

  /**
   * Get the legacy connection status (for backwards compatibility)
   */
  getConnectionStatus(): ConnectionStatus

  /**
   * Subscribe to connection state changes
   */
  subscribeToConnectionState(callback: (state: ConnectionState) => void): () => void

  /**
   * Create a new channel with the given configuration
   */
  createChannel(config: ChannelConfig): Promise<RealtimeChannel>

  /**
   * Remove a channel by name
   */
  removeChannel(channelName: string): Promise<void>

  /**
   * Get an existing channel by name
   */
  getChannel(channelName: string): RealtimeChannel | null

  /**
   * Register a callback to be called when reconnection occurs
   */
  onReconnect(callback: () => void): () => void

  /**
   * Force a reconnection attempt
   */
  forceReconnect(): Promise<void>

  /**
   * Clean up all channels and subscriptions
   */
  cleanup(): Promise<void>
}

/**
 * Channel subscription status
 */
export type ChannelStatus = 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED'

/**
 * Channel registry entry
 */
export interface ChannelEntry {
  channel: RealtimeChannel
  name: string
  type: ChannelConfig['type']
  status: ChannelStatus
  createdAt: Date
}