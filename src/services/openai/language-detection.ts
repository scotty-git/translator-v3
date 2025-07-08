import type { Language } from './index'

/**
 * Smart Language Detection and Translation Direction Service
 * 
 * This service handles:
 * 1. Mapping Whisper language codes to our Language types
 * 2. Determining the correct translation direction based on detected language
 * 3. Ensuring one language is always English (as per requirements)
 */

// Whisper language code mappings to our supported languages
const WHISPER_TO_LANGUAGE_MAP: Record<string, Language> = {
  'en': 'English',
  'english': 'English',
  'es': 'Spanish', 
  'spanish': 'Spanish',
  'pt': 'Portuguese',
  'portuguese': 'Portuguese',
  'pt-br': 'Portuguese', // Brazilian Portuguese
  'pt-pt': 'Portuguese', // European Portuguese
}

// Supported target languages (always non-English)
const TARGET_LANGUAGES: Language[] = ['Spanish', 'Portuguese']

export class LanguageDetectionService {
  /**
   * Convert Whisper language detection to our Language type
   */
  static mapWhisperLanguage(whisperLanguage: string): Language {
    const normalizedLang = whisperLanguage.toLowerCase().trim()
    return WHISPER_TO_LANGUAGE_MAP[normalizedLang] || 'English' // Default to English if unknown
  }

  /**
   * Determine translation direction based on detected language
   * 
   * Rules:
   * 1. If detected language is English → translate to first available target language (Spanish)
   * 2. If detected language is Spanish/Portuguese → translate to English
   * 3. Always ensure one language is English
   */
  static determineTranslationDirection(detectedLanguage: Language): {
    fromLanguage: Language
    toLanguage: Language
  } {
    // Remove auto-detect if it somehow got through
    if (detectedLanguage === 'auto-detect') {
      detectedLanguage = 'English'
    }

    if (detectedLanguage === 'English') {
      // English → Spanish (default target for single device mode)
      return {
        fromLanguage: 'English',
        toLanguage: 'Spanish'
      }
    } else if (TARGET_LANGUAGES.includes(detectedLanguage)) {
      // Spanish/Portuguese → English
      return {
        fromLanguage: detectedLanguage,
        toLanguage: 'English'
      }
    } else {
      // Unknown language → treat as English and translate to Spanish
      console.warn(`Unknown language detected: ${detectedLanguage}, treating as English → Spanish`)
      return {
        fromLanguage: 'English',
        toLanguage: 'Spanish'
      }
    }
  }

  /**
   * Get all supported languages for the UI
   */
  static getSupportedLanguages(): Language[] {
    return ['English', 'Spanish', 'Portuguese']
  }

  /**
   * Check if a language is supported
   */
  static isLanguageSupported(language: string): boolean {
    const mapped = this.mapWhisperLanguage(language)
    return this.getSupportedLanguages().includes(mapped)
  }

  /**
   * Get language display name for UI
   */
  static getLanguageDisplayName(language: Language): string {
    switch (language) {
      case 'English': return 'English'
      case 'Spanish': return 'Español'
      case 'Portuguese': return 'Português'
      case 'auto-detect': return 'Auto-detect'
      default: return language
    }
  }

  /**
   * Get appropriate flag emoji for language
   */
  static getLanguageFlag(language: Language): string {
    switch (language) {
      case 'English': return '🇺🇸'
      case 'Spanish': return '🇪🇸'
      case 'Portuguese': return '🇧🇷'
      case 'auto-detect': return '🤖'
      default: return '🌐'
    }
  }

  /**
   * Validate if translation direction makes sense
   */
  static validateTranslationDirection(from: Language, to: Language): boolean {
    // Must include English
    if (from !== 'English' && to !== 'English') {
      return false
    }
    
    // Can't translate to same language
    if (from === to) {
      return false
    }
    
    // Both must be supported
    const supported = this.getSupportedLanguages()
    return supported.includes(from) && supported.includes(to)
  }
}