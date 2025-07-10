import { useRef, useCallback, useEffect, useState } from 'react'

interface UseSmartScrollOptions {
  threshold?: number // How close to bottom to be considered "at bottom"
  smoothScroll?: boolean
}

interface UseSmartScrollReturn {
  scrollContainerRef: React.RefObject<HTMLDivElement>
  scrollToBottom: () => void
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
    isAtBottom,
    shouldAutoScroll
  }
}