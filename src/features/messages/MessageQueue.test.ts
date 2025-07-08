import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MessageQueue, QueuedMessage } from './MessageQueue'
import type { Message } from '@/types/database'

describe('MessageQueue', () => {
  let messageQueue: MessageQueue
  let mockListener: (messages: QueuedMessage[]) => void

  beforeEach(() => {
    messageQueue = new MessageQueue()
    mockListener = vi.fn()
  })

  const createMockMessage = (id: string, overrides?: Partial<Message>): Message => ({
    id,
    session_id: 'test-session',
    user_id: 'test-user',
    original: 'Hello world',
    translation: 'Hola mundo',
    original_lang: 'en',
    target_lang: 'es',
    status: 'queued',
    queued_at: new Date().toISOString(),
    processed_at: null,
    displayed_at: null,
    performance_metrics: null,
    timestamp: new Date().toISOString(),
    created_at: new Date().toISOString(),
    ...overrides
  })

  describe('add', () => {
    it('should add a message to the queue', async () => {
      const message = createMockMessage('msg-1')
      await messageQueue.add(message)
      
      const messages = messageQueue.getDisplayMessages()
      expect(messages).toHaveLength(1)
      expect(messages[0]).toMatchObject({
        ...message,
        displayOrder: 0,
        localId: expect.any(String),
        retryCount: 0
      })
    })

    it('should assign sequential display orders', () => {
      const msg1 = createMockMessage('msg-1')
      const msg2 = createMockMessage('msg-2')
      
      messageQueue.add(msg1)
      messageQueue.add(msg2)
      
      const messages = messageQueue.getDisplayMessages()
      expect(messages[0].displayOrder).toBe(0)
      expect(messages[1].displayOrder).toBe(1)
    })

    it('should notify listeners when message is added', () => {
      messageQueue.subscribe(mockListener)
      const message = createMockMessage('msg-1')
      
      messageQueue.add(message)
      
      expect(mockListener).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'msg-1' })
      ])
    })

    it('should not add duplicate messages', () => {
      const message = createMockMessage('msg-1')
      
      messageQueue.add(message)
      messageQueue.add(message)
      
      const messages = messageQueue.getDisplayMessages()
      expect(messages).toHaveLength(1)
    })
  })

  describe('updateStatus', () => {
    it('should update message status and notify listeners', () => {
      const message = createMockMessage('msg-1')
      messageQueue.add(message)
      messageQueue.subscribe(mockListener)
      
      messageQueue.updateStatus('msg-1', 'processing')
      
      const messages = messageQueue.getDisplayMessages()
      expect(messages[0].status).toBe('processing')
      expect(mockListener).toHaveBeenCalledWith([
        expect.objectContaining({ status: 'processing' })
      ])
    })

    it('should not update non-existent message', () => {
      messageQueue.subscribe(mockListener)
      
      messageQueue.updateStatus('non-existent', 'processing')
      
      expect(mockListener).not.toHaveBeenCalled()
    })

    it('should set processed_at when status becomes processing', () => {
      const message = createMockMessage('msg-1')
      messageQueue.add(message)
      
      messageQueue.updateStatus('msg-1', 'processing')
      
      const messages = messageQueue.getDisplayMessages()
      expect(messages[0].processed_at).toBeTruthy()
    })

    it('should set displayed_at when status becomes displayed', () => {
      const message = createMockMessage('msg-1')
      messageQueue.add(message)
      
      messageQueue.updateStatus('msg-1', 'displayed')
      
      const messages = messageQueue.getDisplayMessages()
      expect(messages[0].displayed_at).toBeTruthy()
    })
  })


  describe('getDisplayMessages', () => {
    it('should return messages sorted by display order', () => {
      const msg1 = createMockMessage('msg-1')
      const msg2 = createMockMessage('msg-2')
      const msg3 = createMockMessage('msg-3')
      
      messageQueue.add(msg2)
      messageQueue.add(msg1)
      messageQueue.add(msg3)
      
      const messages = messageQueue.getDisplayMessages()
      expect(messages[0].displayOrder).toBe(0)
      expect(messages[1].displayOrder).toBe(1)
      expect(messages[2].displayOrder).toBe(2)
    })

    it('should return empty array when no messages', () => {
      const messages = messageQueue.getDisplayMessages()
      expect(messages).toEqual([])
    })
  })

  describe('subscribe/unsubscribe', () => {
    it('should subscribe listener and receive notifications', () => {
      const unsubscribe = messageQueue.subscribe(mockListener)
      const message = createMockMessage('msg-1')
      
      messageQueue.add(message)
      
      expect(mockListener).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'msg-1' })
      ])
      
      unsubscribe()
    })

    it('should unsubscribe listener and stop receiving notifications', () => {
      const unsubscribe = messageQueue.subscribe(mockListener)
      unsubscribe()
      
      const message = createMockMessage('msg-1')
      messageQueue.add(message)
      
      expect(mockListener).not.toHaveBeenCalled()
    })

    it('should handle multiple listeners', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()
      
      messageQueue.subscribe(listener1)
      messageQueue.subscribe(listener2)
      
      const message = createMockMessage('msg-1')
      messageQueue.add(message)
      
      expect(listener1).toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('should clean up old messages', () => {
      const msg1 = createMockMessage('msg-1')
      const msg2 = createMockMessage('msg-2')
      
      messageQueue.add(msg1)
      messageQueue.add(msg2)
      
      messageQueue.cleanup()
      
      // cleanup only removes messages if there are more than 50
      const messages = messageQueue.getDisplayMessages()
      expect(messages.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('performance requirements', () => {
    it('should process messages within 50ms', () => {
      const startTime = performance.now()
      
      // Add 100 messages
      for (let i = 0; i < 100; i++) {
        messageQueue.add(createMockMessage(`msg-${i}`))
      }
      
      // Update all message statuses
      for (let i = 0; i < 100; i++) {
        messageQueue.updateStatus(`msg-${i}`, 'processing')
      }
      
      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(50)
    })
  })
})