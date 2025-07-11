# 🔧 Troubleshooting Guide - Problem Solving

Complete guide to diagnosing and solving common issues with the Real-time Translator.

---

## 🎯 Quick Diagnostics

### System Health Check

Run this quick diagnostic to identify issues:

```bash
# 1. Environment Check
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Git status: $(git status --porcelain | wc -l) files changed"

# 2. Dependencies Check
npm list --depth=0

# 3. Build Check
npm run type-check
npm run lint
npm run build

# 4. Test Check
npm test
npx playwright test tests/critical-fixes-test.spec.ts

# 5. Server Check
curl -s http://127.0.0.1:5173/ > /dev/null && echo "✅ Server running" || echo "❌ Server not responding"
```

**Expected Output**: All checks should pass ✅

---

## 🚨 Critical Issues

### App Won't Start

**Problem**: `npm run dev` fails or shows errors

**Diagnosis**:
```bash
# Check for common issues
ls -la .env.local                    # Environment file exists?
npm list react react-dom            # Dependencies installed?
lsof -i :5173                       # Port already in use?
```

**Solutions**:

**1. Missing Dependencies**:
```bash
rm -rf node_modules package-lock.json
npm install
```

**2. Port Conflict**:
```bash
# Kill existing process
pkill -f "vite"
# Or use different port
npm run dev -- --port 5174
```

**3. Environment Variables**:
```bash
# Check if .env.local exists
cat .env.local

# Should contain:
# VITE_OPENAI_API_KEY=sk-proj-...
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=...
```

**4. Permission Issues**:
```bash
# Fix file permissions
chmod -R 755 node_modules
sudo chown -R $(whoami) node_modules
```

### White Screen / App Won't Load

**Problem**: Browser shows blank white page

**Diagnosis**:
```bash
# Check browser console (F12) for errors
# Common errors:
# - "Failed to fetch dynamically imported module"
# - "Unexpected token '<' in JSON"
# - Environment variable errors
```

**Solutions**:

**1. Hard Refresh**:
```bash
# In browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
# This clears cached files
```

**2. Clear Browser Data**:
```bash
# Chrome: Settings → Privacy → Clear browsing data
# Clear: Cached images and files
```

**3. Check Build Output**:
```bash
npm run build
npm run preview  # Test production build
```

**4. Check Network Tab**:
- Open browser DevTools (F12)
- Go to Network tab
- Reload page
- Look for failed requests (red entries)

---

## 🌐 Network & API Issues

### VPN Blocking Localhost

**Problem**: Can't access http://localhost:5173 with VPN active

**Solutions**:

**1. Use 127.0.0.1 Instead**:
```bash
# Use this URL instead of localhost
http://127.0.0.1:5173
```

**2. Configure VPN Bypass (macOS)**:
```bash
sudo networksetup -setproxybypassdomains Wi-Fi "*.local" "169.254/16" "localhost" "127.0.0.1" "::1" "[::1]" "localhost:5173" "127.0.0.1:5173"

# Restart browser after running this
```

**3. Use Network IP**:
```bash
# Check npm run dev output for Network URL
# Example: http://192.168.1.45:5173/
# Use this IP address instead
```

### OpenAI API Errors

**Problem**: Translation fails with OpenAI errors

**Diagnosis**:
```bash
# Test API key manually
curl -H "Authorization: Bearer $VITE_OPENAI_API_KEY" \
     https://api.openai.com/v1/models

# Should return JSON with model list, not 401 error
```

**Common Error Messages**:

**"Invalid API key"**:
```bash
# Check API key format
echo $VITE_OPENAI_API_KEY
# Should start with: sk-proj-

# Verify in OpenAI dashboard
# https://platform.openai.com/api-keys
```

**"Rate limit exceeded"**:
```bash
# Check usage in OpenAI dashboard
# Wait or upgrade plan
# Implement retry logic (already built-in)
```

**"Model not found"**:
```typescript
// Check model names in services/openai/
// Current models used:
// - whisper-1 (STT)
// - gpt-4o-mini (translation) 
// - tts-1 (text-to-speech)
```

**"Insufficient quota"**:
```bash
# Add payment method in OpenAI dashboard
# Check billing limits
```

### Supabase Connection Issues

**Problem**: Database operations fail or real-time doesn't work

