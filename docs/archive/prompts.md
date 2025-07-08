# Fun and Casual Translation Prompts System

## 🎯 Overview

This document provides a comprehensive deep dive into the Real-time Translator v2's advanced prompt system. This system intelligently handles Speech-to-Text (STT) error correction, contextual translation, and dynamic emoji enhancement across English ↔ Spanish/Portuguese translation pairs.

The system operates in two distinct modes:
- **Casual Mode**: Professional conversational translation with STT error correction
- **Fun Mode**: Enhanced translation with contextual emojis and romantic/flirty tone preservation

## 🏗️ System Architecture

### Core Components

1. **Context Mode Detection**: Determines whether to use 'casual' or 'fun' translation prompts
2. **STT Error Processing**: Identifies and corrects Speech-to-Text transcription errors
3. **Language Detection Pipeline**: Multi-layer language identification (Whisper + pattern-based fallback)
4. **Translation Engine**: GPT-4o-mini powered translation with contextual awareness
5. **Emoji Enhancement System**: Intelligent emoji placement for meaningful context

### Data Flow

```
Audio Input → Whisper STT → Language Detection → Context Analysis → Translation + Emoji → Output
```

## 📝 Complete Prompt Specifications

### Fun Mode Prompt (Full Text)

```
You are a TRANSLATOR ONLY. NEVER reply or respond - only translate from ${fromLangFull} to ${toLangFull}.

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
${fromLangFull === 'English' 
  ? toLangFull === 'Spanish' 
    ? `- "i miss you to" → "I miss you too" → "Te extraño 💕 también"
- "your beautiful" → "you're beautiful" → "Eres hermosa"
- "how r u" → "how are you" → "¿Cómo estás hoy?"
- "want some coffee" → "Want some coffee?" → "¿Quieres café ☕?"
- "going to beach" → "Going to the beach" → "Voy a la playa 🏖️"`
    : `- "i miss you to" → "I miss you too" → "Sinto sua falta 💕 também"
- "your beautiful" → "you're beautiful" → "Você é linda"
- "how r u" → "how are you" → "Como você está hoje?"
- "want some coffee" → "Want some coffee?" → "Quer café ☕?"
- "going to beach" → "Going to the beach" → "Vou à praia 🏖️"`
  : fromLangFull === 'Spanish'
    ? `- "como estas" → "¿cómo estás?" → "How are you doing?"
- "te amo mucho" → "Te amo mucho" → "I love you ❤️ so much"
- "q tal" → "¿qué tal?" → "How's it going today?"
- "quiero cafe" → "Quiero café" → "I want coffee ☕"
- "vamos a la playa" → "Vamos a la playa" → "Let's go to the beach 🏖️"`
    : `- "como voce esta" → "Como você está?" → "How are you doing?"
- "te amo muito" → "Te amo muito" → "I love you ❤️ so much"
- "que tal" → "Que tal?" → "How's it going today?"
- "quero cafe" → "Quero café" → "I want coffee ☕"
- "vamos a praia" → "Vamos à praia" → "Let's go to the beach 🏖️"`}

ROMANTIC CONTEXT DETECTION:
- Look for romantic keywords in recent conversation: love, miss, beautiful, date, kiss, etc.
- If detected, use romantic emojis sparingly: 💕❤️😍💋🌹 (max 1 per message)
- If no romantic context, avoid emojis unless truly meaningful
- Never use generic emojis like 😊 for neutral conversation

${contextInfo}

TRANSLATE ONLY - DO NOT REPLY OR RESPOND.
```

### Casual Mode Prompt (Full Text)

```
You are a TRANSLATOR ONLY. NEVER reply or respond - only translate from ${fromLangFull} to ${toLangFull}.

CRITICAL: DO NOT RESPOND TO CONTENT - ONLY TRANSLATE IT
❌ WRONG: If input is "How are you?" don't output "I'm good, how are you?"
✅ CORRECT: Translate "How are you?" to "¿Cómo estás?"
❌ WRONG: If input is "¿Cómo estás?" don't output "Estoy bien, ¿y tú?"
✅ CORRECT: Translate "¿Cómo estás?" to "How are you?"

CONTEXT: Real-time speech with STT errors. TRANSLATING: ${fromLangFull} → ${toLangFull}

TRANSLATION PROCESS:
1. Fix STT errors (punctuation, homophones, grammar)
2. Translate the corrected text from ${fromLangFull} to ${toLangFull}
3. Use informal conversational language${toLangFull === 'Spanish' ? ' (tú, not usted)' : toLangFull === 'Portuguese' ? ' (você, informal tone)' : ''}
4. ${toLangFull === 'English' ? 'Use British English for English translations' : toLangFull === 'Spanish' ? 'Use natural Spanish expressions' : 'Use natural Portuguese expressions'}

STT ERROR EXAMPLES FOR ${fromLangFull.toUpperCase()}:
${fromLangFull === 'English' 
  ? toLangFull === 'Spanish'
    ? `- "lets eat grandma" → "let's eat, grandma" → "vamos a comer, abuela"
