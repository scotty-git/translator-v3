import { test, expect } from '@playwright/test'
import { MessageSyncService } from '@/services/MessageSyncService'
import { supabase } from '@/lib/supabase'
import { RealtimeConnection } from '@/services/realtime'

test.describe('Phase 2: Sync Service Validation', () => {
  let syncService: MessageSyncService
  let realtimeConnection: RealtimeConnection
  let testMessageId: string
  let testSessionId: string
  let testUserId: string
  
  test.beforeEach(async () => {
    testSessionId = `test-session-${Date.now()}`
    testUserId = `test-user-${Date.now()}`
    
    // Create test message
    const { data, error } = await supabase
      .from('messages')
      .insert({
        session_id: testSessionId,
        sender_id: testUserId,
        original_text: 'Test message',
        translated_text: 'Mensaje de prueba',
        original_language: 'en',
        timestamp: new Date().toISOString(),
        is_delivered: true,
        sequence_number: 1
      })
      .select()
      .single()
    
    if (error) {
      console.error('Failed to create test message:', error)
      throw error
    }
    
    testMessageId = data.id
    
    // Initialize services
    realtimeConnection = new RealtimeConnection()
    await realtimeConnection.initialize({
      sessionId: testSessionId,
      userId: testUserId,
      events: {}
    })
    
    syncService = new MessageSyncService()
    await syncService.initializeSession(testSessionId, testUserId, realtimeConnection)
  })
  
  test.afterEach(async () => {
    // Cleanup
    if (testMessageId) {
      await supabase.from('message_reactions').delete().eq('message_id', testMessageId)
      await supabase.from('messages').delete().eq('id', testMessageId)
    }
    
    await syncService.cleanup()
    await realtimeConnection.cleanup()
  })
  
  test('can add and sync reactions', async () => {
    await syncService.addReaction(testMessageId, '👍', testUserId)
    
    // Wait a bit for database operation
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const { data } = await supabase
      .from('message_reactions')
      .select()
      .eq('message_id', testMessageId)
    
    expect(data).toHaveLength(1)
    expect(data![0].emoji).toBe('👍')
    expect(data![0].user_id).toBe(testUserId)
  })
  
  test('can remove reactions', async () => {
    // First add a reaction
    await syncService.addReaction(testMessageId, '❤️', testUserId)
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Then remove it
    await syncService.removeReaction(testMessageId, '❤️', testUserId)
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const { data } = await supabase
      .from('message_reactions')
      .select()
      .eq('message_id', testMessageId)
      .eq('emoji', '❤️')
    
    expect(data).toHaveLength(0)
  })
  
  test('can edit messages', async () => {
    await syncService.editMessage(testMessageId, 'Edited text')
    
    // Wait a bit for database operation
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const { data } = await supabase
      .from('messages')
      .select()
      .eq('id', testMessageId)
      .single()
    
    expect(data.original_text).toBe('Edited text')
    expect(data.is_edited).toBe(true)
    expect(data.edited_at).toBeTruthy()
    expect(data.translated_text).toBeNull() // Should be cleared for re-translation
  })
  
  test('can soft delete messages', async () => {
    await syncService.deleteMessage(testMessageId)
    
    // Wait a bit for database operation
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const { data } = await supabase
      .from('messages')
      .select()
      .eq('id', testMessageId)
      .single()
    
    expect(data.is_deleted).toBe(true)
    expect(data.deleted_at).toBeTruthy()
    expect(data.original_text).toBe('') // Should be cleared
    expect(data.translated_text).toBe('') // Should be cleared
  })
  
  test('offline queue handles new operations', async () => {
    // Mock offline state
    const mockGetStatus = vi.spyOn(syncService, 'getConnectionStatus')
    mockGetStatus.mockReturnValue('disconnected')
    
    // Queue a reaction while offline
    await syncService.addReaction(testMessageId, '🎉', testUserId)
    
    // Should not be in database yet
    const { data: beforeData } = await supabase
      .from('message_reactions')
      .select()
      .eq('message_id', testMessageId)
      .eq('emoji', '🎉')
    
    expect(beforeData).toHaveLength(0)
    
    // Restore online state and process queue
    mockGetStatus.mockReturnValue('connected')
    await syncService['processSyncQueue']()
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Should now be in database
    const { data: afterData } = await supabase
      .from('message_reactions')
      .select()
      .eq('message_id', testMessageId)
      .eq('emoji', '🎉')
    
    expect(afterData).toHaveLength(1)
    
    mockGetStatus.mockRestore()
  })
  
  test('loads message history with reactions', async () => {
    // Add some reactions to the test message
    await supabase.from('message_reactions').insert([
      { message_id: testMessageId, user_id: 'user-1', emoji: '👍' },
      { message_id: testMessageId, user_id: 'user-2', emoji: '👍' },
      { message_id: testMessageId, user_id: 'user-3', emoji: '❤️' }
    ])
    
    // Create a new sync service instance
    const newSyncService = new MessageSyncService()
    const messagesLoaded: any[] = []
    
    newSyncService.setEventHandlers({
      onMessageReceived: (message) => {
        messagesLoaded.push(message)
      }
    })
    
    // Initialize to trigger message history load
    await newSyncService.initializeSession(testSessionId, 'new-user', realtimeConnection)
    
    // Wait for history to load
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Check that reactions were loaded
    expect(messagesLoaded).toHaveLength(1)
    const loadedMessage = messagesLoaded[0]
    
    expect(loadedMessage.reactions).toBeDefined()
    expect(loadedMessage.reactions['👍']).toBeDefined()
    expect(loadedMessage.reactions['👍'].count).toBe(2)
    expect(loadedMessage.reactions['👍'].users).toHaveLength(2)
    expect(loadedMessage.reactions['❤️']).toBeDefined()
    expect(loadedMessage.reactions['❤️'].count).toBe(1)
    
    await newSyncService.cleanup()
  })
})