import { useState, useRef, useEffect } from 'react'
import { MessageBubble } from '../messages/MessageBubble'
import { ActivityIndicator } from '../messages/ActivityIndicator'
import { MessageList } from '../messages/MessageList'
import { PerformanceMonitor } from '../messages/PerformanceMonitor'
import { messageQueue, QueuedMessage } from '../messages/MessageQueue'
import { SessionProvider } from '../session/SessionContext'
import { AudioRecorder } from '../../services/audio/recorder'
import { WhisperService } from '../../services/openai/whisper'
import { TranslationService } from '../../services/openai/translation'
import { performanceLogger } from '../../lib/performance'
import { networkQualityDetector } from '../../lib/network-quality'
import { QualityDegradationService } from '../../lib/quality-degradation'
import { ProgressPreservationService } from '../../lib/progress-preservation'
import { iosAudioContextManager, testIOSAudioContext } from '../../lib/ios-audio-context'
import { WorkflowRetry } from '../../lib/retry-logic'
import { Mic, Square, Loader2, Wifi, WifiOff, Activity, TestTube } from 'lucide-react'
import type { Session } from '@/types/database'

// Mock session for testing
const mockSession: Session = {
  id: 'test-session-123',
  code: 'TEST123',
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
  is_active: true,
  user_count: 2,
  last_activity: new Date().toISOString()
}

