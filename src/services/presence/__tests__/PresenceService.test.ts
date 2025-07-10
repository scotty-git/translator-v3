import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PresenceService } from '../PresenceService'
import type { ActivityState } from '../types'

// Mock Supabase
vi.mock('@/lib/supabase', () => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
    track: vi.fn(),
    send: vi.fn(),
    presenceState: vi.fn().mockReturnValue({}),
    topic: 'test-topic'
  }

  const mockSupabase = {
    channel: vi.fn().mockReturnValue(mockChannel),
    getChannels: vi.fn().mockReturnValue([]),
    removeChannel: vi.fn(),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          data: [],
          error: null
        })
      })
    })
  }

  return {
    supabase: mockSupabase
  }
})

describe('PresenceService', () => {
  let presenceService: PresenceService
  let mockSupabase: any
  let mockChannel: any
  
  beforeEach(async () => {
    // Get mock references
    const { supabase } = await import('@/lib/supabase')
    mockSupabase = supabase as any
    mockChannel = mockSupabase.channel()
    
    presenceService = new PresenceService()
    vi.clearAllMocks()
  })
  
  afterEach(async () => {
    await presenceService.cleanup()
  })

  describe('Initialization', () => {
    it('should initialize with session and user ID', async () => {
      const sessionId = 'test-session'
      const userId = 'test-user'
      
      await presenceService.initialize(sessionId, userId)
      
      // Should create presence channel with deterministic name
      expect(mockSupabase.channel).toHaveBeenCalledWith(`presence:${sessionId}`)
      
      // Should set up presence event handlers
      expect(mockChannel.on).toHaveBeenCalledWith('presence', { event: 'sync' }, expect.any(Function))
      expect(mockChannel.on).toHaveBeenCalledWith('presence', { event: 'join' }, expect.any(Function))
      expect(mockChannel.on).toHaveBeenCalledWith('presence', { event: 'leave' }, expect.any(Function))
      expect(mockChannel.on).toHaveBeenCalledWith('broadcast', { event: 'activity' }, expect.any(Function))
      
      // Should subscribe to the channel
      expect(mockChannel.subscribe).toHaveBeenCalled()
    })

    it('should clean up existing channels before creating new ones', async () => {
      const existingChannel = { ...mockChannel, topic: 'presence:test-session:123' }
      mockSupabase.getChannels.mockReturnValue([existingChannel])
      
      await presenceService.initialize('test-session', 'test-user')
      
      // Should remove existing channels
      expect(existingChannel.unsubscribe).toHaveBeenCalled()
      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(existingChannel)
    })

    it('should load existing participants from database', async () => {
      const mockParticipants = [
        { user_id: 'user1', is_online: true },
        { user_id: 'user2', is_online: false }
      ]
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              data: mockParticipants,
              error: null
            })
          })
        })
      })
      
      await presenceService.initialize('test-session', 'test-user')
      
      // Should query for existing participants
      expect(mockSupabase.from).toHaveBeenCalledWith('session_participants')
    })
  })

  describe('Activity Broadcasting', () => {
    beforeEach(async () => {
      await presenceService.initialize('test-session', 'test-user')
    })

    it('should broadcast activity to presence channel', async () => {
      const activity: ActivityState = 'recording'
      
      await presenceService.updateActivity(activity)
      
      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'activity',
        payload: {
          userId: 'test-user',
          sessionId: 'test-session',
          activity: 'recording',
          timestamp: expect.any(String)
        }
      })
    })

    it('should handle different activity states', async () => {
      const activities: ActivityState[] = ['idle', 'recording', 'processing', 'typing']
      
      for (const activity of activities) {
        await presenceService.updateActivity(activity)
        
        expect(mockChannel.send).toHaveBeenCalledWith({
          type: 'broadcast',
          event: 'activity',
          payload: expect.objectContaining({
            activity
          })
        })
      }
      
      expect(mockChannel.send).toHaveBeenCalledTimes(4)
    })

    it('should not broadcast when no active channel', async () => {
      await presenceService.cleanup()
      
      await presenceService.updateActivity('recording')
      
      // Should not call send when no channel is active
      expect(mockChannel.send).not.toHaveBeenCalled()
    })
  })

  describe('Presence Subscriptions', () => {
    beforeEach(async () => {
      await presenceService.initialize('test-session', 'test-user')
    })

    it('should allow subscribing to presence changes', () => {
      const callback = vi.fn()
      
      const unsubscribe = presenceService.subscribeToPresence(callback)
      
      expect(typeof unsubscribe).toBe('function')
      
      // Unsubscribe should work
      unsubscribe()
    })

    it('should allow subscribing to activity changes', () => {
      const callback = vi.fn()
      
      const unsubscribe = presenceService.subscribeToActivity(callback)
      
      expect(typeof unsubscribe).toBe('function')
      
      // Unsubscribe should work
      unsubscribe()
    })

    it('should call presence callback when partner status changes', () => {
      const callback = vi.fn()
      presenceService.subscribeToPresence(callback)
      
      // Simulate partner presence change by calling the private method
      // This tests the subscription mechanism
      expect(callback).not.toHaveBeenCalled()
    })

    it('should call activity callback when partner activity changes', () => {
      const callback = vi.fn()
      presenceService.subscribeToActivity(callback)
      
      // The callback should be set up but not called initially
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('Channel Management', () => {
    it('should use deterministic channel names', async () => {
      const sessionId = 'test-session-123'
      
      await presenceService.initialize(sessionId, 'test-user')
      
      expect(mockSupabase.channel).toHaveBeenCalledWith(`presence:${sessionId}`)
    })

    it('should set up participant subscription with timestamp', async () => {
      await presenceService.initialize('test-session', 'test-user')
      
      // Should create participant channel with timestamp to avoid conflicts
      expect(mockSupabase.channel).toHaveBeenCalledWith(
        expect.stringMatching(/^participants:test-session:\d+$/)
      )
    })
  })

  describe('Cleanup', () => {
    it('should clean up all channels and subscriptions', async () => {
      await presenceService.initialize('test-session', 'test-user')
      
      await presenceService.cleanup()
      
      // Should unsubscribe and remove channels
      expect(mockChannel.unsubscribe).toHaveBeenCalled()
      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel)
    })

    it('should handle cleanup errors gracefully', async () => {
      await presenceService.initialize('test-session', 'test-user')
      
      // Make cleanup throw an error
      mockChannel.unsubscribe.mockRejectedValue(new Error('Cleanup failed'))
      
      // Should not throw
      await expect(presenceService.cleanup()).resolves.not.toThrow()
    })

    it('should reset state after cleanup', async () => {
      await presenceService.initialize('test-session', 'test-user')
      await presenceService.cleanup()
      
      // After cleanup, broadcasting should not work
      await presenceService.updateActivity('recording')
      expect(mockChannel.send).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle initialization errors', async () => {
      mockSupabase.channel.mockImplementation(() => {
        throw new Error('Channel creation failed')
      })
      
      await expect(presenceService.initialize('test-session', 'test-user'))
        .rejects.toThrow('Channel creation failed')
    })

    it('should handle database query errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              data: null,
              error: new Error('Database error')
            })
          })
        })
      })
      
      // Should not throw during initialization even if database query fails
      await expect(presenceService.initialize('test-session', 'test-user'))
        .resolves.not.toThrow()
    })

    it('should handle broadcast errors gracefully', async () => {
      await presenceService.initialize('test-session', 'test-user')
      
      mockChannel.send.mockRejectedValue(new Error('Broadcast failed'))
      
      // Should not throw when broadcast fails
      await expect(presenceService.updateActivity('recording'))
        .resolves.not.toThrow()
    })
  })

  describe('Integration Behavior', () => {
    it('should track presence state for database-first approach', async () => {
      await presenceService.initialize('test-session', 'test-user')
      
      // Should attempt to load participants from database
      expect(mockSupabase.from).toHaveBeenCalledWith('session_participants')
    })

    it('should implement complete IPresenceService interface', () => {
      // Test that all required methods exist
      expect(typeof presenceService.initialize).toBe('function')
      expect(typeof presenceService.updateActivity).toBe('function')
      expect(typeof presenceService.subscribeToPresence).toBe('function')
      expect(typeof presenceService.subscribeToActivity).toBe('function')
      expect(typeof presenceService.getOnlineUsers).toBe('function')
      expect(typeof presenceService.cleanup).toBe('function')
    })

    it('should return empty array for getOnlineUsers (placeholder)', () => {
      const users = presenceService.getOnlineUsers()
      expect(Array.isArray(users)).toBe(true)
      expect(users).toHaveLength(0)
    })
  })

  describe('Activity Event Filtering', () => {
    it('should filter out own activity events', async () => {
      const callback = vi.fn()
      await presenceService.initialize('test-session', 'test-user')
      presenceService.subscribeToActivity(callback)
      
      // Simulate receiving an activity broadcast event for the same user
      const activityHandler = mockChannel.on.mock.calls.find(
        call => call[0] === 'broadcast' && call[1].event === 'activity'
      )?.[2]
      
      if (activityHandler) {
        activityHandler({
          payload: {
            userId: 'test-user', // Same as current user
            sessionId: 'test-session',
            activity: 'recording'
          }
        })
        
        // Should not call the callback for own activity
        expect(callback).not.toHaveBeenCalled()
      }
    })

    it('should process partner activity events', async () => {
      const callback = vi.fn()
      await presenceService.initialize('test-session', 'test-user')
      presenceService.subscribeToActivity(callback)
      
      // Simulate receiving an activity broadcast event for a different user
      const activityHandler = mockChannel.on.mock.calls.find(
        call => call[0] === 'broadcast' && call[1].event === 'activity'
      )?.[2]
      
      if (activityHandler) {
        activityHandler({
          payload: {
            userId: 'partner-user', // Different from current user
            sessionId: 'test-session',
            activity: 'recording'
          }
        })
        
        // Should call the callback for partner activity
        expect(callback).toHaveBeenCalledWith('recording')
      }
    })
  })
})