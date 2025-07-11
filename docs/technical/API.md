# 🔌 API Documentation - Service Integrations

Complete guide to all external service integrations and internal APIs.

---

## 📋 Overview

The Real-time Translator integrates with several external services to provide translation functionality:

| Service | Purpose | Location |
|---------|---------|----------|
| **OpenAI** | STT, Translation, TTS | `src/services/openai/` |
| **Supabase** | Database, Real-time | `src/services/supabase/` |
| **Browser APIs** | Audio, Storage, PWA | `src/services/audio/` |
| **PersistentAudioManager** | Persistent MediaStream | `src/services/audio/PersistentAudioManager.ts` |

---

## 🤖 OpenAI Integration

### Configuration
```typescript
// src/lib/openai.ts
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
})
```

### 1. Whisper STT Service

**Purpose**: Convert audio to text with language detection

```typescript
// src/services/openai/whisper.ts
class WhisperService {
  static async transcribeAudio(
    audioFile: File,
    prompt?: string
  ): Promise<TranscriptionResult>
}
```

**Usage Example**:
```typescript
const audioFile = new File([audioBlob], 'recording.webm')
const result = await WhisperService.transcribeAudio(audioFile, 'Context prompt')

// Returns:
{
  text: "Hello, how are you today?",
  language: "english", 
  duration: 2.3
}
```

**API Details**:
- **Model**: `whisper-1`
- **Format Support**: `.webm`, `.m4a`, `.mp3`, `.wav`
- **Max File Size**: 25MB
- **Response Time**: ~1-3 seconds
- **Cost**: $0.006 per minute

**Language Detection**:
```typescript
// Automatic language mapping
const detectLanguage = (whisperLang: string): 'en' | 'es' | 'pt' => {
  const langMap = {
    'english': 'en',
    'spanish': 'es', 
    'portuguese': 'pt'
  }
  return langMap[whisperLang.toLowerCase()] || 'en'
}
```

### 2. Translation Service

**Purpose**: Translate text using GPT-4o-mini with context awareness

```typescript
// src/services/openai/translation.ts
class TranslationService {
  static async translate(
    text: string,
    fromLang: Language,
    toLang: Language,
    mode: 'casual' | 'fun',
    context?: PromptContext
  ): Promise<TranslationResult>
}
```

**Usage Example**:
```typescript
const result = await TranslationService.translate(
  "Hello world",
  "English",
  "Spanish", 
  "casual",
  {
    recentMessages: ["Hi there", "Good morning"],
    isRomanticContext: false,
    conversationContext: contextEntries
  }
)

// Returns:
{
  originalText: "Hello world",
  translatedText: "Hola mundo",
  originalLanguage: "English",
  targetLanguage: "Spanish",
  inputTokens: 45,
  outputTokens: 12
}
```

**API Details**:
- **Model**: `gpt-4o-mini`
- **Temperature**: 0.3 (consistent translations)
- **Max Tokens**: 1000
- **Response Time**: ~1-2 seconds
- **Cost**: $0.15 per 1M input tokens, $0.60 per 1M output tokens

**Translation Modes**:

**Casual Mode**: Natural, conversational translations
```typescript
// Prompt emphasizes:
// - Natural speech patterns
// - Informal language (tú, você)
// - Context preservation
// - STT error correction
```

**Fun Mode**: Casual + contextual emojis
```typescript
// Casual mode PLUS:
// - Contextual emoji enhancement
// - Romantic context detection
// - Emotion preservation
// - Maximum 1 emoji per message
```

### 3. TTS Service

**Purpose**: Convert translated text to speech

```typescript
// src/services/openai/tts.ts
class TTSService {
  static async textToSpeech(
    text: string, 
    voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
  ): Promise<TTSResult>
}
```

**Usage Example**:
```typescript
const result = await TTSService.textToSpeech("Hola mundo", "nova")

// Returns:
{
  audioBuffer: ArrayBuffer,
  duration: 1.2
}
```

