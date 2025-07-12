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
 * REBUILT with mobile-first approach and fixed width constraints
 * - Maximum width: 250px (safe for 390px viewport)
 * - Grid-based layout: 6 emojis per row maximum
 * - No dynamic calculations that can fail
 * - Simple, reliable positioning
 */
export function EmojiReactionPicker({ isVisible, position, onEmojiSelect, onClose }: EmojiReactionPickerProps) {
  const [showExtended, setShowExtended] = useState(false)

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji)
    handleClose()
  }

  const handleMoreClick = () => {
    setShowExtended(true)
  }

  const handleBackClick = () => {
    setShowExtended(false)
  }

  const handleClose = () => {
    setShowExtended(false)
    onClose()
  }

  const handleBackdropClick = () => {
    handleClose()
  }

  // Don't render anything if not visible
  if (!isVisible) {
    return null
  }

  /**
   * FIXED WIDTH APPROACH - No more dynamic calculations
   * 
   * Mobile-first constraints:
   * - Default mode: 250px max width (7 × 32px buttons + 6 × 2px gaps + 16px padding = 238px)
   * - Extended mode: 250px max width (6 × 32px buttons + 5 × 2px gaps + 32px padding = 234px)
   * - Always safe for 390px viewport (leaves 70px margins)
   */
  const PICKER_WIDTH = 250 // Fixed maximum width
  const PICKER_HEIGHT = showExtended ? 160 : 48

  // Calculate position with proper constraints
  const leftPosition = Math.max(
    20, // 20px minimum margin from left
    Math.min(
      position.x - PICKER_WIDTH / 2, // Center on message
      window.innerWidth - PICKER_WIDTH - 20 // 20px minimum margin from right
    )
  )
  
  const topPosition = Math.max(
    20, // 20px minimum margin from top
    position.y - PICKER_HEIGHT - 12 // 12px offset above message
  )

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 z-40 bg-black/10" 
        onClick={handleBackdropClick}
        aria-label="Close emoji picker"
      />

      {/* Main picker container - FIXED WIDTH */}
      <div 
        className="fixed z-50 bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700"
        style={{ 
          left: leftPosition, 
          top: topPosition,
          width: PICKER_WIDTH,
          maxWidth: PICKER_WIDTH,
          height: PICKER_HEIGHT,
          borderRadius: showExtended ? '12px' : '24px',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}
        role="dialog"
        aria-label="Emoji reaction picker"
      >
        {!showExtended ? (
          /* DEFAULT MODE: Quick emoji bar with FIXED sizing */
          <div 
            className="flex items-center justify-center gap-2 px-4 py-2"
            style={{ 
              width: '100%', 
              height: '100%',
              overflow: 'hidden'
            }}
          >
            {DEFAULT_REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="flex items-center justify-center rounded-full text-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 hover:scale-110 transform"
                style={{
                  width: '32px',
                  height: '32px',
                  flexShrink: 0
                }}
                title={`React with ${emoji}`}
                aria-label={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
            
            {/* Plus button */}
            <button
              onClick={handleMoreClick}
              className="flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 hover:scale-110 transform text-gray-600 dark:text-gray-400"
              style={{
                width: '32px',
                height: '32px',
                flexShrink: 0
              }}
              title="More emojis"
              aria-label="Show more emojis"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        ) : (
          /* EXTENDED MODE: Fixed grid layout */
          <div className="p-4 h-full overflow-hidden">
            {/* Header with back button */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={handleBackClick}
                className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 text-gray-600 dark:text-gray-400"
                title="Back to quick reactions"
                aria-label="Back to quick reactions"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                All Emojis
              </span>
            </div>

            {/* 
              FIXED GRID: 6 columns maximum (6 × 32px + 5 × 2px + padding = fits in 250px)
            */}
            <div 
              className="grid gap-1 overflow-y-auto"
              style={{
                gridTemplateColumns: 'repeat(6, 32px)',
                justifyContent: 'center',
                maxHeight: '100px'
              }}
            >
              {EXTENDED_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiClick(emoji)}
                  className="flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 hover:scale-110 transform text-sm"
                  style={{
                    width: '32px',
                    height: '32px'
                  }}
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