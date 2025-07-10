# 🚨 EMERGENCY ROLLBACK PROCEDURES

## Quick Recovery Commands

### 🔥 If Something Just Broke (Last 5 minutes)
```bash
# Quick undo of recent changes
git stash
git checkout HEAD~1
npm install
npm run dev
```

### ⏰ If You Need to Go Back Further
```bash
# List recent commits to find a good state
git log --oneline -20

# Go back to specific commit
git checkout <commit-hash>
npm install
npm run dev
```

### 🎯 Phase-Specific Rollbacks

Each phase creates tagged commits for easy recovery:

#### Phase 1a (MessageQueue)
```bash
git checkout pre-phase-1a
```

#### Phase 1b (TranslationPipeline)
```bash
git checkout pre-phase-1b
```

#### Phase 1c (PresenceService)
```bash
git checkout pre-phase-1c
```

#### Phase 1d (RealtimeConnection)
```bash
git checkout pre-phase-1d
```

#### Phase 1e (SessionStateManager)
```bash
git checkout pre-phase-1e
```

#### Phase 2a (SharedComponents)
```bash
git checkout pre-phase-2a
```

#### Phase 2b (SoloTranslator)
```bash
git checkout pre-phase-2b
```

#### Phase 2c (SessionRefactor)
```bash
git checkout pre-phase-2c
```

#### Phase 2d (Cleanup)
```bash
git checkout pre-phase-2d
```

## 🩺 Diagnostic Commands

### Check What Changed
```bash
# See what files were modified
git status

# See detailed changes
git diff

# See commit history with changes
git log -p -5
```

### Verify App Health
```bash
# Run tests
npm test

# Check for TypeScript errors
npm run typecheck

# Run Playwright tests
npm run test:e2e
```

## 🔧 Common Issues & Fixes

### "Module not found" errors
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### Dev server won't start
```bash
# Kill any running processes
pkill -f "vite"
# Clear cache and restart
rm -rf node_modules/.vite
npm run dev
```

### Tests failing after rollback
```bash
# Clear test cache
npm run test -- --clearCache
# Run tests again
npm test
```

### Supabase connection issues
```bash
# Check environment variables
cat .env.local
# Verify Supabase is accessible
curl https://awewzuxizupxyntbevmg.supabase.co/rest/v1/
```

## 📞 When to Call for Help

If you've tried the above and things are still broken:

1. **Save your current state**
   ```bash
   git stash save "emergency-backup-$(date +%Y%m%d-%H%M%S)"
   ```

2. **Document what happened**
   - What phase were you on?
   - What was the last successful step?
   - What error messages are you seeing?
   - Screenshot any visual issues

3. **Check recent session logs**
   ```bash
   ls -la chat-logs/$(date +%Y-%m-%d)/
   ```

## 🎯 Prevention Tips

1. **Always verify before proceeding**
   - Tests passing? ✓
   - Dev server running? ✓
   - No console errors? ✓

2. **Watch for warning signs**
   - Unusually long test runs
   - New TypeScript errors
   - Console warnings about missing dependencies

3. **Take breaks between phases**
   - Fresh eyes catch issues faster
   - Gives time to notice any delayed problems

## 💡 Recovery Confidence Boosters

Remember:
- Git has your back - everything is recoverable
- Each phase is designed to be reversible
- The app was working before, it can work again
- Small commits = easy to pinpoint issues

---

**Pro tip**: If you're reading this in a panic, take a deep breath. The fix is usually simpler than it seems. Start with the quick recovery commands and work your way down.