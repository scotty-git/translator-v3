# Real-time Translator v2 - Complete System Specification

## 🎯 Executive Summary

The Real-time Translator v2 is a sophisticated real-time translation application that enables seamless conversations between English and Spanish/Portuguese speakers. The system features advanced Speech-to-Text (STT) error correction, contextual translation with dynamic emoji enhancement, and conversation memory for improved accuracy. This document provides the complete technical specification for implementing this system.

## 🌟 Core Features & User Stories

### Primary User Stories

1. **As an English speaker**, I want to speak naturally in English and see my words translated to Spanish/Portuguese in real-time, so I can communicate with non-English speakers
2. **As a Spanish/Portuguese speaker**, I want to speak in my native language and see English translations, so I can understand English speakers
3. **As a user in a romantic conversation**, I want the translator to preserve flirty tones and add appropriate emojis, so my emotional intent is conveyed
4. **As a user**, I want the system to remember recent conversation context, so translations are more accurate and contextually appropriate
5. **As a user making speech errors**, I want the system to understand what I meant to say even with STT errors, so communication flows naturally

### Key Features

- **Bi-directional Translation**: English ↔ Spanish/Portuguese with automatic language detection
- **Two Translation Modes**: 
  - Casual Mode: Professional conversational translation
  - Fun Mode: Enhanced translation with contextual emojis and romantic tone preservation
- **STT Error Correction**: Intelligent correction of speech-to-text transcription errors
- **Conversation Memory**: Maintains context of last 6 messages (3 exchanges) for improved accuracy
- **Real-time Processing**: Streaming translations with sub-second response times
- **Multi-platform Support**: Works on desktop and mobile devices

## 🏗️ System Architecture Overview

### High-Level Data Flow

```
Audio Input → Whisper STT → Language Detection → STT Error Correction → 
Context Building → Translation Mode Selection → GPT-4o-mini Translation → 
Emoji Enhancement (Fun Mode) → Output Display
```

### Core Components

1. **Speech Recognition Layer**
   - OpenAI Whisper API for speech-to-text
   - Conversation context integration for improved accuracy
   - Multi-language support (English, Spanish, Portuguese)

2. **Language Detection Pipeline**
   - Primary: Whisper API language detection
   - Fallback: Pattern-based text analysis
   - Context validation using conversation history

3. **Translation Engine**
   - GPT-4o-mini powered translation
   - Dynamic prompt generation based on mode
   - Streaming response support

4. **Context Management System**
   - Rolling window of 6 messages
   - Automatic cleanup and maintenance
   - Dual usage for STT and translation improvement

5. **UI/UX Layer**
   - Split-panel interface (English speaker left, target language right)
   - Real-time activity indicators
   - Mobile-responsive design

## 📝 Complete Translation Prompt System

### System Overview

The translation system operates in two distinct modes, each with carefully crafted prompts that handle STT error correction, contextual translation, and appropriate styling.

### Fun Mode Prompt Template

```
You are a TRANSLATOR ONLY. NEVER reply or respond - only translate from ${fromLangFull} to ${toLangFull}.

CRITICAL: DO NOT RESPOND TO CONTENT - ONLY TRANSLATE IT
❌ WRONG: If input is "How are you?" don't output "I'm good, how are you?"
✅ CORRECT: Translate "How are you?" to "¿Cómo estás?"

CONTEXT: Fun mode - real-time speech with emoji enhancement. TRANSLATING: ${fromLangFull} → ${toLangFull}

TRANSLATION PROCESS:
1. Fix STT errors (missing punctuation, homophones, grammar)
2. Translate the corrected text from ${fromLangFull} to ${toLangFull}
3. Add appropriate emojis to enhance meaning and context
4. If conversation context suggests romance/dating, preserve that tone naturally
5. Use informal, fun language${toLangFull === 'Spanish' ? ' (tú, never usted)' : toLangFull === 'Portuguese' ? ' (você, informal tone)' : ''}

EMOJI GUIDELINES:
- Use emojis SPARINGLY and CONTEXTUALLY - maximum 1 per message, often none
- Add emojis for SPECIFIC nouns when relevant: coffee ☕, beach 🏖️, food 🍕, weather ☀️🌧️
- For EMOTIONS: love/affection ❤️💕, excitement 🎉, sadness 😢, flirty 😏😉
- For ROMANTIC/FLIRTY content: subtle winks 😉, smirks 😏, hearts ❤️💕, kisses 💋
- NEVER use generic 😊 for basic greetings, questions, or neutral responses  
- NO emojis for simple pleasantries, directions, or factual statements
- Focus on meaningful enhancement, not decoration

STT ERROR EXAMPLES FOR ${fromLangFull.toUpperCase()}:
[Language-specific examples inserted dynamically]

ROMANTIC CONTEXT DETECTION:
- Look for romantic keywords in recent conversation: love, miss, beautiful, date, kiss, etc.
- If detected, use romantic emojis sparingly: 💕❤️😍💋🌹 (max 1 per message)
- If no romantic context, avoid emojis unless truly meaningful
- Never use generic emojis like 😊 for neutral conversation

${contextInfo}

TRANSLATE ONLY - DO NOT REPLY OR RESPOND.
```

### Casual Mode Prompt Template

```
You are a TRANSLATOR ONLY. NEVER reply or respond - only translate from ${fromLangFull} to ${toLangFull}.

CRITICAL: DO NOT RESPOND TO CONTENT - ONLY TRANSLATE IT
❌ WRONG: If input is "How are you?" don't output "I'm good, how are you?"
✅ CORRECT: Translate "How are you?" to "¿Cómo estás?"

CONTEXT: Real-time speech with STT errors. TRANSLATING: ${fromLangFull} → ${toLangFull}

TRANSLATION PROCESS:
1. Fix STT errors (punctuation, homophones, grammar)
2. Translate the corrected text from ${fromLangFull} to ${toLangFull}
3. Use informal conversational language${toLangFull === 'Spanish' ? ' (tú, not usted)' : toLangFull === 'Portuguese' ? ' (você, informal tone)' : ''}
4. ${toLangFull === 'English' ? 'Use British English for English translations' : toLangFull === 'Spanish' ? 'Use natural Spanish expressions' : 'Use natural Portuguese expressions'}

STT ERROR EXAMPLES FOR ${fromLangFull.toUpperCase()}:
[Language-specific examples inserted dynamically]

STYLE:
- Match speaker's tone and energy
- Keep casual speech patterns natural

${contextInfo}

TRANSLATE ONLY - DO NOT REPLY OR RESPOND.
```

### Dynamic Variables

| Variable | Description | Example Values |
|----------|-------------|----------------|
| `${fromLangFull}` | Source language name | "English", "Spanish", "Portuguese" |
| `${toLangFull}` | Target language name | "English", "Spanish", "Portuguese" |
| `${contextInfo}` | Recent conversation history | See Context System section |

## 🧠 STT Error Correction System

### Common Error Types & Corrections

#### 1. Missing Punctuation
- `how are you` → `how are you?`
- `lets eat grandma` → `let's eat, grandma`

#### 2. Homophones
- `your beautiful` → `you're beautiful`
- `i miss you to` → `I miss you too`

#### 3. Contractions
- `i cant wait` → `I can't wait`
- `dont know` → `don't know`

#### 4. Informal Speech Patterns
- `how r u` → `how are you`
- `u know` → `you know`

#### 5. Missing Articles/Prepositions
- `going to beach` → `going to the beach`
- `want some coffee` → `Want some coffee?`

### Language-Specific Error Patterns

**Spanish STT Errors:**
- `como estas` → `¿cómo estás?` (missing punctuation/accents)
- `no se` → `no sé` (missing accent)
- `q tal` → `¿qué tal?` (abbreviation + missing punctuation)

**Portuguese STT Errors:**
- `como voce esta` → `Como você está?` (missing accent + punctuation)
- `nao sei` → `Não sei` (missing tilde)
- `que faz` → `Que faz?` (missing punctuation)

## 🔄 Conversation Context System

### Overview

