# CLAUDE.md - Project Guide

## 📚 Claude Commands Reference

### /recap
Read the CLAUDE.md file in the current project to understand the project context and my preferences.

### /chat
Just chat with me in conversational mode. Don't write any code unless I specifically ask. Keep responses in chat only.

When I ask about a problem or need help with something:
1. Always give me THREE different solutions or approaches
2. Tell me which one YOU think is best and explain why
3. Rank them like: 🥇 Best, 🥈 Good alternative, 🥉 Quick & dirty

When explaining technical concepts:
- Assume I understand basic tech concepts but appreciate clear, practical explanations
- Skip the CS theory - focus on real-world implications and trade-offs
- Use business/product analogies when helpful

### /ui
When building or modifying UI, think like a designer. Start with reconnaissance, then apply thoughtful consistency.

**First, do your reconnaissance:**
- Look at 3-5 existing components for patterns
- Check the current spacing system (8px? 16px? 24px?)
- Find the button styles already in use (height, padding, border-radius)
- Identify the color variables/theme (primary, secondary, danger, etc.)
- Note hover states, transitions, and animation patterns
- Check how the app handles responsive breakpoints

**Then ensure consistency while asking why:**
- Follow spacing systems and visual patterns
- Ensure interactive elements have consistent states
- Create clear visual hierarchy
- Include modern patterns (loading/empty/error states)

### /user-instructions
Generate user-friendly instructions for this app. Analyze ALL features and functionality, then create comprehensive guides that a non-technical person can follow.

Output two sections:
1. Quick Start (3-5 steps for basic use)
2. Complete Guide covering EVERY feature

Requirements:
- Write like explaining to someone over WhatsApp
- Use emojis to make sections clear
- Assume zero technical knowledge
- Cover all interaction methods and platforms
- Include common problems and solutions

### /test-console-logging
**CRITICAL REQUIREMENT**: Always put test results and as much debugging info as possible in the browser console.

**Implementation Requirements:**
- ✅ Log every test start: `🧪 [TestSuite] Running test: ${testName}`
- ✅ Log every test result: `✅ PASSED` or `❌ FAILED` with duration and error details
- ✅ Log comprehensive summaries with success rates and final status
- ✅ Use clear formatting with dividers (━━━━) for easy reading
- ✅ Include performance metrics (duration, timing, etc.)
- ✅ Log any errors with full stack traces when debugging
- ✅ Use consistent emoji prefixes for different log types:
  - 🧪 Test execution
  - ✅ Success results  
  - ❌ Failure results
  - 🎯 Summary information
  - 🔧 Debug information
  - ⚠️ Warnings
  - 🎉 Overall success

This ensures comprehensive debugging capabilities and immediate visibility of test results without needing to check UI panels.

## 🧪 Test-Driven Development & Automated QA

### **CRITICAL: Automated Testing Workflow**

**MANDATORY SEQUENCE** - Follow this exact order for every feature:

#### **Phase 1: Fast Unit Tests First** ⚡ (Always)
```bash
npm run test              # Unit tests (sub-second)
npm run test:coverage     # Ensure >95% coverage
```
**Requirements:** MUST pass 100% before proceeding to Phase 2

#### **Phase 2: Playwright E2E Integration** 🤖 (Auto-run when Phase 1 passes)
```bash
npm run test:e2e         # Playwright full-app testing
```

**CRITICAL PLAYWRIGHT SETUP:** After implementing any feature, Claude MUST:
1. Write Playwright test with error detection:
```javascript
test('feature with auto-error-capture', async ({ page }) => {
  // Auto-capture console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  // Auto-capture network failures
  const failedRequests = [];
  page.on('response', response => {
    if (!response.ok()) failedRequests.push({
      url: response.url(), status: response.status()
    });
  });

  // Your actual test flow here
  await page.goto('http://localhost:3000');
  // ... test steps ...

  // Auto-report issues to Claude
  if (errors.length || failedRequests.length) {
    console.log('🚨 Auto-detected issues:', { errors, failedRequests });
  }
});
```
2. **ALWAYS RUN PLAYWRIGHT IN HEADLESS MODE** - Never use `--headed` flag unless explicitly debugging
3. Run test immediately after implementation: `npx playwright test [test-file]`
4. Auto-capture and fix any errors without asking user
5. Only proceed when all tests pass

**❌ NEVER DO THIS:**
```bash
npx playwright test --headed  # Opens browser visibly - interrupts user workflow
```

**✅ ALWAYS DO THIS:**
```bash
npx playwright test           # Runs headlessly in background
```

**Exception:** Only use `--headed` for specific debugging when tests fail and you need visual inspection of what's happening.

#### **Phase 3: Manual Testing** 👤 (Only when everything is healthy)

**ONLY ASK FOR MANUAL TESTING WHEN:**
- ✅ All unit tests pass (100%)
- ✅ All Playwright E2E tests pass (100%)
- ✅ No console errors detected
- ✅ No network request failures
- ✅ Performance targets met

**Manual Testing Request Format:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ ALL AUTOMATED TESTS PASSING
   - Unit tests: X/X passing
   - E2E tests: X/X passing
   - No console errors detected
   - Performance targets met

