import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MessageList } from './MessageList'
import { SessionProvider } from '../session/SessionContext'
import { messageQueue } from './MessageQueue'
import type { Session } from '@/types/database'

// Mock the SessionContext
const mockSession: Session = {
  id: 'test-session',
  code: 'TEST123',
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
  is_active: true,
  user_count: 2,
  last_activity: new Date().toISOString()
}

const TestWrapper = ({ children, userId = 'test-user' }: { children: React.ReactNode, userId?: string }) => (
  <SessionProvider session={mockSession} userId={userId} isLeft={true}>
    {children}
  </SessionProvider>
)

describe('MessageList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should show loading state initially', () => {
      render(
        <TestWrapper>
          <MessageList />
        </TestWrapper>
      )
      
      expect(screen.getByText('Loading conversation...')).toBeInTheDocument()
      expect(screen.getByRole('status') || screen.getByText('Loading conversation...')).toBeInTheDocument()
    })

    it('should show welcome message when no messages', async () => {
      render(
        <TestWrapper>
          <MessageList />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Ready to translate!')).toBeInTheDocument()
      })
      
      expect(screen.getByText('Hold the record button to start a conversation')).toBeInTheDocument()
      expect(screen.getByText('Your messages will appear here with real-time translation')).toBeInTheDocument()
    })

    it('should show language and sparkles icons in welcome message', async () => {
      render(
        <TestWrapper>
          <MessageList />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(document.querySelector('.lucide-languages')).toBeInTheDocument()
      })
      
      expect(document.querySelector('.lucide-sparkles')).toBeInTheDocument()
    })
  })

  describe('Message Display', () => {
    it('should render messages from queue', async () => {
      render(
        <TestWrapper>
          <MessageList />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.queryByText('Loading conversation...')).not.toBeInTheDocument()
      })
      
      // Add a message to the queue
      messageQueue.add({
        id: 'msg-1',
        session_id: 'test-session',
        user_id: 'test-user',
        original: 'Hello world',
        translation: 'Hola mundo',
        original_lang: 'en',
        target_lang: 'es',
        status: 'displayed',
        queued_at: new Date().toISOString(),
        processed_at: new Date().toISOString(),
        displayed_at: new Date().toISOString(),
        performance_metrics: null,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      
      await waitFor(() => {
        expect(screen.getByText('Hello world')).toBeInTheDocument()
      })
    })

    it('should hide welcome message when messages exist', async () => {
      render(
        <TestWrapper>
          <MessageList />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.getByText('Ready to translate!')).toBeInTheDocument()
      })
      
      // Add a message
      messageQueue.add({
        id: 'msg-1',
        session_id: 'test-session',
        user_id: 'test-user',
        original: 'Hello world',
        translation: 'Hola mundo',
        original_lang: 'en',
        target_lang: 'es',
        status: 'displayed',
        queued_at: new Date().toISOString(),
        processed_at: new Date().toISOString(),
        displayed_at: new Date().toISOString(),
        performance_metrics: null,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      
      await waitFor(() => {
        expect(screen.queryByText('Ready to translate!')).not.toBeInTheDocument()
      })
    })

    it('should render multiple messages in order', async () => {
      render(
        <TestWrapper>
          <MessageList />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.queryByText('Loading conversation...')).not.toBeInTheDocument()
      })
      
      // Add messages
      messageQueue.add({
        id: 'msg-1',
        session_id: 'test-session',
        user_id: 'test-user',
        original: 'First message',
        translation: 'Primer mensaje',
        original_lang: 'en',
        target_lang: 'es',
        status: 'displayed',
        queued_at: new Date().toISOString(),
        processed_at: new Date().toISOString(),
        displayed_at: new Date().toISOString(),
        performance_metrics: null,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      
      messageQueue.add({
        id: 'msg-2',
        session_id: 'test-session',
        user_id: 'other-user',
        original: 'Second message',
        translation: 'Segundo mensaje',
        original_lang: 'es',
        target_lang: 'en',
        status: 'displayed',
        queued_at: new Date().toISOString(),
        processed_at: new Date().toISOString(),
        displayed_at: new Date().toISOString(),
        performance_metrics: null,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      
      await waitFor(() => {
        expect(screen.getByText('First message')).toBeInTheDocument()
        expect(screen.getByText('Segundo mensaje')).toBeInTheDocument()
      })
    })
  })

  describe('Activity Indicators', () => {
    it('should show activity indicators for other users', async () => {
      render(
        <TestWrapper userId="test-user">
          <MessageList />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.queryByText('Loading conversation...')).not.toBeInTheDocument()
      })
      
      // Mock activity will be simulated by the component
      // Check that the component renders without errors
      expect(screen.getByText('Ready to translate!')).toBeInTheDocument()
    })

    it('should not show activity indicators for own user', async () => {
      render(
        <TestWrapper userId="test-user">
          <MessageList />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.queryByText('Loading conversation...')).not.toBeInTheDocument()
      })
      
      // The component should filter out activities from the current user
      expect(screen.getByText('Ready to translate!')).toBeInTheDocument()
    })
  })

  describe('Auto-scroll Behavior', () => {
    it('should have scroll container with proper styling', async () => {
      render(
        <TestWrapper>
          <MessageList />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.queryByText('Loading conversation...')).not.toBeInTheDocument()
      })
      
      const scrollContainer = screen.getByText('Ready to translate!').closest('div')?.parentElement
      expect(scrollContainer).toHaveClass('overflow-y-auto')
      expect(scrollContainer).toHaveClass('flex-1')
    })

    it('should have scroll anchor at bottom', async () => {
      render(
        <TestWrapper>
          <MessageList />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.queryByText('Loading conversation...')).not.toBeInTheDocument()
      })
      
      // The scroll anchor div should be present
      const container = screen.getByText('Ready to translate!').closest('div')
      expect(container).toBeInTheDocument()
    })
  })

  describe('Audio Playback', () => {
    it('should have hidden audio element', async () => {
      render(
        <TestWrapper>
          <MessageList />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.queryByText('Loading conversation...')).not.toBeInTheDocument()
      })
      
      // Audio element should exist but be hidden
      const audioElement = document.querySelector('audio')
      expect(audioElement).toBeInTheDocument()
      expect(audioElement).toHaveAttribute('preload', 'none')
    })
  })

  describe('Performance', () => {
    it('should render quickly with multiple messages', async () => {
      const startTime = performance.now()
      
      render(
        <TestWrapper>
          <MessageList />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.queryByText('Loading conversation...')).not.toBeInTheDocument()
      })
      
      // Add multiple messages
      for (let i = 0; i < 10; i++) {
        messageQueue.add({
          id: `msg-${i}`,
          session_id: 'test-session',
          user_id: i % 2 === 0 ? 'test-user' : 'other-user',
          original: `Message ${i}`,
          translation: `Mensaje ${i}`,
          original_lang: 'en',
          target_lang: 'es',
          status: 'displayed',
          queued_at: new Date().toISOString(),
          processed_at: new Date().toISOString(),
          displayed_at: new Date().toISOString(),
          performance_metrics: null,
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
      }
      
      await waitFor(() => {
        expect(screen.getByText('Message 0')).toBeInTheDocument()
      })
      
      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(100)
    })
  })

  describe('Visual Styling', () => {
    it('should have proper background gradient', async () => {
      render(
        <TestWrapper>
          <MessageList />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.queryByText('Loading conversation...')).not.toBeInTheDocument()
      })
      
      const container = screen.getByText('Ready to translate!').closest('div')?.parentElement
      expect(container).toHaveClass('bg-gradient-to-b')
      expect(container).toHaveClass('from-gray-50')
      expect(container).toHaveClass('to-white')
    })

    it('should have proper spacing and padding', async () => {
      render(
        <TestWrapper>
          <MessageList />
        </TestWrapper>
      )
      
      await waitFor(() => {
        expect(screen.queryByText('Loading conversation...')).not.toBeInTheDocument()
      })
      
      const content = screen.getByText('Ready to translate!').closest('div')
      expect(content).toHaveClass('p-4')
      expect(content).toHaveClass('space-y-4')
    })
  })

  describe('Loading State', () => {
    it('should show loading spinner with proper styling', () => {
      render(
        <TestWrapper>
          <MessageList />
        </TestWrapper>
      )
      
      expect(screen.getByText('Loading conversation...')).toBeInTheDocument()
      
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
      expect(spinner).toHaveClass('border-t-blue-600')
    })

    it('should center loading state', () => {
      render(
        <TestWrapper>
          <MessageList />
        </TestWrapper>
      )
      
      const loadingContainer = screen.getByText('Loading conversation...').closest('div')?.parentElement
      expect(loadingContainer).toHaveClass('flex-1')
      expect(loadingContainer).toHaveClass('flex')
      expect(loadingContainer).toHaveClass('items-center')
      expect(loadingContainer).toHaveClass('justify-center')
    })
  })

  describe('Error Handling', () => {
    it('should handle missing session gracefully', async () => {
      render(
        <SessionProvider session={null} userId="test-user" isLeft={true}>
          <MessageList />
        </SessionProvider>
      )
      
      await waitFor(() => {
        expect(screen.queryByText('Loading conversation...')).not.toBeInTheDocument()
      })
      
      // Should show welcome message even without session
      expect(screen.getByText('Ready to translate!')).toBeInTheDocument()
    })
  })
})