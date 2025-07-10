import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SessionStateManager } from '../SessionStateManager'
import { sessionManager } from '@/services/SessionManager'
import type { SessionState } from '../types'

// Mock dependencies
vi.mock('@/services/SessionManager', () => ({
  sessionManager: {
    createSession: vi.fn(),
    joinSession: vi.fn(),
    validateSession: vi.fn(),
    addParticipant: vi.fn(),
    generateUserId: vi.fn()
  }
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock console to reduce noise
vi.spyOn(console, 'log').mockImplementation(() => {})
vi.spyOn(console, 'error').mockImplementation(() => {})

describe('SessionStateManager', () => {
  let manager: SessionStateManager
  
  beforeEach(() => {
    // Get a fresh instance
    manager = SessionStateManager.getInstance()
    
    // Clear all mocks
    vi.clearAllMocks()
    
    // Reset localStorage mock
    localStorageMock.getItem.mockReturnValue(null)
    
    // Setup default mocks
    vi.mocked(sessionManager.generateUserId).mockReturnValue('test-user-id')
  })
  
  afterEach(() => {
    manager.cleanup()
  })

  describe('Session Creation', () => {
    it('should create a new session successfully', async () => {
      // Setup
      vi.mocked(sessionManager.createSession).mockResolvedValue({
        sessionId: 'test-session-id',
        code: '1234'
      })
      vi.mocked(sessionManager.addParticipant).mockResolvedValue()

      // Execute
      const result = await manager.createSession()

      // Verify
      expect(result).toEqual({
        sessionId: 'test-session-id',
        sessionCode: '1234',
        userId: 'test-user-id',
        role: 'host',
        createdAt: expect.any(String),
        expiresAt: expect.any(String)
      })

      expect(sessionManager.createSession).toHaveBeenCalledOnce()
      expect(sessionManager.addParticipant).toHaveBeenCalledWith('test-session-id', 'test-user-id')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('activeSession', expect.any(String))
    })

    it('should handle session creation errors', async () => {
      // Setup
      const error = new Error('Database error')
      vi.mocked(sessionManager.createSession).mockRejectedValue(error)

      // Execute & Verify
      await expect(manager.createSession()).rejects.toThrow('Database error')
    })
  })

  describe('Session Joining', () => {
    it('should join an existing session successfully', async () => {
      // Setup
      vi.mocked(sessionManager.joinSession).mockResolvedValue({
        sessionId: 'existing-session-id',
        partnerId: 'partner-user-id'
      })
      vi.mocked(sessionManager.addParticipant).mockResolvedValue()

      // Execute
      const result = await manager.joinSession('5678')

      // Verify
      expect(result).toEqual({
        sessionId: 'existing-session-id',
        sessionCode: '5678',
        userId: 'test-user-id',
        partnerId: 'partner-user-id',
        role: 'guest',
        createdAt: expect.any(String),
        expiresAt: expect.any(String)
      })

      expect(sessionManager.joinSession).toHaveBeenCalledWith('5678')
      expect(sessionManager.addParticipant).toHaveBeenCalledWith('existing-session-id', 'test-user-id')
    })

    it('should validate session code format', async () => {
      // Test invalid codes
      await expect(manager.joinSession('')).rejects.toThrow()
      await expect(manager.joinSession('123')).rejects.toThrow()
      await expect(manager.joinSession('12345')).rejects.toThrow()
      await expect(manager.joinSession('abcd')).rejects.toThrow()
    })

    it('should handle join session errors', async () => {
      // Setup
      const error = new Error('Session not found')
      vi.mocked(sessionManager.joinSession).mockRejectedValue(error)

      // Execute & Verify
      await expect(manager.joinSession('9999')).rejects.toThrow('Session not found')
    })
  })

  describe('Session Validation', () => {
    it('should validate existing sessions', async () => {
      // Setup
      vi.mocked(sessionManager.validateSession).mockResolvedValue(true)

      // Execute
      const result = await manager.validateSession('1234')

      // Verify
      expect(result).toBe(true)
      expect(sessionManager.validateSession).toHaveBeenCalledWith('1234')
    })

    it('should handle validation errors gracefully', async () => {
      // Setup
      vi.mocked(sessionManager.validateSession).mockRejectedValue(new Error('Network error'))

      // Execute
      const result = await manager.validateSession('1234')

      // Verify
      expect(result).toBe(false)
    })
  })

  describe('Session State Management', () => {
    it('should manage current session state', () => {
      // Setup
      const sessionState: SessionState = {
        sessionId: 'test-id',
        sessionCode: '1234',
        userId: 'user-id',
        role: 'host',
        createdAt: new Date().toISOString()
      }

      // Test initial state
      expect(manager.getCurrentSession()).toBeNull()

      // Test setting session
      manager.setCurrentSession(sessionState)
      expect(manager.getCurrentSession()).toEqual(sessionState)

      // Test clearing session
      manager.clearSession()
      expect(manager.getCurrentSession()).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('activeSession')
    })
  })

  describe('Session Persistence', () => {
    it('should persist session to localStorage', () => {
      // Setup
      const sessionState: SessionState = {
        sessionId: 'test-id',
        sessionCode: '1234',
        userId: 'user-id',
        role: 'host',
        createdAt: new Date().toISOString()
      }

      // Execute
      manager.persistSession(sessionState)

      // Verify
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'activeSession',
        JSON.stringify(sessionState)
      )
    })

    it('should restore session from localStorage', () => {
      // Setup
      const sessionState: SessionState = {
        sessionId: 'test-id',
        sessionCode: '1234',
        userId: 'user-id',
        role: 'host',
        createdAt: new Date().toISOString()
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(sessionState))

      // Execute
      const result = manager.restoreSession()

      // Verify
      expect(result).toEqual(sessionState)
      expect(manager.getCurrentSession()).toEqual(sessionState)
    })

    it('should handle corrupted localStorage data', () => {
      // Setup
      localStorageMock.getItem.mockReturnValue('invalid-json')

      // Execute
      const result = manager.restoreSession()

      // Verify
      expect(result).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('activeSession')
    })

    it('should clear expired sessions on restore', () => {
      // Setup - session from 24 hours ago
      const expiredSession: SessionState = {
        sessionId: 'test-id',
        sessionCode: '1234',
        userId: 'user-id',
        role: 'host',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredSession))

      // Execute
      const result = manager.restoreSession()

      // Verify
      expect(result).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('activeSession')
    })
  })

  describe('Session Expiry', () => {
    it('should detect expired sessions', () => {
      // Test expired session (13 hours old)
      const expiredSession: SessionState = {
        sessionId: 'test-id',
        sessionCode: '1234',
        userId: 'user-id',
        role: 'host',
        createdAt: new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString()
      }

      expect(manager.isSessionExpired(expiredSession)).toBe(true)
    })

    it('should detect valid sessions', () => {
      // Test valid session (1 hour old)
      const validSession: SessionState = {
        sessionId: 'test-id',
        sessionCode: '1234',
        userId: 'user-id',
        role: 'host',
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      }

      expect(manager.isSessionExpired(validSession)).toBe(false)
    })

    it('should handle legacy sessions without createdAt', () => {
      // Test legacy session
      const legacySession: SessionState = {
        sessionId: 'test-id',
        sessionCode: '1234',
        userId: 'user-id',
        role: 'host',
        createdAt: undefined as any
      }

      expect(manager.isSessionExpired(legacySession)).toBe(false)
    })

    it('should calculate remaining time correctly', () => {
      // Test session with 6 hours remaining
      const session: SessionState = {
        sessionId: 'test-id',
        sessionCode: '1234',
        userId: 'user-id',
        role: 'host',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      }

      const remaining = manager.getSessionTimeRemaining(session)
      const expectedRemaining = 6 * 60 * 60 * 1000 // 6 hours in ms
      
      // Allow for small timing differences
      expect(remaining).toBeGreaterThan(expectedRemaining - 1000)
      expect(remaining).toBeLessThan(expectedRemaining + 1000)
    })
  })

  describe('Event Handling', () => {
    it('should set and trigger event handlers', async () => {
      // Setup
      const onSessionCreated = vi.fn()
      const onSessionError = vi.fn()
      
      manager.setEventHandlers({
        onSessionCreated,
        onSessionError
      })

      // Mock successful creation
      vi.mocked(sessionManager.createSession).mockResolvedValue({
        sessionId: 'test-session-id',
        code: '1234'
      })
      vi.mocked(sessionManager.addParticipant).mockResolvedValue()

      // Execute
      await manager.createSession()

      // Verify
      expect(onSessionCreated).toHaveBeenCalledWith(expect.objectContaining({
        sessionCode: '1234',
        role: 'host'
      }))
    })
  })

  describe('Cleanup', () => {
    it('should clean up resources properly', () => {
      // Setup a session
      const sessionState: SessionState = {
        sessionId: 'test-id',
        sessionCode: '1234',
        userId: 'user-id',
        role: 'host',
        createdAt: new Date().toISOString()
      }
      manager.setCurrentSession(sessionState)

      // Execute cleanup
      manager.cleanup()

      // Verify
      expect(manager.getCurrentSession()).toBeNull()
    })
  })
})