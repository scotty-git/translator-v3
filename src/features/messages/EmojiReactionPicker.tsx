import { useState } from 'react'
import { Plus } from 'lucide-react'
import { DEFAULT_REACTION_EMOJIS } from '@/types/database'

/**
 * Props interface for the EmojiReactionPicker component
 * This component renders a WhatsApp-style emoji picker overlay
 */
export interface EmojiReactionPickerProps {
  /** Controls visibility of the picker overlay */
  isVisible: boolean
  /** Screen coordinates where the picker should appear */
  position: { x: number; y: number }
  /** Callback when user selects an emoji */
  onEmojiSelect: (emoji: string) => void
  /** Callback when user closes the picker */
  onClose: () => void
}

/**
 * Extended emoji set for the expanded picker
 * Organized by emotional categories for better UX
 * 
 * Categories:
 * - Happy/Positive: 😀-🙃
 * - Love/Affection: 😉-😙  
 * - Playful/Silly: 😋-🤑
 * - Thoughtful/Neutral: 🤗-🤥
 * - Tired/Sick: 😔-🤧
 * - Extreme/Special: 🥵-🧐
 * - Sad/Worried: 😕-😞
 * - Stressed/Angry: 😓-👿
 * - Special/Fun: 💀-🤖
 */
const EXTENDED_EMOJIS = [
  // Happy & Positive emotions
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
  // Love & Affection
  '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
  // Playful & Silly
  '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
  // Thoughtful & Neutral
  '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
  // Tired & Sick
  '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧',
  // Extreme & Special states
  '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐',
  // Sad & Worried
  '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦',
  '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞',
  // Stressed & Angry
  '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿',
  // Special & Fun characters
  '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖'
]

/**
 * EmojiReactionPicker Component
 * 
 * This is the core emoji selection interface that appears when users long-press messages.
 * It mimics WhatsApp's emoji reaction system with:
 * 1. Quick access to 7 most common emojis
 * 2. Expandable grid for full emoji selection
 * 3. Smart positioning to stay within viewport
 * 4. Backdrop dismissal for intuitive UX
 * 
 * Architecture:
 * - State management for expanded/collapsed modes
 * - Dynamic positioning based on message location
 * - Event handling for emoji selection and dismissal
 * - Responsive design for mobile and desktop
 */
export function EmojiReactionPicker({ isVisible, position, onEmojiSelect, onClose }: EmojiReactionPickerProps) {
  /**
   * Controls whether the picker shows the default 7 emojis or the extended grid
   * false = Default mode (7 emojis + plus button)
   * true = Extended mode (full emoji grid + back button)
   */
  const [showExtended, setShowExtended] = useState(false)

  /**
   * Handles emoji selection and cleanup
   * Calls the parent callback and closes the picker
   * 
   * @param emoji - The selected emoji string
   */
  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji)
    handleClose()
  }

  /**
   * Expands to show the full emoji grid
   * Transitions from default view to extended view
   */
  const handleMoreClick = () => {
    setShowExtended(true)
  }

  /**
   * Returns to the default 7-emoji view
   * Used when user wants to go back from extended view
   */
  const handleBackClick = () => {
    setShowExtended(false)
  }

  /**
   * Closes the picker and resets state
   * Ensures we always return to default view when reopened
   */
  const handleClose = () => {
    setShowExtended(false)
    onClose()
  }

  /**
   * Handles backdrop clicks to dismiss the picker
   * Provides intuitive "click outside to close" behavior
   */
  const handleBackdropClick = () => {
    handleClose()
  }

  // Don't render anything if not visible
  if (!isVisible) {
    return null
  }

  /**
   * Calculate optimal picker position
   * 
   * Strategy:
   * 1. Center the picker horizontally on the message
   * 2. Position above the message with small offset
   * 3. Ensure picker stays within viewport bounds
   * 4. Add padding from screen edges for mobile safety
   */
  const pickerWidth = showExtended ? 320 : 400 // Extended mode is wider for grid layout
  const pickerHeight = showExtended ? 200 : 60 // Extended mode is taller for multiple rows
  
  // Calculate horizontal position (centered on message, but within bounds)
  const leftPosition = Math.max(
    16, // Minimum 16px from left edge
    Math.min(
      position.x - pickerWidth / 2, // Center on message
      window.innerWidth - pickerWidth - 16 // Maximum position (16px from right edge)
    )
  )
  
  // Calculate vertical position (above message, but within bounds)
  const topPosition = Math.max(
    16, // Minimum 16px from top edge
    position.y - pickerHeight - 10 // 10px offset above the message
  )

  return (
    <>
      {/* 
        Backdrop overlay
        - Covers entire screen to capture outside clicks
        - Semi-transparent to darken background
        - High z-index to appear above message content
      */}
      <div 
        className="fixed inset-0 z-40 bg-black/10" 
        onClick={handleBackdropClick}
        aria-label="Close emoji picker"
      />

      {/* 
        Main picker container
        - Positioned absolutely at calculated coordinates
        - Highest z-index to appear above backdrop
        - Rounded corners and shadow for modern look
        - Dark mode support
      */}
      <div 
        className="fixed z-50 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700"
        style={{ 
          left: leftPosition, 
          top: topPosition,
          // Conditional styling based on mode
          borderRadius: showExtended ? '16px' : '999px', // Grid mode uses less rounding
          minWidth: showExtended ? '320px' : 'auto'
        }}
        role="dialog"
        aria-label="Emoji reaction picker"
      >
        {!showExtended ? (
          /* 
            DEFAULT MODE: Quick emoji bar
            - Horizontal layout with 7 default emojis
            - Plus button for expanding to full grid
            - Optimized for quick reactions
          */
          <div className="flex items-center gap-2 px-4 py-3">
            {DEFAULT_REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="flex items-center justify-center w-10 h-10 rounded-full text-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 hover:scale-110 transform"
                title={`React with ${emoji}`}
                aria-label={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
            
            {/* Plus button to expand to full grid */}
            <button
              onClick={handleMoreClick}
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 hover:scale-110 transform text-gray-600 dark:text-gray-400"
              title="More emojis"
              aria-label="Show more emojis"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        ) : (
          /* 
            EXTENDED MODE: Full emoji grid
            - Grid layout for browsing all available emojis
            - Back button to return to default view
            - Scrollable for large emoji sets
          */
          <div className="p-4">
            {/* Header with back button */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={handleBackClick}
                className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 text-gray-600 dark:text-gray-400"
                title="Back to quick reactions"
                aria-label="Back to quick reactions"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                All Emojis
              </span>
            </div>

            {/* 
              Emoji grid
              - Responsive grid layout
              - Hover effects for better UX
              - Keyboard navigation support
            */}
            <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto">
              {EXTENDED_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiClick(emoji)}
                  className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 hover:scale-110 transform text-lg"
                  title={`React with ${emoji}`}
                  aria-label={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}