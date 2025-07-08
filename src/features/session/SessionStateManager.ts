import { Session } from '@/types/database'
import { SessionService } from '@/services/supabase'
import { withRetry } from '@/lib/connection-recovery'
import { performanceLogger } from '@/lib/performance'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface SessionState {
  session: Session | null
  connectionState: ConnectionState
  error: string | null
  reconnectAttempts: number
  lastHeartbeat?: number
  expiryWarningShown?: boolean
}

interface SessionStateListeners {
  onStateChange: (state: SessionState) => void
  onSessionExpired?: () => void
  onConnectionRestored?: () => void
}

export class SessionStateManager {
  private state: SessionState = {
    session: null,
    connectionState: 'disconnected',
    error: null,
    reconnectAttempts: 0,
  }
  
  private listeners = new Set<(state: SessionState) => void>()
  private reconnectTimer?: NodeJS.Timeout
  private heartbeatTimer?: NodeJS.Timeout
  private expiryCheckTimer?: NodeJS.Timeout
  private sessionChannel?: RealtimeChannel
  
  // Configuration
  private readonly maxReconnectAttempts = 5
  private readonly reconnectDelays = [1000, 2000, 4000, 8000, 15000, 30000]
  private readonly heartbeatInterval = 30000 // 30 seconds
  private readonly expiryCheckInterval = 60000 // 1 minute
  private readonly expiryWarningThresholds = [30 * 60 * 1000, 5 * 60 * 1000] // 30min, 5min

  /**
   * Initialize session and connect
   */
  async initialize(sessionCode: string, userId: string, isNewlyCreated: boolean = false): Promise<void> {
    performanceLogger.start('session.state.initialize')
    
    this.updateState({ 
      connectionState: 'connecting',
      error: null,
      reconnectAttempts: 0 
    })
    
    try {
      let session;
      
      if (isNewlyCreated) {
        // For newly created sessions, just get the session data - user count already set to 1
        session = await withRetry(
          () => SessionService.getSessionByCode(sessionCode),
          'session-get'
        )
        
        if (!session) {
          throw new Error('Newly created session not found')
        }
      } else {
        // For existing sessions, join normally
        session = await withRetry(
          () => SessionService.joinSession(sessionCode),
          'session-join'
        )
      }
      
      this.updateState({ 
        session, 
        connectionState: 'connected',
        error: null,
        reconnectAttempts: 0,
        lastHeartbeat: Date.now()
      })
      
      // Start session monitoring
      this.subscribeToSession(session.id)
      this.startHeartbeat(session.id)
      this.startExpiryMonitoring()
      
      performanceLogger.end('session.state.initialize', {
        success: true,
        sessionId: session.id
      })
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to join session'
      
      this.updateState({ 
        connectionState: 'error',
        error: errorMessage
      })
      
      performanceLogger.end('session.state.initialize', {
        success: false,
        error: errorMessage
      })
      
      throw error
    }
  }

  /**
   * Subscribe to real-time session updates
   */
  private subscribeToSession(sessionId: string): void {
    if (this.sessionChannel) {
      this.sessionChannel.unsubscribe()
    }

    this.sessionChannel = SessionService.subscribeToSession(
      sessionId,
      (updatedSession) => {
        // Check if session is still active
        if (!updatedSession.is_active) {
          this.handleSessionExpired()
          return
        }
        
        // Check if session is expired by time
        if (new Date(updatedSession.expires_at) <= new Date()) {
          this.handleSessionExpired()
          return
        }
        
        this.updateState({ session: updatedSession })
      }
    )

    // Monitor connection health
    this.sessionChannel
      .on('system', { event: 'error' }, (error) => {
        console.error('Session channel error:', error)
        this.handleConnectionError()
      })
      .on('system', { event: 'disconnect' }, () => {
        console.warn('Session channel disconnected')
        this.handleDisconnect()
      })
      .on('system', { event: 'connect' }, () => {
        console.log('Session channel reconnected')
        if (this.state.connectionState === 'disconnected') {
          this.updateState({ 
            connectionState: 'connected',
            reconnectAttempts: 0,
            error: null
          })
        }
      })
  }

  /**
   * Start heartbeat to keep session active
   */
  private startHeartbeat(sessionId: string): void {
    this.stopHeartbeat()
    
    this.heartbeatTimer = setInterval(async () => {
      if (this.state.connectionState === 'connected') {
        try {
          await withRetry(
            () => SessionService.updateLastActivity(sessionId),
            'session-heartbeat'
          )
          
          this.updateState({ lastHeartbeat: Date.now() })
          
        } catch (error) {
          console.error('Heartbeat failed:', error)
          // Don't treat heartbeat failure as connection error
          // The main connection monitoring will handle reconnection
        }
      }
    }, this.heartbeatInterval)
  }

  /**
   * Stop heartbeat timer
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = undefined
    }
  }

  /**
   * Start monitoring session expiry
   */
  private startExpiryMonitoring(): void {
    this.stopExpiryMonitoring()
    
    this.expiryCheckTimer = setInterval(() => {
      if (!this.state.session) return
      
      const now = Date.now()
      const expiresAt = new Date(this.state.session.expires_at).getTime()
      const timeUntilExpiry = expiresAt - now
      
      // Check for expiry warnings
      for (const threshold of this.expiryWarningThresholds) {
        if (timeUntilExpiry <= threshold && timeUntilExpiry > 0) {
          this.showExpiryWarning(timeUntilExpiry)
          break
        }
      }
      
      // Check if expired
      if (timeUntilExpiry <= 0) {
        this.handleSessionExpired()
      }
      
    }, this.expiryCheckInterval)
  }

