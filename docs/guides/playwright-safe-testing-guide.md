# 🛡️ Playwright Safe Testing Guide

> **🚨 CRITICAL**: Never run Playwright tests directly! Unicode output will corrupt Claude Code and kill your session.

## ⚡ Quick Start

### DO THIS ✅
```bash
# Always use the sanitizer:
./scripts/safe-test-smart.sh [any-playwright-args]

# Or use npm scripts:
npm run test:e2e
npm run test:playwright
```

### NEVER DO THIS ❌
```bash
# These commands WILL corrupt Claude Code:
npx playwright test                    # CORRUPTS!
npx playwright test my-test.spec.ts    # CORRUPTS!
```

## 🔍 Understanding the Problem

### What Happens When You Run Playwright Directly

1. **Playwright outputs Unicode characters** (emojis like 🏠, ✅, →)
2. **Claude Code captures ALL output** in real-time
3. **Output is stored in ~/.claude.json** immediately
4. **Large Unicode output corrupts the JSON** with "no low surrogate in string" errors
5. **Your entire Claude session becomes unusable**

### The Error You'll See
```
API Error: 400 {"type":"error","error":{"type":"invalid_request_error","message":"The request body is not valid JSON: no low surrogate in string: line 1 column 357753 (char 357752)"}}
```

## 🛠️ The Solution: Smart Sanitizer

The `safe-test-smart.sh` script prevents corruption by:

1. **Replacing ALL Unicode characters** with safe ASCII labels
2. **Preserving readability** while ensuring safety
3. **Future-proofing** against any new Unicode characters

### How It Works

| Original | Sanitized | Why It's Safe |
|----------|-----------|---------------|
| 🏠 | [EMOJI] | No Unicode |
| → | [ARROW] | ASCII only |
| ✅ | [SYM] | Clear meaning |
| é | e | Normalized |
| € | [CURR] | Type labeled |

## 📋 Setup Instructions

### 1. Initial Setup (One Time)
```bash
# Make sure scripts are executable
chmod +x scripts/safe-test-*.sh

# Run setup helper
npm run setup:safe-testing
```

### 2. Update Your Workflow
```bash
# Instead of: npx playwright test
# Always use: ./scripts/safe-test-smart.sh

# All arguments work exactly the same:
./scripts/safe-test-smart.sh --project=chromium
./scripts/safe-test-smart.sh tests/my-test.spec.ts --headed
./scripts/safe-test-smart.sh --ui
```

### 3. Use NPM Scripts
```json
// These are already configured in package.json:
"test:e2e": "./scripts/safe-test-smart.sh",
"test:playwright": "./scripts/safe-test-smart.sh"
```

## 🎯 Common Use Cases

### Running Specific Tests
```bash
# Single test file
./scripts/safe-test-smart.sh tests/session.spec.ts

# With reporter
./scripts/safe-test-smart.sh tests/session.spec.ts --reporter=list

# With debugging
DEBUG=pw:api ./scripts/safe-test-smart.sh tests/session.spec.ts
```

### Running All Tests
```bash
# All tests
npm run test:e2e

# Specific project
npm run test:e2e -- --project=chromium

# With UI mode (safe!)
npm run test:e2e -- --ui
```

### CI/CD Integration
```yaml
# GitHub Actions example
- name: Run E2E Tests Safely
  run: npm run test:e2e
```

## 🚨 Emergency Recovery

### If You Accidentally Ran Playwright Directly

1. **Immediate Action**: Press `Cmd+Esc` to exit Claude Code
2. **Clean the Corruption**:
   ```bash
   python3 scripts/clean-claude-history.py
   ```
3. **Start Fresh**: Launch Claude Code again

### Prevention is Better
- **Always use the sanitizer** - no exceptions
- **Add to muscle memory**: `./scripts/safe-test-smart.sh`
- **Use npm scripts**: `npm run test:e2e`

## 🔧 Technical Details

### The Sanitizer Script
Located at `/scripts/safe-test-smart.sh`, it:

1. **Intercepts all Playwright output**
2. **Processes through Python sanitizer**
3. **Categorizes Unicode by type**:
   - Emoji ranges (U+1F300-U+1F9FF) → `[EMOJI]`
   - Arrow symbols (U+2190-U+21FF) → `[ARROW]`
   - Box drawing (U+2500-U+257F) → `[BOX]`
   - Math symbols → `[MATH]`
   - Currency → `[CURR]`
   - Accented letters → ASCII equivalent (é→e)
   - Everything else → `[U+XXXX]`

### Why This Works
- **No Unicode reaches Claude Code** - only ASCII
- **Output remains readable** - labels preserve meaning
- **Future-proof** - catches ALL non-ASCII, not just known emojis

## 📚 Additional Resources

- **Investigation Log**: `/docs/debugging/claude-json-corruption-investigation.md`
- **Sanitizer Source**: `/scripts/safe-test-smart.sh`
- **Setup Helper**: `/scripts/setup-safe-playwright.sh`

## 🎓 Key Takeaways

1. **NEVER run `npx playwright test` directly**
2. **ALWAYS use `./scripts/safe-test-smart.sh`**
3. **Prevention is the only cure** - once corrupted, session is lost
4. **All Playwright features work** - just sanitized output

---

Remember: The sanitizer is your friend. Use it every time, without exception. Your Claude Code sessions depend on it! 🛡️