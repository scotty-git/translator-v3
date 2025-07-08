# Two-Browser Session Testing Guide

## 🎯 Testing Session-Based Mode

### Quick Setup
1. **Browser 1**: Go to http://127.0.0.1:5173/
2. **Browser 2**: Go to http://127.0.0.1:5173/ (or open incognito)

### Test Session Creation & Join Flow

#### Step 1: Create Session (Browser 1)
1. Click **"Create Session"** button
2. Note the 4-digit session code that appears
3. You should be redirected to `/session/XXXX`
4. Verify you see the session room interface

#### Step 2: Join Session (Browser 2)  
1. Click **"Join Session"** button
2. Enter the 4-digit code from Browser 1
3. Click **"Join Session"**
4. You should be redirected to the same session room

#### Step 3: Test Real-time Sync
1. **Browser 1**: Try recording a message (hold mic button)
2. **Browser 2**: Should see activity indicator showing "partner is recording"
3. **Browser 1**: Release to send translation
4. **Browser 2**: Should see the message appear in real-time
5. **Browser 2**: Try recording a reply
6. **Browser 1**: Should see the response appear

### Expected Behavior

#### ✅ What Should Work
- Session creation generates 4-digit codes
- Session codes can be joined from different browsers
- Real-time message synchronization
- Activity indicators (recording, processing)
- Message history shared between devices
- Session info shows connected users

#### ⚠️ Current Limitations
- Session mode uses fixed English ↔ Spanish translation
- No automatic language detection in session mode (only in single device mode)
- Audio recording requires proper microphone permissions

### Single Device Mode Testing

#### Test Auto Language Detection
1. Go to http://127.0.0.1:5173/
2. Click **"🗣️ Start Translating"** (top button)  
3. You should see the single device translator interface
4. Hold the record button and speak in English
5. Should detect English and translate to Spanish
6. Hold the record button and speak in Spanish  
7. Should detect Spanish and translate to English

### Performance Testing

#### Response Time Validation
- Single device mode should feel instant (<100ms for UI feedback)
- Session creation should be fast (<1 second)
- Real-time message sync should be immediate (<200ms)
- Translation processing depends on OpenAI API response

### Troubleshooting

#### Common Issues
1. **"Audio not supported"**: Browser doesn't support MediaRecorder API
2. **Session creation fails**: Check Supabase configuration in .env
3. **Translation fails**: Check OpenAI API key in .env
4. **No real-time sync**: Check Supabase real-time configuration

#### Debug Tools
- Open browser console to see detailed logging
- Visit http://127.0.0.1:5173/test/core-ux for automated testing
- Check network tab for API request failures

### API Configuration Required

For full functionality, ensure these environment variables are set:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key  
VITE_OPENAI_API_KEY=your_openai_api_key
```

### Test Checklist

#### Single Device Mode ✅
- [ ] Route accessible at `/translator`
- [ ] Auto language detection works
- [ ] English → Spanish translation
- [ ] Spanish → English translation  
- [ ] Portuguese → English translation
- [ ] Audio playback of translations
- [ ] Message history preserved

#### Session Mode ✅
- [ ] Session creation from home page
- [ ] 4-digit codes generated
- [ ] Session joining with valid codes
- [ ] Real-time message synchronization
- [ ] Activity indicators working
- [ ] Multiple device support
- [ ] Session persistence

#### Performance ✅
- [ ] Sub-100ms UI feedback
- [ ] Fast session creation
- [ ] Immediate real-time sync
- [ ] Smooth audio recording experience