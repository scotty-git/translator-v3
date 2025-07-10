import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Mic, MicOff, Settings, Sun, Moon, Wifi, WifiOff, RotateCcw, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AudioVisualization } from '@/components/ui/AudioVisualization'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { MessageBubble } from '@/features/messages/MessageBubble'
import { ActivityIndicator } from '@/features/messages/ActivityIndicator'
import { messageQueue, type QueuedMessage } from '@/features/messages/MessageQueue'
import { IMessageQueue } from '@/services/queues/IMessageQueue'
import { MessageQueueService } from '@/services/queues/MessageQueueService'
import { persistentAudioManager, type AudioRecordingResult } from '@/services/audio/PersistentAudioManager'
import { performanceLogger } from '@/lib/performance'
import { createTranslationPipeline, type ITranslationPipeline, type TranslationRequest } from '@/services/pipeline'
import { useTranslation } from '@/lib/i18n/useTranslation'
import { UserManager } from '@/lib/user/UserManager'
import { useSounds } from '@/lib/sounds/SoundManager'
import { ConversationContextManager, type ConversationContextEntry } from '@/lib/conversation/ConversationContext'
import { DebugConsole } from '@/components/debug/DebugConsole'
import { messageSyncService } from '@/services/MessageSyncService'
import type { PresenceService } from '@/services/presence'
import { ErrorDisplay } from '@/components/ErrorDisplay'
import { useSmartScroll } from '@/hooks/useSmartScroll'
import { useUnreadMessages } from '@/hooks/useUnreadMessages'
import { ScrollToBottomButton } from '@/components/ui/ScrollToBottomButton'
import { UnreadMessagesDivider } from '@/components/ui/UnreadMessagesDivider'

/**
 * Generate a unique message ID using UUID
 * Uses crypto.randomUUID if available, falls back to timestamp-based ID
 */
function generateMessageId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

interface SingleDeviceTranslatorProps {
  onNewMessage?: (message: QueuedMessage) => void
  messages?: QueuedMessage[]
  isSessionMode?: boolean
  partnerActivity?: 'idle' | 'recording' | 'processing' | 'typing'
  sessionInfo?: {
    code: string
    status: 'connected' | 'connecting' | 'reconnecting' | 'disconnected'
    partnerOnline: boolean
  }
  messageQueueService?: IMessageQueue
  translationPipeline?: ITranslationPipeline
  presenceService?: PresenceService
}

