import { WhisperService } from './whisper'
import { TranslationService } from './translation'
import { TTSService } from './tts'
import { MessageService, ActivityService } from '@/services/supabase'
import type { PerformanceMetrics } from '@/types/database'

export type SupportedLanguage = 'en' | 'es' | 'pt'

export interface TranslationPipelineOptions {
  sessionId: string
  userId: string
  audioBlob: Blob
  sourceLang: SupportedLanguage
  targetLang: SupportedLanguage
  recentMessages: Array<{ role: 'user' | 'assistant', content: string }>
  mode: 'casual' | 'fun'
  enableTTS?: boolean
}

export class TranslationPipeline {
  /**
   * Complete translation pipeline: Audio -> Text -> Translation -> TTS
   */
  static async processAudioTranslation(
    options: TranslationPipelineOptions
  ): Promise<void> {
    const {
      sessionId,
      userId,
      audioBlob,
      sourceLang,
      targetLang,
      recentMessages,
      mode,
      enableTTS = true,
    } = options
    
    const metrics: PerformanceMetrics = {
      audioRecordingStart: Date.now(),
      audioRecordingEnd: Date.now(),
      whisperRequestStart: 0,
      whisperResponseEnd: 0,
      translationRequestStart: 0,
      translationResponseEnd: 0,
      messageDeliveryTime: 0,
      totalEndToEndTime: 0,
    }
    
    try {
      // Update activity to processing
      await ActivityService.updateActivity(sessionId, userId, 'processing')
      
      // Convert blob to file
      const audioFile = new File([audioBlob], 'recording.webm', { type: audioBlob.type })
      
      // Step 1: Transcribe audio
      metrics.whisperRequestStart = Date.now()
      const contextPrompt = WhisperService.buildContextPrompt(
        recentMessages.map(m => m.content)
      )
      const whisperResponse = await WhisperService.transcribeAudio(
        audioFile,
        contextPrompt
      )
      metrics.whisperResponseEnd = Date.now()
      
      if (!whisperResponse.text.trim()) {
        throw new Error('No speech detected')
      }
      
      // Create message in queued state
      const message = await MessageService.createMessage(
        sessionId,
        userId,
        whisperResponse.text,
        sourceLang,
        targetLang
      )
      
      // Step 2: Translate text
      metrics.translationRequestStart = Date.now()
      const translationResponse = await TranslationService.translate(
        whisperResponse.text,
        this.mapLanguageCode(sourceLang),
        this.mapLanguageCode(targetLang),
        mode,
        {
          recentMessages: recentMessages.slice(-5).map(m => m.content),
          isRomanticContext: TranslationService.detectRomanticContext(
            recentMessages.map(m => m.content)
          )
        }
      )
      metrics.translationResponseEnd = Date.now()
      
      // Update message with translation
      await MessageService.updateMessageTranslation(
        message.id,
        translationResponse.translatedText
      )
      
      // Step 3: Generate TTS (optional)
      if (enableTTS) {
        const ttsResponse = await TTSService.synthesize(
          translationResponse.translatedText,
          TTSService.getRecommendedVoice(targetLang, 'neutral'),
          TTSService.getRecommendedSpeed(mode)
        )
        
        // Play TTS audio
        await TTSService.playAudio(ttsResponse.audioBuffer)
        
        console.log('TTS generated:', ttsResponse.audioBuffer.byteLength, 'bytes')
      }
      
      // Calculate total time
      metrics.messageDeliveryTime = Date.now()
      metrics.totalEndToEndTime = metrics.messageDeliveryTime - metrics.audioRecordingStart
      
      // Log complete performance metrics
      this.logPerformanceMetrics(metrics)
      
      // Update activity to idle
      await ActivityService.updateActivity(sessionId, userId, 'idle')
      
    } catch (error) {
      console.error('Translation pipeline error:', error)
      await ActivityService.updateActivity(sessionId, userId, 'idle')
      throw error
    }
  }
  
  /**
   * Map supported language codes to full names
   */
  private static mapLanguageCode(lang: SupportedLanguage): 'English' | 'Spanish' | 'Portuguese' {
    const map = {
      en: 'English' as const,
      es: 'Spanish' as const,
      pt: 'Portuguese' as const,
    }
    return map[lang]
  }
  
  
  /**
   * Log performance metrics
   */
  private static logPerformanceMetrics(metrics: PerformanceMetrics): void {
    console.log('📊 Performance Metrics:')
    console.log(`- Audio Recording: ${metrics.audioRecordingEnd - metrics.audioRecordingStart}ms`)
    console.log(`- Whisper API: ${metrics.whisperResponseEnd - metrics.whisperRequestStart}ms`)
    console.log(`- Translation: ${metrics.translationResponseEnd - metrics.translationRequestStart}ms`)
    console.log(`- Delivery: ${metrics.messageDeliveryTime - metrics.translationResponseEnd}ms`)
    console.log(`- Total: ${metrics.totalEndToEndTime}ms`)
    
    // Check against targets
    if (metrics.totalEndToEndTime > 2000) {
      console.warn('⚠️ Total time exceeded 2s target')
    }
  }
}