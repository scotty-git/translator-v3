import { clsx } from 'clsx'
import type { MessageReactions as MessageReactionsType, EmojiReaction } from '@/types/database'

/**
 * Props interface for the MessageReactions component
 * Displays emoji reactions in WhatsApp style (overlay or under messages)
 */
export interface MessageReactionsProps {
  /** The reactions object containing all emoji reactions for this message */
  reactions: MessageReactionsType
  /** Whether this message was sent by the current user (affects alignment) */
  isOwnMessage: boolean
  /** Callback when user clicks on a reaction bubble to toggle their reaction */
  onReactionClick?: (emoji: string, hasReacted: boolean) => void
  /** Whether reactions should be displayed as overlay on message (WhatsApp style) */
  isOverlay?: boolean
}

/**
 * MessageReactions Component
 * 
 * This component displays emoji reactions under messages, similar to WhatsApp.
 * It handles the visual representation of who reacted with what emoji.
 * 
 * Key Features:
 * 1. Shows reaction bubbles with emoji + count
 * 2. Visual indication of user's own reactions
 * 3. Click to toggle reactions on/off
 * 4. Responsive alignment based on message ownership
 * 5. Dark mode support
 * 
 * Architecture:
 * - Filters out reactions with zero count
 * - Maps reactions to visual bubbles
 * - Handles click events for toggling
 * - Applies different styling for own vs others' messages
 */
export function MessageReactions({ reactions, isOwnMessage, onReactionClick, isOverlay = false }: MessageReactionsProps) {
  /**
   * Filter out reactions with zero count and convert to array
   * This ensures we only show reactions that actually have users
   */
  const reactionEntries = Object.entries(reactions).filter(([, reaction]) => reaction.count > 0)
  
  // Don't render anything if no reactions exist
  if (reactionEntries.length === 0) {
    return null
  }

  if (isOverlay) {
    // WhatsApp-style overlay reactions: bare emojis only
    return (
      <div className="flex items-center gap-1">
        {reactionEntries.map(([emoji, reaction]) => (
          <OverlayReactionBubble
            key={emoji}
            emoji={emoji}
            reaction={reaction}
            isOwnMessage={isOwnMessage}
            onClick={() => onReactionClick?.(emoji, reaction.hasReacted || false)}
          />
        ))}
      </div>
    )
  }

  // Original under-message reactions (fallback)
  return (
    <div className={clsx(
      'flex flex-wrap gap-1 mt-2',
      // Align reactions based on message ownership
      // Own messages: reactions align to the right
      // Others' messages: reactions align to the left
      isOwnMessage ? 'justify-end' : 'justify-start'
    )}>
      {reactionEntries.map(([emoji, reaction]) => (
        <ReactionBubble
          key={emoji}
          emoji={emoji}
          reaction={reaction}
          isOwnMessage={isOwnMessage}
          onClick={() => onReactionClick?.(emoji, reaction.hasReacted || false)}
        />
      ))}
    </div>
  )
}

/**
 * Props interface for individual reaction bubbles
 */
interface ReactionBubbleProps {
  /** The emoji character */
  emoji: string
  /** The reaction data including count and user info */
  reaction: EmojiReaction
  /** Whether the parent message is from current user */
  isOwnMessage: boolean
  /** Click handler for toggling this reaction */
  onClick?: () => void
}

/**
 * OverlayReactionBubble Component
 * 
 * Compact reaction bubble for WhatsApp-style overlay display.
 * Much smaller and simpler than the regular reaction bubbles.
 * 
 * Features:
 * - Minimal design with just emoji and count
 * - Unified styling regardless of message ownership
 * - Smaller size to fit in overlay container
 * - Still interactive with hover effects
 */
function OverlayReactionBubble({ emoji, reaction, onClick }: ReactionBubbleProps) {
  /** Whether the current user has reacted with this emoji */
  const hasReacted = reaction.hasReacted || false
  
  return (
    <button
      onClick={onClick}
      className={clsx(
        // Bare emoji with minimal styling - no background
        'transition-all duration-200 hover:scale-125 p-0.5',
        {
          // User has reacted: slightly more prominent
          'opacity-100 filter drop-shadow-sm': hasReacted,
          // User hasn't reacted: subtle appearance
          'opacity-75 hover:opacity-100': !hasReacted,
        }
      )}
      title={hasReacted ? `Remove your ${emoji} reaction` : `React with ${emoji}`}
      aria-label={hasReacted ? `Remove your ${emoji} reaction` : `React with ${emoji}`}
    >
      {/* Bare emoji character - no background or border */}
      <span className="text-base" role="img" aria-label={emoji}>
        {emoji}
      </span>
    </button>
  )
}

/**
 * ReactionBubble Component
 * 
 * Individual reaction bubble showing emoji + count with interactive behavior.
 * This is the atomic unit of the reaction system.
 * 
 * Visual States:
 * 1. Reacted by current user: Highlighted appearance
 * 2. Not reacted by current user: Muted appearance
 * 3. Hover state: Scale animation and background change
 * 4. Different styling for own vs others' messages
 * 
 * Interaction:
 * - Click to toggle user's reaction
 * - Hover effects for better UX
 * - Accessible with proper ARIA labels
 */
function ReactionBubble({ emoji, reaction, isOwnMessage, onClick }: ReactionBubbleProps) {
  /** Whether the current user has reacted with this emoji */
  const hasReacted = reaction.hasReacted || false
  
  return (
    <button
      onClick={onClick}
      className={clsx(
        // Base styles for all reaction bubbles
        'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105',
        {
          /*
           * Styling for OWN MESSAGES
           * When current user sent the message, reactions use blue theme
           */
          // User has reacted: Blue background with blue text
          'bg-blue-100 border border-blue-200 text-blue-700 hover:bg-blue-200': 
            isOwnMessage && hasReacted,
          // User hasn't reacted: Semi-transparent white overlay
          'bg-white/20 border border-white/30 text-white hover:bg-white/30': 
            isOwnMessage && !hasReacted,
          
          /*
           * Styling for OTHERS' MESSAGES  
           * When someone else sent the message, reactions use lighter theme
           */
          // User has reacted: Lighter blue to differentiate from own messages
          'bg-blue-50 border border-blue-300 text-blue-800 hover:bg-blue-100': 
            !isOwnMessage && hasReacted,
          // User hasn't reacted: Gray theme that works in light/dark mode
          'bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600': 
            !isOwnMessage && !hasReacted,
        }
      )}
      title={hasReacted ? `Remove your ${emoji} reaction` : `React with ${emoji}`}
      aria-label={hasReacted ? `Remove your ${emoji} reaction` : `React with ${emoji}`}
    >
      {/* Emoji character */}
      <span className="text-sm" role="img" aria-label={emoji}>
        {emoji}
      </span>
      
      {/* Reaction count */}
      <span className="text-xs font-semibold">
        {reaction.count}
      </span>
    </button>
  )
}