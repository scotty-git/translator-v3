import { performanceLogger } from '@/lib/performance'
import { ConversationContextManager } from '@/lib/conversation/ConversationContext'
import { UserManager } from '@/lib/user/UserManager'
import type { 
  TranslationRequest, 
  TranslationResult, 
  ITranslationPipeline, 
  IWhisperService, 
  ITranslationService 
} from './types'

export class TranslationPipeline implements ITranslationPipeline {
  private whisperService: IWhisperService | null = null
  private translationService: ITranslationService | null = null

  constructor(
    whisperService?: IWhisperService,
    translationService?: ITranslationService
  ) {
    this.whisperService = whisperService || null
    this.translationService = translationService || null
  }

  setWhisperService(service: IWhisperService): void {
    this.whisperService = service
  }

  setTranslationService(service: ITranslationService): void {
    this.translationService = service
  }

  async translate(request: TranslationRequest): Promise<TranslationResult> {
    const totalStartTime = Date.now()
    
    console.log('🚀 [TranslationPipeline] Starting translation request:', {
      inputType: request.inputType,
      targetLanguage: request.targetLanguage,
      mode: request.mode,
      hasContext: !!request.context
    })

    try {
      if (request.inputType === 'audio') {
        return await this._handleAudioTranslation(request, totalStartTime)
      } else {
        return await this._handleTextTranslation(request, totalStartTime)
      }
    } catch (error) {
      console.error('❌ [TranslationPipeline] Translation failed:', error)
      throw error
    }
  }

  private async _handleAudioTranslation(
    request: TranslationRequest,
    totalStartTime: number
  ): Promise<TranslationResult> {
    if (!this.whisperService) {
      throw new Error('WhisperService not configured')
    }
    if (!this.translationService) {
      throw new Error('TranslationService not configured')
    }

    const audioBlob = request.input as Blob
    let whisperTime = 0
    let translationTime = 0

    // Step 1: Whisper transcription with conversation context
    performanceLogger.start('whisper-transcription')
    const whisperStart = Date.now()
    
    // Build Whisper context from conversation history
    const whisperContext = request.context?.conversationContext 
      ? ConversationContextManager.buildWhisperContext(request.context.conversationContext)
      : null
    
    // Convert Blob to File for WhisperService
    const audioFile = new File([audioBlob], 'recording.webm', { type: audioBlob.type })
    
    const transcriptionResult = await this.whisperService.transcribeAudio(
      audioFile,
      whisperContext || 'This is a casual conversation.'
    )
    
    whisperTime = Date.now() - whisperStart
    performanceLogger.end('whisper-transcription')

    if (!transcriptionResult.text) {
      throw new Error('No transcription received from Whisper')
    }

    // Step 2: Translation
    performanceLogger.start('translation')
    const translationStart = Date.now()
    
    // Language detection and mapping
    const detectedLangCode = this.whisperService.detectLanguage(transcriptionResult.language)
    const { detectedLang, actualTargetLanguage, targetLangFull } = 
      this._processLanguageDetection(detectedLangCode, request.targetLanguage)

    // Build translation context
    const translationContext = this._buildTranslationContext(request)
    
    const translationResult = await this.translationService.translate(
      transcriptionResult.text,
      detectedLang,
      targetLangFull,
      request.mode,
      translationContext
    )
    
    translationTime = Date.now() - translationStart
    performanceLogger.end('translation')

    const totalTime = Date.now() - totalStartTime

    return {
      original: transcriptionResult.text,
      translation: translationResult.translatedText,
      detectedLanguage: detectedLang,
      originalLanguageCode: detectedLangCode,
      targetLanguageCode: actualTargetLanguage,
      metrics: {
        whisperTime,
        translationTime,
        totalTime
      },
      inputTokens: translationResult.inputTokens,
      outputTokens: translationResult.outputTokens
    }
  }