**API Details**:
- **Model**: `tts-1`
- **Voices**: 6 options (nova recommended for Spanish/Portuguese)
- **Format**: MP3
- **Response Time**: ~1-2 seconds
- **Cost**: $15.00 per 1M characters

---

## 🎙️ Browser APIs - Audio Integration

### PersistentAudioManager Service

**Purpose**: Maintain a persistent MediaStream throughout the session for optimal mobile performance

```typescript
// src/services/audio/PersistentAudioManager.ts
class PersistentAudioManager {
  private static instance: PersistentAudioManager | null = null
  private stream: MediaStream | null = null
  private streamReady = false
  private permissionDenied = false
  
  static getInstance(): PersistentAudioManager
  async ensurePermissions(): Promise<boolean>
  isStreamReady(): boolean
  async getStream(): Promise<MediaStream>
  cleanup(): void
}
```

**Usage Example**:
```typescript
// Get singleton instance
const audioManager = PersistentAudioManager.getInstance()

// Request permissions on first recording attempt
if (!audioManager.isStreamReady()) {
  const hasPermissions = await audioManager.ensurePermissions()
  if (!hasPermissions) {
    throw new Error('Microphone permission denied')
  }
}

// Use persistent stream for recording
const stream = await audioManager.getStream()
const recorder = new MediaRecorder(stream)
```

**Key Features**:
- **Singleton Pattern**: One instance per app lifecycle
- **Lazy Permission Request**: Only asks when user tries to record
- **Stream Persistence**: Maintains stream between recordings
- **Error Recovery**: Handles permission denial and stream loss
- **Mobile Optimized**: No iOS Safari audio context issues

**Permission Flow**:
1. App loads → No permission request
2. User clicks record → Check if stream ready
3. If not ready → Request permission once
4. Stream persists for all future recordings
5. Automatic cleanup on app unmount

### AudioRecorderService

**Purpose**: Handle audio recording using the persistent stream

```typescript
// src/services/audio/AudioRecorderService.ts
class AudioRecorderService {
  static async startRecording(stream: MediaStream): Promise<MediaRecorder>
  static async stopRecording(recorder: MediaRecorder): Promise<Blob>
  static getAudioVisualization(stream: MediaStream): number[]
}
```

**Integration with PersistentAudioManager**:
```typescript
// Example: Complete recording flow
const audioManager = PersistentAudioManager.getInstance()

// Ensure permissions
if (!audioManager.isStreamReady()) {
  await audioManager.ensurePermissions()
}

// Get persistent stream
const stream = await audioManager.getStream()

// Start recording
const recorder = await AudioRecorderService.startRecording(stream)

// ... user records ...

// Stop and get audio blob
const audioBlob = await AudioRecorderService.stopRecording(recorder)
```

---

## 🗄️ Supabase Integration

### Configuration
```typescript
// src/lib/supabase.ts
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

### 1. Sessions Service

**Purpose**: Manage translation session rooms

```typescript
// src/services/supabase/sessions.ts
class SessionsService {
  static async createSession(): Promise<Session>
  static async joinSession(code: string): Promise<Session | null>
  static async updateActivity(sessionId: string): Promise<void>
  static async cleanupExpired(): Promise<void>
}
```

**Session Model**:
```typescript
interface Session {
  id: string              // UUID
  code: string            // 4-digit code (0000-9999)
  created_at: string      // ISO timestamp
  expires_at: string      // 4 hours from creation
  is_active: boolean      // Session status
  user_count: number      // Connected users
  last_activity: string   // Last message time
}
```

**Usage Examples**:
```typescript
// Create new session
const session = await SessionsService.createSession()
// Returns: { id: "uuid", code: "1234", ... }

// Join existing session
const session = await SessionsService.joinSession("1234")
// Returns: Session object or null if not found

