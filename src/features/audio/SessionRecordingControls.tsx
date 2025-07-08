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
  MicOff, 
  Keyboard,
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
  
  const audioRecorderRef = useRef<AudioRecorderService | null>(null)
  const recordButtonRef = useRef<HTMLButtonElement>(null)

  // Initialize audio recorder
  useEffect(() => {
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
    
    initializeRecorder()
  }, [])

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
      if (!audioRecorderRef.current || !session) return
      
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
    } catch (err) {
      console.error('❌ Failed to start recording:', err)
      setError('Failed to start recording. Please check microphone permissions.')
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

  // Touch and mouse handlers for recording button
  const handlePointerDown = (e: React.PointerEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!isProcessing) {
      handleStartRecording()
    }
  }

  const handlePointerUp = (e: React.PointerEvent | React.TouchEvent) => {
    e.preventDefault()
    if (isRecording) {
      handleStopRecording()
    }
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
        {error && (
          <div className="text-center text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
        
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
        
        {/* Control buttons */}
        <div className="flex items-center justify-center gap-4">
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
          
          {/* Recording button */}
          <div className="relative">
            {/* Audio visualization background */}
            {isRecording && (
              <div className="absolute inset-0 flex items-center justify-center">
                <AudioVisualization
                  isActive={isRecording}
                  audioLevel={audioLevel}
                  size="lg"
                />
              </div>
            )}
            
            {/* Record button */}
            <button
              ref={recordButtonRef}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchEnd={handlePointerUp}
              disabled={isProcessing}
              className={`
                relative z-10 rounded-full p-6 transition-all duration-200 touch-none
                ${isRecording 
                  ? 'bg-red-500 hover:bg-red-600 scale-110 shadow-xl' 
                  : 'bg-blue-500 hover:bg-blue-600 shadow-lg hover:shadow-xl'
                }
                ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
              `}
            >
              {isRecording ? (
                <MicOff className="h-8 w-8 text-white" />
              ) : (
                <Mic className="h-8 w-8 text-white" />
              )}
            </button>
          </div>
          
          {/* Text input toggle */}
          <Button
            onClick={() => setShowTextInput(!showTextInput)}
            variant="secondary"
            size="sm"
          >
            <Keyboard className="h-4 w-4" />
          </Button>
          
          {/* Mode toggle */}
          <Button
            onClick={handleModeToggle}
            variant={translationMode === 'fun' ? 'primary' : 'secondary'}
            size="sm"
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Instructions */}
        <p className="text-center text-sm text-gray-500">
          {isRecording 
            ? t('session.releaseToTranslate')
            : t('session.holdToRecord')
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