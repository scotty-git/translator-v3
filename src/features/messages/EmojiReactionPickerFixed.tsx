import { useState } from 'react'
import { Plus } from 'lucide-react'
import { DEFAULT_REACTION_EMOJIS } from '@/types/database'

/**
 * Props interface for the EmojiReactionPicker component
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
]

/**
 * REBUILT EmojiReactionPicker Component with Fixed Width Constraints
 * 
 * This version rebuilds the picker with width constraints built into the component
 * logic rather than relying on CSS overrides.
 */
export function EmojiReactionPickerFixed({ isVisible, position, onEmojiSelect, onClose }: EmojiReactionPickerProps) {
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

  if (!isVisible) {
    return null
  }

  // Fixed width calculation - no CSS interference
  const FIXED_WIDTH = 180 // Target width
  const MARGIN = 20 // Safety margin from screen edges
  
  // Calculate position
  const leftPosition = Math.max(
    MARGIN,
    Math.min(
      position.x - FIXED_WIDTH / 2,
      window.innerWidth - FIXED_WIDTH - MARGIN
    )
  )
  
  const topPosition = Math.max(
    20,
    position.y - 50 - 12
  )

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/10" 
        onClick={handleBackdropClick}
        aria-label="Close emoji picker"
      />

      {/* Main picker - using table layout to force exact dimensions */}
      <div 
        role="dialog"
        aria-label="Emoji reaction picker"
        data-testid="emoji-picker-fixed-version"
        style={{
          position: 'fixed',
          zIndex: 50,
          left: leftPosition,
          top: topPosition,
          width: FIXED_WIDTH,
          maxWidth: FIXED_WIDTH,
          minWidth: FIXED_WIDTH,
          height: showExtended ? 120 : 40,
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: showExtended ? '12px' : '20px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          display: 'table', // Force table layout for exact sizing
          tableLayout: 'fixed' // Force fixed layout
        }}
      >
        {!showExtended ? (
          /* Default mode - horizontal emoji bar */
          <div style={{
            display: 'table-cell',
            verticalAlign: 'middle',
            padding: '4px 8px',
            width: '100%'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              justifyContent: 'space-between',
              width: '100%',
              overflow: 'hidden'
            }}>
              {DEFAULT_REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiClick(emoji)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: 'transparent',
                    fontSize: '12px',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6'
                    e.currentTarget.style.transform = 'scale(1.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.transform = 'scale(1)'
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  flexShrink: 0,
                  color: '#6b7280',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6'
                  e.currentTarget.style.transform = 'scale(1.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.transform = 'scale(1)'
                }}
                title="More emojis"
                aria-label="Show more emojis"
              >
                <Plus size={10} />
              </button>
            </div>
          </div>
        ) : (
          /* Extended mode - emoji grid */
          <div style={{
            display: 'table-cell',
            verticalAlign: 'top',
            padding: '8px',
            width: '100%'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginBottom: '6px'
            }}>
              <button
                onClick={handleBackClick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  color: '#6b7280',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
                title="Back to quick reactions"
                aria-label="Back to quick reactions"
              >
                <svg width="8" height="8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span style={{
                fontSize: '10px',
                fontWeight: '500',
                color: '#374151'
              }}>
                All Emojis
              </span>
            </div>

            {/* Emoji grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(9, 1fr)',
              gap: '2px',
              maxHeight: '70px',
              overflowY: 'auto',
              width: '100%'
            }}>
              {EXTENDED_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiClick(emoji)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '16px',
                    height: '16px',
                    borderRadius: '2px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    fontSize: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6'
                    e.currentTarget.style.transform = 'scale(1.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.transform = 'scale(1)'
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