The conversation context system maintains a rolling window of the last 6 messages (3 complete exchanges) to provide context for both STT and translation accuracy improvements.

### Configuration

```javascript
const MAX_CONTEXT_MESSAGES = 6 // Keep last 3 exchanges (6 messages total)
```

### Message Data Structure

```javascript
const contextEntry = {
  text: "Hello there",           // Original text (after STT correction)
  language: "en",               // Detected language code (en/es/pt) 
  timestamp: Date.now()         // Message timestamp
}
```

### Context Building Process

#### 1. Message Addition
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

#### 2. Context Usage in Whisper STT
```javascript
let contextPrompt = '';
if (conversationContext.length > 0) {
  const contextTexts = conversationContext.map(msg => msg.text).join(' ');
  contextPrompt = `Recent conversation: ${contextTexts}`;
}

// Sent to Whisper API
const transcription = await openai.audio.transcriptions.create({
  file: audioFile,
  model: 'whisper-1',
  response_format: 'verbose_json',
  prompt: contextPrompt  // Context helps with transcription accuracy
});
```

#### 3. Context Usage in Translation
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

### Example Context Flow

```
Message 1: [English] "Hello" → Context: 1 message
Message 2: [Spanish] "Hola" → Context: 2 messages  
Message 3: [English] "How are you?" → Context: 3 messages
Message 4: [Spanish] "Bien, gracias" → Context: 4 messages
Message 5: [English] "What's your name?" → Context: 5 messages
Message 6: [Spanish] "Me llamo María" → Context: 6 messages
Message 7: [English] "Nice to meet you" → Context: 6 messages (Message 1 removed)
```

## 🎨 Emoji Enhancement System (Fun Mode)

### Philosophy

The emoji system follows a **contextual enhancement** approach rather than decorative addition.

### Core Principles

1. **Sparingly Used**: Maximum 1 emoji per message, often none
2. **Contextually Relevant**: Tied to specific nouns or meaningful emotions
3. **Anti-Generic**: Eliminates excessive use of 😊 for neutral responses

### Emoji Categories

#### 1. Specific Nouns
- Food & Drink: `☕` (coffee), `🍕` (pizza), `🥐` (bread)
- Places: `🏖️` (beach), `🏠` (home), `🏥` (hospital)
- Weather: `☀️` (sunny), `🌧️` (rainy), `❄️` (snow)

#### 2. Meaningful Emotions
- Love/Affection: `❤️`, `💕`, `😍`
- Excitement: `🎉`, `🥳`, `✨`
- Sadness: `😢`, `😭`, `💔`

#### 3. Romantic/Flirty Context
- Subtle Flirting: `😉`, `😏`, `💋`
- Romance: `💕`, `❤️`, `🌹`
- Playful: `😘`, `😍`, `💫`

### Romantic Context Detection

The system actively scans for romantic keywords in conversation history:

**Detection Keywords**: `love`, `miss`, `beautiful`, `date`, `kiss`, `romantic`, `adorable`, `gorgeous`, `sweet`, `darling`

## 🌐 Language Detection System

### Multi-Layer Detection Pipeline

1. **Primary Detection**: OpenAI Whisper API results
2. **Fallback Detection**: Pattern-based text analysis
3. **Context Validation**: Conversation history consideration

### Pattern-Based Language Detection

#### Spanish Patterns
- **Common Words**: `sí`, `no`, `gracias`, `hola`, `adiós`, `bien`, `bueno`, `cómo`, `qué`
- **Unique Characters**: `ñ`, accented vowels `[áéíóúü]`
- **Verb Patterns**: `está`, `están`, `estoy`, `estás`, `es`, `son`, `tiene`, `tengo`

#### Portuguese Patterns  
- **Common Words**: `sim`, `não`, `obrigado`, `obrigada`, `olá`, `tchau`, `como`, `que`
- **Unique Characters**: `ç`, nasal vowels `[ãõâêô]`
- **Verb Patterns**: `está`, `estão`, `estou`, `é`, `são`, `tem`, `têm`, `tenho`

#### English Patterns
- **Common Words**: `the`, `and`, `or`, `but`, `this`, `that`, `have`, `has`, `will`, `would`
- **Suffixes**: `ing`, `tion`, `ness`, `ment`, `ly`