**Diagnosis**:
```bash
# Test Supabase connection
curl -H "apikey: $VITE_SUPABASE_ANON_KEY" \
     "$VITE_SUPABASE_URL/rest/v1/sessions?select=count"

# Should return JSON, not 401/403 error
```

**Common Issues**:

**"Invalid API key"**:
```bash
# Check Supabase dashboard
# Settings → API → anon public key
# Copy the key exactly
```

**"Table doesn't exist"**:
```sql
-- Run in Supabase SQL Editor
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Should show: sessions, messages, user_activity
```

**"RLS policy violation"**:
```sql
-- Disable RLS for development (Supabase dashboard)
-- Table Editor → [table] → Settings → Row Level Security → Disable

-- Or create proper policies for production
```

**Real-time not working**:
```typescript
// Check browser console for WebSocket errors
// Ensure Supabase URL is correct
// Check if real-time is enabled in Supabase dashboard
```

---

## 🎤 Audio & Recording Issues

### Microphone Not Working

**Problem**: Recording fails or no audio captured

**Solutions**:

**1. Check PersistentAudioManager**:
```typescript
// In browser console:
const audioManager = PersistentAudioManager.getInstance()
console.log('Stream ready:', audioManager.isStreamReady())
console.log('Permission denied:', audioManager.permissionDenied)

// If stream not ready, ensure permissions:
await audioManager.ensurePermissions()
```

**2. Browser Permissions**:
```bash
# Chrome: Settings → Privacy and security → Site settings → Microphone
# Allow for localhost/127.0.0.1

# Firefox: Settings → Privacy & Security → Permissions → Microphone
# Allow for localhost
```

**3. Permission Timing**:
```typescript
// The app requests permission on first recording attempt, not on load
// If no permission prompt appears:
// 1. Check if permission was previously denied
// 2. Clear site data and try again
// 3. Check browser's permission settings
```

**4. System Permissions (macOS)**:
```bash
# System Preferences → Security & Privacy → Privacy → Microphone
# Enable for Chrome/Firefox/Safari
```

**5. HTTPS Requirement**:
```bash
# Audio only works on HTTPS or localhost
# For production, ensure SSL certificate is active
# For development, use localhost or 127.0.0.1
```

**6. Audio Format Issues**:
```typescript
// Check browser support
console.log('Audio recording supported:', 
  navigator.mediaDevices && navigator.mediaDevices.getUserMedia)

// Check supported formats
const recorder = new MediaRecorder(stream)
console.log('Supported types:', recorder.supportedTypes)
```

### Audio Quality Issues

**Problem**: Poor audio quality or recording failures

**Solutions**:

**1. Check Network Quality**:
```typescript
// App automatically detects network quality
// Check console for network quality logs
// Lower quality used on slow networks automatically
```

**2. Microphone Settings**:
```javascript
// Optimal constraints (already configured)
const constraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 16000  // Optimized for Whisper
  }
}
```

**3. File Size Limits**:
```bash
# Whisper API limit: 25MB
# Automatic compression handles this
# Check file size in browser DevTools → Network tab
```

### PersistentAudioManager Specific Issues

**Problem**: Stream lost or not persisting between recordings

**Debug Steps**:
```typescript
// Check stream state
const audioManager = PersistentAudioManager.getInstance()
const stream = audioManager.stream
console.log('Stream active:', stream?.active)
console.log('Audio tracks:', stream?.getAudioTracks().length)

// Force recreate stream if needed
audioManager.cleanup()
await audioManager.ensurePermissions()
```

**Common Issues**:
1. **iOS Safari**: May stop stream after inactivity
   - Solution: App automatically recreates stream when needed
   
2. **Permission denied**: User blocked microphone
   - Solution: Direct user to browser settings to unblock
   
3. **Multiple instances**: Accidentally creating multiple managers
   - Solution: Always use `getInstance()` method

**Mobile-Specific Troubleshooting**:
```typescript
// iOS Safari audio context fix (handled automatically)
if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
  // PersistentAudioManager handles this internally
  console.log('iOS device detected, using optimized audio handling')
}
```

---

## 🎨 UI & Styling Issues

### Dark Mode Not Working

**Problem**: Dark mode toggle doesn't apply dark theme

**Diagnosis**:
```typescript
// Check in browser console
console.log('Theme:', localStorage.getItem('theme'))
console.log('HTML classes:', document.documentElement.classList)
console.log('Computed style:', getComputedStyle(document.documentElement).backgroundColor)
```

**Solutions**:

**1. Clear Theme Storage**:
```javascript
// In browser console
localStorage.removeItem('theme')
location.reload()
```

**2. Check Theme Context**:
```typescript
// Verify ThemeProvider wraps app in src/main.tsx
// Should see <ThemeProvider> around <App />
```

**3. Verify CSS Classes**:
```bash
# Check if 'dark' class is added to HTML element
# Inspect element → <html class="dark">
```

### Styling Not Loading

**Problem**: Components have no styling or wrong styles

**Solutions**:

**1. UnoCSS Build Issue**:
```bash
# Rebuild UnoCSS
rm -rf dist
npm run build

# Check for UnoCSS errors in console
```

**2. Import Issues**:
```typescript
// Verify imports in main.tsx
import 'virtual:uno.css'  // Should be present
import '@unocss/reset/tailwind.css'  // Should be present
```

**3. Purge CSS Issue**:
```typescript
// Check uno.config.ts for content paths
content: {
  filesystem: ['./src/**/*.{html,js,ts,jsx,tsx}']
}
```

### Mobile Layout Issues

**Problem**: App doesn't work properly on mobile

**Solutions**:

**1. Viewport Meta Tag**:
```html
<!-- Verify in index.html -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

**2. Touch Targets**:
```css
/* Ensure minimum 44px touch targets */
button, input, [role="button"] {
  min-height: 44px;
}
```

**3. iOS Safari Issues**:
```typescript
// Check iOS audio context initialization
// Should see console logs about iOS audio setup
```

---

## 🧪 Testing Issues

### Playwright Tests Failing

**Problem**: E2E tests fail or don't run

**Solutions**:

**1. Browser Installation**:
```bash
# Install Playwright browsers
npx playwright install

# Install system dependencies (Linux)
npx playwright install-deps
```

**2. Server Not Running**:
```bash
# Start dev server first
npm run dev

# Then run tests in another terminal
npx playwright test
```

**3. Timeout Issues**:
```bash
# Increase timeout for slow environments
npx playwright test --timeout=60000
```

**4. Headless vs Headed**:
```bash
# For debugging, use headed mode
npx playwright test --headed

# For CI/CD, use headless (default)
npx playwright test
```

### Unit Tests Failing

**Problem**: Vitest tests fail or don't run

**Solutions**:

**1. Test Environment**:
```typescript
// Check vitest.config.ts
test: {
  environment: 'happy-dom'  // Or 'jsdom'
}
```

**2. Mock Issues**:
```typescript
// Verify mocks in src/test/setup.ts
// Should mock browser APIs and environment variables
```

**3. Import Issues**:
```typescript
// Check path aliases in vitest.config.ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src')
  }
}
```

---

## 🔄 Real-time & Session Issues

### Messages Not Loading When Joining Session

**Problem**: User B joins an existing session but doesn't see messages that User A sent before they joined

**Diagnosis**:
```javascript
// Check if message history is being loaded
console.log('Message count:', document.querySelectorAll('[data-testid="message-bubble"]').length)
```

**Solutions**:

**1. Verify MessageSyncService is Loading History**:
```javascript
// Check console for history loading logs
// Should see: "📚 [MessageSyncService] Loading message history for session: [sessionId]"
// And: "✅ [MessageSyncService] Message history loaded successfully"
```

**2. Check Database for Messages**:
```sql
-- In Supabase SQL Editor
SELECT * FROM messages 
WHERE session_id = 'YOUR_SESSION_ID'
ORDER BY sequence_number ASC;
```

**3. Force Reload History**:
```javascript
// If history not loading, try rejoining the session
window.location.reload()
```

**Note**: As of July 11, 2025, MessageSyncService includes `loadMessageHistory()` method that prevents this issue.

### Messages Not Syncing

**Problem**: Messages don't appear for other users in real-time

**Diagnosis**:
```typescript
// Check browser console for WebSocket errors
// Look for Supabase real-time connection logs
```

**Solutions**:

**1. Real-time Enabled**:
```bash
# Supabase Dashboard → Settings → API
# Ensure "Real-time" is enabled
```

**2. Table Permissions**:
```sql
-- Enable real-time for tables
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- Or disable RLS for development
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
```

**3. Network Issues**:
```typescript
// Check network tab for failed WebSocket connections
// Ensure no proxy/firewall blocking WebSockets
```

### Session Code Issues

**Problem**: Can't create or join sessions

**Solutions**:

**1. Database Schema**:
```sql
-- Verify sessions table exists
SELECT * FROM sessions LIMIT 1;

