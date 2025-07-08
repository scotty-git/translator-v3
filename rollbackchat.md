# 🚨 Rollback and Recovery Plan

## What Was Working Before (Stable State)
- ✅ **Translation functionality** - Text translation working perfectly
- ✅ **Audio recording** - Recording and playback working
- ✅ **UI/UX** - All components rendering correctly
- ✅ **Navigation** - App routing working
- ✅ **Performance** - Fast load times, responsive
- ❌ **Security Issue** - `VITE_OPENAI_API_KEY` exposed in browser (the original problem)

## What I Broke (Disaster Timeline)
1. **Removed working OpenAI client** - Deleted functioning API calls
2. **Created broken proxy APIs** - Non-functional file upload handling
3. **Added unnecessary dependencies** - formidable, form-data, node-fetch
4. **JSON parsing errors** - Improper body handling in Vercel functions
5. **Vercel deployment issues** - Runtime conflicts, configuration errors

## Current State (Broken)
- ❌ **Whisper transcription** - Returns dummy "Test transcription"
- ❌ **API endpoints** - 500 errors, JSON parsing failures
- ❌ **File uploads** - Complex multipart handling not working
- ❌ **Dependencies** - Bloated with unused packages

## Issues to Solve LOCALLY Before Vercel

### 1. API Key Security (Primary Goal)
**Problem**: `VITE_OPENAI_API_KEY` visible in browser
**Solution**: Local proxy server + Vite proxy configuration

**EXACT Local Development Approach**:
```typescript
// vite.config.ts - Add proxy configuration
server: {
  proxy: {
    '/api/openai': {
      target: 'http://localhost:3001',
      changeOrigin: true,
      secure: false
    }
  }
}
```

```javascript
// server/proxy.js - Simple Express server
const express = require('express');
const app = express();

app.post('/api/openai/translate', async (req, res) => {
  // Forward to OpenAI with server-side API key
  // Exact same logic that will work in Vercel
});

app.listen(3001);
```

**Benefits**:
- No changes to existing client code
- Tests exact Vercel deployment setup locally
- API key stays server-side
- Easy to verify before deployment

### 2. Node.js Version Compatibility
**Problem**: Vercel complained about Node 22.x vs 18.x
**Solution**: 
- Ensure package.json specifies `"engines": { "node": "18.x" }`
- Test locally with Node 18
- Use built-in fetch (Node 18+) instead of node-fetch

### 3. File Upload Handling
**Problem**: Complex multipart form handling broke everything
**Solution**: 
- Test file upload locally first
- Use simple approach that works in both dev and Vercel
- Ensure FormData handling is consistent

### 4. Dependencies Cleanup
**Current bloat**:
```json
"formidable": "^3.5.1",     // Remove - caused issues
"form-data": "^4.0.1",      // Remove - not needed
"node-fetch": "^3.3.2",     // Remove - use built-in fetch
```

### 5. API Endpoint Testing
**Must work locally before Vercel**:
- `/api/openai/translate` - Text translation
- `/api/openai/whisper` - Audio transcription (file upload)
- `/api/openai/tts` - Text-to-speech
- Proper error handling and JSON responses

## Step-by-Step Recovery Plan

### Phase 1: Rollback to Stability
1. **Find stable commit** (before API changes)
   ```bash
   git log --oneline | grep -E "(before|stable|working)"
   ```
2. **Create recovery branch**
   ```bash
   git checkout -b recovery-secure-api
   git reset --hard [STABLE_COMMIT_HASH]
   ```
3. **Verify everything works locally**
   ```bash
   npm run dev
   # Test all functionality
   ```

### Phase 2: Implement Security Locally
1. **Create local proxy server** (simple Express or Vite proxy)
2. **Test with actual OpenAI API calls** locally
3. **Ensure file uploads work** for Whisper
4. **Verify no API key exposure** in browser dev tools
5. **Run full test suite** to ensure nothing breaks

### Phase 3: Prepare for Vercel
1. **Clean dependencies** - Remove unnecessary packages
2. **Ensure Node 18.x compatibility**
3. **Test build process** - `npm run build` works perfectly
4. **Document exact Vercel configuration** needed
5. **Have rollback plan** ready

### Phase 4: Vercel Deployment (Only When Confident)
1. **Deploy with minimal changes**
2. **Test each endpoint individually**
3. **Monitor deployment logs**
4. **Quick rollback if any issues**

## Critical Success Criteria (Before Vercel)
- [ ] App works 100% locally with secure API setup
- [ ] No API keys visible in browser
- [ ] File uploads work for Whisper transcription
- [ ] All existing functionality preserved
- [ ] Clean dependency list
- [ ] Build process works without errors
- [ ] Test suite passes

## IDENTIFIED ROLLBACK TARGET ✅

**Stable Commit**: `74532e3` - "fix: Allow Supabase keys in ignored .env files"

**What was working at this commit**:
- ✅ Direct OpenAI client with `dangerouslyAllowBrowser: true`
- ✅ Full translation functionality 
- ✅ Whisper transcription working
- ✅ TTS working
- ✅ All UI components functional
- ❌ `VITE_OPENAI_API_KEY` exposed in browser (the only issue to fix)

**Disaster started at**: `74dbef6` - "feat: implement secure API proxy architecture"

## Never Again Rules
1. **Test locally first** - Always
2. **One change at a time** - No massive rewrites
3. **Keep working version** - Don't break existing functionality
4. **Incremental deployment** - Small, testable changes
5. **Document what works** - Before changing anything

---

## IMMEDIATE ACTION PLAN 

### Execute Rollback (RIGHT NOW)
```bash
# 1. Create recovery branch
git checkout -b recovery-secure-api

# 2. Rollback to stable state
git reset --hard 74532e3

# 3. Verify working state
npm install
npm run dev
# Test: Translation should work with exposed API key

# 4. Clean up my mess
npm uninstall formidable form-data node-fetch
rm -rf api/
rm vercel.json
```

### Implement Security (LOCALLY FIRST)
```bash
# 1. Create proxy server
mkdir server
# Create server/proxy.js with Express endpoints

# 2. Update vite.config.ts with proxy

# 3. Update client code to use /api/openai/* endpoints

# 4. Test locally until 100% working

# 5. ONLY THEN deploy to Vercel
```

### Success Criteria Before Vercel
- [ ] App works locally with proxy server
- [ ] No VITE_OPENAI_API_KEY in browser dev tools  
- [ ] All translation features working
- [ ] File uploads working for Whisper
- [ ] Clean build process
- [ ] Confident deployment

---

**Bottom Line**: Get back to working state, implement security locally with confidence, then deploy to Vercel once.