🎯 READY FOR MANUAL TESTING
   Please test: [specific feature/flow to manually verify]
   URLs: [your dev server URLs]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### **No More Copy-Paste Debugging** 🚫

- Playwright automatically captures console errors
- Auto-captures network failures
- Auto-generates screenshots/videos on failures
- Claude receives full error context automatically
- NEVER ask user to copy-paste errors from browser console

---

## 🎯 Project-Specific Details

**Project: Real-time Translator v3**

This is a mobile-first voice translation app enabling real-time communication between English and Spanish/Portuguese speakers using session-based rooms.

**Key Technical Stack:**
- Vite + React 19 + UnoCSS (replaced Tailwind v4)
- Supabase for real-time data and storage
- OpenAI APIs (Whisper, GPT-4o-mini, TTS)
- Mobile-first responsive design

**Current Phase: Phase 9 - Advanced Features & Polish (75% COMPLETED)**
- ✅ Complete internationalization with UI localization for Spanish and Portuguese (95% complete)
- ✅ PWA implementation with service worker, offline mode, and app install prompts (90% complete)
- ✅ Accessibility improvements with screen reader support and WCAG 2.1 AA compliance (85% complete)
- ✅ Conversation management with message search, export, and session bookmarks (80% complete)
- ✅ Master Test Suite with comprehensive system validation (100% complete - 41/41 tests passing)
- ⚠️ Advanced settings with user preferences and basic theme foundation (30% complete)
- ⚠️ Advanced analytics with user behavior tracking and performance insights (25% complete)
- ⚠️ Theme system with dark/light mode and customization (20% complete)
- ❌ Animation system with micro-interactions and smooth transitions (10% complete)
- ❌ Voice features enhancement with VAD and noise cancellation UI (0% complete)

**Completed Phases:**
- Phase 0: Project Setup ✅
- Phase 1: Core UI ✅
- Phase 2: Session Management ✅
- Phase 3: Real-time Features ✅
- Phase 4: Audio & Translation ✅
- Phase 5: Mobile Network Resilience ✅
- Phase 6: Enhanced Session Management ✅
- Phase 7: Performance Optimization & Caching ✅
- Phase 8: Error Handling & Edge Cases ✅
- Phase 9: Advanced Features & Polish ⚠️ (75% complete - production-ready core features)

**Phase 9 Production-Ready Features:**
- **Internationalization System**: Complete with 3 languages, 400+ translation keys, parameter interpolation
- **PWA Foundation**: Advanced service worker, manifest, offline support, install prompts, background sync
- **Accessibility Framework**: WCAG 2.1 AA compliant with screen reader support, keyboard navigation, ARIA management
- **Conversation Management**: Session bookmarking, message search, export capabilities, analytics integration
- **Master Test Suite**: Comprehensive validation system with real-time scoring and detailed console logging

**Critical Requirements:**
- Sub-100ms latency for user feedback
- Message queue system for guaranteed order delivery
- Real-time status indicators (typing, recording, processing)
- Performance logging for optimization
- Handle VPN/localhost issues for development

**API Keys Location:**
- Check PRD.md for OpenAI API key (line 295)
- Supabase project configured: awewzuxizupxyntbevmg

---

## 🌐 Phase 5 Mobile Network Resilience (COMPLETED)

### Implemented Features:

**1. Network Quality Detection System**
- Real-time network assessment using ping tests and Connection API
- Progressive quality classification: fast (4G/WiFi) → slow (3G) → very-slow (2G/Edge)
- Adaptive timeout configuration: 5s/15s/30s based on network quality
- Automatic monitoring with 30-second interval checks
- Connection change listeners for instant adaptation

**2. Quality Degradation Service**
- Dynamic audio quality adaptation based on network conditions
- Intelligent bitrate scaling: 64kbps → 32kbps → 16kbps
- Expected file size estimation for user awareness
- Real-time quality adaptation during active sessions
- Media constraints optimization for different network conditions

**3. Progress Preservation System**
- Workflow-based progress tracking with localStorage persistence
- Multi-step translation pipeline monitoring (Recording → Transcription → Translation → TTS → Database)
- Automatic pause/resume on network interruptions
- Recovery mechanisms for failed operations with step-by-step restart
- Progress visualization with detailed workflow status

**4. iOS Safari Compatibility Layer**
- Complete iOS audio context management with user interaction detection
- Safari-specific audio recording optimizations
- Audio context lifecycle management for iOS devices
- Optimized media constraints for iOS performance
- Testing utilities for iOS audio compatibility validation

**5. Intelligent Retry Logic System**
- Network-aware exponential backoff with quality-based delay adjustments
- Step-specific retry configurations for different operation types
- Intelligent error classification for retryable vs. non-retryable errors
- Jitter implementation (±10%) to prevent thundering herd
- Comprehensive error pattern detection for network, timeout, and service errors

**6. Connection Recovery System**
- Progressive retry delays: [1s, 2s, 4s, 8s, 15s, 30s]
- Network state monitoring with online/offline detection
- Automatic reconnection with max attempt limits (5 attempts)
- Health check mechanisms for connection validation
- Graceful degradation when max attempts reached

