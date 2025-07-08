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
      // No Supabase tables needed for solo mode
      // All data is handled locally in the SingleDeviceTranslator
    }
  }
}

// Helper types for solo mode
export type MessageStatus = 'queued' | 'processing' | 'displayed' | 'failed'

/**
 * Message interface for solo mode
 * Contains all the fields needed for local message handling
 */
export interface Message {
  id: string
  session_id: string
  user_id: string
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