- "how r u" → "how are you" → "¿cómo estás?"
- "i cant wait" → "I can't wait" → "No puedo esperar"`
    : `- "lets eat grandma" → "let's eat, grandma" → "vamos comer, vovó"
- "how r u" → "how are you" → "como você está?"
- "i cant wait" → "I can't wait" → "Não posso esperar"`
  : fromLangFull === 'Spanish'
    ? `- "como estas" → "¿cómo estás?" → "How are you?"
- "no se" → "no sé" → "I don't know"
- "q haces" → "¿qué haces?" → "What are you doing?"`
    : `- "como voce esta" → "Como você está?" → "How are you?"
- "nao sei" → "Não sei" → "I don't know"
- "que faz" → "Que faz?" → "What are you doing?"`}

STYLE:
- Match speaker's tone and energy
${toLangFull === 'English' 
  ? `- UK English: "brilliant", "fancy", "keen"
- Keep casual speech patterns natural`
  : toLangFull === 'Spanish'
    ? `- Natural Spanish: "genial", "qué tal", "vale"
- Keep casual speech patterns natural`
    : `- Natural Portuguese: "legal", "que tal", "beleza"
- Keep casual speech patterns natural`}

${contextInfo}

TRANSLATE ONLY - DO NOT REPLY OR RESPOND.
```

## 🔧 Dynamic Variable System

### Core Variables

| Variable | Type | Description | Example Values |
|----------|------|-------------|----------------|
| `fromLangFull` | String | Source language name | "English", "Spanish", "Portuguese" |
| `toLangFull` | String | Target language name | "English", "Spanish", "Portuguese" |
| `contextMode` | String | Translation mode | "fun", "casual" |
| `contextInfo` | String | Recent conversation history | "Recent conversation: Hello → Hola" |
| `conversationContext` | Array | Message objects with text/language | `[{text: "Hello", language: "en"}]` |
| `targetLanguage` | String | Target language code | "es", "pt" |

### Language Mapping Logic

```javascript
const fromLangFull = fromLang === 'en' ? 'English' : 
                    fromLang === 'es' ? 'Spanish' : 'Portuguese'
const toLangFull = toLang === 'en' ? 'English' : 
                  toLang === 'es' ? 'Spanish' : 'Portuguese'
```

### Context Information Builder

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

## 🧠 Post-Whisper STT Error Correction System

### Multi-Layer Language Detection

The system employs a sophisticated language detection pipeline:

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

### STT Error Classification & Correction

#### Common Error Types

1. **Missing Punctuation**
   - `how are you` → `how are you?`
   - `lets eat grandma` → `let's eat, grandma`

2. **Homophones**
   - `your beautiful` → `you're beautiful`
   - `i miss you to` → `I miss you too`

3. **Contractions**
   - `i cant wait` → `I can't wait`
   - `dont know` → `don't know`

4. **Informal Speech Patterns**
   - `how r u` → `how are you`
   - `u know` → `you know`

5. **Missing Articles/Prepositions**
   - `going to beach` → `going to the beach`
   - `want some coffee` → `Want some coffee?`

#### Language-Specific Error Patterns

**Spanish STT Errors:**
- `como estas` → `¿cómo estás?` (missing punctuation/accents)
- `no se` → `no sé` (missing accent)
- `q tal` → `¿qué tal?` (abbreviation + missing punctuation)

**Portuguese STT Errors:**
- `como voce esta` → `Como você está?` (missing accent + punctuation)
- `nao sei` → `Não sei` (missing tilde)
- `que faz` → `Que faz?` (missing punctuation)

## 🎨 Enhanced Emoji System (Fun Mode)

### Emoji Usage Philosophy

The emoji system follows a **contextual enhancement** approach rather than decorative addition:

#### Core Principles
1. **Sparingly Used**: Maximum 1 emoji per message, often none
2. **Contextually Relevant**: Tied to specific nouns or meaningful emotions
3. **Anti-Generic**: Eliminates excessive use of 😊 for neutral responses

#### Emoji Categories

**1. Specific Nouns**
- Food & Drink: `☕` (coffee), `🍕` (pizza), `🥐` (bread)
- Places: `🏖️` (beach), `🏠` (home), `🏥` (hospital)
- Weather: `☀️` (sunny), `🌧️` (rainy), `❄️` (snow)