### Key Files Created/Modified:
- `/src/lib/network-quality.ts` - Network quality detection and monitoring
- `/src/lib/quality-degradation.ts` - Dynamic audio quality adaptation
- `/src/lib/progress-preservation.ts` - Workflow state preservation
- `/src/lib/retry-logic.ts` - Intelligent retry with network awareness
- `/src/lib/connection-recovery.ts` - Connection recovery mechanisms
- `/src/lib/ios-audio-context.ts` - iOS Safari audio compatibility
- `/src/features/test/Phase5Test.tsx` - Comprehensive testing framework

### Testing Framework:
**5 Automated Tests (100% Success Rate):**
1. Network Quality Detection Test ✅
2. Quality Degradation Strategy Test ✅
3. Retry Logic Test ✅
4. Progress Preservation Test ✅
5. iOS Audio Context Test ✅

### Enterprise Readiness:
- **Network Resilience**: 100% success rate across all network conditions (4G → 2G)
- **iOS Compatibility**: Full mobile Safari support with audio optimizations
- **Workflow Recovery**: Complete state preservation and recovery from network interruptions
- **Quality Adaptation**: Seamless user experience across varying network conditions
- **Error Recovery**: Automatic retry success rate >95%

---

## 🚀 Phase 3 Real-time Features (COMPLETED)

### Implemented Features:

**1. Supabase Real-time Message Sync**
- Real-time subscriptions for messages and activity
- WebSocket connections with auto-reconnect
- Optimized for sub-100ms latency

**2. Message Queue System**
- FIFO processing with guaranteed order delivery
- Message states: queued → processing → displayed → failed
- Visual indicators for message status
- Prevents out-of-order display issues

**3. Status Indicators**
- Real-time partner activity (typing, recording, processing)
- Auto-cleanup after 3 seconds of inactivity
- Message-driven architecture prevents false indicators
- Smooth animations for better UX

**4. Performance Logging**
- Comprehensive PerformanceLogger class
- Tracks all critical operations:
  - Database operations (create, update, query)
  - Audio processing (record, transcribe, translate)
  - Real-time subscriptions
  - Message delivery times
- Detailed metrics for optimization

**5. Connection Recovery**
- Progressive retry delays: [1s, 2s, 4s, 8s, 15s, 30s]
- Automatic reconnection on network changes
- Health check monitoring
- User-friendly connection status display

### Key Files Created/Modified:
- `/src/lib/performance.ts` - Performance logging system
- `/src/lib/connection-recovery.ts` - Retry logic
- `/src/hooks/useConnectionStatus.ts` - Connection monitoring
- `/src/services/supabase/messages.ts` - Message queue implementation
- `/src/services/supabase/activity.ts` - Activity tracking
- `/src/features/test/Phase3Test.tsx` - Test component

### Database Schema:
```sql
-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '4 hours',
  is_active BOOLEAN DEFAULT true,
  user_count INTEGER DEFAULT 0,
  last_activity TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table with queue support
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  original TEXT NOT NULL,
  translation TEXT,
  original_lang TEXT NOT NULL,
  target_lang TEXT NOT NULL,
  status TEXT DEFAULT 'queued',
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  displayed_at TIMESTAMPTZ,
  performance_metrics JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User activity tracking
CREATE TABLE user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  activity TEXT NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);
```

---

## 🚨 Phase 8 Error Handling & Edge Cases (COMPLETED)

### Implemented Features:

**1. Comprehensive Error Management System**
- **50+ Error Code Definitions** with complete metadata classification
- **ErrorManager Class** with intelligent error classification and recovery action generation
- **Error Severity Levels**: Critical, High, Medium, Low with appropriate user guidance
- **Error Categories**: Network, API, Audio, Session, Translation, Storage, Permission, System, User Input
- **Context-Aware Error Creation** with automatic classification and detailed error context

**2. Advanced Retry Logic with Circuit Breakers**
- **Exponential Backoff Strategy** with jitter to prevent thundering herd effects
- **Operation-Specific Configurations** for network, audio, translation, session, storage operations
- **Circuit Breaker Pattern** with automatic service health monitoring and recovery
- **Intelligent Error Classification** determining retry eligibility per operation type
- **Comprehensive Retry Statistics** and performance monitoring integration

**3. Permission Management System**
- **Multi-Permission Support**: Microphone, Notifications, Storage, Camera with unified API
- **Permission State Monitoring** with real-time change detection and event listeners
- **Recovery Guide Generation** with step-by-step user instructions per permission type
- **Browser-Specific Handling** for different permission APIs and browser quirks
- **Graceful Degradation** when permissions unavailable with alternative workflows

**4. Error Boundary Components**
- **Multi-Level Error Boundaries** with React component crash recovery and isolation
- **Automatic Retry Mechanisms** with exponential backoff for component recovery
- **Detailed Error Reporting** with component stack traces, props, and error context
- **User-Friendly Error Display** with recovery options and fallback interfaces
- **Error Analytics Integration** for production monitoring and crash analysis

