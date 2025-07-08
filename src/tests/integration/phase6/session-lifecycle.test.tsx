import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { SessionRoom } from '@/features/session/SessionRoom'
import { UserManager } from '@/lib/user/UserManager'

// Mock the entire routing system
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ code: '1234' }),
  }
})

// Mock session services
vi.mock('@/services/supabase', () => ({
  SessionService: {
    joinSession: vi.fn(),
    leaveSession: vi.fn(),
    updateLastActivity: vi.fn(),
    checkSessionActive: vi.fn(),
    subscribeToSession: vi.fn(),
  },
}))

// Mock other services
vi.mock('@/lib/connection-recovery', () => ({
  withRetry: vi.fn((fn) => fn()),
}))

vi.mock('@/lib/performance', () => ({
  performanceLogger: {
    start: vi.fn(),
    end: vi.fn(),
  },
}))

// Mock UserManager
vi.mock('@/lib/user/UserManager', () => ({
  UserManager: {
    getOrCreateUser: vi.fn(),
    addToSessionHistory: vi.fn(),
    getUserId: vi.fn(),
  },
}))

const mockSession = {
  id: 'session-123',
  code: '1234',
  created_at: '2023-01-01T00:00:00.000Z',
  expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
  is_active: true,
  user_count: 2,
  last_activity: new Date().toISOString(),
}

const mockUser = {
  id: 'user-123',
  createdAt: '2023-01-01T00:00:00.000Z',
  language: 'en' as const,
  mode: 'casual' as const,
  isLeft: true,
}

