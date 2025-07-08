/**
 * Cached OpenAI Service Integration for Phase 7
 * Wraps existing OpenAI services with intelligent caching
 * Maintains compatibility with existing Phase 3-6 architecture
 */

import { CacheManager } from './CacheManager'
import { TranslationService } from '@/services/openai/translation'
import { TTSService, type TTSVoice, type TTSSpeed } from '@/services/openai/tts'
import { TranscriptionService } from '@/services/openai/transcription'
import { performanceLogger, PERF_OPS } from '@/lib/performance'
import type { Language, TranslationMode, TranslationResult, TTSResult, TranscriptionResult } from '@/services/openai/index'
import type { PromptContext } from '@/services/openai/prompts'

export class CachedOpenAIService {
  /**
   * Cached translation with smart key generation
   */
  static async translate(
    text: string,
    fromLang: Language,
    toLang: Language,
    mode: TranslationMode = 'casual',
    context?: PromptContext
  ): Promise<TranslationResult & { inputTokens: number; outputTokens: number; cached: boolean }> {
    performanceLogger.start('cached-translation')
    
    // Generate context hash for cache key if context provided
    const contextHash = context ? this.generateContextHash(context) : undefined
    
    // Generate cache key
    const cacheKey = CacheManager.generateTranslationKey(
      text, 
      fromLang, 
      toLang, 
      mode, 
      contextHash
    )
    
    console.log(`🔄 [Cached Translation] ${fromLang} → ${toLang}: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`)
    
    try {
      // Try to get from cache first
      const cached = CacheManager.get<TranslationResult & { inputTokens: number; outputTokens: number }>(cacheKey)
      
      if (cached) {
        performanceLogger.end('cached-translation')
        console.log(`✅ [Cached Translation] Cache hit - saved API call`)
        
        // Track cache hit performance
        performanceLogger.logEvent(PERF_OPS.API_TRANSLATION, { 
          cached: true, 
          fromLang, 
          toLang, 
          textLength: text.length 
        })
        
        return { ...cached, cached: true }
      }
      
      // Cache miss - call actual service
      console.log(`🌐 [Cached Translation] Cache miss - calling OpenAI API`)
      const result = await TranslationService.translate(text, fromLang, toLang, mode, context)
      
      // Cache the result
      CacheManager.set(cacheKey, result, 'translation')
      
      performanceLogger.end('cached-translation')
      
      // Track cache miss performance
      performanceLogger.logEvent(PERF_OPS.API_TRANSLATION, { 
        cached: false, 
        fromLang, 
        toLang, 
        textLength: text.length,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens
      })
      
      console.log(`💾 [Cached Translation] Cached result for future use`)
      
      return { ...result, cached: false }
      
    } catch (error) {
      performanceLogger.end('cached-translation')
      console.error(`❌ [Cached Translation] Error:`, error)
      throw error
    }
  }

  /**
   * Cached TTS synthesis with audio buffer caching
   */
  static async synthesize(
    text: string,
    voice: TTSVoice = 'alloy',
    speed: TTSSpeed = 1.0
  ): Promise<TTSResult & { cached: boolean }> {
    performanceLogger.start('cached-tts')
    
    // Generate cache key
    const cacheKey = CacheManager.generateTTSKey(text, voice, speed)
    
    console.log(`🔊 [Cached TTS] Synthesizing: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}" (${voice}, ${speed}x)`)
    
    try {
      // Try to get from cache first
      const cached = CacheManager.get<TTSResult>(cacheKey)
      
      if (cached) {
        performanceLogger.end('cached-tts')
        console.log(`✅ [Cached TTS] Cache hit - saved expensive audio generation`)
        
        // Track cache hit performance
        performanceLogger.logEvent(PERF_OPS.API_TTS, { 
          cached: true, 
          voice, 
          speed, 
          textLength: text.length 
        })
        
        return { ...cached, cached: true }
      }
      
      // Cache miss - call actual service
      console.log(`🎵 [Cached TTS] Cache miss - calling OpenAI TTS API`)
      const result = await TTSService.synthesize(text, voice, speed)
      
      // Cache the result (audio buffer included)
      CacheManager.set(cacheKey, result, 'tts')
      
      performanceLogger.end('cached-tts')
      
      // Track cache miss performance
      performanceLogger.logEvent(PERF_OPS.API_TTS, { 
        cached: false, 
        voice, 
        speed, 
        textLength: text.length,
        audioSize: result.audioBuffer.byteLength
      })
      
      console.log(`💾 [Cached TTS] Cached audio (${(result.audioBuffer.byteLength / 1024).toFixed(1)}KB) for future use`)
      
      return { ...result, cached: false }
      
    } catch (error) {
      performanceLogger.end('cached-tts')
      console.error(`❌ [Cached TTS] Error:`, error)
      throw error
    }
  }

