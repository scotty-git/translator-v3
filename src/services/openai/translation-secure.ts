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
    
    console.log('🔥🔥🔥 [TRANSLATION-SECURE] STARTING TRANSLATION SERVICE 🔥🔥🔥')
    console.log('📊 Translation Parameters:')
    console.log('   • Input text:', `"${text}"`)
    console.log('   • From language:', fromLang, typeof fromLang)
    console.log('   • To language:', toLang, typeof toLang)
    console.log('   • Translation mode:', mode)
    console.log('   • Context provided:', !!context)
    if (context) {
      console.log('   • Recent messages:', context.recentMessages?.length || 0)
      console.log('   • Romantic context:', context.isRomanticContext)
      console.log('   • Conversation context:', context.conversationContext?.length || 0)
    }
    
    // Generate prompt once (not retried)
    console.log('⚡ Generating translation prompt...')
    const prompt = PromptService.generateTranslationPrompt(
      fromLang,
      toLang,
      mode,
      context
    );
    
    console.log('📝 Generated prompt length:', prompt.length, 'characters')
    console.log('📝 Generated prompt preview:')
    console.log('╔═══════════════════════════════════════════════════════════════════════════╗')
    console.log('║ PROMPT CONTENT (first 500 chars):')
    console.log('╠═══════════════════════════════════════════════════════════════════════════╣')
    console.log(prompt.substring(0, 500))
    if (prompt.length > 500) {
      console.log('...[TRUNCATED]...')
    }
    console.log('╚═══════════════════════════════════════════════════════════════════════════╝')

    // Wrap the translation API call with retry logic
    return WorkflowRetry.translation(async () => {
      try {
        console.log('')
        console.log('🔒🔒🔒 [API CALL] CALLING GPT-4o-mini VIA SECURE PROXY 🔒🔒🔒')
        console.log('🔄 Translation direction:', fromLang, '→', toLang)
        
        const requestPayload = {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: text }
          ],
          temperature: 0.3,
          max_tokens: 1000,
        }
        
        console.log('📤 Request payload:')
        console.log('   • Model:', requestPayload.model)
        console.log('   • Temperature:', requestPayload.temperature)
        console.log('   • Max tokens:', requestPayload.max_tokens)
        console.log('   • System message length:', requestPayload.messages[0].content.length)
        console.log('   • User message:', `"${requestPayload.messages[1].content}"`)
        
        console.log('⏳ Sending request to OpenAI proxy...')
        
        const completion = await getOpenAIProxyClient().createChatCompletion(requestPayload);

        console.log('')
        console.log('📥📥📥 [API RESPONSE] RECEIVED RESPONSE FROM OPENAI 📥📥📥')
        console.log('📊 Raw response structure:')
        console.log('   • Has choices:', !!completion.choices)
        console.log('   • Choices length:', completion.choices?.length || 0)
        console.log('   • Has usage:', !!completion.usage)
        
        if (completion.choices && completion.choices.length > 0) {
          console.log('   • First choice message:', completion.choices[0]?.message)
          console.log('   • First choice content:', `"${completion.choices[0]?.message?.content}"`)
        }
        
        const translatedText = completion.choices[0]?.message?.content?.trim();
        const usage = completion.usage || { prompt_tokens: 0, completion_tokens: 0 }
        
        console.log('🔍 Processing response:')
        console.log('   • Raw translated text:', `"${completion.choices[0]?.message?.content}"`)
        console.log('   • Trimmed translated text:', `"${translatedText}"`)
        console.log('   • Usage prompt tokens:', usage.prompt_tokens)
        console.log('   • Usage completion tokens:', usage.completion_tokens)
        
        if (!translatedText) {
          console.error('❌ No translation received from API!')
          throw new Error('No translation received from API');
        }

        // Calculate and log cost
        const cost = calculateGPTCost(usage.prompt_tokens, usage.completion_tokens)
        logApiCost('GPT-4o-mini (secure)', cost)
        
        // Log performance
        console.log(`⚡ Secure Translation API: ${Date.now() - startTime}ms`)
        
        console.log('')
        console.log('🎉🎉🎉 [SUCCESS] TRANSLATION COMPLETED SUCCESSFULLY 🎉🎉🎉')
        console.log('📝 Final result:')
        console.log('   • Original text:', `"${text}"`)
        console.log('   • Translated text:', `"${translatedText}"`)
        console.log('   • Original language:', fromLang)
        console.log('   • Target language:', toLang)
        console.log('   • Input tokens:', usage.prompt_tokens)
        console.log('   • Output tokens:', usage.completion_tokens)
        console.log('   • Total cost: $', cost.toFixed(6))
        console.log('🔥🔥🔥 [TRANSLATION-SECURE] ENDING TRANSLATION SERVICE 🔥🔥🔥')

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