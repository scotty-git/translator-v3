# Conversation Context System - Complete Specification

## 🎯 Overview

This document provides the complete technical specification for implementing the conversation context system that enhances the Fun and Casual translation prompts. This system sends the last X number of messages as additional context to improve translation accuracy and maintain conversational flow.

## 📋 Context Window Configuration

### Core Settings
```javascript
const MAX_CONTEXT_MESSAGES = 6 // Keep last 3 exchanges (6 messages total)
```

**Key Details:**
- **Maximum Messages**: 6 total messages
- **Exchange Logic**: 3 complete exchanges (each exchange = 2 messages, one from each participant)
- **Rolling Window**: Automatically maintains most recent messages, discarding older ones

## 🗂️ Context Data Structure

### Message Object Format
```javascript
const contextEntry = {
  text: "Hello there",           // Original text (after STT correction)
  language: "en",               // Detected language code (en/es/pt) 
  timestamp: Date.now()         // Message timestamp
}
```

### State Management
```javascript
const [conversationContext, setConversationContext] = useState([])
```

## 🔄 Context Building Process

### 1. Message Addition Logic
```javascript
// After successful translation
const newContextEntry = {
  text: result.original,        // The corrected original text
  language: result.originalLang, // Detected language
  timestamp: result.timestamp
};

setConversationContext(prev => {
  const updated = [...prev, newContextEntry];
  return updated.slice(-MAX_CONTEXT_MESSAGES); // Keep only last 6
});
```

### 2. Rolling Window Implementation
```javascript
// Always keeps exactly the last 6 messages
setConversationContext(prev => {
  const updated = [...prev, newContextEntry];
  return updated.slice(-MAX_CONTEXT_MESSAGES); // Automatic cleanup
});
```

### 3. Context Flow Example
```
Message 1: [English] "Hello" → Context: 1 message
Message 2: [Spanish] "Hola" → Context: 2 messages  
Message 3: [English] "How are you?" → Context: 3 messages
Message 4: [Spanish] "Bien, gracias" → Context: 4 messages
Message 5: [English] "What's your name?" → Context: 5 messages
Message 6: [Spanish] "Me llamo María" → Context: 6 messages
Message 7: [English] "Nice to meet you" → Context: 6 messages (Message 1 removed)
```

## 🔧 Context Usage in APIs

### 1. Whisper STT Context (contextPrompt)
```javascript
let contextPrompt = '';
if (conversationContext.length > 0) {
  const contextTexts = conversationContext.map(msg => msg.text).join(' ');
  contextPrompt = `Recent conversation: ${contextTexts}`;
  console.log('📋 Using context:', contextPrompt.substring(0, 100) + '...');
}

// Sent to Whisper API
const transcription = await openai.audio.transcriptions.create({
  file: audioFile,
  model: 'whisper-1',
  response_format: 'verbose_json',
  prompt: contextPrompt  // Context helps with transcription accuracy
});
```

**Example Whisper contextPrompt:**
```
Recent conversation: Hello there Hola, ¿cómo estás? I'm doing well, thanks Excelente, me alegra escuchar eso What are your plans for today? Voy a la playa
```

### 2. Translation Context (contextInfo)
```javascript
let contextInfo = '';
if (conversationContext.length > 0) {
  contextInfo = '\n\nRecent conversation for context:\n' + 
    conversationContext.map(msg => {
      const langName = msg.language === 'en' ? 'English' : 
                      msg.language === 'es' ? 'Spanish' : 'Portuguese';
      return `${langName}: ${msg.text}`;
    }).join('\n');
}
```

**Example contextInfo output:**
```
Recent conversation for context:
English: Hello there
Spanish: Hola, ¿cómo estás?
English: I'm doing well, thanks
Spanish: Excelente, me alegra escuchar eso
English: What are your plans for today?
Spanish: Voy a la playa
```

## 🔗 Context Insertion into Prompts

### 1. Template Variable Location

In both Fun and Casual mode prompts, the `${contextInfo}` variable is placed at the end:

**Fun Mode Prompt:**
```
ROMANTIC CONTEXT DETECTION:
- Look for romantic keywords in recent conversation: love, miss, beautiful, date, kiss, etc.
- If detected, use romantic emojis sparingly: 💕❤️😍💋🌹 (max 1 per message)
- If no romantic context, avoid emojis unless truly meaningful
- Never use generic emojis like 😊 for neutral conversation

${contextInfo}

TRANSLATE ONLY - DO NOT REPLY OR RESPOND.
```