// Update last activity
await SessionsService.updateActivity(sessionId)
```

### 2. Messages Service

**Purpose**: Store and retrieve translation messages

```typescript
// src/services/supabase/messages.ts
class MessagesService {
  static async create(message: CreateMessageParams): Promise<Message>
  static async getBySession(sessionId: string): Promise<Message[]>
  static async updateStatus(messageId: string, status: MessageStatus): Promise<void>
  static async subscribe(sessionId: string, callback: Function): Promise<RealtimeChannel>
}
```

**Message Model**:
```typescript
interface Message {
  id: string                    // UUID
  session_id: string           // Foreign key
  user_id: string             // User identifier
  original: string            // Original text
  translation: string         // Translated text
  original_lang: string       // Source language
  target_lang: string         // Target language
  status: 'queued' | 'processing' | 'displayed' | 'failed'
  performance_metrics: {
    whisperTime: number
    translationTime: number
    totalTime: number
  }
  timestamp: string           // Creation time
}
```

**Usage Examples**:
```typescript
// Create message
const message = await MessagesService.create({
  session_id: sessionId,
  user_id: userId,
  original: "Hello world",
  original_lang: "en",
  target_lang: "es"
})

// Get session messages
const messages = await MessagesService.getBySession(sessionId)

// Update message status
await MessagesService.updateStatus(messageId, 'displayed')

// Subscribe to real-time updates
const subscription = await MessagesService.subscribe(sessionId, (message) => {
  console.log('New message:', message)
})
```

### 3. Activity Service

**Purpose**: Track user activity for status indicators

```typescript
// src/services/supabase/activity.ts
class ActivityService {
  static async updateActivity(
    sessionId: string, 
    userId: string, 
    activity: ActivityType
  ): Promise<void>
  
  static async subscribe(sessionId: string, callback: Function): Promise<RealtimeChannel>
}
```

**Activity Types**:
```typescript
type ActivityType = 'typing' | 'recording' | 'processing' | 'idle'
```

**Usage Examples**:
```typescript
// Update user activity
await ActivityService.updateActivity(sessionId, userId, 'recording')

// Subscribe to activity changes
const subscription = await ActivityService.subscribe(sessionId, (activity) => {
  console.log('User activity:', activity)
})
```

---

## 🔄 Translation Pipeline

### Complete Flow Documentation

```typescript
// Complete translation pipeline
class TranslationPipeline {
  static async processAudioMessage(audioBlob: Blob): Promise<Message> {
    
    // 1. Transcription Phase
    const transcription = await WhisperService.transcribeAudio(audioFile, context)
    
    // 2. Language Detection & Direction
    const detectedLang = WhisperService.detectLanguage(transcription.language)
    const targetLang = this.determineTargetLanguage(detectedLang, userTarget)
    
    // 3. Translation Phase
    const translation = await TranslationService.translate(
      transcription.text,
      detectedLang,
      targetLang,
      translationMode,
      conversationContext
    )
    
    // 4. Storage Phase
    const message = await MessagesService.create({
      original: transcription.text,
      translation: translation.translatedText,
      original_lang: detectedLang,
      target_lang: targetLang,
      performance_metrics: {
        whisperTime: transcription.duration,
        translationTime: translation.duration,
        totalTime: Date.now() - startTime
      }
    })
    
    return message
  }
}
```

### Performance Monitoring

**Built-in Performance Logging**:
```typescript
// src/lib/performance.ts
class PerformanceLogger {
  static start(operation: string): void
  static end(operation: string): number
  static log(operation: string, duration: number, metadata?: object): void
}

// Usage throughout pipeline
performanceLogger.start('whisper-transcription')
const result = await WhisperService.transcribeAudio(audioFile)
performanceLogger.end('whisper-transcription')
```

**Metrics Collected**:
- **Whisper Time**: STT processing duration
- **Translation Time**: GPT-4o processing duration  
- **Total Time**: End-to-end user experience
- **Token Usage**: Input/output tokens for cost tracking
- **Error Rates**: Failed requests by service

---

## 🔄 Error Handling & Retry Logic

### Retry Strategy

```typescript
// src/lib/retry-logic.ts
class WorkflowRetry {
  static async translation<T>(
    operation: () => Promise<T>,
    onRetry?: (attempt: number, error: Error) => void
  ): Promise<T>
  
