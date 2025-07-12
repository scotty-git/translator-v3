import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { SoloTranslator } from './solo/SoloTranslator'
import { Layout } from '@/components/layout/Layout'
import { sessionStateManager, type SessionState } from '@/services/session'
import { messageSyncService } from '@/services/MessageSyncService'
import { PresenceService } from '@/services/presence'
import { RealtimeConnection } from '@/services/realtime'
import type { QueuedMessage } from '@/features/messages/MessageQueue'
import type { SessionMessage, ConnectionStatus, DatabaseReaction } from '@/types/database'
import type { ConnectionState } from '@/services/realtime'
import { ErrorToast } from '@/components/ErrorDisplay'
import { useSounds } from '@/lib/sounds/SoundManager'
import { MessageQueueService } from '@/services/queues/MessageQueueService'

export function SessionTranslator() {
  const navigate = useNavigate()
  const location = useLocation()
  const { playMessageReceived } = useSounds()
  
  // Get session from SessionStateManager
  const [sessionState, setSessionState] = useState<SessionState | null>(() => {
    // First try location state
    if (location.state?.sessionId && location.state?.sessionCode) {
      const locationSession = location.state as SessionState
      sessionStateManager.setCurrentSession(locationSession)
      return locationSession
    }
    
    // Then try restored session
    const restoredSession = sessionStateManager.restoreSession()
    return restoredSession
  })
  
  // Real-time connection status
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [partnerOnline, setPartnerOnline] = useState(false)
  const [partnerActivity, setPartnerActivity] = useState<'idle' | 'recording' | 'processing' | 'typing'>('idle')
  const [presenceServiceReady, setPresenceServiceReady] = useState(false)
  
  // Messages state for session
  const [messages, setMessages] = useState<QueuedMessage[]>([])
  const [error, setError] = useState<Error | null>(null)
  
  // Create MessageQueueService instance for session mode
  const [messageQueueService] = useState(() => new MessageQueueService())
  
  // Create PresenceService instance for session mode
  const [presenceService] = useState(() => new PresenceService())
  
  // Create RealtimeConnection instance for session mode
  const [realtimeConnection] = useState(() => new RealtimeConnection())
  
  // Handle reaction toggle for messages
  const handleReactionToggle = async (messageId: string, emoji: string, userId: string) => {
    if (!sessionState) {
      console.warn('⚠️ [SessionTranslator] No session state, cannot toggle reaction')
      return
    }
    
    try {
      console.log('👍 [SessionTranslator] Toggling reaction:', { messageId, emoji, userId })
      
      // Check if user already reacted with this emoji
      const message = messages.find(m => m.id === messageId)
      const reactions = message?.reactions?.[emoji]
      const hasReacted = Array.isArray(reactions) ? reactions.includes(userId) : false
      
      if (hasReacted) {
        console.log('👎 [SessionTranslator] Removing reaction')
        await messageSyncService.removeReaction(messageId, emoji, userId)
      } else {
        console.log('👍 [SessionTranslator] Adding reaction')
        await messageSyncService.addReaction(messageId, emoji, userId)
      }
    } catch (error) {
      console.error('❌ [SessionTranslator] Failed to toggle reaction:', error)
      setError(error instanceof Error ? error : new Error('Failed to toggle reaction'))
    }
  }

  // Redirect if no session and handle session expiry
  useEffect(() => {
    if (!sessionState) {
      console.warn('No session state found, redirecting to home')
      navigate('/')
      return
    }
    
    // Check if session is expired using SessionStateManager
    if (sessionStateManager.isSessionExpired(sessionState)) {
      console.warn('Session expired, redirecting to home')
      sessionStateManager.clearSession()
      navigate('/')
    }
  }, [sessionState, navigate])
  
  // Initialize real-time sync service (only run once when sessionState is available)
  useEffect(() => {
    if (!sessionState) return
    
    console.log('📱 [SessionTranslator] Initializing real-time sync:', sessionState.sessionCode)
    
    // Set up MessageSyncService event handlers (presence-related handlers moved to PresenceService)
    messageSyncService.setEventHandlers({
      onMessageReceived: (message: SessionMessage) => {
        console.log('📨 [SessionTranslator] Received message from partner:', message.id)
        
        // Clear partner activity with a slight delay to allow activity indicators to be seen
        setTimeout(() => {
          console.log('🎯 [SessionTranslator] Clearing partner activity to idle after message received')
          setPartnerActivity('idle')
        }, 1000) // 1 second delay
        
        // Convert SessionMessage to QueuedMessage for display
        const queuedMessage: QueuedMessage = {
          id: message.id,
          original: message.original_text,
          translation: message.translated_text,
          original_lang: message.original_language,
          target_lang: message.original_language === 'en' ? 'es' : 'en', // Infer target
          status: 'displayed',
          queued_at: message.timestamp,
          processed_at: message.timestamp,
          displayed_at: message.timestamp,
          performance_metrics: null,
          timestamp: message.timestamp,
          created_at: message.timestamp,
          localId: `remote-${message.id}`,
          retryCount: 0,
          displayOrder: Date.now(), // Use current time for display order
          session_id: message.session_id,
          user_id: message.sender_id
        }
        
        // Add to messages as partner message (will show on left side)
        setMessages(prev => [...prev, queuedMessage])
        
        // Play sound notification for incoming translated message
        console.log('🔊 [SessionTranslator] About to call playMessageReceived() for partner message:', message.id)
        try {
          playMessageReceived()
          console.log('🔊 [SessionTranslator] playMessageReceived() call completed')
        } catch (error) {
          console.error('🔊 [SessionTranslator] Error calling playMessageReceived():', error)
        }
      },
      
      onMessageDelivered: (messageId: string) => {
        console.log('✅ [SessionTranslator] Message delivered:', messageId)
        // Update message status to show delivery confirmation
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, status: 'displayed' as const } : msg
        ))
      },
      
      onMessageFailed: (messageId: string, error: string) => {
        console.error('❌ [SessionTranslator] Message failed:', messageId, error)
        // Update message status to show failure
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, status: 'failed' as const } : msg
        ))
      },
      
      onReactionAdded: (reaction: DatabaseReaction) => {
        console.log('👍 [SessionTranslator] Reaction added:', reaction)
        
        // Update local message state with new reaction (simplified array format)
        setMessages(prev => {
          const updatedMessages = prev.map(msg => {
            if (msg.id === reaction.message_id) {
              const currentReactions = msg.reactions || {}
              const emojiUsers = currentReactions[reaction.emoji] || []
              
              console.log('🎯 [SessionTranslator] REACTION AGGREGATION BEFORE:', {
                messageId: msg.id,
                emoji: reaction.emoji,
                currentReactions,
                emojiUsers,
                newUserId: reaction.user_id,
                userAlreadyReacted: emojiUsers.includes(reaction.user_id)
              })
              
              // Add user if not already present
              if (!emojiUsers.includes(reaction.user_id)) {
                const updatedMessage = {
                  ...msg,
                  reactions: {
                    ...currentReactions,
                    [reaction.emoji]: [...emojiUsers, reaction.user_id]
                  }
                }
                
                console.log('🎯 [SessionTranslator] REACTION AGGREGATION AFTER:', {
                  messageId: msg.id,
                  emoji: reaction.emoji,
                  updatedReactions: updatedMessage.reactions,
                  newEmojiUsers: updatedMessage.reactions[reaction.emoji],
                  totalReactionCount: Object.keys(updatedMessage.reactions).length
                })
                
                return updatedMessage
              } else {
                console.log('🎯 [SessionTranslator] USER ALREADY REACTED:', {
                  messageId: msg.id,
                  emoji: reaction.emoji,
                  userId: reaction.user_id,
                  existingUsers: emojiUsers
                })
              }
            }
            return msg
          })
          
          // Log final message state to verify data integrity
          const targetMessage = updatedMessages.find(m => m.id === reaction.message_id)
          if (targetMessage) {
            console.log('🎯 [SessionTranslator] FINAL MESSAGE STATE:', {
              messageId: targetMessage.id,
              hasReactions: !!targetMessage.reactions,
              reactions: targetMessage.reactions,
              reactionKeys: targetMessage.reactions ? Object.keys(targetMessage.reactions) : [],
              totalMessages: updatedMessages.length
            })
          }
          
          return updatedMessages
        })
      },
      
      onReactionRemoved: (reaction: DatabaseReaction) => {
        console.log('👎 [SessionTranslator] Reaction removed:', reaction)
        // Update local message state by removing reaction (simplified array format)
        setMessages(prev => prev.map(msg => {
          if (msg.id === reaction.message_id) {
            const currentReactions = msg.reactions || {}
            const emojiUsers = currentReactions[reaction.emoji] || []
            
            // Remove user from reaction
            const updatedUsers = emojiUsers.filter(u => u !== reaction.user_id)
            
            // Remove reaction entirely if no users left
            if (updatedUsers.length === 0) {
              const { [reaction.emoji]: removed, ...remainingReactions } = currentReactions
              return {
                ...msg,
                reactions: remainingReactions
              }
            } else {
              return {
                ...msg,
                reactions: {
                  ...currentReactions,
                  [reaction.emoji]: updatedUsers
                }
              }
            }
          }
          return msg
        }))
      }
    })
    
    // Set up PresenceService subscriptions
    const unsubscribePresence = presenceService.subscribeToPresence((isOnline: boolean) => {
      console.log('👥 [SessionTranslator] Partner presence changed:', isOnline)
      setPartnerOnline(isOnline)
    })
    
    const unsubscribeActivity = presenceService.subscribeToActivity((activity: 'idle' | 'recording' | 'processing' | 'typing') => {
      console.log(`🎯 [ActivityIndicator] SessionTranslator received: ${partnerActivity} → ${activity}`)
      setPartnerActivity(activity)
      console.log(`✅ [ActivityIndicator] State updated, will pass to SingleDeviceTranslator`)
    })
    
    // Initialize the session
    const initializeSession = async () => {
      try {
        // First validate the session still exists and is active
        const isValidSession = await sessionStateManager.validateSession(sessionState.sessionCode)
        if (!isValidSession) {
          console.error('❌ [SessionTranslator] Session is no longer valid')
          sessionStateManager.clearSession()
          navigate('/')
          return
        }
        
        // Add this user as participant
        await sessionStateManager.addParticipant(sessionState.sessionId, sessionState.userId)
        
        // Initialize RealtimeConnection first
        await realtimeConnection.initialize({
          sessionId: sessionState.sessionId,
          userId: sessionState.userId,
          events: {
            onConnectionStatusChanged: (status: ConnectionStatus) => {
              console.log('🔌 [SessionTranslator] Connection status changed:', status)
              setConnectionStatus(status)
            },
            onChannelError: (error: any) => {
              console.error('❌ [SessionTranslator] Channel error:', error)
            },
            onReconnectAttempt: (attempt: number) => {
              console.log('🔄 [SessionTranslator] Reconnection attempt:', attempt)
            }
          }
        })
        console.log('✅ [SessionTranslator] RealtimeConnection initialized')
        
        // Subscribe to connection state changes
        realtimeConnection.subscribeToConnectionState((state: ConnectionState) => {
          console.log('🔗 [SessionTranslator] Connection state changed:', state)
          setConnectionState(state)
        })
        
        // Initialize PresenceService with RealtimeConnection
        await presenceService.initialize(sessionState.sessionId, sessionState.userId, realtimeConnection)
        console.log('✅ [SessionTranslator] PresenceService initialized')
        setPresenceServiceReady(true)
        
        // Initialize MessageSyncService with RealtimeConnection and PresenceService
        await messageSyncService.initializeSession(sessionState.sessionId, sessionState.userId, realtimeConnection, presenceService)
        console.log('✅ [SessionTranslator] Real-time sync initialized')
      } catch (error) {
        console.error('❌ [SessionTranslator] Failed to initialize real-time sync:', error)
        setConnectionStatus('disconnected')
        setConnectionState('disconnected')
        setPresenceServiceReady(false)
        
        // Handle specific error cases
        if (error instanceof Error) {
          if (error.message.includes('expired')) {
            console.error('Session expired, redirecting to home')
            sessionStateManager.clearSession()
            navigate('/')
          } else if (error.message.includes('full')) {
            console.error('Session is full, redirecting to home')
            navigate('/')
          }
        }
      }
    }
    
    initializeSession()
    
    return () => {
      console.log('🧹 [SessionTranslator] Component unmounting, cleaning up session...')
      // Cleanup presence subscriptions
      unsubscribePresence()
      unsubscribeActivity()
      // Cleanup services
      presenceService.cleanup()
      messageSyncService.cleanup()
      realtimeConnection.cleanup()
      // Clear session state in SessionStateManager (keeps persistence for recovery)
      sessionStateManager.cleanup()
      // Reset presence service ready state
      setPresenceServiceReady(false)
    }
  }, [sessionState?.sessionId])
  
  // Handle browser/tab close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (sessionState) {
        console.log('🚪 [SessionTranslator] Browser closing, cleaning up session...')
        // Try to clean up synchronously (best effort)
        presenceService.cleanup()
        messageSyncService.cleanup()
        realtimeConnection.cleanup()
        sessionStateManager.clearSession()
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [sessionState])
  
  // Handle new messages from SingleDeviceTranslator
  const handleNewMessage = async (message: QueuedMessage) => {
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
    
    // Send message to other participants via MessageSyncService
    // Only send when message is fully translated (status: 'displayed')
    if (message.status === 'displayed' && message.translation && sessionState) {
      try {
        console.log('📤 [SessionTranslator] Sending message to MessageSyncService:', message.id)
        
        // Transform QueuedMessage to format expected by queueMessage (matching actual DB schema)
        const queuedMessageData = {
          session_id: sessionState.sessionId,
          sender_id: sessionState.userId,
          original_text: message.original,
          translated_text: message.translation,
          original_language: message.original_lang || 'auto',
          timestamp: new Date().toISOString()
          // Note: Removed non-existent columns: audio_duration, is_audio, target_language, created_at
        }
        
        const messageId = messageSyncService.queueMessage(queuedMessageData)
        console.log('✅ [SessionTranslator] Message queued successfully:', messageId)
        
      } catch (error) {
        console.error('❌ [SessionTranslator] Failed to send message:', {
          messageId: message.id,
          error: error instanceof Error ? error.message : String(error),
          errorDetails: error,
          sessionState: sessionState ? 'exists' : 'null'
        })
      }
    }
  }
  
  // Don't render if no session
  if (!sessionState) {
    return null
  }
  
  return (
    <Layout>
      <div className="bg-app flex flex-col overflow-hidden" style={{
        height: '100vh',
        touchAction: 'pan-y pinch-zoom',
        overscrollBehavior: 'none',
        WebkitOverflowScrolling: 'touch'
      }}>
        {/* SoloTranslator - Enhanced for session mode */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <SoloTranslator 
            messageQueueService={messageQueueService}
            translationPipeline={undefined} // Use default pipeline
            onNewMessage={handleNewMessage}
            messages={(() => {
              console.log('🎯 [SessionTranslator] Passing messages to SoloTranslator:', messages.map(m => ({
                id: m.id,
                status: m.status,
                original: m.original,
                translation: m.translation,
                hasReactions: !!m.reactions,
                reactions: m.reactions,
                reactionKeys: m.reactions ? Object.keys(m.reactions) : []
              })))
              return messages
            })()}
            isSessionMode={true}
            partnerActivity={partnerActivity}
            sessionInfo={{
              code: sessionState.sessionCode,
              sessionId: sessionState.sessionId,
              userId: sessionState.userId,
              status: connectionStatus,
              connectionState: connectionState,
              partnerOnline: partnerOnline
            }}
            presenceService={presenceServiceReady ? presenceService : undefined}
            onReactionToggle={handleReactionToggle}
          />
        </div>
      </div>
    </Layout>
  )
}

export default SessionTranslator