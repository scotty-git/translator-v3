import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useNavigate, useLocation } from 'react-router-dom'
import { SessionTranslator } from '../SessionTranslator'

// Mock dependencies
const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: vi.fn()
  }
})

vi.mock('../solo/SoloTranslator', () => {
  const MockSoloTranslator = ({ onNewMessage, messages, isSessionMode }: any) => {
    // This mock simulates the SoloTranslator behavior
    const handleAddMessage = () => {
      if (onNewMessage) {
        onNewMessage({ 
          id: 'test-msg', 
          original: 'test',
          translation: null,
          status: 'processing',
          session_id: 'test',
          user_id: 'test',
          queued_at: new Date().toISOString(),
          processed_at: null,
          displayed_at: null,
          performance_metrics: null,
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString(),
          original_lang: 'en',
          target_lang: 'es'
        })
      }
    }
    
    return (
      <div data-testid="solo-translator">
        <div>Messages: {messages?.length || 0}</div>
        <div>Session Mode: {isSessionMode ? 'true' : 'false'}</div>
        <button onClick={handleAddMessage}>
          Add Message
        </button>
      </div>
    )
  }
  
  return {
    default: MockSoloTranslator,
    SoloTranslator: MockSoloTranslator
  }
})

vi.mock('@/components/SessionHeader', () => ({
  SessionHeader: ({ code, status, partnerOnline }: any) => (
    <div data-testid="session-header">
      <div>Code: {code}</div>
      <div>Status: {status}</div>
      <div>Partner: {partnerOnline ? 'online' : 'offline'}</div>
    </div>
  )
}))

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: any) => <div data-testid="layout">{children}</div>
}))

describe('SessionTranslator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('redirects to home when no session state', () => {
    vi.mocked(useLocation).mockReturnValue({
      state: null,
      pathname: '/session',
      search: '',
      hash: '',
      key: 'test'
    })
    
    render(
      <MemoryRouter>
        <SessionTranslator />
      </MemoryRouter>
    )
    
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it.skip('loads session from localStorage', async () => {
    const sessionState = {
      sessionId: 'test-session-id',
      sessionCode: '1234',
      userId: 'test-user-id',
      role: 'host' as const
    }
    
    // Set localStorage before mocking location
    localStorage.setItem('activeSession', JSON.stringify(sessionState))
    
    vi.mocked(useLocation).mockReturnValue({
      state: null,
      pathname: '/session',
      search: '',
      hash: '',
      key: 'test'
    })
    
    render(
      <MemoryRouter>
        <SessionTranslator />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByTestId('session-header')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Code: 1234')).toBeInTheDocument()
  })

  it('loads session from location state', async () => {
    const sessionState = {
      sessionId: 'location-session-id',
      sessionCode: '5678',
      userId: 'location-user-id',
      role: 'guest' as const
    }
    
    vi.mocked(useLocation).mockReturnValue({
      state: sessionState,
      pathname: '/session',
      search: '',
      hash: '',
      key: 'test'
    })
    
    render(
      <MemoryRouter>
        <SessionTranslator />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByTestId('session-header')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Code: 5678')).toBeInTheDocument()
  })

  it('simulates connection status changes', async () => {
    const sessionState = {
      sessionId: 'test-session-id',
      sessionCode: '1234',
      userId: 'test-user-id',
      role: 'host' as const
    }
    
    vi.mocked(useLocation).mockReturnValue({
      state: sessionState,
      pathname: '/session',
      search: '',
      hash: '',
      key: 'test'
    })
    
    render(
      <MemoryRouter>
        <SessionTranslator />
      </MemoryRouter>
    )
    
    // Initially connecting
    expect(screen.getByText('Status: connecting')).toBeInTheDocument()
    
    // Wait for connection simulation
    await waitFor(() => {
      expect(screen.getByText('Status: connected')).toBeInTheDocument()
    }, { timeout: 2000 })
    
    // Wait for partner simulation
    await waitFor(() => {
      expect(screen.getByText('Partner: online')).toBeInTheDocument()
    }, { timeout: 4000 })
  })

  it('handles new messages with session context', async () => {
    const sessionState = {
      sessionId: 'test-session-id',
      sessionCode: '1234',
      userId: 'test-user-id',
      role: 'host' as const
    }
    
    vi.mocked(useLocation).mockReturnValue({
      state: sessionState,
      pathname: '/session',
      search: '',
      hash: '',
      key: 'test'
    })
    
    const { rerender } = render(
      <MemoryRouter>
        <SessionTranslator />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByTestId('solo-translator')).toBeInTheDocument()
    })
    
    // Click button to trigger onNewMessage
    const addButton = screen.getByText('Add Message')
    
    await waitFor(() => {
      addButton.click()
    })
    
    // Force re-render and wait for update
    rerender(
      <MemoryRouter>
        <SessionTranslator />
      </MemoryRouter>
    )
    
    // Check message count increased
    await waitFor(() => {
      expect(screen.getByText('Messages: 1')).toBeInTheDocument()
    })
  })

  it('passes session mode flag to SingleDeviceTranslator', async () => {
    const sessionState = {
      sessionId: 'test-session-id',
      sessionCode: '1234',
      userId: 'test-user-id',
      role: 'host' as const
    }
    
    vi.mocked(useLocation).mockReturnValue({
      state: sessionState,
      pathname: '/session',
      search: '',
      hash: '',
      key: 'test'
    })
    
    render(
      <MemoryRouter>
        <SessionTranslator />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByTestId('solo-translator')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Session Mode: true')).toBeInTheDocument()
  })

  it('handles message updates correctly', async () => {
    const sessionState = {
      sessionId: 'test-session-id',
      sessionCode: '1234',
      userId: 'test-user-id',
      role: 'host' as const
    }
    
    vi.mocked(useLocation).mockReturnValue({
      state: sessionState,
      pathname: '/session',
      search: '',
      hash: '',
      key: 'test'
    })
    
    const { rerender } = render(
      <MemoryRouter>
        <SessionTranslator />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByTestId('solo-translator')).toBeInTheDocument()
    })
    
    const addButton = screen.getByText('Add Message')
    
    // Add first message
    await waitFor(() => {
      addButton.click()
    })
    
    rerender(
      <MemoryRouter>
        <SessionTranslator />
      </MemoryRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText('Messages: 1')).toBeInTheDocument()
    })
    
    // Add another message with same ID - should update, not add
    await waitFor(() => {
      addButton.click()
    })
    
    rerender(
      <MemoryRouter>
        <SessionTranslator />
      </MemoryRouter>
    )
    
    // Should still be 1 because same ID
    expect(screen.getByText('Messages: 1')).toBeInTheDocument()
  })
})