import { getOpenAIClientWithAdaptiveTimeout, calculateGPTCost, logApiCost } from '@/lib/openai'
import { WorkflowRetry } from '@/lib/retry-logic'
import { PromptService } from './prompts'
import type { Language, TranslationMode, TranslationResult } from './index'
import type { PromptContext } from './prompts'

export class TranslationService {
  /**
   * Translate text using GPT-4o-mini with exact prompts from PRD
   */
  static async translate(
    text: string,
    fromLang: Language,
    toLang: Language,
    mode: TranslationMode = 'casual',
    context?: PromptContext
  ): Promise<TranslationResult & { inputTokens: number; outputTokens: number }> {
    const startTime = Date.now()
    
    // Generate prompt once (not retried)
    const prompt = PromptService.generateTranslationPrompt(
      fromLang,
      toLang,
      mode,
      context
    );

    // Wrap the translation API call with retry logic
    return WorkflowRetry.translation(async () => {
      try {
        console.log(`🌐 Calling GPT-4o-mini for translation: ${fromLang} → ${toLang}`)

        const completion = await getOpenAIClientWithAdaptiveTimeout().chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: text }
          ],
          temperature: 0.3,
          max_tokens: 1000,
        });

        const translatedText = completion.choices[0]?.message?.content?.trim();
        const usage = completion.usage || { prompt_tokens: 0, completion_tokens: 0 }
        
        if (!translatedText) {
          throw new Error('No translation received from API');
        }

        // Calculate and log cost
        const cost = calculateGPTCost(usage.prompt_tokens, usage.completion_tokens)
        logApiCost('GPT-4o-mini', cost)
        
        // Log performance
        console.log(`⚡ Translation API: ${Date.now() - startTime}ms`)

        return {
          originalText: text,
          translatedText,
          originalLanguage: fromLang,
          targetLanguage: toLang,
          inputTokens: usage.prompt_tokens,
          outputTokens: usage.completion_tokens,
        };
      } catch (error) {
        console.error('Translation error:', error);
        
        // Enhance error with retry information
        const enhancedError = error as any
        enhancedError.isNetworkError = true // Most translation failures are network-related
        
        throw enhancedError
      }
    }, (attempt, error) => {
      console.warn(`🌐 Translation retry attempt ${attempt}:`, error.message)
    })
  }

  /**
   * Translate text with streaming response
   */
  static async translateStream(
    text: string,
    fromLang: Language,
    toLang: Language,
    mode: TranslationMode = 'casual',
    context: PromptContext | undefined,
    onChunk: (chunk: string) => void
  ): Promise<TranslationResult & { inputTokens: number; outputTokens: number }> {
    const startTime = Date.now()
    let fullTranslation = ''
    
    try {
      const prompt = PromptService.generateTranslationPrompt(
        fromLang,
        toLang,
        mode,
        context
      );
      
      const stream = await getOpenAIClientWithAdaptiveTimeout().chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        messages: [
          { role: 'system', content: prompt },
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
      const estimatedInputTokens = Math.ceil((prompt.length + text.length) / 4)
      const estimatedOutputTokens = Math.ceil(fullTranslation.length / 4)
      
      const cost = calculateGPTCost(estimatedInputTokens, estimatedOutputTokens)
      logApiCost('GPT-4o-mini (stream)', cost)
      
      console.log(`⚡ Translation API (stream): ${Date.now() - startTime}ms`)
      
      return {
        originalText: text,
        translatedText: fullTranslation,
        originalLanguage: fromLang,
        targetLanguage: toLang,
        inputTokens: estimatedInputTokens,
        outputTokens: estimatedOutputTokens,
      }
    } catch (error) {
      console.error('Translation stream error:', error)
      throw new Error('Failed to translate text')
    }
  }

  /**
   * Detect if conversation has romantic context for emoji enhancement
   */
  static detectRomanticContext(recentMessages: string[]): boolean {
    const romanticKeywords = [
      'love', 'miss', 'beautiful', 'date', 'kiss', 'heart', 'darling',
      'honey', 'sweetheart', 'cute', 'sexy', 'gorgeous', 'handsome',
      'amor', 'te amo', 'hermosa', 'guapo', 'bonita', 'cariño',
      'amo', 'saudade', 'linda', 'lindo', 'querida', 'querido'
    ];

    const allText = recentMessages.join(' ').toLowerCase();
    return romanticKeywords.some(keyword => allText.includes(keyword));
  }

  /**
   * Get context for translation from recent conversation
   */
  static buildTranslationContext(recentMessages: string[]): PromptContext {
    return {
      recentMessages: recentMessages.slice(-5), // Last 5 messages
      isRomanticContext: this.detectRomanticContext(recentMessages)
    };
  }
}