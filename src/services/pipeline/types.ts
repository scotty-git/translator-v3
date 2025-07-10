import type { ConversationContextEntry } from '@/lib/conversation/ConversationContext'

export interface TranslationRequest {
  input: string | Blob
  inputType: 'text' | 'audio'
  sourceLanguage?: string
  targetLanguage: 'es' | 'en' | 'pt' | 'fr' | 'de'
  mode: 'casual' | 'fun'
  context?: {
    conversationContext: ConversationContextEntry[]
    recentMessages: string[]
    isRomanticContext: boolean
  }
  messageId?: string
  userId?: string
  sessionId?: string
}

export interface TranslationResult {
  original: string
  translation: string
  detectedLanguage: string
  originalLanguageCode: string
  targetLanguageCode: string
  metrics: {
    whisperTime?: number
    translationTime: number
    totalTime: number
  }
  inputTokens?: number
  outputTokens?: number
}

export interface IWhisperService {
  transcribeAudio(audioFile: File, contextPrompt?: string): Promise<{
    text: string
    language: string
    duration: number
  }>
  detectLanguage(whisperLanguage: string): string
}

export interface ITranslationService {
  translate(
    text: string,
    fromLang: string,
    toLang: string,
    mode: string,
    context?: any
  ): Promise<{
    originalText: string
    translatedText: string
    originalLanguage: string
    targetLanguage: string
    inputTokens?: number
    outputTokens?: number
  }>
}

export interface ITranslationPipeline {
  translate(request: TranslationRequest): Promise<TranslationResult>
  setWhisperService(service: IWhisperService): void
  setTranslationService(service: ITranslationService): void
}

export interface PipelineMetrics {
  totalRequests: number
  averageProcessingTime: number
  errorRate: number
  whisperSuccessRate: number
  translationSuccessRate: number
}