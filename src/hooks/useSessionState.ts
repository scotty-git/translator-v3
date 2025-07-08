import { useState, useEffect, useRef } from 'react'
import { SessionStateManager, SessionState } from '@/features/session/SessionStateManager'
import { UserManager } from '@/lib/user/UserManager'

interface UseSessionStateOptions {
  autoCleanup?: boolean
}

export function useSessionState(sessionCode?: string, options: UseSessionStateOptions = {}, isNewlyCreated: boolean = false) {
  const { autoCleanup = true } = options
  
  const [state, setState] = useState<SessionState>({
    session: null,
    connectionState: 'disconnected',
    error: null,
    reconnectAttempts: 0,
  })
  
  const managerRef = useRef<SessionStateManager>()
  const unsubscribeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!sessionCode) {
      // Clean up if no session code
      cleanup()
      return
    }

    // Initialize session manager
    managerRef.current = new SessionStateManager()
    
    // Subscribe to state changes
    unsubscribeRef.current = managerRef.current.subscribe(setState)
    
    // Initialize session
    const userId = UserManager.getUserId()
    managerRef.current.initialize(sessionCode, userId, isNewlyCreated).catch((error) => {
      console.error('Failed to initialize session:', error)
    })
    
    // Add session to history on successful connection
    const checkAndAddToHistory = (newState: SessionState) => {
      if (newState.connectionState === 'connected' && newState.session) {
        UserManager.addToSessionHistory(sessionCode)
      }
    }
    
    // Listen for successful connection
    const additionalUnsubscribe = managerRef.current.subscribe(checkAndAddToHistory)
    
    return () => {
      additionalUnsubscribe()
      cleanup()
    }
  }, [sessionCode, isNewlyCreated])

  // Cleanup function
  const cleanup = () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }
    
    if (managerRef.current && autoCleanup) {
      managerRef.current.leave().catch((error) => {
        console.error('Error during session cleanup:', error)
      })
      managerRef.current = undefined
    }
  }

  // Manual leave function
  const leave = async () => {
    if (managerRef.current) {
      await managerRef.current.leave()
      managerRef.current = undefined
    }
  }

  // Extend session function
  const extendSession = async () => {
    if (managerRef.current) {
      await managerRef.current.extendSession()
    }
  }

  // Get time until expiry
  const getTimeUntilExpiry = () => {
    return managerRef.current?.getTimeUntilExpiry() ?? 0
  }

  // Check if session is healthy
  const isHealthy = () => {
    return managerRef.current?.isHealthy() ?? false
  }

  return {
    // State
    ...state,
    
    // Actions
    leave,
    extendSession,
    
    // Utilities
    getTimeUntilExpiry,
    isHealthy,
    
    // Manager reference (for advanced use cases)
    manager: managerRef.current,
  }
}