**2. Meaningful Emotions**
- Love/Affection: `❤️`, `💕`, `😍`
- Excitement: `🎉`, `🥳`, `✨`
- Sadness: `😢`, `😭`, `💔`

**3. Romantic/Flirty Context**
- Subtle Flirting: `😉`, `😏`, `💋`
- Romance: `💕`, `❤️`, `🌹`
- Playful: `😘`, `😍`, `💫`

#### Emoji Exclusion Rules

**Never Use Emojis For:**
- Basic greetings ("Hello" ❌😊)
- Simple questions ("What time?" ❌😊)
- Neutral responses ("Okay" ❌😊)
- Directions or instructions
- Factual statements

### Romantic Context Detection

The system actively scans for romantic keywords in conversation history:

**Detection Keywords**: `love`, `miss`, `beautiful`, `date`, `kiss`, `romantic`, `adorable`, `gorgeous`, `sweet`, `darling`

**Response Logic:**
```javascript
if (romanticContextDetected) {
  // Use romantic emojis sparingly: 💕❤️😍💋🌹
  // Maximum 1 per message
} else {
  // Standard contextual emoji logic
  // Often no emoji for neutral conversation
}
```

## ⚙️ Context Mode Selection Logic

### Default Behavior
- **New Users**: Default to `fun` mode
- **Existing Users**: Default to `casual` mode  
- **User Preference**: Saved in localStorage as `translatorContextMode`

### Mode Switching
Users can toggle between modes at any time:
```javascript
const newMode = contextMode === 'casual' ? 'fun' : 'casual'
localStorage.setItem('translatorContextMode', newMode)
```

### Mode Persistence
Context mode preference is preserved across sessions via localStorage, ensuring consistent user experience.

## 🔄 Translation Pipeline Architecture

### Full Processing Flow

```
1. Audio Input (AudioBlob)
2. Whisper Transcription (with conversation context)
3. Language Detection (Whisper + pattern fallback)
4. STT Error Analysis & Correction
5. Context Mode Selection (fun/casual)
6. Translation Prompt Generation
7. GPT-4o-mini Translation (with streaming)
8. Emoji Enhancement (fun mode only)
9. Output Delivery
```

### Error Handling & Retries

- **Whisper Retries**: 3 attempts with exponential backoff
- **Translation Retries**: 3 attempts with exponential backoff
- **Network Monitoring**: Integrated with network quality assessment
- **Graceful Degradation**: Fallback to pattern-based language detection

### Performance Optimizations

- **Streaming Responses**: Real-time translation chunk delivery
- **Context Caching**: Conversation history for improved accuracy
- **Request Batching**: Efficient API usage patterns

## 📊 Cost Tracking & Analytics

### Cost Calculation
```javascript
const costs = {
  whisper: (audioSeconds / 60) * 0.006, // $0.006 per minute
  gpt: (tokens / 1000) * 0.00037,       // Average of input/output pricing
  total: whisper + gpt
}
```

### Usage Metrics
- Audio duration tracking
- Token consumption estimation
- API call frequency monitoring
- Translation accuracy assessment

## 🎯 Implementation Guidelines for Other AI Systems

### Key Requirements

1. **Strict Translation-Only Behavior**
   - Never respond to content
   - Never engage in conversation
   - Always translate, never answer questions

2. **STT Error Awareness**
   - Implement comprehensive error pattern recognition
   - Handle language-specific transcription issues
   - Correct before translating

3. **Contextual Emoji Intelligence**
   - Implement sparing, meaningful emoji usage
   - Avoid generic emoji decorations
   - Focus on contextual enhancement

4. **Multi-Language Support**
   - Full English ↔ Spanish ↔ Portuguese support
   - Proper accent and diacritic handling
   - Cultural expression awareness

5. **Dynamic Mode Switching**
   - Support both casual and fun translation modes
   - Preserve user preferences
   - Allow real-time mode changes

### Critical Success Factors

- **Context Awareness**: Use conversation history for better translations
- **Error Resilience**: Handle STT errors gracefully
- **Cultural Sensitivity**: Respect tone and relationship context
- **Performance**: Support real-time, streaming translations
- **User Control**: Allow mode selection and preference persistence

## 🔒 Security & Privacy Considerations

- **API Key Protection**: Environment variable storage
- **Data Minimization**: Limited conversation context retention
- **User Consent**: Clear emoji enhancement preferences
- **Audit Trails**: Translation quality monitoring

---

This documentation provides complete specifications for implementing the Real-time Translator v2's advanced prompt system. The naked prompts, variable definitions, and architectural details enable full replication while maintaining the sophisticated STT error correction and contextual emoji enhancement features that define this system.