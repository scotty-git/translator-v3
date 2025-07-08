/**
 * Conversation Context Management
 * Maintains rolling window of recent messages for improved STT and translation accuracy
 */

export interface ConversationContextEntry {
  text: string
  language: string
  timestamp: number
}

export class ConversationContextManager {
  private static readonly MAX_CONTEXT_MESSAGES = 6

  static {
    console.log('🔧 [ConversationContext] ConversationContextManager class loaded!')
  }

  /**
   * Add a new message to conversation context with rolling window
   */
  static addToContext(
    context: ConversationContextEntry[],
    originalText: string,
    detectedLanguage: string,
    timestamp: number = Date.now()
  ): ConversationContextEntry[] {
    console.log('═══════════════════════════════════════════════════════')
    console.log('📝 [ConversationContext] ADDING TO CONTEXT WINDOW')
    console.log('═══════════════════════════════════════════════════════')
    console.log('📊 Current context size BEFORE:', context.length)
    console.log('📊 Max context limit:', this.MAX_CONTEXT_MESSAGES)
    console.log('📝 New message text:', originalText)
    console.log('🌐 Detected language:', detectedLanguage)
    console.log('⏰ Timestamp:', new Date(timestamp).toISOString())
    
    const newContextEntry: ConversationContextEntry = {
      text: originalText.trim(),
      language: detectedLanguage,
      timestamp
    }

    const updated = [...context, newContextEntry]
    const final = updated.slice(-this.MAX_CONTEXT_MESSAGES) // Keep only last 6 messages
    
    console.log('📊 Context size AFTER update:', final.length)
    console.log('📊 Messages in rolling window:')
    final.forEach((entry, index) => {
      console.log(`   ${index + 1}. [${entry.language}] "${entry.text.substring(0, 50)}${entry.text.length > 50 ? '...' : ''}"`)
    })
    
    if (updated.length !== final.length) {
      console.log(`🗑️ Removed ${updated.length - final.length} old messages from rolling window`)
    }
    
    console.log('═══════════════════════════════════════════════════════')
    
    return final
  }

  /**
   * Build context prompt for Whisper STT API
   * Simple concatenated text for transcription accuracy
   */
  static buildWhisperContext(context: ConversationContextEntry[]): string {
    console.log('╔══════════════════════════════════════════════════════════╗')
    console.log('║                 🎧 WHISPER CONTEXT BUILDER               ║')
    console.log('╚══════════════════════════════════════════════════════════╝')
    console.log('📊 Input context entries:', context.length)
    
    if (context.length === 0) {
      console.log('⚠️  No context available - returning empty string')
      console.log('🎧 Whisper will receive NO conversation context')
      console.log('═══════════════════════════════════════════════════════')
      return ''
    }
    
    console.log('📋 Context entries to process:')
    context.forEach((entry, index) => {
      console.log(`   ${index + 1}. [${entry.language}] "${entry.text}"`)
      console.log(`      ⏰ ${new Date(entry.timestamp).toLocaleTimeString()}`)
    })
    
    const contextTexts = context.map(msg => msg.text).join(' ')
    const whisperContext = `Recent conversation: ${contextTexts}`
    
    console.log('🔧 Final Whisper context prompt:')
    console.log(`   Length: ${whisperContext.length} characters`)
    console.log(`   Preview: "${whisperContext.substring(0, 150)}${whisperContext.length > 150 ? '...' : ''}"`)
    console.log('🎯 This context will help Whisper understand speech in context')
    console.log('═══════════════════════════════════════════════════════')
    
    return whisperContext
  }

  /**
   * Build formatted context for GPT translation API
   * Structured format with language labels for better understanding
   */
  static buildTranslationContext(context: ConversationContextEntry[]): string {
    console.log('╔══════════════════════════════════════════════════════════╗')
    console.log('║               🌐 TRANSLATION CONTEXT BUILDER             ║')
    console.log('╚══════════════════════════════════════════════════════════╝')
    console.log('📊 Input context entries:', context.length)
    
    if (context.length === 0) {
      console.log('⚠️  No context available - returning empty string')
      console.log('🌐 GPT will receive NO conversation context')
      console.log('═══════════════════════════════════════════════════════')
      return ''
    }
    
    console.log('📋 Building structured context for GPT:')
    const contextEntries = context.map((msg, index) => {
      const langName = msg.language === 'en' ? 'English' : 
                      msg.language === 'es' ? 'Spanish' : 
                      msg.language === 'pt' ? 'Portuguese' : msg.language
      
      console.log(`   ${index + 1}. Language: ${msg.language} (${langName})`)
      console.log(`      Text: "${msg.text}"`)
      console.log(`      Time: ${new Date(msg.timestamp).toLocaleTimeString()}`)
      
      return `${langName}: ${msg.text}`
    })
    
    const contextInfo = '\n\nRecent conversation for context:\n' + contextEntries.join('\n')
    
    console.log('🔧 Final GPT translation context:')
    console.log(`   Length: ${contextInfo.length} characters`)
    console.log(`   Structure: ${contextEntries.length} conversation entries`)
    console.log('📝 Full context that will be sent to GPT:')
    console.log(contextInfo)
    console.log('🎯 This context will help GPT understand conversation flow')
    console.log('═══════════════════════════════════════════════════════')
    
    return contextInfo
  }

  /**
   * Get conversation statistics for debugging
   */
  static getContextStats(context: ConversationContextEntry[]): {
    messageCount: number
    languages: string[]
    totalCharacters: number
    timeSpan: number
  } {
    if (context.length === 0) {
      return {
        messageCount: 0,
        languages: [],
        totalCharacters: 0,
        timeSpan: 0
      }
    }

    const languages = [...new Set(context.map(msg => msg.language))]
    const totalCharacters = context.reduce((sum, msg) => sum + msg.text.length, 0)
    const timeSpan = context.length > 1 ? 
      context[context.length - 1].timestamp - context[0].timestamp : 0

    return {
      messageCount: context.length,
      languages,
      totalCharacters,
      timeSpan
    }
  }

  /**
   * Clear context (useful for testing or session resets)
   */
  static clearContext(): ConversationContextEntry[] {
    console.log('🧹 [Context] Context cleared')
    return []
  }

  /**
   * Validate context entry
   */
  static isValidContextEntry(entry: any): entry is ConversationContextEntry {
    return (
      entry &&
      typeof entry.text === 'string' &&
      typeof entry.language === 'string' &&
      typeof entry.timestamp === 'number' &&
      entry.text.trim().length > 0
    )
  }

  /**
   * Sanitize context for storage/transmission
   */
  static sanitizeContext(context: ConversationContextEntry[]): ConversationContextEntry[] {
    return context
      .filter(this.isValidContextEntry)
      .map(entry => ({
        text: entry.text.trim(),
        language: entry.language.toLowerCase(),
        timestamp: entry.timestamp
      }))
      .slice(-this.MAX_CONTEXT_MESSAGES)
  }
}