**Casual Mode Prompt:**
```
STYLE:
- Match speaker's tone and energy
- UK English: "brilliant", "fancy", "keen"
- Keep casual speech patterns natural

${contextInfo}

TRANSLATE ONLY - DO NOT REPLY OR RESPOND.
```

### 2. Template String Interpolation

The system prompt is built using JavaScript template strings:

```javascript
const systemPrompt = contextMode === 'fun' 
  ? `You are a TRANSLATOR ONLY. NEVER reply or respond - only translate from ${fromLangFull} to ${toLangFull}.

[... full fun mode prompt ...]

ROMANTIC CONTEXT DETECTION:
- Look for romantic keywords in recent conversation: love, miss, beautiful, date, kiss, etc.
- If detected, use romantic emojis sparingly: 💕❤️😍💋🌹 (max 1 per message)
- If no romantic context, avoid emojis unless truly meaningful
- Never use generic emojis like 😊 for neutral conversation

${contextInfo}

TRANSLATE ONLY - DO NOT REPLY OR RESPOND.`
  : `[... casual mode prompt with ${contextInfo} ...]`
```

### 3. Complete Example: Final Prompt with Context

**Given conversation context:**
```javascript
[
  { text: "Hello there", language: "en", timestamp: 1234567890 },
  { text: "Hola, ¿cómo estás?", language: "es", timestamp: 1234567891 },
  { text: "I'm going to the beach", language: "en", timestamp: 1234567892 }
]
```

**The final prompt sent to GPT-4o-mini becomes:**
```
You are a TRANSLATOR ONLY. NEVER reply or respond - only translate from English to Spanish.

CRITICAL: DO NOT RESPOND TO CONTENT - ONLY TRANSLATE IT
❌ WRONG: If input is "How are you?" don't output "I'm good, how are you?"
✅ CORRECT: Translate "How are you?" to "¿Cómo estás?"

CONTEXT: Fun mode - real-time speech with emoji enhancement. TRANSLATING: English → Spanish

TRANSLATION PROCESS:
1. Fix STT errors (missing punctuation, homophones, grammar)
2. Translate the corrected text from English to Spanish
3. Add appropriate emojis to enhance meaning and context
4. If conversation context suggests romance/dating, preserve that tone naturally
5. Use informal, fun language (tú, never usted)

EMOJI GUIDELINES:
- Use emojis SPARINGLY and CONTEXTUALLY - maximum 1 per message, often none
- Add emojis for SPECIFIC nouns when relevant: coffee ☕, beach 🏖️, food 🍕, weather ☀️🌧️
- For EMOTIONS: love/affection ❤️💕, excitement 🎉, sadness 😢, flirty 😏😉
- For ROMANTIC/FLIRTY content: subtle winks 😉, smirks 😏, hearts ❤️💕, kisses 💋
- NEVER use generic 😊 for basic greetings, questions, or neutral responses  
- NO emojis for simple pleasantries, directions, or factual statements
- Focus on meaningful enhancement, not decoration

STT ERROR EXAMPLES FOR ENGLISH:
- "i miss you to" → "I miss you too" → "Te extraño 💕 también"
- "your beautiful" → "you're beautiful" → "Eres hermosa"
- "how r u" → "how are you" → "¿Cómo estás hoy?"
- "want some coffee" → "Want some coffee?" → "¿Quieres café ☕?"
- "going to beach" → "Going to the beach" → "Voy a la playa 🏖️"

ROMANTIC CONTEXT DETECTION:
- Look for romantic keywords in recent conversation: love, miss, beautiful, date, kiss, etc.
- If detected, use romantic emojis sparingly: 💕❤️😍💋🌹 (max 1 per message)
- If no romantic context, avoid emojis unless truly meaningful
- Never use generic emojis like 😊 for neutral conversation

Recent conversation for context:
English: Hello there
Spanish: Hola, ¿cómo estás?
English: I'm going to the beach

TRANSLATE ONLY - DO NOT REPLY OR RESPOND.
```

### 4. Empty Context Handling

