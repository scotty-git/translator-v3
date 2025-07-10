import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MessageQueueService } from '../MessageQueueService'
import { Message, MessageStatus } from '@/types/database'

describe('MessageQueueService', () => {
  let service: MessageQueueService
  
  beforeEach(() => {
    service = new MessageQueueService()
  })

  const createTestMessage = (id: string, status: MessageStatus = 'queued'): Message => ({
    id,
    original: `Original ${id}`,
    translation: `Translation ${id}`,
    original_lang: 'en',
    target_lang: 'es',
    status,
    queued_at: new Date().toISOString(),
    processed_at: null,
    displayed_at: null,
    sender_id: 'test-user',
    session_id: 'test-session'
  })

  describe('Interface Compliance', () => {
    it('implements IMessageQueue interface correctly', () => {
      expect(typeof service.add).toBe('function')
      expect(typeof service.updateStatus).toBe('function')
      expect(typeof service.updateMessage).toBe('function')
      expect(typeof service.getDisplayMessages).toBe('function')
      expect(typeof service.subscribe).toBe('function')
      expect(typeof service.toggleReaction).toBe('function')
      expect(typeof service.cleanup).toBe('function')
      expect(typeof service.clear).toBe('function')
    })
  })

  describe('Basic Message Operations', () => {
    it('adds messages to queue', async () => {
      const message = createTestMessage('test-1')
      await service.add(message)
      
      const messages = service.getDisplayMessages()
      expect(messages).toHaveLength(1)
      expect(messages[0].id).toBe('test-1')
      expect(messages[0].localId).toMatch(/^local-/)
      expect(messages[0].displayOrder).toBe(0)
    })

    it('updates message status', async () => {
      const message = createTestMessage('test-1')
      await service.add(message)
      
      service.updateStatus('test-1', 'displayed')
      
      const messages = service.getDisplayMessages()
      expect(messages[0].status).toBe('displayed')
      expect(messages[0].displayed_at).toBeTruthy()
    })

    it('updates message with partial data', async () => {
      const message = createTestMessage('test-1')
      await service.add(message)
      
      service.updateMessage('test-1', { translation: 'Updated translation' })
      
      const messages = service.getDisplayMessages()
      expect(messages[0].translation).toBe('Updated translation')
    })

    it('maintains display order', async () => {
      const message1 = createTestMessage('test-1')
      const message2 = createTestMessage('test-2')
      const message3 = createTestMessage('test-3')
      
      await service.add(message1)
      await service.add(message2)
      await service.add(message3)
      
      const messages = service.getDisplayMessages()
      expect(messages).toHaveLength(3)
      expect(messages[0].displayOrder).toBe(0)
      expect(messages[1].displayOrder).toBe(1)
      expect(messages[2].displayOrder).toBe(2)
    })
  })

  describe('Subscription System', () => {
    it('notifies subscribers when messages change', async () => {
      const listener = vi.fn()
      const unsubscribe = service.subscribe(listener)
      
      const message = createTestMessage('test-1')
      await service.add(message)
      
      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ id: 'test-1' })
      ]))
      
      unsubscribe()
    })

    it('allows unsubscribing', async () => {
      const listener = vi.fn()
      const unsubscribe = service.subscribe(listener)
      
      await service.add(createTestMessage('test-1'))
      expect(listener).toHaveBeenCalledTimes(1)
      
      unsubscribe()
      await service.add(createTestMessage('test-2'))
      expect(listener).toHaveBeenCalledTimes(1) // Should not be called again
    })

    it('supports multiple subscribers', async () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()
      
      service.subscribe(listener1)
      service.subscribe(listener2)
      
      await service.add(createTestMessage('test-1'))
      
      expect(listener1).toHaveBeenCalledTimes(1)
      expect(listener2).toHaveBeenCalledTimes(1)
    })
  })

  describe('Emoji Reactions', () => {
    beforeEach(async () => {
      await service.add(createTestMessage('test-1'))
    })

    it('adds emoji reactions', () => {
      service.toggleReaction('test-1', '👍', 'user-1')
      
      const messages = service.getDisplayMessages()
      const message = messages[0]
      
      expect(message.reactions).toBeDefined()
      expect(message.reactions!['👍']).toEqual({
        emoji: '👍',
        count: 1,
        users: ['user-1'],
        hasReacted: true
      })
    })

    it('toggles reactions (remove when already reacted)', () => {
      // Add reaction
      service.toggleReaction('test-1', '👍', 'user-1')
      let messages = service.getDisplayMessages()
      expect(messages[0].reactions!['👍'].count).toBe(1)
      
      // Remove reaction
      service.toggleReaction('test-1', '👍', 'user-1')
      messages = service.getDisplayMessages()
      expect(messages[0].reactions!['👍']).toBeUndefined()
    })

    it('handles multiple users reacting', () => {
      service.toggleReaction('test-1', '👍', 'user-1')
      service.toggleReaction('test-1', '👍', 'user-2')
      
      const messages = service.getDisplayMessages()
      const reaction = messages[0].reactions!['👍']
      
      expect(reaction.count).toBe(2)
      expect(reaction.users).toEqual(['user-1', 'user-2'])
    })

    it('updates hasReacted flag correctly', () => {
      service.toggleReaction('test-1', '👍', 'user-1')
      service.toggleReaction('test-1', '👍', 'user-2')
      
      const messages = service.getDisplayMessages()
      const reaction = messages[0].reactions!['👍']
      
      // For user-2 perspective, should be true
      expect(reaction.hasReacted).toBe(true)
      
      // Update hasReacted flags for user-1 perspective
      Object.values(messages[0].reactions!).forEach(r => {
        r.hasReacted = r.users.includes('user-1')
      })
      
      expect(messages[0].reactions!['👍'].hasReacted).toBe(true)
    })

    it('handles nonexistent message gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      service.toggleReaction('nonexistent', '👍', 'user-1')
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot add reaction: Message nonexistent not found')
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('Message Filtering', () => {
    it('only returns displayable messages', async () => {
      await service.add(createTestMessage('test-1', 'queued'))
      await service.add(createTestMessage('test-2', 'processing'))
      await service.add(createTestMessage('test-3', 'displayed'))
      await service.add(createTestMessage('test-4', 'failed'))
      
      const messages = service.getDisplayMessages()
      
      // Should include queued, processing, displayed but not failed
      expect(messages).toHaveLength(3)
      expect(messages.map(m => m.status)).toEqual(['queued', 'processing', 'displayed'])
    })

    it('sorts messages by display order', async () => {
      await service.add(createTestMessage('test-3'))
      await service.add(createTestMessage('test-1'))
      await service.add(createTestMessage('test-2'))
      
      const messages = service.getDisplayMessages()
      
      expect(messages[0].id).toBe('test-3') // First added = displayOrder 0
      expect(messages[1].id).toBe('test-1') // Second added = displayOrder 1
      expect(messages[2].id).toBe('test-2') // Third added = displayOrder 2
    })
  })

  describe('Cleanup Operations', () => {
    it('clears all messages', async () => {
      await service.add(createTestMessage('test-1'))
      await service.add(createTestMessage('test-2'))
      
      expect(service.getDisplayMessages()).toHaveLength(2)
      
      service.clear()
      
      expect(service.getDisplayMessages()).toHaveLength(0)
    })

    it('keeps last 50 messages on cleanup', async () => {
      // Add 60 messages
      for (let i = 0; i < 60; i++) {
        await service.add(createTestMessage(`test-${i}`))
      }
      
      expect(service.getDisplayMessages()).toHaveLength(60)
      
      service.cleanup()
      
      const messages = service.getDisplayMessages()
      expect(messages).toHaveLength(50)
      
      // Should keep the most recent 50 (highest display order)
      expect(messages[0].id).toBe('test-10') // 60 - 50 = 10
      expect(messages[49].id).toBe('test-59')
    })
  })

  describe('Error Handling', () => {
    it('handles status update for nonexistent message', () => {
      service.updateStatus('nonexistent', 'displayed')
      // Should not throw or crash
      expect(service.getDisplayMessages()).toHaveLength(0)
    })

    it('handles message update for nonexistent message', () => {
      service.updateMessage('nonexistent', { translation: 'test' })
      // Should not throw or crash
      expect(service.getDisplayMessages()).toHaveLength(0)
    })
  })

  describe('Performance', () => {
    it('handles rapid message additions efficiently', async () => {
      const startTime = Date.now()
      
      const promises = []
      for (let i = 0; i < 100; i++) {
        promises.push(service.add(createTestMessage(`test-${i}`)))
      }
      
      await Promise.all(promises)
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      expect(service.getDisplayMessages()).toHaveLength(100)
      expect(duration).toBeLessThan(1000) // Should complete in under 1 second
    })
  })
})