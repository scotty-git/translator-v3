/**
 * Animation Utilities for Phase 9
 * 
 * Professional micro-interactions and animation helpers
 */

export type AnimationTiming = 'instant' | 'fast' | 'normal' | 'slow'
export type AnimationEasing = 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce' | 'spring'

export const ANIMATION_DURATIONS: Record<AnimationTiming, number> = {
  instant: 0,
  fast: 150,
  normal: 300,
  slow: 500,
}

export const ANIMATION_EASINGS: Record<AnimationEasing, string> = {
  ease: 'ease',
  'ease-in': 'ease-in',
  'ease-out': 'ease-out',
  'ease-in-out': 'ease-in-out',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
}

/**
 * Stagger animation delays for lists
 */
export function getStaggerDelay(index: number, baseDelay: number = 50): number {
  return index * baseDelay
}

/**
 * Create a spring animation for interactive elements
 */
export function createSpringAnimation(
  element: HTMLElement,
  scale: number = 0.95,
  duration: number = 150
): void {
  element.style.transition = `transform ${duration}ms ease-out`
  element.style.transform = `scale(${scale})`
  
  setTimeout(() => {
    element.style.transform = 'scale(1)'
  }, duration)
}

/**
 * Pulse animation for attention-grabbing elements
 */
export function createPulseAnimation(
  element: HTMLElement,
  intensity: number = 0.05,
  duration: number = 1000
): void {
  const keyframes = [
    { transform: 'scale(1)', opacity: '1' },
    { transform: `scale(${1 + intensity})`, opacity: '0.8' },
    { transform: 'scale(1)', opacity: '1' },
  ]
  
  element.animate(keyframes, {
    duration,
    iterations: Infinity,
    easing: 'ease-in-out',
  })
}

/**
 * Shake animation for errors
 */
export function createShakeAnimation(element: HTMLElement): void {
  const keyframes = [
    { transform: 'translateX(0)' },
    { transform: 'translateX(-10px)' },
    { transform: 'translateX(10px)' },
    { transform: 'translateX(-10px)' },
    { transform: 'translateX(10px)' },
    { transform: 'translateX(0)' },
  ]
  
  element.animate(keyframes, {
    duration: 500,
    easing: 'ease-in-out',
  })
}

/**
 * Success checkmark animation
 */
export function createSuccessAnimation(element: HTMLElement): void {
  // Scale up briefly, then back to normal
  const keyframes = [
    { transform: 'scale(1)' },
    { transform: 'scale(1.2)' },
    { transform: 'scale(1)' },
  ]
  
  element.animate(keyframes, {
    duration: 300,
    easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // bounce
  })
}

/**
 * Morphing animation for state changes
 */
export function createMorphAnimation(
  element: HTMLElement,
  fromColor: string,
  toColor: string,
  duration: number = 300
): void {
  const keyframes = [
    { backgroundColor: fromColor },
    { backgroundColor: toColor },
  ]
  
  element.animate(keyframes, {
    duration,
    fill: 'forwards',
    easing: 'ease-in-out',
  })
}

/**
 * Typing indicator animation
 */
export function createTypingAnimation(element: HTMLElement): Animation {
  const keyframes = [
    { opacity: '0.3' },
    { opacity: '1' },
    { opacity: '0.3' },
  ]
  
  return element.animate(keyframes, {
    duration: 1200,
    iterations: Infinity,
    easing: 'ease-in-out',
  })
}

/**
 * Recording pulse animation
 */
export function createRecordingPulse(element: HTMLElement): Animation {
  const keyframes = [
    { 
      transform: 'scale(1)',
      boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.7)'
    },
    { 
      transform: 'scale(1.05)',
      boxShadow: '0 0 0 20px rgba(239, 68, 68, 0)'
    },
  ]
  
  return element.animate(keyframes, {
    duration: 1000,
    iterations: Infinity,
    easing: 'ease-out',
  })
}

/**
 * Message bubble entrance animation
 */
export function createMessageEntrance(
  element: HTMLElement,
  fromSide: 'left' | 'right' = 'left',
  delay: number = 0
): void {
  const translateX = fromSide === 'left' ? '-20px' : '20px'
  
  const keyframes = [
    { 
      transform: `translateX(${translateX}) translateY(10px)`,
      opacity: '0',
      scale: '0.95'
    },
    { 
      transform: 'translateX(0) translateY(0)',
      opacity: '1',
      scale: '1'
    },
  ]
  
  setTimeout(() => {
    element.animate(keyframes, {
      duration: 300,
      easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', // spring
      fill: 'both',
    })
  }, delay)
}

/**
 * Page transition animation
 */
export function createPageTransition(
  element: HTMLElement,
  direction: 'enter' | 'exit' = 'enter'
): void {
  if (direction === 'enter') {
    const keyframes = [
      { transform: 'translateY(20px)', opacity: '0' },
      { transform: 'translateY(0)', opacity: '1' },
    ]
    
    element.animate(keyframes, {
      duration: 400,
      easing: 'ease-out',
      fill: 'both',
    })
  } else {
    const keyframes = [
      { transform: 'translateY(0)', opacity: '1' },
      { transform: 'translateY(-20px)', opacity: '0' },
    ]
    
    element.animate(keyframes, {
      duration: 300,
      easing: 'ease-in',
      fill: 'both',
    })
  }
}

/**
 * Loading shimmer effect
 */
export function createShimmerAnimation(element: HTMLElement): Animation {
  const keyframes = [
    { backgroundPosition: '-200% 0' },
    { backgroundPosition: '200% 0' },
  ]
  
  // Apply shimmer background
  element.style.background = `
    linear-gradient(90deg, 
      transparent 0%, 
      rgba(255, 255, 255, 0.4) 50%, 
      transparent 100%
    )
  `
  element.style.backgroundSize = '200% 100%'
  
  return element.animate(keyframes, {
    duration: 1500,
    iterations: Infinity,
    easing: 'ease-in-out',
  })
}

/**
 * Button press animation with haptic feedback
 */
export function createButtonPress(
  element: HTMLElement,
  withHaptic: boolean = true
): void {
  // Haptic feedback on supported devices
  if (withHaptic && 'vibrate' in navigator) {
    navigator.vibrate(10) // 10ms haptic feedback
  }
  
  const keyframes = [
    { transform: 'scale(1)' },
    { transform: 'scale(0.95)' },
    { transform: 'scale(1)' },
  ]
  
  element.animate(keyframes, {
    duration: 150,
    easing: 'ease-out',
  })
}

/**
 * Floating animation for decorative elements
 */
export function createFloatingAnimation(
  element: HTMLElement,
  amplitude: number = 10,
  duration: number = 3000
): Animation {
  const keyframes = [
    { transform: 'translateY(0px)' },
    { transform: `translateY(-${amplitude}px)` },
    { transform: 'translateY(0px)' },
  ]
  
  return element.animate(keyframes, {
    duration,
    iterations: Infinity,
    easing: 'ease-in-out',
  })
}