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
    console.log('🔍 [SessionTranslator] handleNewMessage called with:', {
      id: message.id,
      status: message.status,
      original: message.original,
      translation: message.translation,
      sessionState: sessionState ? 'exists' : 'null'
    })
    
    if (!sessionState) {
      console.warn('⚠️ [SessionTranslator] No session state, ignoring message')
      return
    }
    
    // Add session context to message
    const sessionMessage: QueuedMessage = {
      ...message,
      session_id: sessionState.sessionId,
      user_id: sessionState.userId
    }
    
    console.log('📝 [SessionTranslator] Created session message:', {
      id: sessionMessage.id,
      status: sessionMessage.status,
      original: sessionMessage.original,
      translation: sessionMessage.translation
    })
    
    // Handle message updates properly
    setMessages(prev => {
      console.log('📊 [SessionTranslator] Current messages before update:', prev.map(m => ({
        id: m.id,
        status: m.status,
        original: m.original,
        translation: m.translation
      })))
      
      const existingIndex = prev.findIndex(m => m.id === message.id)
      if (existingIndex >= 0) {
        // Update existing message
        const updated = [...prev]
        const oldMessage = updated[existingIndex]
        updated[existingIndex] = sessionMessage
        
        console.log('🔄 [SessionTranslator] Message updated:', {
          id: message.id,
          oldStatus: oldMessage.status,
          newStatus: sessionMessage.status,
          oldOriginal: oldMessage.original,
          newOriginal: sessionMessage.original,
          oldTranslation: oldMessage.translation,
          newTranslation: sessionMessage.translation
        })
        
        console.log('📊 [SessionTranslator] Messages after update:', updated.map(m => ({
          id: m.id,
          status: m.status,
          original: m.original,
          translation: m.translation
        })))
        
        return updated
      } else {
        // Add new message
        const newMessages = [...prev, sessionMessage]
        console.log('➕ [SessionTranslator] Message added:', {
          id: message.id,
          status: message.status,
          original: message.original,
          translation: message.translation
        })
        
        console.log('📊 [SessionTranslator] Messages after add:', newMessages.map(m => ({
          id: m.id,
          status: m.status,
          original: m.original,
          translation: m.translation
        })))
        
        return newMessages
      }
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
            messages={(() => {
              console.log('🎯 [SessionTranslator] Passing messages to SingleDeviceTranslator:', messages.map(m => ({
                id: m.id,
                status: m.status,
                original: m.original,
                translation: m.translation
              })))
              return messages
            })()}
            isSessionMode={true}
          />
        </div>
      </div>
    </Layout>
  )
}

export default SessionTranslator