  static async network<T>(operation: () => Promise<T>): Promise<T>
  static async audio<T>(operation: () => Promise<T>): Promise<T>
}
```

**Retry Configuration**:
```typescript
const RETRY_CONFIG = {
  translation: {
    maxAttempts: 3,
    delays: [1000, 2000, 4000], // Progressive backoff
    retryConditions: ['network', 'timeout', 'rate_limit']
  },
  whisper: {
    maxAttempts: 2, 
    delays: [1000, 3000],
    retryConditions: ['network', 'timeout']
  },
  supabase: {
    maxAttempts: 5,
    delays: [500, 1000, 2000, 4000, 8000],
    retryConditions: ['network', 'timeout', 'server_error']
  }
}
```

### Error Classification

```typescript
// src/lib/errors/ErrorManager.ts
class ErrorManager {
  static classifyError(error: Error): ErrorClassification {
    // Network errors (retryable)
    if (error.message.includes('fetch')) return 'NETWORK_ERROR'
    
    // API errors (some retryable)
    if (error.message.includes('rate_limit')) return 'RATE_LIMIT'
    if (error.message.includes('timeout')) return 'TIMEOUT'
    
    // User errors (not retryable)
    if (error.message.includes('permission')) return 'PERMISSION_ERROR'
    
    return 'UNKNOWN_ERROR'
  }
}
```

---

## 📊 Caching Strategy

### Response Caching

```typescript
// src/lib/cache/CachedOpenAIService.ts
class CachedOpenAIService {
  // Cache translation responses to avoid duplicate API calls
  static async translate(
    text: string, 
    fromLang: string, 
    toLang: string
  ): Promise<TranslationResult> {
    
    const cacheKey = `translation-${hash(text)}-${fromLang}-${toLang}`
    
    // Check cache first
    const cached = await CacheManager.get(cacheKey)
    if (cached) return cached
    
    // Call API and cache result
    const result = await TranslationService.translate(text, fromLang, toLang)
    await CacheManager.set(cacheKey, result, 24 * 60 * 60) // 24 hour TTL
    
    return result
  }
}
```

**Cache Configuration**:
- **Translation Cache**: 24 hours (similar phrases common)
- **Session Cache**: 1 hour (active sessions)
- **User Preferences**: Persistent (localStorage)
- **Audio Cache**: 5 minutes (temporary playback)

---

## 🌐 Real-Time Implementation

### MessageSyncService

The `MessageSyncService` handles all real-time communication for sessions:

```typescript
// src/services/MessageSyncService.ts
class MessageSyncService {
  // Initialize session with proper cleanup
  async initializeSession(sessionId: string, userId: string): Promise<void> {
    // Clean up any existing subscriptions first
    await this.cleanupSubscriptions()
    
    // Load existing message history (NEW as of July 11, 2025)
    await this.loadMessageHistory(sessionId)
    
    // Set up new subscriptions with unique channel names
    await this.setupMessageSubscription(sessionId)
    await this.setupPresenceSubscription(sessionId, userId)
  }
  
  // Load historical messages when joining existing session
  private async loadMessageHistory(sessionId: string): Promise<void> {
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('sequence_number', { ascending: true })
    
    // Process historical messages (skip own messages)
    messages?.forEach(message => {
      if (message.sender_id !== this.currentUserId) {
        this.handleIncomingMessage(message)
      }
    })
  }
  
