# 🚀 Setup Guide - Zero to Hero

Get the Real-time Translator v3 running on your machine in under 10 minutes.

---

## ✅ Prerequisites

### Required Software
```bash
# Node.js (v18 or higher)
node --version  # Should be 18.x or higher
npm --version   # Should be 9.x or higher

# Git
git --version
```

**Don't have Node.js?** Download from [nodejs.org](https://nodejs.org/) (LTS version recommended)

### API Account Setup
1. **OpenAI Account** - Get API key from [platform.openai.com](https://platform.openai.com/api-keys)
2. **Supabase Account** - Create project at [supabase.com](https://supabase.com)

---

## 📦 Project Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd translator-v3

# 2. Install dependencies
npm install

# 3. Verify installation
npm run type-check  # Should pass without errors
```

---

## 🔑 Environment Configuration

### 1. Create Environment File
```bash
# Copy the example file
cp .env.example .env.local

# Or create manually
touch .env.local
```

### 2. Add Your API Keys
Open `.env.local` and add:

```bash
# OpenAI Configuration
VITE_OPENAI_API_KEY=sk-proj-your-openai-key-here

# Supabase Configuration  
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# Optional: Development settings
VITE_ENV=development
```

### 3. Get Your Supabase Credentials

**Step 1: Create Supabase Project**
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization and enter project details
4. Wait for database to spin up (~2 minutes)

**Step 2: Get URL and Key**
1. Go to **Settings** → **API**
2. Copy **Project URL** → Use as `VITE_SUPABASE_URL`
3. Copy **anon public** key → Use as `VITE_SUPABASE_ANON_KEY`

**Step 3: Set Up Database Schema**
1. Go to **SQL Editor** in Supabase dashboard
2. Run this schema setup:

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

-- Messages table
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

-- User activity table
CREATE TABLE user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  activity TEXT NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_sessions_code ON sessions(code);
CREATE INDEX idx_sessions_active ON sessions(is_active, expires_at);
CREATE INDEX idx_messages_session ON messages(session_id, created_at);
CREATE INDEX idx_activity_session_user ON user_activity(session_id, user_id);
```

---

## 🏃‍♂️ Start Development Server

### Standard Method
```bash
npm run dev
```

### Network Access (for testing on mobile)
```bash
npm run dev:network
```

### Expected Output
```
VITE v5.4.19  ready in 448 ms

➜  Local:   http://localhost:5173/
➜  Network: http://192.168.1.45:5173/
➜  UnoCSS Inspector: http://localhost:5173/__unocss/
```

---

## 🔧 VPN & Localhost Issues

**Problem**: Using VPN (NordVPN, etc.) blocks localhost access

### Solution 1: Use 127.0.0.1 (Recommended)
```bash
# Instead of http://localhost:5173
# Use http://127.0.0.1:5173
```

### Solution 2: Configure VPN Bypass (macOS)
```bash
# Add localhost to VPN bypass list
sudo networksetup -setproxybypassdomains Wi-Fi "*.local" "169.254/16" "localhost" "127.0.0.1" "::1" "[::1]" "localhost:5173" "127.0.0.1:5173"

# Restart browser after running this command
```

### Solution 3: Use Network IP
```bash
# Check the Network URL from vite output
# Example: http://192.168.1.45:5173/
# Use this URL instead of localhost
```

---

## ✅ Verification Steps

### 1. Basic App Loading
```bash
# Visit http://127.0.0.1:5173
# Should see: "Real-time Translator" homepage
# Should see: "Create Session" and "Join Session" buttons
```

### 2. Environment Variables Check
```bash
# Open browser console (F12)
# Run this in console:
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL)

# Should show your Supabase URL, not undefined
```

### 3. Database Connection Test
```bash
# Go to translator page: http://127.0.0.1:5173/translator
# Open browser console
# Look for "✅ Supabase connected" message
# Should NOT see connection errors
```

### 4. OpenAI API Test
```bash
# On translator page, try text translation:
# 1. Click "Type" tab
# 2. Type "Hello world"
# 3. Press Enter
# 4. Should see translation appear

# Check console for:
# "🌐 Calling GPT-4o-mini for translation"
# Should NOT see 401 authentication errors
```

### 5. Run Test Suite
```bash
# Unit tests
npm test

# E2E tests (requires app running)
npx playwright test tests/critical-fixes-test.spec.ts

# All should pass ✅
```

---

## 🐛 Common Setup Issues

### Issue: "Module not found" errors
```bash
# Solution: Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: "VITE_* environment variables undefined"
```bash
# Solution: Ensure .env.local exists in project root
ls -la .env.local  # Should exist

# Restart dev server after adding env vars
npm run dev
```

### Issue: Supabase connection fails
```bash
# Check 1: Verify URL format
echo $VITE_SUPABASE_URL
# Should be: https://your-project-id.supabase.co

# Check 2: Test database in Supabase dashboard
# Go to Table Editor → Should see sessions, messages, user_activity tables

# Check 3: Check RLS policies (if enabled)
# Supabase → Authentication → RLS should be disabled for development
```

### Issue: OpenAI API fails
```bash
# Check 1: Verify API key format
echo $VITE_OPENAI_API_KEY
# Should start with: sk-proj-

# Check 2: Test API key
curl -H "Authorization: Bearer $VITE_OPENAI_API_KEY" \
     https://api.openai.com/v1/models

# Should return JSON with model list, not 401 error
```

### Issue: Port 5173 already in use
```bash
# Find what's using the port
lsof -i :5173

# Kill the process
pkill -f "vite"

# Or use different port
npm run dev -- --port 5174
```

### Issue: Audio permissions blocked
```bash
# Solution: 
# 1. Use HTTPS (required for audio in production)
# 2. Or allow microphone for localhost in browser settings
# Chrome: Settings → Privacy → Microphone → Allow for localhost
```

---

## 🏆 You're Ready!

If all verification steps pass, you're ready to develop! 

**Next Steps:**
- 📖 Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the system
- 🎨 Check [COMPONENTS.md](./COMPONENTS.md) for UI patterns  
- 🧪 See [TESTING.md](./TESTING.md) for testing strategies
- 🚀 Try [DEPLOYMENT.md](./DEPLOYMENT.md) to go live

**Still having issues?** Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for more solutions.