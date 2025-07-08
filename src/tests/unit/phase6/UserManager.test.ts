import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { UserManager } from '@/lib/user/UserManager'

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => '12345678-1234-1234-1234-123456789abc'),
  },
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

// Mock navigator.language
Object.defineProperty(navigator, 'language', {
  writable: true,
  value: 'en-US',
})

describe('UserManager', () => {
  beforeEach(() => {
    // Clear all mocks and localStorage
    vi.clearAllMocks()
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
    })
    
    // Reset localStorage mock to return null by default
    localStorageMock.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getOrCreateUser', () => {
    test('creates new user with unique ID when no stored user exists', () => {
      const user = UserManager.getOrCreateUser()
      
      expect(user.id).toBe('12345678-1234-1234-1234-123456789abc') // Mocked UUID
      expect(user.language).toBe('en')
      expect(user.mode).toBe('casual')
      expect(typeof user.isLeft).toBe('boolean')
      expect(user.createdAt).toBeDefined()
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'translator-user',
        JSON.stringify(user)
      )
    })

    test('returns existing user when valid user data is stored', () => {
      const existingUser = {
        id: 'test-uuid',
        createdAt: '2023-01-01T00:00:00.000Z',
        language: 'es',
        mode: 'fun',
        isLeft: true,
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingUser))
      
      const user = UserManager.getOrCreateUser()
      
      expect(user).toEqual(existingUser)
      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })

    test('creates new user when stored data is invalid', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json')
      
      const user = UserManager.getOrCreateUser()
      
      expect(user.id).toBe('12345678-1234-1234-1234-123456789abc')
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    test('creates new user when stored user object is missing required fields', () => {
      const invalidUser = {
        id: 'test-uuid',
        // Missing required fields
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(invalidUser))
      
      const user = UserManager.getOrCreateUser()
      
      expect(user.id).toBe('12345678-1234-1234-1234-123456789abc')
      expect(user.language).toBe('en')
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })
  })

  describe('updateUser', () => {
    test('updates user preferences and returns updated user', () => {
      const existingUser = {
        id: 'test-uuid',
        createdAt: '2023-01-01T00:00:00.000Z',
        language: 'en',
        mode: 'casual',
        isLeft: true,
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingUser))
      
      const updates = { language: 'es', mode: 'fun' } as const
      const updatedUser = UserManager.updateUser(updates)
      
      expect(updatedUser.language).toBe('es')
      expect(updatedUser.mode).toBe('fun')
      expect(updatedUser.id).toBe('test-uuid') // ID should remain unchanged
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'translator-user',
        JSON.stringify(updatedUser)
      )
    })

    test('throws error when trying to update with invalid data', () => {
      const existingUser = {
        id: 'test-uuid',
        createdAt: '2023-01-01T00:00:00.000Z',
        language: 'en',
        mode: 'casual',
        isLeft: true,
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingUser))
      
      expect(() => {
        UserManager.updateUser({ language: 'invalid-lang' as any })
      }).toThrow('Invalid user data provided')
    })
  })

  describe('language detection', () => {
    test('detects Spanish from browser language', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'es-ES',
      })
      
      const user = UserManager.getOrCreateUser()
      expect(user.language).toBe('es')
    })

    test('detects Portuguese from browser language', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'pt-BR',
      })
      
      const user = UserManager.getOrCreateUser()
      expect(user.language).toBe('pt')
    })

    test('defaults to English for unsupported languages', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'fr-FR',
      })
      
      const user = UserManager.getOrCreateUser()
      expect(user.language).toBe('en')
    })
  })

  describe('session history', () => {
    test('adds session to history correctly', () => {
      localStorageMock.getItem.mockReturnValue('[]')
      
      UserManager.addToSessionHistory('1234')
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'translator-session-history',
        expect.stringContaining('"code":"1234"')
      )
    })

    test('moves existing session to front when added again', () => {
      const existingHistory = [
        { code: '5678', joinedAt: '2023-01-01T00:00:00.000Z' },
        { code: '1234', joinedAt: '2023-01-01T01:00:00.000Z' },
      ]
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingHistory))
      
      UserManager.addToSessionHistory('1234')
      
      const savedHistory = JSON.parse(
        localStorageMock.setItem.mock.calls.find(
          call => call[0] === 'translator-session-history'
        )?.[1] || '[]'
      )
      
      expect(savedHistory[0].code).toBe('1234') // Should be first
      expect(savedHistory).toHaveLength(2)
    })

    test('limits history to maximum entries', () => {
      const existingHistory = Array.from({ length: 10 }, (_, i) => ({
        code: String(i).padStart(4, '0'),
        joinedAt: '2023-01-01T00:00:00.000Z',
      }))
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingHistory))
      
      UserManager.addToSessionHistory('9999')
      
      const savedHistory = JSON.parse(
        localStorageMock.setItem.mock.calls.find(
          call => call[0] === 'translator-session-history'
        )?.[1] || '[]'
      )
      
      expect(savedHistory).toHaveLength(10) // Should not exceed limit
      expect(savedHistory[0].code).toBe('9999') // New session should be first
    })

    test('ignores invalid session codes', () => {
      UserManager.addToSessionHistory('invalid')
      UserManager.addToSessionHistory('')
      
      expect(localStorageMock.setItem).not.toHaveBeenCalledWith(
        'translator-session-history',
        expect.any(String)
      )
    })

    test('returns empty array when no history exists', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      const history = UserManager.getSessionHistory()
      expect(history).toEqual([])
    })

    test('filters out invalid history entries', () => {
      const mixedHistory = [
        { code: '1234', joinedAt: '2023-01-01T00:00:00.000Z' }, // Valid
        { code: 'invalid', joinedAt: '2023-01-01T00:00:00.000Z' }, // Invalid code
        { invalidField: 'value' }, // Invalid structure
        { code: '5678', joinedAt: '2023-01-01T00:00:00.000Z' }, // Valid
      ]
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mixedHistory))
      
      const history = UserManager.getSessionHistory()
      expect(history).toHaveLength(2)
      expect(history[0].code).toBe('1234')
      expect(history[1].code).toBe('5678')
    })
  })

  describe('utility methods', () => {
    test('getUserId returns current user ID', () => {
      const existingUser = {
        id: 'test-uuid',
        createdAt: '2023-01-01T00:00:00.000Z',
        language: 'en',
        mode: 'casual',
        isLeft: true,
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingUser))
      
      const userId = UserManager.getUserId()
      expect(userId).toBe('test-uuid')
    })

    test('clearSessionHistory removes all history', () => {
      UserManager.clearSessionHistory()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('translator-session-history')
    })

    test('removeFromSessionHistory removes specific session', () => {
      const existingHistory = [
        { code: '1234', joinedAt: '2023-01-01T00:00:00.000Z' },
        { code: '5678', joinedAt: '2023-01-01T01:00:00.000Z' },
      ]
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingHistory))
      
      UserManager.removeFromSessionHistory('1234')
      
      const savedHistory = JSON.parse(
        localStorageMock.setItem.mock.calls.find(
          call => call[0] === 'translator-session-history'
        )?.[1] || '[]'
      )
      
      expect(savedHistory).toHaveLength(1)
      expect(savedHistory[0].code).toBe('5678')
    })

    test('getLanguageName returns correct display names', () => {
      expect(UserManager.getLanguageName('en')).toBe('English')
      expect(UserManager.getLanguageName('es')).toBe('Español')
      expect(UserManager.getLanguageName('pt')).toBe('Português')
    })

    test('getModeName returns correct display names', () => {
      expect(UserManager.getModeName('casual')).toBe('Casual')
      expect(UserManager.getModeName('fun')).toBe('Fun with Emojis')
    })

    test('resetUser clears all user data', () => {
      UserManager.resetUser()
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('translator-user')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('translator-session-history')
    })
  })
})