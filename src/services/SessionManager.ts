import { supabase } from '@/lib/supabase'
import { ErrorManager } from '@/lib/errors/ErrorManager'
import { ErrorCode } from '@/lib/errors/ErrorCodes'

/**
 * SessionManager - Handles session creation, joining, and validation
 * Manages 4-digit session codes and participant tracking
 */
export class SessionManager {
  private static instance: SessionManager

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }

  /**
   * Generate a unique user ID for this device
   * Uses crypto.randomUUID if available, falls back to timestamp-based ID
   */
  generateUserId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    // Fallback for environments without crypto.randomUUID
    return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate a unique 4-digit code (1000-9999)
   * Ensures uniqueness by checking against active sessions
   */
  async generateSessionCode(): Promise<string> {
    const maxAttempts = 50 // Prevent infinite loop
    let attempts = 0

    while (attempts < maxAttempts) {
      // Generate random 4-digit code
      const code = Math.floor(1000 + Math.random() * 9000).toString()

      // Check if code is already in use
      const { data: existingSession, error } = await supabase
        .from('sessions')
        .select('id')
        .eq('code', code)
        .eq('is_active', true)
        .single()

      if (error && error.code === 'PGRST116') {
        // No session found with this code - it's available!
        return code
      }

      if (!error && !existingSession) {
        // Code is available
        return code
      }

      attempts++
    }

    throw new Error('Unable to generate unique session code after 50 attempts')
  }

  /**
   * Create a new session with a unique code
   */
  async createSession(): Promise<{ sessionId: string; code: string }> {
    try {
      // Generate unique code
      const code = await this.generateSessionCode()

      // Create session in database
      const { data: session, error } = await supabase
        .from('sessions')
        .insert({
          code,
          is_active: true
        })
        .select('id, code')
        .single()

      if (error) {
        console.error('Error creating session:', error)
        throw ErrorManager.createError(
          ErrorCode.DATABASE_ERROR,
          'Failed to create session',
          { error }
        )
      }

      console.log(`📍 [SessionManager] Created session ${code}`)
      return {
        sessionId: session.id,
        code: session.code
      }
    } catch (error) {
      console.error('Failed to create session:', error)
      throw error
    }
  }

  /**
   * Join an existing session with a 4-digit code
   */
  async joinSession(code: string): Promise<{ sessionId: string; partnerId?: string }> {
    try {
      // Validate code format
      if (!/^\d{4}$/.test(code)) {
        throw ErrorManager.createError(
          ErrorCode.VALIDATION_ERROR,
          'Invalid session code format. Must be 4 digits.'
        )
      }

      // Find active session with this code
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('id, is_active, expires_at')
        .eq('code', code)
        .eq('is_active', true)
        .single()

      if (sessionError || !session) {
        throw ErrorManager.createError(
          ErrorCode.SESSION_NOT_FOUND,
          'Session not found or has expired'
        )
      }

      // Check if session has expired
      if (new Date(session.expires_at) < new Date()) {
        // Mark session as inactive
        await supabase
          .from('sessions')
          .update({ is_active: false })
          .eq('id', session.id)

        throw ErrorManager.createError(
          ErrorCode.SESSION_EXPIRED,
          'This session has expired'
        )
      }

      // Check current participants
      const { data: participants, error: participantsError } = await supabase
        .from('session_participants')
        .select('user_id')
        .eq('session_id', session.id)

      if (participantsError) {
        throw ErrorManager.createError(
          ErrorCode.DATABASE_ERROR,
          'Failed to check session participants'
        )
      }

      // Check if session is full (max 2 participants)
      if (participants && participants.length >= 2) {
        throw ErrorManager.createError(
          ErrorCode.SESSION_FULL,
          'This session already has 2 participants'
        )
      }

      console.log(`📍 [SessionManager] Joined session ${code}`)
      return {
        sessionId: session.id,
        partnerId: participants?.[0]?.user_id
      }
    } catch (error) {
      console.error('Failed to join session:', error)
      throw error
    }
  }

  /**
   * Add a participant to a session
   */
  async addParticipant(sessionId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('session_participants')
        .insert({
          session_id: sessionId,
          user_id: userId,
          is_online: true
        })

      if (error) {
        // Check if it's a duplicate key error (user already in session)
        if (error.code === '23505') {
          // User already in session, update their online status
          await supabase
            .from('session_participants')
            .update({
              is_online: true,
              last_seen: new Date().toISOString()
            })
            .eq('session_id', sessionId)
            .eq('user_id', userId)
          return
        }
        throw error
      }
    } catch (error) {
      console.error('Failed to add participant:', error)
      throw ErrorManager.createError(
        ErrorCode.DATABASE_ERROR,
        'Failed to add participant to session'
      )
    }
  }

  /**
   * Validate that a session exists and is active
   */
  async validateSession(code: string): Promise<boolean> {
    try {
      const { data: session, error } = await supabase
        .from('sessions')
        .select('id, is_active, expires_at')
        .eq('code', code)
        .eq('is_active', true)
        .single()

      if (error || !session) {
        return false
      }

      // Check if expired
      if (new Date(session.expires_at) < new Date()) {
        return false
      }

      return true
    } catch (error) {
      console.error('Error validating session:', error)
      return false
    }
  }

  /**
   * Check if a session has expired
   */
  async checkSessionExpiry(sessionId: string): Promise<boolean> {
    try {
      const { data: session, error } = await supabase
        .from('sessions')
        .select('expires_at')
        .eq('id', sessionId)
        .single()

      if (error || !session) {
        return true // Treat as expired if we can't find it
      }

      return new Date(session.expires_at) < new Date()
    } catch (error) {
      console.error('Error checking session expiry:', error)
      return true // Treat as expired on error
    }
  }

  /**
   * Get session details by code
   */
  async getSessionByCode(code: string): Promise<{ id: string; code: string; createdAt: string; expiresAt: string } | null> {
    try {
      const { data: session, error } = await supabase
        .from('sessions')
        .select('id, code, created_at, expires_at')
        .eq('code', code)
        .eq('is_active', true)
        .single()

      if (error || !session) {
        return null
      }

      return {
        id: session.id,
        code: session.code,
        createdAt: session.created_at,
        expiresAt: session.expires_at
      }
    } catch (error) {
      console.error('Error getting session by code:', error)
      return null
    }
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance()