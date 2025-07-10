import { describe, test, expect } from 'vitest'
import { MessageQueueService } from '@/services/queues/MessageQueueService'
import { IMessageQueue } from '@/services/queues/IMessageQueue'

describe('Phase 1a Unit Validation', () => {
  test('MessageQueueService implements IMessageQueue interface', () => {
    const service = new MessageQueueService()
    
    // Verify all interface methods exist
    expect(typeof service.add).toBe('function')
    expect(typeof service.updateStatus).toBe('function')
    expect(typeof service.updateMessage).toBe('function')
    expect(typeof service.getDisplayMessages).toBe('function')
    expect(typeof service.subscribe).toBe('function')
    expect(typeof service.toggleReaction).toBe('function')
    expect(typeof service.cleanup).toBe('function')
    expect(typeof service.clear).toBe('function')
  })

  test('Service can be created and used', async () => {
    const service = new MessageQueueService()
    
    const testMessage = {
      id: 'test-message',
      original: 'Hello',
      translation: 'Hola',
      original_lang: 'en' as const,
      target_lang: 'es' as const,
      status: 'queued' as const,
      queued_at: new Date().toISOString(),
      processed_at: null,
      displayed_at: null,
      sender_id: 'test-user',
      session_id: 'test-session'
    }
    
    await service.add(testMessage)
    const messages = service.getDisplayMessages()
    
    expect(messages).toHaveLength(1)
    expect(messages[0].id).toBe('test-message')
    expect(messages[0].original).toBe('Hello')
  })

  test('Dependency injection compatibility', () => {
    // Test that MessageQueueService can be used as IMessageQueue
    const service: IMessageQueue = new MessageQueueService()
    
    expect(service).toBeInstanceOf(MessageQueueService)
    expect(typeof service.add).toBe('function')
  })
})