  /**
   * Stop expiry monitoring
   */
  private stopExpiryMonitoring(): void {
    if (this.expiryCheckTimer) {
      clearInterval(this.expiryCheckTimer)
      this.expiryCheckTimer = undefined
    }
  }

  /**
   * Show expiry warning
   */
  private showExpiryWarning(timeUntilExpiry: number): void {
    if (this.state.expiryWarningShown) return
    
    const minutes = Math.ceil(timeUntilExpiry / (60 * 1000))
    console.warn(`⚠️ Session expires in ${minutes} minutes`)
    
    // Custom event for UI to show warning
    window.dispatchEvent(new CustomEvent('session-expiry-warning', {
      detail: { timeUntilExpiry, minutes }
    }))
    
    this.updateState({ expiryWarningShown: true })
  }

  /**
   * Handle connection error
   */
  private handleConnectionError(): void {
    if (this.state.connectionState === 'connected') {
      this.updateState({ connectionState: 'disconnected' })
      this.attemptReconnect()
    }
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(): void {
    if (this.state.connectionState === 'connected') {
      this.updateState({ connectionState: 'disconnected' })
      this.attemptReconnect()
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.state.reconnectAttempts >= this.maxReconnectAttempts) {
      this.updateState({ 
        connectionState: 'error',
        error: 'Failed to reconnect after multiple attempts'
      })
      return
    }

    const delay = this.reconnectDelays[this.state.reconnectAttempts] || 30000
    
    console.log(`🔄 Attempting reconnection ${this.state.reconnectAttempts + 1}/${this.maxReconnectAttempts} in ${delay / 1000}s`)
    
    this.reconnectTimer = setTimeout(async () => {
      this.updateState({ 
        reconnectAttempts: this.state.reconnectAttempts + 1 
      })
      
      try {
        if (this.state.session) {
          // Test connection by checking session status
          const isActive = await withRetry(
            () => SessionService.checkSessionActive(this.state.session!.id),
            'session-check'
          )
          
          if (isActive) {
            // Re-subscribe to updates
            this.subscribeToSession(this.state.session.id)
            this.updateState({ 
              connectionState: 'connected',
              reconnectAttempts: 0,
              error: null
            })
            
            console.log('✅ Connection restored successfully')
          } else {
            this.handleSessionExpired()
          }
        }
      } catch (error) {
        console.error('Reconnection attempt failed:', error)
        // Will retry again if under max attempts
        if (this.state.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect()
        }
      }
    }, delay)
  }

  /**
   * Handle session expired
   */
  private handleSessionExpired(): void {
    this.updateState({ 
      connectionState: 'error',
      error: 'Session has expired'
    })
    
    // Custom event for UI to handle expiry
    window.dispatchEvent(new CustomEvent('session-expired'))
    
    this.cleanup()
  }

  /**
   * Extend session expiry
   */
  async extendSession(): Promise<void> {
    if (!this.state.session) {
      throw new Error('No active session to extend')
    }
    
    try {
      await withRetry(
        () => SessionService.extendSession(this.state.session!.id),
        'session-extend'
      )
      
      // Reset expiry warning
      this.updateState({ expiryWarningShown: false })
      
      console.log('✅ Session extended successfully')
      
    } catch (error) {
      console.error('Failed to extend session:', error)
      throw error
    }
  }

  /**
   * Leave session gracefully
   */
  async leave(): Promise<void> {
    if (this.state.session) {
      try {
        await withRetry(
          () => SessionService.leaveSession(this.state.session!.id),
          'session-leave'
        )
      } catch (error) {
        console.error('Error leaving session:', error)
        // Continue with cleanup even if leave fails
      }
    }
    
    this.cleanup()
  }

  /**
   * Clean up all resources
   */
  private cleanup(): void {
    this.stopHeartbeat()
    this.stopExpiryMonitoring()
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }
    
    if (this.sessionChannel) {
      this.sessionChannel.unsubscribe()
      this.sessionChannel = undefined
    }
    
    this.updateState({ 
      session: null,
      connectionState: 'disconnected',
      reconnectAttempts: 0,
      error: null,
      lastHeartbeat: undefined,
      expiryWarningShown: false
    })
  }

  /**
   * Update state and notify listeners
   */
  private updateState(updates: Partial<SessionState>): void {
    const previousState = { ...this.state }
    this.state = { ...this.state, ...updates }
    
    // Log state changes for debugging
    if (previousState.connectionState !== this.state.connectionState) {
      console.log(`Session state: ${previousState.connectionState} → ${this.state.connectionState}`)
    }
    
    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(this.state)
      } catch (error) {
        console.error('Error in session state listener:', error)
      }
    })
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: SessionState) => void): () => void {
    this.listeners.add(listener)
    
    // Send initial state with error handling
    try {
      listener(this.state)
    } catch (error) {
      console.error('Error in session state listener:', error)
    }
    
    // Return unsubscribe function
    return () => this.listeners.delete(listener)
  }

  /**
   * Get current state (readonly)
   */
  getState(): Readonly<SessionState> {
    return { ...this.state }
  }

  /**
   * Check if session is healthy
   */
  isHealthy(): boolean {
    return (
      this.state.connectionState === 'connected' &&
      this.state.session !== null &&
      !this.state.error
    )
  }

  /**
   * Get time until session expires (in milliseconds)
   */
  getTimeUntilExpiry(): number {
    if (!this.state.session) return 0
    
    const expiresAt = new Date(this.state.session.expires_at).getTime()
    const now = Date.now()
    
    return Math.max(0, expiresAt - now)
  }
}