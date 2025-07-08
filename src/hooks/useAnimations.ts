import { useEffect, useRef, useCallback } from 'react'
import { 
  createSpringAnimation, 
  createShakeAnimation, 
  createSuccessAnimation,
  createButtonPress,
  createMessageEntrance,
  createPageTransition,
  createRecordingPulse,
  createTypingAnimation,
  getStaggerDelay
} from '@/lib/animations/AnimationUtils'

/**
 * Hook for managing component animations
 */
export function useAnimations() {
  // Animation element references
  const elementRefs = useRef<Map<string, HTMLElement>>(new Map())
  
  // Register an element for animation
  const registerElement = useCallback((key: string, element: HTMLElement | null) => {
    if (element) {
      elementRefs.current.set(key, element)
    } else {
      elementRefs.current.delete(key)
    }
  }, [])
  
  // Get registered element
  const getElement = useCallback((key: string) => {
    return elementRefs.current.get(key)
  }, [])
  
  // Animation functions
  const animations = {
    // Button animations
    buttonPress: useCallback((key: string, withHaptic = true) => {
      const element = getElement(key)
      if (element) createButtonPress(element, withHaptic)
    }, [getElement]),
    
    // Success animations
    success: useCallback((key: string) => {
      const element = getElement(key)
      if (element) createSuccessAnimation(element)
    }, [getElement]),
    
    // Error animations
    shake: useCallback((key: string) => {
      const element = getElement(key)
      if (element) createShakeAnimation(element)
    }, [getElement]),
    
    // Spring animations
    spring: useCallback((key: string, scale = 0.95, duration = 150) => {
      const element = getElement(key)
      if (element) createSpringAnimation(element, scale, duration)
    }, [getElement]),
    
    // Message animations
    messageEntrance: useCallback((key: string, fromSide: 'left' | 'right' = 'left', delay = 0) => {
      const element = getElement(key)
      if (element) createMessageEntrance(element, fromSide, delay)
    }, [getElement]),
    
    // Page transitions
    pageEnter: useCallback((key: string) => {
      const element = getElement(key)
      if (element) createPageTransition(element, 'enter')
    }, [getElement]),
    
    pageExit: useCallback((key: string) => {
      const element = getElement(key)
      if (element) createPageTransition(element, 'exit')
    }, [getElement]),
    
    // Recording pulse
    recordingPulse: useCallback((key: string) => {
      const element = getElement(key)
      if (element) return createRecordingPulse(element)
    }, [getElement]),
    
    // Typing indicator
    typing: useCallback((key: string) => {
      const element = getElement(key)
      if (element) return createTypingAnimation(element)
    }, [getElement]),
  }
  
  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      elementRefs.current.clear()
    }
  }, [])
  
  return {
    registerElement,
    animations,
    getStaggerDelay, // Utility for staggered animations
  }
}

/**
 * Hook for message list animations with staggering
 */
export function useMessageAnimations() {
  const messageRefs = useRef<Map<string, HTMLElement>>(new Map())
  
  const registerMessage = useCallback((messageId: string, element: HTMLElement | null) => {
    if (element) {
      messageRefs.current.set(messageId, element)
    } else {
      messageRefs.current.delete(messageId)
    }
  }, [])
  
  const animateNewMessage = useCallback((messageId: string, isOwnMessage: boolean, index: number = 0) => {
    const element = messageRefs.current.get(messageId)
    if (element) {
      const delay = getStaggerDelay(index, 100) // 100ms stagger
      const fromSide = isOwnMessage ? 'right' : 'left'
      createMessageEntrance(element, fromSide, delay)
    }
  }, [])
  
  return {
    registerMessage,
    animateNewMessage,
  }
}

/**
 * Hook for recording button animations
 */
export function useRecordingAnimations() {
  const buttonRef = useRef<HTMLElement | null>(null)
  const pulseAnimation = useRef<Animation | null>(null)
  
  const registerButton = useCallback((element: HTMLElement | null) => {
    buttonRef.current = element
  }, [])
  
  const startRecordingAnimation = useCallback(() => {
    if (buttonRef.current) {
      pulseAnimation.current = createRecordingPulse(buttonRef.current)
    }
  }, [])
  
  const stopRecordingAnimation = useCallback(() => {
    if (pulseAnimation.current) {
      pulseAnimation.current.cancel()
      pulseAnimation.current = null
    }
  }, [])
  
  const triggerSuccess = useCallback(() => {
    if (buttonRef.current) {
      createSuccessAnimation(buttonRef.current)
    }
  }, [])
  
  const triggerError = useCallback(() => {
    if (buttonRef.current) {
      createShakeAnimation(buttonRef.current)
    }
  }, [])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pulseAnimation.current) {
        pulseAnimation.current.cancel()
      }
    }
  }, [])
  
  return {
    registerButton,
    startRecordingAnimation,
    stopRecordingAnimation,
    triggerSuccess,
    triggerError,
  }
}

/**
 * Hook for page transition animations
 */
export function usePageTransitions() {
  const pageRef = useRef<HTMLElement | null>(null)
  
  const registerPage = useCallback((element: HTMLElement | null) => {
    pageRef.current = element
  }, [])
  
  const animatePageEnter = useCallback(() => {
    if (pageRef.current) {
      createPageTransition(pageRef.current, 'enter')
    }
  }, [])
  
  const animatePageExit = useCallback(() => {
    if (pageRef.current) {
      createPageTransition(pageRef.current, 'exit')
    }
  }, [])
  
  // Auto-animate on mount
  useEffect(() => {
    if (pageRef.current) {
      createPageTransition(pageRef.current, 'enter')
    }
  }, [])
  
  return {
    registerPage,
    animatePageEnter,
    animatePageExit,
  }
}