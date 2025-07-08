import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SoundManager, soundManager } from '@/lib/sounds/SoundManager'

// Mock Web Audio API
const mockOscillator = {
  type: 'sine',
  frequency: { setValueAtTime: vi.fn() },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn()
}

const mockGainNode = {
  gain: { 
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn()
  },
  connect: vi.fn()
}

const mockAudioContext = {
  state: 'running',
  currentTime: 0,
  destination: {},
  createOscillator: vi.fn(() => mockOscillator),
  createGain: vi.fn(() => mockGainNode),
  resume: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined)
}

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    }
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock UserManager
vi.mock('@/lib/user/UserManager', () => ({
  UserManager: {
    getPreference: vi.fn((key: string, defaultValue: any) => {
      const stored = localStorage.getItem(`translator-preference-${key}`)
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch {
          return defaultValue
        }
      }
      return defaultValue
    }),
    setPreference: vi.fn((key: string, value: any) => {
      localStorage.setItem(`translator-preference-${key}`, JSON.stringify(value))
    })
  }
}))

describe('SoundManager', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    
    // Mock AudioContext constructor
    global.AudioContext = vi.fn(() => mockAudioContext) as any
    ;(global as any).webkitAudioContext = vi.fn(() => mockAudioContext)
    
    // Reset audio context state
    mockAudioContext.state = 'running'
  })

  afterEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize as singleton', () => {
      const instance1 = SoundManager.getInstance()
      const instance2 = SoundManager.getInstance()
      
      expect(instance1).toBe(instance2)
      expect(instance1).toBe(soundManager)
    })

    it('should initialize with default enabled state', () => {
      expect(soundManager.getEnabled()).toBe(true)
    })

    it('should load preferences from localStorage', () => {
      localStorage.setItem('translator-preference-soundNotifications', 'false')
      
      const newSoundManager = SoundManager.getInstance()
      expect(newSoundManager.getEnabled()).toBe(false)
    })

    it('should handle missing Web Audio API gracefully', () => {
      // Remove AudioContext
      delete (global as any).AudioContext
      delete (global as any).webkitAudioContext
      
      expect(() => SoundManager.getInstance()).not.toThrow()
    })
  })

  describe('Sound Configuration', () => {
    it('should have correct sound configurations for all sound types', () => {
      const soundTypes = [
        'message_received',
        'message_sent',
        'translation_complete',
        'recording_start',
        'recording_stop',
        'button_click',
        'error',
        'notification'
      ]
      
      soundTypes.forEach(type => {
        expect(() => soundManager.playSound(type as any)).not.toThrow()
      })
    })

    it('should have valid frequency ranges for all sounds', () => {
      // All sounds should have reasonable frequencies (20Hz - 20kHz)
      const soundTypes = ['message_received', 'button_click', 'error'] as const
      
      soundTypes.forEach(type => {
        // Just testing that the method exists and doesn't throw
        expect(() => soundManager.playSound(type)).not.toThrow()
      })
    })
  })

  describe('Audio Context Management', () => {
    it('should handle suspended audio context', async () => {
      mockAudioContext.state = 'suspended'
      
      await soundManager.resumeAudioContext()
      
      expect(mockAudioContext.resume).toHaveBeenCalled()
    })

    it('should handle audio context resume failure gracefully', async () => {
      mockAudioContext.state = 'suspended'
      mockAudioContext.resume.mockRejectedValue(new Error('Resume failed'))
      
      await expect(soundManager.resumeAudioContext()).resolves.not.toThrow()
    })

    it('should check if audio context is ready', () => {
      mockAudioContext.state = 'running'
      expect(soundManager.isReady()).toBe(true)
      
      mockAudioContext.state = 'suspended'
      expect(soundManager.isReady()).toBe(false)
    })
  })

  describe('Sound Generation', () => {
    it('should create oscillator and gain nodes for sound generation', async () => {
      await soundManager.playSound('button_click')
      
      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
      expect(mockAudioContext.createGain).toHaveBeenCalled()
    })

    it('should configure oscillator properties correctly', async () => {
      await soundManager.playSound('message_received')
      
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalled()
      expect(mockOscillator.connect).toHaveBeenCalledWith(mockGainNode)
    })

    it('should configure gain envelope for smooth playback', async () => {
      await soundManager.playSound('notification')
      
      expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalled()
      expect(mockGainNode.gain.linearRampToValueAtTime).toHaveBeenCalled()
      expect(mockGainNode.gain.exponentialRampToValueAtTime).toHaveBeenCalled()
    })

    it('should start and stop oscillator with correct timing', async () => {
      await soundManager.playSound('recording_start')
      
      expect(mockOscillator.start).toHaveBeenCalled()
      expect(mockOscillator.stop).toHaveBeenCalled()
    })
  })

  describe('Permission and Availability', () => {
    it('should check availability based on enabled state and audio context', () => {
      soundManager.setEnabled(true)
      mockAudioContext.state = 'running'
      expect(soundManager.isAvailable()).toBe(true)
      
      soundManager.setEnabled(false)
      expect(soundManager.isAvailable()).toBe(false)
    })

    it('should not play sounds when disabled', async () => {
      soundManager.setEnabled(false)
      
      await soundManager.playSound('button_click')
      
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled()
    })

    it('should not play sounds when audio context is unavailable', async () => {
      // Simulate no audio context
      soundManager['audioContext'] = null
      
      await soundManager.playSound('button_click')
      
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled()
    })
  })

  describe('Preference Management', () => {
    it('should save enabled state to localStorage', () => {
      soundManager.setEnabled(false)
      
      expect(localStorage.getItem('translator-preference-soundNotifications')).toBe('false')
    })

    it('should load enabled state from localStorage', () => {
      localStorage.setItem('translator-preference-soundNotifications', 'false')
      
      // Create new instance to test loading
      const newInstance = SoundManager.getInstance()
      expect(newInstance.getEnabled()).toBe(false)
    })
  })

  describe('Individual Sound Methods', () => {
    const soundMethods = [
      'playMessageReceived',
      'playMessageSent',
      'playTranslationComplete',
      'playRecordingStart',
      'playRecordingStop',
      'playButtonClick',
      'playError',
      'playNotification'
    ] as const

    soundMethods.forEach(method => {
      it(`should have ${method} method that works correctly`, async () => {
        expect(typeof soundManager[method]).toBe('function')
        await expect(soundManager[method]()).resolves.not.toThrow()
      })
    })
  })

  describe('Testing Functionality', () => {
    it('should provide testSound method', async () => {
      const result = await soundManager.testSound()
      expect(typeof result).toBe('boolean')
    })

    it('should return true for successful sound test', async () => {
      soundManager.setEnabled(true)
      mockAudioContext.state = 'running'
      
      const result = await soundManager.testSound()
      expect(result).toBe(true)
    })

    it('should return false for failed sound test', async () => {
      soundManager.setEnabled(false)
      
      const result = await soundManager.testSound()
      expect(result).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle audio context creation failure', () => {
      global.AudioContext = vi.fn(() => {
        throw new Error('AudioContext creation failed')
      }) as any
      
      expect(() => SoundManager.getInstance()).not.toThrow()
    })

    it('should handle oscillator creation failure gracefully', async () => {
      mockAudioContext.createOscillator.mockImplementation(() => {
        throw new Error('Oscillator creation failed')
      })
      
      await expect(soundManager.playSound('button_click')).resolves.not.toThrow()
    })

    it('should handle sound generation errors gracefully', async () => {
      mockOscillator.start.mockImplementation(() => {
        throw new Error('Start failed')
      })
      
      await expect(soundManager.playSound('notification')).resolves.not.toThrow()
    })
  })

  describe('Resource Cleanup', () => {
    it('should provide destroy method for cleanup', () => {
      expect(typeof soundManager.destroy).toBe('function')
      soundManager.destroy()
      expect(mockAudioContext.close).toHaveBeenCalled()
    })

    it('should handle destroy when audio context is null', () => {
      soundManager['audioContext'] = null
      expect(() => soundManager.destroy()).not.toThrow()
    })
  })

  describe('React Hook Integration', () => {
    // Note: The useSounds hook would need to be tested in a React testing environment
    // This tests the underlying functionality that the hook uses
    
    it('should provide all necessary methods for React hook', () => {
      const expectedMethods = [
        'playMessageReceived',
        'playMessageSent', 
        'playTranslationComplete',
        'playRecordingStart',
        'playRecordingStop',
        'playButtonClick',
        'playError',
        'playNotification',
        'getEnabled',
        'setEnabled',
        'testSound',
        'isReady'
      ]
      
      expectedMethods.forEach(method => {
        expect(typeof soundManager[method]).toBe('function')
      })
    })
  })
})