export function SingleDeviceTranslator({ 
  onNewMessage, 
  messages: externalMessages, 
  isSessionMode = false,
  partnerActivity = 'idle',
  sessionInfo,
  messageQueueService,
  translationPipeline,
  presenceService
}: SingleDeviceTranslatorProps = {}) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { 
    playRecordingStart, 
    playRecordingStop, 
    playTranslationComplete, 
    playError, 
    playMessageSent, 
    isEnabled: soundsEnabled, 
    setEnabled: setSoundsEnabled, 
    volumeLevel, 
    setVolumeLevel, 
    notificationSound, 
    setNotificationSound, 
    testSound 
  } = useSounds()
  
  // Initialize services (dependency injection or fallback)
  const queueService = messageQueueService || messageQueue
  const pipeline = translationPipeline || createTranslationPipeline()
  
  // Helper functions for session status
  const getSessionStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <Wifi className="h-3 w-3 text-green-600" />
      case 'connecting':
        return <Wifi className="h-3 w-3 text-yellow-600 animate-pulse" />
      case 'reconnecting':
        return <RotateCcw className="h-3 w-3 text-yellow-600 animate-spin" />
      case 'disconnected':
        return <WifiOff className="h-3 w-3 text-red-600" />
      default:
        return null
    }
  }
  
  const getSessionStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return t('session.connected', 'Connected')
      case 'connecting':
        return t('session.connecting', 'Connecting...')
      case 'reconnecting':
        return t('session.reconnecting', 'Reconnecting...')
      case 'disconnected':
        return t('session.disconnected', 'Disconnected')
      default:
        return ''
    }
  }
  
  // State
  const [internalMessages, setInternalMessages] = useState<QueuedMessage[]>([])
  const messages = externalMessages || internalMessages
  
  // Message handling helpers
  const handleMessageUpdate = (updater: (prev: QueuedMessage[]) => QueuedMessage[]) => {
    if (onNewMessage && externalMessages) {
      // Session mode: Don't update external messages directly
      // Let the parent (SessionTranslator) handle the state
      // Just notify on specific events via direct onNewMessage calls
      console.log('📨 [SingleDeviceTranslator] Session mode - message update handled by parent')
    } else {
      // Solo mode: Handle internally (unchanged)
      setInternalMessages(updater)
    }
  }
  
  const setMessages = handleMessageUpdate
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentActivity, setCurrentActivity] = useState<'idle' | 'recording' | 'processing' | 'typing'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [targetLanguage, setTargetLanguage] = useState<'es' | 'pt' | 'fr' | 'de'>(() => {
    const saved = UserManager.getPreference('targetLanguage', 'es')
    // console.log('🎯 Initial target language:', saved)
    return saved as 'es' | 'pt' | 'fr' | 'de'
  })
  const [translationMode, setTranslationMode] = useState<'casual' | 'fun'>(() => UserManager.getTranslationMode())
  const [audioLevel, setAudioLevel] = useState(0)
  const [conversationContext, setConversationContext] = useState<ConversationContextEntry[]>([])
  const [textMessage, setTextMessage] = useState('')
  const [showTextInput, setShowTextInput] = useState(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large' | 'xl'>(() => UserManager.getFontSize())
  const [isDarkMode, setIsDarkMode] = useState(() => 
    localStorage.getItem('theme') === 'dark' || 
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  )
  
  // Using persistent audio manager instead of ref
  const audioManager = persistentAudioManager
  
  // Smart scroll behavior
  const { scrollContainerRef, scrollToBottom, scrollToMessage, isAtBottom, shouldAutoScroll } = useSmartScroll({
    threshold: 100,
    smoothScroll: true
  })
  
  // Unread messages tracking
  const userId = isSessionMode ? (localStorage.getItem('activeSession') ? JSON.parse(localStorage.getItem('activeSession')!).userId : 'single-user') : 'single-user'
  const {
    unreadCount,
    firstUnreadMessageId,
    markAllAsRead,
    setLastReadOnBlur,
    checkForNewMessages
  } = useUnreadMessages({ userId, isSessionMode })
  
  // Track if app has focus
  const [hasFocus, setHasFocus] = useState(true)

  // Debug logging for conversation context system
  useEffect(() => {
    // console.log('🔧 [ConversationContext] SingleDeviceTranslator initialized with conversation context system')
    // console.log('📊 [ConversationContext] Initial context state:', conversationContext.length, 'messages')
  }, [])
  
  // Handle smart scrolling when messages change
  useEffect(() => {
    // Check for new unread messages
    checkForNewMessages(messages)
    
    // Auto-scroll only if user is at bottom or should auto-scroll
    if (messages.length > 0 && shouldAutoScroll) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    }
  }, [messages, shouldAutoScroll, scrollToBottom, checkForNewMessages])
  
  // Handle focus/blur events for unread message tracking
  useEffect(() => {
    const handleFocus = () => {
      setHasFocus(true)
      // When regaining focus, scroll to first unread if there are unread messages
      if (unreadCount > 0 && firstUnreadMessageId) {
        setTimeout(() => {
          // console.log('📱 Focus regained - scrolling to first unread message:', firstUnreadMessageId)
          scrollToMessage(firstUnreadMessageId, 'top')
        }, 300)
      }
    }
    
    const handleBlur = () => {
      setHasFocus(false)
      setLastReadOnBlur()
    }
    
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    
    // Also handle visibility change API for mobile
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleBlur()
      } else {
        handleFocus()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [unreadCount, firstUnreadMessageId, scrollToMessage, setLastReadOnBlur])
  
  // Mark messages as read when at bottom
  useEffect(() => {
    if (isAtBottom && hasFocus) {
      markAllAsRead()
    }
  }, [isAtBottom, hasFocus, markAllAsRead])
  
  // Broadcast activity changes in session mode
  useEffect(() => {
    // Broadcast ALL activity changes including idle state transitions
    if (isSessionMode && presenceService) {
      console.log('🎯 [ActivityIndicator] Broadcasting:', currentActivity)
      presenceService.updateActivity(currentActivity)
        .catch((error) => {
          console.error('❌ [ActivityIndicator] Broadcast failed:', error)
        })
    }
  }, [currentActivity, isSessionMode, presenceService])

  // Log partner activity changes for debugging
  useEffect(() => {
    if (isSessionMode) {
      console.log(`🎯 [ActivityIndicator] Partner activity changed: ${partnerActivity}`)
    }
  }, [partnerActivity, isSessionMode])

  // Set up audio manager callbacks (but don't request permissions yet)
  useEffect(() => {
    // console.log('🎙️ Setting up audio manager callbacks...')
    // console.log('📱 Device info:', {
    //   userAgent: navigator.userAgent,
    //   platform: navigator.platform,
    //   vendor: navigator.vendor
    // })
    
    // Set up event callbacks
    audioManager.onAudioData = (level: number) => {
      setAudioLevel(level)
    }
    
    audioManager.onStateChange = (state) => {
      // console.log('🎤 Audio manager state changed:', state)
    }
    
    audioManager.onError = (error) => {
      console.error('🚨 Audio manager error:', error)
      setError(error.message)
    }
    
    // console.log('✅ Audio manager callbacks configured')
    
    return () => {
      // Cleanup callbacks (but keep persistent stream alive)
      audioManager.onAudioData = undefined
      audioManager.onStateChange = undefined
      audioManager.onError = undefined
    }
  }, [])

  // Close settings menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('[data-settings-menu]') && !target.closest('[data-settings-button]')) {
        setShowSettingsMenu(false)
      }
    }

    if (showSettingsMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSettingsMenu])

  const handleModeToggle = () => {
    const newMode = UserManager.toggleTranslationMode()
    setTranslationMode(newMode)
    // console.log(`🎯 Mode switched to: ${newMode}`)
  }

  // Audio level is now handled by the AudioRecorderService via Web Audio API
  // The onAudioData callback provides real-time audio levels
  
  const resetAudioLevel = () => {
    setAudioLevel(0)
  }


  // Spacebar recording for desktop - toggle record on/off
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle spacebar in this component when not focused on an input
      if (event.code === 'Space' && 
          !(event.target instanceof HTMLInputElement) && 
          !(event.target instanceof HTMLTextAreaElement) &&
          !event.repeat &&
          !showTextInput) { // Don't trigger when in text mode
        event.preventDefault()
        
        // Toggle recording state - allow recording even while processing
        if (isRecording) {
          handleStopRecording()
        } else {
          handleStartRecording()
        }
      }
    }

    // Only add listener for keydown in voice mode (no keyup needed for toggle)
    if (!showTextInput) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isRecording, isProcessing, showTextInput])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetAudioLevel()
    }
  }, [])

  const handleStartRecording = async () => {
    // [AUDIO LOGS DISABLED FOR DEBUGGING]
    // console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    // console.log('🎬 STARTING RECORDING WITH PERSISTENT STREAM')
    // console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    // console.log('📍 handleStartRecording called at:', new Date().toISOString())
    // console.log('🎤 isRecording state:', isRecording)
    // console.log('⚡ currentActivity state:', currentActivity)
    // console.log('🔧 Audio manager ready:', audioManager.isStreamReady())
    
    // Check if already recording
    if (isRecording) {
      // console.log('⚠️ Already recording - this should not happen in handleStartRecording')
      return
    }
    
    // Check if stream is ready, if not request permissions
    if (!audioManager.isStreamReady()) {
      // console.log('⚠️ Stream not ready, requesting permissions...')
      try {
        const hasPermissions = await audioManager.ensurePermissions()
        if (!hasPermissions) {
          console.error('❌ Failed to get microphone permissions')
          setError('Microphone permission denied. Please grant permission and try again.')
          return
        }
        // console.log('✅ Permissions granted, stream ready')
      } catch (err) {
        console.error('❌ Permission error:', err)
        setError(err instanceof Error ? err.message : 'Failed to access microphone')
        return
      }
    }
    
    try {
      setError(null)
      // console.log('🧹 Error state cleared')
      
      // console.log('🔊 Recording start (sound disabled for UI actions)')
      // Removed: playRecordingStart() - only play sounds for incoming messages
      
      // console.log('⏱️ Starting performance logger...')
      performanceLogger.start('single-device-recording')
      
      // console.log('🎤 Starting recording with persistent stream...')
      // console.log('   📊 Pre-recording state:', audioManager.getState())
      
      // Set up completion handler
      audioManager.onComplete = async (result: AudioRecordingResult) => {
        performanceLogger.end('single-device-recording')
        
        // Convert File to Blob for compatibility
        const audioBlob = new Blob([await result.audioFile.arrayBuffer()], { 
          type: result.audioFile.type 
        })
        
        // Process with OpenAI APIs
        await processAudioMessage(audioBlob)
      }
      
      // Start recording using persistent stream
      await audioManager.startRecording()
      
      // console.log('✅ Recording started successfully!')
      // console.log('   📊 Post-recording state:', audioManager.getState())
      
      // Update React state
      setIsRecording(true)
      console.log('🎤 [ActivityIndicator] Activity state change: idle → recording')
      setCurrentActivity('recording')
      
      // console.log('🎤 Recording state updated, visualizer should be active')
      // console.log('✅ RECORDING FLOW COMPLETED SUCCESSFULLY!')
      // console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      
    } catch (err) {
      // console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      // console.error('💥 RECORDING FLOW FAILED')
      // console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.error('❌ [Audio] Recording failed:', err)
      
      // Show user-friendly error message
      const errorMessage = (err as Error).message
      if (errorMessage.includes('not ready')) {
        setError('Audio system not ready. Please refresh the page.')
      } else if (errorMessage.includes('Permission denied')) {
        setError('Please allow microphone access to record audio.')
      } else if (errorMessage.includes('Recording too short')) {
        setError('Recording too short. Please hold the button longer (minimum 0.5 seconds).')
      } else if (errorMessage.includes('Invalid audio blob')) {
        setError('Recording failed. Please try again and hold the button longer.')
      } else {
        setError('Recording failed. Please check your microphone and try again.')
      }
      
      // Reset states
      setIsRecording(false)
      setCurrentActivity('idle')
      resetAudioLevel()
      playError()
      
      // console.log('💥 RECORDING FLOW FAILED - Error handling completed')
      // console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    }
  }

  const handleStopRecording = async () => {
    // [AUDIO LOGS DISABLED FOR DEBUGGING]
    // console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    // console.log('🛑 STOPPING RECORDING WITH PERSISTENT STREAM')
    // console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    // console.log('📍 handleStopRecording called at:', new Date().toISOString())
    // console.log('🎤 isRecording state:', isRecording)
    // console.log('⚡ currentActivity state:', currentActivity)
    // console.log('🔧 Audio manager state:', audioManager.getState())
    
    // Pre-validation checks
    if (!isRecording) {
      // console.warn('⚠️ Not recording according to state - cannot stop')
      return
    }
    
    if (audioManager.getState() !== 'recording') {
      // console.warn('⚠️ Audio manager not in recording state, resetting UI')
      setIsRecording(false)
      setCurrentActivity('idle')
      return
    }
    
    // console.log('✅ Pre-validation checks passed, proceeding to stop recording')

    try {
      // console.log('🛑 Stopping recording...')
      
      // Update UI state immediately
      setIsRecording(false)
      setCurrentActivity('idle')
      
      // console.log('🔊 Recording stop (sound disabled for UI actions)')
      // Removed: playRecordingStop() - only play sounds for incoming messages
      
      // Reset audio level to 0
      resetAudioLevel()

      // Stop recording using persistent stream
      await audioManager.stopRecording()
      
      // console.log('✅ Recording stopped successfully')

    } catch (err) {
      console.error('❌ Failed to stop recording:', err)
      setError('Failed to stop recording: ' + (err as Error).message)
      setCurrentActivity('idle')
      playError()
    }
  }

  const handleCancelRecording = async () => {
    // [AUDIO LOGS DISABLED FOR DEBUGGING]
    // console.log('🚫 CANCELING RECORDING')
    // console.log('📍 handleCancelRecording called at:', new Date().toISOString())
    // console.log('🎤 isRecording state:', isRecording)
    // console.log('⚡ currentActivity state:', currentActivity)
    
    if (!isRecording) {
      // console.warn('⚠️ Not recording according to state - cannot cancel')
      return
    }
    
    try {
      // console.log('🛑 Canceling recording without processing...')
      
      // Update UI state immediately
      setIsRecording(false)
      setCurrentActivity('idle')
      
      // Reset audio level to 0
      resetAudioLevel()
      
      // Stop recording using persistent stream (without processing)
      await audioManager.stopRecording()
      
      // Clear any completion handler to prevent processing
      audioManager.onComplete = undefined
      
      // console.log('✅ Recording canceled successfully')
      
    } catch (err) {
      console.error('❌ Failed to cancel recording:', err)
      setError('Failed to cancel recording: ' + (err as Error).message)
      setCurrentActivity('idle')
      playError()
    }
  }

  const processTextMessage = async (messageText: string) => {
    if (!messageText.trim()) return

    const messageId = generateMessageId()
    const totalStartTime = Date.now()
    
    try {
      // Create initial message in queue
      const initialMessage: QueuedMessage = {
        id: messageId,
        session_id: 'single-device-session',
        user_id: 'single-user',
        original: messageText,
        translation: null,
        original_lang: 'auto',
        target_lang: targetLanguage,
        status: 'processing',
        queued_at: new Date().toISOString(),
        processed_at: null,
        displayed_at: null,
        performance_metrics: null,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        localId: messageId,
        retryCount: 0,
        displayOrder: messages.length + 1
      }

      await queueService.add(initialMessage)
      
      // Add message to state based on mode
      if (onNewMessage && externalMessages) {
        // Session mode: notify parent of new message
        console.log('📨 [SingleDeviceTranslator] Session mode - notifying parent of new message:', {
          id: initialMessage.id,
          status: initialMessage.status,
          original: initialMessage.original,
          translation: initialMessage.translation
        })
        onNewMessage(initialMessage)
      } else {
        // Solo mode: update internal state
        setInternalMessages(prev => [...prev, initialMessage])
      }

      // Create translation request
      const recentMessages = messages.slice(-3).map(msg => msg.original).filter(Boolean)
      const translationRequest: TranslationRequest = {
        input: messageText,
        inputType: 'text',
        targetLanguage,
        mode: translationMode,
        context: {
          conversationContext,
          recentMessages,
          isRomanticContext: UserManager.detectRomanticContext(recentMessages)
        },
        messageId,
        userId: 'single-user',
        sessionId: 'single-device-session'
      }
      
      // Use translation pipeline
      const result = await pipeline.translate(translationRequest)
      
      // Update conversation context
      const updatedContext = ConversationContextManager.addToContext(
        conversationContext,
        messageText,
        result.originalLanguageCode,
        Date.now()
      )
      setConversationContext(updatedContext)
      
      // Update message
      const finalMessage: QueuedMessage = {
        ...initialMessage,
        original: result.original,
        translation: result.translation,
        original_lang: result.originalLanguageCode,
        target_lang: result.targetLanguageCode,
        status: 'displayed',
        processed_at: new Date().toISOString(),
        displayed_at: new Date().toISOString(),
        performance_metrics: {
          whisperTime: 0, // No whisper for text
          translationTime: result.metrics.translationTime,
          totalTime: result.metrics.totalTime
        }
      }

      await queueService.add(finalMessage)
      
      // Update message based on mode
      if (onNewMessage && externalMessages) {
        // Session mode: notify parent of updated message
        console.log('📨 [SingleDeviceTranslator] Session mode - notifying parent of completed message:', {
          id: finalMessage.id,
          status: finalMessage.status,
          original: finalMessage.original,
          translation: finalMessage.translation,
          originalLang: finalMessage.original_lang,
          targetLang: finalMessage.target_lang
        })
        onNewMessage(finalMessage)
      } else {
        // Solo mode: update internal state
        setInternalMessages(prev => prev.map(msg => 
          msg.id === messageId ? finalMessage : msg
        ))
      }

      // Play message sent sound
      playMessageSent()
      
      // Clear text input
      setTextMessage('')

    } catch (err) {
      console.error('❌ Text message processing failed:', err)
      setError(`Processing failed: ${(err as Error).message}`)
      playError()
      
      // Update message to failed state based on mode
      const failedMessage = { ...messages.find(m => m.id === messageId), status: 'failed' as const }
      if (onNewMessage && externalMessages) {
        // Session mode: notify parent of failed message
        console.log('📨 [SingleDeviceTranslator] Session mode - notifying parent of failed message:', messageId)
        onNewMessage(failedMessage)
      } else {
        // Solo mode: update internal state
        setInternalMessages(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, status: 'failed' as const } : msg
        ))
      }
    } finally {
      // Don't change global states - allow concurrent messages
      setTimeout(() => setError(null), 5000)
    }
  }

  const handleSendTextMessage = () => {
    if (textMessage.trim()) {
      processTextMessage(textMessage.trim())
    }
  }

  const processAudioMessage = async (audioBlob: Blob) => {
    const messageId = generateMessageId()
    
    // Set activity to processing
    console.log('⚙️ [SingleDeviceTranslator] Activity state change: recording → processing')
    setCurrentActivity('processing')

    try {
      // Create translation request
      const recentMessages = messages.slice(-3).map(msg => msg.original).filter(Boolean)
      const translationRequest: TranslationRequest = {
        input: audioBlob,
        inputType: 'audio',
        targetLanguage,
        mode: translationMode,
        context: {
          conversationContext,
          recentMessages,
          isRomanticContext: UserManager.detectRomanticContext(recentMessages)
        },
        messageId,
        userId: 'single-user',
        sessionId: 'single-device-session'
      }
      
      // Use translation pipeline
      const result = await pipeline.translate(translationRequest)
      
      // Update conversation context
      const updatedContext = ConversationContextManager.addToContext(
        conversationContext,
        result.original,
        result.originalLanguageCode,
        Date.now()
      )
      setConversationContext(updatedContext)

      // Final message update
      const finalMessage: QueuedMessage = {
        id: messageId,
        session_id: 'single-device-session',
        user_id: 'single-user',
        original: result.original,
        translation: result.translation,
        original_lang: result.originalLanguageCode,
        target_lang: result.targetLanguageCode,
        status: 'displayed',
        queued_at: new Date().toISOString(),
        processed_at: new Date().toISOString(),
        displayed_at: new Date().toISOString(),
        performance_metrics: {
          whisperTime: result.metrics.whisperTime || 0,
          translationTime: result.metrics.translationTime,
          totalTime: result.metrics.totalTime
        },
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        localId: messageId,
        retryCount: 0,
        displayOrder: messages.length + 1
      }

      await queueService.add(finalMessage)
      
      // Update message based on mode
      if (onNewMessage && externalMessages) {
        // Session mode: notify parent of updated message
        console.log('📨 [SingleDeviceTranslator] Session mode - notifying parent of completed message:', {
          id: finalMessage.id,
          status: finalMessage.status,
          original: finalMessage.original,
          translation: finalMessage.translation,
          originalLang: finalMessage.original_lang,
          targetLang: finalMessage.target_lang
        })
        onNewMessage(finalMessage)
      } else {
        // Solo mode: update internal state
        setInternalMessages(prev => [...prev, finalMessage])
      }

    } catch (err) {
      console.error('❌ Single device audio processing failed:', err)
      setError(`Processing failed: ${(err as Error).message}`)
      
      // Play error sound
      playError()
    } finally {
      // Reset activity to idle when processing completes
      console.log('✅ [SingleDeviceTranslator] Activity state change: processing → idle')
      setCurrentActivity('idle')
      
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000)
    }
  }

  return (
    <MobileContainer className="h-full">
      <div className="h-full bg-app flex flex-col overflow-hidden relative">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-72 h-72 bg-blue-200 dark:bg-blue-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-20 animate-pulse-soft" />
          <div className="absolute bottom-0 right-0 w-72 h-72 bg-indigo-200 dark:bg-indigo-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-20 animate-pulse-soft" style={{ animationDelay: '1s' }} />
        </div>

        {/* Header - Fixed at top for mobile visibility */}
        <header className="flex-shrink-0 fixed top-0 left-0 right-0 glass-effect border-b border-white/20 backdrop-blur-md z-50">
          <div className="container mx-auto px-2 py-1">
            <div className="flex items-center justify-between">
              {/* Left side - Back button and Settings */}
              <div className="flex items-center gap-1">
                <button
                  onClick={async () => {
                    if (isSessionMode) {
                      // In session mode, ensure proper cleanup before navigation
                      console.log('🚪 [SingleDeviceTranslator] Exiting session mode, cleaning up...')
                      
                      // Show confirmation dialog
                      const confirmExit = window.confirm('Are you sure you want to exit the session? This will disconnect you from your partner.')
                      
                      if (confirmExit) {
                        // Clean up MessageSyncService
                        await messageSyncService.cleanup()
                        
                        // Clear session from localStorage
                        localStorage.removeItem('activeSession')
                        
                        // Navigate to home
                        navigate('/')
                      }
                    } else {
                      // Solo mode - navigate directly
                      navigate('/')
                    }
                  }}
                  className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                
                {/* Settings Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                    className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    data-settings-button
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                  
                  {/* Settings Dropdown Menu */}
                  {showSettingsMenu && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 z-50" data-settings-menu>
                      {/* Font Size Setting */}
                      <div className="mb-3">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                          Font Size
                        </label>
                        <div className="grid grid-cols-4 gap-1">
                          {(['small', 'medium', 'large', 'xl'] as const).map((size) => (
                            <button
                              key={size}
                              onClick={() => {
                                UserManager.setFontSize(size)
                                setFontSize(size)
                              }}
                              className={`px-2 py-1 text-xs rounded transition-colors ${
                                fontSize === size
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                              }`}
                            >
                              {UserManager.getFontSizeDisplayName(size)}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Theme Toggle */}
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                        <button
                          onClick={() => {
                            const newTheme = isDarkMode ? 'light' : 'dark'
                            localStorage.setItem('theme', newTheme)
                            setIsDarkMode(!isDarkMode)
                            document.documentElement.classList.toggle('dark')
                          }}
                          className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <span className="text-gray-700 dark:text-gray-300">
                            Theme
                          </span>
                          {isDarkMode ? <Sun className="h-4 w-4 text-yellow-500" /> : <Moon className="h-4 w-4 text-gray-600" />}
                        </button>
                      </div>
                      
                      {/* Message Sounds Toggle */}
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                        <div className="flex items-center justify-between px-2 py-1.5">
                          <span className="text-xs text-gray-700 dark:text-gray-300">
                            Message Sounds
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSoundsEnabled(!soundsEnabled)}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                soundsEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                              }`}
                            >
                              <span
                                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                  soundsEnabled ? 'translate-x-5' : 'translate-x-1'
                                }`}
                              />
                            </button>
                            <button
                              onClick={() => testSound()}
                              className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                              title="Test sound"
                            >
                              Test
                            </button>
                          </div>
                        </div>
                        
                        {/* Volume Level - Only show when sounds are enabled */}
                        {soundsEnabled && (
                          <div className="mt-2 px-2">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                              Volume
                            </label>
                            <div className="grid grid-cols-2 gap-1">
                              <button
                                onClick={() => setVolumeLevel('quiet')}
                                className={`px-2 py-1 text-xs rounded transition-colors ${
                                  volumeLevel === 'quiet'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                              >
                                Quiet
                              </button>
                              <button
                                onClick={() => setVolumeLevel('loud')}
                                className={`px-2 py-1 text-xs rounded transition-colors ${
                                  volumeLevel === 'loud'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                              >
                                Loud
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {/* Notification Sound - Only show when sounds are enabled */}
                        {soundsEnabled && (
                          <div className="mt-2 px-2">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                              Notification Sound
                            </label>
                            <div className="grid grid-cols-3 gap-1">
                              <button
                                onClick={() => setNotificationSound('chime')}
                                className={`px-2 py-1 text-xs rounded transition-colors ${
                                  notificationSound === 'chime'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                              >
                                Chime
                              </button>
                              <button
                                onClick={() => setNotificationSound('bell')}
                                className={`px-2 py-1 text-xs rounded transition-colors ${
                                  notificationSound === 'bell'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                              >
                                Bell
                              </button>
                              <button
                                onClick={() => setNotificationSound('pop')}
                                className={`px-2 py-1 text-xs rounded transition-colors ${
                                  notificationSound === 'pop'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                              >
                                Pop
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Center - Session Info (only in session mode) */}
              {isSessionMode && sessionInfo && (
                <div className="flex items-center gap-3 text-xs">
                  {/* Session Code */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-600 dark:text-gray-400">Session:</span>
                    <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 text-sm">
                      {sessionInfo.code}
                    </span>
                  </div>
                  
                  {/* Connection Status */}
                  <div className="flex items-center gap-1.5">
                    {getSessionStatusIcon(sessionInfo.status)}
                    <span className="text-gray-600 dark:text-gray-400">{getSessionStatusText(sessionInfo.status)}</span>
                  </div>
                  
                  {/* Partner Status */}
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3 w-3 text-gray-500" />
                    <span className={`text-xs ${sessionInfo.partnerOnline ? 'text-green-600' : 'text-gray-500'}`}>
                      {sessionInfo.partnerOnline 
                        ? t('session.partnerOnline', 'Partner Online')
                        : t('session.partnerOffline', 'Waiting for partner...')
                      }
                    </span>
                  </div>
                </div>
              )}

              {/* Right side - Mode Toggle & Target Language */}
              <div className="flex items-center gap-2">
                {/* Mode Toggle - Ultra Compact */}
                <button
                  onClick={handleModeToggle}
                  disabled={isProcessing || isRecording}
                  className={`
                    px-2 py-0.5 rounded-full text-[10px] font-medium transition-all duration-200
                    ${translationMode === 'fun' 
                      ? 'bg-pink-100 text-pink-700 hover:bg-pink-200 dark:bg-pink-900/30 dark:text-pink-300' 
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300'
                    }
                    ${isProcessing || isRecording ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
                  `}
                  title={`Current mode: ${translationMode}. Click to toggle.`}
                >
                  {translationMode === 'fun' ? '🎉' : '💬'}
                </button>
                
                {/* Target Language - Compact */}
                <select
                  value={targetLanguage}
                  onChange={(e) => {
                    const newLang = e.target.value as 'es' | 'pt' | 'fr' | 'de'
                    console.log('🎯 Target language changed to:', newLang)
                    setTargetLanguage(newLang)
                    UserManager.setPreference('targetLanguage', newLang)
                  }}
                  disabled={isProcessing || isRecording}
                  className="text-xs bg-transparent border-none text-gray-900 dark:text-gray-100 focus:outline-none pr-1"
                >
                  <option value="es">ES</option>
                  <option value="pt">PT</option>
                  <option value="fr">FR</option>
                  <option value="de">DE</option>
                </select>
              </div>
            </div>
          </div>
        </header>
        
        {/* Message Area - Takes remaining space with padding for fixed header and footer */}
        <div 
          ref={scrollContainerRef}
          className="overflow-y-auto p-4 space-y-4" 
          style={{
            height: 'calc(100vh - 64px - 80px)', // Full viewport minus header (64px) and footer (80px)
            marginTop: '64px', // Space for fixed header
            paddingBottom: '80px', // Space for fixed footer
            touchAction: 'pan-y',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch'
          }}>
            {messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-4 max-w-md mx-auto">
                  <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <Mic className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      {t('translator.welcomeTitle', 'Ready to Translate')}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {t('translator.welcomeMessage', 'Hold the button below to record and translate between languages automatically.')}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message, index) => {
                  const isFirstUnread = message.id === firstUnreadMessageId
                  return (
                    <div key={message.id}>
                      {/* Show unread divider before first unread message */}
                      {isFirstUnread && (
                        <UnreadMessagesDivider 
                          isVisible={true}
                          messageCount={unreadCount}
                        />
                      )}
                      <div id={`message-${message.id}`}>
                        <MessageBubble 
                          message={message} 
                          theme="blue"
                          currentUserId={(() => {
                            // Get current user ID from session context or use default
                            const sessionState = localStorage.getItem('activeSession')
                            if (sessionState) {
                              try {
                                const parsed = JSON.parse(sessionState)
                                return parsed.userId
                              } catch (e) {
                                console.error('Failed to parse session state:', e)
                              }
                            }
                            return 'single-user'
                          })()}
                          isSessionMode={isSessionMode}
                          fontSize={fontSize}
                        />
                      </div>
                    </div>
                  )
                })}
              </>
            )}

            {/* Activity Indicators */}
            {/* Own activity - Only show when NOT processing a message */}
            {currentActivity !== 'idle' && !isProcessing && (
              <ActivityIndicator 
                activity={currentActivity} 
                userName={t('translator.you', 'You')}
                isOwnMessage={true}
              />
            )}
            
            {/* Partner activity in session mode */}
            {isSessionMode && partnerActivity !== 'idle' && (
              <ActivityIndicator 
                activity={partnerActivity} 
                userName="Partner"
                isOwnMessage={false}
              />
            )}
            
            {/* Scroll to bottom button */}
            <ScrollToBottomButton 
              onClick={scrollToBottom}
              isVisible={!isAtBottom}
              unreadCount={unreadCount}
            />
        </div>
        
        {/* Recording Controls - Fixed at bottom */}
        <div className="fixed bottom-0 left-0 right-0 p-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-700/50 z-40">
            {/* Enhanced Error Display */}
            {error && (
              <ErrorDisplay 
                error={error}
                onDismiss={() => setError(null)}
                onRetry={() => {
                  setError(null)
                  if (!isRecording) {
                    handleStartRecording()
                  }
                }}
                className="mb-2 mx-1"
              />
            )}

            {/* Text Message Input - Compact */}
            {showTextInput && (
              <div className="mb-2 flex gap-1.5 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <input
                  type="text"
                  value={textMessage}
                  onChange={(e) => setTextMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && textMessage.trim()) {
                      handleSendTextMessage()
                    }
                  }}
                  placeholder="Type message..."
                  className="flex-1 px-2 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-white"
                />
                <Button
                  onClick={handleSendTextMessage}
                  disabled={!textMessage.trim()}
                  size="sm"
                  className="px-3 py-1.5 text-xs"
                >
                  Send
                </Button>
              </div>
            )}

            {/* Combined Recording Controls - Single Row Layout */}
            {!showTextInput && (
              <div className="flex items-center justify-between gap-2">
                {/* Left: Input Mode Toggle - Icon Only */}
                <div className="relative bg-white dark:bg-gray-800 rounded-full p-0.5 shadow-sm border border-gray-200 dark:border-gray-700 flex-shrink-0">
                  <div 
                    className={`absolute top-0.5 bottom-0.5 w-1/2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-transform duration-200 ${
                      showTextInput ? 'translate-x-full' : 'translate-x-0'
                    }`}
                  />
                  <div className="relative flex">
                    <button
                      onClick={() => setShowTextInput(false)}
                      className={`relative z-10 p-1.5 rounded-full transition-all duration-200 flex items-center justify-center ${
                        !showTextInput 
                          ? 'text-white'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                      title="Voice input"
                    >
                      <Mic className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setShowTextInput(true)}
                      className={`relative z-10 p-1.5 rounded-full transition-all duration-200 flex items-center justify-center ${
                        showTextInput 
                          ? 'text-white'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                      title="Text input"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Center: Status Text */}
                <p className="text-[10px] text-gray-600 dark:text-gray-400 flex-1 text-center">
                  {isRecording ? 'Recording...' : 'Tap to record'}
                </p>

                {/* Right: Recording Button and Controls */}
                <div className="flex items-center gap-2">
                  {/* Cancel Button - Only shown when recording */}
                  {isRecording && (
                    <button
                      onClick={handleCancelRecording}
                      className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full text-[10px] font-medium transition-colors shadow-sm"
                    >
                      Cancel
                    </button>
                  )}
                  
                  {/* Recording Button */}
                  <button
                    data-testid="recording-button"
                    onClick={async (e) => {
                      console.log('🖱️ RECORDING BUTTON CLICKED!')
                      console.log('   🎤 isRecording:', isRecording)
                      console.log('   🔧 audioManager exists:', !!audioManager)
                      console.log('   📡 audioManager stream ready:', audioManager.isStreamReady())
                      
                      if (isRecording) {
                        console.log('   ▶️ Calling handleStopRecording()')
                        await handleStopRecording()
                      } else {
                        console.log('   ▶️ Calling handleStartRecording()')
                        await handleStartRecording()
                      }
                    }}
                    disabled={false}
                    className={`
                      w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 transform-gpu flex-shrink-0
                      ${isRecording 
                        ? 'bg-green-500 hover:bg-green-600 scale-110 shadow-lg shadow-green-500/50' 
                        : 'bg-green-500 hover:bg-green-600 hover:scale-105 shadow-lg shadow-green-500/30'
                      }
                      active:scale-95
                      text-white
                    `}
                  >
                    {isRecording ? (
                      <div className="animate-pulse">
                        <Mic className="h-4 w-4" />
                      </div>
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </button>
                  
                  {/* Inline 5-bar audio visualization */}
                  <AudioVisualization
                    audioLevel={audioLevel}
                    isRecording={isRecording}
                    size="sm"
                    colors={{
                      active: isRecording ? '#10B981' : '#10B981', // Green for both states
                      inactive: '#E5E7EB'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Text Input Mode */}
            {showTextInput && (
              <div className="flex items-center gap-2">
                {/* Input Mode Toggle - Icon Only */}
                <div className="relative bg-white dark:bg-gray-800 rounded-full p-0.5 shadow-sm border border-gray-200 dark:border-gray-700 flex-shrink-0">
                  <div 
                    className={`absolute top-0.5 bottom-0.5 w-1/2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-transform duration-200 ${
                      showTextInput ? 'translate-x-full' : 'translate-x-0'
                    }`}
                  />
                  <div className="relative flex">
                    <button
                      onClick={() => setShowTextInput(false)}
                      className={`relative z-10 p-1.5 rounded-full transition-all duration-200 flex items-center justify-center ${
                        !showTextInput 
                          ? 'text-white'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                      title="Voice input"
                    >
                      <Mic className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setShowTextInput(true)}
                      className={`relative z-10 p-1.5 rounded-full transition-all duration-200 flex items-center justify-center ${
                        showTextInput 
                          ? 'text-white'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                      title="Text input"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>
      
      {/* Debug Console for Mobile - Hidden in production */}
      {/* <DebugConsole /> */}
    </MobileContainer>
  )
}

export default SingleDeviceTranslator