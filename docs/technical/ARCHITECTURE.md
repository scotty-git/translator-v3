# 🏗️ Architecture Guide - System Overview

Understanding how the Real-time Translator v3 works under the hood.

---

## 🔮 High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile User   │    │   Desktop User  │    │   Mobile User   │
│    (Session)    │    │    (Session)    │    │    (Session)    │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                     ┌───────────▼────────────┐
                     │    React PWA App       │
                     │  (Mobile-First UI)     │
                     └───────────┬────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                       │                        │
        ▼                       ▼                        ▼
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  Supabase   │         │   OpenAI    │         │  Browser    │
│             │         │             │         │             │
│ • Real-time │         │ • Whisper   │         │ • Audio     │
│ • Database  │         │ • GPT-4o    │         │ • Storage   │
│ • Sessions  │         │ • TTS       │         │ • PWA       │
│ • Messages  │         │ • Translation│         │ • Persistent Stream │
└─────────────┘         └─────────────┘         └─────────────┘
```

---

## 🔄 Data Flow - Voice Translation

### 1. User Flow (Start to Finish)
```
[User Action] → [Audio Capture] → [Transcription] → [Translation] → [Display] → [Real-time Sync]
```

### 2. Detailed Translation Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            VOICE TRANSLATION FLOW                          │
└─────────────────────────────────────────────────────────────────────────────┘

1️⃣ USER SPEAKS
   │ User taps/clicks record button
   │ Permission requested on first attempt only
   │ PersistentAudioManager provides stream
   │ Audio recording starts (WebRTC AudioRecorder)
   │
   ▼

2️⃣ AUDIO CAPTURE
   │ PersistentAudioManager maintains single MediaStream
   │ AudioRecorderService captures from persistent stream
   │ Real-time audio visualization (5 bars)
   │ Recording saved as .webm/.m4a blob
   │ User stops recording
   │
   ▼

3️⃣ WHISPER TRANSCRIPTION
   │ Audio blob sent to OpenAI Whisper API
   │ Returns: { text, language, duration }
   │ Language auto-detected (en/es/pt)
   │ STT errors corrected by AI
   │
   ▼

4️⃣ TRANSLATION LOGIC
   │ Determine translation direction:
   │ • If input = target language → translate to English  
   │ • Else → translate to user's selected target
   │ Build conversation context for accuracy
   │
   ▼

5️⃣ GPT TRANSLATION
   │ OpenAI GPT-4o-mini with custom prompts
   │ Context: recent messages, conversation flow
   │ Mode: casual (natural) or fun (with emojis)
   │ Returns translated text
   │
   ▼

6️⃣ MESSAGE STORAGE
   │ Message saved to Supabase messages table
   │ Status: queued → processing → displayed
   │ Performance metrics logged
   │
   ▼

7️⃣ REAL-TIME SYNC
   │ Supabase real-time subscription triggers
   │ All connected clients receive new message
   │ UI updates with translation display
   │ TTS audio played (optional)
```

---

## 🧩 Core Components

### Frontend Architecture (React)

```
src/
├── features/               # Feature-based organization
│   ├── translator/         # Main translation interface
│   ├── session/           # Session management
│   ├── messages/          # Message display & real-time
│   └── audio/            # Audio recording controls
│
├── services/             # External service integrations
│   ├── openai/          # Translation pipeline
│   ├── supabase/        # Database & real-time
│   └── audio/           # Recording & playback
│       ├── PersistentAudioManager.ts  # Persistent stream management
│       └── AudioRecorderService.ts    # Recording functionality
│
├── lib/                 # Core utilities
│   ├── performance.ts   # Monitoring & logging
│   ├── cache/          # Response caching
│   ├── retry/          # Error recovery
│   └── network/        # Quality detection
│
└── components/         # Reusable UI components
    ├── ui/            # Basic components (Button, Input)
    └── layout/        # Layout components
```

### Key Architectural Patterns

**1. Feature-Based Organization**
- Each feature is self-contained with its own components, hooks, and logic
- Easy to understand, test, and maintain
- Follows domain-driven design principles

**2. Service Layer Abstraction**
- Clean separation between UI and external services
- Retry logic and error handling centralized
- Easy to mock for testing

**3. Performance-First Design**
- Aggressive caching (CacheManager, CachedOpenAIService)
- Real-time optimizations (message queuing, status indicators)
- Mobile network optimizations (audio compression, quality degradation)

---

## 🛠️ Technology Decisions

### Why These Technologies?

| Technology | Decision Rationale |
|------------|-------------------|
| **React 19** | Latest features, excellent TypeScript support, stable ecosystem |
| **TypeScript** | Type safety prevents runtime errors, better development experience |
| **Vite** | Fastest build tool, excellent dev experience, minimal config |
| **UnoCSS** | Performance > Tailwind, atomic CSS, smaller bundle size |
| **Supabase** | Real-time out of the box, PostgreSQL, simple setup |
| **OpenAI** | Best-in-class STT/TTS/Translation, reliable API |
| **Playwright** | Modern E2E testing, better than Selenium, mobile testing |

### Architecture Principles

