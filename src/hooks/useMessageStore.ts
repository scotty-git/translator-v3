import { useState, useCallback } from 'react'
import { messageQueue } from '@/features/messages/MessageQueue'
import type { Message } from '@/types/database'

export interface UseMessageStoreReturn {
  isLoading: boolean
  error: string | null
  sendMessage: (text: string) => Promise<void>
  retryMessage: (messageId: string) => Promise<void>
}

export function useMessageStore(sessionId: string, userId: string): UseMessageStoreReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (text: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Create mock message for testing
      const message: Message = {
        id: `msg-${Date.now()}-${Math.random()}`,
        session_id: sessionId,
        user_id: userId,
        original: text,
        translation: null,
        original_lang: 'en',
        target_lang: 'es',
        status: 'queued',
        queued_at: new Date().toISOString(),
        processed_at: null,
        displayed_at: null,
        performance_metrics: null,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString()
      }
      
      // Add to queue
      await messageQueue.add(message)
      
      // Simulate processing
      setTimeout(() => {
        message.status = 'processing'
        message.translation = `[${text} translated to Spanish]`
        messageQueue.updateStatus(message.id, 'processing')
        
        // Simulate completion
        setTimeout(() => {
          messageQueue.updateStatus(message.id, 'displayed')
        }, 1000)
      }, 500)
      
    } catch (err) {
      setError('Failed to send message')
      console.error('Send message error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, userId])

  const retryMessage = useCallback(async (messageId: string) => {
    // TODO: Implement retry logic
    console.log('Retry message:', messageId)
  }, [])

  return {
    isLoading,
    error,
    sendMessage,
    retryMessage,
  }
}