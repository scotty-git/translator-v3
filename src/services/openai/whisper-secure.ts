import { getOpenAIProxyClient } from '@/lib/openai-proxy'
import { calculateWhisperCost, logApiCost } from '@/lib/openai'
import { WorkflowRetry } from '@/lib/retry-logic'

export interface SecureWhisperResponse {
  text: string
  language: string
  duration: number
  segments?: Array<{
    text: string
    start: number
    end: number
  }>
}

export class SecureWhisperService {
  /**
   * Transcribe audio using Whisper API via secure proxy
   */
  static async transcribeAudio(
    audioFile: File,
    contextPrompt?: string
  ): Promise<SecureWhisperResponse> {
    const startTime = Date.now()
    
    // Get audio duration for cost calculation first (not retried)
    const duration = await this.getAudioDuration(audioFile)
    
    // Wrap the Whisper API call with retry logic
    return WorkflowRetry.transcription(async () => {
      try {
        console.log('🔒 Calling Whisper API via secure proxy...')
        
        // Call Whisper API through proxy
        const response = await getOpenAIProxyClient().createTranscription(audioFile, {
          language: undefined, // Let Whisper auto-detect
          prompt: contextPrompt,
        })
        
        // Calculate and log cost
        const cost = calculateWhisperCost(duration)
        logApiCost('Whisper (secure)', cost)
        
        // Log performance
        console.log(`⚡ Secure Whisper API: ${Date.now() - startTime}ms`)
        
        return {
          text: response.text,
          language: response.language || 'unknown',
          duration,
          segments: response.segments,
        }
      } catch (error) {
        console.error('Secure Whisper transcription error:', error)
        
        // Enhance error with retry information
        const enhancedError = error as any
        enhancedError.isNetworkError = true // Most Whisper failures are network-related
        
        throw enhancedError
      }
    }, (attempt, error) => {
      console.warn(`🔒 Secure Whisper retry attempt ${attempt}:`, error.message)
    })
  }

  /**
   * Build context prompt from recent messages
   */
  static buildContextPrompt(recentMessages: string[]): string {
    if (recentMessages.length === 0) return ''
    
    // Use last 3 messages for context
    const context = recentMessages.slice(-3).join(' ')
    
    // Limit to 200 characters
    return context.length > 200 ? context.slice(-200) : context
  }

  /**
   * Detect language from Whisper response
   */
  static detectLanguage(whisperLanguage: string): string {
    // Map Whisper language codes to our supported languages
    const languageMap: Record<string, string> = {
      'english': 'en',
      'spanish': 'es',
      'portuguese': 'pt',
      'en': 'en',
      'es': 'es',
      'pt': 'pt',
    }
    
    return languageMap[whisperLanguage.toLowerCase()] || 'en'
  }

  /**
   * Get audio duration from file
   */
  private static async getAudioDuration(audioFile: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = new Audio()
      const url = URL.createObjectURL(audioFile)
      
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url)
        resolve(audio.duration || 0)
      }
      
      audio.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Could not load audio file'))
      }
      
      audio.src = url
    })
  }
}