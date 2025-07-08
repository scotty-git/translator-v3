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

  // Initialize recorder on mount - NO permission checking
  useEffect(() => {
    initializeRecorder()
  }, [])

  const checkMicrophonePermission = async () => {
    try {
      // Check if permissions API is available
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        
        if (permission.state === 'denied') {
          setPermissionError('Microphone access is blocked. Please enable it in your browser settings.')
          return false
        }
        
        if (permission.state === 'granted') {
          console.log('🎙️ Microphone permission already granted')
          setPermissionError(null)
          return true
        }
      }
      
      // Try to get user media to prompt for permission if needed
      console.log('🎙️ Requesting microphone permission...')
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      
      // Permission granted, clean up immediately
      stream.getTracks().forEach(track => track.stop())
      console.log('✅ Microphone permission granted')
      setPermissionError(null)
      return true
      
    } catch (err: any) {
      console.error('🚫 Microphone permission error:', err)
      
      if (err.name === 'NotAllowedError') {
        setPermissionError('Microphone access denied. Please allow microphone access and refresh the page.')
      } else if (err.name === 'NotFoundError') {
        setPermissionError('No microphone found. Please connect a microphone and refresh the page.')
      } else if (err.name === 'NotReadableError') {
        setPermissionError('Microphone is being used by another application. Please close other apps and refresh.')
      } else {
        setPermissionError('Microphone access failed. Please check your browser settings and refresh the page.')
      }
      return false
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
    // Simulate audio level for visualization
    audioLevelIntervalRef.current = window.setInterval(() => {
      if (isRecording) {
        // Simulate realistic audio levels with some variation
        const baseLevel = 0.3 + Math.random() * 0.4
        const variation = Math.sin(Date.now() * 0.01) * 0.2
        setAudioLevel(Math.max(0, Math.min(1, baseLevel + variation)))
      }
    }, 50) // 20fps updates like solo mode
  }

  const stopAudioLevelMonitoring = () => {
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current)
      audioLevelIntervalRef.current = undefined
    }
    setAudioLevel(0)
  }

  const handleStartRecording = async () => {
    if (!audioRecorderRef.current || !session) return
    
    try {
      setError(null)
      setPermissionError(null)
      setIsRecording(true)
      setCurrentActivity('recording')
      setDetectedLanguage('Listening...')
      
      // Play recording start sound
      playRecordingStart()
      
      // Start audio level monitoring for visualization
      startAudioLevelMonitoring()
      
      performanceLogger.startWorkflow('session-recording')
      await audioRecorderRef.current.startRecording()
      
      // Notify other users that we're recording
      await ActivityService.updateActivity(session.id, userId, 'recording')
      
      console.log('🎙️ Recording started in session mode')
    } catch (err: any) {
      console.error('❌ Failed to start recording:', err)
      setError('Failed to start recording. Please try again.')
      setIsRecording(false)
      setCurrentActivity('idle')
      stopAudioLevelMonitoring()
      playError()
    }
  }

  const handleStopRecording = async () => {
    if (!audioRecorderRef.current || !isRecording || !session) return

    try {
      setIsRecording(false)
      setCurrentActivity('processing')
      setIsProcessing(true)
      
      // Play recording stop sound
      playRecordingStop()
      
      // Stop audio level monitoring
      stopAudioLevelMonitoring()

      // Set up completion handler before stopping
      audioRecorderRef.current.onComplete = async (result: AudioRecordingResult) => {
        performanceLogger.mark('recording-stopped')
        
        // Convert File to Blob for compatibility
        const audioBlob = new Blob([await result.audioFile.arrayBuffer()], { 
          type: result.audioFile.type 
        })
        
        // Process with real OpenAI APIs
        await processAudioRecording({ blob: audioBlob })
      }

      audioRecorderRef.current.onError = (error: Error) => {
        setError('Recording failed: ' + error.message)
        setCurrentActivity('idle')
        setIsProcessing(false)
        playError()
      }

      // Stop recording - this will trigger onComplete
      await audioRecorderRef.current.stopRecording()

    } catch (err) {
      setError('Failed to process recording: ' + (err as Error).message)
      setCurrentActivity('idle')
      setIsProcessing(false)
      playError()
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
          {/* Target Language - Match solo mode style */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{t('translator.targetLang', 'Target')}:</span>
            <select
              value={targetLanguage}
              onChange={(e) => {
                const newLang = e.target.value as 'es' | 'pt'
                console.log('🎯 Target language changed to:', newLang)
                setTargetLanguage(newLang)
                UserManager.setPreference('targetLanguage', newLang)
              }}
              disabled={isProcessing || isRecording}
              className="text-sm bg-transparent border-none text-gray-900 dark:text-gray-100 focus:outline-none"
            >
              <option value="es">Español</option>
              <option value="pt">Português</option>
            </select>
          </div>

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

          {/* Mode Toggle - Match solo mode style */}
          <button
            onClick={handleModeToggle}
            disabled={isProcessing || isRecording}
            className={`
              px-3 py-1 rounded-full text-xs font-medium transition-all duration-200
              ${translationMode === 'fun' 
                ? 'bg-pink-100 text-pink-700 hover:bg-pink-200 dark:bg-pink-900/30 dark:text-pink-300' 
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300'
              }
              ${isProcessing || isRecording ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
            `}
            title={`Current mode: ${translationMode}. Click to toggle.`}
          >
            {translationMode === 'fun' ? '🎉 Fun' : '💬 Casual'}
          </button>
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
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              disabled={isProcessing}
              className={`
                w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 transform-gpu
                ${isRecording 
                  ? 'bg-red-500 hover:bg-red-600 scale-110 shadow-lg shadow-red-500/50' 
                  : 'bg-blue-500 hover:bg-blue-600 hover:scale-105 shadow-lg shadow-blue-500/30'
                }
                ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
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