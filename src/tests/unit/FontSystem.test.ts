import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { UserManager } from '@/lib/user/UserManager'

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

// Mock crypto.randomUUID
Object.defineProperty(window, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-1234'
  }
})

describe('Font System', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
    document.documentElement.style.cssText = ''
  })

  afterEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
    document.documentElement.style.cssText = ''
  })

  describe('UserManager Font Size Management', () => {
    it('should return default font size as medium', () => {
      const fontSize = UserManager.getFontSize()
      expect(fontSize).toBe('medium')
    })

    it('should set and persist font size', () => {
      UserManager.setFontSize('large')
      expect(UserManager.getFontSize()).toBe('large')
      expect(localStorage.getItem('translator-preference-fontSize')).toBe('"large"')
    })

    it('should cycle through font sizes correctly', () => {
      // Start with default medium
      expect(UserManager.getFontSize()).toBe('medium')
      
      // Cycle to large
      let newSize = UserManager.cycleFontSize()
      expect(newSize).toBe('large')
      
      // Cycle to xl
      newSize = UserManager.cycleFontSize()
      expect(newSize).toBe('xl')
      
      // Cycle back to small
      newSize = UserManager.cycleFontSize()
      expect(newSize).toBe('small')
      
      // Cycle to medium
      newSize = UserManager.cycleFontSize()
      expect(newSize).toBe('medium')
    })

    it('should apply font size to document correctly', () => {
      UserManager.setFontSize('xl')
      
      // Check CSS custom properties
      expect(document.documentElement.style.getPropertyValue('--font-size-mobile')).toBe('24px')
      expect(document.documentElement.style.getPropertyValue('--font-size-desktop')).toBe('28px')
      
      // Check CSS class
      expect(document.documentElement.classList.contains('font-xl')).toBe(true)
      expect(document.documentElement.classList.contains('font-medium')).toBe(false)
    })

    it('should initialize font size on app load', () => {
      // Set a font size first
      UserManager.setFontSize('small')
      
      // Clear document styles
      document.documentElement.className = ''
      document.documentElement.style.cssText = ''
      
      // Initialize should restore the font size
      UserManager.initializeFontSize()
      
      expect(document.documentElement.style.getPropertyValue('--font-size-mobile')).toBe('14px')
      expect(document.documentElement.style.getPropertyValue('--font-size-desktop')).toBe('16px')
      expect(document.documentElement.classList.contains('font-small')).toBe(true)
    })

    it('should provide correct display names for font sizes', () => {
      expect(UserManager.getFontSizeDisplayName('small')).toBe('Small')
      expect(UserManager.getFontSizeDisplayName('medium')).toBe('Medium')
      expect(UserManager.getFontSizeDisplayName('large')).toBe('Large')
      expect(UserManager.getFontSizeDisplayName('xl')).toBe('Extra Large')
    })

    it('should handle invalid font sizes gracefully', () => {
      // Set an invalid size through localStorage
      localStorage.setItem('translator-preference-fontSize', '"invalid"')
      
      // Should fall back to default
      expect(UserManager.getFontSize()).toBe('medium')
    })
  })

  describe('Font Size CSS System', () => {
    const fontSizeMap = {
      small: { mobile: '14px', desktop: '16px' },
      medium: { mobile: '16px', desktop: '18px' },
      large: { mobile: '20px', desktop: '22px' },
      xl: { mobile: '24px', desktop: '28px' }
    }

    Object.entries(fontSizeMap).forEach(([size, { mobile, desktop }]) => {
      it(`should apply correct CSS values for ${size} font size`, () => {
        UserManager.setFontSize(size as any)
        
        expect(document.documentElement.style.getPropertyValue('--font-size-mobile')).toBe(mobile)
        expect(document.documentElement.style.getPropertyValue('--font-size-desktop')).toBe(desktop)
        expect(document.documentElement.classList.contains(`font-${size}`)).toBe(true)
      })
    })

    it('should remove previous font size classes when setting new size', () => {
      UserManager.setFontSize('small')
      expect(document.documentElement.classList.contains('font-small')).toBe(true)
      
      UserManager.setFontSize('large')
      expect(document.documentElement.classList.contains('font-small')).toBe(false)
      expect(document.documentElement.classList.contains('font-large')).toBe(true)
    })
  })

  describe('Font Size Persistence', () => {
    it('should persist font size across browser sessions', () => {
      UserManager.setFontSize('xl')
      
      // Simulate page reload by clearing document but keeping localStorage
      document.documentElement.className = ''
      document.documentElement.style.cssText = ''
      
      // Initialize again (like on page load)
      UserManager.initializeFontSize()
      
      expect(UserManager.getFontSize()).toBe('xl')
      expect(document.documentElement.classList.contains('font-xl')).toBe(true)
    })

    it('should handle localStorage corruption gracefully', () => {
      // Corrupt the localStorage value
      localStorage.setItem('translator-preference-fontSize', 'invalid-json')
      
      // Should return default and not throw
      expect(() => UserManager.getFontSize()).not.toThrow()
      expect(UserManager.getFontSize()).toBe('medium')
    })
  })
})