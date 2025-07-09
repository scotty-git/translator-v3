import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Mic, MicOff, Settings, Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AudioVisualization } from '@/components/ui/AudioVisualization'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { MessageBubble } from '@/features/messages/MessageBubble'
import { ActivityIndicator } from '@/features/messages/ActivityIndicator'
import { messageQueue, type QueuedMessage } from '@/features/messages/MessageQueue'
import { createOptimizedAudioRecorder, type AudioRecordingResult } from '@/services/audio/ios-recorder'
import { SecureWhisperService as WhisperService } from '@/services/openai/whisper-secure'
import { SecureTranslationService as TranslationService } from '@/services/openai/translation-secure'
import { performanceLogger } from '@/lib/performance'
import { useTranslation } from '@/lib/i18n/useTranslation'
import { UserManager } from '@/lib/user/UserManager'
import { useSounds } from '@/lib/sounds/SoundManager'
import { ConversationContextManager, type ConversationContextEntry } from '@/lib/conversation/ConversationContext'

export function SingleDeviceTranslator() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { playRecordingStart, playRecordingStop, playTranslationComplete, playError, playMessageSent } = useSounds()
  
  // State
  const [messages, setMessages] = useState<QueuedMessage[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentActivity, setCurrentActivity] = useState<'idle' | 'recording' | 'processing' | 'typing'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [targetLanguage, setTargetLanguage] = useState<'es' | 'pt'>(() => {
    const saved = UserManager.getPreference('targetLanguage', 'es')
    console.log('🎯 Initial target language:', saved)
    return saved as 'es' | 'pt'
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
  
  const audioRecorderRef = useRef<ReturnType<typeof createOptimizedAudioRecorder> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [streamReady, setStreamReady] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)

  // Debug logging for conversation context system
  useEffect(() => {
    console.log('🔧 [ConversationContext] SingleDeviceTranslator initialized with conversation context system')
    console.log('📊 [ConversationContext] Initial context state:', conversationContext.length, 'messages')
  }, [])

  // Request microphone permission immediately on app load
  useEffect(() => {
    const initializeMicrophoneAccess = async () => {
      try {
        // Check if mediaDevices is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError('Your browser does not support audio recording. Please use Chrome or Safari.')
          return
        }

        // Request microphone permission immediately
        console.log('🎤 Requesting microphone permission on app load...')
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        })

        // Keep the stream ready for instant recording
        streamRef.current = stream
        setStreamReady(true)
        setPermissionDenied(false)
        console.log('✅ Microphone permission granted and stream ready')

      } catch (err: any) {
        console.error('❌ Microphone permission error:', err)
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setPermissionDenied(true)
          setError('Microphone access denied. Please allow microphone permissions to use the translator.')
        } else if (err.name === 'NotFoundError') {
          setError('No microphone found on your device.')
        } else {
          setError(`Microphone error: ${err.name} - ${err.message}`)
        }
      }
    }

    initializeMicrophoneAccess()

    // Cleanup stream on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
    }
  }, [])

  // Initialize audio recorder
  useEffect(() => {
    const initializeRecorder = async () => {
      try {
        audioRecorderRef.current = createOptimizedAudioRecorder({
          maxDuration: 60, // 1 minute max
          enableIOSOptimizations: true,
          autoResumeAudioContext: true
        })
        
        // Set up real-time audio visualization callback
        audioRecorderRef.current.onAudioData = (level: number) => {
          setAudioLevel(level)
        }
        
        console.log('🎙️ Audio recorder initialized for Single Device Mode with real-time visualization')
      } catch (err) {
        setError('Failed to initialize audio recorder. Please check microphone permissions.')
        console.error('❌ Audio recorder initialization failed:', err)
      }
    }
    
    initializeRecorder()
    
    return () => {
      // Cleanup recorder if needed
      if (audioRecorderRef.current) {
        audioRecorderRef.current.onAudioData = undefined
      }
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
    console.log(`🎯 Mode switched to: ${newMode}`)
  }

  const retryMicrophonePermission = async () => {
    try {
      setError(null)
      console.log('🎤 Retrying microphone permission...')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      streamRef.current = stream
      setStreamReady(true)
      setPermissionDenied(false)
      console.log('✅ Microphone permission granted on retry')
    } catch (err: any) {
      console.error('❌ Microphone permission retry failed:', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone access still denied. Please check your browser settings.')
      }
    }
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
    if (!audioRecorderRef.current) {
      setError('Audio recorder not initialized')
      return
    }

    // Check if we have permission already
    if (!streamReady) {
      setError('Microphone permission not granted. Please allow microphone access.')
      return
    }
    
    try {
      setError(null)
      
      // Play recording start sound
      playRecordingStart()
      
      performanceLogger.start('single-device-recording')
      await audioRecorderRef.current.startRecording()
      
      // Only set recording state AFTER successful start
      setIsRecording(true)
      setCurrentActivity('recording')
      
      // Audio level monitoring is now handled by the AudioRecorderService
      console.log('🎤 Recording started with real-time audio visualization')
      
    } catch (err) {
      const errorMsg = (err as Error).message
      setError(errorMsg)
      setIsRecording(false)
      setCurrentActivity('idle')
      playError()
    }
  }

  const handleStopRecording = async () => {
    if (!audioRecorderRef.current || !isRecording) return
    
    // Check if recorder is actually recording before trying to stop
    if (audioRecorderRef.current.getState() !== 'recording') {
      // Reset UI state and return
      setIsRecording(false)
      setCurrentActivity('idle')
      return
    }

    try {
      setIsRecording(false)
      setCurrentActivity('idle') // Set to idle to allow new recordings
      // Don't set global isProcessing - each message processes independently
      
      // Play recording stop sound
      playRecordingStop()
      
      // Reset audio level to 0
      resetAudioLevel()

      // Set up completion handler before stopping
      audioRecorderRef.current.onComplete = async (result: AudioRecordingResult) => {
        performanceLogger.end('single-device-recording')
        
        // Convert File to Blob for compatibility
        const audioBlob = new Blob([await result.audioFile.arrayBuffer()], { 
          type: result.audioFile.type 
        })
        
        // Process with real OpenAI APIs
        await processAudioMessage(audioBlob)
      }

      audioRecorderRef.current.onError = (error: Error) => {
        setError('Recording failed: ' + error.message)
        setCurrentActivity('idle')
        // Don't need to set isProcessing false anymore
        playError()
      }

      // Stop recording - this will trigger onComplete
      await audioRecorderRef.current.stopRecording()

    } catch (err) {
      setError('Failed to process recording: ' + (err as Error).message)
      setCurrentActivity('idle')
      // Don't need to set isProcessing false anymore
      playError()
    }
  }

  const processTextMessage = async (messageText: string) => {
    if (!messageText.trim()) return

    const messageId = `single-text-${Date.now()}`
    let translationTime = 0
    let totalStartTime = Date.now()
    
    console.log('🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀')
    console.log('💬 [SINGLE DEVICE] STARTING TEXT MESSAGE PROCESSING')
    console.log('🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀')
    console.log('📊 Session Info:')
    console.log('   • Message ID:', messageId)
    console.log('   • Text Message:', `"${messageText}"`)
    console.log('   • Timestamp:', new Date().toISOString())
    console.log('   • Translation Mode:', translationMode)
    console.log('   • Target Language:', targetLanguage)
    console.log('   • Current Context Size:', conversationContext.length, 'messages')

    // Don't set global processing state - allow concurrent messages

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

      await messageQueue.add(initialMessage)
      setMessages(prev => [...prev, initialMessage])

      // Detect language and determine translation direction
      const translationStart = Date.now()
      
      console.log('╔══════════════════════════════════════════════════════════╗')
      console.log('║              🌐 TEXT TRANSLATION PROCESSING              ║')
      console.log('╚══════════════════════════════════════════════════════════╝')
      
      // Enhanced language detection for text with more patterns
      const hasSpanishWords = /\b(hola|cómo|qué|por|para|con|una|uno|este|esta|está|estás|buenos|días|gracias|adiós|señor|señora)\b/i.test(messageText)
      const hasPortugueseWords = /\b(olá|como|que|por|para|com|uma|um|este|esta|está|você|obrigado|obrigada|tchau|bom|dia)\b/i.test(messageText)
      const hasSpanishChars = /[ñáéíóúü¿¡]/i.test(messageText)
      const hasPortugueseChars = /[çãõâêôà]/i.test(messageText)
      
      let detectedLangCode = 'en' // Default to English
      if ((hasSpanishWords || hasSpanishChars) && !hasPortugueseWords && !hasPortugueseChars) {
        detectedLangCode = 'es'
      } else if ((hasPortugueseWords || hasPortugueseChars) && !hasSpanishWords && !hasSpanishChars) {
        detectedLangCode = 'pt'
      }
      
      console.log('🔍 LANGUAGE DETECTION & MAPPING:')
      console.log('   • Input text:', `"${messageText}"`)
      console.log('   • Detected language code:', detectedLangCode)
      
      const langMap: Record<string, 'English' | 'Spanish' | 'Portuguese'> = {
        'en': 'English',
        'es': 'Spanish', 
        'pt': 'Portuguese'
      }
      
      const detectedLang = langMap[detectedLangCode] || 'English'
      
      // Translation logic: Respect user's target language selection
      let actualTargetLanguage: 'es' | 'en' | 'pt' = targetLanguage
      
      console.log('🤖 APPLYING TRANSLATION RULES:')
      console.log('   👤 User selected target language:', targetLanguage, `(${langMap[targetLanguage]})`)
      console.log('   🔍 Detected input language:', detectedLangCode, `(${detectedLang})`)
      
      // Don't translate if input is already in target language
      if (detectedLangCode === targetLanguage) {
        console.log('   📝 RULE: Input already in target language - translating to English instead')
        actualTargetLanguage = 'en'
        console.log('   🎯 RESULT: Translating', detectedLang, '→ English')
      } else {
        actualTargetLanguage = targetLanguage
        console.log('   📝 RULE: Translating to user selected target language')
        console.log('   🎯 RESULT: Translating', detectedLang, '→', langMap[targetLanguage], `(${targetLanguage})`)
      }
      
      const targetLangFull = langMap[actualTargetLanguage] || 'English'
      
      // Build context
      const recentMessages = messages.slice(-3).map(msg => msg.original).filter(Boolean)
      const isRomanticContext = UserManager.detectRomanticContext(recentMessages)
      
      console.log('⏳ CALLING GPT TRANSLATION API...')
      console.log('   📝 Input text:', `"${messageText}"`)
      console.log('   🔄 FROM:', detectedLang)
      console.log('   🎯 TO:', targetLangFull)
      console.log('   🎭 Mode:', translationMode)
      
      const translationResult = await TranslationService.translate(
        messageText,
        detectedLang,
        targetLangFull,
        translationMode,
        {
          recentMessages,
          isRomanticContext,
          conversationContext
        }
      )
      
      console.log('🎉 GPT TRANSLATION COMPLETED!')
      console.log('   📝 Original text:', `"${translationResult.originalText}"`)
      console.log('   🌐 Translated text:', `"${translationResult.translatedText}"`)
      
      translationTime = Date.now() - translationStart
      
      // Update conversation context
      const updatedContext = ConversationContextManager.addToContext(
        conversationContext,
        messageText,
        detectedLangCode,
        Date.now()
      )
      setConversationContext(updatedContext)
      
      // Update message
      const totalTime = Date.now() - totalStartTime
      const finalMessage: QueuedMessage = {
        ...initialMessage,
        original: messageText,
        translation: translationResult.translatedText,
        original_lang: detectedLangCode,
        target_lang: actualTargetLanguage,
        status: 'displayed',
        processed_at: new Date().toISOString(),
        displayed_at: new Date().toISOString(),
        performance_metrics: {
          whisperTime: 0, // No whisper for text
          translationTime,
          totalTime
        }
      }

      await messageQueue.add(finalMessage)
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? finalMessage : msg
      ))

      // Play message sent sound
      playMessageSent()
      
      // Clear text input
      setTextMessage('')

      console.log('🎉 TEXT MESSAGE PROCESSING COMPLETE!')

    } catch (err) {
      console.error('❌ Text message processing failed:', err)
      setError(`Processing failed: ${(err as Error).message}`)
      playError()
      
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, status: 'failed' as const } : msg
      ))
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
    const messageId = `single-msg-${Date.now()}`
    let whisperTime = 0
    let translationTime = 0
    let totalStartTime = Date.now()
    
    console.log('🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀')
    console.log('🎤 [SINGLE DEVICE] STARTING AUDIO MESSAGE PROCESSING')
    console.log('🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀')
    console.log('📊 Session Info:')
    console.log('   • Message ID:', messageId)
    console.log('   • Audio Size:', audioBlob.size, 'bytes')
    console.log('   • Audio Type:', audioBlob.type)
    console.log('   • Timestamp:', new Date().toISOString())
    console.log('   • Translation Mode:', translationMode)
    console.log('   • Target Language:', targetLanguage)
    console.log('   • Current Context Size:', conversationContext.length, 'messages')
    console.log('🔧 Current conversation context state:')
    if (conversationContext.length === 0) {
      console.log('   ⚠️  NO CONTEXT AVAILABLE - This is a fresh conversation')
    } else {
      conversationContext.forEach((entry, index) => {
        console.log(`   ${index + 1}. [${entry.language}] "${entry.text.substring(0, 60)}${entry.text.length > 60 ? '...' : ''}"`)
      })
    }
    console.log('═══════════════════════════════════════════════════════')

    try {
      // Create initial message in queue
      const initialMessage: QueuedMessage = {
        id: messageId,
        session_id: 'single-device-session',
        user_id: 'single-user',
        original: '...',
        translation: null,
        original_lang: 'en',
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

      await messageQueue.add(initialMessage)
      setMessages(prev => [...prev, initialMessage])

      // Step 1: Whisper transcription with conversation context
      performanceLogger.start('whisper-transcription')
      const whisperStart = Date.now()
      
      console.log('╔══════════════════════════════════════════════════════════╗')
      console.log('║                🎧 WHISPER STT PROCESSING                 ║')
      console.log('╚══════════════════════════════════════════════════════════╝')
      
      // Build Whisper context from conversation history
      console.log('🔧 Building Whisper context from conversation history...')
      const whisperContext = ConversationContextManager.buildWhisperContext(conversationContext)
      
      // Convert Blob to File for WhisperService
      const audioFile = new File([audioBlob], 'recording.webm', { type: audioBlob.type })
      
      console.log('🎧 Calling Whisper API with:')
      console.log('   • Audio file size:', audioFile.size, 'bytes')
      console.log('   • Audio file type:', audioFile.type)
      console.log('   • Context prompt length:', whisperContext.length, 'characters')
      console.log('   • Context prompt:', whisperContext ? `"${whisperContext.substring(0, 100)}..."` : 'NONE')
      console.log('⏳ Sending to Whisper API...')
      
      const transcriptionResult = await WhisperService.transcribeAudio(
        audioFile,
        whisperContext || 'This is a casual conversation.'
      )
      
      console.log('🎉 Whisper API Response Received!')
      console.log('   • Transcribed text:', `"${transcriptionResult.text}"`)
      console.log('   • Detected language:', transcriptionResult.language)
      console.log('   • Audio duration:', transcriptionResult.duration, 'seconds')
      
      whisperTime = Date.now() - whisperStart
      performanceLogger.end('whisper-transcription')

      if (!transcriptionResult.text) {
        throw new Error('No transcription received from Whisper')
      }

      // Step 2: Translation
      performanceLogger.start('translation')
      const translationStart = Date.now()
      
      console.log('╔══════════════════════════════════════════════════════════╗')
      console.log('║              🌐 TRANSLATION LOGIC PROCESSING             ║')
      console.log('╚══════════════════════════════════════════════════════════╝')
      
      // Map language codes to full names for TranslationService
      const langMap: Record<string, 'English' | 'Spanish' | 'Portuguese'> = {
        'en': 'English',
        'es': 'Spanish', 
        'pt': 'Portuguese'
      }
      
      console.log('🔍 LANGUAGE DETECTION & MAPPING:')
      console.log('   • Raw Whisper language:', transcriptionResult.language)
      
      const detectedLangCode = WhisperService.detectLanguage(transcriptionResult.language)
      console.log('   • Mapped language code:', detectedLangCode)
      
      const detectedLang = langMap[detectedLangCode] || 'English'
      console.log('   • Full language name:', detectedLang)
      
      // Language detected successfully
      
      console.log('')
      console.log('🎯 TRANSLATION DIRECTION LOGIC:')
      console.log('   • User selected target in UI:', targetLanguage)
      console.log('   • User selected target name:', langMap[targetLanguage])
      console.log('   • Detected input language:', detectedLangCode, `(${detectedLang})`)
      
      // Translation logic: Respect user's target language selection
      let actualTargetLanguage: 'es' | 'en' | 'pt' = targetLanguage
      
      console.log('🤖 APPLYING TRANSLATION RULES:')
      console.log('   👤 User selected target language:', targetLanguage, `(${langMap[targetLanguage]})`)
      console.log('   🔍 Detected input language:', detectedLangCode, `(${detectedLang})`)
      
      // Don't translate if input is already in target language
      if (detectedLangCode === targetLanguage) {
        console.log('   📝 RULE: Input already in target language - translating to English instead')
        actualTargetLanguage = 'en'
        console.log('   🎯 RESULT: Translating', detectedLang, '→ English')
      } else {
        actualTargetLanguage = targetLanguage
        console.log('   📝 RULE: Translating to user selected target language')
        console.log('   🎯 RESULT: Translating', detectedLang, '→', langMap[targetLanguage], `(${targetLanguage})`)
      }
      
      const targetLangFull = langMap[actualTargetLanguage] || 'English'
      
      console.log('')
      console.log('📊 FINAL TRANSLATION PARAMETERS:')
      console.log('   • FROM Language Code:', detectedLangCode)
      console.log('   • FROM Language Full:', detectedLang)
      console.log('   • TO Language Code:', actualTargetLanguage)
      console.log('   • TO Language Full:', targetLangFull)
      console.log('   • Translation Text:', `"${transcriptionResult.text}"`)
      console.log('   • Translation Mode:', translationMode)
      
      console.log('')
      console.log('🔧 BUILDING CONTEXT FOR GPT TRANSLATION:')
      
      // Build context from conversation context (new enhanced system)
      const recentMessages = messages.slice(-3).map(msg => msg.original).filter(Boolean)
      console.log('   • Recent messages (legacy):', recentMessages.length, 'messages')
      recentMessages.forEach((msg, i) => {
        console.log(`     ${i + 1}. "${msg.substring(0, 50)}${msg.length > 50 ? '...' : ''}"`)
      })
      
      const isRomanticContext = UserManager.detectRomanticContext(recentMessages)
      console.log('   • Romantic context detected:', isRomanticContext)
      console.log('   • Conversation context entries:', conversationContext.length)
      
      console.log('')
      console.log('⏳ CALLING GPT TRANSLATION API...')
      console.log('   📝 Input text:', `"${transcriptionResult.text}"`)
      console.log('   🔄 FROM:', detectedLang)
      console.log('   🎯 TO:', targetLangFull)
      console.log('   🎭 Mode:', translationMode)
      console.log('   💕 Romantic context:', isRomanticContext)
      
      const translationResult = await TranslationService.translate(
        transcriptionResult.text,
        detectedLang,
        targetLangFull,
        translationMode, // Use user's preferred mode
        {
          recentMessages,
          isRomanticContext,
          conversationContext // NEW: Enhanced conversation context
        }
      )
      
      console.log('')
      console.log('🎉 GPT TRANSLATION COMPLETED!')
      console.log('   📝 Original text:', `"${translationResult.originalText}"`)
      console.log('   🌐 Translated text:', `"${translationResult.translatedText}"`)
      console.log('   🔤 Original language:', translationResult.originalLanguage)
      console.log('   🎯 Target language:', translationResult.targetLanguage)
      console.log('   🔧 Input tokens:', translationResult.inputTokens || 'unknown')
      console.log('   🔧 Output tokens:', translationResult.outputTokens || 'unknown')

      translationTime = Date.now() - translationStart
      performanceLogger.end('translation')

      // Play translation complete sound
      playTranslationComplete()

      console.log('')
      console.log('╔══════════════════════════════════════════════════════════╗')
      console.log('║           📝 UPDATING CONVERSATION CONTEXT               ║')
      console.log('╚══════════════════════════════════════════════════════════╝')
      
      // Add to conversation context for future translations
      console.log('🔧 Adding new message to conversation context...')
      console.log('   • Message text:', `"${transcriptionResult.text}"`)
      console.log('   • Detected language:', detectedLangCode)
      console.log('   • Current context size:', conversationContext.length)
      
      const updatedContext = ConversationContextManager.addToContext(
        conversationContext,
        transcriptionResult.text,
        detectedLangCode,
        Date.now()
      )
      setConversationContext(updatedContext)
      
      console.log('✅ Context successfully updated!')
      console.log('   • New context size:', updatedContext.length)
      console.log('   • Ready for next translation request')

      // Final message update
      const totalTime = Date.now() - totalStartTime
      const finalMessage: QueuedMessage = {
        ...initialMessage,
        original: transcriptionResult.text,
        translation: translationResult.translatedText,
        original_lang: detectedLangCode,
        target_lang: actualTargetLanguage,
        status: 'displayed',
        processed_at: new Date().toISOString(),
        displayed_at: new Date().toISOString(),
        performance_metrics: {
          whisperTime,
          translationTime,
          totalTime
        }
      }

      await messageQueue.add(finalMessage)
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? finalMessage : msg
      ))

      // Play message sent sound
      playMessageSent()

      console.log('')
      console.log('🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉')
      console.log('🎉 [SINGLE DEVICE] MESSAGE PROCESSING COMPLETE SUCCESS!')
      console.log('🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉')
      console.log('📊 FINAL SUMMARY:')
      console.log('   • Original Text:', `"${transcriptionResult.text}"`)
      console.log('   • Translated Text:', `"${translationResult.translatedText}"`)
      console.log('   • Detected Language:', detectedLangCode, `(${detectedLang})`)
      console.log('   • Target Language:', actualTargetLanguage, `(${targetLangFull})`)
      console.log('   • Translation Mode:', translationMode)
      console.log('   • Context Window Size:', updatedContext.length, 'messages')
      console.log('   • Romantic Context:', isRomanticContext)
      console.log('')
      console.log('⏱️  PERFORMANCE METRICS:')
      console.log('   • Whisper Time:', whisperTime, 'ms')
      console.log('   • Translation Time:', translationTime, 'ms')
      console.log('   • Total Processing Time:', totalTime, 'ms')
      console.log('')
      console.log('🎯 NEXT MESSAGE WILL HAVE ENHANCED CONTEXT!')
      console.log('═══════════════════════════════════════════════════════')

    } catch (err) {
      console.error('❌ Single device audio processing failed:', err)
      setError(`Processing failed: ${(err as Error).message}`)
      
      // Play error sound
      playError()
      
      // Update message to failed state
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, status: 'failed' as const } : msg
      ))
    } finally {
      // Don't change global states - let each message process independently
      
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000)
    }
  }

  return (
      <div className="min-h-screen bg-app flex flex-col relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-72 h-72 bg-blue-200 dark:bg-blue-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-20 animate-pulse-soft" />
          <div className="absolute bottom-0 right-0 w-72 h-72 bg-indigo-200 dark:bg-indigo-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-20 animate-pulse-soft" style={{ animationDelay: '1s' }} />
        </div>

        {/* Header */}
        <header className="glass-effect sticky top-0 z-50 border-b border-white/20 backdrop-blur-md">
          <div className="container mx-auto px-4 py-2">
            <div className="flex items-center justify-between">
              {/* Left side - Back button and Settings */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/')}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('common.back', 'Back')}</span>
                </Button>
                
                {/* Settings Button */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                    className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                    data-settings-button
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  
                  {/* Settings Dropdown Menu */}
                  {showSettingsMenu && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 z-50" data-settings-menu>
                      {/* Font Size Setting */}
                      <div className="mb-3">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                          {t('settings.fontSize', 'Font Size')}
                        </label>
                        <div className="grid grid-cols-3 gap-1">
                          {(['small', 'medium', 'large'] as const).map((size) => (
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
                            {isDarkMode ? t('settings.lightMode', 'Light Mode') : t('settings.darkMode', 'Dark Mode')}
                          </span>
                          {isDarkMode ? <Sun className="h-4 w-4 text-yellow-500" /> : <Moon className="h-4 w-4 text-gray-600" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right side - Mode Toggle & Target Language */}
              <div className="flex items-center gap-4">
                {/* Mode Toggle */}
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
                
                {/* Target Language */}
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
              </div>
            </div>
          </div>
        </header>

        {/* Message Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                {messages.map((message) => (
                  <MessageBubble 
                    key={message.id} 
                    message={message} 
                    theme="blue"
                  />
                ))}
              </>
            )}

            {/* Activity Indicator - Only show when NOT processing a message */}
            {currentActivity !== 'idle' && !isProcessing && (
              <ActivityIndicator 
                activity={currentActivity} 
                userName={t('translator.you', 'You')}
                isOwnMessage={true}
              />
            )}
          </div>

          {/* Recording Controls - Compact */}
          <div className="p-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-700/50">
            {/* Error Display */}
            {error && (
              <div className="mb-2 p-2 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Text Message Input */}
            {showTextInput && (
              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={textMessage}
                    onChange={(e) => setTextMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && textMessage.trim()) {
                        handleSendTextMessage()
                      }
                    }}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                    disabled={false}
                  />
                  <Button
                    onClick={handleSendTextMessage}
                    disabled={!textMessage.trim()}
                    size="sm"
                    className="px-4"
                  >
                    Send
                  </Button>
                </div>
              </div>
            )}

            {/* Input Mode Toggle - Compact */}
            <div className="mb-2 flex justify-center">
              <div className="relative bg-white dark:bg-gray-800 rounded-full p-0.5 shadow border border-gray-200 dark:border-gray-700">
                {/* Background indicator */}
                <div 
                  className={`absolute top-0.5 bottom-0.5 w-1/2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-transform duration-200 ${
                    showTextInput ? 'translate-x-full' : 'translate-x-0'
                  }`}
                />
                <div className="relative flex">
                  <button
                    onClick={() => setShowTextInput(false)}
                    className={`relative z-10 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                      !showTextInput 
                        ? 'text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                  >
                    <Mic className="h-3 w-3" />
                    Voice
                  </button>
                  <button
                    onClick={() => setShowTextInput(true)}
                    className={`relative z-10 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                      showTextInput 
                        ? 'text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Type
                  </button>
                </div>
              </div>
            </div>

            {/* Permission Denied UI */}
            {permissionDenied && !showTextInput && (
              <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg text-center">
                <p className="text-yellow-800 dark:text-yellow-200 text-sm mb-3">
                  🎤 Microphone access is required to use voice translation
                </p>
                <Button
                  onClick={retryMicrophonePermission}
                  size="sm"
                  variant="primary"
                  className="mx-auto"
                >
                  Enable Microphone
                </Button>
              </div>
            )}

            {/* Recording Button with Audio Visualization */}
            {!showTextInput && (
              <div className="flex flex-col items-center">
                <button
                  data-testid="recording-button"
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  disabled={permissionDenied || !streamReady}
                  className={`
                    w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 transform-gpu
                    ${isRecording 
                      ? 'bg-red-500 hover:bg-red-600 scale-110 shadow-lg shadow-red-500/50' 
                      : permissionDenied || !streamReady
                        ? 'bg-gray-400 cursor-not-allowed opacity-50'
                        : 'bg-blue-500 hover:bg-blue-600 hover:scale-105 shadow-lg shadow-blue-500/30'
                    }
                    ${!permissionDenied && streamReady ? 'active:scale-95' : ''}
                    text-white
                  `}
                >
                  {isRecording ? (
                    <div className="animate-pulse">
                      <Mic className="h-6 w-6" />
                    </div>
                  ) : (
                    <Mic className="h-6 w-6" />
                  )}
                </button>
                
                {/* 5-bar audio visualization */}
                <div className="mt-2">
                  <AudioVisualization
                    audioLevel={audioLevel}
                    isRecording={isRecording}
                    size="md"
                    colors={{
                      active: isRecording ? '#EF4444' : '#3B82F6',
                      inactive: '#E5E7EB'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Status Text */}
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {showTextInput
                  ? 'Type your message and press Enter or click Send'
                  : isRecording 
                    ? t('translator.recording', 'Recording... Release to translate')
                    : t('translator.instructions', 'Hold to record and translate, or press spacebar on desktop')
                }
              </p>
            </div>
          </div>
        </div>
      </div>
  )
}

export default SingleDeviceTranslator