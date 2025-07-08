import { useEffect, useCallback } from 'react'

interface UseBeforeUnloadOptions {
  enabled?: boolean
  message?: string
}

/**
 * Hook to handle browser beforeunload event for warning users before leaving
 * 
 * @param handler - Custom handler function called before unload
 * @param options - Configuration options
 */
export function useBeforeUnload(
  handler?: (event: BeforeUnloadEvent) => void,
  options: UseBeforeUnloadOptions = {}
) {
  const { enabled = true, message } = options

  const handleBeforeUnload = useCallback((event: BeforeUnloadEvent) => {
    if (!enabled) return

    // Call custom handler if provided
    if (handler) {
      handler(event)
    }

    // Set return value to trigger browser warning
    if (message) {
      event.returnValue = message
      return message
    } else {
      // Use default browser message
      event.preventDefault()
      event.returnValue = ''
      return ''
    }
  }, [handler, enabled, message])

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [handleBeforeUnload, enabled])
}

/**
 * Simplified hook for session-based warnings
 */
export function useSessionUnloadWarning(
  hasActiveSession: boolean,
  customMessage?: string
) {
  const defaultMessage = customMessage || 'Are you sure you want to leave? You will be disconnected from the session.'
  
  useBeforeUnload(
    (event) => {
      if (hasActiveSession) {
        event.preventDefault()
        event.returnValue = defaultMessage
      }
    },
    { enabled: hasActiveSession }
  )
}