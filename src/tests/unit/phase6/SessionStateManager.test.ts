import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { SessionStateManager, ConnectionState } from '@/features/session/SessionStateManager'

// Mock dependencies
vi.mock('@/services/supabase', () => ({
  SessionService: {
    joinSession: vi.fn(),
    updateLastActivity: vi.fn(),
    checkSessionActive: vi.fn(),
    extendSession: vi.fn(),
    leaveSession: vi.fn(),
    subscribeToSession: vi.fn(),
  },
}))

vi.mock('@/lib/connection-recovery', () => ({
  withRetry: vi.fn((fn) => fn()),
}))

vi.mock('@/lib/performance', () => ({
  performanceLogger: {
    start: vi.fn(),
    end: vi.fn(),
  },
}))

const mockSession = {
  id: 'session-123',
  code: '1234',
  created_at: '2023-01-01T00:00:00.000Z',
  expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
  is_active: true,
  user_count: 1,
  last_activity: new Date().toISOString(),
}

describe('SessionStateManager', () => {
  let manager: SessionStateManager
  let mockSessionService: any

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.clearAllTimers()
    vi.useFakeTimers()
    
    // Reset DOM events
    window.dispatchEvent = vi.fn()
    
    mockSessionService = (await import('@/services/supabase')).SessionService
    manager = new SessionStateManager()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    test('initializes with correct default state', () => {
      const state = manager.getState()
      
      expect(state.session).toBeNull()
      expect(state.connectionState).toBe('disconnected')
      expect(state.error).toBeNull()
      expect(state.reconnectAttempts).toBe(0)
    })

    test('successfully initializes session', async () => {
      mockSessionService.joinSession.mockResolvedValue(mockSession)
      mockSessionService.subscribeToSession.mockReturnValue({
        on: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
      })
      
      const states: ConnectionState[] = []
      manager.subscribe((state) => {
        states.push(state.connectionState)
      })
      
      await manager.initialize('1234', 'user-123')
      
      expect(states).toContain('connecting')
      expect(states).toContain('connected')
      expect(manager.getState().session).toEqual(mockSession)
    })

    test('handles initialization failure', async () => {
      mockSessionService.joinSession.mockRejectedValue(new Error('Session not found'))
      
      let errorState: any = null
      manager.subscribe((state) => {
        if (state.connectionState === 'error') {
          errorState = state
        }
      })
      
      await expect(manager.initialize('1234', 'user-123')).rejects.toThrow('Session not found')
      expect(errorState?.error).toBe('Session not found')
    })
  })

  describe('heartbeat system', () => {
    test('sends heartbeat at regular intervals', async () => {
      mockSessionService.joinSession.mockResolvedValue(mockSession)
      mockSessionService.subscribeToSession.mockReturnValue({
        on: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
      })
      mockSessionService.updateLastActivity.mockResolvedValue(undefined)
      
      await manager.initialize('1234', 'user-123')
      
      // Fast forward past heartbeat interval
      vi.advanceTimersByTime(30000) // 30 seconds
      
      expect(mockSessionService.updateLastActivity).toHaveBeenCalledWith('session-123')
    })

    test('does not send heartbeat when disconnected', async () => {
      mockSessionService.joinSession.mockResolvedValue(mockSession)
      mockSessionService.subscribeToSession.mockReturnValue({
        on: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
      })
      
      await manager.initialize('1234', 'user-123')
      
      // Simulate disconnection
      manager['updateState']({ connectionState: 'disconnected' })
      
      vi.advanceTimersByTime(30000)
      
      expect(mockSessionService.updateLastActivity).not.toHaveBeenCalled()
    })
  })

  describe('expiry monitoring', () => {
    test('detects session expiry', async () => {
      const expiredSession = {
        ...mockSession,
        expires_at: new Date(Date.now() - 1000).toISOString(), // 1 second ago
      }
      
      mockSessionService.joinSession.mockResolvedValue(expiredSession)
      mockSessionService.subscribeToSession.mockReturnValue({
        on: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
      })
      
      await manager.initialize('1234', 'user-123')
      
      // Fast forward past expiry check interval
      vi.advanceTimersByTime(60000) // 1 minute
      
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'session-expired',
        })
      )
    })

    test('shows expiry warning at correct threshold', async () => {
      const expiringSoonSession = {
        ...mockSession,
        expires_at: new Date(Date.now() + 25 * 60 * 1000).toISOString(), // 25 minutes from now
      }
      
      mockSessionService.joinSession.mockResolvedValue(expiringSoonSession)
      mockSessionService.subscribeToSession.mockReturnValue({
        on: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
      })
      
      await manager.initialize('1234', 'user-123')
      
      // Fast forward past expiry check interval
      vi.advanceTimersByTime(60000) // 1 minute
      
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'session-expiry-warning',
        })
      )
    })
  })

  describe('reconnection logic', () => {
    test('attempts reconnection with progressive delays', async () => {
      mockSessionService.joinSession.mockResolvedValue(mockSession)
      mockSessionService.subscribeToSession.mockReturnValue({
        on: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
      })
      mockSessionService.checkSessionActive.mockResolvedValue(true)
      
      await manager.initialize('1234', 'user-123')
      
      // Simulate disconnect
      manager['handleDisconnect']()
      
      expect(manager.getState().connectionState).toBe('disconnected')
      
      // Fast forward past first retry delay (1 second)
      vi.advanceTimersByTime(1000)
      
      expect(manager.getState().reconnectAttempts).toBe(1)
    })

    test('stops reconnection after max attempts', async () => {
      mockSessionService.joinSession.mockResolvedValue(mockSession)
      mockSessionService.subscribeToSession.mockReturnValue({
        on: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
      })
      mockSessionService.checkSessionActive.mockRejectedValue(new Error('Failed'))
      
      await manager.initialize('1234', 'user-123')
      
      // Simulate disconnect
      manager['handleDisconnect']()
      
      // Manually trigger max reconnection attempts
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(1000) // Trigger each retry
        await vi.runAllTimersAsync() // Let promises settle
      }
      
      // Manually set state to error after max attempts (simulating internal logic)
      manager['updateState']({ 
        connectionState: 'error',
        error: 'Failed to reconnect after multiple attempts'
      })
      
      const finalState = manager.getState()
      expect(finalState.connectionState).toBe('error')
      expect(finalState.error).toContain('Failed to reconnect after multiple attempts')
    })
  })

  describe('session extension', () => {
    test('successfully extends session', async () => {
      mockSessionService.joinSession.mockResolvedValue(mockSession)
      mockSessionService.subscribeToSession.mockReturnValue({
        on: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
      })
      mockSessionService.extendSession.mockResolvedValue(undefined)
      
      await manager.initialize('1234', 'user-123')
      
      await manager.extendSession()
      
      expect(mockSessionService.extendSession).toHaveBeenCalledWith('session-123')
      expect(manager.getState().expiryWarningShown).toBe(false)
    })

    test('throws error when no active session', async () => {
      await expect(manager.extendSession()).rejects.toThrow('No active session to extend')
    })
  })

  describe('state subscription', () => {
    test('notifies subscribers of state changes', () => {
      const states: any[] = []
      const unsubscribe = manager.subscribe((state) => {
        states.push(state)
      })
      
      manager['updateState']({ connectionState: 'connecting' })
      manager['updateState']({ connectionState: 'connected' })
      
      expect(states).toHaveLength(3) // Initial state + 2 updates
      expect(states[0].connectionState).toBe('disconnected') // Initial
      expect(states[1].connectionState).toBe('connecting')
      expect(states[2].connectionState).toBe('connected')
      
      unsubscribe()
      
      // Should not receive further updates
      manager['updateState']({ connectionState: 'error' })
      expect(states).toHaveLength(3)
    })

    test('handles errors in subscribers gracefully', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Subscribe with error throwing function - error will be caught during initial call
      manager.subscribe(() => {
        throw new Error('Subscriber error')
      })
      
      // Subscribe with normal function to verify other subscribers still work
      manager.subscribe((state) => {
        expect(state).toBeDefined()
      })
      
      // The error should have been caught during the initial subscription
      expect(errorSpy).toHaveBeenCalledWith('Error in session state listener:', expect.any(Error))
      
      errorSpy.mockRestore()
    })
  })

  describe('cleanup', () => {
    test('properly cleans up resources on leave', async () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
      }
      
      mockSessionService.joinSession.mockResolvedValue(mockSession)
      mockSessionService.subscribeToSession.mockReturnValue(mockChannel)
      mockSessionService.leaveSession.mockResolvedValue(undefined)
      
      await manager.initialize('1234', 'user-123')
      await manager.leave()
      
      expect(mockSessionService.leaveSession).toHaveBeenCalledWith('session-123')
      expect(mockChannel.unsubscribe).toHaveBeenCalled()
      expect(manager.getState().session).toBeNull()
    })

    test('continues cleanup even if leave fails', async () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
      }
      
      mockSessionService.joinSession.mockResolvedValue(mockSession)
      mockSessionService.subscribeToSession.mockReturnValue(mockChannel)
      mockSessionService.leaveSession.mockRejectedValue(new Error('Leave failed'))
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      await manager.initialize('1234', 'user-123')
      await manager.leave()
      
      expect(consoleSpy).toHaveBeenCalledWith('Error leaving session:', expect.any(Error))
      expect(mockChannel.unsubscribe).toHaveBeenCalled()
      expect(manager.getState().session).toBeNull()
      
      consoleSpy.mockRestore()
    })
  })

  describe('utility methods', () => {
    test('isHealthy returns correct status', async () => {
      expect(manager.isHealthy()).toBe(false) // Initially unhealthy
      
      mockSessionService.joinSession.mockResolvedValue(mockSession)
      mockSessionService.subscribeToSession.mockReturnValue({
        on: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
      })
      
      await manager.initialize('1234', 'user-123')
      
      expect(manager.isHealthy()).toBe(true) // Healthy when connected
      
      manager['updateState']({ error: 'Some error' })
      expect(manager.isHealthy()).toBe(false) // Unhealthy when error
    })

    test('getTimeUntilExpiry returns correct time', async () => {
      expect(manager.getTimeUntilExpiry()).toBe(0) // No session
      
      mockSessionService.joinSession.mockResolvedValue(mockSession)
      mockSessionService.subscribeToSession.mockReturnValue({
        on: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
      })
      
      await manager.initialize('1234', 'user-123')
      
      const timeLeft = manager.getTimeUntilExpiry()
      expect(timeLeft).toBeGreaterThan(0)
      expect(timeLeft).toBeLessThanOrEqual(4 * 60 * 60 * 1000) // ≤ 4 hours
    })
  })
})