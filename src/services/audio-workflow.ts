import { AudioRecorderService, type AudioRecordingResult } from './audio/recorder';
import { SecureTranscriptionService as TranscriptionService } from './openai/transcription-secure';
import { SecureTranslationService as TranslationService } from './openai/translation-secure';
import { SecureTTSService as TTSService } from './openai/tts-secure';
import { LanguageDetectionService } from './openai/language-detection';
import { ConversationContextManager, type ConversationContextEntry } from '@/lib/conversation/ConversationContext';
import type { Language, TranslationMode } from './openai';

export interface AudioWorkflowConfig {
  fromLanguage: Language;
  toLanguage: Language;
  mode: TranslationMode;
  ttsVoice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  autoPlayTranslation?: boolean;
}

export interface AudioWorkflowResult {
  originalAudio: AudioRecordingResult;
  transcription: {
    text: string;
    language: string;
    confidence?: number;
  };
  translation: {
    originalText: string;
    translatedText: string;
    originalLanguage: string;
    targetLanguage: string;
  };
  synthesizedAudio?: {
    audioBuffer: ArrayBuffer;
    duration: number;
  };
  totalDuration: number;
  performanceMetrics: {
    recordingTime: number;
    transcriptionTime: number;
    translationTime: number;
    ttsTime: number;
  };
}

export type WorkflowStep = 'idle' | 'recording' | 'transcribing' | 'translating' | 'synthesizing' | 'complete' | 'error';

export class AudioWorkflowService {
  private recorder: AudioRecorderService;
  private config: AudioWorkflowConfig;
  private conversationContext: ConversationContextEntry[] = [];
  private currentStep: WorkflowStep = 'idle';
  private startTime: number = 0;
  private stepTimes: Record<string, number> = {};

  // Event callbacks
  public onStepChange?: (step: WorkflowStep) => void;
  public onProgress?: (progress: number) => void; // 0-100
  public onComplete?: (result: AudioWorkflowResult) => void;
  public onError?: (error: Error, step: WorkflowStep) => void;
  public onAudioLevel?: (level: number) => void;

  constructor(config: AudioWorkflowConfig) {
    this.config = config;
    this.recorder = new AudioRecorderService({
      maxDuration: 60, // 1 minute max
    });

    // Set up recorder callbacks
    this.recorder.onStateChange = (state) => {
      if (state === 'recording') {
        this.setStep('recording');
      } else if (state === 'processing') {
        this.setStep('transcribing');
      } else if (state === 'error') {
        this.setStep('error');
      }
    };

    this.recorder.onAudioData = (level) => {
      this.onAudioLevel?.(level);
    };

    this.recorder.onComplete = (result) => {
      this.processRecording(result);
    };

    this.recorder.onError = (error) => {
      this.handleError(error, 'recording');
    };
  }

  /**
   * Start the complete audio workflow
   */
  async startWorkflow(): Promise<void> {
    try {
      this.startTime = performance.now();
      this.stepTimes = {};
      this.setStep('recording');
      this.updateProgress(0);

      await this.recorder.startRecording();
    } catch (error) {
      this.handleError(
        error instanceof Error ? error : new Error('Failed to start recording'),
        'recording'
      );
    }
  }

  /**
   * Stop recording and continue with workflow
   */
  async stopRecording(): Promise<void> {
    try {
      await this.recorder.stopRecording();
    } catch (error) {
      this.handleError(
        error instanceof Error ? error : new Error('Failed to stop recording'),
        'recording'
      );
    }
  }