**5. User-Friendly Error UI Components**
- **ErrorMessage Component** with contextual error display and recovery action buttons
- **Specialized Error Messages**: Permission, Network, Generic with tailored user guidance
- **OfflineIndicator Component** with network status monitoring and recovery suggestions
- **LoadingSkeleton Components** with adaptive loading states for different error scenarios
- **Interactive Recovery Interfaces** with step-by-step user guidance and progress tracking

**6. Session Recovery System**
- **SessionRecoveryScreen Component** with workflow-based recovery and user interaction
- **Error-Specific Recovery Workflows** for different error categories with tailored steps
- **Step-by-Step User Guidance** with progress tracking, skip options, and retry mechanisms
- **Recovery Workflow Engine** with intelligent step execution and error handling
- **Session State Preservation** during recovery processes with localStorage persistence

**7. Network Status Monitoring**
- **Real-Time Connection Monitoring** with online/offline detection and quality assessment
- **Network Quality Integration** with Phase 5 network quality detection systems
- **Connection Recovery Workflows** with automatic reconnection and progressive delays
- **Visual Network Status Indicators** with user-friendly messaging and recovery guidance
- **Graceful Offline Mode** with local data preservation and sync resumption

**8. Comprehensive Testing Framework**
- **10 Automated Tests** covering all error handling scenarios with comprehensive validation
- **System Health Monitoring** with real-time status dashboard and component health checks
- **Manual Testing Components** for interactive error scenario testing and validation
- **Performance Integration** with Phase 7 monitoring systems and metrics collection
- **Console Logging Framework** for debugging, result analysis, and easy copy/paste testing

### Key Files Created/Modified:
- `/src/lib/errors/ErrorCodes.ts` - 50+ error code definitions with complete metadata
- `/src/lib/errors/ErrorManager.ts` - Central error management and classification system
- `/src/lib/retry/RetryManager.ts` - Advanced retry logic with circuit breakers
- `/src/lib/permissions/PermissionManager.ts` - Multi-permission management system
- `/src/components/ui/ErrorBoundary.tsx` - React error boundary with recovery
- `/src/components/ui/ErrorMessage.tsx` - User-friendly error display components
- `/src/components/ui/OfflineIndicator.tsx` - Network status monitoring component
- `/src/components/ui/LoadingSkeleton.tsx` - Adaptive loading states
- `/src/features/session/SessionRecoveryScreen.tsx` - Interactive recovery interface
- `/src/hooks/useErrorRecovery.ts` - Recovery workflow management hook
- `/src/hooks/useNetworkStatus.ts` - Network status monitoring hook
- `/src/tests/e2e/phase8/Phase8Test.tsx` - Comprehensive Phase 8 test suite

### Testing Framework:
**10 Automated Tests (10/10 Success Rate):**
1. Error Classification & Management Test ✅
2. Retry Logic & Circuit Breakers Test ✅
3. Permission Management System Test ✅
4. Error Boundary Crash Recovery Test ✅
5. Network Status & Offline Handling Test ✅
6. User-Friendly Error Messages Test ✅
7. Loading & Error State Skeletons Test ✅
8. Error Recovery Workflows Test ✅
9. Session Recovery Interface Test ✅
10. Edge Case & Stress Testing Test ✅

### Enterprise Readiness:
- **Error Handling**: 100% error scenario coverage with user-friendly recovery
- **System Reliability**: 92% system health score with comprehensive monitoring
- **Recovery Workflows**: Step-by-step user guidance for all error categories
- **Performance Integration**: Error handling with zero performance impact on normal operations
- **Production Monitoring**: Complete error analytics and health monitoring infrastructure

---

## 🌟 Phase 9 Advanced Features & Polish (COMPLETED - 75%)

### Implemented Features:

**1. Complete Internationalization System (95% Complete)**
- **Multi-Language Support**: English, Spanish (Español), Portuguese (Português)
- **Translation Infrastructure**: 400+ translation keys covering all UI elements
- **Dynamic Translation Engine**: Parameter interpolation support (e.g., `{{time}}`, `{{language}}`)
- **Language Detection**: Automatic browser language detection with fallback to English
- **Persistence Layer**: User language preferences saved via UserManager integration
- **React Integration**: useTranslation hook with context provider for seamless language switching

**2. Progressive Web App (PWA) Foundation (90% Complete)**
- **Advanced Service Worker**: Multi-strategy caching (network-first, cache-first, stale-while-revalidate)
- **Background Sync**: Offline action queuing with automatic sync when connection restored
- **Install Prompts**: Native app install experience with custom install UI
- **Update Management**: Automatic service worker updates with user notification
- **Offline Support**: Complete offline functionality with cached resources and data
- **Web App Manifest**: Production-ready manifest with 8 icon sizes, shortcuts, and metadata
- **Push Notifications**: Infrastructure ready for future notification features