**When no conversation context exists:**
- `contextInfo` remains an empty string `''`
- The `${contextInfo}` variable is replaced with nothing
- The prompt flows naturally with just extra whitespace where context would be

**Example with no context:**
```
ROMANTIC CONTEXT DETECTION:
- Look for romantic keywords in recent conversation: love, miss, beautiful, date, kiss, etc.
- If detected, use romantic emojis sparingly: 💕❤️😍💋🌹 (max 1 per message)
- If no romantic context, avoid emojis unless truly meaningful
- Never use generic emojis like 😊 for neutral conversation


TRANSLATE ONLY - DO NOT REPLY OR RESPOND.
```

## 🎯 Context Benefits

### 1. Improved STT Accuracy
- Whisper uses conversation history to better understand unclear audio
- Context helps with homophones, names, and domain-specific terms
- Reduces transcription errors in ongoing conversations

### 2. Enhanced Translation Quality
- GPT understands conversational flow and maintains consistent tone
- Helps with pronoun resolution ("he", "she", "it" references)
- Maintains context for ongoing topics and themes
- Enables better romantic/emotional context detection

### 3. Consistency Maintenance
- Names and proper nouns stay consistent across messages
- Technical terms or specific vocabulary get reused appropriately
- Conversational style and formality level remain consistent

## 📊 Performance Considerations

### Context Impact
- **Lightweight Storage**: Only stores essential data (text, language, timestamp)
- **Automatic Cleanup**: No manual memory management needed
- **Token Efficiency**: 6 messages typically = ~200-500 tokens of context
- **Cost Impact**: Minimal increase in API costs (~10-15% token overhead)

### System Integration
1. **App.jsx** maintains `conversationContext` state
2. **useOpenAI hook** receives context as parameter
3. **openai.js service** uses context in both `transcribeAudio()` and `translateText()` functions
4. **Whisper API** gets simplified context as prompt
5. **GPT-4o-mini** gets formatted context in system prompt

## 🔧 Implementation Checklist

### Required Components
- [ ] State management for `conversationContext` array
- [ ] `MAX_CONTEXT_MESSAGES = 6` constant
- [ ] Message addition logic with rolling window (`slice(-6)`)
- [ ] Context building function for Whisper (`contextPrompt`)
- [ ] Context building function for translation (`contextInfo`)
- [ ] Template string interpolation with `${contextInfo}` variable
- [ ] Integration with both Fun and Casual mode prompts

### Key Functions to Implement

#### 1. Add Message to Context
```javascript
const addToContext = (originalText, detectedLanguage, timestamp) => {
  const newContextEntry = {
    text: originalText,
    language: detectedLanguage,
    timestamp: timestamp
  };
  
  setConversationContext(prev => {
    const updated = [...prev, newContextEntry];
    return updated.slice(-MAX_CONTEXT_MESSAGES);
  });
};
```

#### 2. Build Whisper Context
```javascript
const buildWhisperContext = (conversationContext) => {
  if (conversationContext.length === 0) return '';
  
  const contextTexts = conversationContext.map(msg => msg.text).join(' ');
  return `Recent conversation: ${contextTexts}`;
};
```

#### 3. Build Translation Context
```javascript
const buildTranslationContext = (conversationContext) => {
  if (conversationContext.length === 0) return '';
  
  return '\n\nRecent conversation for context:\n' + 
    conversationContext.map(msg => {
      const langName = msg.language === 'en' ? 'English' : 
                      msg.language === 'es' ? 'Spanish' : 'Portuguese';
      return `${langName}: ${msg.text}`;
    }).join('\n');
};
```

## 🎯 Why This Design Works

1. **3 Exchanges = Natural Conversation**: Captures enough context without overwhelming the AI
2. **Automatic Management**: No user intervention or complex logic needed
3. **Performance Optimized**: Small enough to not impact response times
4. **Quality Balance**: Significant accuracy improvement without excessive cost
5. **Dual Usage**: Same context improves both STT and translation quality

This system ensures that every translation benefits from recent conversation context while maintaining optimal performance and cost efficiency. The context is automatically managed and seamlessly integrated into both the Fun and Casual translation prompts through template variable substitution.

---

**Implementation Note**: If you've already implemented the Fun and Casual prompts, you only need to add the conversation context state management and ensure the `${contextInfo}` variable is properly populated and interpolated into your existing prompt templates.