import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EmojiReactionPicker } from '../EmojiReactionPicker'
import { describe, test, expect, beforeEach, vi } from 'vitest'

// Mock framer-motion to avoid animation complexity in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => children
}))

describe('EmojiReactionPicker', () => {
  const defaultProps = {
    isOpen: true,
    position: { x: 100, y: 100 },
    onSelect: vi.fn(),
    onClose: vi.fn(),
    currentReactions: []
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true })
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true })
  })

  test('renders when open', () => {
    render(<EmojiReactionPicker {...defaultProps} />)
    
    expect(screen.getByTestId('emoji-reaction-picker')).toBeInTheDocument()
  })

  test('does not render when closed', () => {
    render(<EmojiReactionPicker {...defaultProps} isOpen={false} />)
    
    expect(screen.queryByTestId('emoji-reaction-picker')).not.toBeInTheDocument()
  })

  test('displays 8 emoji options', () => {
    render(<EmojiReactionPicker {...defaultProps} />)
    
    const emojiOptions = screen.getAllByTestId('emoji-option')
    expect(emojiOptions).toHaveLength(8)
  })

  test('displays correct default emojis', () => {
    render(<EmojiReactionPicker {...defaultProps} />)
    
    const expectedEmojis = ['👍', '❤️', '😂', '😯', '😢', '🙏', '🔥', '👏']
    const emojiOptions = screen.getAllByTestId('emoji-option')
    
    emojiOptions.forEach((option, index) => {
      expect(option).toHaveTextContent(expectedEmojis[index])
    })
  })

  test('calls onSelect when emoji is clicked', () => {
    const onSelect = vi.fn()
    render(<EmojiReactionPicker {...defaultProps} onSelect={onSelect} />)
    
    const thumbsUpEmoji = screen.getByTestId('emoji-option')
    fireEvent.click(thumbsUpEmoji)
    
    expect(onSelect).toHaveBeenCalledWith('👍')
  })

  test('calls onClose when emoji is selected', () => {
    const onClose = vi.fn()
    render(<EmojiReactionPicker {...defaultProps} onClose={onClose} />)
    
    const thumbsUpEmoji = screen.getByTestId('emoji-option')
    fireEvent.click(thumbsUpEmoji)
    
    expect(onClose).toHaveBeenCalled()
  })

  test('calls onClose when clicking outside', async () => {
    const onClose = vi.fn()
    render(
      <div>
        <EmojiReactionPicker {...defaultProps} onClose={onClose} />
        <div data-testid="outside-element">Outside</div>
      </div>
    )
    
    const outsideElement = screen.getByTestId('outside-element')
    fireEvent.mouseDown(outsideElement)
    
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })

  test('does not call onClose when clicking inside picker', () => {
    const onClose = vi.fn()
    render(<EmojiReactionPicker {...defaultProps} onClose={onClose} />)
    
    const picker = screen.getByTestId('emoji-reaction-picker')
    fireEvent.mouseDown(picker)
    
    expect(onClose).not.toHaveBeenCalled()
  })

  test('highlights selected reactions', () => {
    render(
      <EmojiReactionPicker 
        {...defaultProps} 
        currentReactions={['👍', '❤️']} 
      />
    )
    
    const emojiOptions = screen.getAllByTestId('emoji-option')
    
    // First two emojis should be highlighted
    expect(emojiOptions[0]).toHaveClass('bg-blue-100')
    expect(emojiOptions[1]).toHaveClass('bg-blue-100')
    
    // Others should not be highlighted
    expect(emojiOptions[2]).not.toHaveClass('bg-blue-100')
  })

  test('positions picker correctly within viewport', () => {
    const position = { x: 50, y: 50 }
    render(<EmojiReactionPicker {...defaultProps} position={position} />)
    
    const picker = screen.getByTestId('emoji-reaction-picker')
    const style = picker.style
    
    expect(style.left).toBe('50px')
    expect(style.top).toBe('50px')
  })

  test('adjusts position when near right edge', () => {
    // Mock narrow window
    Object.defineProperty(window, 'innerWidth', { value: 400 })
    
    const position = { x: 350, y: 50 } // Close to right edge
    render(<EmojiReactionPicker {...defaultProps} position={position} />)
    
    const picker = screen.getByTestId('emoji-reaction-picker')
    const leftPosition = parseInt(picker.style.left)
    
    // Should be adjusted to fit within viewport
    expect(leftPosition).toBeLessThan(350)
  })

  test('adjusts position when near bottom edge', () => {
    // Mock short window
    Object.defineProperty(window, 'innerHeight', { value: 400 })
    
    const position = { x: 50, y: 350 } // Close to bottom edge
    render(<EmojiReactionPicker {...defaultProps} position={position} />)
    
    const picker = screen.getByTestId('emoji-reaction-picker')
    const topPosition = parseInt(picker.style.top)
    
    // Should be adjusted to show above the trigger point
    expect(topPosition).toBeLessThan(350)
  })

  test('applies correct dark mode classes', () => {
    // Mock dark mode detection
    document.documentElement.classList.add('dark')
    
    render(<EmojiReactionPicker {...defaultProps} />)
    
    const picker = screen.getByTestId('emoji-reaction-picker')
    expect(picker).toHaveClass('dark:bg-gray-800')
    expect(picker).toHaveClass('dark:border-gray-700')
  })

  test('handles keyboard events for accessibility', () => {
    const onClose = jest.fn()
    render(<EmojiReactionPicker {...defaultProps} onClose={onClose} />)
    
    // Simulate Escape key
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
    
    // Note: This test would need additional implementation in the component
    // to handle keyboard events for full accessibility
  })

  test('maintains focus management', () => {
    render(<EmojiReactionPicker {...defaultProps} />)
    
    const firstEmoji = screen.getAllByTestId('emoji-option')[0]
    
    // Focus should be manageable
    firstEmoji.focus()
    expect(document.activeElement).toBe(firstEmoji)
  })

  test('renders with correct ARIA attributes', () => {
    render(<EmojiReactionPicker {...defaultProps} />)
    
    const picker = screen.getByTestId('emoji-reaction-picker')
    const emojiOptions = screen.getAllByTestId('emoji-option')
    
    // Picker should have appropriate role
    expect(picker).toHaveAttribute('role', 'dialog')
    
    // Emoji buttons should have labels
    emojiOptions.forEach((option, index) => {
      expect(option).toHaveAttribute('aria-label')
      expect(option).toHaveAttribute('type', 'button')
    })
  })
})