  /**
   * Process the audio recording through the complete workflow
   */
  private async processRecording(audioResult: AudioRecordingResult): Promise<void> {
    console.log('🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀')
    console.log('🎤 [SINGLE DEVICE] STARTING AUDIO WORKFLOW PROCESSING')
    console.log('🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀')
    console.log('📊 AudioWorkflow Info:')
    console.log('   • Audio file size:', audioResult.audioFile.size, 'bytes')
    console.log('   • Audio file type:', audioResult.audioFile.type)
    console.log('   • Audio duration:', audioResult.duration, 'seconds')
    console.log('   • From Language:', this.config.fromLanguage)
    console.log('   • To Language:', this.config.toLanguage)
    console.log('   • Translation Mode:', this.config.mode)
    console.log('   • Current Context Size:', this.conversationContext.length, 'messages')
    
    try {
      this.stepTimes.recording = performance.now() - this.startTime;
      this.updateProgress(25);

      // Step 1: Transcription with conversation context
      this.setStep('transcribing');
      const transcriptionStart = performance.now();
      
      console.log('╔══════════════════════════════════════════════════════════╗')
      console.log('║          🎧 [SINGLE DEVICE] WHISPER PROCESSING          ║')
      console.log('╚══════════════════════════════════════════════════════════╝')
      
      const whisperContext = ConversationContextManager.buildWhisperContext(this.conversationContext);
      
      console.log('🎧 Calling Whisper API for single device...')
      const transcription = await TranscriptionService.transcribe(
        audioResult.audioFile,
        whisperContext
      );
      
      console.log('🎉 Whisper Response (Single Device):')
      console.log('   • Transcribed text:', `"${transcription.text}"`)
      console.log('   • Detected language:', transcription.language)
      console.log('   • Audio duration:', transcription.duration, 'seconds')
      
      this.stepTimes.transcription = performance.now() - transcriptionStart;
      this.updateProgress(50);

      // Step 2: Language Detection and Translation Direction
      this.setStep('translating');
      const translationStart = performance.now();
      
      console.log('╔══════════════════════════════════════════════════════════╗')
      console.log('║        🌐 [SINGLE DEVICE] TRANSLATION PROCESSING        ║')
      console.log('╚══════════════════════════════════════════════════════════╝')
      
      // Determine actual translation direction based on detected language
      let fromLang = this.config.fromLanguage;
      let toLang = this.config.toLanguage;
      
      console.log('🔍 Language Detection (Single Device):')
      console.log('   • Raw Whisper language:', transcription.language)
      console.log('   • Config FROM language:', this.config.fromLanguage)
      console.log('   • Config TO language:', this.config.toLanguage)
      
      // If auto-detection is enabled, use Whisper's language detection with pattern-based fallback
      if (this.config.fromLanguage === 'auto-detect' || this.config.toLanguage === 'auto-detect') {
        const detectedLanguage = LanguageDetectionService.detectLanguageWithFallback(
          transcription.language,
          transcription.text
        );
        
        // Handle unsupported language
        if (!detectedLanguage) {
          const error = new Error(
            `Unsupported language detected: "${transcription.language}". ` +
            `This translator only supports English, Spanish, and Portuguese.`
          );
          console.error('❌ Language validation failed:', error.message);
          this.handleError(error, 'translating');
          return;
        }
        
        // Use the new method that respects configured target for English speakers
        const direction = LanguageDetectionService.determineTranslationDirectionWithConfig(
          detectedLanguage,
          this.config.toLanguage === 'auto-detect' ? 'Spanish' : this.config.toLanguage
        );
        
        // This should never happen, but handle it just in case
        if (!direction) {
          const error = new Error(`Failed to determine translation direction for language: ${detectedLanguage}`);
          this.handleError(error, 'translating');
          return;
        }
        
        fromLang = direction.fromLanguage;
        toLang = direction.toLanguage;
        
        console.log('🤖 Auto-detection enabled:')
        console.log('   • Whisper detected:', transcription.language)
        console.log('   • Mapped language:', detectedLanguage)
        console.log('   • Direction FROM:', direction.fromLanguage)
        console.log('   • Direction TO:', direction.toLanguage)
        console.log(`🎯 Final: ${transcription.language} → ${detectedLanguage} → ${fromLang} to ${toLang}`);
      } else {
        console.log('🔧 Using configured language direction')
        console.log('   • FROM:', fromLang)
        console.log('   • TO:', toLang)
        
        // Validate configured languages are supported
        if (!LanguageDetectionService.isLanguageSupported(fromLang) || 
            !LanguageDetectionService.isLanguageSupported(toLang)) {
          const error = new Error(
            `Invalid language configuration. From: ${fromLang}, To: ${toLang}. ` +
            `Only English, Spanish, and Portuguese are supported.`
          );
          this.handleError(error, 'translating');
          return;
        }
      }
      
      // Enhanced translation context using conversation context system
      console.log('')
      console.log('🔧 Building context for GPT (Single Device):')
      const recentMessages = this.conversationContext.map(entry => entry.text).slice(-5);
      console.log('   • Recent messages extracted:', recentMessages.length)
      recentMessages.forEach((msg, i) => {
        console.log(`     ${i + 1}. "${msg.substring(0, 50)}${msg.length > 50 ? '...' : ''}"`)
      })
      
      const isRomanticContext = recentMessages.length > 0 ? 
        TranslationService.detectRomanticContext(recentMessages) : false;
      console.log('   • Romantic context detected:', isRomanticContext)
      console.log('   • Conversation context entries:', this.conversationContext.length)
      
      console.log('')
      console.log('⏳ Calling GPT Translation (Single Device)...')
      console.log('   📝 Input:', `"${transcription.text}"`)
      console.log('   🔄 FROM:', fromLang)
      console.log('   🎯 TO:', toLang)
      console.log('   🎭 Mode:', this.config.mode)
      
      const translation = await TranslationService.translate(
        transcription.text,
        fromLang,
        toLang,
        this.config.mode,
        {
          recentMessages,
          isRomanticContext,
          conversationContext: this.conversationContext
        }
      );
      
      console.log('🎉 Translation Complete (Single Device)!')
      console.log('   📝 Original:', `"${translation.originalText}"`)
      console.log('   🌐 Translated:', `"${translation.translatedText}"`)
      console.log('   🔤 From Language:', translation.originalLanguage)
      console.log('   🎯 To Language:', translation.targetLanguage)
      
      this.stepTimes.translation = performance.now() - translationStart;
      this.updateProgress(75);

      // Step 3: Text-to-Speech (optional)
      let synthesizedAudio;
      if (this.config.autoPlayTranslation === true) {
        this.setStep('synthesizing');
        const ttsStart = performance.now();
        
        const voice = this.config.ttsVoice || TTSService.getRecommendedVoice(
          this.config.toLanguage,
          'neutral'
        );
        const speed = TTSService.getRecommendedSpeed(this.config.mode);
        
        synthesizedAudio = await TTSService.synthesize(
          translation.translatedText,
          voice,
          speed
        );
        
        this.stepTimes.tts = performance.now() - ttsStart;
        
        // Auto-play the audio
        if (this.config.autoPlayTranslation === true) {
          TTSService.playAudio(synthesizedAudio.audioBuffer).catch(console.error);
        }
      }

      this.updateProgress(100);
      this.setStep('complete');

      console.log('')
      console.log('╔══════════════════════════════════════════════════════════╗')
      console.log('║      📝 [SINGLE DEVICE] UPDATING CONTEXT WINDOW         ║')
      console.log('╚══════════════════════════════════════════════════════════╝')
      
      // Update conversation context for future translations
      const detectedLanguageForContext = LanguageDetectionService.detectLanguageWithFallback(
        transcription.language,
        transcription.text
      );
      
      // Only add to context if we have a valid language
      if (detectedLanguageForContext) {
        console.log('🔧 Adding to conversation context (Single Device):')
        console.log('   • Original text:', `"${transcription.text}"`)
        console.log('   • Detected language:', detectedLanguageForContext)
        console.log('   • Current context size:', this.conversationContext.length)
        
        this.conversationContext = ConversationContextManager.addToContext(
          this.conversationContext,
          transcription.text,
          detectedLanguageForContext,
          Date.now()
        );
      } else {
        console.warn('⚠️ Skipping context update - unsupported language detected')
      }
      
      console.log('✅ Context updated (Single Device)!')
      console.log('   • New context size:', this.conversationContext.length)
      console.log('   • Context ready for next conversation message')

      // Prepare final result
      const totalDuration = performance.now() - this.startTime;
      const result: AudioWorkflowResult = {
        originalAudio: audioResult,
        transcription: {
          text: transcription.text,
          language: transcription.language,
        },
        translation,
        synthesizedAudio,
        totalDuration,
        performanceMetrics: {
          recordingTime: this.stepTimes.recording || 0,
          transcriptionTime: this.stepTimes.transcription || 0,
          translationTime: this.stepTimes.translation || 0,
          ttsTime: this.stepTimes.tts || 0,
        },
      };

      console.log('')
      console.log('🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉')
      console.log('🎉 [SINGLE DEVICE] AUDIO WORKFLOW COMPLETE SUCCESS!')
      console.log('🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉')
      console.log('📊 SINGLE DEVICE FINAL SUMMARY:')
      console.log('   • Original Text:', `"${transcription.text}"`)
      console.log('   • Translated Text:', `"${translation.translatedText}"`)
      console.log('   • From Language:', translation.originalLanguage)
      console.log('   • To Language:', translation.targetLanguage)
      console.log('   • Translation Mode:', this.config.mode)
      console.log('   • Context Window Size:', this.conversationContext.length, 'messages')
      console.log('   • Total Duration:', totalDuration.toFixed(2), 'ms')
      console.log('')
      console.log('⏱️  SINGLE DEVICE PERFORMANCE:')
      console.log('   • Recording Time:', this.stepTimes.recording?.toFixed(2) || '0', 'ms')
      console.log('   • Transcription Time:', this.stepTimes.transcription?.toFixed(2) || '0', 'ms')
      console.log('   • Translation Time:', this.stepTimes.translation?.toFixed(2) || '0', 'ms')
      console.log('   • TTS Time:', this.stepTimes.tts?.toFixed(2) || '0', 'ms')
      console.log('')
      console.log('🎯 SINGLE DEVICE CONTEXT READY FOR NEXT MESSAGE!')
      console.log('═══════════════════════════════════════════════════════')

      this.onComplete?.(result);

    } catch (error) {
      this.handleError(
        error instanceof Error ? error : new Error('Workflow processing failed'),
        this.currentStep
      );
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AudioWorkflowConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Add message to conversation context for better translations
   */
  addMessageToContext(text: string, language: string, timestamp?: number): void {
    this.conversationContext = ConversationContextManager.addToContext(
      this.conversationContext,
      text,
      language,
      timestamp || Date.now()
    );
  }

  /**
   * Set conversation context from external source (e.g., existing conversation messages)
   */
  setConversationContext(context: ConversationContextEntry[]): void {
    this.conversationContext = ConversationContextManager.sanitizeContext(context);
    console.log('📝 [AudioWorkflow] Set conversation context:', {
      contextSize: this.conversationContext.length,
      stats: ConversationContextManager.getContextStats(this.conversationContext)
    });
  }

  /**
   * Get current conversation context
   */
  getConversationContext(): ConversationContextEntry[] {
    return [...this.conversationContext];
  }

  /**
   * Clear conversation context
   */
  clearContext(): void {
    this.conversationContext = ConversationContextManager.clearContext();
  }

  /**
   * Get current workflow step
   */
  getCurrentStep(): WorkflowStep {
    return this.currentStep;
  }

  /**
   * Check if workflow is currently active
   */
  isActive(): boolean {
    return this.currentStep !== 'idle' && 
           this.currentStep !== 'complete' && 
           this.currentStep !== 'error';
  }

  /**
   * Set workflow step and notify listeners
   */
  private setStep(step: WorkflowStep): void {
    this.currentStep = step;
    this.onStepChange?.(step);
  }

  /**
   * Update progress and notify listeners
   */
  private updateProgress(progress: number): void {
    this.onProgress?.(Math.min(100, Math.max(0, progress)));
  }

  /**
   * Handle errors
   */
  private handleError(error: Error, step: WorkflowStep): void {
    console.error(`Audio workflow error at step ${step}:`, error);
    this.setStep('error');
    this.onError?.(error, step);
  }

  /**
   * Reset workflow to idle state
   */
  reset(): void {
    this.setStep('idle');
    this.updateProgress(0);
    this.stepTimes = {};
  }

  /**
   * Check if audio recording is supported
   */
  static isSupported(): boolean {
    return AudioRecorderService.isSupported();
  }
}