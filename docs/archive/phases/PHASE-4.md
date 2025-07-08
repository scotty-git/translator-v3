# Phase 4: OpenAI Integration

## Overview
Integrate OpenAI APIs for speech-to-text (Whisper), translation (GPT-4o-mini), and text-to-speech with the exact prompts from the PRD.

## Prerequisites
- Phase 0-3 completed
- Audio recording system working
- OpenAI API key in environment
- Message queue structure ready

## Goals
- Integrate Whisper API for transcription
- Implement GPT-4o-mini translation with exact PRD prompts
- Add text-to-speech functionality
- Track API costs
- Handle streaming responses
- Implement performance metrics

## Implementation Steps

### 1. Install OpenAI SDK
```bash
npm install openai
```

### 2. Create OpenAI Client Configuration

#### OpenAI Client (src/lib/openai.ts)
```typescript
import OpenAI from 'openai'

const apiKey = import.meta.env.VITE_OPENAI_API_KEY

if (!apiKey) {
  throw new Error('Missing OpenAI API key')
}

export const openai = new OpenAI({
  apiKey,
  dangerouslyAllowBrowser: true, // Required for client-side usage
})

// API Cost tracking
export const API_COSTS = {
  whisper: 0.006, // per minute
  gpt4oMini: {
    input: 0.00015,  // per 1K tokens
    output: 0.00060  // per 1K tokens
  },
  tts: 0.015 // per 1K characters
}

export function calculateWhisperCost(durationSeconds: number): number {
  const minutes = Math.ceil(durationSeconds / 60)
  return minutes * API_COSTS.whisper
}

export function calculateGPTCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1000) * API_COSTS.gpt4oMini.input
  const outputCost = (outputTokens / 1000) * API_COSTS.gpt4oMini.output
  return inputCost + outputCost
}

export function calculateTTSCost(characters: number): number {
  return (characters / 1000) * API_COSTS.tts
}

export function logApiCost(service: string, cost: number): void {
  console.log(`💰 ${service} cost: $${cost.toFixed(5)}`)
}
```

### 3. Create Translation Prompts

#### Translation Prompts (src/services/openai/prompts.ts)
```typescript
export interface TranslationContext {
  fromLang: string
  toLang: string
  fromLangFull: string
  toLangFull: string
  recentMessages: Array<{ role: 'user' | 'assistant', content: string }>
  mode: 'casual' | 'fun'
}

export function buildTranslationPrompt(context: TranslationContext): string {
  const { fromLang, toLang, fromLangFull, toLangFull, recentMessages, mode } = context
  
  // Build context info from recent messages
  const contextInfo = recentMessages.length > 0
    ? `RECENT CONTEXT:\n${recentMessages.map(m => `${m.role}: ${m.content}`).join('\n')}\n`
    : ''

  if (mode === 'casual') {
    return `You are a TRANSLATOR ONLY. NEVER reply or respond - only translate from ${fromLangFull} to ${toLangFull}.

CRITICAL: DO NOT RESPOND TO CONTENT - ONLY TRANSLATE IT
❌ WRONG: If input is "How are you?" don't output "I'm good, how are you?"
✅ CORRECT: Translate "How are you?" to "¿Cómo estás?"
❌ WRONG: If input is "¿Cómo estás?" don't output "Estoy bien, ¿y tú?"
✅ CORRECT: Translate "¿Cómo estás?" to "How are you?"

CONTEXT: Real-time speech with STT errors. TRANSLATING: ${fromLangFull} → ${toLangFull}

TRANSLATION PROCESS:
1. Fix STT errors (punctuation, homophones, grammar)
2. Translate the corrected text from ${fromLangFull} to ${toLangFull}
3. Use informal conversational language${toLang === 'es' ? ' (tú, not usted)' : toLang === 'pt' ? ' (você, informal tone)' : ''}
4. ${toLang === 'en' ? 'Use British English for English translations' : toLang === 'es' ? 'Use natural Spanish expressions' : 'Use natural Portuguese expressions'}

