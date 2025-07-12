/**
 * Sync operation types for MessageSyncService
 * Handles reactions, edits, and deletions with offline support
 */

import type { DatabaseReaction } from '../../types/database'

// Reaction operations
export interface ReactionOperation {
  type: 'add_reaction' | 'remove_reaction'
  messageId: string
  userId: string
  emoji: string
  timestamp: string
}

// Edit operation
export interface EditOperation {
  type: 'edit_message'
  messageId: string
  originalText: string
  previousText: string
  timestamp: string
}

// Delete operation
export interface DeleteOperation {
  type: 'delete_message'
  messageId: string
  timestamp: string
}

// Message operation (existing)
export interface MessageOperation {
  type: 'send_message'
  messageId: string
  sessionId: string
  senderId: string
  originalText: string
  translatedText: string
  originalLanguage: string
  timestamp: string
}

// Union type for all sync operations
export type SyncOperation = 
  | ReactionOperation 
  | EditOperation 
  | DeleteOperation
  | MessageOperation

// Queued operation with retry metadata
export interface QueuedSyncOperation {
  id: string
  operation: SyncOperation
  retryCount: number
  queuedAt: string
  lastAttempt?: string
  error?: string
  sequence: number
}

// Message with reactions data from database join
export interface MessageWithReactionsData {
  id: string
  session_id: string
  sender_id: string
  original_text: string
  translated_text: string
  original_language: string
  timestamp: string
  is_delivered: boolean
  sequence_number: number
  is_edited: boolean
  edited_at: string | null
  is_deleted: boolean
  deleted_at: string | null
  message_reactions?: DatabaseReaction[]
}

// Callbacks for UI updates
export interface MessageSyncCallbacks {
  // Existing callbacks
  onMessageReceived?: (message: any) => void
  onMessageDelivered?: (messageId: string) => void
  onMessageFailed?: (messageId: string, error: string) => void
  onConnectionStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting') => void
  
  // New callbacks for reactions
  onReactionAdded?: (reaction: DatabaseReaction) => void
  onReactionRemoved?: (reaction: DatabaseReaction) => void
  
  // New callbacks for edits/deletes
  onMessageEdited?: (messageId: string, newText: string) => void
  onMessageDeleted?: (messageId: string) => void
  onReTranslationNeeded?: (messageId: string, originalText: string) => void
  
  // Batch loading callback
  onMessagesLoaded?: (messages: any[]) => void
}

// Reaction grouping for UI
export interface ReactionGroup {
  emoji: string
  count: number
  users: string[]
  hasReacted: boolean
}

// Message reactions map
export type MessageReactions = Record<string, ReactionGroup>