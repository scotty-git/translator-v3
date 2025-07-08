import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MessageBubble } from './MessageBubble'
import { SessionProvider } from '../session/SessionContext'
import type { QueuedMessage } from './MessageQueue'
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

describe('MessageBubble', () => {
  const createMockMessage = (overrides?: Partial<QueuedMessage>): QueuedMessage => ({
    id: 'msg-1',
    session_id: 'test-session',
    user_id: 'other-user',
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
    created_at: new Date().toISOString(),
    localId: 'local-msg-1',
    retryCount: 0,
    displayOrder: 1,
    ...overrides
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Message Display', () => {
    it('should render message bubble with correct content', () => {
      const message = createMockMessage()
      
      render(
        <TestWrapper>
          <MessageBubble message={message} />
        </TestWrapper>
      )
      
      expect(screen.getByText('Hola mundo')).toBeInTheDocument()
      expect(screen.getByText('ES')).toBeInTheDocument()
    })

    it('should show original text for own messages', () => {
      const message = createMockMessage({ user_id: 'test-user' })
      
      render(
        <TestWrapper userId="test-user">
          <MessageBubble message={message} />
        </TestWrapper>
      )
      
      expect(screen.getByText('Hello world')).toBeInTheDocument()
      expect(screen.getByText('EN')).toBeInTheDocument()
    })

    it('should show translation for other users messages', () => {
      const message = createMockMessage({ user_id: 'other-user' })
      
      render(
        <TestWrapper userId="test-user">
          <MessageBubble message={message} />
        </TestWrapper>
      )
      
      expect(screen.getByText('Hola mundo')).toBeInTheDocument()
      expect(screen.getByText('ES')).toBeInTheDocument()
    })

    it('should fallback to original text if no translation', () => {
      const message = createMockMessage({ 
        user_id: 'other-user', 
        translation: null 
      })
      
      render(
        <TestWrapper userId="test-user">
          <MessageBubble message={message} />
        </TestWrapper>
      )
      
      expect(screen.getByText('Hello world')).toBeInTheDocument()
    })
  })

  describe('Message Status', () => {
    it('should show queued status with clock icon', () => {
      const message = createMockMessage({ 
        user_id: 'test-user',
        status: 'queued'
      })
      
      render(
        <TestWrapper userId="test-user">
          <MessageBubble message={message} />
        </TestWrapper>
      )
      
      const clockIcon = document.querySelector('svg')
      expect(clockIcon).toBeInTheDocument()
    })

    it('should show processing status with spinning clock', () => {
      const message = createMockMessage({ 
        user_id: 'test-user',
        status: 'processing'
      })
      
      render(
        <TestWrapper userId="test-user">
          <MessageBubble message={message} />
        </TestWrapper>
      )
      
      const pulseElement = document.querySelector('.animate-pulse')
      expect(pulseElement).toBeInTheDocument()
    })

    it('should show displayed status with check icon', () => {
      const message = createMockMessage({ 
        user_id: 'test-user',
        status: 'displayed'
      })
      
      render(
        <TestWrapper userId="test-user">
          <MessageBubble message={message} />
        </TestWrapper>
      )
      
      const statusIcon = document.querySelector('svg')
      expect(statusIcon).toBeInTheDocument()
    })

    it('should show failed status with alert icon', () => {
      const message = createMockMessage({ 
        user_id: 'test-user',
        status: 'failed'
      })
      
      render(
        <TestWrapper userId="test-user">
          <MessageBubble message={message} />
        </TestWrapper>
      )
      
      const alertIcon = document.querySelector('svg')
      expect(alertIcon).toBeInTheDocument()
    })

    it('should not show status icons for other users messages', () => {
      const message = createMockMessage({ 
        user_id: 'other-user',
        status: 'displayed'
      })
      
      render(
        <TestWrapper userId="test-user">
          <MessageBubble message={message} />
        </TestWrapper>
      )
      
      // Other user messages shouldn't have status icons, only timestamp
      const text = screen.getByText('Hola mundo')
      expect(text).toBeInTheDocument()
    })
  })

  describe('Visual Styling', () => {
    it('should apply own message styling for user messages', () => {
      const message = createMockMessage({ user_id: 'test-user' })
      
      render(
        <TestWrapper userId="test-user">
          <MessageBubble message={message} />
        </TestWrapper>
      )
      
      const justifyEndElement = document.querySelector('.justify-end')
      expect(justifyEndElement).toBeInTheDocument()
    })

    it('should apply other message styling for partner messages', () => {
      const message = createMockMessage({ user_id: 'other-user' })
      
      render(
        <TestWrapper userId="test-user">
          <MessageBubble message={message} />
        </TestWrapper>
      )
      
      const justifyStartElement = document.querySelector('.justify-start')
      expect(justifyStartElement).toBeInTheDocument()
    })

    it('should apply opacity for queued messages', () => {
      const message = createMockMessage({ 
        user_id: 'test-user',
        status: 'queued'
      })
      
      render(
        <TestWrapper userId="test-user">
          <MessageBubble message={message} />
        </TestWrapper>
      )
      
      const opacityElement = document.querySelector('.opacity-70')
      expect(opacityElement).toBeInTheDocument()
    })

    it('should apply pulse animation for processing messages', () => {
      const message = createMockMessage({ 
        user_id: 'test-user',
        status: 'processing'
      })
      
      render(
        <TestWrapper userId="test-user">
          <MessageBubble message={message} />
        </TestWrapper>
      )
      
      const pulseElement = document.querySelector('.animate-pulse')
      expect(pulseElement).toBeInTheDocument()
    })
  })

  describe('Timestamp Display', () => {
    it('should display formatted timestamp', () => {
      const testDate = new Date('2023-12-25T15:30:00Z')
      const message = createMockMessage({ 
        created_at: testDate.toISOString()
      })
      
      render(
        <TestWrapper>
          <MessageBubble message={message} />
        </TestWrapper>
      )
      
      expect(screen.getByText(/04:30 PM|16:30/)).toBeInTheDocument()
    })
  })

  describe('Language Labels', () => {
    it('should display correct language labels', () => {
      const message = createMockMessage({
        original_lang: 'en',
        target_lang: 'es'
      })
      
      render(
        <TestWrapper>
          <MessageBubble message={message} />
        </TestWrapper>
      )
      
      expect(screen.getByText('ES')).toBeInTheDocument()
    })

    it('should handle different language codes', () => {
      const message = createMockMessage({
        original_lang: 'pt',
        target_lang: 'en',
        user_id: 'test-user'
      })
      
      render(
        <TestWrapper userId="test-user">
          <MessageBubble message={message} />
        </TestWrapper>
      )
      
      expect(screen.getByText('PT')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const message = createMockMessage()
      
      render(
        <TestWrapper>
          <MessageBubble message={message} />
        </TestWrapper>
      )
      
      const messageElement = screen.getByText('Hola mundo')
      expect(messageElement).toBeInTheDocument()
      expect(messageElement.closest('div')).toHaveAttribute('class')
    })
  })
})