describe('Session Lifecycle Integration', () => {
  let mockSessionService: any
  let mockUserManager: any

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.clearAllTimers()
    vi.useFakeTimers()
    
    mockSessionService = (await import('@/services/supabase')).SessionService
    mockUserManager = UserManager as any
    
    // Setup default mocks
    mockUserManager.getOrCreateUser.mockReturnValue(mockUser)
    mockUserManager.getUserId.mockReturnValue('user-123')
    
    mockSessionService.subscribeToSession.mockReturnValue({
      on: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  test('complete session lifecycle: join to active to leave', async () => {
    mockSessionService.joinSession.mockResolvedValue(mockSession)
    mockSessionService.leaveSession.mockResolvedValue(undefined)
    
    const { container } = render(
      <BrowserRouter>
        <SessionRoom />
      </BrowserRouter>
    )

    // Should show connecting state initially
    expect(screen.getByText('Connecting to session...')).toBeInTheDocument()
    expect(screen.getByText('Session: 1234')).toBeInTheDocument()

    // Wait for successful connection
    await waitFor(() => {
      expect(mockSessionService.joinSession).toHaveBeenCalledWith('1234', 'user-123')
    })

    // Should eventually show the session interface
    await waitFor(() => {
      expect(screen.queryByText('Connecting to session...')).not.toBeInTheDocument()
    }, { timeout: 5000 })

    // Should track session in history
    expect(mockUserManager.addToSessionHistory).toHaveBeenCalledWith('1234')

    // Simulate leave action
    window.confirm = vi.fn().mockReturnValue(true)
    
    const leaveButton = container.querySelector('[data-testid="leave-button"]') || 
                      screen.getByRole('button', { name: /leave/i })
    
    if (leaveButton) {
      fireEvent.click(leaveButton)
      
      await waitFor(() => {
        expect(mockSessionService.leaveSession).toHaveBeenCalledWith('session-123')
        expect(mockNavigate).toHaveBeenCalledWith('/')
      })
    }
  })

  test('handles session join failure gracefully', async () => {
    mockSessionService.joinSession.mockRejectedValue(new Error('Session not found'))
    
    render(
      <BrowserRouter>
        <SessionRoom />
      </BrowserRouter>
    )

    // Should show connecting state initially
    expect(screen.getByText('Connecting to session...')).toBeInTheDocument()

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('Connection Error')).toBeInTheDocument()
      expect(screen.getByText(/Session not found/)).toBeInTheDocument()
    }, { timeout: 5000 })

    // Should provide options to recover
    expect(screen.getByText('Return Home')).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })

  test('handles expired session during use', async () => {
    const expiredSession = {
      ...mockSession,
      is_active: false,
    }

    let subscriptionCallback: (session: any) => void
    mockSessionService.subscribeToSession.mockImplementation((sessionId, callback) => {
      subscriptionCallback = callback
      return {
        on: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
      }
    })

    mockSessionService.joinSession.mockResolvedValue(mockSession)
    
    render(
      <BrowserRouter>
        <SessionRoom />
      </BrowserRouter>
    )

    // Wait for successful connection
    await waitFor(() => {
      expect(mockSessionService.joinSession).toHaveBeenCalled()
    })

    // Simulate session expiry via subscription
    if (subscriptionCallback!) {
      subscriptionCallback(expiredSession)
    }

    // Should show error state
    await waitFor(() => {
      expect(screen.getByText('Connection Error')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  test('shows session info with correct data', async () => {
    mockSessionService.joinSession.mockResolvedValue(mockSession)
    
    render(
      <BrowserRouter>
        <SessionRoom />
      </BrowserRouter>
    )

    // Wait for session to load
    await waitFor(() => {
      expect(mockSessionService.joinSession).toHaveBeenCalled()
    })

    // Should eventually show session info
    await waitFor(() => {
      expect(screen.getByText('1234')).toBeInTheDocument() // Session code
      expect(screen.getByText('2')).toBeInTheDocument() // User count
      expect(screen.getByText('Connected')).toBeInTheDocument() // Connection status
    }, { timeout: 5000 })
  })

  test('handles reconnection attempts', async () => {
    let mockChannel = {
      on: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    }

    mockSessionService.joinSession.mockResolvedValue(mockSession)
    mockSessionService.subscribeToSession.mockReturnValue(mockChannel)
    mockSessionService.checkSessionActive.mockResolvedValue(true)
    
    render(
      <BrowserRouter>
        <SessionRoom />
      </BrowserRouter>
    )

    // Wait for initial connection
    await waitFor(() => {
      expect(mockSessionService.joinSession).toHaveBeenCalled()
    })

    // Simulate disconnect via channel event
    const disconnectHandler = mockChannel.on.mock.calls.find(
      call => call[1]?.event === 'disconnect'
    )?.[2]

    if (disconnectHandler) {
      disconnectHandler()
      
      // Should show reconnecting status
      await waitFor(() => {
        expect(screen.getByText(/Reconnecting/)).toBeInTheDocument()
      })

      // Fast forward to trigger reconnection
      vi.advanceTimersByTime(1000)

      // Should eventually reconnect
      await waitFor(() => {
        expect(mockSessionService.checkSessionActive).toHaveBeenCalledWith('session-123')
      })
    }
  })

  test('prevents accidental page leave with browser warning', async () => {
    mockSessionService.joinSession.mockResolvedValue(mockSession)
    
    const mockPreventDefault = vi.fn()
    const mockEvent = {
      preventDefault: mockPreventDefault,
      returnValue: '',
    }

    render(
      <BrowserRouter>
        <SessionRoom />
      </BrowserRouter>
    )

    // Wait for session to load
    await waitFor(() => {
      expect(mockSessionService.joinSession).toHaveBeenCalled()
    })

    // Simulate beforeunload event
    const beforeUnloadEvent = new Event('beforeunload') as any
    beforeUnloadEvent.preventDefault = mockPreventDefault
    beforeUnloadEvent.returnValue = ''
    
    window.dispatchEvent(beforeUnloadEvent)

    // Should prevent default when session is active
    await waitFor(() => {
      expect(mockPreventDefault).toHaveBeenCalled()
    })
  })

  test('session extension workflow', async () => {
    const expiringSoonSession = {
      ...mockSession,
      expires_at: new Date(Date.now() + 25 * 60 * 1000).toISOString(), // 25 minutes
    }

    mockSessionService.joinSession.mockResolvedValue(expiringSoonSession)
    mockSessionService.extendSession.mockResolvedValue(undefined)
    
    render(
      <BrowserRouter>
        <SessionRoom />
      </BrowserRouter>
    )

    // Wait for session to load
    await waitFor(() => {
      expect(mockSessionService.joinSession).toHaveBeenCalled()
    })

    // Fast forward to trigger expiry warning
    vi.advanceTimersByTime(60000) // 1 minute

    // Should show expiry warning
    await waitFor(() => {
      expect(screen.getByText(/Session expiring soon/)).toBeInTheDocument()
    })

    // Should have extend button
    const extendButton = screen.getByText(/Extend Session/)
    expect(extendButton).toBeInTheDocument()

    // Click extend button
    fireEvent.click(extendButton)

    await waitFor(() => {
      expect(mockSessionService.extendSession).toHaveBeenCalledWith('session-123')
    })
  })
})