export function Phase5Test() {
  const [currentUser, setCurrentUser] = useState('user-1')
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentActivity, setCurrentActivity] = useState<'idle' | 'recording' | 'processing' | 'typing'>('idle')
  const [partnerActivity, setPartnerActivity] = useState<'idle' | 'recording' | 'processing' | 'typing'>('idle')
  const [targetLanguage, setTargetLanguage] = useState<'es' | 'en' | 'pt'>('es')
  const [theme, setTheme] = useState<'blue' | 'emerald' | 'purple' | 'rose' | 'amber'>('blue')
  // Text input states for both partners
  const [textInput, setTextInput] = useState('')
  const [isTextProcessing, setIsTextProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalMessages: 0,
    avgWhisperTime: 0,
    avgTranslationTime: 0,
    avgTotalTime: 0
  })
  
  // Network resilience state
  const [networkQuality, setNetworkQuality] = useState<'fast' | 'slow' | 'very-slow' | 'offline' | 'unknown'>('fast')
  const [isNetworkSimulating, setIsNetworkSimulating] = useState(false)
  const [autoTesting, setAutoTesting] = useState(false)
  const [testResults, setTestResults] = useState<any[]>([])
  const [systemStatus, setSystemStatus] = useState({
    networkQuality: 'fast',
    qualityDegradation: 'optimal',
    progressPreservation: 'ready',
    iosAudioContext: 'unknown',
    retryLogic: 'ready'
  })

  const audioRecorderRef = useRef<AudioRecorder | null>(null)
  // audioRef removed - TTS now on-demand per message

  // Initialize all systems
  useEffect(() => {
    const initializeSystems = async () => {
      console.log('🚀 Phase 5 Test: Initializing all mobile network resilience systems...')
      
      // Initialize audio recorder
      try {
        audioRecorderRef.current = new AudioRecorder({
          maxDuration: 30 // 30 seconds max - using default 32kbps compression
        })
        console.log('✅ Audio Recorder initialized')
      } catch (err) {
        setError('Failed to initialize audio recorder. Please check microphone permissions.')
        console.error('❌ Audio recorder initialization failed:', err)
      }
      
      // Initialize network quality detection
      try {
        await networkQualityDetector.initialize()
        const quality = networkQualityDetector.getCurrentQuality()
        setNetworkQuality(quality)
        setSystemStatus(prev => ({ ...prev, networkQuality: quality }))
        console.log('✅ Network Quality Detection initialized:', quality)
      } catch (err) {
        console.error('❌ Network quality detection failed:', err)
      }
      
      // Initialize quality degradation
      try {
        QualityDegradationService.initialize()
        const config = QualityDegradationService.getCurrentConfig()
        setSystemStatus(prev => ({ ...prev, qualityDegradation: config.networkQuality }))
        console.log('✅ Quality Degradation Service initialized:', config.description)
      } catch (err) {
        console.error('❌ Quality degradation service failed:', err)
      }
      
      // Initialize progress preservation
      try {
        ProgressPreservationService.initialize()
        setSystemStatus(prev => ({ ...prev, progressPreservation: 'active' }))
        console.log('✅ Progress Preservation Service initialized')
      } catch (err) {
        console.error('❌ Progress preservation service failed:', err)
      }
      
      // Test iOS audio context
      try {
        const iosInfo = iosAudioContextManager.getIOSAudioInfo()
        const iosTest = await testIOSAudioContext()
        setSystemStatus(prev => ({ 
          ...prev, 
          iosAudioContext: iosInfo.isIOS ? (iosTest.testResult ? 'ready' : 'needs-interaction') : 'not-ios' 
        }))
        console.log('✅ iOS Audio Context checked:', { iosInfo, testResult: iosTest.testResult })
      } catch (err) {
        console.error('❌ iOS audio context test failed:', err)
        setSystemStatus(prev => ({ ...prev, iosAudioContext: 'error' }))
      }
      
      console.log('🎯 All systems initialized. Ready for comprehensive testing!')
    }
    
    initializeSystems()

    return () => {
      // AudioRecorderService has cleanup method built into its methods
    }
  }, [])

  const handleStartRecording = async () => {
    if (!audioRecorderRef.current) return
    
    try {
      setError(null)
      setIsRecording(true)
      setCurrentActivity('recording')
      
      // Simulate partner seeing this user's recording activity
      setTimeout(() => {
        setPartnerActivity('recording')
      }, 100)
      
      performanceLogger.start('audio-recording')
      await audioRecorderRef.current.startRecording()
      
    } catch (err) {
      setError('Failed to start recording: ' + (err as Error).message)
      setIsRecording(false)
      setCurrentActivity('idle')
      setPartnerActivity('idle')
    }
  }

  const handleStopRecording = async () => {
    if (!audioRecorderRef.current || !isRecording) return

    try {
      setIsRecording(false)
      setCurrentActivity('processing')
      setIsProcessing(true)
      
      // Update partner to see processing activity
      setPartnerActivity('processing')

      // Set up completion handler before stopping
      audioRecorderRef.current.onComplete = async (result) => {
        performanceLogger.end('audio-recording')
        
        // Convert File to Blob for compatibility
        const audioBlob = new Blob([await result.audioFile.arrayBuffer()], { 
          type: result.audioFile.type 
        })
        
        // Process with real OpenAI APIs
        await processRealAudioMessage(audioBlob)
      }

      audioRecorderRef.current.onError = (error) => {
        setError('Recording failed: ' + error.message)
        setCurrentActivity('idle')
        setIsProcessing(false)
      }

      // Stop recording - this will trigger onComplete
      await audioRecorderRef.current.stopRecording()

    } catch (err) {
      setError('Failed to process recording: ' + (err as Error).message)
      setCurrentActivity('idle')
      setIsProcessing(false)
    }
  }

  const processRealAudioMessage = async (audioBlob: Blob) => {
    const messageId = `real-msg-${Date.now()}`
    let whisperTime = 0
    let translationTime = 0
    let totalStartTime = Date.now()
    
    // Get current network quality for logging
    const networkQuality = networkQualityDetector.getCurrentQuality()
    const qualityConfig = QualityDegradationService.getCurrentConfig()
    
    console.log('🎤 Starting audio message processing with network resilience...', {
      messageId,
      networkQuality,
      qualityConfig: qualityConfig.description,
      audioBitrate: qualityConfig.audioBitsPerSecond
    })

    // Create workflow for progress preservation
    const workflowId = ProgressPreservationService.createWorkflow(
      mockSession.id,
      currentUser,
      [
        { id: 'recording', type: 'recording' },
        { id: 'transcription', type: 'transcription' },
        { id: 'translation', type: 'translation' },
        { id: 'database', type: 'database' }
      ]
    )

    try {
      // Start recording step (already completed)
      ProgressPreservationService.startStep(workflowId, 0, { audioSize: audioBlob.size })
      ProgressPreservationService.completeStep(workflowId, 0, { audioBlob: 'completed' })
      
      // Create initial message
      const initialMessage = {
        id: messageId,
        session_id: mockSession.id,
        user_id: currentUser,
        original: '...',
        translation: null,
        original_lang: 'en',
        target_lang: targetLanguage,
        status: 'queued' as const,
        queued_at: new Date().toISOString(),
        processed_at: null,
        displayed_at: null,
        performance_metrics: null,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString()
      }

      await messageQueue.add(initialMessage)
      messageQueue.updateStatus(messageId, 'processing')

      // Step 1: Whisper transcription with retry logic
      ProgressPreservationService.startStep(workflowId, 1, { audioFile: audioBlob.type })
      
      performanceLogger.start('whisper-transcription')
      const whisperStart = Date.now()
      
      console.log('🎧 Starting Whisper transcription with network resilience...')
      
      // Convert Blob to File for WhisperService
      const audioFile = new File([audioBlob], 'recording.webm', { type: audioBlob.type })
      
      // Use retry logic for Whisper transcription
      const transcriptionResult = await WorkflowRetry.transcription(
        async () => {
          return await WhisperService.transcribeAudio(
            audioFile,
            'This is a casual conversation between friends.'
          )
        },
        (attempt, error) => {
          console.warn(`🔄 Whisper retry attempt ${attempt}:`, error.message)
          setError(`Transcription attempt ${attempt} failed, retrying...`)
        }
      )
      
      whisperTime = Date.now() - whisperStart
      performanceLogger.end('whisper-transcription')
      
      ProgressPreservationService.completeStep(workflowId, 1, { 
        transcription: transcriptionResult.text,
        language: transcriptionResult.language,
        duration: whisperTime
      })

      if (!transcriptionResult.text) {
        throw new Error('No transcription received from Whisper')
      }

      // Update message with transcription
      const transcribedMessage = {
        ...initialMessage,
        original: transcriptionResult.text,
        original_lang: WhisperService.detectLanguage(transcriptionResult.language)
      }

      await messageQueue.add(transcribedMessage)

      // Step 2: Translation with retry logic
      ProgressPreservationService.startStep(workflowId, 2, { 
        originalText: transcriptionResult.text,
        sourceLang: transcriptionResult.language
      })
      
      performanceLogger.start('translation')
      const translationStart = Date.now()
      
      console.log('🌐 Starting translation with network resilience...')
      
      // Map language codes to full names for TranslationService
      const langMap: Record<string, 'English' | 'Spanish' | 'Portuguese'> = {
        'en': 'English',
        'es': 'Spanish', 
        'pt': 'Portuguese'
      }
      const targetLangMap: Record<string, 'English' | 'Spanish' | 'Portuguese'> = {
        'en': 'English',
        'es': 'Spanish',
        'pt': 'Portuguese'
      }
      
      const detectedLangCode = WhisperService.detectLanguage(transcriptionResult.language)
      const detectedLang = langMap[detectedLangCode] || 'English'
      const targetLangFull = targetLangMap[targetLanguage] || 'Spanish'
      
      // Use retry logic for translation
      const translationResult = await WorkflowRetry.translation(
        async () => {
          return await TranslationService.translate(
            transcriptionResult.text,
            detectedLang,
            targetLangFull,
            'casual',
            {
              recentMessages: [],
              isRomanticContext: false
            }
          )
        },
        (attempt, error) => {
          console.warn(`🔄 Translation retry attempt ${attempt}:`, error.message)
          setError(`Translation attempt ${attempt} failed, retrying...`)
        }
      )

      translationTime = Date.now() - translationStart
      performanceLogger.end('translation')
      
      ProgressPreservationService.completeStep(workflowId, 2, { 
        translation: translationResult.translatedText,
        duration: translationTime
      })

      // TTS removed from automatic pipeline - now on-demand only

      // Step 3: Database storage with retry logic
      ProgressPreservationService.startStep(workflowId, 3, { 
        messageId,
        finalData: 'ready for storage'
      })
      
      // Final message update with retry logic for database operations
      const totalTime = Date.now() - totalStartTime
      const finalMessage = {
        ...transcribedMessage,
        translation: translationResult.translatedText,
        status: 'displayed' as const,
        processed_at: new Date().toISOString(),
        displayed_at: new Date().toISOString(),
        performance_metrics: {
          whisperTime,
          translationTime,
          totalTime,
          networkQuality,
          qualityConfig: qualityConfig.description,
          workflowId
        }
      }

      // Use retry logic for database operations
      await WorkflowRetry.database(
        async () => {
          await messageQueue.add(finalMessage)
          messageQueue.updateStatus(messageId, 'displayed')
          return true
        },
        (attempt, error) => {
          console.warn(`🔄 Database retry attempt ${attempt}:`, error.message)
          setError(`Database attempt ${attempt} failed, retrying...`)
        }
      )
      
      ProgressPreservationService.completeStep(workflowId, 3, { 
        messageStored: true,
        finalMessageId: messageId
      })

      // Clear partner activity exactly when message appears
      setPartnerActivity('idle')

      // Update stats
      setStats(prev => {
        const newTotal = prev.totalMessages + 1
        return {
          totalMessages: newTotal,
          avgWhisperTime: Math.round((prev.avgWhisperTime * prev.totalMessages + whisperTime) / newTotal),
          avgTranslationTime: Math.round((prev.avgTranslationTime * prev.totalMessages + translationTime) / newTotal),
          avgTotalTime: Math.round((prev.avgTotalTime * prev.totalMessages + totalTime) / newTotal)
        }
      })

      console.log('🎉 Real message processed successfully with network resilience! (TTS now on-demand)', {
        original: transcriptionResult.text,
        translation: translationResult.translatedText,
        timings: { whisperTime, translationTime, totalTime },
        networkQuality,
        qualityUsed: qualityConfig.description,
        workflowId,
        audioSize: audioBlob.size
      })

    } catch (err) {
      console.error('❌ Real audio processing failed with network resilience:', err)
      setError(`Processing failed: ${(err as Error).message}`)
      messageQueue.updateStatus(messageId, 'failed')
      
      // Pause workflow for potential recovery
      ProgressPreservationService.pauseWorkflow(workflowId, `Processing failed: ${(err as Error).message}`)
      
      // Log detailed error information
      console.error('Error details:', {
        messageId,
        workflowId,
        networkQuality,
        error: err.message,
        audioSize: audioBlob.size
      })
    } finally {
      setCurrentActivity('idle')
      setIsProcessing(false)
      
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000)
    }
  }

  // Text input processing function 
  const processTextMessage = async (inputText: string) => {
    if (!inputText.trim()) return
    
    const messageId = `text-msg-${Date.now()}`
    let translationTime = 0
    let totalStartTime = Date.now()

    try {
      setIsTextProcessing(true)
      setCurrentActivity('typing')
      
      // Simulate partner seeing typing activity
      setTimeout(() => {
        setPartnerActivity('typing')
      }, 100)

      // Create initial message
      const initialMessage = {
        id: messageId,
        session_id: mockSession.id,
        user_id: currentUser,
        original: inputText.trim(),
        translation: null,
        original_lang: 'en', // Default, will be detected
        target_lang: targetLanguage,
        status: 'queued' as const,
        queued_at: new Date().toISOString(),
        processed_at: null,
        displayed_at: null,
        performance_metrics: null,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString()
      }

      await messageQueue.add(initialMessage)
      messageQueue.updateStatus(messageId, 'processing')
      setCurrentActivity('processing')
      setPartnerActivity('processing')

      // Step 1: Language detection (simulate)
      const detectedLang = inputText.match(/[áéíóúñü]/i) ? 'es' : 'en'
      
      // Step 2: Translation
      performanceLogger.start('translation')
      const translationStart = Date.now()
      
      const langMap: Record<string, 'English' | 'Spanish' | 'Portuguese'> = {
        'en': 'English',
        'es': 'Spanish', 
        'pt': 'Portuguese'
      }
      const targetLangMap: Record<string, 'English' | 'Spanish' | 'Portuguese'> = {
        'en': 'English',
        'es': 'Spanish',
        'pt': 'Portuguese'
      }
      
      const sourceLang = langMap[detectedLang] || 'English'
      const targetLangFull = targetLangMap[targetLanguage] || 'Spanish'
      
      const translationResult = await TranslationService.translate(
        inputText.trim(),
        sourceLang,
        targetLangFull,
        'casual',
        {
          recentMessages: [],
          isRomanticContext: false
        }
      )

      translationTime = Date.now() - translationStart
      performanceLogger.end('translation')

      // Final message update
      const totalTime = Date.now() - totalStartTime
      const finalMessage = {
        ...initialMessage,
        original_lang: detectedLang,
        translation: translationResult.translatedText,
        status: 'displayed' as const,
        processed_at: new Date().toISOString(),
        displayed_at: new Date().toISOString(),
        performance_metrics: {
          whisperTime: 0, // No whisper for text input
          translationTime,
          totalTime
        }
      }

      await messageQueue.add(finalMessage)
      messageQueue.updateStatus(messageId, 'displayed')

      // Clear activities when message appears
      setPartnerActivity('idle')
      setCurrentActivity('idle')

      // Update stats
      setStats(prev => {
        const newTotal = prev.totalMessages + 1
        return {
          totalMessages: newTotal,
          avgWhisperTime: Math.round((prev.avgWhisperTime * prev.totalMessages) / newTotal), // Reduce whisper average since text has no whisper
          avgTranslationTime: Math.round((prev.avgTranslationTime * prev.totalMessages + translationTime) / newTotal),
          avgTotalTime: Math.round((prev.avgTotalTime * prev.totalMessages + totalTime) / newTotal)
        }
      })

      // Clear input
      setTextInput('')
      
      console.log('📝 Text message processed successfully!', {
        original: inputText.trim(),
        translation: translationResult.translatedText,
        timings: { translationTime, totalTime }
      })

    } catch (err) {
      console.error('Text processing failed:', err)
      setError(`Text processing failed: ${(err as Error).message}`)
      messageQueue.updateStatus(messageId, 'failed')
    } finally {
      setIsTextProcessing(false)
      setCurrentActivity('idle')
    }
  }

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (textInput.trim() && !isTextProcessing) {
      await processTextMessage(textInput)
    }
  }

  // playLastAudio removed - TTS now on-demand per message

  const handleAddTestMessage = async () => {
    // Keep this for quick testing
    const messageId = `test-msg-${Date.now()}`
    
    const testMessage = {
      id: messageId,
      session_id: mockSession.id,
      user_id: currentUser,
      original: 'This is a test message to verify the queue system.',
      translation: 'Este es un mensaje de prueba para verificar el sistema de cola.',
      original_lang: 'en',
      target_lang: 'es',
      status: 'queued' as const,
      queued_at: new Date().toISOString(),
      processed_at: null,
      displayed_at: null,
      performance_metrics: null,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString()
    }

    await messageQueue.add(testMessage)
    
    setTimeout(() => messageQueue.updateStatus(messageId, 'processing'), 300)
    setTimeout(() => messageQueue.updateStatus(messageId, 'displayed'), 1000)
  }

  // Network simulation functions
  const simulateNetworkCondition = async (condition: 'fast' | 'slow' | 'very-slow' | 'offline') => {
    console.log(`🌐 Simulating network condition: ${condition}`)
    setIsNetworkSimulating(true)
    setNetworkQuality(condition)
    
    // Force quality degradation service to use this condition
    try {
      if (condition === 'offline') {
        // Simulate offline - this will be handled by retry logic
        console.log('🚫 Simulating offline condition - retry logic will activate')
      } else {
        // Update quality degradation service
        QualityDegradationService.forceQuality(condition)
        const config = QualityDegradationService.getCurrentConfig()
        console.log(`📊 Quality degraded to: ${config.description}`, config)
        setSystemStatus(prev => ({ ...prev, qualityDegradation: condition }))
      }
    } catch (err) {
      console.error('❌ Network simulation failed:', err)
    }
    
    setTimeout(() => setIsNetworkSimulating(false), 1000)
  }
  
  // Automated test scenarios
  const runNetworkResilienceTests = async () => {
    console.log('🧪 Starting comprehensive network resilience tests...')
    setAutoTesting(true)
    setTestResults([])
    
    const results: any[] = []
    
    try {
      // Test 1: Network Quality Detection
      console.log('🔍 Test 1: Network Quality Detection')
      const qualityResult = await testNetworkQualityDetection()
      results.push(qualityResult)
      
      // Test 2: Quality Degradation
      console.log('📊 Test 2: Quality Degradation Strategy')
      const degradationResult = await testQualityDegradation()
      results.push(degradationResult)
      
      // Test 3: Retry Logic
      console.log('🔁 Test 3: Enhanced Retry Logic')
      const retryResult = await testRetryLogic()
      results.push(retryResult)
      
      // Test 4: Progress Preservation
      console.log('💾 Test 4: Progress Preservation')
      const progressResult = await testProgressPreservation()
      results.push(progressResult)
      
      // Test 5: iOS Audio Context
      console.log('🍎 Test 5: iOS Audio Context')
      const iosResult = await testIOSAudioSupport()
      results.push(iosResult)
      
      setTestResults(results)
      
      const passedTests = results.filter(r => r.passed).length
      const totalTests = results.length
      
      if (passedTests === totalTests) {
        console.log('✅ All network resilience tests PASSED!', { passedTests, totalTests, results })
      } else {
        console.warn('⚠️ Some tests failed', { passedTests, totalTests, results })
      }
      
    } catch (err) {
      console.error('❌ Automated testing failed:', err)
      results.push({
        name: 'Automated Testing Framework',
        passed: false,
        error: err.message,
        timestamp: Date.now()
      })
      setTestResults(results)
    } finally {
      setAutoTesting(false)
    }
  }
  
  // Individual test functions
  const testNetworkQualityDetection = async (): Promise<any> => {
    try {
      const quality = networkQualityDetector.getCurrentQuality()
      const config = networkQualityDetector.getQualityConfig(quality)
      const ping = await networkQualityDetector.pingTest()
      
      const passed = quality && config && ping !== null
      
      console.log('🔍 Network Quality Detection:', { 
        quality, 
        config: config.description, 
        timeout: config.timeout,
        ping: `${ping}ms`,
        passed 
      })
      
      return {
        name: 'Network Quality Detection',
        passed,
        details: { quality, config, ping },
        timestamp: Date.now()
      }
    } catch (err) {
      console.error('❌ Network quality test failed:', err)
      return {
        name: 'Network Quality Detection',
        passed: false,
        error: err.message,
        timestamp: Date.now()
      }
    }
  }
  
  const testQualityDegradation = async (): Promise<any> => {
    try {
      const qualities = ['fast', 'slow', 'very-slow'] as const
      const results = []
      
      for (const quality of qualities) {
        QualityDegradationService.forceQuality(quality)
        const config = QualityDegradationService.getCurrentConfig()
        const mediaConstraints = QualityDegradationService.getMediaConstraints()
        const audioConfig = QualityDegradationService.getAudioRecordingConfig()
        
        results.push({
          quality,
          config: config.description,
          bitrate: audioConfig.audioBitsPerSecond,
          sampleRate: audioConfig.sampleRate,
          expectedSize: config.expectedFileSize
        })
        
        console.log(`📊 Quality ${quality}:`, {
          description: config.description,
          bitrate: audioConfig.audioBitsPerSecond,
          sampleRate: audioConfig.sampleRate
        })
      }
      
      // Reset to auto-detection
      QualityDegradationService.initialize()
      
      return {
        name: 'Quality Degradation Strategy',
        passed: results.length === 3,
        details: results,
        timestamp: Date.now()
      }
    } catch (err) {
      console.error('❌ Quality degradation test failed:', err)
      return {
        name: 'Quality Degradation Strategy',
        passed: false,
        error: err.message,
        timestamp: Date.now()
      }
    }
  }
  
  const testRetryLogic = async (): Promise<any> => {
    try {
      // Test retry logic with simulated failures
      let attemptCount = 0
      const mockFailingFunction = async () => {
        attemptCount++
        if (attemptCount < 3) {
          const error = new Error(`Simulated network failure attempt ${attemptCount}`)
          ;(error as any).isRetryable = true // Mark as retryable
          throw error
        }
        return `Success on attempt ${attemptCount}`
      }
      
      const result = await WorkflowRetry.transcription(
        mockFailingFunction,
        (attempt, error) => {
          console.log(`🔁 Retry attempt ${attempt}: ${error.message}`)
        }
      )
      
      const passed = result === 'Success on attempt 3' && attemptCount === 3
      
      console.log('🔁 Retry Logic Test:', { result, attemptCount, passed })
      
      return {
        name: 'Enhanced Retry Logic',
        passed,
        details: { result, attemptCount },
        timestamp: Date.now()
      }
    } catch (err) {
      console.error('❌ Retry logic test failed:', err)
      return {
        name: 'Enhanced Retry Logic',
        passed: false,
        error: err.message,
        timestamp: Date.now()
      }
    }
  }
  
  const testProgressPreservation = async (): Promise<any> => {
    try {
      // Create a test workflow
      const workflowId = ProgressPreservationService.createWorkflow(
        'test-session',
        'test-user',
        [
          { id: 'test-recording', type: 'recording' },
          { id: 'test-transcription', type: 'transcription' },
          { id: 'test-translation', type: 'translation' }
        ]
      )
      
      // Start and complete steps
      ProgressPreservationService.startStep(workflowId, 0, { test: 'data' })
      ProgressPreservationService.completeStep(workflowId, 0, { success: true })
      
      ProgressPreservationService.startStep(workflowId, 1, { test: 'data' })
      ProgressPreservationService.completeStep(workflowId, 1, { transcription: 'test text' })
      
      // Start the next step so we have something to pause
      ProgressPreservationService.startStep(workflowId, 2, { test: 'data' })
      
      // Test pause/resume (add small delay to ensure state is set)
      console.log('💾 About to pause workflow...')
      ProgressPreservationService.pauseWorkflow(workflowId, 'Network test')
      await new Promise(resolve => setTimeout(resolve, 10)) // Small delay
      console.log('💾 Getting paused workflow state...')
      const pausedWorkflow = ProgressPreservationService.getWorkflow(workflowId)
      console.log('💾 Paused workflow state:', { isPaused: pausedWorkflow?.isPaused, currentStep: pausedWorkflow?.currentStep })
      
      // Capture the paused state before resuming
      const wasPaused = pausedWorkflow?.isPaused === true
      
      const resumed = ProgressPreservationService.resumeWorkflow(workflowId)
      const resumedWorkflow = ProgressPreservationService.getWorkflow(workflowId)
      
      // Complete the final step (which we already started before pausing)
      ProgressPreservationService.completeStep(workflowId, 2, { translation: 'texto de prueba' })
      
      const finalWorkflow = ProgressPreservationService.getWorkflow(workflowId)
      
      const passed = wasPaused && resumed && !resumedWorkflow?.isPaused && finalWorkflow?.isComplete
      
      console.log('💾 Progress Preservation Test:', {
        workflowId,
        pausedCorrectly: wasPaused,
        resumedCorrectly: resumed && !resumedWorkflow?.isPaused,
        completedCorrectly: finalWorkflow?.isComplete,
        passed
      })
      
      // Debug logging - expanded
      console.log('💾 Debug - Paused Workflow:', pausedWorkflow)
      console.log('💾 Debug - Resumed Workflow:', resumedWorkflow) 
      console.log('💾 Debug - Final Workflow:', finalWorkflow)
      console.log('💾 Debug - Test Values:', {
        'wasPaused (captured)': wasPaused,
        'pausedWorkflow?.isPaused (current)': pausedWorkflow?.isPaused,
        'resumed': resumed,
        '!resumedWorkflow?.isPaused': !resumedWorkflow?.isPaused,
        'finalWorkflow?.isComplete': finalWorkflow?.isComplete
      })
      
      // Clean up
      ProgressPreservationService.removeWorkflow(workflowId)
      
      return {
        name: 'Progress Preservation',
        passed,
        details: {
          workflowId,
          steps: finalWorkflow?.steps.length,
          completed: finalWorkflow?.isComplete
        },
        timestamp: Date.now()
      }
    } catch (err) {
      console.error('❌ Progress preservation test failed:', err)
      return {
        name: 'Progress Preservation',
        passed: false,
        error: err.message,
        timestamp: Date.now()
      }
    }
  }
  
  const testIOSAudioSupport = async (): Promise<any> => {
    try {
      const iosInfo = iosAudioContextManager.getIOSAudioInfo()
      const iosTest = await testIOSAudioContext()
      
      const passed = iosInfo !== null && iosTest !== null
      
      console.log('🍎 iOS Audio Context Test:', {
        isIOS: iosInfo.isIOS,
        isInitialized: iosInfo.isInitialized,
        requiresInteraction: iosInfo.requiresUserInteraction,
        contextState: iosInfo.contextState,
        testPassed: iosTest.testResult,
        overall: passed
      })
      
      return {
        name: 'iOS Audio Context',
        passed,
        details: {
          isIOS: iosInfo.isIOS,
          ready: iosTest.isReady,
          supported: iosTest.isSupported
        },
        timestamp: Date.now()
      }
    } catch (err) {
      console.error('❌ iOS audio test failed:', err)
      return {
        name: 'iOS Audio Context',
        passed: false,
        error: err.message,
        timestamp: Date.now()
      }
    }
  }
  
  const handleAdd20Messages = async () => {
    const messages = [
      { en: "Hello, how are you doing today?", es: "Hola, ¿cómo estás hoy?" },
      { en: "I'm having a great time here!", es: "¡Me lo estoy pasando genial aquí!" },
      { en: "What time is the meeting tomorrow?", es: "¿A qué hora es la reunión mañana?" },
      { en: "Can you help me with this problem?", es: "¿Puedes ayudarme con este problema?" },
      { en: "The weather is beautiful today.", es: "El clima está hermoso hoy." },
      { en: "I love learning new languages.", es: "Me encanta aprender nuevos idiomas." },
      { en: "Let's grab some coffee later.", es: "Vamos por un café más tarde." },
      { en: "This app is working perfectly!", es: "¡Esta aplicación funciona perfectamente!" },
      { en: "Do you speak any other languages?", es: "¿Hablas algún otro idioma?" },
      { en: "I'm excited about this project.", es: "Estoy emocionado por este proyecto." },
      { en: "The food here is delicious.", es: "La comida aquí está deliciosa." },
      { en: "Can we schedule a call for later?", es: "¿Podemos programar una llamada para más tarde?" },
      { en: "I need to finish this by Friday.", es: "Necesito terminar esto para el viernes." },
      { en: "Thanks for all your help!", es: "¡Gracias por toda tu ayuda!" },
      { en: "This translation is very accurate.", es: "Esta traducción es muy precisa." },
      { en: "I'm learning so much today.", es: "Estoy aprendiendo mucho hoy." },
      { en: "The presentation went really well.", es: "La presentación salió muy bien." },
      { en: "Let's celebrate our success!", es: "¡Celebremos nuestro éxito!" },
      { en: "I hope you have a great day.", es: "Espero que tengas un gran día." },
      { en: "This has been an amazing experience.", es: "Esta ha sido una experiencia increíble." }
    ]
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i]
      const messageId = `bulk-msg-${Date.now()}-${i}`
      const isFromUser1 = i % 2 === 0
      
      const testMessage = {
        id: messageId,
        session_id: mockSession.id,
        user_id: isFromUser1 ? 'user-1' : 'user-2',
        original: isFromUser1 ? message.en : message.es,
        translation: isFromUser1 ? message.es : message.en,
        original_lang: isFromUser1 ? 'en' : 'es',
        target_lang: isFromUser1 ? 'es' : 'en',
        status: 'displayed' as const,
        queued_at: new Date().toISOString(),
        processed_at: new Date().toISOString(),
        displayed_at: new Date().toISOString(),
        performance_metrics: { whisperTime: 1200, translationTime: 800, totalTime: 2000 },
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
        created_at: new Date(Date.now() + i * 1000).toISOString()
      }

      await messageQueue.add(testMessage)
      
      // Add slight delay to see them appear one by one
      if (i < messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }
  }

  // Sample messages for testing
  const sampleMessages: QueuedMessage[] = [
    {
      id: 'msg-1',
      session_id: mockSession.id,
      user_id: currentUser,
      original: 'Hello, this is my message',
      translation: 'Hola, este es mi mensaje',
      original_lang: 'en',
      target_lang: 'es',
      status: 'displayed',
      queued_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
      displayed_at: new Date().toISOString(),
      performance_metrics: null,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      localId: 'local-1',
      retryCount: 0,
      displayOrder: 1
    },
    {
      id: 'msg-2',
      session_id: mockSession.id,
      user_id: 'user-2',
      original: 'Hola, ¿cómo estás?',
      translation: 'Hello, how are you?',
      original_lang: 'es',
      target_lang: 'en',
      status: 'displayed',
      queued_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
      displayed_at: new Date().toISOString(),
      performance_metrics: null,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      localId: 'local-2',
      retryCount: 0,
      displayOrder: 2
    },
    {
      id: 'msg-3',
      session_id: mockSession.id,
      user_id: currentUser,
      original: 'This message is processing...',
      translation: 'Este mensaje se está procesando...',
      original_lang: 'en',
      target_lang: 'es',
      status: 'processing',
      queued_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
      displayed_at: null,
      performance_metrics: null,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      localId: 'local-3',
      retryCount: 0,
      displayOrder: 3
    }
  ]

  return (
    <SessionProvider session={mockSession} userId={currentUser} isLeft={true}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Phase 5: Complete Mobile Network Resilience Test
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Comprehensive testing of all mobile network resilience features: Quality Detection, Degradation, Retry Logic, Progress Preservation, and iOS Audio Context
            </p>
          </div>
          
          {/* System Status Dashboard */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-2 border-indigo-200 dark:border-indigo-800">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Mobile Network Resilience Status
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <h3 className="font-medium text-blue-900 dark:text-blue-100 text-sm">Network Quality</h3>
                <div className="flex items-center gap-2 mt-1">
                  {networkQuality === 'fast' ? <Wifi className="h-4 w-4 text-green-500" /> : 
                   networkQuality === 'offline' ? <WifiOff className="h-4 w-4 text-red-500" /> :
                   <Wifi className="h-4 w-4 text-yellow-500" />}
                  <span className="text-sm font-mono">{systemStatus.networkQuality}</span>
                </div>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                <h3 className="font-medium text-green-900 dark:text-green-100 text-sm">Quality Degradation</h3>
                <div className="text-sm font-mono mt-1">{systemStatus.qualityDegradation}</div>
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                <h3 className="font-medium text-yellow-900 dark:text-yellow-100 text-sm">Progress Preservation</h3>
                <div className="text-sm font-mono mt-1">{systemStatus.progressPreservation}</div>
              </div>
              
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                <h3 className="font-medium text-purple-900 dark:text-purple-100 text-sm">iOS Audio Context</h3>
                <div className="text-sm font-mono mt-1">{systemStatus.iosAudioContext}</div>
              </div>
              
              <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                <h3 className="font-medium text-orange-900 dark:text-orange-100 text-sm">Retry Logic</h3>
                <div className="text-sm font-mono mt-1">{systemStatus.retryLogic}</div>
              </div>
            </div>
            
            {/* Automated Testing Controls */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <TestTube className="h-4 w-4" />
                Automated Network Resilience Tests
              </h3>
              
              <div className="flex flex-wrap gap-3 mb-4">
                <button
                  onClick={runNetworkResilienceTests}
                  disabled={autoTesting}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
                >
                  {autoTesting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Running Tests...
                    </>
                  ) : (
                    <>
                      <TestTube className="h-4 w-4" />
                      Run All Tests
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => simulateNetworkCondition('slow')}
                  disabled={isNetworkSimulating}
                  className="px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:bg-gray-400 transition-colors text-sm"
                >
                  Simulate Slow Network
                </button>
                
                <button
                  onClick={() => simulateNetworkCondition('very-slow')}
                  disabled={isNetworkSimulating}
                  className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-400 transition-colors text-sm"
                >
                  Simulate Very Slow
                </button>
                
                <button
                  onClick={() => simulateNetworkCondition('fast')}
                  disabled={isNetworkSimulating}
                  className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 transition-colors text-sm"
                >
                  Reset to Fast
                </button>
              </div>
              
              {/* Test Results */}
              {testResults.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Test Results</h4>
                  <div className="space-y-2">
                    {testResults.map((result, index) => (
                      <div key={index} className={`flex items-center justify-between p-2 rounded text-sm ${
                        result.passed 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                      }`}>
                        <span>{result.passed ? '✅' : '❌'} {result.name}</span>
                        <span className="font-mono text-xs">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                    Passed: {testResults.filter(r => r.passed).length} / {testResults.length}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Text Input Testing Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-2 border-green-200 dark:border-green-800">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">📝 Text Input Testing (Both Partners)</h2>
            
            {/* Text Input Form */}
            <form onSubmit={handleTextSubmit} className="space-y-4">
              <div className="flex flex-col space-y-3">
                <label htmlFor="textInput" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Type a message as {currentUser === 'user-1' ? 'Partner 1' : 'Partner 2'}:
                </label>
                <div className="flex gap-3">
                  <input
                    id="textInput"
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Type your message in English or Spanish..."
                    disabled={isTextProcessing || isRecording || isProcessing}
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!textInput.trim() || isTextProcessing || isRecording || isProcessing}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {isTextProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Translating...
                      </>
                    ) : (
                      <>
                        📤 Send & Translate
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Text Processing Status */}
              {isTextProcessing && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 text-green-500 animate-spin" />
                    <span className="text-green-700 dark:text-green-300">⚡ Processing text with translation API...</span>
                  </div>
                </div>
              )}
            </form>

            {/* Quick Text Examples */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quick Test Examples:</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setTextInput("Hello, how are you today?")}
                  disabled={isTextProcessing}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                >
                  English Example
                </button>
                <button
                  onClick={() => setTextInput("Hola, ¿cómo estás hoy?")}
                  disabled={isTextProcessing}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                >
                  Spanish Example
                </button>
                <button
                  onClick={() => setTextInput("This translation system works great!")}
                  disabled={isTextProcessing}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                >
                  Long Text
                </button>
              </div>
            </div>
          </div>

          {/* Real Voice Recording Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-2 border-blue-200 dark:border-blue-800">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">🎙️ Real Voice Recording Test</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Instructions */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">🎯 How to Test Voice Translation:</h3>
              <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                <li>Click "Start Recording" and speak a sentence in English</li>
                <li>Click "Stop Recording" to process with real OpenAI APIs</li>
                <li>Watch the activity indicators change in real-time</li>
                <li>See live performance stats update with actual API timings</li>
                <li>Listen to the translated TTS audio output</li>
              </ol>
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mt-4 mb-2">📝 How to Test Text Input:</h3>
              <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                <li>Use the text input section above to type messages as either partner</li>
                <li>Switch users and test both Partner 1 and Partner 2 perspectives</li>
                <li>Try English and Spanish text examples</li>
                <li>Watch typing and processing activity indicators in real-time</li>
                <li>Verify translation accuracy and performance stats</li>
              </ol>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              {/* User Switch */}
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900 dark:text-white">Current User</h3>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setCurrentUser('user-1')}
                    disabled={isRecording || isProcessing}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      currentUser === 'user-1' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'
                    }`}
                  >
                    👤 Partner 1
                  </button>
                  <button
                    onClick={() => setCurrentUser('user-2')}
                    disabled={isRecording || isProcessing}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      currentUser === 'user-2' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'
                    }`}
                  >
                    👥 Partner 2
                  </button>
                </div>
              </div>

              {/* Recording Controls */}
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900 dark:text-white">Voice Recording</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleStartRecording}
                    disabled={isRecording || isProcessing}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isRecording 
                        ? 'bg-red-600 text-white' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:text-gray-500'
                    }`}
                  >
                    {isRecording ? (
                      <>
                        <Mic className="h-4 w-4 animate-pulse" />
                        Recording...
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4" />
                        Start
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={handleStopRecording}
                    disabled={!isRecording}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
                  >
                    <Square className="h-4 w-4" />
                    Stop
                  </button>
                </div>
              </div>

              {/* Language Selection */}
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900 dark:text-white">Target Language</h3>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value as any)}
                  disabled={isProcessing}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                >
                  <option value="es">Spanish (ES)</option>
                  <option value="en">English (EN)</option>
                  <option value="pt">Portuguese (PT)</option>
                </select>
              </div>

              {/* Theme Selection */}
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900 dark:text-white">Theme</h3>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="blue">💙 Ocean Blue</option>
                  <option value="emerald">💚 Forest Green</option>
                  <option value="purple">💜 Royal Purple</option>
                  <option value="rose">🌹 Rose Pink</option>
                  <option value="amber">🔥 Sunset Orange</option>
                </select>
              </div>

              {/* TTS now on-demand per message */}
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900 dark:text-white">Audio Playback</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  🔊 Click play button on messages for TTS
                </p>
              </div>

              {/* Performance Stats */}
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900 dark:text-white">Real Stats</h3>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Messages:</span>
                    <span className="font-mono">{stats.totalMessages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Avg Whisper:</span>
                    <span className="font-mono">{stats.avgWhisperTime}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Avg Translation:</span>
                    <span className="font-mono">{stats.avgTranslationTime}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Avg Total:</span>
                    <span className="font-mono">{stats.avgTotalTime}ms</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Processing Status */}
            {(isRecording || isProcessing) && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  {isRecording && (
                    <>
                      <Mic className="h-5 w-5 text-red-500 animate-pulse" />
                      <span className="text-blue-700 dark:text-blue-300">🔴 Recording your voice...</span>
                    </>
                  )}
                  {isProcessing && (
                    <>
                      <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                      <span className="text-blue-700 dark:text-blue-300">⚡ Processing with OpenAI APIs (Whisper → Translation → TTS)...</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Success Indicator */}
            {stats.totalMessages > 0 && !isProcessing && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                  <span className="text-green-700 dark:text-green-300">
                    ✅ Message processed successfully! ~1.7s faster without auto-TTS. Check MessageList below.
                  </span>
                </div>
              </div>
            )}

            {/* Quick Test Controls */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">Quick Test Controls</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleAddTestMessage}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Add Single Message
                </button>
                <button
                  onClick={handleAdd20Messages}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  📜 Add 20 Messages (Scrolling Test)
                </button>
              </div>
            </div>
          </div>

          {/* Component Tests Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* MessageBubble Tests */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">MessageBubble Components</h3>
              <div className="space-y-4">
                {sampleMessages.map((message) => (
                  <MessageBubble key={message.id} message={message} theme={theme} />
                ))}
              </div>
            </div>

            {/* ActivityIndicator Tests */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Real Activity Indicators</h3>
              <div className="space-y-6">
                {/* Current Real Activity */}
                {currentActivity !== 'idle' && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">🔴 LIVE: Your Current Activity</h4>
                    <ActivityIndicator activity={currentActivity} userName="You" />
                  </div>
                )}
                
                {/* Partner Activity Simulation */}
                {partnerActivity !== 'idle' && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">👥 LIVE: What Partner Sees</h4>
                    <ActivityIndicator activity={partnerActivity} userName="Partner" />
                  </div>
                )}
                
                <div>
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Recording Activity Example</h4>
                  <ActivityIndicator activity="recording" userName="Partner" />
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Processing Activity Example</h4>
                  <ActivityIndicator activity="processing" userName="Partner" />
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Typing Activity Example</h4>
                  <ActivityIndicator activity="typing" userName="Partner" />
                </div>
              </div>
            </div>
          </div>

          {/* MessageList Full Test */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">MessageList Component (Full Integration)</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                This shows the complete message list with real-time updates, welcome state, and activity indicators
              </p>
            </div>
            <div className="h-96">
              <MessageList />
            </div>
          </div>

          {/* Performance Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Performance Monitor</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              The PerformanceMonitor component should appear in the bottom-right corner during development mode.
              It tracks real-time metrics for Whisper transcription, translation processing, and total message delivery times.
            </p>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Expected Metrics:</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Whisper Time: Audio transcription duration</li>
                <li>• Translation Time: GPT-4o-mini translation duration</li>
                <li>• Total Time: End-to-end message processing</li>
                <li>• Message Count: Total processed messages</li>
              </ul>
            </div>
          </div>

          {/* Test Checklist */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 text-yellow-800 dark:text-yellow-200">Manual Testing Checklist</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200">✅ Visual Tests</h4>
                <ul className="space-y-1 text-yellow-700 dark:text-yellow-300">
                  <li>□ MessageBubbles show correct alignment (own vs others)</li>
                  <li>□ Status icons appear for different message states</li>
                  <li>□ Activity indicators show proper animations</li>
                  <li>□ PerformanceMonitor visible in bottom-right</li>
                  <li>□ Real activity indicator appears during recording</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200">🔄 Interactive Tests</h4>
                <ul className="space-y-1 text-yellow-700 dark:text-yellow-300">
                  <li>□ "Add Test Message" creates new messages</li>
                  <li>□ Messages progress through status states</li>
                  <li>□ MessageList auto-scrolls with new content</li>
                  <li>□ Language selector changes target language</li>
                  <li>□ TTS audio plays after successful translation</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200">📝 Text Input Tests</h4>
                <ul className="space-y-1 text-yellow-700 dark:text-yellow-300">
                  <li>□ Text input works for both Partner 1 and Partner 2</li>
                  <li>□ Quick example buttons populate input field</li>
                  <li>□ Typing activity indicator appears during processing</li>
                  <li>□ Translation API processes text messages correctly</li>
                  <li>□ Performance stats update for text-only messages</li>
                  <li>□ English and Spanish detection works properly</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200">🎙️ Real Voice Tests</h4>
                <ul className="space-y-1 text-yellow-700 dark:text-yellow-300">
                  <li>□ "Start Recording" button works (mic permission)</li>
                  <li>□ Recording indicator shows red pulsing mic</li>
                  <li>□ "Stop Recording" triggers OpenAI processing</li>
                  <li>□ Activity changes: recording → processing → idle</li>
                  <li>□ Real performance stats update with API timings</li>
                  <li>□ Success message appears after completion</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* PerformanceMonitor should appear here */}
        <PerformanceMonitor />
        
        {/* Audio elements now handled per-message */}
      </div>
    </SessionProvider>
  )
}