**1. Mobile-First**
- All design decisions prioritize mobile experience
- Touch interactions, responsive design, PWA features
- Desktop is secondary but fully supported

**2. Real-Time Performance**
- Sub-100ms user feedback for all interactions
- Message queuing prevents out-of-order display
- Progressive enhancement for slow networks

**3. Resilient Design**
- Comprehensive error handling and retry logic
- Network quality detection and adaptation
- Graceful degradation for edge cases

**4. Developer Experience**
- Type safety throughout the stack
- Comprehensive testing (unit + E2E)
- Clear file organization and naming conventions

---

## 💾 Data Models

### Session Model
```typescript
interface Session {
  id: string              // UUID
  code: string            // 4-digit room code (0000-9999)
  created_at: string      // ISO timestamp
  expires_at: string      // 4 hours from creation
  is_active: boolean      // Session status
  user_count: number      // Connected users
  last_activity: string   // Last message timestamp
}
```

### Message Model
```typescript
interface Message {
  id: string                    // UUID
  session_id: string           // Foreign key to session
  user_id: string             // User identifier
  original: string            // Original text
  translation: string         // Translated text
  original_lang: string       // Source language (en/es/pt)
  target_lang: string         // Target language
  status: 'queued' | 'processing' | 'displayed' | 'failed'
  performance_metrics: {
    whisperTime: number       // STT duration
    translationTime: number   // Translation duration  
    totalTime: number         // End-to-end duration
  }
  timestamp: string           // Message creation time
}
```

### User Activity Model
```typescript
interface UserActivity {
  id: string              // UUID
  session_id: string      // Foreign key to session
  user_id: string         // User identifier
  activity: 'typing' | 'recording' | 'processing' | 'idle'
  last_updated: string    // Last activity timestamp
}
```

---

## 🌐 Real-Time Architecture

### Supabase Real-Time Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   User A        │     │   Supabase      │     │   User B        │
│   (Mobile)      │     │   (Real-time)   │     │   (Desktop)     │
└─────────┬───────┘     └─────────┬───────┘     └─────────┬───────┘
          │                       │                       │
          │ 1. Send Message       │                       │
          ├──────────────────────▶│                       │
          │                       │ 2. Store in DB        │
          │                       │ 3. Broadcast          │
          │                       ├──────────────────────▶│
          │ 4. Receive Update     │                       │ 5. Display Message
          │◀──────────────────────┤                       │
```

### Message Queue System

**Problem**: Network latency varies, causing out-of-order message display

**Solution**: Message queue with guaranteed ordering
1. All messages get `displayOrder` number
2. Frontend sorts by `displayOrder` before rendering  
3. Queue processes messages sequentially
4. Real-time updates maintain order

```typescript
// Message Queue Implementation
class MessageQueue {
  private queue: QueuedMessage[] = []
  private processing = false

  async add(message: QueuedMessage) {
    message.displayOrder = this.getNextOrder()
    this.queue.push(message)
    if (!this.processing) {
      this.process()
    }
  }

  private async process() {
    this.processing = true
    while (this.queue.length > 0) {
      const message = this.queue.shift()!
      await this.handleMessage(message)
    }
    this.processing = false
  }
}
```

---

## 📡 MessageSyncService Architecture

### Overview
The `MessageSyncService` is responsible for real-time message synchronization between session participants. It handles:
- Supabase channel subscriptions
- Message queuing and delivery
- Presence tracking
- Connection state management
- Offline resilience

### Channel Management Strategy

**Problem**: Stale channel subscriptions can cause message contamination between sessions when users rapidly exit/rejoin.

**Solution**: Comprehensive cleanup and unique channel naming:

```typescript
// Channel naming with timestamp to prevent conflicts
const channelName = `session:${sessionId}:${Date.now()}`

// Cleanup existing channels before creating new ones
const existingChannels = supabase.getChannels()
const sessionChannels = existingChannels.filter(ch => 
  ch.topic.startsWith(`session:${sessionId}`)
)

