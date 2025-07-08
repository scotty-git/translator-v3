// Removed duplicate OpenAI client - use getOpenAIClient from @/lib/openai instead

export interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  originalLanguage: string;
  targetLanguage: string;
}

export interface TTSResult {
  audioBuffer: ArrayBuffer;
  duration: number;
}

export type Language = 'English' | 'Spanish' | 'Portuguese' | 'auto-detect';
export type TranslationMode = 'casual' | 'fun';

// Language mapping for Whisper API (for future use)
// const LANGUAGE_CODES = {
//   'English': 'en',
//   'Spanish': 'es', 
//   'Portuguese': 'pt'
// } as const;

// Export all services (secure proxy versions)
export * from './transcription-secure';
export * from './translation-secure';
export * from './tts-secure';
export * from './prompts';
export * from './language-detection';

// Legacy exports for backward compatibility
export { SecureTranscriptionService as TranscriptionService } from './transcription-secure';
export { SecureTranslationService as TranslationService } from './translation-secure';
export { SecureTTSService as TTSService } from './tts-secure';

