export * from './types'
export * from './TranslationPipeline'

import { TranslationPipeline } from './TranslationPipeline'
import { SecureWhisperService } from '@/services/openai/whisper-secure'
import { SecureTranslationService } from '@/services/openai/translation-secure'
import type { ITranslationPipeline, IWhisperService, ITranslationService } from './types'

// Adapter classes to make existing services compatible with pipeline interfaces
class WhisperServiceAdapter implements IWhisperService {
  async transcribeAudio(audioFile: File, contextPrompt?: string) {
    return await SecureWhisperService.transcribeAudio(audioFile, contextPrompt)
  }

  detectLanguage(whisperLanguage: string): string {
    return SecureWhisperService.detectLanguage(whisperLanguage)
  }
}

class TranslationServiceAdapter implements ITranslationService {
  async translate(
    text: string,
    fromLang: string,
    toLang: string,
    mode: string,
    context?: any
  ) {
    return await SecureTranslationService.translate(
      text,
      fromLang as any,
      toLang as any,
      mode as any,
      context
    )
  }
}

// Factory function to create a configured TranslationPipeline
export function createTranslationPipeline(): ITranslationPipeline {
  const whisperService = new WhisperServiceAdapter()
  const translationService = new TranslationServiceAdapter()
  
  return new TranslationPipeline(whisperService, translationService)
}

// Singleton instance for backward compatibility
export const translationPipeline = createTranslationPipeline()