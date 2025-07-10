export interface SessionState {
  sessionId: string
  sessionCode: string
  userId: string
  role: 'host' | 'guest'
  partnerId?: string
  createdAt: string
  expiresAt?: string
}

export interface SessionParticipant {
  id: string
  userId: string
  sessionId: string
  joinedAt: string
  isOnline: boolean
  lastSeen: string
}

export interface SessionInfo {
  code: string
  status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting'
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'reconnecting'
  partnerOnline: boolean
}

export interface SessionEventHandlers {
  onSessionCreated?: (session: SessionState) => void
  onSessionJoined?: (session: SessionState) => void
  onSessionExpired?: (sessionId: string) => void
  onSessionError?: (error: Error) => void
  onPartnerJoined?: (partnerId: string) => void
  onPartnerLeft?: (partnerId: string) => void
}

export interface ISessionStateManager {
  // Session lifecycle
  createSession(): Promise<SessionState>
  joinSession(code: string): Promise<SessionState>
  validateSession(code: string): Promise<boolean>
  
  // Session state management
  getCurrentSession(): SessionState | null
  setCurrentSession(session: SessionState): void
  clearSession(): void
  
  // Participant management
  addParticipant(sessionId: string, userId: string): Promise<void>
  getParticipants(sessionId: string): Promise<SessionParticipant[]>
  
  // Persistence
  persistSession(session: SessionState): void
  restoreSession(): SessionState | null
  
  // Session monitoring
  isSessionExpired(session: SessionState): boolean
  getSessionTimeRemaining(session: SessionState): number
  
  // Event handling
  setEventHandlers(handlers: SessionEventHandlers): void
  
  // Cleanup
  cleanup(): void
}

export type SessionRole = 'host' | 'guest'
export type SessionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'