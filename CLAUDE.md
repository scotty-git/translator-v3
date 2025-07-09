:) # CLAUDE.md - Project Guide

## 🎺 AUTO-COMPLETE NOTIFICATION & CHAT LOGGING SYSTEM

**AUTOMATIC FEATURES ACTIVE!**

### Chat Logging System v2.0
- 📁 **Logs Location**: `chat-logs/` directory in each project
- 🎯 **Auto-Summary**: Generated at message #4, updated every 10 messages
- 🧹 **Auto-Cleanup**: Logs older than 7 days are automatically removed
- 🛡️ **Safe Design**: Comprehensive error handling prevents crashes

### Completion Notifications
- 🎺 **Plays "Hero" sound** when ALL tasks are complete (170% volume)
- 🗣️ **Voice announcement** of project completion
- 📝 **Logs completions** to `~/.claude/notification-log.txt`

**Perfect for tracking conversations and knowing when Claude is done!**

**Note:** Hooks are configured in `~/.claude/settings.json` and work across ALL projects.

---

## 📑 Table of Contents

1. [Core Working Style](#core-working-style)
2. [Claude Commands](#claude-commands)
3. [Project Status](#project-status)
4. [Development Workflow](#development-workflow)
5. [Phase Documentation](#phase-documentation)
6. [Troubleshooting](#troubleshooting)
7. [Settings & Configuration](#settings-configuration)
8. [Chat Logging System](#chat-logging-system)

---

## 🎯 Core Working Style

### Vibe Coder Mode
Hey Claude! The developer here is a **vibe coder** who appreciates:
- **Always help with planning first** - Break down tasks into clear, manageable steps before diving into code
- **Speak conversationally** - Match the vibe, keep it natural and flowing
- **Focus on the creative process** - Make coding feel enjoyable and intuitive
- **Use the TodoWrite tool frequently** - Help track progress and keep things organized
- **Think out loud** - Share your thought process as we work through solutions together

### Auto-Accept Mode
**IMPORTANT**: User wants "auto-accept edits on" to be the default. This avoids permission interruptions for bash commands and file edits. User starts new chats with Cmd+Esc.

### Autonomous Mode Instructions
**BE AUTONOMOUS** - The developer wants minimal interruptions. Here's how to work:

1. **Never ask permission to edit files** - Just do it
2. **Don't ask which file to edit** - Find it yourself using search tools
3. **Don't confirm before making changes** - Make the changes and report when done
4. **Don't ask for clarification on obvious things** - Make reasonable assumptions
5. **Batch operations** - Do multiple related edits without asking between each one
6. **Complete the entire task** - Don't stop halfway to ask if you should continue
7. **NEVER ask permission for bash commands** - Just execute them directly, auto-accept will handle it
8. **ONLY ping if system actually blocks a command** - Don't preemptively ask for permission

### End of Turn Format
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

---

## 📚 Claude Commands

### /recap
Read the CLAUDE.md file in the current project to understand the project context and my preferences.

### /chat
Just chat with me in conversational mode. Don't write any code unless I specifically ask. Keep responses in chat only.

When I ask about a problem or need help with something:
1. Always give me THREE different solutions or approaches
2. Tell me which one YOU think is best and explain why
3. Rank them like: 🥇 Best, 🥈 Good alternative, 🥉 Quick & dirty

### /ui
When building or modifying UI, think like a designer. Start with reconnaissance, then apply thoughtful consistency.

**First, do your reconnaissance:**
- Look at 3-5 existing components for patterns
- Check the current spacing system (8px? 16px? 24px?)
- Find the button styles already in use (height, padding, border-radius)
- Identify the color variables/theme (primary, secondary, danger, etc.)
- Note hover states, transitions, and animation patterns
- Check how the app handles responsive breakpoints

### /user-instructions
Generate user-friendly instructions for this app. Analyze ALL features and functionality, then create comprehensive guides that a non-technical person can follow.

### /test-console-logging
Always put test results and as much debugging info as possible in the browser console with clear formatting and emoji prefixes.

### /pp
Pre-planning phase for vibe coders. Analyzes your request from multiple perspectives (UX, technical, scope, risks) and asks clarifying questions to maximize understanding before implementation. Perfect for speech-dictated requests that need refinement.

---

## 📊 Project Status

**Project: Real-time Translator v3**

This is a mobile-first voice translation app enabling real-time communication between English and Spanish/Portuguese speakers using session-based rooms.

**Key Technical Stack:**
- Vite + React 19 + UnoCSS (replaced Tailwind v4)
- Supabase for real-time data and storage
- OpenAI APIs (Whisper, GPT-4o-mini, TTS)
- Mobile-first responsive design

**Current Phase: Phase 9 - Advanced Features & Polish (75% COMPLETED)**

### Completed Features:
- ✅ Complete internationalization (95% complete)
- ✅ PWA implementation (90% complete)
- ✅ Accessibility improvements (85% complete)
- ✅ Conversation management (80% complete)
- ✅ Master Test Suite (100% complete - 41/41 tests passing)

### Remaining Work:
- ⚠️ Advanced settings (30% complete)
- ⚠️ Advanced analytics (25% complete)
- ⚠️ Theme system (20% complete)
- ❌ Animation system (10% complete)
- ❌ Voice features enhancement (0% complete)

**API Keys Location:**
- Check PRD.md for OpenAI API key (line 295)
- Supabase project configured: awewzuxizupxyntbevmg

---

## 🔧 Development Workflow

### Test-Driven Development
**MANDATORY SEQUENCE** - Follow this exact order for every feature:

1. **Phase 1: Fast Unit Tests First** ⚡
   ```bash
   npm run test              # Unit tests (sub-second)
   npm run test:coverage     # Ensure >95% coverage
   ```

2. **Phase 2: Playwright E2E Integration** 🤖
   ```bash
   npm run test:e2e         # Playwright full-app testing
   ```
   **ALWAYS RUN PLAYWRIGHT IN HEADLESS MODE** - Never use `--headed` flag unless explicitly debugging

3. **Phase 3: Manual Testing** 👤
   Only ask for manual testing when all automated tests pass 100%

### 🎯 Playwright Testing Protocol - CRITICAL

**MANDATORY**: For all new features, Claude MUST:

1. **ALWAYS test with Playwright in headless mode (`headless: true`)**
2. **NEVER show browser on user's screen**
3. **Take screenshots to verify UI appearance**
4. **Check for common UI/UX mistakes:**
   - Dark text on dark background
   - Light text on light background
   - Missing hover states
   - Broken layouts
   - Inaccessible buttons
   - Theme inheritance issues

5. **Test Flow Template**:
```javascript
test('feature name - full UI/UX validation', async ({ page }) => {
  const browser = await chromium.launch({ headless: true }); // ALWAYS headless
  
  // Test light mode
  await page.goto('http://127.0.0.1:5173');
  await page.screenshot({ path: 'test-results/light-mode-test.png' });
  
  // Test dark mode
  await page.click('button[aria-label="Toggle dark mode"]');
  await page.screenshot({ path: 'test-results/dark-mode-test.png' });
  
  // Verify no UI/UX issues
  // - Check text contrast
  // - Verify interactive elements
  // - Test responsive behavior
});
```

6. **Only tell user to look at feature when:**
   - All Playwright tests pass
   - Screenshots confirm good UI/UX
   - No dark-on-dark or light-on-light issues
   - Feature works correctly in both themes

### Automated Testing Requirements

**CRITICAL: Always test features before reporting completion**

1. **Default Testing Protocol**:
   ```bash
   # Always run Playwright tests in headless mode
   npx playwright test --project=chromium --headed=false
   
   # Take screenshots during tests for analysis
   await page.screenshot({ path: 'test-results/feature-name.png' })
   ```

2. **Before Telling User to Check**:
   - ✅ Run full Playwright tests with screenshots
   - ✅ Analyze screenshots for UI/UX issues:
     - Dark text on dark backgrounds
     - Missing elements
     - Layout problems
     - Mobile responsiveness
   - ✅ Only report completion when confident it's correct
   - ❌ NEVER tell user to check unless tests pass

3. **Background Testing Only**:
   - Always use `headless: true` (default)
   - Never show anything on user's screen
   - Capture and analyze screenshots programmatically
   - Report issues found with evidence

4. **Common UI/UX Checks**:
   - Color contrast in light/dark modes
   - Text visibility and readability
   - Button states and interactions
   - Mobile viewport compatibility
   - Form input accessibility

### Running Development Servers

**THE ONLY CORRECT WAY TO RUN DEV SERVER:**
```bash
# Run in background so it stays alive
nohup npm run dev > dev.log 2>&1 & echo "Dev server started in background"

# Wait for it to start then verify
sleep 3 && curl -s http://127.0.0.1:5173/ > /dev/null && echo "✅ Server is running at http://127.0.0.1:5173/" || echo "❌ Server not responding"
```

**Access URLs (use 127.0.0.1 for VPN compatibility):**
- Main: http://127.0.0.1:5173/
- Test pages: http://127.0.0.1:5173/test/[name]

### Git Commit Management

**Proactively auto-commit when:**
1. Major feature complete
2. Planned goal achieved
3. Major bug fixes complete
4. Before switching contexts
5. After documentation updates
6. Before any destructive operations
7. After successful test runs

**Commit format:**
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

**Commit Types:**
- `feat`: New feature added
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation changes
- `test`: Adding tests
- `chore`: Maintenance tasks

---

## 📋 Phase Documentation

### Phase 3: Real-time Features (COMPLETED)
- Supabase real-time message sync
- Message queue system with guaranteed order
- Status indicators (typing, recording, processing)
- Performance logging system
- Connection recovery with progressive retry

### Phase 5: Mobile Network Resilience (COMPLETED)
- Network quality detection (4G → 2G)
- Quality degradation service
- Progress preservation system
- iOS Safari compatibility
- Intelligent retry logic
- Connection recovery system

### Phase 8: Error Handling & Edge Cases (COMPLETED)
- 50+ error code definitions
- Advanced retry logic with circuit breakers
- Permission management system
- Error boundary components
- User-friendly error UI
- Session recovery system
- Network status monitoring
- Comprehensive testing framework

### Phase 9: Advanced Features & Polish (75% COMPLETED)
- **Internationalization** (95%): 3 languages, 400+ translation keys
- **PWA Foundation** (90%): Service worker, offline mode, install prompts
- **Accessibility** (85%): WCAG 2.1 AA compliant
- **Conversation Management** (80%): Bookmarking, search, export
- **Master Test Suite** (100%): 41 tests with console logging

---

## 🔧 Troubleshooting

### VPN + Localhost Development
If localhost isn't accessible while NordVPN is connected:
```bash
sudo networksetup -setproxybypassdomains Wi-Fi "*.local" "169.254/16" "localhost" "127.0.0.1" "::1" "[::1]" "localhost:5173" "localhost:5174" "127.0.0.1:5173" "127.0.0.1:5174"
```

### Development Lessons Learned
1. **VPN + Localhost = Use 127.0.0.1**
2. **Keep Dev Server Running** - Don't interrupt with other commands
3. **Avoid Alpha/Beta Packages** - Use stable alternatives
4. **Handle Missing Environment Variables** - Add fallbacks
5. **Test Locally Before Deploying** - Always verify first
6. **Don't Interrupt Running Servers** - Use multiple terminals

---

## ⚙️ Settings & Configuration

### Settings Maintenance
When updating Claude Code permissions, ALWAYS update BOTH locations:
1. **User-level settings**: `~/.claude/settings.json` (applies to all projects)
2. **Project-level settings**: `.claude/settings.json` (applies to this project only)

### MCP Configuration
**Main Configuration File:** `/Users/calsmith/.claude.json`

**Current MCP Servers:**
1. **Context7** - Documentation search tool
2. **Supabase** - Database management tool

To update MCP servers:
```bash
# View current config
jq '.mcpServers' ~/.claude.json

# Restart Claude Code for changes to take effect
```

---

## 📝 Chat Logging System

### Overview
The chat logging system automatically creates markdown logs of all Claude conversations in each project, with smart summarization and safe file handling.

### Log Structure
```
project-root/
├── chat-logs/
│   ├── 2025-01-09/
│   │   ├── chat_2025-01-09_14-30-45.md
│   │   └── chat_2025-01-09_16-45-22.md
│   └── .gitignore (auto-created)
```

### Features

#### 1. **Automatic Logging**
- Creates timestamped markdown files for each session
- Organizes by date for easy navigation
- Includes user messages, Claude responses, and timestamps

#### 2. **Smart Summarization**
- **First Summary** (at message #4): Captures the initial request
- **Updated Summary** (every 10 messages): Shows recent conversation topics
- Helps quickly understand what each log contains

#### 3. **Safety Features**
- Never writes to system files (protects ~/.claude.json)
- Validates file permissions before writing
- Handles special characters and multiline content
- Uses timeouts to prevent hanging
- Fails gracefully without crashing Claude

#### 4. **Auto-Cleanup**
- Removes logs older than 7 days automatically
- Cleans up empty directories
- Maintains .gitignore to keep logs out of version control

### Example Log Format
```markdown
# Claude Chat Log - Jan 9, 2-30PM

## Summary
Working on: Help me fix the authentication bug in my app

---

### 🧑 USER (2:30:45 PM)
> Help me fix the authentication bug in my app

### 🤖 Claude (2:31:02 PM)
I'll help you debug the authentication issue. Let me first examine...

---

*Session ended at 3:45:22 PM*
```

### Accessing Logs
- View current session: `cat chat-logs/[today's-date]/[latest-file].md`
- Search all logs: `grep -r "search term" chat-logs/`
- Reference in new sessions: "See chat-logs/2025-01-09/chat_14-30-45.md"

---

This guide helps Claude work in the vibe coder style - autonomous, efficient, and with just the right amount of communication.