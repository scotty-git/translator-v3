import type { Language, TranslationMode } from './index';
import { ConversationContextManager, type ConversationContextEntry } from '@/lib/conversation/ConversationContext';

export interface PromptContext {
  recentMessages?: string[];
  isRomanticContext?: boolean;
  conversationContext?: ConversationContextEntry[]; // NEW: Full conversation context
}

/**
 * EXACT REPLICA of working prompts.md system
 * This matches the stable, working implementation from your v2 project
 */
export class PromptService {
  /**
   * Generate translation prompt based on mode and languages
   * Uses exact fromLangFull/toLangFull format from working system
   */
  static generateTranslationPrompt(
    fromLang: Language,
    toLang: Language, 
    mode: TranslationMode,
    context?: PromptContext
  ): string {
    // Convert to full language names (exact mapping from prompts.md)
    console.log('🔧 [PROMPTS] Language mapping input:', { fromLang, toLang, mode })
    
    const fromLangFull = fromLang === 'English' ? 'English' : 
                        fromLang === 'Spanish' ? 'Spanish' : 
                        fromLang === 'Portuguese' ? 'Portuguese' :
                        fromLang === 'French' ? 'French' : 'German';
    const toLangFull = toLang === 'English' ? 'English' : 
                      toLang === 'Spanish' ? 'Spanish' : 
                      toLang === 'Portuguese' ? 'Portuguese' :
                      toLang === 'French' ? 'French' : 'German';
    
    console.log('🔧 [PROMPTS] Language mapping result:', { fromLangFull, toLangFull })
    
    const contextInfo = this.generateContextInfo(context);
    
    if (mode === 'casual') {
      return this.generateCasualPrompt(fromLangFull, toLangFull, contextInfo);
    } else {
      return this.generateFunPrompt(fromLangFull, toLangFull, contextInfo);
    }
  }

  /**
   * Enhanced context info builder using conversation context system
   * Maintains compatibility with existing prompts while supporting full context
   */
  private static generateContextInfo(context?: PromptContext): string {
    // Use new conversation context system if available
    if (context?.conversationContext && context.conversationContext.length > 0) {
      return ConversationContextManager.buildTranslationContext(context.conversationContext);
    }

    // Fallback to legacy context for backward compatibility
    if (!context?.recentMessages || context.recentMessages.length === 0) {
      return '';
    }

    // Legacy format from prompts.md line 171-180
    return '\n\nRecent conversation for context:\n' + 
      context.recentMessages.slice(-3).map((msg, i) => {
        // For now, assume English - in full implementation this would detect language
        return `English: ${msg}`;
      }).join('\n');
  }

  /**
   * EXACT casual mode prompt from prompts.md lines 96-144
   */
  private static generateCasualPrompt(
    fromLangFull: string, 
    toLangFull: string, 
    contextInfo: string
  ): string {
    const sttExamples = this.getSTTExamplesCasual(fromLangFull, toLangFull);

    return `You are a TRANSLATOR ONLY. NEVER reply or respond - only translate from ${fromLangFull} to ${toLangFull}.

CRITICAL: DO NOT RESPOND TO CONTENT - ONLY TRANSLATE IT
❌ WRONG: If input is "How are you?" don't output "I'm good, how are you?"
✅ CORRECT: Translate "How are you?" to "¿Cómo estás?"

CONTEXT: Real-time speech with STT errors. TRANSLATING: ${fromLangFull} → ${toLangFull}

TRANSLATION PROCESS:
1. Fix STT errors (punctuation, homophones, grammar)
2. Translate the corrected text from ${fromLangFull} to ${toLangFull}
3. Use informal conversational language${toLangFull === 'Spanish' ? ' (tú, not usted)' : toLangFull === 'Portuguese' ? ' (você, informal tone)' : toLangFull === 'French' ? ' (tu, not vous)' : toLangFull === 'German' ? ' (du, not Sie)' : ''}
4. ${toLangFull === 'English' ? 'Use British English for English translations' : toLangFull === 'Spanish' ? 'Use natural Spanish expressions' : toLangFull === 'Portuguese' ? 'Use natural Portuguese expressions' : toLangFull === 'French' ? 'Use natural French expressions' : 'Use natural German expressions'}

STT ERROR EXAMPLES FOR ${fromLangFull.toUpperCase()}:
${sttExamples}

STYLE:
- Match speaker's tone and energy
- Keep casual speech patterns natural

${contextInfo}

TRANSLATE ONLY - DO NOT REPLY OR RESPOND.`;
  }