  private async _handleTextTranslation(
    request: TranslationRequest,
    totalStartTime: number
  ): Promise<TranslationResult> {
    if (!this.translationService) {
      throw new Error('TranslationService not configured')
    }

    const messageText = request.input as string
    let translationTime = 0

    // Language detection for text
    performanceLogger.start('translation')
    const translationStart = Date.now()
    
    const detectedLangCode = this._detectTextLanguage(messageText)
    const { detectedLang, actualTargetLanguage, targetLangFull } = 
      this._processLanguageDetection(detectedLangCode, request.targetLanguage)

    // Build translation context
    const translationContext = this._buildTranslationContext(request)
    
    const translationResult = await this.translationService.translate(
      messageText,
      detectedLang,
      targetLangFull,
      request.mode,
      translationContext
    )
    
    translationTime = Date.now() - translationStart
    performanceLogger.end('translation')

    const totalTime = Date.now() - totalStartTime

    return {
      original: messageText,
      translation: translationResult.translatedText,
      detectedLanguage: detectedLang,
      originalLanguageCode: detectedLangCode,
      targetLanguageCode: actualTargetLanguage,
      metrics: {
        translationTime,
        totalTime
      },
      inputTokens: translationResult.inputTokens,
      outputTokens: translationResult.outputTokens
    }
  }

  private _detectTextLanguage(text: string): string {
    // Enhanced language detection for text with patterns
    const hasSpanishWords = /\b(hola|cómo|qué|por|para|con|una|uno|este|esta|está|estás|buenos|días|gracias|adiós|señor|señora)\b/i.test(text)
    const hasPortugueseWords = /\b(olá|como|que|por|para|com|uma|um|este|esta|está|você|obrigado|obrigada|tchau|bom|dia)\b/i.test(text)
    const hasFrenchWords = /\b(bonjour|comment|salut|merci|s'il|vous|plaît|avec|pour|bien|très|c'est|je|tu|il|elle|nous)\b/i.test(text)
    const hasGermanWords = /\b(hallo|guten|tag|danke|bitte|wie|geht|sehr|gut|ich|du|er|sie|wir|mit|für)\b/i.test(text)
    const hasSpanishChars = /[ñáéíóúü¿¡]/i.test(text)
    const hasPortugueseChars = /[çãõâêôà]/i.test(text)
    const hasFrenchChars = /[àâæçèéêëîïôœùûü]/i.test(text)
    const hasGermanChars = /[äöüß]/i.test(text)
    
    let detectedLangCode = 'en' // Default to English
    if ((hasSpanishWords || hasSpanishChars) && !hasPortugueseWords && !hasPortugueseChars) {
      detectedLangCode = 'es'
    } else if ((hasPortugueseWords || hasPortugueseChars) && !hasSpanishWords && !hasSpanishChars) {
      detectedLangCode = 'pt'
    } else if ((hasFrenchWords || hasFrenchChars) && !hasSpanishWords && !hasPortugueseWords) {
      detectedLangCode = 'fr'
    } else if ((hasGermanWords || hasGermanChars) && !hasSpanishWords && !hasPortugueseWords && !hasFrenchWords) {
      detectedLangCode = 'de'
    }
    
    return detectedLangCode
  }

  private _processLanguageDetection(
    detectedLangCode: string,
    targetLanguage: string
  ): {
    detectedLang: string
    actualTargetLanguage: string
    targetLangFull: string
  } {
    // Map language codes to full names for TranslationService
    const langMap: Record<string, 'English' | 'Spanish' | 'Portuguese' | 'French' | 'German'> = {
      'en': 'English',
      'es': 'Spanish', 
      'pt': 'Portuguese',
      'fr': 'French',
      'de': 'German'
    }
    
    const detectedLang = langMap[detectedLangCode] || 'English'
    
    // Translation logic: Respect user's target language selection
    let actualTargetLanguage = targetLanguage
    
    // Don't translate if input is already in target language
    if (detectedLangCode === targetLanguage) {
      actualTargetLanguage = 'en'
    }
    
    const targetLangFull = langMap[actualTargetLanguage] || 'English'
    
    return {
      detectedLang,
      actualTargetLanguage,
      targetLangFull
    }
  }

  private _buildTranslationContext(request: TranslationRequest) {
    if (!request.context) {
      return {
        recentMessages: [],
        isRomanticContext: false,
        conversationContext: []
      }
    }

    const isRomanticContext = UserManager.detectRomanticContext(request.context.recentMessages)
    
    return {
      recentMessages: request.context.recentMessages,
      isRomanticContext,
      conversationContext: request.context.conversationContext
    }
  }
}