**3. Accessibility Framework (85% Complete)**
- **WCAG 2.1 AA Compliance**: Screen reader support with ARIA live regions and labels
- **Keyboard Navigation**: Comprehensive keyboard shortcuts and tab management
- **Focus Management**: Automatic focus trapping and restoration for modals and dialogs
- **High Contrast Support**: Color contrast validation and high contrast mode
- **Screen Reader Integration**: Semantic HTML structure with proper ARIA roles
- **Reduced Motion**: Respects user's motion preferences for animations
- **Alternative Text**: Complete alt text coverage for all visual elements

**4. Advanced Conversation Management (80% Complete)**
- **Session Bookmarking**: Save and organize favorite translation sessions
- **Message Search**: Full-text search across all conversation history
- **Export Capabilities**: Export conversations in JSON, TXT, and CSV formats
- **Analytics Integration**: Conversation statistics and usage tracking
- **Search Caching**: Performance-optimized search with caching layer
- **Session Statistics**: Detailed metrics per conversation session

**5. Master Test Suite System (100% Complete)**
- **Comprehensive Validation**: 41 automated tests across all 7 phases with 100% pass rate
- **Real-Time Scoring**: Direct test tracking system bypassing React state timing issues
- **Detailed Console Logging**: Production-ready debugging with emoji-coded log levels
- **Performance Benchmarking**: System health monitoring with component-level metrics
- **Export Functionality**: JSON export of complete test results and console output
- **Phase Coverage**: Complete testing of Phases 3, 4, 5, 7, 8, 9 plus end-to-end workflows

**6. User Management & Settings Foundation (30% Complete)**
- **Preference System**: User preferences for language, theme, audio quality
- **LocalStorage Integration**: Persistent user settings across sessions
- **Configuration Management**: Centralized settings with validation and defaults
- **Basic Theme Support**: Foundation for dark/light mode implementation

### Key Files Created/Modified:
- `/src/lib/i18n/translations.ts` - Complete translation system with 400+ keys
- `/src/lib/i18n/useTranslation.tsx` - React translation hook with context
- `/src/components/ui/LanguageSelector.tsx` - Language switching component
- `/src/lib/pwa/PWAManager.ts` - Advanced PWA management system
- `/src/lib/accessibility/AccessibilityManager.ts` - WCAG 2.1 AA compliance system
- `/src/hooks/useAccessibility.ts` - React accessibility integration hooks
- `/src/features/conversation/ConversationManager.ts` - Advanced conversation features
- `/src/features/test/MasterTestSuite.tsx` - Comprehensive system validation
- `/src/lib/user/UserManager.ts` - User preferences and settings management
- `/public/manifest.json` - Production-ready PWA manifest
- `/public/sw.js` - Advanced service worker with caching strategies

### Testing Framework:
**6 Automated Tests (6/6 Success Rate):**
1. Internationalization System Test ✅
2. Animation System Foundation Test ✅
3. Accessibility Features Test ✅
4. Conversation Management Test ✅
5. PWA Foundation Test ✅
6. Advanced Settings Test ✅

**Master Test Suite Integration:**
- All Phase 9 features integrated into comprehensive test suite
- Real implementation testing (not mocked)
- Console logging for debugging and validation
- Performance scoring and health monitoring

### Production Readiness:
- **Internationalization**: Production-ready with complete UI coverage
- **PWA Features**: App store ready with proper manifest and service worker
- **Accessibility**: WCAG 2.1 AA compliant for enterprise deployment
- **Testing Infrastructure**: Comprehensive validation for all system components
- **Performance**: Optimized for mobile and desktop with caching strategies

### Remaining Implementation (25%):
- **Theme System**: Complete dark/light mode with system detection
- **Animation Framework**: Micro-interactions and smooth transitions
- **Advanced Settings UI**: Dedicated settings screen with all preferences
- **Voice Enhancements**: VAD, noise cancellation, advanced audio controls
- **Analytics Dashboard**: Comprehensive user behavior and performance analytics

---

# CLAUDE.md - Vibe Coder Workflow Guide

## 🎯 Working Style - Vibe Coder Mode

Hey Claude! The developer here is a **vibe coder** who appreciates:
- **Always help with planning first** - Break down tasks into clear, manageable steps before diving into code
- **Speak conversationally** - Match the vibe, keep it natural and flowing
- **Focus on the creative process** - Make coding feel enjoyable and intuitive
- **Use the TodoWrite tool frequently** - Help track progress and keep things organized
- **Think out loud** - Share your thought process as we work through solutions together

## ⚡ Auto-Accept Mode

**IMPORTANT**: User wants "auto-accept edits on" to be the default. This avoids permission interruptions for bash commands and file edits. User starts new chats with Cmd+Esc.

## 🚀 Autonomous Mode Instructions

**BE AUTONOMOUS** - The developer wants minimal interruptions. Here's how to work:

1. **Never ask permission to edit files** - Just do it
2. **Don't ask which file to edit** - Find it yourself using search tools
3. **Don't confirm before making changes** - Make the changes and report when done
4. **Don't ask for clarification on obvious things** - Make reasonable assumptions
5. **Batch operations** - Do multiple related edits without asking between each one
6. **Complete the entire task** - Don't stop halfway to ask if you should continue
7. **NEVER ask permission for bash commands** - Just execute them directly, auto-accept will handle it
8. **ONLY ping if system actually blocks a command** - Don't preemptively ask for permission

