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

// Export all services
export * from './transcription';
export * from './translation';
export * from './tts';
export * from './prompts';
export * from './language-detection';

