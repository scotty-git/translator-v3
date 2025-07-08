import { getOpenAIClientWithAdaptiveTimeout, calculateTTSCost, logApiCost } from '@/lib/openai'
import { WorkflowRetry } from '@/lib/retry-logic'
import type { TTSResult } from './index'

export type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
export type TTSSpeed = 0.25 | 0.5 | 0.75 | 1.0 | 1.25 | 1.5 | 1.75 | 2.0 | 2.25 | 2.5 | 2.75 | 3.0 | 3.25 | 3.5 | 3.75 | 4.0;

export class TTSService {
  /**
   * Convert text to speech using OpenAI TTS
   */
  static async synthesize(
    text: string,
    voice: TTSVoice = 'alloy',
    speed: TTSSpeed = 1.0
  ): Promise<TTSResult> {
    const startTime = Date.now()
    
    // Wrap the TTS API call with retry logic
    return WorkflowRetry.tts(async () => {
      try {
        console.log(`🔊 Calling TTS API for synthesis: ${text.length} chars`)

        const response = await getOpenAIClientWithAdaptiveTimeout().audio.speech.create({
          model: 'tts-1',
          voice,
          input: text,
          speed,
          response_format: 'mp3',
        });

        const audioBuffer = await response.arrayBuffer();
        
        // Calculate and log cost
        const cost = calculateTTSCost(text.length)
        logApiCost('TTS', cost)
        
        // Estimate duration based on text length and speed
        // Rough calculation: ~150 words per minute at normal speed
        const wordCount = text.split(' ').length;
        const estimatedDuration = (wordCount / 150) * 60 / speed;

        // Log performance
        console.log(`⚡ TTS API: ${Date.now() - startTime}ms`)

        return {
          audioBuffer,
          duration: estimatedDuration,
        };
      } catch (error) {
        console.error('TTS error:', error);
        
        // Enhance error with retry information
        const enhancedError = error as any
        enhancedError.isNetworkError = true // Most TTS failures are network-related
        
        throw enhancedError
      }
    }, (attempt, error) => {
      console.warn(`🔊 TTS retry attempt ${attempt}:`, error.message)
    })
  }

  /**
   * Get recommended voice based on target language and gender preference
   */
  static getRecommendedVoice(
    language: string,
    gender: 'male' | 'female' | 'neutral' = 'neutral'
  ): TTSVoice {
    // OpenAI TTS voices work well for multiple languages
    // These are general recommendations based on voice characteristics
    if (gender === 'female') {
      return language === 'Spanish' || language === 'Portuguese' ? 'nova' : 'shimmer';
    } else if (gender === 'male') {
      return language === 'Spanish' || language === 'Portuguese' ? 'onyx' : 'echo';
    } else {
      return 'alloy'; // Neutral, works well for all languages
    }
  }

  /**
   * Get recommended speech speed based on translation mode
   */
  static getRecommendedSpeed(mode: 'casual' | 'fun' = 'casual'): TTSSpeed {
    // Slightly slower for casual conversations to ensure clarity
    // Normal speed for fun mode to maintain energy
    return mode === 'casual' ? 1.0 : 1.0;
  }

  /**
   * Create audio blob from ArrayBuffer for playback
   */
  static createAudioBlob(audioBuffer: ArrayBuffer): Blob {
    return new Blob([audioBuffer], { type: 'audio/mpeg' });
  }

  /**
   * Create audio URL for immediate playback
   */
  static createAudioURL(audioBuffer: ArrayBuffer): string {
    const blob = this.createAudioBlob(audioBuffer);
    return URL.createObjectURL(blob);
  }

  /**
   * Play audio immediately in browser
   */
  static async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const audioUrl = this.createAudioURL(audioBuffer);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          reject(new Error('Audio playback failed'));
        };
        
        audio.play().catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }
}