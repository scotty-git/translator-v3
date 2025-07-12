# 🎯 CLAUDE.md - Project Guide v3.0

> **Your AI coding companion's complete guide to the translator-v3 project**

---

## 🎯 CORE WORKING STYLE

### 🌟 Vibe Coder Mode
Hey Claude! The developer here is a **vibe coder** who appreciates:

```
🎨 CREATIVE PROCESS FIRST
├── Always help with planning first
├── Break down tasks into clear, manageable steps
├── Think out loud and share your process
└── Make coding feel enjoyable and intuitive

💬 CONVERSATIONAL STYLE
├── Match the vibe, keep it natural
├── Speak like a coding buddy, not a robot
├── Use the TodoWrite tool frequently
└── Focus on collaboration over commands
```

### 🚀 Autonomous Mode Instructions
**BE AUTONOMOUS** - The developer wants minimal interruptions:

```
🎯 AUTONOMOUS OPERATION RULES
├── 1. NEVER ask permission to edit files → Just do it
├── 2. DON'T ask which file to edit → Find it yourself using search tools
├── 3. DON'T confirm before making changes → Make changes and report when done
├── 4. DON'T ask for clarification on obvious things → Make reasonable assumptions
├── 5. BATCH operations → Do multiple related edits without asking between each
├── 6. COMPLETE the entire task → Don't stop halfway to ask if you should continue
├── 7. NEVER ask permission for bash commands → Just execute them directly
└── 8. ONLY ping if system actually blocks a command → Don't preemptively ask
```

### 📋 End of Turn Format
**Always end turns with this clear visual format:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ COMPLETED: [What was done]
   - [Key achievement 1]
   - [Key achievement 2]
   - [Include any commits made]
   - [OPTIONAL: Testing performed and results]
     • Unit tests: X/X passing
     • E2E tests: X scenarios validated on production
     • Accessibility: 0 violations in light/dark modes
     • Screenshots: UI/UX verified across themes

🎯 NEED FROM YOU: [Specific ask or "Nothing - all done!"]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 📊 PROJECT STATUS

### 🎯 Project Overview
**Real-time Translator v3** enables real-time communication between English and Spanish/Portuguese speakers using session-based rooms.

### 🛠️ Technical Stack
```
🏗️ CORE ARCHITECTURE
├── ⚡ Vite (Build tool)
├── ⚛️ React 18.3.1 (UI framework)
├── 🎨 UnoCSS (Styling - replaced Tailwind v4)
├── 🗄️ Supabase (Real-time data and storage)
├── 🤖 OpenAI APIs (Whisper, GPT-4o-mini, TTS)
└── 📱 Mobile-first responsive design
```

### 🔐 Environment Configuration
**Required Environment Variables:**
```bash
# OpenAI Configuration
VITE_OPENAI_API_KEY=sk-...                    # Main OpenAI API key
VITE_OPENAI_ORG_ID=org-...                    # Organization ID (optional)

# Supabase Configuration  
VITE_SUPABASE_URL=https://xxx.supabase.co     # Project URL
VITE_SUPABASE_ANON_KEY=eyJ...                 # Anonymous/public key

# Development
NODE_ENV=development                           # Development mode
VITE_DEV_MODE=true                            # Enable dev features
```

**📍 Configuration Files:**
- `.env.local` - Local development (gitignored)
- `.env.example` - Template with dummy values
- **Production URL**: https://translator-v3.vercel.app
- **Supabase Project**: awewzuxizupxyntbevmg

---

## 🏗️ PROJECT STRUCTURE

> **Clean Service-Based Architecture** - Follow these established patterns for all new features

### 📁 Directory Organization
```
src/
├── features/                    # Feature-based modules
│   ├── translator/             # Core translation functionality
│   │   ├── SessionTranslator.tsx      # Multi-user session mode
│   │   ├── solo/                      # Solo translator mode
│   │   └── shared/                    # TranslatorShared component library
│   ├── messages/               # Message display and management
│   ├── home/                   # Landing page components
│   ├── conversation/           # Conversation management
│   ├── settings/               # App settings and preferences
│   └── test/                   # In-app test suites
├── services/                   # Single-responsibility services
│   ├── session/               # SessionStateManager (singleton)
│   ├── queues/                # MessageQueueService (offline queuing)
│   ├── pipeline/              # TranslationPipeline (audio processing)
│   ├── presence/              # PresenceService (activity indicators)
│   ├── realtime/              # RealtimeConnection (Supabase channels)
│   ├── audio/                 # Audio recording and processing
│   └── openai/                # OpenAI API integrations
├── lib/                       # Shared utilities and libraries
│   ├── accessibility/         # WCAG 2.1 AA compliance tools
│   ├── i18n/                  # 5-language internationalization
│   ├── pwa/                   # Progressive Web App features
│   ├── user/                  # User preferences (font sizing, etc.)
│   ├── cache/                 # API response caching
│   └── network-quality.ts     # Connection monitoring
└── components/                # Shared UI components
    ├── ui/                    # Basic UI primitives
    └── layout/                # Layout components
```