STT ERROR EXAMPLES FOR ${fromLangFull.toUpperCase()}:
${fromLang === 'en' 
  ? toLang === 'es'
    ? \`- "lets eat grandma" → "let's eat, grandma" → "vamos a comer, abuela"
- "how r u" → "how are you" → "¿cómo estás?"
- "i cant wait" → "I can't wait" → "No puedo esperar"\`
    : \`- "lets eat grandma" → "let's eat, grandma" → "vamos comer, vovó"
- "how r u" → "how are you" → "como você está?"
- "i cant wait" → "I can't wait" → "Não posso esperar"\`
  : fromLang === 'es'
    ? \`- "como estas" → "¿cómo estás?" → "How are you?"
- "no se" → "no sé" → "I don't know"
- "q haces" → "¿qué haces?" → "What are you doing?"\`
    : \`- "como voce esta" → "Como você está?" → "How are you?"
- "nao sei" → "Não sei" → "I don't know"
- "que faz" → "Que faz?" → "What are you doing?"\`}

STYLE:
- Match speaker's tone and energy
${toLang === 'en' 
  ? \`- UK English: "brilliant", "fancy", "keen"
- Keep casual speech patterns natural\`
  : toLang === 'es'
    ? \`- Natural Spanish: "genial", "qué tal", "vale"
- Keep casual speech patterns natural\`
    : \`- Natural Portuguese: "legal", "que tal", "beleza"
- Keep casual speech patterns natural\`}

${contextInfo}

TRANSLATE ONLY - DO NOT REPLY OR RESPOND.`
  }

  // Fun mode
  return `You are a TRANSLATOR ONLY. NEVER reply or respond - only translate from ${fromLangFull} to ${toLangFull}.

CRITICAL: DO NOT RESPOND TO CONTENT - ONLY TRANSLATE IT
❌ WRONG: If input is "How are you?" don't output "I'm good, how are you?"
✅ CORRECT: Translate "How are you?" to "¿Cómo estás?"
❌ WRONG: If input is "¿Cómo estás?" don't output "Estoy bien, ¿y tú?"
✅ CORRECT: Translate "¿Cómo estás?" to "How are you?"

CONTEXT: Fun mode - real-time speech with emoji enhancement. TRANSLATING: ${fromLangFull} → ${toLangFull}

TRANSLATION PROCESS:
1. Fix STT errors (missing punctuation, homophones, grammar)
2. Translate the corrected text from ${fromLangFull} to ${toLangFull}
3. Add appropriate emojis to enhance meaning and context
4. If conversation context suggests romance/dating, preserve that tone naturally
5. Use informal, fun language${toLang === 'es' ? ' (tú, never usted)' : toLang === 'pt' ? ' (você, informal tone)' : ''}

EMOJI GUIDELINES:
- Use emojis SPARINGLY and CONTEXTUALLY - maximum 1 per message, often none
- Add emojis for SPECIFIC nouns when relevant: coffee ☕, beach 🏖️, food 🍕, weather ☀️🌧️
- For EMOTIONS: love/affection ❤️💕, excitement 🎉, sadness 😢, flirty 😏😉
- For ROMANTIC/FLIRTY content: subtle winks 😉, smirks 😏, hearts ❤️💕, kisses 💋
- NEVER use generic 😊 for basic greetings, questions, or neutral responses  
- NO emojis for simple pleasantries, directions, or factual statements
- Focus on meaningful enhancement, not decoration

STT ERROR EXAMPLES FOR ${fromLangFull.toUpperCase()}:
${fromLang === 'en' 
  ? toLang === 'es' 
    ? \`- "i miss you to" → "I miss you too" → "Te extraño 💕 también"
- "your beautiful" → "you're beautiful" → "Eres hermosa"
- "how r u" → "how are you" → "¿Cómo estás hoy?"
- "want some coffee" → "Want some coffee?" → "¿Quieres café ☕?"
- "going to beach" → "Going to the beach" → "Voy a la playa 🏖️"\`
    : \`- "i miss you to" → "I miss you too" → "Sinto sua falta 💕 também"
- "your beautiful" → "you're beautiful" → "Você é linda"
- "how r u" → "how are you" → "Como você está hoje?"
- "want some coffee" → "Want some coffee?" → "Quer café ☕?"
- "going to beach" → "Going to the beach" → "Vou à praia 🏖️"\`
  : fromLang === 'es'
    ? \`- "como estas" → "¿cómo estás?" → "How are you doing?"
- "te amo mucho" → "Te amo mucho" → "I love you ❤️ so much"
- "q tal" → "¿qué tal?" → "How's it going today?"
- "quiero cafe" → "Quiero café" → "I want coffee ☕"
- "vamos a la playa" → "Vamos a la playa" → "Let's go to the beach 🏖️"\`
    : \`- "como voce esta" → "Como você está?" → "How are you doing?"
- "te amo muito" → "Te amo muito" → "I love you ❤️ so much"
- "que tal" → "Que tal?" → "How's it going today?"
- "quero cafe" → "Quero café" → "I want coffee ☕"
- "vamos a praia" → "Vamos à praia" → "Let's go to the beach 🏖️"\`}

ROMANTIC CONTEXT DETECTION:
- Look for romantic keywords in recent conversation: love, miss, beautiful, date, kiss, etc.
- If detected, use romantic emojis sparingly: 💕❤️😍💋🌹 (max 1 per message)
- If no romantic context, avoid emojis unless truly meaningful
- Never use generic emojis like 😊 for neutral conversation

${contextInfo}

TRANSLATE ONLY - DO NOT REPLY OR RESPOND.`
}

