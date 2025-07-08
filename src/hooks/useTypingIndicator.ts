import { useEffect, useRef } from 'react'

/**
 * Simple typing indicator for single-device mode
 * Used for local UI feedback only
 */
export function useTypingIndicator(isTyping: boolean) {
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (isTyping) {
      console.log('🔤 User started typing')
      
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      // Set timeout to mark as idle
      timeoutRef.current = setTimeout(() => {
        console.log('💤 User stopped typing')
      }, 3000)
    } else {
      console.log('💤 User stopped typing')
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isTyping])
}