### 🎯 Architectural Patterns

**1. Service Injection Pattern**:
```typescript
// Clean dependency injection for testability
const [messageQueueService] = useState(() => new MessageQueueService())
const [presenceService] = useState(() => new PresenceService())

// Services are injected, not created globally
<SoloTranslator messageQueueService={messageQueueService} />
```

**2. Singleton Pattern for Global State**:
```typescript
// SessionStateManager example - use for app-wide state
export class SessionStateManager implements ISessionStateManager {
  private static instance: SessionStateManager
  
  static getInstance(): SessionStateManager {
    if (!SessionStateManager.instance) {
      SessionStateManager.instance = new SessionStateManager()
    }
    return SessionStateManager.instance
  }
}
```

**3. Feature-Based Organization**:
- Group related components, hooks, and utilities together
- Each feature should be self-contained with clear boundaries
- Use the `shared/` pattern for reusable components within features

### 📦 Core Files & Utilities

**Essential Service Files:**
- `src/services/session/SessionStateManager.ts` - Central session state management
- `src/services/realtime/RealtimeConnection.ts` - Supabase channel management
- `src/services/pipeline/TranslationPipeline.ts` - Audio processing pipeline
- `src/features/translator/shared/` - TranslatorShared component library

**Key Configuration:**
- `vite.config.ts` - Build configuration with path aliases
- `uno.config.ts` - UnoCSS atomic styling configuration
- `playwright.config.ts` - E2E testing setup
- `vitest.config.ts` - Unit testing configuration

---

## 🚨 CRITICAL: PLAYWRIGHT TEST CORRUPTION PREVENTION

> **⚠️ NEVER RUN PLAYWRIGHT TESTS DIRECTLY - IT WILL BREAK CLAUDE CODE!**

### The Problem
Running `npx playwright test` outputs Unicode characters (emojis, symbols) that corrupt `~/.claude.json`, causing:
- `API Error: 400 "no low surrogate in string"`
- Complete Claude Code session failure
- Loss of work and conversation history

### The Solution: ALWAYS Use Sanitized Testing

```bash
# ❌ NEVER DO THIS:
npx playwright test                    # WILL CORRUPT CLAUDE.JSON!

# ✅ ALWAYS DO THIS:
./scripts/safe-test-smart.sh           # Safe, sanitized output
npm run test:e2e                       # Uses sanitizer automatically
npm run test:playwright                # Uses sanitizer automatically
```

### What the Sanitizer Does
The `safe-test-smart.sh` script converts ALL non-ASCII characters to safe labels:
- 🏠 → `[EMOJI]`
- → → `[ARROW]`
- ✅ → `[SYM]`
- é → `e` (strips accents)
- Any other Unicode → `[U+XXXX]`

### If You Forget and Get Corrupted
1. Exit Claude Code (Cmd+Esc)
2. Run: `python3 scripts/clean-claude-history.py --max-entries 0`
3. Start a new Claude session
4. Use the sanitizer from now on!

---

## ⚙️ DEVELOPMENT WORKFLOW

### ⚡ Bash Command Rule
**ALWAYS use 15-second timeout unless command specifically needs longer:**
- Add `timeout: 15000` to every bash command by default
- Most commands (npm run dev, npm run test, git commit) complete within 5-15 seconds
- Only use longer timeouts for specific cases like `npx vercel --prod` (60 seconds)

### 🧪 Test-Driven Development Protocol
**⚠️ MANDATORY SEQUENCE** - Follow this exact order for every feature:

```
🎯 TESTING PIPELINE
├── 1. ⚡ Phase 1: Fast Unit Tests (Local)
│   ├── npm run test              # Unit tests (sub-second)
│   └── npm run test:coverage     # Ensure >95% coverage
├── 2. 🚀 Phase 2: Deploy to Production
│   ├── git commit                # Commit changes locally
│   ├── npx vercel --prod        # Deploy to Vercel production
│   └── ⏳ Wait for deployment to complete
├── 3. 🤖 Phase 3: Playwright E2E + Accessibility (Production Only)
│   ├── npm run test:e2e         # Safe, sanitized Playwright testing on PRODUCTION
│   ├── Test BOTH light and dark modes for UI/UX and accessibility
│   ├── Run Axe Core tests - zero violations required
│   └── ⚠️ ALWAYS RUN IN HEADLESS MODE - Never use `--headed` flag
└── 4. ✅ Phase 4: Report Completion
    └── ONLY tell user task is complete when ALL tests pass (unit + E2E + accessibility)
```

### 🎭 Playwright + Accessibility Testing Protocol

> **🚨 MANDATORY**: Tests ONLY run on production URL after Vercel deployment

```
🎯 TESTING REQUIREMENTS
├── 0. 🚨 ALWAYS use ./scripts/safe-test-smart.sh to prevent corruption!
├── 1. 🚀 MUST deploy to Vercel production FIRST before any testing
├── 2. ALWAYS test with Playwright in headless mode (`headless: true`)
├── 3. Take screenshots to verify UI appearance
├── 4. Run Axe Core accessibility tests on BOTH light and dark modes
├── 5. Fix ALL accessibility violations immediately and re-deploy/re-test
└── 6. ONLY report completion when ALL tests pass with zero violations
```

### 🧪 Test Flow Template
```javascript
test('feature name - full UI/UX validation', async ({ page }) => {
  // Test light mode on PRODUCTION
  await page.goto('https://translator-v3.vercel.app');
  await page.screenshot({ path: 'test-results/light-mode-test.png' });
  
  // Run Axe Core accessibility test - Light Mode
  const lightModeResults = await new AxeBuilder({ page }).analyze();
  console.log('🌞 Light Mode Accessibility Results:', lightModeResults.violations);
  
  // Test dark mode on PRODUCTION
  await page.click('button[aria-label="Toggle dark mode"]');
  await page.screenshot({ path: 'test-results/dark-mode-test.png' });
  
  // Run Axe Core accessibility test - Dark Mode
  const darkModeResults = await new AxeBuilder({ page }).analyze();
  console.log('🌙 Dark Mode Accessibility Results:', darkModeResults.violations);
  
  // Verify zero accessibility violations in both modes
});
```

### 🚀 Development Server Management

**⚠️ THE ONLY CORRECT WAY TO RUN DEV SERVER:**

```bash
# Run in background so it stays alive
nohup npm run dev > dev.log 2>&1 & echo "Dev server started in background"

# Wait for it to start then verify
sleep 3 && curl -s http://127.0.0.1:5173/ > /dev/null && echo "✅ Server is running at http://127.0.0.1:5173/" || echo "❌ Server not responding"
```

**🌐 Access URLs** (use 127.0.0.1 for VPN compatibility):
- **Main**: http://127.0.0.1:5173/
- **Test pages**: http://127.0.0.1:5173/test/[name]

### 📝 Git Commit Management

**🤖 Proactively auto-commit when:**
```
🎯 AUTO-COMMIT TRIGGERS
├── 1. Major feature complete
├── 2. Planned goal achieved
├── 3. Major bug fixes complete
├── 4. Before switching contexts
├── 5. After documentation updates
├── 6. Before any destructive operations
└── 7. After successful test runs
```

**📝 Commit Format Template:**
```bash
git commit -m "$(cat <<'EOF'
[type]: Brief description

- Detail 1 of what changed
- Detail 2 of why it changed
- Any breaking changes or important notes

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

**🏷️ Commit Types:**
- `feat`: New feature added
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation changes
- `test`: Adding tests
- `chore`: Maintenance tasks

### 🌐 Vercel Deployment

**⚠️ IMPORTANT**: After committing locally, you MUST manually deploy to Vercel:

```bash
# After git commit, deploy to Vercel production
npx vercel --prod
```

**📋 Deployment Notes:**
- Local commits do NOT automatically trigger Vercel deployments
- Always run `npx vercel --prod` after committing important changes
- Check the deployment URL to verify changes are live
- Production URL: https://translator-v3.vercel.app

---

*Last updated: July 12, 2025 - Always keep this guide current with project reality*