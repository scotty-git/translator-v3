import { getOpenAIProxyClient } from '@/lib/openai-proxy'
import { calculateGPTCost, logApiCost } from '@/lib/openai'
import { WorkflowRetry } from '@/lib/retry-logic'
import { PromptService } from './prompts'
import type { Language, TranslationMode, TranslationResult } from './index'
import type { PromptContext } from './prompts'

export class SecureTranslationService {
  /**
   * Translate text using GPT-4o-mini via secure proxy
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
        console.log(`🔒 Calling GPT-4o-mini via secure proxy: ${fromLang} → ${toLang}`)

        const completion = await getOpenAIProxyClient().createChatCompletion({
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
        logApiCost('GPT-4o-mini (secure)', cost)
        
        // Log performance
        console.log(`⚡ Secure Translation API: ${Date.now() - startTime}ms`)

        return {
          originalText: text,
          translatedText,
          originalLanguage: fromLang,
          targetLanguage: toLang,
          inputTokens: usage.prompt_tokens,
          outputTokens: usage.completion_tokens,
        };
      } catch (error) {
        console.error('Secure translation error:', error);
        
        // Enhance error with retry information
        const enhancedError = error as any
        enhancedError.isNetworkError = true // Most translation failures are network-related
        
        throw enhancedError
      }
    }, (attempt, error) => {
      console.warn(`🔒 Secure translation retry attempt ${attempt}:`, error.message)
    })
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
}