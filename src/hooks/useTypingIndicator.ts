import { useEffect, useRef } from 'react'

export function useTypingIndicator(
  sessionId: string,
  userId: string,
  isTyping: boolean
) {
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!sessionId) return

    if (isTyping) {
      // In real implementation, would call ActivityService.updateActivity(sessionId, userId, 'typing')
      console.log('User started typing:', userId)
      
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      // Set timeout to mark as idle
      timeoutRef.current = setTimeout(() => {
        // In real implementation: ActivityService.updateActivity(sessionId, userId, 'idle')
        console.log('User stopped typing:', userId)
      }, 3000)
    } else {
      // Mark as idle
      console.log('User stopped typing:', userId)
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [sessionId, userId, isTyping])
}