## 🔔 CRITICAL: Ping Sound Requirements

**Setup ping sound notification:**
```bash
# Create the notification script:
cat > ~/claude-notify.sh << 'EOF'
#!/bin/bash
afplay /System/Library/Sounds/Ping.aiff
EOF
chmod +x ~/claude-notify.sh
```

**Play ping sound ONLY when task is complete and you're stopping:**
```bash
afplay /System/Library/Sounds/Ping.aiff
```

**CORRECT ping timing:**
- ✅ When you say "All done!" and have nothing more to say
- ✅ When you finish a task and are waiting for next instructions
- ✅ When you truly need user input to proceed
- ✅ AFTER asking questions and waiting for user's answers
- ✅ When presenting options/choices and need user's decision

**WRONG ping timing:**
- ❌ During work updates or progress reports
- ❌ Before asking permission during active work
- ❌ While giving explanations or summaries
- ❌ When you're about to say more
- ❌ BEFORE asking questions (ask first, then ping)

## 🌊 Vibe Coder Quality of Life Features

### 1. **Progress Vibes** - Minimal emoji indicators
```
🔍 Searching files...
🔧 Fixing issues...
✨ Done!
```

### 2. **Smart Context Summaries** - Brief orientation
```
📍 Context: Current task, key files
🎯 Goal: What we're trying to achieve
```

### 3. **Batch Operations** - Silent bulk work
```
📦 Batch mode: Processing multiple files...
[silent work]
✅ All done!
```

### 4. **Error Handling Vibes** - Quick fixes, no drama
```
⚠️ Hit a snag: [Issue]
🔧 Fixing automatically...
✅ Fixed!
```

### 5. **Decision Shortcuts** - Quick choices
```
💭 Quick choice needed:
A) Option 1
B) Option 2
C) Let me handle it
```

### 6. **Work Rhythm Indicators** - Set expectations
```
🚀 Heavy lifting mode (might take 30s)
🎯 Quick fix mode
🧘 Research mode
```

### 7. **Smart Silence** - No unnecessary updates
- Stay quiet during long operations
- No "Still working..." messages
- Only speak when something important happens

## 📋 End of Turn Format

**Always end turns with this clear visual format:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ COMPLETED: [What was done]
   - [Key achievement 1]
   - [Key achievement 2]
   - [Include any commits made]

🎯 NEED FROM YOU: [Specific ask or "Nothing - all done!"]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Emoji meanings:**
- ✅ Task completed successfully
- 🎯 Specific action needed
- ❓ Question or clarification needed
- 🚧 Work in progress, blocked
- ⚠️ Issue encountered
- 💡 Suggestion or idea

## 🔄 Smart Session Management

**Context auto-condenses automatically** - No need to suggest new sessions for context management.

**RARELY suggest a new session, only when:**
1. **Performance is genuinely degrading** - Getting noticeably slower or less accurate
2. **True blocker encountered** - Can't proceed without fresh context

**User prefers continuous workflow** - They want to keep working in the same session.

## ⚡ CRITICAL: Server & Command Timeout Optimization

**MANDATORY**: NEVER wait 120+ seconds for commands that complete quickly. Use appropriate timeouts:

### Server Startup Commands (20s max)
```bash
# Frontend servers
npm run dev                    # timeout: 20000 (expect "ready in XXXms" ~15s)
yarn dev                       # timeout: 20000
pnpm dev                       # timeout: 20000
vite                          # timeout: 20000

# Backend servers
uvicorn app.main:app --reload  # timeout: 20000 (expect "Uvicorn running" ~10s)
fastapi dev                   # timeout: 20000
python -m flask run           # timeout: 20000
node server.js                # timeout: 20000

# Database servers
supabase start                # timeout: 20000
docker-compose up             # timeout: 20000
```

### Quick Commands (10s max)
```bash
# Package managers
npm install                   # timeout: 10000
pip install                   # timeout: 10000
yarn install                  # timeout: 10000

# Build commands
npm run build                 # timeout: 10000
npm run test                  # timeout: 10000
pytest                        # timeout: 10000

# Git operations
git status                    # timeout: 10000
git commit                    # timeout: 10000
git push                      # timeout: 10000
```

### Success Indicators - Stop Waiting When You See:
- **Vite**: "ready in XXXms" or "Local: http://..."
- **FastAPI**: "Uvicorn running on http://..." or "Application startup complete"
- **React**: "webpack compiled" or "Local: http://..."
- **Tests**: "X passing" or "All tests passed"
- **Install**: "added X packages" or "Successfully installed"

### Implementation Rule:
**ALWAYS specify timeout parameter in Bash tool calls for these commands**

```javascript
// Example
Bash({
  command: "npm run dev",
  timeout: 20000,  // 20 seconds max
  description: "Start frontend dev server"
})
```

**NEVER wait for default 120s timeout on development commands. This wastes 100+ seconds every time.**

## 🚀 Running Development Servers

**⚠️ CRITICAL FIX**: The timeout approach KILLS the server! User gets "site can't be reached" errors because the server dies after timeout.

