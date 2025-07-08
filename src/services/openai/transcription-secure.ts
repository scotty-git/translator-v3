import { getOpenAIProxyClient } from '@/lib/openai-proxy';
import { performanceLogger, PERF_OPS } from '@/lib/performance';
import type { TranscriptionResult } from './index';

export class SecureTranscriptionService {
  /**
   * Transcribe audio file using OpenAI Whisper via secure proxy
   */
  static async transcribe(
    audioFile: File,
    contextPrompt?: string
  ): Promise<TranscriptionResult> {
    return performanceLogger.measureAsync(
      PERF_OPS.API_WHISPER,
      async () => {
        try {
          console.log('🔒 Calling Whisper API via secure proxy for transcription...')
          
          const transcription = await getOpenAIProxyClient().createTranscription(audioFile, {
            language: undefined, // Let Whisper auto-detect
            prompt: contextPrompt || '',
          });

          return {
            text: transcription.text.trim(),
            language: transcription.language || 'unknown',
            duration: transcription.duration || 0,
          };
        } catch (error) {
          console.error('Secure transcription error:', error);
          throw new Error(
            error instanceof Error 
              ? `Secure transcription failed: ${error.message}` 
              : 'Secure transcription failed: Unknown error'
          );
        }
      },
      { 
        audioSize: audioFile.size,
        audioType: audioFile.type 
      }
    );
  }

  /**
   * Generate context prompt from recent messages for better transcription accuracy
   */
  static generateContextPrompt(recentMessages: string[]): string {
    if (recentMessages.length === 0) return '';
    
    // Use last 3 messages for context, limit total length
    const context = recentMessages
      .slice(-3)
      .join('. ')
      .slice(0, 200); // Whisper prompt limit
    
    return context;
  }
}