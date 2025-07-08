/**
 * Accessibility Manager - WCAG 2.1 AA Compliance System
 * Handles screen reader support, keyboard navigation, and accessibility features
 */

export class AccessibilityManager {
  private static instance: AccessibilityManager
  private announcements: HTMLElement | null = null
  private focusHistory: HTMLElement[] = []
  private keyboardNavigation = true
  private screenReaderEnabled = false
  private reducedMotion = false

  constructor() {
    this.initializeAnnouncements()
    this.detectScreenReader()
    this.detectReducedMotion()
    this.setupKeyboardNavigation()
  }

  static getInstance(): AccessibilityManager {
    if (!AccessibilityManager.instance) {
      AccessibilityManager.instance = new AccessibilityManager()
    }
    return AccessibilityManager.instance
  }

  /**
   * Initialize ARIA live region for screen reader announcements
   */
  private initializeAnnouncements(): void {
    if (typeof window === 'undefined') return

    this.announcements = document.createElement('div')
    this.announcements.setAttribute('aria-live', 'polite')
    this.announcements.setAttribute('aria-atomic', 'true')
    this.announcements.className = 'sr-only'
    this.announcements.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `
    document.body.appendChild(this.announcements)
  }

  /**
   * Announce message to screen readers
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.announcements) return

    this.announcements.setAttribute('aria-live', priority)
    this.announcements.textContent = message

    // Clear after announcement to allow repeated messages
    setTimeout(() => {
      if (this.announcements) {
        this.announcements.textContent = ''
      }
    }, 1000)

    console.log(`🔊 [A11Y] Screen reader announcement: "${message}" (${priority})`)
  }

  /**
   * Detect if screen reader is likely being used
   */
  private detectScreenReader(): void {
    if (typeof window === 'undefined') return

    // Check for common screen reader indicators
    const indicators = [
      () => window.navigator.userAgent.includes('NVDA'),
      () => window.navigator.userAgent.includes('JAWS'),
      () => window.speechSynthesis && window.speechSynthesis.getVoices().length > 0,
      () => 'speechSynthesis' in window,
      () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ]

    this.screenReaderEnabled = indicators.some(check => {
      try { return check() } catch { return false }
    })

    if (this.screenReaderEnabled) {
      console.log('🔊 [A11Y] Screen reader detected - enhanced accessibility enabled')
      document.body.classList.add('screen-reader-active')
    }
  }

  /**
   * Detect user's reduced motion preference
   */
  private detectReducedMotion(): void {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    this.reducedMotion = mediaQuery.matches

    mediaQuery.addEventListener('change', (e) => {
      this.reducedMotion = e.matches
      document.body.classList.toggle('reduce-motion', this.reducedMotion)
      console.log(`🎭 [A11Y] Reduced motion: ${this.reducedMotion ? 'enabled' : 'disabled'}`)
    })

    if (this.reducedMotion) {
      document.body.classList.add('reduce-motion')
      console.log('🎭 [A11Y] Reduced motion preference detected')
    }
  }

  /**
   * Setup keyboard navigation support
   */
  private setupKeyboardNavigation(): void {
    if (typeof window === 'undefined') return

    // Track focus for keyboard navigation
    document.addEventListener('keydown', this.handleKeyboardNavigation.bind(this))
    document.addEventListener('focusin', this.trackFocus.bind(this))

    // Skip links for keyboard users
    this.createSkipLinks()

    console.log('⌨️ [A11Y] Keyboard navigation initialized')
  }

  /**
   * Handle keyboard navigation shortcuts
   */
  private handleKeyboardNavigation(event: KeyboardEvent): void {
    // Escape key to close modals/menus
    if (event.key === 'Escape') {
      const openModal = document.querySelector('[role="dialog"][aria-hidden="false"]')
      if (openModal) {
        this.closeModal(openModal as HTMLElement)
        event.preventDefault()
      }
    }

    // Alt + M for main content
    if (event.altKey && event.key === 'm') {
      this.focusMainContent()
      event.preventDefault()
    }

    // Alt + N for navigation
    if (event.altKey && event.key === 'n') {
      this.focusNavigation()
      event.preventDefault()
    }

    // Tab trapping in modals
    if (event.key === 'Tab') {
      const modal = document.querySelector('[role="dialog"][aria-hidden="false"]')
      if (modal) {
        this.trapFocus(modal as HTMLElement, event)
      }
    }
  }

  /**
   * Track focus history for better navigation
   */
  private trackFocus(event: FocusEvent): void {
    const target = event.target as HTMLElement
    if (target && target.tagName) {
      this.focusHistory.push(target)
      // Keep only last 10 focuses
      if (this.focusHistory.length > 10) {
        this.focusHistory.shift()
      }
    }
  }

  /**
   * Create skip links for keyboard users
   */
  private createSkipLinks(): void {
    const skipLinks = document.createElement('div')
    skipLinks.className = 'skip-links'
    skipLinks.innerHTML = `
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <a href="#navigation" class="skip-link">Skip to navigation</a>
    `

    // Style skip links
    const style = document.createElement('style')
    style.textContent = `
      .skip-links {
        position: absolute;
        top: -100px;
        left: 0;
        z-index: 1000;
      }
      .skip-link {
        position: absolute;
        top: -100px;
        left: 0;
        background: #000;
        color: #fff;
        padding: 8px 16px;
        text-decoration: none;
        border-radius: 0 0 4px 0;
        transition: top 0.2s;
      }
      .skip-link:focus {
        top: 0;
      }
    `
    document.head.appendChild(style)
    document.body.insertBefore(skipLinks, document.body.firstChild)
  }

  /**
   * Focus main content area
   */
  private focusMainContent(): void {
    const mainContent = document.getElementById('main-content') || 
                       document.querySelector('main') ||
                       document.querySelector('[role="main"]')
    
    if (mainContent) {
      (mainContent as HTMLElement).focus()
      this.announce('Focused on main content')
    }
  }

  /**
   * Focus navigation area
   */
  private focusNavigation(): void {
    const navigation = document.getElementById('navigation') ||
                      document.querySelector('nav') ||
                      document.querySelector('[role="navigation"]')
    
    if (navigation) {
      (navigation as HTMLElement).focus()
      this.announce('Focused on navigation')
    }
  }

  /**
   * Trap focus within an element (for modals)
   */
  private trapFocus(element: HTMLElement, event: KeyboardEvent): void {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    if (event.shiftKey && document.activeElement === firstElement) {
      lastElement.focus()
      event.preventDefault()
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      firstElement.focus()
      event.preventDefault()
    }
  }

  /**
   * Close modal and return focus
   */
  private closeModal(modal: HTMLElement): void {
    modal.setAttribute('aria-hidden', 'true')
    
    // Return focus to last focused element before modal
    const lastFocused = this.focusHistory[this.focusHistory.length - 2]
    if (lastFocused && lastFocused.focus) {
      lastFocused.focus()
    }

    this.announce('Modal closed')
  }

  /**
   * Make an element focusable
   */
  makeFocusable(element: HTMLElement): void {
    if (!element.hasAttribute('tabindex')) {
      element.setAttribute('tabindex', '0')
    }
  }

  /**
   * Remove element from tab order
   */
  removeFromTabOrder(element: HTMLElement): void {
    element.setAttribute('tabindex', '-1')
  }

  /**
   * Set ARIA label
   */
  setAriaLabel(element: HTMLElement, label: string): void {
    element.setAttribute('aria-label', label)
  }

  /**
   * Set ARIA described by
   */
  setAriaDescribedBy(element: HTMLElement, describedBy: string): void {
    element.setAttribute('aria-describedby', describedBy)
  }

  /**
   * Set ARIA expanded state
   */
  setAriaExpanded(element: HTMLElement, expanded: boolean): void {
    element.setAttribute('aria-expanded', expanded.toString())
  }

  /**
   * Set ARIA pressed state
   */
  setAriaPressed(element: HTMLElement, pressed: boolean): void {
    element.setAttribute('aria-pressed', pressed.toString())
  }

  /**
   * Create accessible button
   */
  createAccessibleButton(text: string, onClick: () => void, options: {
    ariaLabel?: string
    ariaDescribedBy?: string
    disabled?: boolean
  } = {}): HTMLButtonElement {
    const button = document.createElement('button')
    button.textContent = text
    button.onclick = onClick
    
    if (options.ariaLabel) {
      button.setAttribute('aria-label', options.ariaLabel)
    }
    
    if (options.ariaDescribedBy) {
      button.setAttribute('aria-describedby', options.ariaDescribedBy)
    }
    
    if (options.disabled) {
      button.disabled = true
      button.setAttribute('aria-disabled', 'true')
    }

    return button
  }

  /**
   * Validate color contrast ratio
   */
  validateColorContrast(foreground: string, background: string): {
    ratio: number
    wcagAA: boolean
    wcagAAA: boolean
  } {
    // Simple contrast ratio calculation
    const getLuminance = (color: string): number => {
      // Convert hex to RGB and calculate luminance
      const hex = color.replace('#', '')
      const r = parseInt(hex.substr(0, 2), 16) / 255
      const g = parseInt(hex.substr(2, 2), 16) / 255
      const b = parseInt(hex.substr(4, 2), 16) / 255
      
      const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
      
      return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
    }

    const l1 = getLuminance(foreground)
    const l2 = getLuminance(background)
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)

    return {
      ratio,
      wcagAA: ratio >= 4.5,
      wcagAAA: ratio >= 7.1
    }
  }

  /**
   * Get accessibility state
   */
  getAccessibilityState(): {
    screenReaderEnabled: boolean
    reducedMotion: boolean
    keyboardNavigation: boolean
  } {
    return {
      screenReaderEnabled: this.screenReaderEnabled,
      reducedMotion: this.reducedMotion,
      keyboardNavigation: this.keyboardNavigation
    }
  }

  /**
   * Enable high contrast mode
   */
  enableHighContrast(): void {
    document.body.classList.add('high-contrast')
    this.announce('High contrast mode enabled')
  }

  /**
   * Disable high contrast mode
   */
  disableHighContrast(): void {
    document.body.classList.remove('high-contrast')
    this.announce('High contrast mode disabled')
  }
}

// Global instance
export const accessibilityManager = AccessibilityManager.getInstance()