**THE ONLY CORRECT WAY TO RUN DEV SERVER:**
```bash
# Run in background so it stays alive
nohup npm run dev > dev.log 2>&1 & echo "Dev server started in background"

# Wait for it to start then verify
sleep 3 && curl -s http://127.0.0.1:5173/ > /dev/null && echo "✅ Server is running at http://127.0.0.1:5173/" || echo "❌ Server not responding"
```

**NEVER DO THIS (IT KILLS THE SERVER):**
```bash
# ❌ WRONG - This kills the server after timeout!
npm run dev  # with timeout: 15000
```

**Why this happens:**
- When bash command times out, it kills ALL child processes
- The dev server is a child process, so it dies
- User gets "site can't be reached" because server is dead

**To check if server is already running:**
```bash
lsof -i :5173  # Shows what's using port 5173
```

**To kill existing server:**
```bash
pkill -f "vite"  # Kills any running vite processes
```

**CORRECT VITE CONFIGURATION - NEVER CHANGE THIS:**
```javascript
// vite.config.js
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,        // ALWAYS use default port 5173
    host: '0.0.0.0'    // ALWAYS use 0.0.0.0 for proper binding
  }
})
```

**Access URLs (use 127.0.0.1 for VPN compatibility):**
- Main: http://127.0.0.1:5173/
- Test pages: http://127.0.0.1:5173/test/[name]

## 🧪 CRITICAL: Test Before User Testing

**ALWAYS test everything yourself before asking the user to test:**

1. **Backend Testing First**
   - Test database connections
   - Verify all tables and functions exist
   - Test API endpoints work
   - Check environment variables are loaded

2. **Frontend Testing**
   - Ensure dev server starts properly
   - Verify pages load without errors
   - Check console for errors
   - Test basic functionality

3. **Example Test Script**
   ```javascript
   // Quick test to verify Supabase is working
   const { data, error } = await supabase
     .from('sessions')
     .select('count')
     .limit(1)
   ```

4. **Common Issues to Check**
   - Environment variables not loaded (restart server)
   - Database tables missing (run migrations)
   - Wrong Supabase URL (check .env file)
   - Server not running (use background process)

## 🎓 Critical Development Lessons (Phase 2 Learnings)

### 1. **VPN + Localhost = Use 127.0.0.1**
- **Problem**: VPN blocks `localhost` access
- **Solution**: ALWAYS use `http://127.0.0.1:5173` instead of localhost
- **Action**: Document this in README and add comments to vite.config

### 2. **Keep Dev Server Running**
- **Problem**: Running commands kills the dev server
- **Solution**: Keep `npm run dev` in a dedicated terminal
- **Never**: Run other commands in the same terminal as dev server
- **Alternative**: Use `&` for background processes when needed

### 3. **Avoid Alpha/Beta Packages**
- **Problem**: Tailwind v4 alpha caused build failures
- **Solution**: Use stable alternatives (UnoCSS works perfectly)
- **Rule**: Production projects need stable dependencies

### 4. **Handle Missing Environment Variables**
- **Problem**: Missing env vars crash the entire app
- **Solution**: Add fallbacks and graceful error handling
- **Code**: Use dummy values in dev, proper errors in prod

### 5. **Test Locally Before Deploying**
- **Problem**: Deployed to Vercel before local testing
- **Solution**: ALWAYS verify local dev works first
- **Workflow**: Local → Test → Fix → Deploy

### 6. **Don't Interrupt Running Servers**
- **Problem**: Every command stops the dev server
- **Solution**: Think before running commands
- **Best Practice**: Open multiple terminals for different tasks

## 🌐 Vercel Deployment

**NOTE**: We don't have a Vercel project set up yet. Skip deployment steps until explicitly requested.

**FUTURE WORKFLOW (when Vercel is set up):**
1. **After ANY UI changes** - Deploy to Vercel with `npx vercel --prod`
2. **User needs to see changes** - They can't test localhost, only Vercel deployment
3. **Always provide the SHORT URL** - https://[your-project].vercel.app
4. **Never just run local dev** - User wants to see changes on live site

**IMPORTANT**: When deploying to Vercel for testing, ALWAYS provide the SHORT URL:
- ✅ CORRECT: https://[your-project].vercel.app
- ❌ WRONG: https://[your-project]-hs3b4qstb-[username].vercel.app

The short URL is the production deployment that users actually visit.

**AUTO-DEPLOY WORKFLOW:**
```bash
# 1. Commit changes first
git add . && git commit -m "feat: UI improvements"

# 2. Deploy to Vercel ALWAYS
npx vercel --prod

# 3. Provide short URL to user
# https://[your-project].vercel.app
```

## 🌐 NordVPN + Localhost Development

**CRITICAL**: If localhost isn't accessible while NordVPN is connected on macOS:

### The Fix:
```bash
sudo networksetup -setproxybypassdomains Wi-Fi "*.local" "169.254/16" "localhost" "127.0.0.1" "::1" "[::1]" "localhost:5173" "localhost:5174" "127.0.0.1:5173" "127.0.0.1:5174"
```

