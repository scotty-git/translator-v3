import { sessionManager } from '@/services/SessionManager'
import { ErrorManager } from '@/lib/errors/ErrorManager'
import { ErrorCode } from '@/lib/errors/ErrorCodes'
import type { SessionState, SessionParticipant, SessionEventHandlers, ISessionStateManager } from './types'

const SESSION_STORAGE_KEY = 'activeSession'
const SESSION_EXPIRY_HOURS = 12

export class SessionStateManager implements ISessionStateManager {
  private static instance: SessionStateManager
  private currentSession: SessionState | null = null
  private eventHandlers: SessionEventHandlers = {}
  private expiryCheckInterval: number | null = null

  private constructor() {
    // Start session expiry monitoring
    this.startExpiryMonitoring()
  }

  static getInstance(): SessionStateManager {
    if (!SessionStateManager.instance) {
      SessionStateManager.instance = new SessionStateManager()
    }
    return SessionStateManager.instance
  }

  // ========================================
  // Session Lifecycle
  // ========================================

  async createSession(): Promise<SessionState> {
    try {
      console.log('🎯 [SessionStateManager] Creating new session...')
      
      // Create session via SessionManager
      const { sessionId, code } = await sessionManager.createSession()
      
      // Generate user ID for this device
      const userId = sessionManager.generateUserId()
      
      // Add self as participant
      await sessionManager.addParticipant(sessionId, userId)
      
      // Create session state
      const sessionState: SessionState = {
        sessionId,
        sessionCode: code,
        userId,
        role: 'host',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000).toISOString()
      }
      
      // Store session
      this.setCurrentSession(sessionState)
      this.persistSession(sessionState)
      
      console.log('✅ [SessionStateManager] Session created successfully:', { code, sessionId })
      
      // Emit event
      this.eventHandlers.onSessionCreated?.(sessionState)
      
      return sessionState
      
    } catch (error) {
      console.error('❌ [SessionStateManager] Failed to create session:', error)
      this.eventHandlers.onSessionError?.(error as Error)
      throw error
    }
  }

  async joinSession(code: string): Promise<SessionState> {
    try {
      console.log('🔍 [SessionStateManager] Joining session with code:', code)
      
      // Validate code format
      if (!code || code.length !== 4 || !/^\d{4}$/.test(code)) {
        throw ErrorManager.createError(
          ErrorCode.VALIDATION_ERROR,
          'Please enter a 4-digit code'
        )
      }
      
      // Join session via SessionManager
      const { sessionId, partnerId } = await sessionManager.joinSession(code)
      
      // Generate user ID for this device
      const userId = sessionManager.generateUserId()
      
      // Add self as participant
      await sessionManager.addParticipant(sessionId, userId)
      
      // Create session state
      const sessionState: SessionState = {
        sessionId,
        sessionCode: code,
        userId,
        partnerId,
        role: 'guest',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000).toISOString()
      }
      
      // Store session
      this.setCurrentSession(sessionState)
      this.persistSession(sessionState)
      
      console.log('✅ [SessionStateManager] Session joined successfully:', { code, sessionId, partnerId })
      
      // Emit events
      this.eventHandlers.onSessionJoined?.(sessionState)
      if (partnerId) {
        this.eventHandlers.onPartnerJoined?.(partnerId)
      }
      
      return sessionState
      
    } catch (error) {
      console.error('❌ [SessionStateManager] Failed to join session:', error)
      this.eventHandlers.onSessionError?.(error as Error)
      throw error
    }
  }

  async validateSession(code: string): Promise<boolean> {
    try {
      return await sessionManager.validateSession(code)
    } catch (error) {
      console.error('❌ [SessionStateManager] Session validation failed:', error)
      return false
    }
  }

  // ========================================
  // Session State Management
  // ========================================

  getCurrentSession(): SessionState | null {
    return this.currentSession
  }

  setCurrentSession(session: SessionState): void {
    this.currentSession = session
    console.log('📱 [SessionStateManager] Current session updated:', {
      code: session.sessionCode,
      role: session.role,
      sessionId: session.sessionId
    })
  }

  clearSession(): void {
    console.log('🧹 [SessionStateManager] Clearing session state')
    this.currentSession = null
    this.clearPersistedSession()
  }

  // ========================================
  // Participant Management
  // ========================================

  async addParticipant(sessionId: string, userId: string): Promise<void> {
    try {
      await sessionManager.addParticipant(sessionId, userId)
    } catch (error) {
      console.error('❌ [SessionStateManager] Failed to add participant:', error)
      throw error
    }
  }

  async getParticipants(sessionId: string): Promise<SessionParticipant[]> {
    // This would require extending SessionManager with participant fetching
    // For now, return empty array as this isn't currently used
    return []
  }

  // ========================================
  // Persistence
  // ========================================

  persistSession(session: SessionState): void {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
      console.log('💾 [SessionStateManager] Session persisted to localStorage')
    } catch (error) {
      console.error('❌ [SessionStateManager] Failed to persist session:', error)
    }
  }

  restoreSession(): SessionState | null {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY)
      if (!saved) {
        return null
      }

      const session = JSON.parse(saved) as SessionState
      
      // Check if session is expired
      if (this.isSessionExpired(session)) {
        console.log('⏰ [SessionStateManager] Restored session is expired, clearing')
        this.clearPersistedSession()
        return null
      }
      
      console.log('📱 [SessionStateManager] Session restored from localStorage:', {
        code: session.sessionCode,
        role: session.role
      })
      
      this.currentSession = session
      return session
      
    } catch (error) {
      console.error('❌ [SessionStateManager] Failed to restore session:', error)
      this.clearPersistedSession()
      return null
    }
  }

  private clearPersistedSession(): void {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY)
      console.log('🧹 [SessionStateManager] Persisted session cleared')
    } catch (error) {
      console.error('❌ [SessionStateManager] Failed to clear persisted session:', error)
    }
  }

  // ========================================
  // Session Monitoring
  // ========================================

  isSessionExpired(session: SessionState): boolean {
    if (!session.createdAt) {
      return false // Legacy session without timestamp
    }
    
    const sessionDate = new Date(session.createdAt)
    const now = new Date()
    const hoursElapsed = (now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60)
    
    return hoursElapsed > SESSION_EXPIRY_HOURS
  }

  getSessionTimeRemaining(session: SessionState): number {
    if (!session.createdAt) {
      return SESSION_EXPIRY_HOURS * 60 * 60 * 1000 // Return full time for legacy sessions
    }
    
    const sessionDate = new Date(session.createdAt)
    const expiryTime = sessionDate.getTime() + (SESSION_EXPIRY_HOURS * 60 * 60 * 1000)
    const now = Date.now()
    
    return Math.max(0, expiryTime - now)
  }

  private startExpiryMonitoring(): void {
    // Check every 5 minutes for expired sessions
    this.expiryCheckInterval = window.setInterval(() => {
      if (this.currentSession && this.isSessionExpired(this.currentSession)) {
        console.log('⏰ [SessionStateManager] Current session expired, cleaning up')
        const expiredSessionId = this.currentSession.sessionId
        this.clearSession()
        this.eventHandlers.onSessionExpired?.(expiredSessionId)
      }
    }, 5 * 60 * 1000)
  }

  // ========================================
  // Event Handling
  // ========================================

  setEventHandlers(handlers: SessionEventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers }
    console.log('📡 [SessionStateManager] Event handlers updated')
  }

  // ========================================
  // Cleanup
  // ========================================

  cleanup(): void {
    console.log('🧹 [SessionStateManager] Cleaning up service')
    
    // Clear expiry monitoring
    if (this.expiryCheckInterval) {
      clearInterval(this.expiryCheckInterval)
      this.expiryCheckInterval = null
    }
    
    // Clear session state but keep persistence for recovery
    this.currentSession = null
    this.eventHandlers = {}
  }
}

// Export singleton instance
export const sessionStateManager = SessionStateManager.getInstance()