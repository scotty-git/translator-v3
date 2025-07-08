import type { Language, TranslationMode } from './index';

export interface PromptContext {
  recentMessages?: string[];
  isRomanticContext?: boolean;
}

export class PromptService {
  /**
   * Generate translation prompt based on mode and languages
   */
  static generateTranslationPrompt(
    fromLang: Language,
    toLang: Language, 
    mode: TranslationMode,
    context?: PromptContext
  ): string {
    const contextInfo = this.generateContextInfo(context);
    
    if (mode === 'casual') {
      return this.generateCasualPrompt(fromLang, toLang, contextInfo);
    } else {
      return this.generateFunPrompt(fromLang, toLang, contextInfo);
    }
  }

  private static generateContextInfo(context?: PromptContext): string {
    if (!context?.recentMessages || context.recentMessages.length === 0) {
      return 'CONVERSATION START: No prior context.';
    }

    const recent = context.recentMessages
      .slice(-3) // Last 3 messages for context
      .map((msg, i) => `${i + 1}. ${msg}`)
      .join('\n');

    return `RECENT CONVERSATION:\n${recent}`;
  }

  private static generateCasualPrompt(
    fromLang: Language, 
    toLang: Language, 
    contextInfo: string
  ): string {
    const sttExamples = this.getSTTExamples(fromLang, toLang, 'casual');
    const styleNotes = this.getStyleNotes(toLang);

    return `You are a TRANSLATOR ONLY. NEVER reply or respond - only translate from ${fromLang} to ${toLang}.

CRITICAL: DO NOT RESPOND TO CONTENT - ONLY TRANSLATE IT
❌ WRONG: If input is "How are you?" don't output "I'm good, how are you?"
✅ CORRECT: Translate "How are you?" to "¿Cómo estás?"
❌ WRONG: If input is "¿Cómo estás?" don't output "Estoy bien, ¿y tú?"
✅ CORRECT: Translate "¿Cómo estás?" to "How are you?"

CONTEXT: Real-time speech with STT errors. TRANSLATING: ${fromLang} → ${toLang}

TRANSLATION PROCESS:
1. Fix STT errors (punctuation, homophones, grammar)
2. Translate the corrected text from ${fromLang} to ${toLang}
3. Use informal conversational language${toLang === 'Spanish' ? ' (tú, not usted)' : toLang === 'Portuguese' ? ' (você, informal tone)' : ''}
4. ${toLang === 'English' ? 'Use British English for English translations' : toLang === 'Spanish' ? 'Use natural Spanish expressions' : 'Use natural Portuguese expressions'}

STT ERROR EXAMPLES FOR ${fromLang.toUpperCase()}:
${sttExamples}

STYLE:
- Match speaker's tone and energy
${styleNotes}

${contextInfo}

TRANSLATE ONLY - DO NOT REPLY OR RESPOND.`;
  }

  private static generateFunPrompt(
    fromLang: Language, 
    toLang: Language, 
    contextInfo: string
  ): string {
    const sttExamples = this.getSTTExamples(fromLang, toLang, 'fun');
    const romanticGuidelines = this.getRomanticGuidelines();

    return `You are a TRANSLATOR ONLY. NEVER reply or respond - only translate from ${fromLang} to ${toLang}.

CRITICAL: DO NOT RESPOND TO CONTENT - ONLY TRANSLATE IT
❌ WRONG: If input is "How are you?" don't output "I'm good, how are you?"
✅ CORRECT: Translate "How are you?" to "¿Cómo estás?"
❌ WRONG: If input is "¿Cómo estás?" don't output "Estoy bien, ¿y tú?"
✅ CORRECT: Translate "¿Cómo estás?" to "How are you?"

CONTEXT: Fun mode - real-time speech with emoji enhancement. TRANSLATING: ${fromLang} → ${toLang}

TRANSLATION PROCESS:
1. Fix STT errors (missing punctuation, homophones, grammar)
2. Translate the corrected text from ${fromLang} to ${toLang}
3. Add appropriate emojis to enhance meaning and context
4. If conversation context suggests romance/dating, preserve that tone naturally
5. Use informal, fun language${toLang === 'Spanish' ? ' (tú, never usted)' : toLang === 'Portuguese' ? ' (você, informal tone)' : ''}

EMOJI GUIDELINES:
- Use emojis SPARINGLY and CONTEXTUALLY - maximum 1 per message, often none
- Add emojis for SPECIFIC nouns when relevant: coffee ☕, beach 🏖️, food 🍕, weather ☀️🌧️
- For EMOTIONS: love/affection ❤️💕, excitement 🎉, sadness 😢, flirty 😏😉
- For ROMANTIC/FLIRTY content: subtle winks 😉, smirks 😏, hearts ❤️💕, kisses 💋
- NEVER use generic 😊 for basic greetings, questions, or neutral responses  
- NO emojis for simple pleasantries, directions, or factual statements
- Focus on meaningful enhancement, not decoration

STT ERROR EXAMPLES FOR ${fromLang.toUpperCase()}:
${sttExamples}

${romanticGuidelines}

${contextInfo}

TRANSLATE ONLY - DO NOT REPLY OR RESPOND.`;
  }