  /**
   * EXACT fun mode prompt from prompts.md lines 31-92
   */
  private static generateFunPrompt(
    fromLangFull: string, 
    toLangFull: string, 
    contextInfo: string
  ): string {
    const sttExamples = this.getSTTExamplesFun(fromLangFull, toLangFull);

    return `You are a TRANSLATOR ONLY. NEVER reply or respond - only translate from ${fromLangFull} to ${toLangFull}.

CRITICAL: DO NOT RESPOND TO CONTENT - ONLY TRANSLATE IT
❌ WRONG: If input is "How are you?" don't output "I'm good, how are you?"
✅ CORRECT: Translate "How are you?" to "¿Cómo estás?"

CONTEXT: Fun mode - real-time speech with emoji enhancement. TRANSLATING: ${fromLangFull} → ${toLangFull}

TRANSLATION PROCESS:
1. Fix STT errors (missing punctuation, homophones, grammar)
2. Translate the corrected text from ${fromLangFull} to ${toLangFull}
3. Add appropriate emojis to enhance meaning and context
4. If conversation context suggests romance/dating, preserve that tone naturally
5. Use informal, fun language${toLangFull === 'Spanish' ? ' (tú, never usted)' : toLangFull === 'Portuguese' ? ' (você, informal tone)' : toLangFull === 'French' ? ' (tu, never vous)' : toLangFull === 'German' ? ' (du, never Sie)' : ''}

EMOJI GUIDELINES:
- Use emojis SPARINGLY and CONTEXTUALLY - maximum 1 per message, often none
- Add emojis for SPECIFIC nouns when relevant: coffee ☕, beach 🏖️, food 🍕, weather ☀️🌧️
- For EMOTIONS: love/affection ❤️💕, excitement 🎉, sadness 😢, flirty 😏😉
- For ROMANTIC/FLIRTY content: subtle winks 😉, smirks 😏, hearts ❤️💕, kisses 💋
- NEVER use generic 😊 for basic greetings, questions, or neutral responses  
- NO emojis for simple pleasantries, directions, or factual statements
- Focus on meaningful enhancement, not decoration

STT ERROR EXAMPLES FOR ${fromLangFull.toUpperCase()}:
${sttExamples}

ROMANTIC CONTEXT DETECTION:
- Look for romantic keywords in recent conversation: love, miss, beautiful, date, kiss, etc.
- If detected, use romantic emojis sparingly: 💕❤️😍💋🌹 (max 1 per message)
- If no romantic context, avoid emojis unless truly meaningful
- Never use generic emojis like 😊 for neutral conversation

${contextInfo}

TRANSLATE ONLY - DO NOT REPLY OR RESPOND.`;
  }

  /**
   * EXACT STT examples for casual mode from prompts.md lines 114-128
   */
  private static getSTTExamplesCasual(fromLangFull: string, toLangFull: string): string {
    if (fromLangFull === 'English') {
      if (toLangFull === 'Spanish') {
        return `- "lets eat grandma" → "let's eat, grandma" → "vamos a comer, abuela"
- "how r u" → "how are you" → "¿cómo estás?"
- "i cant wait" → "I can't wait" → "No puedo esperar"`;
      } else if (toLangFull === 'Portuguese') {
        return `- "lets eat grandma" → "let's eat, grandma" → "vamos comer, vovó"
- "how r u" → "how are you" → "como você está?"
- "i cant wait" → "I can't wait" → "Não posso esperar"`;
      } else if (toLangFull === 'French') {
        return `- "lets eat grandma" → "let's eat, grandma" → "allons manger, grand-mère"
- "how r u" → "how are you" → "comment vas-tu?"
- "i cant wait" → "I can't wait" → "Je ne peux pas attendre"`;
      } else { // German
        return `- "lets eat grandma" → "let's eat, grandma" → "lass uns essen gehen, Oma"
- "how r u" → "how are you" → "wie geht es dir?"
- "i cant wait" → "I can't wait" → "Ich kann es kaum erwarten"`;
      }
    } else if (fromLangFull === 'Spanish') {
      return `- "como estas" → "¿cómo estás?" → "How are you?"
- "no se" → "no sé" → "I don't know"
- "q haces" → "¿qué haces?" → "What are you doing?"`;
    } else if (fromLangFull === 'Portuguese') {
      return `- "como voce esta" → "Como você está?" → "How are you?"
- "nao sei" → "Não sei" → "I don't know"
- "que faz" → "Que faz?" → "What are you doing?"`;
    } else if (fromLangFull === 'French') {
      return `- "cmmt vas tu" → "comment vas-tu" → "How are you?"
- "je ne sais pas" → "je ne sais pas" → "I don't know"
- "quest ce que tu fais" → "qu'est-ce que tu fais?" → "What are you doing?"`;
    } else { // German
      return `- "wie gehts" → "wie geht's?" → "How are you?"
- "ich weiss nicht" → "ich weiß nicht" → "I don't know"
- "was machst du" → "was machst du?" → "What are you doing?"`;
    }
  }