// Language configurations
export const SUPPORTED_LANGUAGES = {
  en: { name: 'English', native: 'English', tts: 'alloy' },
  es: { name: 'Spanish', native: 'español', tts: 'nova' },
  pt: { name: 'Portuguese', native: 'português', tts: 'nova' },
} as const

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES
```

### 4. Create Whisper Service

#### Whisper Service (src/services/openai/whisper.ts)
```typescript
import { openai, calculateWhisperCost, logApiCost } from '@/lib/openai'
import { AudioService } from '@/services/audio/AudioService'

export interface WhisperResponse {
  text: string
  language: string
  duration: number
  segments?: Array<{
    text: string
    start: number
    end: number
  }>
}

export class WhisperService {
  /**
   * Transcribe audio using Whisper API
   */
  static async transcribeAudio(
    audioBlob: Blob,
    contextPrompt?: string
  ): Promise<WhisperResponse> {
    const startTime = Date.now()
    
    try {
      // Convert blob to File
      const audioFile = AudioService.blobToFile(audioBlob)
      
      // Get audio duration for cost calculation
      const duration = await AudioService.getAudioDuration(audioBlob)
      
      // Call Whisper API with verbose_json for language detection
      const response = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        response_format: 'verbose_json',
        prompt: contextPrompt,
        temperature: 0,
      })
      
      // Calculate and log cost
      const cost = calculateWhisperCost(duration)
      logApiCost('Whisper', cost)
      
      // Log performance
      console.log(`⚡ Whisper API: ${Date.now() - startTime}ms`)
      
      return {
        text: response.text,
        language: response.language || 'unknown',
        duration,
        segments: response.segments,
      }
    } catch (error) {
      console.error('Whisper transcription error:', error)
      throw new Error('Failed to transcribe audio')
    }
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
}
```

### 5. Create Translation Service

#### Translation Service (src/services/openai/translation.ts)
```typescript
import { openai, calculateGPTCost, logApiCost } from '@/lib/openai'
import { buildTranslationPrompt, TranslationContext } from './prompts'

export interface TranslationResponse {
  translation: string
  inputTokens: number
  outputTokens: number
}

export class TranslationService {
  /**
   * Translate text using GPT-4o-mini
   */
  static async translateText(
    text: string,
    context: TranslationContext
  ): Promise<TranslationResponse> {
    const startTime = Date.now()
    
    try {
      // Build system prompt
      const systemPrompt = buildTranslationPrompt(context)
      
      // Call GPT-4o-mini
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        stream: false, // We'll handle streaming in a separate method
      })
      
      const translation = completion.choices[0].message.content || ''
      const usage = completion.usage || { prompt_tokens: 0, completion_tokens: 0 }
      
      // Calculate and log cost
      const cost = calculateGPTCost(usage.prompt_tokens, usage.completion_tokens)
      logApiCost('GPT-4o-mini', cost)
      
      // Log performance
      console.log(`⚡ Translation API: ${Date.now() - startTime}ms`)
      
