# Complete Session User Flow Analysis

## Overview
This document provides a comprehensive analysis of the user flow for creating and joining sessions in the translator-v3 application, including all UI elements, selectors, and navigation paths needed for Playwright testing.

## Application Routes

### Main Routes
- **Homepage**: `/` - Landing page with session creation/joining options
- **Solo Translator**: `/translator` - Single-device translation mode
- **Session Translator**: `/session` - Two-device session mode

## User Flow 1: Creating a Session

### Step 1: Homepage
**URL**: `http://127.0.0.1:5173/`

**Key Elements**:
- **Solo Mode Button**: 
  - Text: "🗣️ Start Translating"
  - Selector: `page.getByText('Start Translating')`
  - Action: Navigates to `/translator`

- **Session Creation Button**:
  - Text: "Start Session"
  - Selector: `page.getByText('Start Session')`
  - CSS Classes: `flex flex-col items-center justify-center gap-1 h-12 px-4 min-w-[120px] bg-blue-600`
  - Icon: `<UserPlus className="h-4 w-4" />`

### Step 2: Creating Session
When "Start Session" is clicked:
1. Button enters loading state (disabled)
2. Calls `sessionStateManager.createSession()`
3. Creates session in Supabase with 4-digit code
4. Navigates to `/session` with session state

### Step 3: Session View
**URL**: `/session`

**Session Header Display** (Located in header, center position):
```
Session: [4-digit code] | [Connection Status] | [Partner Status]
```

**Specific Elements**:
- **Session Code Display**:
  - Location: Header center, line 873-875 in SoloTranslator
  - HTML: `<span className="font-mono font-semibold text-blue-600 dark:text-blue-400 text-sm">{sessionInfo.code}</span>`
  - Parent has text "Session:" before the code
  
- **Connection Status**:
  - Shows: "Connected", "Connecting...", "Reconnecting...", or "Disconnected"
  - Icons: Wifi, animated pulse/spin states
  
- **Partner Status**:
  - Text: "Partner Online" (green) or "Waiting for partner..." (gray)
  - Icon: Users icon

## User Flow 2: Joining a Session

### Step 1: Homepage
**URL**: `http://127.0.0.1:5173/`

### Step 2: Show Join Input
**Action**: Click "Join Session" button
- Selector: `page.getByText('Join Session')`
- Result: Reveals join input field with animation

**Join Input Elements**:
- **Label**: "Enter 4-digit session code"
- **Input Field**:
  - ID: `join-code-input`
  - Test ID: `data-testid="join-code-input"`
  - Placeholder: "1234"
  - Type: `inputMode="numeric" pattern="[0-9]*" maxLength={4}`
  - Validation: Only accepts digits, max 4 characters
  
- **Join Button**:
  - Text: "Join"
  - Selector: `page.getByRole('button', { name: 'Join' })`
  - State: Disabled until 4 digits entered
  - Loading state: Shows "Joining..." when clicked

### Step 3: Join Process
1. Enter 4-digit code
2. Click "Join" or press Enter
3. Calls `sessionStateManager.joinSession(joinCode)`
4. Validates session exists and has space
5. Navigates to `/session` on success
6. Shows error message on failure

## Key Testing Selectors

### Homepage Selectors
```javascript
// Buttons
page.getByText('Start Translating')
page.getByText('Start Session')
page.getByText('Join Session')

// Join Flow
page.getByTestId('join-code-input')
page.getByPlaceholderText('1234')
page.getByRole('button', { name: 'Join' })
page.getByRole('button', { name: 'Joining...' })

// Error Messages
page.getByText(/Invalid session code/)
page.getByText(/Session is full/)
```

### Session View Selectors
```javascript
// Session Info (in header)
page.locator('text=Session:').locator('..').locator('.font-mono') // Gets session code
page.getByText('Partner Online')
page.getByText('Waiting for partner...')
page.getByText('Connected')
page.getByText('Connecting...')

// Activity Indicators
page.getByText('Partner is recording...')
page.getByText('Partner is processing...')

// Messages
page.locator('[id^="message-"]') // All messages
page.locator('.message-bubble') // Message bubbles
```

## Session State Management

### Session Creation Response
```javascript
{
  sessionId: 'uuid',
  sessionCode: '1234', // 4-digit string
  userId: 'uuid',
  isHost: true,
  createdAt: 'timestamp'
}
```

### Session Storage
- Stored in localStorage: `translator_session_state`
- Persists across page refreshes
- Expires after 24 hours

## Error Scenarios

### Join Errors
1. **Invalid Code**: "Invalid session code"
2. **Session Full**: "Session is full"
3. **Session Expired**: "Session has expired"
4. **Network Error**: "Failed to connect. Please check your internet connection."

### Connection States
1. **connecting**: Initial connection attempt
2. **connected**: Successfully connected to realtime channels
3. **reconnecting**: Lost connection, attempting to reconnect
4. **disconnected**: Not connected

## Testing Tips

### Wait for Elements
```javascript
// Wait for session code to appear
await page.waitForSelector('.font-mono', { timeout: 5000 })

// Wait for partner to join
await page.waitForText('Partner Online', { timeout: 30000 })

// Wait for connection
await page.waitForText('Connected', { timeout: 10000 })
```

### Mock Supabase Responses
```javascript
// Mock session creation
await page.route('**/rest/v1/sessions*', async (route) => {
  if (route.request().method() === 'POST') {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({
        id: 'test-session-id',
        code: '1234'
      })
    })
  }
})
```

### Full User Journey Test
```javascript
test('complete session flow', async ({ page }) => {
  // 1. Create session as User A
  await page.goto('http://127.0.0.1:5173/')
  await page.getByText('Start Session').click()
  
  // 2. Get session code
  await page.waitForURL('**/session')
  const sessionCode = await page.locator('text=Session:')
    .locator('..')
    .locator('.font-mono')
    .textContent()
  
  // 3. User B joins session
  const page2 = await browser.newPage()
  await page2.goto('http://127.0.0.1:5173/')
  await page2.getByText('Join Session').click()
  await page2.getByTestId('join-code-input').fill(sessionCode)
  await page2.getByRole('button', { name: 'Join' }).click()
  
  // 4. Verify both users see each other
  await expect(page.getByText('Partner Online')).toBeVisible()
  await expect(page2.getByText('Partner Online')).toBeVisible()
})
```

## Component Architecture

### Key Components
1. **HomeScreen** (`/src/features/home/HomeScreen.tsx`): Landing page with session options
2. **SessionTranslator** (`/src/features/translator/SessionTranslator.tsx`): Session wrapper component
3. **SoloTranslator** (`/src/features/translator/solo/SoloTranslator.tsx`): Main translator UI (used in both modes)
4. **SessionHeader** (`/src/components/SessionHeader.tsx`): Displays session info (currently inline in SoloTranslator)

### State Flow
1. **SessionStateManager**: Manages session creation, joining, and persistence
2. **RealtimeConnection**: Handles Supabase realtime channels
3. **MessageSyncService**: Syncs messages between devices
4. **PresenceService**: Tracks online status and activity

## Real-time Features

### Activity States
- **idle**: No activity
- **recording**: Currently recording audio
- **processing**: Transcribing/translating
- **typing**: Using text input mode

### Message Sync
- Messages sync instantly via Supabase postgres_changes
- Each message has unique UUID
- Offline messages queue and sync when reconnected

### Presence Tracking
- Shows "Partner Online" when other user joins
- Updates in real-time when partner disconnects
- Activity indicators show partner's current action