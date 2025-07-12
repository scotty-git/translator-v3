import type { DatabaseReaction, MessageReactions } from '@/types/database'

/**
 * Operation types for message synchronization
 */

export interface ReactionOperation {
  type: 'add_reaction' | 'remove_reaction'
  messageId: string
  userId: string
  emoji: string
  timestamp: string
}

export interface EditOperation {
  type: 'edit_message'
  messageId: string
  originalText: string
  previousText: string
  timestamp: string
}

export interface DeleteOperation {
  type: 'delete_message'
  messageId: string
  timestamp: string
}

export interface MessageOperation {
  type: 'send_message'
  message: {
    id: string
    session_id: string
    sender_id: string
    original_text: string
    translated_text: string | null
    original_language: string
    timestamp: string
  }
}

// Unified sync operation type
export type SyncOperation = 
  | ReactionOperation 
  | EditOperation 
  | DeleteOperation
  | MessageOperation

// Extended queued operation interface
export interface QueuedSyncOperation {
  id: string
  operation: SyncOperation
  retryCount: number
  queuedAt: string
  lastAttempt?: string
  error?: string
  sequence: number
}

// Callback interfaces for UI updates
export interface MessageSyncCallbacks {
  // Existing callbacks
  onMessageReceived?: (message: any) => void
  onMessageDelivered?: (messageId: string) => void
  onMessageFailed?: (messageId: string, error: string) => void
  
  // New callbacks for reactions
  onReactionAdded?: (reaction: DatabaseReaction) => void
  onReactionRemoved?: (reaction: DatabaseReaction) => void
  
  // Callbacks for edits and deletes
  onMessageEdited?: (messageId: string, newText: string) => void
  onMessageDeleted?: (messageId: string) => void
  onReTranslationNeeded?: (messageId: string, originalText: string) => void
  
  // Callback for batch operations
  onMessagesLoaded?: (messages: any[]) => void
}

// Helper type for message with reactions
export interface MessageWithReactionsData {
  id: string
  session_id: string
  sender_id: string
  original_text: string
  translated_text: string | null
  original_language: string
  timestamp: string
  is_delivered: boolean
  sequence_number: number
  is_edited?: boolean
  edited_at?: string | null
  is_deleted?: boolean
  deleted_at?: string | null
  message_reactions?: DatabaseReaction[]
}