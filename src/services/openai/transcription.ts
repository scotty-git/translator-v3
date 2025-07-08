import { getOpenAIClient } from '@/lib/openai';
import { performanceLogger, PERF_OPS } from '@/lib/performance';
import type { TranscriptionResult } from './index';

export class TranscriptionService {
  /**
   * Transcribe audio file using OpenAI Whisper
   */
  static async transcribe(
    audioFile: File,
    contextPrompt?: string
  ): Promise<TranscriptionResult> {
    return performanceLogger.measureAsync(
      PERF_OPS.API_WHISPER,
      async () => {
        try {
          const transcription = await getOpenAIClient().audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
            response_format: 'verbose_json',
            prompt: contextPrompt || '',
            temperature: 0,
          });

          return {
            text: transcription.text.trim(),
            language: transcription.language || 'unknown',
            duration: transcription.duration || 0,
          };
        } catch (error) {
          console.error('Transcription error:', error);
          throw new Error(
            error instanceof Error 
              ? `Transcription failed: ${error.message}` 
              : 'Transcription failed: Unknown error'
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