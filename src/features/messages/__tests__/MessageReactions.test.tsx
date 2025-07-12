import { render, screen, fireEvent } from '@testing-library/react'
import { MessageReactions } from '../MessageReactions'
import type { MessageReactions as MessageReactionsType } from '@/types/database'
import { describe, test, expect, beforeEach, vi } from 'vitest'

// Mock framer-motion to avoid animation complexity in tests
vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>
  }
}))

describe('MessageReactions', () => {
  const mockReactions: MessageReactionsType = {
    '👍': {
      emoji: '👍',
      count: 3,
      users: ['user1', 'user2', 'user3'],
      hasReacted: false
    },
    '❤️': {
      emoji: '❤️',
      count: 1,
      users: ['user1'],
      hasReacted: true
    }
  }

  const defaultProps = {
    reactions: mockReactions,
    onToggle: vi.fn(),
    currentUserId: 'user1'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders nothing when no reactions', () => {
    const { container } = render(
      <MessageReactions reactions={} onToggle={vi.fn()} />
    )
    
    expect(container.firstChild).toBeNull()
  })

  test('renders all reactions with correct counts', () => {
    render(<MessageReactions {...defaultProps} />)
    
    expect(screen.getByText('👍')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('❤️')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  test('highlights user own reactions', () => {
    render(<MessageReactions {...defaultProps} />)
    
    const reactions = screen.getAllByTestId('message-reaction')
    
    // Heart reaction should be highlighted (user1 reacted)
    const heartReaction = reactions.find(r => r.textContent?.includes('❤️'))
    expect(heartReaction).toHaveClass('bg-blue-100')
    
    // Thumbs up should not be highlighted (user1 did not react)
    const thumbsReaction = reactions.find(r => r.textContent?.includes('👍'))
    expect(thumbsReaction).not.toHaveClass('bg-blue-100')
    expect(thumbsReaction).toHaveClass('bg-gray-100')
  })

  test('calls onToggle when reaction is clicked', () => {
    const onToggle = vi.fn()
    render(<MessageReactions {...defaultProps} onToggle={onToggle} />)
    
    const thumbsUpReaction = screen.getByText('👍').closest('button')
    fireEvent.click(thumbsUpReaction!)
    
    expect(onToggle).toHaveBeenCalledWith('👍')
  })

  test('displays correct user reaction state', () => {
    const reactionsWithUserReaction: MessageReactionsType = {
      '👍': {
        emoji: '👍',
        count: 2,
        users: ['user1', 'user2'],
        hasReacted: false // This should be calculated based on users array
      }
    }

    render(
      <MessageReactions 
        reactions={reactionsWithUserReaction}
        onToggle={vi.fn()}
        currentUserId="user1"
      />
    )
    
    const reaction = screen.getByTestId('message-reaction')
    // Should be highlighted because user1 is in the users array
    expect(reaction).toHaveClass('bg-blue-100')
  })

  test('works without currentUserId', () => {
    render(
      <MessageReactions 
        reactions={mockReactions}
        onToggle={vi.fn()}
      />
    )
    
    const reactions = screen.getAllByTestId('message-reaction')
    
    // Should render reactions but none should be highlighted
    expect(reactions).toHaveLength(2)
    reactions.forEach(reaction => {
      expect(reaction).toHaveClass('bg-gray-100')
      expect(reaction).not.toHaveClass('bg-blue-100')
    })
  })

  test('works without onToggle handler', () => {
    render(
      <MessageReactions 
        reactions={mockReactions}
        currentUserId="user1"
      />
    )
    
    const thumbsUpReaction = screen.getByText('👍').closest('button')
    
    // Should not throw error when clicked
    expect(() => {
      fireEvent.click(thumbsUpReaction!)
    }).not.toThrow()
  })

  test('applies correct dark mode classes', () => {
    // Mock dark mode
    document.documentElement.classList.add('dark')
    
    render(<MessageReactions {...defaultProps} />)
    
    const reactions = screen.getAllByTestId('message-reaction')
    
    reactions.forEach(reaction => {
      if (reaction.classList.contains('bg-blue-100')) {
        expect(reaction).toHaveClass('dark:bg-blue-900/30')
        expect(reaction).toHaveClass('dark:text-blue-300')
      } else {
        expect(reaction).toHaveClass('dark:bg-gray-800')
        expect(reaction).toHaveClass('dark:text-gray-300')
      }
    })
  })

  test('maintains proper button accessibility', () => {
    render(<MessageReactions {...defaultProps} />)
    
    const reactionButtons = screen.getAllByTestId('message-reaction')
    
    reactionButtons.forEach(button => {
      expect(button.tagName).toBe('BUTTON')
      expect(button).toHaveAttribute('type', 'button')
    })
  })

  test('renders reactions in consistent order', () => {
    const reactions: MessageReactionsType = {
      '🔥': { emoji: '🔥', count: 1, users: ['user1'], hasReacted: false },
      '👍': { emoji: '👍', count: 2, users: ['user2', 'user3'], hasReacted: false },
      '❤️': { emoji: '❤️', count: 1, users: ['user1'], hasReacted: true }
    }

    render(
      <MessageReactions 
        reactions={reactions}
        onToggle={vi.fn()}
        currentUserId="user1"
      />
    )
    
    const reactionButtons = screen.getAllByTestId('message-reaction')
    const emojiOrder = reactionButtons.map(btn => 
      btn.textContent?.match(/[^\d\s]+/)?.[0]
    )
    
    // Should maintain object key order
    expect(emojiOrder).toEqual(['🔥', '👍', '❤️'])
  })

  test('handles empty users array gracefully', () => {
    const reactionsWithEmptyUsers: MessageReactionsType = {
      '👍': {
        emoji: '👍',
        count: 0,
        users: [],
        hasReacted: false
      }
    }

    render(
      <MessageReactions 
        reactions={reactionsWithEmptyUsers}
        onToggle={vi.fn()}
        currentUserId="user1"
      />
    )
    
    const reaction = screen.getByTestId('message-reaction')
    expect(reaction).toHaveTextContent('👍 0')
    expect(reaction).not.toHaveClass('bg-blue-100')
  })

  test('updates reaction state correctly when users change', () => {
    const { rerender } = render(<MessageReactions {...defaultProps} />)
    
    // Initially user1 has reacted to heart
    let heartReaction = screen.getAllByTestId('message-reaction')
      .find(r => r.textContent?.includes('❤️'))
    expect(heartReaction).toHaveClass('bg-blue-100')
    
    // Update reactions to remove user1 from heart
    const updatedReactions: MessageReactionsType = {
      ...mockReactions,
      '❤️': {
        emoji: '❤️',
        count: 0,
        users: [],
        hasReacted: false
      }
    }
    
    rerender(
      <MessageReactions 
        {...defaultProps}
        reactions={updatedReactions}
      />
    )
    
    heartReaction = screen.getAllByTestId('message-reaction')
      .find(r => r.textContent?.includes('❤️'))
    expect(heartReaction).not.toHaveClass('bg-blue-100')
    expect(heartReaction).toHaveTextContent('❤️ 0')
  })
})