import type { QueuedMessage } from '@/features/messages/MessageQueue'
import type { Message } from '@/types/database'

/**
 * Interface for message queue operations
 * Provides clean dependency injection for message management
 */
export interface IMessageQueue {
  /**
   * Add a message to the queue
   */
  add(message: Message): Promise<void>

  /**
   * Update message status
   */
  updateStatus(messageId: string, status: QueuedMessage['status']): void

  /**
   * Update message with partial data
   */
  updateMessage(messageId: string, updates: Partial<QueuedMessage>): void

  /**
   * Get ordered messages for display
   */
  getDisplayMessages(): QueuedMessage[]

  /**
   * Subscribe to queue updates
   */
  subscribe(listener: (messages: QueuedMessage[]) => void): () => void

  /**
   * Toggle emoji reaction for a message
   */
  toggleReaction(messageId: string, emoji: string, userId: string): void

  /**
   * Clear old messages (cleanup)
   */
  cleanup(): void

  /**
   * Clear all messages
   */
  clear(): void
}