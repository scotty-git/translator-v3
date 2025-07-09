import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import SingleDeviceTranslator from './SingleDeviceTranslator'
import { SessionHeader } from '@/components/SessionHeader'
import { Layout } from '@/components/layout/Layout'
import { sessionManager } from '@/services/SessionManager'
import type { QueuedMessage } from '@/features/messages/MessageQueue'

interface SessionState {
  sessionId: string
  sessionCode: string
  userId: string
  role: 'host' | 'guest'
}

export function SessionTranslator() {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Get session from navigation state or localStorage
  const [sessionState, setSessionState] = useState<SessionState | null>(() => {
    // First try location state
    if (location.state?.sessionId && location.state?.sessionCode) {
      return location.state as SessionState
    }
    
    // Then try localStorage
    const saved = localStorage.getItem('activeSession')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Failed to parse saved session:', e)
      }
    }
    
    return null
  })
  
  // Connection status (mock for now, real in Phase 3)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [partnerOnline, setPartnerOnline] = useState(false)
  
  // Messages state for session
  const [messages, setMessages] = useState<QueuedMessage[]>([])
  
  // Redirect if no session
  useEffect(() => {
    if (!sessionState) {
      console.warn('No session state found, redirecting to home')
      navigate('/')
    }
  }, [sessionState, navigate])
  
  // Simulate connection (will be real in Phase 3)
  useEffect(() => {
    if (!sessionState) return
    
    console.log('📱 [SessionTranslator] Initializing session:', sessionState.sessionCode)
    
    // Simulate connecting
    const connectTimer = setTimeout(() => {
      setConnectionStatus('connected')
      console.log('✅ [SessionTranslator] Session connected (simulated)')
    }, 1500)
    
    // Simulate partner joining (for demo in Phase 2)
    const partnerTimer = setTimeout(() => {
      setPartnerOnline(true)
      console.log('👥 [SessionTranslator] Partner joined (simulated)')
    }, 3000)
    
    return () => {
      clearTimeout(connectTimer)
      clearTimeout(partnerTimer)
    }
  }, [sessionState])
  
  // Handle new messages from SingleDeviceTranslator
  const handleNewMessage = (message: QueuedMessage) => {
    if (!sessionState) return
    
    // Add session context to message
    const sessionMessage: QueuedMessage = {
      ...message,
      session_id: sessionState.sessionId,
      user_id: sessionState.userId
      // In session mode, user's own messages are always on the right
      // This will be handled by message display logic in Phase 3
    }
    
    // Add to local messages (will sync in Phase 3)
    setMessages(prev => {
      // If it's an update to existing message, replace it
      const existingIndex = prev.findIndex(m => m.id === message.id)
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = sessionMessage
        return updated
      }
      // Otherwise add new message
      return [...prev, sessionMessage]
    })
    
    console.log('💬 [SessionTranslator] Message handled:', {
      id: message.id,
      text: message.original,
      sessionId: sessionState.sessionId,
      userId: sessionState.userId,
      side: 'right'
    })
  }
  
  // Don't render if no session
  if (!sessionState) {
    return null
  }
  
  return (
    <Layout>
      <div className="h-screen bg-app flex flex-col">
        {/* Session Header */}
        <SessionHeader 
          code={sessionState.sessionCode}
          status={connectionStatus}
          partnerOnline={partnerOnline}
        />
        
        {/* Wrap SingleDeviceTranslator with session functionality */}
        <div className="flex-1 relative">
          <SingleDeviceTranslator 
            onNewMessage={handleNewMessage}
            messages={messages}
            isSessionMode={true}
          />
        </div>
      </div>
    </Layout>
  )
}

export default SessionTranslator