      return {
        translation,
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
      }
    } catch (error) {
      console.error('Translation error:', error)
      throw new Error('Failed to translate text')
    }
  }

  /**
   * Translate text with streaming response
   */
  static async translateTextStream(
    text: string,
    context: TranslationContext,
    onChunk: (chunk: string) => void
  ): Promise<TranslationResponse> {
    const startTime = Date.now()
    let fullTranslation = ''
    
    try {
      const systemPrompt = buildTranslationPrompt(context)
      
      const stream = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        stream: true,
      })
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || ''
        if (content) {
          fullTranslation += content
          onChunk(content)
        }
      }
      
      // Estimate tokens for cost calculation
      const estimatedInputTokens = Math.ceil((systemPrompt.length + text.length) / 4)
      const estimatedOutputTokens = Math.ceil(fullTranslation.length / 4)
      
      const cost = calculateGPTCost(estimatedInputTokens, estimatedOutputTokens)
      logApiCost('GPT-4o-mini (stream)', cost)
      
      console.log(`⚡ Translation API (stream): ${Date.now() - startTime}ms`)
      
      return {
        translation: fullTranslation,
        inputTokens: estimatedInputTokens,
        outputTokens: estimatedOutputTokens,
      }
    } catch (error) {
      console.error('Translation stream error:', error)
      throw new Error('Failed to translate text')
    }
  }
}
```

### 6. Create Text-to-Speech Service

#### TTS Service (src/services/openai/tts.ts)
```typescript
import { openai, calculateTTSCost, logApiCost } from '@/lib/openai'
import { SUPPORTED_LANGUAGES, SupportedLanguage } from './prompts'

export interface TTSOptions {
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
  speed?: number
}

export class TTSService {
  /**
   * Convert text to speech
   */
  static async textToSpeech(
    text: string,
    language: SupportedLanguage,
    options: TTSOptions = {}
  ): Promise<Blob> {
    const startTime = Date.now()
    
    try {
      // Get voice for language
      const voice = options.voice || SUPPORTED_LANGUAGES[language].tts
      
      // Call TTS API
      const response = await openai.audio.speech.create({
        model: 'tts-1',
        voice: voice as any,
        input: text,
        speed: options.speed || 1.0,
      })
      
      // Convert response to blob
      const audioBlob = await response.blob()
      
      // Calculate and log cost
      const cost = calculateTTSCost(text.length)
      logApiCost('TTS', cost)
      
      // Log performance
      console.log(`⚡ TTS API: ${Date.now() - startTime}ms`)
      
      return audioBlob
    } catch (error) {
      console.error('TTS error:', error)
      throw new Error('Failed to generate speech')
    }
  }

  /**
   * Stream text to speech (for future implementation)
   */
  static async textToSpeechStream(
    text: string,
    language: SupportedLanguage,
    onChunk: (chunk: ArrayBuffer) => void,
    options: TTSOptions = {}
  ): Promise<void> {
    // Note: OpenAI TTS doesn't support streaming yet
    // This is a placeholder for future implementation
    const blob = await this.textToSpeech(text, language, options)
    const buffer = await blob.arrayBuffer()
    onChunk(buffer)
  }
}
```

### 7. Create Translation Pipeline

#### Translation Pipeline (src/services/openai/TranslationPipeline.ts)
```typescript
import { WhisperService } from './whisper'
import { TranslationService } from './translation'
import { TTSService } from './tts'
import { MessageService, ActivityService } from '@/services/supabase'
import type { PerformanceMetrics } from '@/types/database'
import type { SupportedLanguage } from './prompts'

export interface TranslationPipelineOptions {
  sessionId: string
  userId: string
  audioBlob: Blob
  sourceLang: SupportedLanguage
  targetLang: SupportedLanguage
  recentMessages: Array<{ role: 'user' | 'assistant', content: string }>
  mode: 'casual' | 'fun'
  enableTTS?: boolean
}