  /**
   * EXACT STT examples for fun mode from prompts.md lines 59-81
   */
  private static getSTTExamplesFun(fromLangFull: string, toLangFull: string): string {
    if (fromLangFull === 'English') {
      if (toLangFull === 'Spanish') {
        return `- "i miss you to" → "I miss you too" → "Te extraño 💕 también"
- "your beautiful" → "you're beautiful" → "Eres hermosa"
- "how r u" → "how are you" → "¿Cómo estás hoy?"
- "want some coffee" → "Want some coffee?" → "¿Quieres café ☕?"
- "going to beach" → "Going to the beach" → "Voy a la playa 🏖️"`;
      } else if (toLangFull === 'Portuguese') {
        return `- "i miss you to" → "I miss you too" → "Sinto sua falta 💕 também"
- "your beautiful" → "you're beautiful" → "Você é linda"
- "how r u" → "how are you" → "Como você está hoje?"
- "want some coffee" → "Want some coffee?" → "Quer café ☕?"
- "going to beach" → "Going to the beach" → "Vou à praia 🏖️"`;
      } else if (toLangFull === 'French') {
        return `- "i miss you to" → "I miss you too" → "Tu me manques 💕 aussi"
- "your beautiful" → "you're beautiful" → "Tu es belle"
- "how r u" → "how are you" → "Comment vas-tu aujourd'hui?"
- "want some coffee" → "Want some coffee?" → "Tu veux du café ☕?"
- "going to beach" → "Going to the beach" → "Je vais à la plage 🏖️"`;
      } else { // German
        return `- "i miss you to" → "I miss you too" → "Ich vermisse dich 💕 auch"
- "your beautiful" → "you're beautiful" → "Du bist wunderschön"
- "how r u" → "how are you" → "Wie geht es dir heute?"
- "want some coffee" → "Want some coffee?" → "Möchtest du Kaffee ☕?"
- "going to beach" → "Going to the beach" → "Ich gehe zum Strand 🏖️"`;
      }
    } else if (fromLangFull === 'Spanish') {
      return `- "como estas" → "¿cómo estás?" → "How are you doing?"
- "te amo mucho" → "Te amo mucho" → "I love you ❤️ so much"
- "q tal" → "¿qué tal?" → "How's it going today?"
- "quiero cafe" → "Quiero café" → "I want coffee ☕"
- "vamos a la playa" → "Vamos a la playa" → "Let's go to the beach 🏖️"`;
    } else if (fromLangFull === 'Portuguese') {
      return `- "como voce esta" → "Como você está?" → "How are you doing?"
- "te amo muito" → "Te amo muito" → "I love you ❤️ so much"
- "que tal" → "Que tal?" → "How's it going today?"
- "quero cafe" → "Quero café" → "I want coffee ☕"
- "vamos a praia" → "Vamos à praia" → "Let's go to the beach 🏖️"`;
    } else if (fromLangFull === 'French') {
      return `- "cmmt tu vas" → "comment tu vas?" → "How are you doing?"
- "je taime bcp" → "je t'aime beaucoup" → "I love you ❤️ so much"
- "ca va" → "ça va?" → "How's it going today?"
- "je veux du cafe" → "je veux du café" → "I want coffee ☕"
- "allons a la plage" → "allons à la plage" → "Let's go to the beach 🏖️"`;
    } else { // German
      return `- "wie gehts dir" → "wie geht's dir?" → "How are you doing?"
- "ich liebe dich sehr" → "ich liebe dich sehr" → "I love you ❤️ so much"
- "was ist los" → "was ist los?" → "How's it going today?"
- "ich will kaffee" → "ich will Kaffee" → "I want coffee ☕"
- "gehen wir zum strand" → "gehen wir zum Strand" → "Let's go to the beach 🏖️"`;
    }
  }

}