export interface User {
  id: string
  createdAt: string
  language: 'en' | 'es' | 'pt'
  mode: 'casual' | 'fun'
  isLeft: boolean
}

export interface SessionHistoryEntry {
  code: string
  joinedAt: string
}

export class UserManager {
  private static readonly USER_KEY = 'translator-user'
  private static readonly SESSION_HISTORY_KEY = 'translator-session-history'
  private static readonly MAX_HISTORY_ENTRIES = 10

  /**
   * Get or create persistent user profile
   */
  static getOrCreateUser(): User {
    const stored = localStorage.getItem(this.USER_KEY)
    
    if (stored) {
      try {
        const user = JSON.parse(stored)
        // Validate user object structure
        if (this.isValidUser(user)) {
          return user
        }
        console.warn('Invalid user data found, creating new user')
      } catch (e) {
        console.error('Failed to parse user data:', e)
      }
    }
    
    // Create new user
    const newUser: User = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      language: this.detectUserLanguage(),
      mode: 'casual',
      isLeft: Math.random() > 0.5,
    }
    
    localStorage.setItem(this.USER_KEY, JSON.stringify(newUser))
    return newUser
  }

  /**
   * Update user preferences
   */
  static updateUser(updates: Partial<User>): User {
    const current = this.getOrCreateUser()
    const updated = { ...current, ...updates }
    
    // Validate updated user
    if (!this.isValidUser(updated)) {
      throw new Error('Invalid user data provided')
    }
    
    localStorage.setItem(this.USER_KEY, JSON.stringify(updated))
    return updated
  }

  /**
   * Get current user ID (backwards compatibility)
   */
  static getUserId(): string {
    return this.getOrCreateUser().id
  }

  /**
   * Detect user language from browser settings
   */
  private static detectUserLanguage(): 'en' | 'es' | 'pt' {
    // Always default to English as requested by user
    return 'en'
  }

  /**
   * Validate user object structure
   */
  private static isValidUser(user: any): user is User {
    return (
      user &&
      typeof user.id === 'string' &&
      typeof user.createdAt === 'string' &&
      ['en', 'es', 'pt'].includes(user.language) &&
      ['casual', 'fun'].includes(user.mode) &&
      typeof user.isLeft === 'boolean'
    )
  }

  /**
   * Add session to history
   */
  static addToSessionHistory(sessionCode: string): void {
    if (!sessionCode || sessionCode.length !== 4) {
      console.warn('Invalid session code provided for history')
      return
    }

    const history = this.getSessionHistory()
    
    // Remove existing entry for this code
    const filtered = history.filter(h => h.code !== sessionCode)
    
    // Add new entry at the beginning
    const updated = [
      { code: sessionCode, joinedAt: new Date().toISOString() },
      ...filtered
    ].slice(0, this.MAX_HISTORY_ENTRIES)
    
    localStorage.setItem(this.SESSION_HISTORY_KEY, JSON.stringify(updated))
  }

  /**
   * Get session history
   */
  static getSessionHistory(): SessionHistoryEntry[] {
    const stored = localStorage.getItem(this.SESSION_HISTORY_KEY)
    
    if (stored) {
      try {
        const history = JSON.parse(stored)
        if (Array.isArray(history)) {
          // Validate and filter valid entries
          return history
            .filter(this.isValidHistoryEntry)
            .slice(0, this.MAX_HISTORY_ENTRIES)
        }
      } catch (e) {
        console.error('Failed to parse session history:', e)
      }
    }
    
    return []
  }

  /**
   * Clear session history
   */
  static clearSessionHistory(): void {
    localStorage.removeItem(this.SESSION_HISTORY_KEY)
  }

  /**
   * Remove specific session from history
   */
  static removeFromSessionHistory(sessionCode: string): void {
    const history = this.getSessionHistory()
    const filtered = history.filter(h => h.code !== sessionCode)
    localStorage.setItem(this.SESSION_HISTORY_KEY, JSON.stringify(filtered))
  }

  /**
   * Validate session history entry
   */
  private static isValidHistoryEntry(entry: any): entry is SessionHistoryEntry {
    return (
      entry &&
      typeof entry.code === 'string' &&
      entry.code.length === 4 &&
      typeof entry.joinedAt === 'string'
    )
  }

  /**
   * Reset user data (for testing/debugging)
   */
  static resetUser(): void {
    localStorage.removeItem(this.USER_KEY)
    localStorage.removeItem(this.SESSION_HISTORY_KEY)
  }

  /**
   * Get user language preference name for display
   */
  static getLanguageName(language: 'en' | 'es' | 'pt'): string {
    const names = {
      en: 'English',
      es: 'Español',
      pt: 'Português'
    }
    return names[language]
  }

  /**
   * Get user mode display name
   */
  static getModeName(mode: 'casual' | 'fun'): string {
    const names = {
      casual: 'Casual',
      fun: 'Fun with Emojis'
    }
    return names[mode]
  }

  /**
   * Get user preference with default value
   */
  static getPreference<T>(key: string, defaultValue: T): T {
    try {
      const stored = localStorage.getItem(`translator-preference-${key}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        return parsed !== null && parsed !== undefined ? parsed : defaultValue
      }
    } catch (error) {
      console.warn(`Failed to load preference ${key}:`, error)
    }
    return defaultValue
  }

  /**
   * Set user preference
   */
  static setPreference<T>(key: string, value: T): void {
    try {
      localStorage.setItem(`translator-preference-${key}`, JSON.stringify(value))
    } catch (error) {
      console.error(`Failed to save preference ${key}:`, error)
    }
  }

  /**
   * Get current translation mode (casual/fun)
   */
  static getTranslationMode(): 'casual' | 'fun' {
    const user = this.getOrCreateUser()
    return user.mode
  }

  /**
   * Set translation mode and persist it
   */
  static setTranslationMode(mode: 'casual' | 'fun'): void {
    this.updateUser({ mode })
    console.log(`🎯 Translation mode updated to: ${mode}`)
  }

  /**
   * Toggle between casual and fun modes
   */
  static toggleTranslationMode(): 'casual' | 'fun' {
    const currentMode = this.getTranslationMode()
    const newMode = currentMode === 'casual' ? 'fun' : 'casual'
    this.setTranslationMode(newMode)
    return newMode
  }

  /**
   * Detect romantic context from recent messages
   * Exact implementation from prompts.md lines 283-296
   */
  static detectRomanticContext(recentMessages: string[]): boolean {
    const romanticKeywords = [
      'love', 'miss', 'beautiful', 'date', 'kiss', 'romantic', 
      'adorable', 'gorgeous', 'sweet', 'darling', 'honey', 
      'sweetheart', 'cute', 'sexy', 'handsome',
      'amor', 'te amo', 'hermosa', 'guapo', 'bonita', 'cariño',
      'amo', 'saudade', 'linda', 'lindo', 'querida', 'querido'
    ]

    const allText = recentMessages.join(' ').toLowerCase()
    return romanticKeywords.some(keyword => allText.includes(keyword))
  }

  /**
   * Font size management based on oldappfeatures.md
   * 4-size system: Small, Medium, Large, XL with responsive scaling
   */
  static getFontSize(): 'small' | 'medium' | 'large' | 'xl' {
    return this.getPreference('fontSize', 'medium')
  }

  static setFontSize(size: 'small' | 'medium' | 'large' | 'xl'): void {
    this.setPreference('fontSize', size)
    this.applyFontSizeToDocument(size)
    console.log(`🎯 Font size updated to: ${size}`)
  }

  static cycleFontSize(): 'small' | 'medium' | 'large' | 'xl' {
    const sizes: ('small' | 'medium' | 'large' | 'xl')[] = ['small', 'medium', 'large', 'xl']
    const current = this.getFontSize()
    const currentIndex = sizes.indexOf(current)
    const nextIndex = (currentIndex + 1) % sizes.length
    const newSize = sizes[nextIndex]
    this.setFontSize(newSize)
    return newSize
  }

  /**
   * Apply font size to document using CSS custom properties
   * Mobile vs Desktop responsive scaling per oldappfeatures.md
   */
  static applyFontSizeToDocument(size: 'small' | 'medium' | 'large' | 'xl'): void {
    const root = document.documentElement
    
    // Font size mapping: mobile, desktop
    const fontSizes = {
      small: { mobile: '14px', desktop: '16px' },
      medium: { mobile: '16px', desktop: '18px' },
      large: { mobile: '20px', desktop: '22px' },
      xl: { mobile: '24px', desktop: '28px' }
    }
    
    const { mobile, desktop } = fontSizes[size]
    
    // Apply CSS custom properties for responsive font sizing
    root.style.setProperty('--font-size-mobile', mobile)
    root.style.setProperty('--font-size-desktop', desktop)
    
    // Apply to body classes for backward compatibility
    root.classList.remove('font-small', 'font-medium', 'font-large', 'font-xl')
    root.classList.add(`font-${size}`)
  }

  /**
   * Initialize font size on app load
   */
  static initializeFontSize(): void {
    const currentSize = this.getFontSize()
    this.applyFontSizeToDocument(currentSize)
  }

  static getFontSizeDisplayName(size: 'small' | 'medium' | 'large' | 'xl'): string {
    const names = {
      small: 'Small',
      medium: 'Medium', 
      large: 'Large',
      xl: 'XL'
    }
    return names[size]
  }
}