  private static getSTTExamples(
    fromLang: Language, 
    toLang: Language, 
    mode: TranslationMode
  ): string {
    if (fromLang === 'English') {
      if (toLang === 'Spanish') {
        return mode === 'casual' 
          ? `- "lets eat grandma" → "let's eat, grandma" → "vamos a comer, abuela"
- "how r u" → "how are you" → "¿cómo estás?"
- "i cant wait" → "I can't wait" → "No puedo esperar"`
          : `- "i miss you to" → "I miss you too" → "Te extraño 💕 también"
- "your beautiful" → "you're beautiful" → "Eres hermosa"
- "how r u" → "how are you" → "¿Cómo estás hoy?"
- "want some coffee" → "Want some coffee?" → "¿Quieres café ☕?"
- "going to beach" → "Going to the beach" → "Voy a la playa 🏖️"`;
      } else { // Portuguese
        return mode === 'casual'
          ? `- "lets eat grandma" → "let's eat, grandma" → "vamos comer, vovó"
- "how r u" → "how are you" → "como você está?"
- "i cant wait" → "I can't wait" → "Não posso esperar"`
          : `- "i miss you to" → "I miss you too" → "Sinto sua falta 💕 também"
- "your beautiful" → "you're beautiful" → "Você é linda"
- "how r u" → "how are you" → "Como você está hoje?"
- "want some coffee" → "Want some coffee?" → "Quer café ☕?"
- "going to beach" → "Going to the beach" → "Vou à praia 🏖️"`;
      }
    } else if (fromLang === 'Spanish') {
      return mode === 'casual'
        ? `- "como estas" → "¿cómo estás?" → "How are you?"
- "no se" → "no sé" → "I don't know"
- "q haces" → "¿qué haces?" → "What are you doing?"`
        : `- "como estas" → "¿cómo estás?" → "How are you doing?"
- "te amo mucho" → "Te amo mucho" → "I love you ❤️ so much"
- "q tal" → "¿qué tal?" → "How's it going today?"
- "quiero cafe" → "Quiero café" → "I want coffee ☕"
- "vamos a la playa" → "Vamos a la playa" → "Let's go to the beach 🏖️"`;
    } else { // Portuguese
      return mode === 'casual'
        ? `- "como voce esta" → "Como você está?" → "How are you?"
- "nao sei" → "Não sei" → "I don't know"
- "que faz" → "Que faz?" → "What are you doing?"`
        : `- "como voce esta" → "Como você está?" → "How are you doing?"
- "te amo muito" → "Te amo muito" → "I love you ❤️ so much"
- "que tal" → "Que tal?" → "How's it going today?"
- "quero cafe" → "Quero café" → "I want coffee ☕"
- "vamos a praia" → "Vamos à praia" → "Let's go to the beach 🏖️"`;
    }
  }

  private static getStyleNotes(toLang: Language): string {
    if (toLang === 'English') {
      return `- UK English: "brilliant", "fancy", "keen"
- Keep casual speech patterns natural`;
    } else if (toLang === 'Spanish') {
      return `- Natural Spanish: "genial", "qué tal", "vale"
- Keep casual speech patterns natural`;
    } else {
      return `- Natural Portuguese: "legal", "que tal", "beleza"
- Keep casual speech patterns natural`;
    }
  }

  private static getRomanticGuidelines(): string {
    return `ROMANTIC CONTEXT DETECTION:
- Look for romantic keywords in recent conversation: love, miss, beautiful, date, kiss, etc.
- If detected, use romantic emojis sparingly: 💕❤️😍💋🌹 (max 1 per message)
- If no romantic context, avoid emojis unless truly meaningful
- Never use generic emojis like 😊 for neutral conversation`;
  }
}