import { useEffect, useRef, useState } from 'react'
import { accessibilityManager } from '@/lib/accessibility/AccessibilityManager'

/**
 * Hook for accessibility features and ARIA management
 */
export function useAccessibility() {
  const [state, setState] = useState(accessibilityManager.getAccessibilityState())

  useEffect(() => {
    // Update state when accessibility preferences change
    const updateState = () => {
      setState(accessibilityManager.getAccessibilityState())
    }

    // Listen for media query changes
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    mediaQuery.addEventListener('change', updateState)

    return () => {
      mediaQuery.removeEventListener('change', updateState)
    }
  }, [])

  return {
    ...state,
    announce: accessibilityManager.announce.bind(accessibilityManager),
    makeFocusable: accessibilityManager.makeFocusable.bind(accessibilityManager),
    removeFromTabOrder: accessibilityManager.removeFromTabOrder.bind(accessibilityManager),
    setAriaLabel: accessibilityManager.setAriaLabel.bind(accessibilityManager),
    setAriaDescribedBy: accessibilityManager.setAriaDescribedBy.bind(accessibilityManager),
    setAriaExpanded: accessibilityManager.setAriaExpanded.bind(accessibilityManager),
    setAriaPressed: accessibilityManager.setAriaPressed.bind(accessibilityManager),
    validateColorContrast: accessibilityManager.validateColorContrast.bind(accessibilityManager),
  }
}

/**
 * Hook for managing ARIA live regions
 */
export function useAriaLive() {
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    accessibilityManager.announce(message, priority)
  }

  return { announce }
}

/**
 * Hook for keyboard navigation
 */
export function useKeyboardNavigation(callbacks: {
  onEscape?: () => void
  onEnter?: () => void
  onSpace?: () => void
  onArrowUp?: () => void
  onArrowDown?: () => void
  onArrowLeft?: () => void
  onArrowRight?: () => void
} = {}) {
  const elementRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          callbacks.onEscape?.()
          break
        case 'Enter':
          callbacks.onEnter?.()
          break
        case ' ':
          callbacks.onSpace?.()
          event.preventDefault() // Prevent page scroll
          break
        case 'ArrowUp':
          callbacks.onArrowUp?.()
          event.preventDefault()
          break
        case 'ArrowDown':
          callbacks.onArrowDown?.()
          event.preventDefault()
          break
        case 'ArrowLeft':
          callbacks.onArrowLeft?.()
          event.preventDefault()
          break
        case 'ArrowRight':
          callbacks.onArrowRight?.()
          event.preventDefault()
          break
      }
    }

    element.addEventListener('keydown', handleKeyDown)
    return () => element.removeEventListener('keydown', handleKeyDown)
  }, [callbacks])

  return { ref: elementRef }
}

/**
 * Hook for focus management
 */
export function useFocusManagement() {
  const [focusWithin, setFocusWithin] = useState(false)
  const elementRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const handleFocusIn = () => setFocusWithin(true)
    const handleFocusOut = (event: FocusEvent) => {
      // Check if focus moved to a child element
      if (!element.contains(event.relatedTarget as Node)) {
        setFocusWithin(false)
      }
    }

    element.addEventListener('focusin', handleFocusIn)
    element.addEventListener('focusout', handleFocusOut)

    return () => {
      element.removeEventListener('focusin', handleFocusIn)
      element.removeEventListener('focusout', handleFocusOut)
    }
  }, [])

  const focusElement = () => {
    elementRef.current?.focus()
  }

  const blurElement = () => {
    elementRef.current?.blur()
  }

  return {
    ref: elementRef,
    focusWithin,
    focusElement,
    blurElement
  }
}

/**
 * Hook for ARIA expanded state (dropdowns, accordions)
 */
export function useAriaExpanded(initialExpanded = false) {
  const [expanded, setExpanded] = useState(initialExpanded)
  const elementRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (elementRef.current) {
      accessibilityManager.setAriaExpanded(elementRef.current, expanded)
    }
  }, [expanded])

  const toggle = () => setExpanded(!expanded)
  const expand = () => setExpanded(true)
  const collapse = () => setExpanded(false)

  return {
    ref: elementRef,
    expanded,
    setExpanded,
    toggle,
    expand,
    collapse
  }
}

/**
 * Hook for ARIA pressed state (toggle buttons)
 */
export function useAriaPressed(initialPressed = false) {
  const [pressed, setPressed] = useState(initialPressed)
  const elementRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (elementRef.current) {
      accessibilityManager.setAriaPressed(elementRef.current, pressed)
    }
  }, [pressed])

  const toggle = () => setPressed(!pressed)
  const press = () => setPressed(true)
  const release = () => setPressed(false)

  return {
    ref: elementRef,
    pressed,
    setPressed,
    toggle,
    press,
    release
  }
}

/**
 * Hook for screen reader announcements
 */
export function useScreenReader() {
  const { screenReaderEnabled } = useAccessibility()

  const announceNavigation = (page: string) => {
    accessibilityManager.announce(`Navigated to ${page}`)
  }

  const announceAction = (action: string) => {
    accessibilityManager.announce(action)
  }

  const announceError = (error: string) => {
    accessibilityManager.announce(`Error: ${error}`, 'assertive')
  }

  const announceSuccess = (message: string) => {
    accessibilityManager.announce(`Success: ${message}`)
  }

  const announceLoading = (isLoading: boolean, context = '') => {
    if (isLoading) {
      accessibilityManager.announce(`Loading ${context}`)
    } else {
      accessibilityManager.announce(`Finished loading ${context}`)
    }
  }

  return {
    screenReaderEnabled,
    announceNavigation,
    announceAction,
    announceError,
    announceSuccess,
    announceLoading
  }
}