  // Comprehensive cleanup to prevent session contamination
  async cleanup(): Promise<void> {
    // Unsubscribe AND remove channels (both required!)
    if (this.messageChannel) {
      await this.messageChannel.unsubscribe()
      await supabase.removeChannel(this.messageChannel)
    }
    
    // Clear message queue and all state
    this.messageQueue.clear()
    this.currentSessionId = null
    this.currentUserId = null
  }
}
```

**Critical Channel Management Rules**:
1. Always use unique channel names with timestamps
2. Clean up existing channels before creating new ones
3. Validate session ID on all incoming messages
4. Call both `unsubscribe()` and `removeChannel()` for cleanup
5. Load message history before setting up subscriptions to avoid race conditions
6. Track processed message IDs to prevent duplicates between history and real-time

### Supabase Real-Time Pattern

```typescript
// Safe real-time subscription pattern
const subscribeToMessages = (sessionId: string) => {
  // Use timestamp to ensure unique channel
  const channelName = `session:${sessionId}:${Date.now()}`
  
  return supabase
    .channel(channelName)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public', 
      table: 'messages',
      filter: `session_id=eq.${sessionId}`
    }, (payload) => {
      // Validate session ID before processing
      if (payload.new.session_id !== currentSessionId) return
      
      // Handle new message
      const message = payload.new as Message
      addMessageToUI(message)
    })
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'user_activity', 
      filter: `session_id=eq.${sessionId}`
    }, (payload) => {
      // Handle activity update
      const activity = payload.new as UserActivity
      updateActivityIndicator(activity)
    })
    .subscribe()
}
```

### Connection Recovery

```typescript
// src/lib/connection-recovery.ts
class ConnectionRecovery {
  static async attemptReconnection(
    sessionId: string,
    maxAttempts: number = 5
  ): Promise<boolean> {
    
    const delays = [1000, 2000, 4000, 8000, 15000] // Progressive backoff
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.testConnection(sessionId)
        return true // Success
      } catch (error) {
        if (attempt === maxAttempts) throw error
        await this.delay(delays[attempt - 1])
      }
    }
    
    return false
  }
}
```

---

## 💡 Usage Examples

### Complete Translation Flow

```typescript
// Example: Process voice message in session
async function processVoiceMessage(
  audioBlob: Blob, 
  sessionId: string, 
  userId: string
) {
  try {
    // 1. Update activity status
    await ActivityService.updateActivity(sessionId, userId, 'processing')
    
    // 2. Transcribe audio
    const audioFile = new File([audioBlob], 'recording.webm')
    const transcription = await WhisperService.transcribeAudio(audioFile)
    
    // 3. Translate text
    const translation = await TranslationService.translate(
      transcription.text,
      'English',
      'Spanish',
      'casual'
    )
    
    // 4. Save message
    const message = await MessagesService.create({
      session_id: sessionId,
      user_id: userId,
      original: transcription.text,
      translation: translation.translatedText,
      original_lang: 'en',
      target_lang: 'es'
    })
    
    // 5. Update activity back to idle
    await ActivityService.updateActivity(sessionId, userId, 'idle')
    
    return message
    
  } catch (error) {
    // Error handling
    await ActivityService.updateActivity(sessionId, userId, 'idle')
    console.error('Translation failed:', error)
    throw error
  }
}
```

### Testing API Integration

```typescript
// Example: Test all services
async function testAllServices() {
  // Test Supabase connection
  const { data, error } = await supabase.from('sessions').select('count')
  console.assert(!error, 'Supabase connection failed')
  
  // Test OpenAI API key
  const models = await openai.models.list()
  console.assert(models.data.length > 0, 'OpenAI API key invalid')
  
  // Test translation pipeline
  const result = await TranslationService.translate(
    'Hello world',
    'English', 
    'Spanish',
    'casual'
  )
  console.assert(result.translatedText.length > 0, 'Translation failed')
  
  console.log('✅ All services working correctly')
}
```

---

## 🔗 Related Documentation

- **[SETUP.md](./SETUP.md)** - Environment configuration
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System overview  
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - API error solutions
- **[TESTING.md](./TESTING.md)** - API testing strategies