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

// Pattern-based language detection patterns from translatorinfo.md
const LANGUAGE_PATTERNS = {
  spanish: {
    commonWords: ['sí', 'no', 'gracias', 'hola', 'adiós', 'bien', 'bueno', 'cómo', 'qué', 'está', 'están', 'estoy', 'estás', 'es', 'son', 'tiene', 'tengo'],
    uniqueChars: /[ñáéíóúü]/,
    strongIndicators: ['cómo estás', 'qué tal', 'buenos días', 'buenas tardes', 'por favor']
  },
  portuguese: {
    commonWords: ['sim', 'não', 'obrigado', 'obrigada', 'olá', 'tchau', 'como', 'que', 'está', 'estão', 'estou', 'é', 'são', 'tem', 'têm', 'tenho'],
    uniqueChars: /[çãõâêô]/,
    strongIndicators: ['como está', 'tudo bem', 'bom dia', 'boa tarde', 'por favor']
  },
  english: {
    commonWords: ['the', 'and', 'or', 'but', 'this', 'that', 'have', 'has', 'will', 'would', 'yes', 'no', 'hello', 'hi', 'thanks', 'please'],
    suffixes: ['ing', 'tion', 'ness', 'ment', 'ly'],
    strongIndicators: ['how are you', 'what is', 'thank you', 'please']
  }
}

export class LanguageDetectionService {
  /**
   * Convert Whisper language detection to our Language type
   * Returns null if language is not supported
   */
  static mapWhisperLanguage(whisperLanguage: string): Language | null {
    const normalizedLang = whisperLanguage.toLowerCase().trim()
    const mapped = WHISPER_TO_LANGUAGE_MAP[normalizedLang]
    
    if (!mapped) {
      console.warn(`❌ Unsupported language detected: "${whisperLanguage}". Only English, Spanish, and Portuguese are supported.`)
      return null
    }
    
    return mapped
  }

  /**
   * Determine translation direction based on detected language
   * 
   * Rules:
   * 1. If detected language is English → translate to first available target language (Spanish)
   * 2. If detected language is Spanish/Portuguese → translate to English
   * 3. Always ensure one language is English
   * 4. Returns null if language is not supported
   */
  static determineTranslationDirection(detectedLanguage: Language | null): {
    fromLanguage: Language
    toLanguage: Language
  } | null {
    // If language is not supported, return null
    if (!detectedLanguage) {
      return null
    }

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
      // This should never happen now that mapWhisperLanguage returns null for unsupported
      console.error(`Unexpected language in determineTranslationDirection: ${detectedLanguage}`)
      return null
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
  static isLanguageSupported(language: string | Language): boolean {
    // If it's already a Language type, just check if it's in supported list
    if (this.getSupportedLanguages().includes(language as Language)) {
      return true
    }
    
    // Otherwise try to map it
    const mapped = this.mapWhisperLanguage(language)
    return mapped !== null && this.getSupportedLanguages().includes(mapped)
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

  /**
   * Pattern-based language detection fallback
   * Analyzes text patterns to determine language when Whisper detection is unreliable
   */
  static detectLanguageFromText(text: string): Language | null {
    if (!text || text.trim().length === 0) {
      return null
    }

    const lowerText = text.toLowerCase()
    const scores = {
      spanish: 0,
      portuguese: 0,
      english: 0
    }

    // Check for strong indicators first
    for (const indicator of LANGUAGE_PATTERNS.spanish.strongIndicators) {
      if (lowerText.includes(indicator)) scores.spanish += 5
    }
    for (const indicator of LANGUAGE_PATTERNS.portuguese.strongIndicators) {
      if (lowerText.includes(indicator)) scores.portuguese += 5
    }
    for (const indicator of LANGUAGE_PATTERNS.english.strongIndicators) {
      if (lowerText.includes(indicator)) scores.english += 5
    }

    // Check for unique characters
    if (LANGUAGE_PATTERNS.spanish.uniqueChars.test(text)) {
      scores.spanish += 3
    }
    if (LANGUAGE_PATTERNS.portuguese.uniqueChars.test(text)) {
      scores.portuguese += 3
    }

    // Check for common words
    const words = lowerText.split(/\s+/)
    for (const word of words) {
      if (LANGUAGE_PATTERNS.spanish.commonWords.includes(word)) scores.spanish += 1
      if (LANGUAGE_PATTERNS.portuguese.commonWords.includes(word)) scores.portuguese += 1
      if (LANGUAGE_PATTERNS.english.commonWords.includes(word)) scores.english += 1
      
      // Check English suffixes
      if (LANGUAGE_PATTERNS.english.suffixes.some(suffix => word.endsWith(suffix))) {
        scores.english += 0.5
      }
    }

    // Determine the language with highest score
    const maxScore = Math.max(scores.spanish, scores.portuguese, scores.english)
    
    // Require a minimum score to be confident
    if (maxScore < 2) {
      console.warn('Pattern-based detection: No clear language pattern found')
      return null
    }

    if (scores.spanish === maxScore) return 'Spanish'
    if (scores.portuguese === maxScore) return 'Portuguese'
    if (scores.english === maxScore) return 'English'

    return null
  }

  /**
   * Combined language detection with Whisper primary and pattern-based fallback
   */
  static detectLanguageWithFallback(whisperLanguage: string, transcribedText: string): Language | null {
    // First try Whisper's detection
    const whisperDetected = this.mapWhisperLanguage(whisperLanguage)
    
    if (whisperDetected) {
      console.log(`✅ Whisper detected supported language: ${whisperDetected}`)
      return whisperDetected
    }

    // If Whisper detected unsupported language, try pattern-based detection
    console.log(`⚠️ Whisper detected unsupported language "${whisperLanguage}", trying pattern-based detection...`)
    const patternDetected = this.detectLanguageFromText(transcribedText)
    
    if (patternDetected) {
      console.log(`✅ Pattern-based detection found: ${patternDetected}`)
      return patternDetected
    }

    console.error(`❌ Could not detect supported language. Whisper: "${whisperLanguage}", Pattern detection: failed`)
    return null
  }
}