## 💻 User Interface Design

### Panel Layout

1. **Left Panel**: English Speaker
   - Label: "Speaks in English • Sees [Target Language]"
   - Shows translations to communicate with target language speaker

2. **Right Panel**: Target Language Speaker
   - Label: "Habla en español • Ve inglés" or "Fala em português • Vê inglês"
   - Shows English translations to understand English speaker

### Real-time Features

- **Sub-100ms Activity Indicators**: Shows when partner is typing, recording, or processing
- **Voice Visualization**: 5 animated bars showing audio input levels during recording
- **Smart Auto-scroll**: Dynamically calculates message height for optimal viewing
- **Font Size Options**: Small, Medium, Large, XL (Extra Large)

## 🔧 Implementation Guidelines

### Key Requirements

1. **Strict Translation-Only Behavior**
   - Never respond to content
   - Never engage in conversation
   - Always translate, never answer questions

2. **STT Error Awareness**
   - Implement comprehensive error pattern recognition
   - Handle language-specific transcription issues
   - Correct before translating

3. **Contextual Intelligence**
   - Use conversation history for better translations
   - Implement sparing, meaningful emoji usage
   - Focus on contextual enhancement

4. **Multi-Language Support**
   - Full English ↔ Spanish ↔ Portuguese support
   - Proper accent and diacritic handling
   - Cultural expression awareness

5. **Dynamic Mode Switching**
   - Support both casual and fun translation modes
   - Preserve user preferences
   - Allow real-time mode changes

### Technical Stack Requirements

- **Speech Recognition**: OpenAI Whisper API
- **Translation**: GPT-4o-mini or equivalent
- **Real-time Communication**: WebSockets or similar (Supabase channels)
- **Frontend**: React or similar reactive framework
- **State Management**: Context API or similar
- **Persistence**: LocalStorage for user preferences

### Performance Targets

- **Translation Latency**: < 1 second end-to-end
- **Activity Indicators**: < 100ms update latency
- **Context Window**: 6 messages maximum
- **Token Efficiency**: ~200-500 tokens per translation with context

## 📊 Cost Considerations

### API Cost Estimation
```javascript
const costs = {
  whisper: (audioSeconds / 60) * 0.006, // $0.006 per minute
  gpt: (tokens / 1000) * 0.00037,       // Average of input/output pricing
  total: whisper + gpt
}
```

### Optimization Strategies
- Context window limits (6 messages)
- Efficient prompt design
- Request batching where possible
- Caching for repeated translations

## 🔒 Security & Privacy

- **API Key Protection**: Environment variable storage
- **Data Minimization**: Limited conversation context retention
- **User Consent**: Clear mode selection and preferences
- **No Personal Data Storage**: Only temporary conversation context

## 🚀 Getting Started

### Basic Implementation Steps

1. **Set up Speech Recognition**
   - Integrate Whisper API
   - Implement audio capture
   - Add context prompt support

2. **Build Language Detection**
   - Primary Whisper detection
   - Pattern-based fallback
   - Context validation

3. **Create Translation Engine**
   - Implement prompt templates
   - Add dynamic variable substitution
   - Support streaming responses

4. **Add Context Management**
   - Rolling window implementation
   - State management setup
   - Integration with STT and translation

5. **Implement UI Components**
   - Split panel design
   - Activity indicators
   - Mode selection

6. **Test & Optimize**
   - Multi-language testing
   - Performance optimization
   - Error handling

## 🎯 Success Metrics

- **Translation Accuracy**: > 95% for common conversations
- **STT Error Correction**: > 90% of common errors fixed
- **User Satisfaction**: Natural, flowing conversations
- **Performance**: Real-time response with < 1s latency
- **Context Effectiveness**: Measurable improvement in translation quality

---

This complete specification provides everything needed to implement the Real-time Translator v2 system. The combination of advanced STT error correction, contextual translation, intelligent emoji enhancement, and conversation memory creates a sophisticated translation experience that enables natural, flowing conversations across language barriers.