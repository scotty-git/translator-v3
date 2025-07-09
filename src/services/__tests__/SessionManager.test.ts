import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SessionManager } from '../SessionManager'
import { supabase } from '@/lib/supabase'
import { ErrorCode } from '@/lib/errors/ErrorCodes'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}))

describe('SessionManager', () => {
  let sessionManager: SessionManager

  beforeEach(() => {
    sessionManager = SessionManager.getInstance()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('generateUserId', () => {
    it('should generate a unique user ID', () => {
      const userId1 = sessionManager.generateUserId()
      const userId2 = sessionManager.generateUserId()
      
      expect(userId1).toBeTruthy()
      expect(userId2).toBeTruthy()
      expect(userId1).not.toBe(userId2)
    })

    it('should use crypto.randomUUID when available', () => {
      const mockUUID = 'test-uuid-1234'
      global.crypto = {
        randomUUID: vi.fn(() => mockUUID)
      } as any

      const userId = sessionManager.generateUserId()
      expect(userId).toBe(mockUUID)
      expect(global.crypto.randomUUID).toHaveBeenCalled()
    })

    it('should fallback when crypto.randomUUID is not available', () => {
      global.crypto = {} as any
      
      const userId = sessionManager.generateUserId()
      expect(userId).toMatch(/^user-\d+-[a-z0-9]+$/)
    })
  })

  describe('generateSessionCode', () => {
    it('should generate a 4-digit code', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ error: { code: 'PGRST116' } })
          })
        })
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect
      } as any)

      const code = await sessionManager.generateSessionCode()
      expect(code).toMatch(/^\d{4}$/)
      expect(parseInt(code)).toBeGreaterThanOrEqual(1000)
      expect(parseInt(code)).toBeLessThanOrEqual(9999)
    })

    it('should retry if code already exists', async () => {
      let callCount = 0
      const mockSelect = vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockImplementation(() => {
              callCount++
              if (callCount === 1) {
                // First call - code exists
                return Promise.resolve({ data: { id: 'existing-session' }, error: null })
              } else {
                // Second call - code available
                return Promise.resolve({ error: { code: 'PGRST116' } })
              }
            })
          })
        })
      }))

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect
      } as any)

      const code = await sessionManager.generateSessionCode()
      expect(code).toMatch(/^\d{4}$/)
      expect(callCount).toBe(2) // Should have been called twice
    })

    it('should throw error after max attempts', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'existing-session' }, error: null })
          })
        })
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect
      } as any)

      await expect(sessionManager.generateSessionCode()).rejects.toThrow(
        'Unable to generate unique session code after 50 attempts'
      )
    })
  })

  describe('createSession', () => {
    it('should create a new session successfully', async () => {
      const mockSessionId = 'test-session-id'
      const mockCode = '1234'

      // Mock code generation
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ error: { code: 'PGRST116' } })
          })
        })
      })

      // Mock session creation
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: mockSessionId, code: mockCode },
            error: null
          })
        })
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'sessions') {
          return {
            select: mockSelect,
            insert: mockInsert
          } as any
        }
        return {} as any
      })

      const result = await sessionManager.createSession()
      
      expect(result.sessionId).toBe(mockSessionId)
      expect(result.code).toBe(mockCode)
      expect(mockInsert).toHaveBeenCalledWith({
        code: expect.stringMatching(/^\d{4}$/),
        is_active: true
      })
    })

    it('should handle database errors', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ error: { code: 'PGRST116' } })
          })
        })
      })

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          })
        })
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'sessions') {
          return {
            select: mockSelect,
            insert: mockInsert
          } as any
        }
        return {} as any
      })

      await expect(sessionManager.createSession()).rejects.toThrow()
    })
  })

  describe('joinSession', () => {
    it('should join an existing session successfully', async () => {
      const mockSessionId = 'test-session-id'
      const mockCode = '1234'

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockSessionId,
                is_active: true,
                expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString()
              },
              error: null
            })
          })
        })
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'sessions') {
          return {
            select: mockSelect
          } as any
        }
        if (table === 'session_participants') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          } as any
        }
        return {} as any
      })

      const result = await sessionManager.joinSession(mockCode)
      expect(result.sessionId).toBe(mockSessionId)
      expect(result.partnerId).toBeUndefined()
    })

    it('should validate code format', async () => {
      await expect(sessionManager.joinSession('abc')).rejects.toThrow()
      await expect(sessionManager.joinSession('12345')).rejects.toThrow()
    })

    it('should handle session not found', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }
            })
          })
        })
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect
      } as any)

      await expect(sessionManager.joinSession('1234')).rejects.toThrow()
    })

    it('should handle expired sessions', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'test-session',
                is_active: true,
                expires_at: new Date(Date.now() - 1000).toISOString() // Expired
              },
              error: null
            })
          })
        })
      })

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'sessions') {
          return {
            select: mockSelect,
            update: mockUpdate
          } as any
        }
        return {} as any
      })

      await expect(sessionManager.joinSession('1234')).rejects.toThrow()
      expect(mockUpdate).toHaveBeenCalledWith({ is_active: false })
    })

    it('should handle full sessions', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'test-session',
                is_active: true,
                expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString()
              },
              error: null
            })
          })
        })
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'sessions') {
          return {
            select: mockSelect
          } as any
        }
        if (table === 'session_participants') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  { user_id: 'user1' },
                  { user_id: 'user2' }
                ],
                error: null
              })
            })
          } as any
        }
        return {} as any
      })

      await expect(sessionManager.joinSession('1234')).rejects.toThrow()
    })
  })

  describe('addParticipant', () => {
    it('should add participant successfully', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null })

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      } as any)

      await sessionManager.addParticipant('session-id', 'user-id')
      
      expect(mockInsert).toHaveBeenCalledWith({
        session_id: 'session-id',
        user_id: 'user-id',
        is_online: true
      })
    })

    it('should update if participant already exists', async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        error: { code: '23505' } // Duplicate key error
      })

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      })

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
        update: mockUpdate
      } as any)

      await sessionManager.addParticipant('session-id', 'user-id')
      
      expect(mockUpdate).toHaveBeenCalledWith({
        is_online: true,
        last_seen: expect.any(String)
      })
    })
  })

  describe('validateSession', () => {
    it('should return true for valid active session', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'test-session',
                is_active: true,
                expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString()
              },
              error: null
            })
          })
        })
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect
      } as any)

      const isValid = await sessionManager.validateSession('1234')
      expect(isValid).toBe(true)
    })

    it('should return false for expired session', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'test-session',
                is_active: true,
                expires_at: new Date(Date.now() - 1000).toISOString()
              },
              error: null
            })
          })
        })
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect
      } as any)

      const isValid = await sessionManager.validateSession('1234')
      expect(isValid).toBe(false)
    })
  })

  describe('checkSessionExpiry', () => {
    it('should return false for non-expired session', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString()
            },
            error: null
          })
        })
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect
      } as any)

      const isExpired = await sessionManager.checkSessionExpiry('session-id')
      expect(isExpired).toBe(false)
    })

    it('should return true for expired session', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              expires_at: new Date(Date.now() - 1000).toISOString()
            },
            error: null
          })
        })
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect
      } as any)

      const isExpired = await sessionManager.checkSessionExpiry('session-id')
      expect(isExpired).toBe(true)
    })
  })

  describe('getSessionByCode', () => {
    it('should return session details for valid code', async () => {
      const mockSession = {
        id: 'test-session',
        code: '1234',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString()
      }

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockSession,
              error: null
            })
          })
        })
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect
      } as any)

      const session = await sessionManager.getSessionByCode('1234')
      expect(session).toEqual({
        id: mockSession.id,
        code: mockSession.code,
        createdAt: mockSession.created_at,
        expiresAt: mockSession.expires_at
      })
    })

    it('should return null for invalid code', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }
            })
          })
        })
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect
      } as any)

      const session = await sessionManager.getSessionByCode('9999')
      expect(session).toBeNull()
    })
  })
})