export class TranslationPipeline {
  /**
   * Complete translation pipeline: Audio -> Text -> Translation -> TTS
   */
  static async processAudioTranslation(
    options: TranslationPipelineOptions
  ): Promise<void> {
    const {
      sessionId,
      userId,
      audioBlob,
      sourceLang,
      targetLang,
      recentMessages,
      mode,
      enableTTS = true,
    } = options
    
    const metrics: PerformanceMetrics = {
      audioRecordingStart: Date.now(),
      audioRecordingEnd: Date.now(),
      whisperRequestStart: 0,
      whisperResponseEnd: 0,
      translationRequestStart: 0,
      translationResponseEnd: 0,
      messageDeliveryTime: 0,
      totalEndToEndTime: 0,
    }
    
    try {
      // Update activity to processing
      await ActivityService.updateActivity(sessionId, userId, 'processing')
      
      // Step 1: Transcribe audio
      metrics.whisperRequestStart = Date.now()
      const contextPrompt = WhisperService.buildContextPrompt(
        recentMessages.map(m => m.content)
      )
      const whisperResponse = await WhisperService.transcribeAudio(
        audioBlob,
        contextPrompt
      )
      metrics.whisperResponseEnd = Date.now()
      
      if (!whisperResponse.text.trim()) {
        throw new Error('No speech detected')
      }
      
      // Create message in queued state
      const message = await MessageService.createMessage(
        sessionId,
        userId,
        whisperResponse.text,
        sourceLang,
        targetLang
      )
      
      // Step 2: Translate text
      metrics.translationRequestStart = Date.now()
      const translationResponse = await TranslationService.translateText(
        whisperResponse.text,
        {
          fromLang: sourceLang,
          toLang: targetLang,
          fromLangFull: this.getFullLanguageName(sourceLang),
          toLangFull: this.getFullLanguageName(targetLang),
          recentMessages,
          mode,
        }
      )
      metrics.translationResponseEnd = Date.now()
      
      // Update message with translation
      await MessageService.updateMessageTranslation(
        message.id,
        translationResponse.translation,
        metrics
      )
      
      // Step 3: Generate TTS (optional)
      if (enableTTS) {
        const ttsBlob = await TTSService.textToSpeech(
          translationResponse.translation,
          targetLang
        )
        
        // TODO: Play or store TTS audio
        console.log('TTS generated:', ttsBlob.size, 'bytes')
      }
      
      // Calculate total time
      metrics.messageDeliveryTime = Date.now()
      metrics.totalEndToEndTime = metrics.messageDeliveryTime - metrics.audioRecordingStart
      
      // Log complete performance metrics
      this.logPerformanceMetrics(metrics)
      
      // Update activity to idle
      await ActivityService.updateActivity(sessionId, userId, 'idle')
      
    } catch (error) {
      console.error('Translation pipeline error:', error)
      await ActivityService.updateActivity(sessionId, userId, 'idle')
      throw error
    }
  }
  
  /**
   * Get full language name
   */
  private static getFullLanguageName(lang: SupportedLanguage): string {
    const names: Record<SupportedLanguage, string> = {
      en: 'English',
      es: 'Spanish',
      pt: 'Portuguese',
    }
    return names[lang]
  }
  
  /**
   * Log performance metrics
   */
  private static logPerformanceMetrics(metrics: PerformanceMetrics): void {
    console.log('📊 Performance Metrics:')
    console.log(`- Audio Recording: ${metrics.audioRecordingEnd - metrics.audioRecordingStart}ms`)
    console.log(`- Whisper API: ${metrics.whisperResponseEnd - metrics.whisperRequestStart}ms`)
    console.log(`- Translation: ${metrics.translationResponseEnd - metrics.translationRequestStart}ms`)
    console.log(`- Delivery: ${metrics.messageDeliveryTime - metrics.translationResponseEnd}ms`)
    console.log(`- Total: ${metrics.totalEndToEndTime}ms`)
    
    // Check against targets
    if (metrics.totalEndToEndTime > 2000) {
      console.warn('⚠️ Total time exceeded 2s target')
    }
  }
}
```

### 8. Update Recording Controls to Use Pipeline

#### Updated Recording Controls (partial)
```typescript
// Add to RecordingControls.tsx after recording completes

import { TranslationPipeline } from '@/services/openai/TranslationPipeline'

// Inside handlePointerUp or handleForceStop:
if (blob) {
  try {
    await TranslationPipeline.processAudioTranslation({
      sessionId: session.id,
      userId,
      audioBlob: blob,
      sourceLang: isLeft ? 'en' : 'es', // Simplified - should be dynamic
      targetLang: isLeft ? 'es' : 'en',
      recentMessages: [], // TODO: Get from message history
      mode: 'casual', // TODO: Get from user settings
      enableTTS: true,
    })
  } catch (error) {
    console.error('Translation failed:', error)
    // Show error to user
  }
}
```

## Tests

### Test 1: Whisper Service
```typescript
// tests/services/openai/whisper.test.ts
import { WhisperService } from '@/services/openai/whisper'