-- Check for required columns
\d sessions
```

**2. Code Generation**:
```typescript
// Check session code generation logic
// Should generate 4-digit codes (0000-9999)
// Codes should be unique
```

**3. Expiry Logic**:
```sql
-- Check for expired sessions
SELECT * FROM sessions WHERE expires_at < NOW();

-- Clean up expired sessions
DELETE FROM sessions WHERE expires_at < NOW();
```

---

## 🏗️ Build & Deployment Issues

### Build Failures

**Problem**: `npm run build` fails

**Solutions**:

**1. TypeScript Errors**:
```bash
# Check TypeScript issues
npm run type-check

# Fix all type errors before building
```

**2. ESLint Errors**:
```bash
# Check linting issues
npm run lint

# Auto-fix where possible
npm run lint -- --fix
```

**3. Memory Issues**:
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

**4. Dependency Issues**:
```bash
# Update dependencies
npm update

# Check for security vulnerabilities
npm audit
npm audit fix
```

### Deployment Failures

**Problem**: Vercel deployment fails

**Solutions**:

**1. Build Command**:
```json
// Verify in vercel.json or Vercel dashboard
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

**2. Environment Variables**:
```bash
# Ensure all required env vars are set in Vercel dashboard
# VITE_OPENAI_API_KEY
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY
```

**3. Node Version**:
```json
// Set Node version in package.json
{
  "engines": {
    "node": "18.x"
  }
}
```

---

## 📱 Mobile-Specific Issues

### iOS Safari Problems

**Problem**: App doesn't work properly on iOS Safari

**Solutions**:

**1. Audio Context**:
```typescript
// iOS requires user interaction for audio
// Check for "AudioContext was not allowed to start" errors
// Ensure audio context is initialized on user gesture
```

**2. Viewport Issues**:
```css
/* iOS Safari viewport fixes */
html {
  height: -webkit-fill-available;
}

body {
  min-height: -webkit-fill-available;
}
```

**3. PWA Install Issues**:
```html
<!-- Ensure proper meta tags -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
```

### Android Chrome Issues

**Problem**: Features not working on Android Chrome

**Solutions**:

**1. Audio Permissions**:
```bash
# Ensure microphone permission is granted
# Check site settings in Chrome
```

**2. Performance Issues**:
```typescript
// Reduce audio quality on mobile
// Already implemented in quality degradation system
```

**3. Network Issues**:
```typescript
// Check for mobile data restrictions
// Implement offline mode properly
```

---

## 🔄 Session & Real-time Issues

### Messages Appearing in Wrong Sessions

**Problem**: Messages from previous sessions appear in new sessions, or wrong translations occur

**Diagnosis**:
```javascript
// In browser console, check active channels
window.supabase?.getChannels?.()
// Look for multiple channels for same session
```

**Solutions**:

**1. Force Clean Session Exit**:
```javascript
// In browser console
await window.messageSyncService?.cleanup()
localStorage.removeItem('activeSession')
location.reload()
```

**2. Check for Stale Channels**:
```javascript
// List all channels
const channels = window.supabase.getChannels()
console.log('Active channels:', channels.map(ch => ch.topic))

// Clean up stale channels manually
for (const channel of channels) {
  await channel.unsubscribe()
  await window.supabase.removeChannel(channel)
}
```

**3. Verify Session Isolation**:
```bash
# Check Supabase logs for message routing
# Dashboard → Logs → Search for session_id
```

### Partner Not Showing as Online

**Problem**: Partner status shows "Waiting for partner" even when both users joined

**Solutions**:

**1. Check Presence Subscription**:
```javascript
// Verify presence channel is active
const channels = window.supabase.getChannels()
const presenceChannel = channels.find(ch => ch.topic.includes('presence'))
console.log('Presence state:', presenceChannel?.presenceState())
```

**2. Force Presence Update**:
```javascript
// Manually trigger presence sync
await window.messageSyncService?.validateSessionReady()
```

**3. Database Check**:
```sql
-- Check session_participants table
SELECT * FROM session_participants 
WHERE session_id = 'YOUR_SESSION_ID'
ORDER BY joined_at DESC;
```

### Real-time Messages Not Syncing

**Problem**: Messages sent but not received by partner

**Solutions**:

**1. Check Connection Status**:
```javascript
// Get connection status
console.log('Connection:', window.messageSyncService?.getConnectionStatus())
console.log('Pending messages:', window.messageSyncService?.getPendingMessageCount())
```

**2. Verify Real-time is Enabled**:
```sql
-- In Supabase SQL Editor
-- Check if real-time is enabled for messages table
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'messages';
```

**3. Manual Message Sync**:
```javascript
// Force process message queue
await window.messageSyncService?.processMessageQueue()
```

### Session Code Already in Use

**Problem**: Can't create new session, says code already exists

**Solutions**:

**1. Clean Up Old Sessions**:
```sql
-- Run in Supabase SQL Editor
-- Mark old sessions as inactive
UPDATE sessions 
SET is_active = false 
WHERE created_at < NOW() - INTERVAL '4 hours' 
AND is_active = true;
```

**2. Force New Code Generation**:
```javascript
// Clear any cached session data
localStorage.removeItem('activeSession')
sessionStorage.clear()
```

---

## 🔍 Debug Tools & Techniques

### Browser DevTools

**Console Debugging**:
```typescript
// Enable verbose logging
localStorage.setItem('debug', 'true')

// Check for specific log patterns
// 🎯 - Target language logs
// ✅ - Success logs  
// ❌ - Error logs
// 🔧 - Debug logs
```

**Network Tab**:
```bash
# Check for failed requests
# Look for 4xx/5xx status codes
# Verify API endpoints and payloads
```

**Application Tab**:
```bash
# Check localStorage for:
# - theme settings
# - user preferences
# - cached data

# Check Service Worker status
# Verify PWA manifest
```

### Performance Debugging

**Lighthouse Audit**:
```bash
# Run in Chrome DevTools
# Performance → Lighthouse → Generate report
# Target: >90 score for Performance, Accessibility, Best Practices
```

**Performance Monitor**:
```typescript
// Built-in performance logging
// Check console for timing logs
// Look for operations > 100ms
```

### Real-time Debugging

**WebSocket Inspector**:
```bash
# Chrome DevTools → Network → WS
# Monitor WebSocket connections
# Check for connection drops/errors
```

**Supabase Logs**:
```bash
# Supabase Dashboard → Logs
# Check for database errors
# Monitor real-time subscription status
```

---

## 📞 Getting Help

### Self-Service Debugging

**1. Check Recent Changes**:
```bash
git log --oneline -10  # Last 10 commits
git diff HEAD~1        # Changes in last commit
```

**2. Compare with Working Version**:
```bash
git checkout known-working-commit
npm run dev  # Test if issue exists in working version
git checkout main  # Return to current version
```

**3. Minimal Reproduction**:
```bash
# Create minimal test case
# Disable features one by one until issue disappears
# This identifies the problematic component/feature
```

### Documentation Resources

- **[SETUP.md](./SETUP.md)** - Initial setup issues
- **[API.md](./API.md)** - Service integration problems
- **[COMPONENTS.md](./COMPONENTS.md)** - UI component issues
- **[TESTING.md](./TESTING.md)** - Testing problems
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment issues

### External Resources

**Vite Issues**:
- [Vite Troubleshooting](https://vitejs.dev/guide/troubleshooting.html)
- [Vite GitHub Issues](https://github.com/vitejs/vite/issues)

**React Issues**:
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)

**Browser Issues**:
- Chrome: `chrome://flags` for experimental features
- Safari: Develop menu → Web Inspector
- Firefox: Developer Tools → Console

---

## 📋 Issue Reporting Template

When reporting issues, include:

```markdown
## Issue Description
[Brief description of the problem]

## Environment
- OS: [macOS/Windows/Linux]
- Browser: [Chrome/Safari/Firefox + version]
- Node.js: [version]
- npm: [version]

## Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Console Errors
```
[Any error messages from browser console]
```

## Additional Context
[Screenshots, network logs, etc.]
```

---

## ✅ Resolution Checklist

After fixing an issue:

- [ ] **Verify fix works** in development
- [ ] **Test related features** weren't broken
- [ ] **Run test suite** to ensure no regressions
- [ ] **Test on different browsers** if UI-related
- [ ] **Test on mobile** if mobile-related
- [ ] **Update documentation** if needed
- [ ] **Commit fix** with descriptive message
- [ ] **Deploy to production** if critical

Remember: Most issues have been encountered before. Check git history, existing tests, and documentation before deep debugging!