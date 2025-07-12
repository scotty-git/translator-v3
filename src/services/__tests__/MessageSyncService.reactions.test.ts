import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MessageSyncService } from '../MessageSyncService'
import { RealtimeConnection } from '../realtime'
import { supabase } from '@/lib/supabase'
import type { DatabaseReaction } from '@/types/database'

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn()
  }
}))

// Mock RealtimeConnection
vi.mock('../realtime')

describe('MessageSyncService - Reactions', () => {
  let messageSyncService: MessageSyncService
  let mockRealtimeConnection: any
  let mockChannel: any
  
  beforeEach(() => {
    // Setup mocks
    mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockImplementation((callback) => {
        if (callback) callback('SUBSCRIBED')
        return mockChannel
      }),
      unsubscribe: vi.fn(),
      send: vi.fn()
    }
    
    mockRealtimeConnection = {
      createChannel: vi.fn().mockResolvedValue(mockChannel),
      removeChannel: vi.fn().mockResolvedValue(undefined),
      getConnectionStatus: vi.fn().mockReturnValue('connected')
    }
    
    // Create instance
    messageSyncService = new MessageSyncService()
    messageSyncService['realtimeConnection'] = mockRealtimeConnection
  })
  
  afterEach(() => {
    vi.clearAllMocks()
  })
  
  describe('addReaction', () => {
    it('should add reaction when connected', async () => {
      const mockInsert = vi.fn().mockReturnValue({ error: null })
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      } as any)
      
      await messageSyncService.addReaction('msg-123', '👍', 'user-123')
      
      expect(supabase.from).toHaveBeenCalledWith('message_reactions')
      expect(mockInsert).toHaveBeenCalledWith({
        message_id: 'msg-123',
        user_id: 'user-123',
        emoji: '👍'
      })
    })
    
    it('should queue reaction when offline', async () => {
      mockRealtimeConnection.getConnectionStatus.mockReturnValue('disconnected')
      
      await messageSyncService.addReaction('msg-123', '❤️', 'user-456')
      
      // Check that it was queued
      const syncQueue = messageSyncService['syncQueue']
      expect(syncQueue.size).toBe(1)
      
      const queuedOp = Array.from(syncQueue.values())[0]
      expect(queuedOp.operation.type).toBe('add_reaction')
      expect(queuedOp.operation).toMatchObject({
        messageId: 'msg-123',
        emoji: '❤️',
        userId: 'user-456'
      })
    })
    
    it('should queue reaction on error', async () => {
      const mockInsert = vi.fn().mockReturnValue({ error: new Error('Database error') })
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      } as any)
      
      await messageSyncService.addReaction('msg-123', '😂', 'user-789')
      
      // Should be queued due to error
      const syncQueue = messageSyncService['syncQueue']
      expect(syncQueue.size).toBe(1)
    })
  })
  
  describe('removeReaction', () => {
    it('should remove reaction when connected', async () => {
      const mockEq = vi.fn()
      mockEq.mockReturnValue({ 
        eq: mockEq
      })
      
      const mockDelete = vi.fn().mockReturnValue({
        eq: mockEq
      })
      
      vi.mocked(supabase.from).mockReturnValue({
        delete: mockDelete
      } as any)
      
      await messageSyncService.removeReaction('msg-123', '👍', 'user-123')
      
      expect(supabase.from).toHaveBeenCalledWith('message_reactions')
      expect(mockDelete).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('message_id', 'msg-123')
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123')
      expect(mockEq).toHaveBeenCalledWith('emoji', '👍')
    })
  })
  
  describe('editMessage', () => {
    it('should edit message and trigger re-translation', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { original_text: 'Old text' },
            error: null
          })
        })
      })
      
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })
      
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'messages') {
          return {
            select: mockSelect,
            update: mockUpdate
          } as any
        }
        return {} as any
      })
      
      const onMessageEdited = vi.fn()
      const onReTranslationNeeded = vi.fn()
      
      messageSyncService.setEventHandlers({
        onMessageEdited,
        onReTranslationNeeded
      })
      
      await messageSyncService.editMessage('msg-123', 'New text')
      
      expect(mockUpdate).toHaveBeenCalledWith({
        original_text: 'New text',
        is_edited: true,
        edited_at: expect.any(String),
        translated_text: null
      })
      
      expect(onMessageEdited).toHaveBeenCalledWith('msg-123', 'New text')
      expect(onReTranslationNeeded).toHaveBeenCalledWith('msg-123', 'New text')
    })
  })
  
  describe('deleteMessage', () => {
    it('should soft delete message and remove reactions', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })
      
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })
      
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'messages') {
          return { update: mockUpdate } as any
        }
        if (table === 'message_reactions') {
          return { delete: mockDelete } as any
        }
        return {} as any
      })
      
      const onMessageDeleted = vi.fn()
      messageSyncService.setEventHandlers({ onMessageDeleted })
      
      await messageSyncService.deleteMessage('msg-123')
      
      expect(mockUpdate).toHaveBeenCalledWith({
        is_deleted: true,
        deleted_at: expect.any(String),
        original_text: '',
        translated_text: ''
      })
      
      expect(mockDelete).toHaveBeenCalled()
      expect(onMessageDeleted).toHaveBeenCalledWith('msg-123')
    })
  })
  
  describe('reaction subscriptions', () => {
    it('should handle reaction INSERT events', async () => {
      // Mock supabase select for loadMessageHistory
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        })
      } as any)
      
      const onReactionAdded = vi.fn()
      messageSyncService.setEventHandlers({ onReactionAdded })
      
      // Initialize session to set up subscriptions
      await messageSyncService.initializeSession('session-123', 'user-123', mockRealtimeConnection)
      
      // Find the INSERT handler - look for reaction table subscription
      const insertCall = mockChannel.on.mock.calls.find(
        call => call[0] === 'postgres_changes' && 
        call[1].event === 'INSERT' &&
        call[1].table === 'message_reactions'
      )
      
      expect(insertCall).toBeDefined()
      
      // Simulate reaction INSERT event
      const mockReaction: DatabaseReaction = {
        id: 'react-123',
        message_id: 'msg-123',
        user_id: 'user-456',
        emoji: '👍',
        created_at: new Date().toISOString()
      }
      
      const handler = insertCall![2]
      handler({ new: mockReaction })
      
      expect(onReactionAdded).toHaveBeenCalledWith(mockReaction)
    })
    
    it('should handle reaction DELETE events', async () => {
      // Mock supabase select for loadMessageHistory
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        })
      } as any)
      
      const onReactionRemoved = vi.fn()
      messageSyncService.setEventHandlers({ onReactionRemoved })
      
      // Initialize session to set up subscriptions
      await messageSyncService.initializeSession('session-123', 'user-123', mockRealtimeConnection)
      
      // Find the DELETE handler
      const deleteCall = mockChannel.on.mock.calls.find(
        call => call[0] === 'postgres_changes' && 
        call[1].event === 'DELETE' && 
        call[1].table === 'message_reactions'
      )
      
      expect(deleteCall).toBeDefined()
      
      // Simulate reaction DELETE event
      const mockReaction: DatabaseReaction = {
        id: 'react-123',
        message_id: 'msg-123',
        user_id: 'user-456',
        emoji: '👍',
        created_at: new Date().toISOString()
      }
      
      const handler = deleteCall![2]
      handler({ old: mockReaction })
      
      expect(onReactionRemoved).toHaveBeenCalledWith(mockReaction)
    })
  })
  
  describe('sync queue processing', () => {
    it('should process queued operations on reconnect', async () => {
      // Start disconnected
      mockRealtimeConnection.getConnectionStatus.mockReturnValue('disconnected')
      
      // Queue some operations
      await messageSyncService.addReaction('msg-1', '👍', 'user-1')
      await messageSyncService.addReaction('msg-2', '❤️', 'user-2')
      
      expect(messageSyncService['syncQueue'].size).toBe(2)
      
      // Mock successful database operations
      const mockInsert = vi.fn().mockResolvedValue({ error: null })
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      } as any)
      
      // Simulate reconnection
      mockRealtimeConnection.getConnectionStatus.mockReturnValue('connected')
      await messageSyncService['processSyncQueue']()
      
      // Both operations should be processed
      expect(mockInsert).toHaveBeenCalledTimes(2)
      expect(messageSyncService['syncQueue'].size).toBe(0)
    })
  })
})