describe('WhisperService', () => {
  test('builds context prompt correctly', () => {
    const messages = ['Hello', 'How are you?', 'I am fine']
    const prompt = WhisperService.buildContextPrompt(messages)
    expect(prompt).toContain('How are you?')
    expect(prompt.length).toBeLessThanOrEqual(200)
  })
  
  test('detects language correctly', () => {
    expect(WhisperService.detectLanguage('english')).toBe('en')
    expect(WhisperService.detectLanguage('spanish')).toBe('es')
    expect(WhisperService.detectLanguage('portuguese')).toBe('pt')
  })
})
```

### Test 2: Translation Prompts
```typescript
// tests/services/openai/prompts.test.ts
import { buildTranslationPrompt } from '@/services/openai/prompts'

describe('Translation Prompts', () => {
  test('builds casual mode prompt', () => {
    const prompt = buildTranslationPrompt({
      fromLang: 'en',
      toLang: 'es',
      fromLangFull: 'English',
      toLangFull: 'Spanish',
      recentMessages: [],
      mode: 'casual',
    })
    
    expect(prompt).toContain('TRANSLATOR ONLY')
    expect(prompt).toContain('English → Spanish')
    expect(prompt).toContain('tú, not usted')
  })
  
  test('includes emoji guidelines in fun mode', () => {
    const prompt = buildTranslationPrompt({
      fromLang: 'en',
      toLang: 'es',
      fromLangFull: 'English',
      toLangFull: 'Spanish',
      recentMessages: [],
      mode: 'fun',
    })
    
    expect(prompt).toContain('EMOJI GUIDELINES')
    expect(prompt).toContain('SPARINGLY')
  })
})
```

### Test 3: Cost Calculations
```typescript
// tests/lib/openai.test.ts
import { calculateWhisperCost, calculateGPTCost, calculateTTSCost } from '@/lib/openai'

describe('OpenAI Cost Calculations', () => {
  test('calculates Whisper cost correctly', () => {
    expect(calculateWhisperCost(30)).toBe(0.006) // 30s = 1 min
    expect(calculateWhisperCost(90)).toBe(0.012) // 90s = 2 min (rounded up)
  })
  
  test('calculates GPT cost correctly', () => {
    const cost = calculateGPTCost(1000, 500)
    expect(cost).toBeCloseTo(0.00015 + 0.0003, 5)
  })
  
  test('calculates TTS cost correctly', () => {
    expect(calculateTTSCost(1000)).toBe(0.015)
  })
})
```

### Manual Test Checklist
- [ ] Audio transcription works correctly
- [ ] Language detection accurate
- [ ] Translation preserves meaning
- [ ] Casual mode uses informal language
- [ ] Fun mode adds appropriate emojis
- [ ] TTS generates clear audio
- [ ] Costs logged correctly
- [ ] Performance metrics tracked
- [ ] Error handling works
- [ ] Activity status updates

## Refactoring Checklist
- [ ] Implement retry logic for API calls
- [ ] Add request queuing for rate limits
- [ ] Cache common translations
- [ ] Implement fallback models
- [ ] Add translation quality scoring
- [ ] Create cost budget tracking
- [ ] Add API response validation

## Success Criteria
- [ ] Whisper transcribes accurately
- [ ] Translations follow PRD prompts exactly
- [ ] TTS produces natural speech
- [ ] End-to-end under 2 seconds
- [ ] Costs tracked per request
- [ ] Streaming responses work
- [ ] Error messages helpful
- [ ] Language detection reliable

## Common Issues & Solutions

### Issue: API rate limits
**Solution**: Implement exponential backoff and request queuing

### Issue: High latency
**Solution**: Use streaming responses, optimize prompt size

### Issue: Incorrect language detection
**Solution**: Add language hints from session context

### Issue: Poor transcription quality
**Solution**: Provide context prompt, handle audio quality

## Performance Considerations
- Stream responses when possible
- Batch API calls efficiently
- Cache frequent translations
- Minimize prompt sizes
- Use appropriate temperature settings
- Monitor token usage

## Security Notes
- API key stored securely in env
- No logging of personal content
- Validate all API responses
- Handle API errors gracefully
- Implement rate limiting client-side

## Next Steps
- Phase 5: Build message system with real-time updates
- Implement message queue
- Add status indicators
- Handle message ordering