for (const channel of sessionChannels) {
  await channel.unsubscribe()
  await supabase.removeChannel(channel)
}
```

### Session Lifecycle Management

1. **Session Entry**:
   - Clean up any existing channels for the session
   - Create new channels with unique timestamps
   - Validate all incoming messages against current session ID

2. **During Session**:
   - Monitor connection status
   - Queue messages when offline
   - Sync presence state with database

3. **Session Exit** (Critical for preventing contamination):
   - Unsubscribe from all channels
   - Remove channels from Supabase
   - Clear message queue
   - Reset all state
   - Clear localStorage
   - Mark user as offline in database

### Key Safety Mechanisms

1. **Double Session Validation**:
   ```typescript
   // In channel subscription
   if (payload.new.session_id !== this.currentSessionId) return
   
   // In message handler
   if (message.session_id !== this.currentSessionId) return
   ```

2. **Proper Cleanup Sequence**:
   ```typescript
   // Must call both for complete cleanup
   await channel.unsubscribe()
   await supabase.removeChannel(channel)
   ```

3. **Exit Handlers**:
   - Component unmount cleanup
   - Browser beforeunload handler
   - Navigation interception with confirmation

---

## 🔧 Service Integrations

### OpenAI Integration Pattern

```typescript
// Unified error handling and retry logic
class TranslationService {
  static async translate(
    text: string, 
    fromLang: Language, 
    toLang: Language
  ): Promise<TranslationResult> {
    
    return WorkflowRetry.translation(async () => {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: generatePrompt(fromLang, toLang) },
          { role: 'user', content: text }
        ],
        temperature: 0.3
      })
      
      return processResponse(completion)
    })
  }
}
```

### Supabase Integration Pattern

```typescript
// Real-time subscription with automatic reconnection
class MessagesService {
  static subscribe(sessionId: string, callback: (message: Message) => void) {
    return supabase
      .channel(`session-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `session_id=eq.${sessionId}`
      }, callback)
      .subscribe()
  }
}
```

---

## 🎙️ PersistentAudioManager Architecture

### Persistent Stream Strategy

Unlike traditional approaches that create/destroy MediaStreams for each recording, PersistentAudioManager maintains a single stream throughout the session:

```typescript
// Traditional Approach (problematic on mobile)
startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  // Use stream
}
stopRecording() {
  stream.getTracks().forEach(track => track.stop())
  // Stream destroyed, need new permission next time
}

// PersistentAudioManager Approach (mobile-optimized)
class PersistentAudioManager {
  private stream: MediaStream | null = null
  
  async ensurePermissions() {
    if (!this.stream) {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    }
    return this.stream
  }
  
  // Stream persists between recordings
  startRecording() {
    const recorder = new MediaRecorder(this.stream)
    // No new permission needed
  }
}
```

### Key Benefits

1. **Mobile Performance**
   - No iOS Safari audio context issues
   - Faster recording startup (no stream creation)
   - Reduced battery usage

2. **Better UX**
   - Permission requested only on first recording
   - No repeated permission prompts
   - Instant recording after first use

3. **Reliability**
   - Stream persists through component re-renders
   - Survives navigation within app
   - Automatic recovery on stream loss

### Permission Flow

```
User Opens App
     │
     ▼
No Permission Request ✓
     │
     ▼
User Clicks Record
     │
     ▼
First Time? ──Yes──▶ Request Permission
     │                      │
     No                     ▼
     │                 Create Persistent Stream
     │                      │
     ▼                      ▼
Use Existing ◀──────────────┘
   Stream
```

---

## 📱 PWA Architecture

### Service Worker Strategy

```
Network Strategy by Resource Type:
├── API Calls → Network First (real-time priority)
├── App Shell → Cache First (fast loading)
├── Static Assets → Stale While Revalidate
└── Audio Files → Cache First (offline support)
```

### Offline Capabilities

1. **App Shell Caching** - UI loads instantly
2. **Message Queue Persistence** - Messages saved locally
3. **Background Sync** - Auto-sync when online
4. **Cached Translations** - Recent translations available offline

---

## 🚀 Performance Optimizations

### 1. Caching Strategy
- **API Response Caching** - Avoid duplicate OpenAI calls
- **Component Memoization** - Prevent unnecessary re-renders
- **Asset Caching** - Service worker caches static files

### 2. Network Optimizations  
- **Audio Compression** - Dynamic quality based on network
- **Request Batching** - Combine multiple API calls
- **Progressive Loading** - Load critical features first

### 3. Real-Time Optimizations
- **Message Debouncing** - Prevent spam updates
- **Connection Pooling** - Reuse Supabase connections
- **Status Indicators** - Immediate feedback for user actions

---

## 🏗️ Deployment Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GitHub Repo   │    │     Vercel      │    │   Supabase      │
│                 │    │                 │    │                 │
│ • Code Storage  │───▶│ • Auto Deploy  │    │ • Database      │
│ • CI/CD Trigger │    │ • Edge CDN      │    │ • Real-time     │
│ • Version Tags  │    │ • SSL/HTTPS     │    │ • File Storage  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Global CDN    │
                       │                 │
                       │ • Fast Delivery │
                       │ • Cache Headers │
                       │ • Geo-routing   │
                       └─────────────────┘
```

---

## 🔍 Development Workflow

### Local Development
1. **Environment Setup** - API keys, database connection
2. **Hot Reloading** - Instant feedback during development
3. **Type Checking** - Continuous TypeScript validation
4. **Testing** - Unit tests (Vitest) + E2E tests (Playwright)

### Production Pipeline
1. **Git Push** - Triggers automated pipeline
2. **Build Process** - TypeScript compilation, asset optimization
3. **Testing** - All tests must pass before deployment
4. **Deployment** - Automatic deployment to Vercel
5. **Monitoring** - Performance and error tracking

---

## 🎯 Next Steps

**For New Developers:**
1. 📖 Read [API.md](./API.md) for service details
2. 🎨 Check [COMPONENTS.md](./COMPONENTS.md) for UI patterns
3. 🧪 See [TESTING.md](./TESTING.md) for testing approaches

**For Architecture Changes:**
1. Follow existing patterns and conventions
2. Update this documentation when making structural changes
3. Consider mobile-first impact of any modifications
4. Maintain real-time performance requirements