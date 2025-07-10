import { useRef, useCallback, useEffect, useState } from 'react'

interface UseSmartScrollOptions {
  threshold?: number // How close to bottom to be considered "at bottom"
  smoothScroll?: boolean
}

interface UseSmartScrollReturn {
  scrollContainerRef: React.RefObject<HTMLDivElement>
  scrollToBottom: () => void
  scrollToMessage: (messageId: string, position?: 'top' | 'center' | 'bottom') => void
  isAtBottom: boolean
  shouldAutoScroll: boolean
}

/**
 * Smart scroll hook that handles intelligent auto-scrolling behavior
 * 
 * Features:
 * - Detects if user has manually scrolled up
 * - Only auto-scrolls if user is near the bottom
 * - Provides manual scroll-to-bottom function
 * - Tracks scroll position for UI indicators
 */
export function useSmartScroll(options: UseSmartScrollOptions = {}): UseSmartScrollReturn {
  const { threshold = 100, smoothScroll = true } = options
  
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const lastScrollTop = useRef(0)
  
  // Check if scrolled to bottom
  const checkIfAtBottom = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return true
    
    const { scrollTop, scrollHeight, clientHeight } = container
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    
    return distanceFromBottom <= threshold
  }, [threshold])
  
  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    
    if (smoothScroll) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      })
    } else {
      container.scrollTop = container.scrollHeight
    }
    
    // Reset auto-scroll when manually scrolling to bottom
    setShouldAutoScroll(true)
  }, [smoothScroll])

  // Scroll to specific message function
  const scrollToMessage = useCallback((messageId: string, position: 'top' | 'center' | 'bottom' = 'top') => {
    const container = scrollContainerRef.current
    if (!container) return

    const messageElement = container.querySelector(`#message-${messageId}`)
    if (!messageElement) {
      console.warn(`Message element with ID "message-${messageId}" not found`)
      return
    }

    // Calculate the header height offset (64px for fixed header)
    const headerOffset = 64
    const containerRect = container.getBoundingClientRect()
    const messageRect = messageElement.getBoundingClientRect()
    
    let scrollTop: number
    
    switch (position) {
      case 'top':
        // Position message at top of viewport (accounting for header)
        scrollTop = container.scrollTop + messageRect.top - containerRect.top - headerOffset
        break
      case 'center':
        // Position message in center of viewport
        scrollTop = container.scrollTop + messageRect.top - containerRect.top - (containerRect.height / 2) + (messageRect.height / 2)
        break
      case 'bottom':
        // Position message at bottom of viewport
        scrollTop = container.scrollTop + messageRect.bottom - containerRect.bottom
        break
    }

    if (smoothScroll) {
      container.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      })
    } else {
      container.scrollTop = scrollTop
    }

    console.log(`🎯 Scrolled to message ${messageId} at position: ${position}`)
  }, [smoothScroll])
  
  // Handle scroll events
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    
    const { scrollTop } = container
    const atBottom = checkIfAtBottom()
    
    setIsAtBottom(atBottom)
    
    // Detect manual scroll up
    if (scrollTop < lastScrollTop.current && !atBottom) {
      setShouldAutoScroll(false)
    }
    
    // Re-enable auto-scroll when user scrolls back to bottom
    if (atBottom) {
      setShouldAutoScroll(true)
    }
    
    lastScrollTop.current = scrollTop
  }, [checkIfAtBottom])
  
  // Set up scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    
    // Add scroll listener
    container.addEventListener('scroll', handleScroll, { passive: true })
    
    // Initial check
    handleScroll()
    
    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])
  
  return {
    scrollContainerRef,
    scrollToBottom,
    scrollToMessage,
    isAtBottom,
    shouldAutoScroll
  }
}