# Text Message Sync Test Instructions

## Production URL
https://translator-v3-kvp00gefc-scotty-gits-projects.vercel.app

## Test Steps

1. **Setup Two Browsers**
   - Open the production URL in two different browsers (or incognito windows)
   - Browser A: Host
   - Browser B: Guest

2. **Create Session**
   - Browser A: Click "Create Session"
   - Note the 4-digit code
   - Browser B: Click "Join Session" and enter the code

3. **Verify Connection**
   - Both browsers should show "Partner Online"
   - Connection status should be "Connected"

4. **Test Text Messages**
   - Browser A: Click the text input toggle (pen icon) to switch to text mode
   - Browser A: Type "Hello from host" and send
   - Browser B: Should see the message appear with translation
   - Browser B: Switch to text mode and type "Hello from guest" and send
   - Browser A: Should see the message appear with translation

5. **Check Console Logs**
   - Open browser console (F12)
   - Look for logs starting with:
     - `🔍 [processTextMessage]` - Shows session context
     - `📤 [SessionTranslator] Sending message to MessageSyncService`
     - `📨 [SessionTranslator] Received message from partner`

## Expected Behavior
- Text messages should sync instantly between participants
- Each message should show original text and translation
- Messages from partner should appear on the left
- Own messages should appear on the right

## Fixed Issues
- Property name mismatch: `originalLang` → `original_lang`
- Session context now properly passed to text messages
- Text messages now use actual session ID and user ID instead of hardcoded values