  /**
   * Cached transcription with audio hash-based caching
   */
  static async transcribe(
    audioBlob: Blob,
    language?: string,
    prompt?: string
  ): Promise<TranscriptionResult & { cached: boolean }> {
    performanceLogger.start('cached-transcription')
    
    // Generate hash for audio content
    const audioHash = await this.generateAudioHash(audioBlob)
    const cacheKey = CacheManager.generateTranscriptionKey(audioHash)
    
    console.log(`🎤 [Cached Transcription] Processing audio: ${(audioBlob.size / 1024).toFixed(1)}KB`)
    
    try {
      // Try to get from cache first
      const cached = CacheManager.get<TranscriptionResult>(cacheKey)
      
      if (cached) {
        performanceLogger.end('cached-transcription')
        console.log(`✅ [Cached Transcription] Cache hit - saved Whisper API call`)
        
        // Track cache hit performance
        performanceLogger.logEvent(PERF_OPS.API_WHISPER, { 
          cached: true, 
          audioSize: audioBlob.size 
        })
        
        return { ...cached, cached: true }
      }
      
      // Cache miss - call actual service
      console.log(`🌐 [Cached Transcription] Cache miss - calling Whisper API`)
      const result = await TranscriptionService.transcribe(audioBlob, language, prompt)
      
      // Cache the result (shorter TTL for transcriptions as they can be context-dependent)
      CacheManager.set(cacheKey, result, 'transcription')
      
      performanceLogger.end('cached-transcription')
      
      // Track cache miss performance
      performanceLogger.logEvent(PERF_OPS.API_WHISPER, { 
        cached: false, 
        audioSize: audioBlob.size,
        transcriptionLength: result.text.length
      })
      
      console.log(`💾 [Cached Transcription] Cached result: "${result.text.slice(0, 50)}${result.text.length > 50 ? '...' : ''}"`)
      
      return { ...result, cached: false }
      
    } catch (error) {
      performanceLogger.end('cached-transcription')
      console.error(`❌ [Cached Transcription] Error:`, error)
      throw error
    }
  }

  /**
   * Generate hash for audio content to use as cache key
   */
  private static async generateAudioHash(audioBlob: Blob): Promise<string> {
    const arrayBuffer = await audioBlob.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Generate hash for prompt context to use in cache key
   */
  private static generateContextHash(context: PromptContext): string {
    const contextStr = JSON.stringify(context)
    let hash = 0
    for (let i = 0; i < contextStr.length; i++) {
      const char = contextStr.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(36)
  }

  /**
   * Warm up cache with common translations
   */
  static async warmUpCache(): Promise<void> {
    console.log('🔥 [Cached OpenAI] Starting cache warm-up...')
    
    const commonPhrases = [
      { text: 'Hello', fromLang: 'en' as Language, toLang: 'es' as Language },
      { text: 'Thank you', fromLang: 'en' as Language, toLang: 'es' as Language },
      { text: 'Good morning', fromLang: 'en' as Language, toLang: 'es' as Language },
      { text: 'Hola', fromLang: 'es' as Language, toLang: 'en' as Language },
      { text: 'Gracias', fromLang: 'es' as Language, toLang: 'en' as Language },
      { text: 'Buenos días', fromLang: 'es' as Language, toLang: 'en' as Language },
    ]
    
    let warmedUp = 0
    
    for (const phrase of commonPhrases) {
      try {
        // Only warm up if not already cached
        const cacheKey = CacheManager.generateTranslationKey(
          phrase.text, 
          phrase.fromLang, 
          phrase.toLang, 
          'casual'
        )
        
        if (!CacheManager.get(cacheKey)) {
          await this.translate(phrase.text, phrase.fromLang, phrase.toLang, 'casual')
          warmedUp++
          // Small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } catch (error) {
        console.warn(`⚠️ [Cached OpenAI] Failed to warm up "${phrase.text}":`, error)
      }
    }
    
    console.log(`🔥 [Cached OpenAI] Cache warm-up complete: ${warmedUp} phrases cached`)
    performanceLogger.logEvent('cache-warmup', { warmedUp, total: commonPhrases.length })
  }

  /**
   * Get comprehensive cache statistics
   */
  static getCacheStats() {
    return CacheManager.getDetailedStats()
  }

  /**
   * Clear cache by type
   */
  static clearCache(type?: 'translation' | 'tts' | 'transcription') {
    CacheManager.clear(type)
  }

  /**
   * Log cache performance report
   */
  static logCacheReport() {
    CacheManager.logReport()
  }
}