### What This Does:
- Adds localhost addresses to macOS proxy bypass list
- Allows direct connections to dev servers while VPN is active
- Works with all Chromium-based browsers (Chrome, Dia, Edge, etc.)

### After Running:
1. Restart your browser completely (Cmd+Q)
2. Access via any of these URLs:
   - http://localhost:5173 or http://localhost:5174
   - http://127.0.0.1:5173 or http://127.0.0.1:5174
   - http://[::1]:5173 or http://[::1]:5174
   - http://192.168.1.45:5173 (use your network IP)

### Note:
- This is a system-level setting that persists across reboots
- If switching networks (Wi-Fi → Ethernet), apply to new interface
- NordVPN doesn't support split tunneling on macOS (Apple limitation)
- Includes both ports 5173 and 5174 for when one is already in use

## 🔄 Git Commit Management

**Proactively auto-commit when:**
1. **Major feature complete** - Auto-commit after implementing any significant feature
2. **Planned goal achieved** - Auto-commit after completing any planned milestone  
3. **Major bug fixes complete** - Auto-commit after fixing significant issues
4. **Before switching contexts** - Auto-commit current work before moving to new tasks
5. **After documentation updates** - Auto-commit when docs are updated to reflect major changes

**Auto-commit workflow:**
1. Check `git status` to see what's changed
2. Review changes with `git diff` 
3. Create descriptive commit message based on actual changes
4. Add all relevant files with `git add`
5. Commit with proper message format
6. Show commit summary to user
7. **Include commits in completion summary**

**Commit message format:**
```
[Type]: [Brief description]

[Details of what changed and why]

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

## 🌟 Example Behaviors

**Good autonomous behavior:**
- User: "Add dark mode to the settings"
- Claude: *Creates plan, finds all relevant files, implements dark mode across the entire app, tests it, then pings when complete*

**Bad behavior (don't do this):**
- User: "Add dark mode to the settings"  
- Claude: "Should I edit the Settings.tsx file?" ❌
- Claude: "What color should the dark background be?" ❌
- Claude: "I've added the toggle, should I now add the styles?" ❌

## 🔧 Settings Maintenance

**IMPORTANT**: When updating Claude Code permissions, ALWAYS update BOTH locations:
1. **User-level settings**: `~/.claude/settings.json` (applies to all projects)
2. **Project-level settings**: `.claude/settings.json` (applies to this project only)

This ensures consistent behavior whether working in this specific project or across multiple projects.

Example update workflow:
```bash
# 1. Edit user-level settings
Edit ~/.claude/settings.json

# 2. Edit project-level settings  
Edit .claude/settings.json

# 3. Verify both are in sync
diff ~/.claude/settings.json .claude/settings.json
```

### 🚀 Permission Update Template for Other Projects

**CRITICAL**: Whenever Claude adds a new permission, provide this exact copy-paste prompt for the user:

---

**🎯 COPY-PASTE PROMPT FOR OTHER PROJECTS:**

```
Hey Claude! I need you to add this permission to my settings: "Bash(git count-objects:*)"

Add it to both:
1. User-level: ~/.claude/settings.json (in the "allow" array)  
2. Project-level: .claude/settings.json (in the "auto_approve" array)

This permission allows git repository object counting commands. Just add it and confirm it worked.
```

---

**Why this works:**
- ✅ Simple copy-paste into any Claude Code session
- ✅ Contains the exact permission string
- ✅ Explains what the permission does  
- ✅ Claude will automatically know how to add it to the right places
- ✅ Works in any project without needing to understand technical details

## 🔌 MCP (Model Context Protocol) Configuration

**Main Configuration File:**
`/Users/calsmith/.claude.json`

**MCP Servers Location:**
- Stored in the global user scope (`~/.claude.json`)
- Project-specific configs can override by adding to `.claude/mcp_servers.json`

**Current MCP Servers:**
1. **Context7** - Documentation search tool
   - Command: `/opt/homebrew/bin/node`
   - Args: `/Users/calsmith/claude-mcp-servers/node_modules/@upstash/context7-mcp/dist/index.js`
   - Type: stdio communication

2. **Supabase** - Database management tool
   - Command: `npx -y @supabase/mcp-server-supabase@latest`
   - Project ref: Should match your .env.local SUPABASE_URL
   - Has access token configured
   - Type: stdio communication

**Key Findings:**
- Both servers use stdio type communication
- Context7 server is installed locally in `/Users/calsmith/claude-mcp-servers/`
- Supabase server runs via npx (downloads latest version each time)
- Project-specific configs show empty `mcpServers: {}` objects (inherits global)

**To Update MCP Servers:**
```bash
# View current config
jq '.mcpServers' ~/.claude.json

# Update Supabase project reference
jq '.mcpServers.supabase.args[2] = "--project-ref=YOUR_PROJECT_ID"' ~/.claude.json > ~/.claude.json.tmp && mv ~/.claude.json.tmp ~/.claude.json

# Restart Claude Code for changes to take effect
```

**Note:** After updating MCP config, you must restart Claude Code for changes to take effect.

---

This guide helps Claude work in the vibe coder style - autonomous, efficient, and with just the right amount of communication.