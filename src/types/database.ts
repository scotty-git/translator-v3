export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string
          code: string
          created_at: string
          expires_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          code: string
          created_at?: string
          expires_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          code?: string
          created_at?: string
          expires_at?: string
          is_active?: boolean
        }
      }
      session_participants: {
        Row: {
          id: string
          session_id: string
          user_id: string
          joined_at: string
          is_online: boolean
          last_seen: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          joined_at?: string
          is_online?: boolean
          last_seen?: string
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          joined_at?: string
          is_online?: boolean
          last_seen?: string
        }
      }
      messages: {
        Row: {
          id: string
          session_id: string
          sender_id: string
          original_text: string
          translated_text: string | null
          original_language: string
          timestamp: string
          is_delivered: boolean
          sequence_number: number
          is_edited: boolean
          edited_at: string | null
          is_deleted: boolean
          deleted_at: string | null
        }
        Insert: {
          id?: string
          session_id: string
          sender_id: string
          original_text: string
          translated_text?: string | null
          original_language: string
          timestamp?: string
          is_delivered?: boolean
          sequence_number?: number
          is_edited?: boolean
          edited_at?: string | null
          is_deleted?: boolean
          deleted_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          sender_id?: string
          original_text?: string
          translated_text?: string | null
          original_language?: string
          timestamp?: string
          is_delivered?: boolean
          sequence_number?: number
          is_edited?: boolean
          edited_at?: string | null
          is_deleted?: boolean
          deleted_at?: string | null
        }
      }
      message_reactions: {
        Row: {
          id: string
          message_id: string
          user_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          emoji: string
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          user_id?: string
          emoji?: string
          created_at?: string
        }
      }
    }
  }
}

// Helper types for solo mode
export type MessageStatus = 'queued' | 'processing' | 'displayed' | 'failed'

/**
 * Message interface for single-device mode
 * Contains all the fields needed for local message handling
 */
export interface Message {
  id: string
  original: string
  translation: string | null
  original_lang: string
  target_lang: string
  status: MessageStatus
  queued_at: string
  processed_at: string | null
  displayed_at: string | null
  performance_metrics: Json | null
  timestamp: string
  created_at: string
}

/**
 * Performance Metrics Interface
 * 
 * Tracks timing data for the complete message translation pipeline.
 * Used for performance monitoring and optimization.
 */
export interface PerformanceMetrics {
  /** Timestamp when audio recording started */
  audioRecordingStart: number
  /** Timestamp when audio recording completed */
  audioRecordingEnd: number
  /** Timestamp when Whisper transcription request was sent */
  whisperRequestStart: number
  /** Timestamp when Whisper transcription response was received */
  whisperResponseEnd: number
  /** Timestamp when translation request was sent to GPT */
  translationRequestStart: number
  /** Timestamp when translation response was received from GPT */
  translationResponseEnd: number
  /** Time it took to deliver the message to the queue */
  messageDeliveryTime: number
  /** Total time from recording start to message delivery */
  totalEndToEndTime: number
}

/**
 * Emoji Reaction Interface
 * 
 * Represents a single emoji reaction on a message.
 * Tracks which users reacted and provides current user context.
 */
export interface EmojiReaction {
  /** The emoji character (e.g., "👍", "❤️") */
  emoji: string
  /** Total number of users who reacted with this emoji */
  count: number
  /** Array of user IDs who reacted with this emoji */
  users: string[]
  /** Whether the current user has reacted with this emoji (UI state) */
  hasReacted?: boolean
}

/**
 * Message Reactions Collection
 * 
 * Maps emoji characters to their reaction data.
 * Example: { "👍": { emoji: "👍", count: 3, users: ["user1", "user2", "user3"] } }
 */
export interface MessageReactions {
  [emoji: string]: EmojiReaction
}

/**
 * Default Emoji Set for Quick Reactions
 * 
 * These 7 emojis appear in the initial reaction picker (WhatsApp style).
 * Chosen based on most common emotional responses in messaging:
 * 
 * 👍 - Approval/Agreement
 * ❤️ - Love/Support  
 * 😂 - Funny/Laughter
 * 😯 - Surprise/Shock
 * 😢 - Sad/Sympathy
 * 🙏 - Thank you/Please
 * 🔥 - Awesome/Amazing
 */
export const DEFAULT_REACTION_EMOJIS = ['👍', '❤️', '😂', '😯', '😢', '🙏', '🔥'] as const

/**
 * Type for individual default reaction emojis
 */
export type DefaultReactionEmoji = typeof DEFAULT_REACTION_EMOJIS[number]

/**
 * Extended Message Type with Reaction Support
 * 
 * Extends the base Message type to include emoji reactions.
 * This is the primary type used throughout the UI for displaying messages.
 */
export interface MessageWithReactions extends Message {
  /** Optional emoji reactions for this message */
  reactions?: MessageReactions
}

// User activity types
export interface UserActivity {
  activity: 'idle' | 'recording' | 'processing' | 'typing'
  userId?: string
  timestamp?: string
}

// Session-related types
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting'

export interface SessionMessage {
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
}

export interface QueuedSessionMessage {
  id: string
  tempId: string
  session_id: string
  sender_id: string
  original_text: string
  translated_text: string | null
  original_language: string
  timestamp: string
  is_delivered: boolean
  sequence_number: number
  status: 'pending' | 'sending' | 'sent' | 'failed'
  retryCount: number
  lastAttempt: Date
}

// Database reaction type (matches database schema)
export interface DatabaseReaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
}