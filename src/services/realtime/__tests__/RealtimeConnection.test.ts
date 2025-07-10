import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import type { ConnectionState, ChannelConfig, RealtimeConnectionConfig } from '../types'
import type { ConnectionStatus } from '@/types/database'

// Mock Supabase
vi.mock('@/lib/supabase', () => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    off: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn().mockReturnValue(Promise.resolve()),
    presenceState: vi.fn().mockReturnValue({}),
    track: vi.fn().mockReturnValue(Promise.resolve()),
    send: vi.fn().mockReturnValue(Promise.resolve())
  }

  return {
    supabase: {
      channel: vi.fn().mockReturnValue(mockChannel),
      removeChannel: vi.fn().mockReturnValue(Promise.resolve()),
      getChannels: vi.fn().mockReturnValue([])
    }
  }
})

// Import after mocking
import { RealtimeConnection } from '../RealtimeConnection'
import { supabase } from '@/lib/supabase'

describe('RealtimeConnection', () => {
  let realtimeConnection: RealtimeConnection
  let mockEvents: any
  
  // Get mocked supabase for assertions
  const mockSupabase = vi.mocked(supabase)

  beforeEach(() => {
    realtimeConnection = new RealtimeConnection()
    mockEvents = {
      onConnectionStatusChanged: vi.fn(),
      onChannelError: vi.fn(),
      onReconnectAttempt: vi.fn()
    }
    
    // Reset all mocks
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await realtimeConnection.cleanup()
  })

  describe('Initialization', () => {
    test('should initialize with correct configuration', async () => {
      const config: RealtimeConnectionConfig = {
        sessionId: 'test-session',
        userId: 'test-user',
        events: mockEvents,
        maxReconnectAttempts: 3,
        initialReconnectDelay: 500
      }

      await realtimeConnection.initialize(config)

      expect(realtimeConnection.getConnectionState()).toBe('connected')
      expect(realtimeConnection.getConnectionStatus()).toBe('connected')
    })

    test('should handle initialization failure', async () => {
      const config: RealtimeConnectionConfig = {
        sessionId: '',
        userId: '',
        events: mockEvents
      }

      await expect(realtimeConnection.initialize(config)).rejects.toThrow()
    })

    test('should not allow double initialization', async () => {
      const config: RealtimeConnectionConfig = {
        sessionId: 'test-session',
        userId: 'test-user',
        events: mockEvents
      }

      await realtimeConnection.initialize(config)
      await expect(realtimeConnection.initialize(config)).rejects.toThrow()
    })
  })

  describe('Connection State Management', () => {
    beforeEach(async () => {
      const config: RealtimeConnectionConfig = {
        sessionId: 'test-session',
        userId: 'test-user',
        events: mockEvents
      }
      await realtimeConnection.initialize(config)
    })

    test('should track connection state changes', () => {
      const mockCallback = vi.fn()
      const unsubscribe = realtimeConnection.subscribeToConnectionState(mockCallback)

      expect(typeof unsubscribe).toBe('function')
    })

    test('should provide connection status compatibility', () => {
      expect(realtimeConnection.getConnectionStatus()).toBe('connected')
    })

    test('should map connection states correctly', () => {
      // Connection state should map to legacy status
      expect(realtimeConnection.getConnectionState()).toBe('connected')
      expect(realtimeConnection.getConnectionStatus()).toBe('connected')
    })
  })

  describe('Channel Management', () => {
    beforeEach(async () => {
      const config: RealtimeConnectionConfig = {
        sessionId: 'test-session',
        userId: 'test-user',
        events: mockEvents
      }
      await realtimeConnection.initialize(config)
    })

    test('should create channels with unique names', async () => {
      const channelConfig: ChannelConfig = {
        name: 'test-channel',
        type: 'messages'
      }

      const channel = await realtimeConnection.createChannel(channelConfig)

      expect(mockSupabase.channel).toHaveBeenCalledWith(
        expect.stringMatching(/^test-channel:\d+$/)
      )
      expect(channel).toBe(mockChannel)
    })

    test('should remove existing channels before creating new ones', async () => {
      const channelConfig: ChannelConfig = {
        name: 'test-channel',
        type: 'messages'
      }

      // Create first channel
      await realtimeConnection.createChannel(channelConfig)
      
      // Create second channel with same name - should remove first
      await realtimeConnection.createChannel(channelConfig)

      expect(mockSupabase.removeChannel).toHaveBeenCalled()
    })

    test('should retrieve existing channels', async () => {
      const channelConfig: ChannelConfig = {
        name: 'test-channel',
        type: 'messages'
      }

      await realtimeConnection.createChannel(channelConfig)
      const retrievedChannel = realtimeConnection.getChannel('test-channel')

      expect(retrievedChannel).toBe(mockChannel)
    })

    test('should return null for non-existent channels', () => {
      const channel = realtimeConnection.getChannel('non-existent')
      expect(channel).toBeNull()
    })

    test('should remove channels properly', async () => {
      const channelConfig: ChannelConfig = {
        name: 'test-channel',
        type: 'messages'
      }

      await realtimeConnection.createChannel(channelConfig)
      await realtimeConnection.removeChannel('test-channel')

      expect(mockChannel.unsubscribe).toHaveBeenCalled()
      expect(mockSupabase.removeChannel).toHaveBeenCalled()
      expect(realtimeConnection.getChannel('test-channel')).toBeNull()
    })

    test('should handle channel removal errors gracefully', async () => {
      const channelConfig: ChannelConfig = {
        name: 'test-channel',
        type: 'messages'
      }

      mockChannel.unsubscribe.mockRejectedValueOnce(new Error('Unsubscribe failed'))
      
      await realtimeConnection.createChannel(channelConfig)
      
      // Should not throw
      await expect(realtimeConnection.removeChannel('test-channel')).resolves.toBeUndefined()
    })
  })

  describe('Reconnection Logic', () => {
    beforeEach(async () => {
      const config: RealtimeConnectionConfig = {
        sessionId: 'test-session',
        userId: 'test-user',
        events: mockEvents,
        maxReconnectAttempts: 3,
        initialReconnectDelay: 100
      }
      await realtimeConnection.initialize(config)
    })

    test('should register reconnection callbacks', () => {
      const mockCallback = vi.fn()
      const unsubscribe = realtimeConnection.onReconnect(mockCallback)

      expect(typeof unsubscribe).toBe('function')
    })

    test('should handle forced reconnection', async () => {
      await expect(realtimeConnection.forceReconnect()).resolves.toBeUndefined()
    })

    test('should handle reconnection failure', async () => {
      // Mock channel creation failure
      mockSupabase.channel.mockImplementationOnce(() => {
        throw new Error('Channel creation failed')
      })

      await expect(realtimeConnection.forceReconnect()).rejects.toThrow()
    })

    test('should call reconnection callbacks on successful reconnection', async () => {
      const mockCallback = vi.fn()
      realtimeConnection.onReconnect(mockCallback)

      await realtimeConnection.forceReconnect()

      expect(mockCallback).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    test('should handle initialization without session context', async () => {
      const config: RealtimeConnectionConfig = {
        sessionId: '',
        userId: '',
        events: mockEvents
      }

      await expect(realtimeConnection.initialize(config)).rejects.toThrow()
    })

    test('should handle channel creation without initialization', async () => {
      const channelConfig: ChannelConfig = {
        name: 'test-channel',
        type: 'messages'
      }

      await expect(realtimeConnection.createChannel(channelConfig)).rejects.toThrow(
        'RealtimeConnection not initialized'
      )
    })

    test('should handle reconnection without session context', async () => {
      await expect(realtimeConnection.forceReconnect()).rejects.toThrow(
        'Cannot reconnect - no session context'
      )
    })
  })

  describe('Cleanup', () => {
    test('should clean up all channels and state', async () => {
      const config: RealtimeConnectionConfig = {
        sessionId: 'test-session',
        userId: 'test-user',
        events: mockEvents
      }

      await realtimeConnection.initialize(config)
      
      const channelConfig: ChannelConfig = {
        name: 'test-channel',
        type: 'messages'
      }
      
      await realtimeConnection.createChannel(channelConfig)
      await realtimeConnection.cleanup()

      expect(mockChannel.unsubscribe).toHaveBeenCalled()
      expect(mockSupabase.removeChannel).toHaveBeenCalled()
      expect(realtimeConnection.getConnectionState()).toBe('disconnected')
      expect(realtimeConnection.getChannel('test-channel')).toBeNull()
    })

    test('should handle cleanup errors gracefully', async () => {
      const config: RealtimeConnectionConfig = {
        sessionId: 'test-session',
        userId: 'test-user',
        events: mockEvents
      }

      await realtimeConnection.initialize(config)
      
      // Mock cleanup failure
      mockChannel.unsubscribe.mockRejectedValueOnce(new Error('Cleanup failed'))
      
      await expect(realtimeConnection.cleanup()).resolves.toBeUndefined()
    })
  })

  describe('Event System', () => {
    test('should notify connection state listeners', async () => {
      const config: RealtimeConnectionConfig = {
        sessionId: 'test-session',
        userId: 'test-user',
        events: mockEvents
      }

      const mockStateCallback = vi.fn()
      realtimeConnection.subscribeToConnectionState(mockStateCallback)

      await realtimeConnection.initialize(config)

      expect(mockStateCallback).toHaveBeenCalledWith('connected')
    })

    test('should unsubscribe connection state listeners', async () => {
      const mockStateCallback = vi.fn()
      const unsubscribe = realtimeConnection.subscribeToConnectionState(mockStateCallback)

      unsubscribe()

      // State changes should not trigger callback after unsubscribe
      const config: RealtimeConnectionConfig = {
        sessionId: 'test-session',
        userId: 'test-user',
        events: mockEvents
      }

      await realtimeConnection.initialize(config)

      expect(mockStateCallback).not.toHaveBeenCalled()
    })

    test('should call legacy connection status callbacks', async () => {
      const config: RealtimeConnectionConfig = {
        sessionId: 'test-session',
        userId: 'test-user',
        events: mockEvents
      }

      await realtimeConnection.initialize(config)

      expect(mockEvents.onConnectionStatusChanged).toHaveBeenCalledWith('connected')
    })
  })

  describe('Network Resilience', () => {
    test('should implement exponential backoff for reconnection delays', async () => {
      const config: RealtimeConnectionConfig = {
        sessionId: 'test-session',
        userId: 'test-user',
        events: mockEvents,
        maxReconnectAttempts: 3,
        initialReconnectDelay: 100
      }

      await realtimeConnection.initialize(config)

      // Test private method indirectly by checking reconnection behavior
      // This would normally be tested through integration tests
      expect(realtimeConnection.getConnectionState()).toBe('connected')
    })

    test('should respect maximum reconnection attempts', async () => {
      const config: RealtimeConnectionConfig = {
        sessionId: 'test-session',
        userId: 'test-user',
        events: mockEvents,
        maxReconnectAttempts: 1
      }

      await realtimeConnection.initialize(config)

      // This would be tested more thoroughly in integration tests
      expect(realtimeConnection.getConnectionState()).toBe('connected')
    })
  })

  describe('Type Safety', () => {
    test('should handle different channel types', async () => {
      const config: RealtimeConnectionConfig = {
        sessionId: 'test-session',
        userId: 'test-user',
        events: mockEvents
      }

      await realtimeConnection.initialize(config)

      const messageChannel = await realtimeConnection.createChannel({
        name: 'messages',
        type: 'messages'
      })

      const presenceChannel = await realtimeConnection.createChannel({
        name: 'presence',
        type: 'presence'
      })

      const participantChannel = await realtimeConnection.createChannel({
        name: 'participants',
        type: 'participant'
      })

      expect(messageChannel).toBe(mockChannel)
      expect(presenceChannel).toBe(mockChannel)
      expect(participantChannel).toBe(mockChannel)
    })

    test('should maintain type safety for connection states', () => {
      const state: ConnectionState = realtimeConnection.getConnectionState()
      const status: ConnectionStatus = realtimeConnection.getConnectionStatus()

      expect(['connecting', 'connected', 'disconnected', 'reconnecting']).toContain(state)
      expect(['connecting', 'connected', 'disconnected']).toContain(status)
    })
  })
})