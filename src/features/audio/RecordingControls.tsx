import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { AudioVisualization } from '@/components/ui/AudioVisualization'
import { useSession } from '../session/SessionContext'
import { AudioWorkflowService, type AudioWorkflowResult, type WorkflowStep } from '@/services/audio-workflow'
import { MessageService } from '@/services/supabase/messages'
import { ActivityService } from '@/services/supabase/activity'
import { useSounds } from '@/lib/sounds/SoundManager'
import { ConversationContextManager, type ConversationContextEntry } from '@/lib/conversation/ConversationContext'
import { WhisperService } from '@/services/openai/whisper'
import { 
  Mic, 
  MicOff, 
  Settings, 
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import type { Language, TranslationMode } from '@/services/openai'

interface RecordingControlsProps {
  onNewMessage?: (result: AudioWorkflowResult) => void
}

export function RecordingControls({ onNewMessage }: RecordingControlsProps) {
  const { session, userId } = useSession()
  const { playRecordingStart, playRecordingStop, playTranslationComplete, playError, playMessageSent } = useSounds()
  const [isSupported, setIsSupported] = useState(true)
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('idle')
  const [progress, setProgress] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isPressed, setIsPressed] = useState(false)
  
  // Language settings - for now using hardcoded defaults
  // TODO: These should come from session preferences
  const [fromLanguage] = useState<Language>('English')
  const [toLanguage] = useState<Language>('Spanish')
  const [mode] = useState<TranslationMode>('casual')
  
  const workflowRef = useRef<AudioWorkflowService | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // Check if audio recording is supported
    setIsSupported(AudioWorkflowService.isSupported())
    
    if (!AudioWorkflowService.isSupported()) {
      setError('Audio recording is not supported in this browser')
      return
    }

    // Initialize audio workflow
    const workflow = new AudioWorkflowService({
      fromLanguage,
      toLanguage,
      mode,
      autoPlayTranslation: true,
    })

    // Set up workflow callbacks
    workflow.onStepChange = (step) => {
      setCurrentStep(step)
      updateActivityStatus(step)
      
      // Play sound feedback for key workflow events
      if (step === 'recording') {
        playRecordingStart()
      } else if (step === 'transcribing' && currentStep === 'recording') {
        playRecordingStop()
      }
    }

    workflow.onProgress = setProgress

    workflow.onAudioLevel = (level) => {
      setAudioLevel(level)
    }

    workflow.onComplete = async (result) => {
      setProgress(0)
      setAudioLevel(0)
      setError(null)
      
      // Play translation complete sound
      playTranslationComplete()
      
      try {
        // Create message in database
        const message = await MessageService.createMessage(
          session!.id,
          userId,
          result.transcription.text,
          result.translation.originalLanguage,
          result.translation.targetLanguage
        )
        
        // Update with translation
        await MessageService.updateMessageTranslation(
          message.id,
          result.translation.translatedText
        )

        // Play message sent sound
        playMessageSent()

        // Notify parent component
        onNewMessage?.(result)
        
      } catch (error) {
        console.error('Failed to save message:', error)
        setError('Failed to save message')
        playError()
      }
    }

    workflow.onError = (error, step) => {
      setError(`${step} failed: ${error.message}`)
      setProgress(0)
      setAudioLevel(0)
      playError()
    }

    workflowRef.current = workflow

    return () => {
      workflow.reset()
    }
  }, [session, userId, fromLanguage, toLanguage, mode, onNewMessage])

  // Load existing session messages for conversation context
  useEffect(() => {
    const loadConversationContext = async () => {
      if (!session || !workflowRef.current) return

      try {
        // Get recent messages from session
        const recentMessages = await MessageService.getRecentMessages(session.id, 6)
        
        if (recentMessages.length > 0) {
          // Convert to conversation context format
          const conversationContext: ConversationContextEntry[] = recentMessages.map(msg => ({
            text: msg.original,
            language: WhisperService.detectLanguage(msg.original_lang),
            timestamp: new Date(msg.timestamp).getTime()
          }))

          // Set context in workflow
          workflowRef.current.setConversationContext(conversationContext)
          
          console.log('📝 [RecordingControls] Loaded conversation context from session:', {
            sessionId: session.id,
            messagesLoaded: recentMessages.length,
            contextSize: conversationContext.length
          })
        }
      } catch (error) {
        console.warn('Failed to load conversation context:', error)
      }
    }

    loadConversationContext()
  }, [session])

  /**
   * Update activity status based on workflow step
   * 
   * This function ensures proper activity indicator timing by:
   * 1. Setting 'recording' during audio capture
   * 2. Setting 'processing' during transcription/translation/synthesis
   * 3. Setting 'idle' immediately when workflow completes or errors
   * 
   * Critical for fixing the "partner is recording" persistence issue.
   */
  const updateActivityStatus = async (step: WorkflowStep) => {
    if (!session) return

    console.log('🎯 ACTIVITY DEBUG: Received workflow step:', step, 'for user:', userId)

    let activity: 'recording' | 'processing' | 'typing' | 'idle' = 'idle';
    
    switch (step) {
      case 'recording':
        activity = 'recording'
        break
      case 'transcribing':
        activity = 'processing'
        console.log('🔄 TRANSCRIBING: Setting activity to processing')
        break
      case 'translating': 
        activity = 'processing'
        console.log('🔄 TRANSLATING: Setting activity to processing')
        break
      case 'synthesizing':
        activity = 'processing'
        console.log('🔄 SYNTHESIZING: Setting activity to processing')
        break
      case 'complete':
      case 'error':
      case 'idle':
      default:
        // Immediately set to idle for completed/error/idle states
        // This ensures activity indicators clear when workflow finishes
        console.log('🔄 WORKFLOW COMPLETE: Setting activity to idle for step:', step)
        await ActivityService.updateActivity(session.id, userId, 'idle')
        return
    }

    console.log('🔄 UPDATING ACTIVITY: Setting activity to:', activity, 'for step:', step)
    try {
      await ActivityService.updateActivity(session.id, userId, activity)
      console.log('✅ ACTIVITY UPDATE SUCCESS:', activity)
    } catch (error) {
      console.error('❌ ACTIVITY UPDATE FAILED:', error)
    }
  }

  const handleMouseDown = async () => {
    if (!workflowRef.current || !isSupported || currentStep !== 'idle') return
    
    setIsPressed(true)
    setError(null)
    
    try {
      await workflowRef.current.startWorkflow()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to start recording')
      setIsPressed(false)
      // Force activity to idle on error
      await updateActivityStatus('error')
    }
  }

  const handleMouseUp = async () => {
    if (!workflowRef.current || !isPressed) return
    
    setIsPressed(false)
    
    try {
      await workflowRef.current.stopRecording()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to stop recording')
    }
  }

  const getButtonContent = () => {
    if (!isSupported) {
      return <MicOff className="h-6 w-6" />
    }

    switch (currentStep) {
      case 'recording':
        return <Mic className="h-6 w-6 text-red-500" />
      case 'transcribing':
      case 'translating':
      case 'synthesizing':
        return <Loader2 className="h-6 w-6 animate-spin" />
      case 'complete':
        return <CheckCircle className="h-6 w-6 text-green-500" />
      case 'error':
        return <AlertCircle className="h-6 w-6 text-red-500" />
      default:
        return <Mic className="h-6 w-6" />
    }
  }

  const getButtonVariant = () => {
    if (!isSupported || currentStep === 'error') return 'secondary'
    if (currentStep === 'recording') return 'secondary' // Will be styled with red via className
    if (currentStep === 'complete') return 'primary' // Will be styled with green via className
    return 'primary'
  }

  const getStatusText = () => {
    if (!isSupported) return 'Audio not supported'
    if (error) return error

    switch (currentStep) {
      case 'recording':
        return 'Recording... Release to stop'
      case 'transcribing':
        return 'Converting speech to text...'
      case 'translating':
        return `Translating ${fromLanguage} to ${toLanguage}...`
      case 'synthesizing':
        return 'Generating speech...'
      case 'complete':
        return 'Translation complete!'
      case 'error':
        return error || 'Something went wrong'
      default:
        return 'Hold to record and translate'
    }
  }


  return (
    <div className="glass-effect border-t border-white/20 p-4 safe-area-inset-bottom">
      <div className="container mx-auto max-w-6xl">
        {/* Progress bar */}
        {progress > 0 && currentStep !== 'idle' && (
          <div className="mb-6 animate-slide-down-spring">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-gray-600 capitalize">
                {currentStep}...
              </span>
              <span className="text-xs font-medium text-blue-600">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Recording button with 5-bar audio visualization */}
        <div className="flex flex-col items-center mb-4">
          <div className="relative">
            {/* Outer ring for visual feedback */}
            {currentStep === 'recording' && (
              <div className="absolute inset-0 rounded-full border-4 border-red-500 opacity-30 animate-pulse-recording" />
            )}
            
            <Button
              ref={buttonRef}
              size="lg"
              variant={getButtonVariant()}
              className={`rounded-full h-20 w-20 transition-all duration-300 shadow-lg transform-gpu active:scale-95 hover:scale-105 ${
                currentStep === 'recording' 
                  ? 'bg-red-500 hover:bg-red-600 text-white scale-110 shadow-red-200 animate-pulse-recording' :
                currentStep === 'complete' 
                  ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-200 animate-success-pop' :
                currentStep === 'error' 
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-200 animate-shake' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
              }`}
              disabled={!isSupported || (currentStep !== 'idle' && currentStep !== 'recording')}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchEnd={handleMouseUp}
            >
              <div className="flex flex-col items-center">
                {getButtonContent()}
              </div>
            </Button>
          </div>
          
          {/* 5-bar audio visualization below button */}
          <div className="mt-3">
            <AudioVisualization
              audioLevel={audioLevel}
              isRecording={currentStep === 'recording'}
              size="lg"
              colors={{
                active: currentStep === 'recording' ? '#EF4444' : '#3B82F6',
                inactive: '#E5E7EB'
              }}
            />
          </div>
        </div>

        {/* Status text */}
        <div className="text-center animate-fade-in-fast">
          <p className={`text-sm font-medium mb-1 ${
            error ? 'text-red-600' : 
            currentStep === 'complete' ? 'text-green-600' : 
            currentStep === 'recording' ? 'text-red-600' :
            'text-gray-700'
          }`}>
            {getStatusText()}
          </p>
          
          {/* Instructions */}
          {currentStep === 'idle' && (
            <p className="text-xs text-gray-500">
              Tap and hold to record • Release to translate
            </p>
          )}
        </div>

        {/* Language settings */}
        <div className="flex justify-center items-center gap-3 mt-4 px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-full inline-flex mx-auto">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">{fromLanguage}</span>
            <div className="flex items-center gap-1 text-gray-400 dark:text-gray-600">
              <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
              <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
              <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>
            <span className="font-medium text-gray-700 dark:text-gray-300">{toLanguage}</span>
          </div>
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Settings className="h-3 w-3" />
            <span className="capitalize">{mode}</span>
          </div>
        </div>
      </div>
    </div>
  )
}