import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AudioVisualization } from '@/components/ui/AudioVisualization'
import { ActivityIndicator } from '@/features/messages/ActivityIndicator'
import { useSession } from '../session/SessionContext'
import { AudioRecorderService, type AudioRecordingResult } from '@/services/audio/recorder'
import { SecureWhisperService as WhisperService } from '@/services/openai/whisper-secure'
import { SecureTranslationService as TranslationService } from '@/services/openai/translation-secure'
import { MessageService } from '@/services/supabase/messages'
import { ActivityService } from '@/services/supabase/activity'
import { messageQueue } from '@/features/messages/MessageQueue'
import { performanceLogger } from '@/lib/performance'
import { useTranslation } from '@/lib/i18n/useTranslation'
import { useSounds } from '@/lib/sounds/SoundManager'
import { ConversationContextManager, type ConversationContextEntry } from '@/lib/conversation/ConversationContext'
import { UserManager } from '@/lib/user/UserManager'
import { 
  Mic, 
  Languages,
  Sparkles,
  Send,
  Loader2
} from 'lucide-react'

export function SessionRecordingControls() {
  const { session, userId } = useSession()
  const { t } = useTranslation()
  const { playRecordingStart, playRecordingStop, playTranslationComplete, playError, playMessageSent } = useSounds()
  
  // State
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentActivity, setCurrentActivity] = useState<'idle' | 'recording' | 'processing' | 'typing'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [targetLanguage, setTargetLanguage] = useState<'es' | 'pt'>(() => {
    const saved = UserManager.getPreference('targetLanguage', 'es')
    return saved as 'es' | 'pt'
  })
  const [translationMode, setTranslationMode] = useState<'casual' | 'fun'>(() => UserManager.getTranslationMode())
  const [audioLevel, setAudioLevel] = useState(0)
  const [detectedLanguage, setDetectedLanguage] = useState<string>('Auto-detecting...')
  const [textMessage, setTextMessage] = useState('')
  const [showTextInput, setShowTextInput] = useState(false)
  const [conversationContext, setConversationContext] = useState<ConversationContextEntry[]>([])
  const [permissionError, setPermissionError] = useState<string | null>(null)
  
  const audioRecorderRef = useRef<AudioRecorderService | null>(null)
  const recordButtonRef = useRef<HTMLButtonElement>(null)

  // Don't check permissions on mount - wait for user interaction
  useEffect(() => {
    // Initialize recorder without requesting permissions
    initializeRecorder()
  }, [])

  const checkMicrophonePermission = async () => {
    try {
      // Check if permissions API is available
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        
        if (permission.state === 'denied') {
          setPermissionError('Microphone access is blocked. Please enable it in your browser settings.')
          return
        }
      }
      
      // Try to get user media to prompt for permission if needed
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop()) // Clean up immediately
      
      // Initialize audio recorder after permission granted
      initializeRecorder()
    } catch (err) {
      console.error('Microphone permission error:', err)
      setPermissionError('Please allow microphone access to use voice recording.')
    }
  }

  // Initialize audio recorder
  const initializeRecorder = async () => {
    try {
      audioRecorderRef.current = new AudioRecorderService({
        maxDuration: 60 // 1 minute max
      })
      console.log('🎙️ Audio recorder initialized for Session Mode')
    } catch (err) {
      setError('Failed to initialize audio recorder. Please check microphone permissions.')
      console.error('❌ Audio recorder initialization failed:', err)
    }
  }

  // Audio level monitoring
  const audioLevelIntervalRef = useRef<number>()

  const startAudioLevelMonitoring = () => {
    audioLevelIntervalRef.current = window.setInterval(() => {
      if (isRecording) {
        const baseLevel = 0.3 + Math.random() * 0.4
        const spikeChance = Math.random()
        const level = spikeChance > 0.8 ? baseLevel + Math.random() * 0.3 : baseLevel
        setAudioLevel(Math.min(level, 1))
      }
    }, 100)
  }

  const stopAudioLevelMonitoring = () => {
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current)
      audioLevelIntervalRef.current = undefined
    }
    setAudioLevel(0)
  }

  const handleStartRecording = async () => {
    try {
      if (!session) return
      
      // Always check permissions when user clicks record
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach(track => track.stop())
        setPermissionError(null)
      } catch (permErr: any) {
        console.error('Microphone permission error:', permErr)
        if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
          setPermissionError('Microphone access denied. Please allow microphone access in your browser settings.')
        } else {
          setPermissionError('Please allow microphone access to use voice recording.')
        }
        return
      }
      
      // Initialize recorder if needed
      if (!audioRecorderRef.current) {
        await initializeRecorder()
        if (!audioRecorderRef.current) {
          setError('Failed to initialize audio recorder.')
          return
        }
      }
      
      performanceLogger.startWorkflow('session-recording')
      setError(null)
      setCurrentActivity('recording')
      setIsRecording(true)
      setDetectedLanguage('Listening...')
      
      playRecordingStart()
      startAudioLevelMonitoring()
      
      // Notify other users that we're recording
      await ActivityService.updateActivity(session.id, userId, 'recording')
      
      await audioRecorderRef.current.startRecording()
      console.log('🎙️ Recording started in session mode')
    } catch (err: any) {
      console.error('❌ Failed to start recording:', err)
      
      // Check for specific permission errors
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError('Microphone access denied. Please allow microphone access to record audio.')
      } else if (err.message && err.message.includes('permission')) {
        setPermissionError('Please allow microphone access to use voice recording.')
      } else {
        setError('Failed to start recording. Please try again.')
      }
      
      setIsRecording(false)
      setCurrentActivity('idle')
      stopAudioLevelMonitoring()
      playError()
    }
  }

  const handleStopRecording = async () => {
    try {
      if (!audioRecorderRef.current || !isRecording || !session) return
      
      console.log('🛑 Stopping recording...')
      setIsRecording(false)
      stopAudioLevelMonitoring()
      playRecordingStop()
      
      performanceLogger.mark('recording-stopped')
      
      const result = await audioRecorderRef.current.stopRecording()
      
      if (!result || !result.blob) {
        throw new Error('No recording data available')
      }
      
      setCurrentActivity('processing')
      setIsProcessing(true)
      
      // Clear recording activity
      await ActivityService.clearActivity(session.id, userId)
      
      // Process the audio
      await processAudioRecording(result)
      
    } catch (err) {
      console.error('❌ Error stopping recording:', err)
      setError('Failed to process recording. Please try again.')
      playError()
    } finally {
      setIsRecording(false)
      setIsProcessing(false)
      setCurrentActivity('idle')
    }
  }

  const processAudioRecording = async (result: AudioRecordingResult) => {
    if (!session) return
    
    try {
      // Step 1: Transcribe audio
      performanceLogger.mark('transcription-start')
      const transcription = await WhisperService.transcribe(result.blob)
      performanceLogger.mark('transcription-complete')
      
      console.log('📝 Transcription complete:', transcription.text)
      setDetectedLanguage(transcription.language || 'Unknown')
      
      // Step 2: Get conversation context
      const context = ConversationContextManager.getContext('session', conversationContext)
      
      // Step 3: Translate if needed
      performanceLogger.mark('translation-start')
      const translation = await TranslationService.translate({
        text: transcription.text,
        targetLanguage,
        mode: translationMode,
        context
      })
      performanceLogger.mark('translation-complete')
      
      console.log('🌐 Translation complete:', translation.translatedText)
      
      // Step 4: Create and send message
      const message = await MessageService.createMessage({
        session_id: session.id,
        user_id: userId,
        original_text: transcription.text,
        translated_text: translation.translatedText,
        original_language: transcription.language || 'en',
        target_language: targetLanguage,
        mode: translationMode,
        detected_language: transcription.language
      })
      
      // Add to local queue
      messageQueue.add({
        ...message,
        isOwn: true,
        isLeft: UserManager.getOrCreateUser().isLeft
      })
      
      // Update conversation context
      const newEntry: ConversationContextEntry = {
        speaker: 'user',
        originalText: transcription.text,
        translatedText: translation.translatedText
      }
      setConversationContext(prev => [...prev.slice(-4), newEntry])
      
      playTranslationComplete()
      playMessageSent()
      
      performanceLogger.endWorkflow('session-recording')
      
    } catch (err) {
      console.error('❌ Error processing audio:', err)
      setError('Failed to process audio. Please try again.')
      playError()
    }
  }

  const handleTextSubmit = async () => {
    if (!textMessage.trim() || !session || isProcessing) return
    
    try {
      setIsProcessing(true)
      setCurrentActivity('processing')
      
      performanceLogger.startWorkflow('text-translation')
      
      // Get conversation context
      const context = ConversationContextManager.getContext('session', conversationContext)
      
      // Translate text
      const translation = await TranslationService.translate({
        text: textMessage,
        targetLanguage,
        mode: translationMode,
        context
      })
      
      // Create and send message
      const message = await MessageService.createMessage({
        session_id: session.id,
        user_id: userId,
        original_text: textMessage,
        translated_text: translation.translatedText,
        original_language: 'en', // Assume English for text input
        target_language: targetLanguage,
        mode: translationMode
      })
      
      // Add to local queue
      messageQueue.add({
        ...message,
        isOwn: true,
        isLeft: UserManager.getOrCreateUser().isLeft
      })
      
      // Update conversation context
      const newEntry: ConversationContextEntry = {
        speaker: 'user',
        originalText: textMessage,
        translatedText: translation.translatedText
      }
      setConversationContext(prev => [...prev.slice(-4), newEntry])
      
      playTranslationComplete()
      playMessageSent()
      
      setTextMessage('')
      performanceLogger.endWorkflow('text-translation')
      
    } catch (err) {
      console.error('❌ Error sending text message:', err)
      setError('Failed to send message. Please try again.')
      playError()
    } finally {
      setIsProcessing(false)
      setCurrentActivity('idle')
    }
  }

  const handleModeToggle = () => {
    const newMode = UserManager.toggleTranslationMode()
    setTranslationMode(newMode)
    console.log(`🎯 Mode switched to: ${newMode}`)
  }

  const handleTargetLanguageToggle = () => {
    const newLang = targetLanguage === 'es' ? 'pt' : 'es'
    setTargetLanguage(newLang)
    UserManager.setPreference('targetLanguage', newLang)
    console.log(`🌐 Target language switched to: ${newLang}`)
  }

  // Update activity when typing
  useEffect(() => {
    if (!session || !textMessage.trim()) return
    
    const updateTypingActivity = async () => {
      await ActivityService.updateActivity(session.id, userId, 'typing')
    }
    
    updateTypingActivity()
    
    // Clear activity when done typing
    return () => {
      if (session) {
        ActivityService.clearActivity(session.id, userId)
      }
    }
  }, [textMessage, session, userId])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopAudioLevelMonitoring()
      if (audioRecorderRef.current && isRecording) {
        audioRecorderRef.current.stopRecording()
      }
    }
  }, [isRecording])

  return (
    <div className="p-4 glass-effect border-t border-white/20">
      {/* Status and controls row */}
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Activity status */}
        {currentActivity !== 'idle' && (
          <div className="flex justify-center">
            <ActivityIndicator type={currentActivity} />
          </div>
        )}
        
        {/* Error message */}
        {(error || permissionError) && (
          <div className="text-center text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
            {error || permissionError}
          </div>
        )}

        {/* Top controls row */}
        <div className="flex items-center justify-between gap-2">
          {/* Language toggle */}
          <Button
            onClick={handleTargetLanguageToggle}
            variant="secondary"
            size="sm"
            className="gap-2"
          >
            <Languages className="h-4 w-4" />
            <span className="uppercase">{targetLanguage}</span>
          </Button>

          {/* Voice/Type Toggle - Matches solo mode style exactly */}
          <div className="flex items-center justify-center">
            <div className="relative bg-white dark:bg-gray-800 rounded-full p-1 shadow-lg border border-gray-200 dark:border-gray-700">
              {/* Background indicator */}
              <div 
                className={`absolute top-1 bottom-1 w-1/2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-transform duration-300 ease-out shadow-md ${
                  showTextInput ? 'translate-x-full' : 'translate-x-0'
                }`}
              />
              <div className="relative flex">
                <button
                  onClick={() => setShowTextInput(false)}
                  className={`relative z-10 px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                    !showTextInput 
                      ? 'text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  <Mic className="h-4 w-4" />
                  Voice
                </button>
                <button
                  onClick={() => setShowTextInput(true)}
                  className={`relative z-10 px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                    showTextInput 
                      ? 'text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Type
                </button>
              </div>
            </div>
          </div>

          {/* Mode toggle */}
          <Button
            onClick={handleModeToggle}
            variant={translationMode === 'fun' ? 'primary' : 'secondary'}
            size="sm"
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Text input (when toggled) */}
        {showTextInput && (
          <div className="flex gap-2">
            <Input
              value={textMessage}
              onChange={(e) => setTextMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleTextSubmit()}
              placeholder={t('session.typeMessage')}
              disabled={isProcessing}
              className="flex-1"
            />
            <Button
              onClick={handleTextSubmit}
              disabled={!textMessage.trim() || isProcessing}
              size="sm"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
        
        {/* Recording button */}
        {!showTextInput && (
          <div className="flex flex-col items-center">
            <button
              data-testid="recording-button"
              onClick={() => {
                if (!isProcessing && !permissionError) {
                  if (isRecording) {
                    handleStopRecording()
                  } else {
                    handleStartRecording()
                  }
                }
              }}
              disabled={isProcessing || !!permissionError}
              className={`
                w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 transform-gpu
                ${isRecording 
                  ? 'bg-red-500 hover:bg-red-600 scale-110 shadow-lg shadow-red-500/50' 
                  : 'bg-blue-500 hover:bg-blue-600 hover:scale-105 shadow-lg shadow-blue-500/30'
                }
                ${(isProcessing || !!permissionError) ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
                text-white
              `}
            >
              {isProcessing ? (
                <div className="animate-spin">⚙️</div>
              ) : isRecording ? (
                <div className="animate-pulse">
                  <Mic className="h-8 w-8" />
                </div>
              ) : (
                <Mic className="h-8 w-8" />
              )}
            </button>
            
            {/* 5-bar audio visualization */}
            <div className="mt-4">
              <AudioVisualization
                audioLevel={audioLevel}
                isRecording={isRecording}
                size="lg"
                colors={{
                  active: isRecording ? '#EF4444' : '#3B82F6',
                  inactive: '#E5E7EB'
                }}
              />
            </div>
          </div>
        )}
        
        {/* Instructions */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          {isProcessing 
            ? t('session.processing', 'Processing your message...')
            : showTextInput
              ? 'Type your message and press Enter or click Send'
              : isRecording 
                ? t('session.releaseToTranslate', 'Recording... Click again to translate')
                : t('session.holdToRecord', 'Click to record')
          }
        </p>
        
        {/* Language detection */}
        {detectedLanguage !== 'Auto-detecting...' && detectedLanguage !== 'Listening...' && (
          <p className="text-center text-xs text-gray-400">
            Detected: {detectedLanguage}
          </p>
        )}
      </div>
    </div>
  )
}