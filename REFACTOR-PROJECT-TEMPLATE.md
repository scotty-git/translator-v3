# 🚀 VIBE CODER LARGE PROJECT TEMPLATE

## 📖 Table of Contents
1. [Introduction & Philosophy](#introduction--philosophy)
2. [Pre-Project Setup](#pre-project-setup)
3. [Phase Planning Template](#phase-planning-template)
4. [Autonomous Claude Protocol](#autonomous-claude-protocol)
5. [Testing & Validation Framework](#testing--validation-framework)
6. [Git Strategy & Safety Nets](#git-strategy--safety-nets)
7. [Database Migration Safety](#database-migration-safety)
8. [Emergency Procedures](#emergency-procedures)
9. [Examples & Reference](#examples--reference)
10. [Customization Guide](#customization-guide)

---

## 🎯 Introduction & Philosophy

### The Vibe Coder Approach

This template is designed for **solo developers** who want to tackle any large, complex project with confidence and flow. Whether you're building a new feature, refactoring existing code, or starting a new project entirely - it's built on the principle that big technical work should feel **exciting, not overwhelming**.

### Core Principles

1. **Autonomous Execution**: Claude can work through phases independently
2. **Safety First**: Every step is reversible with git tags and rollback plans
3. **Continuous Validation**: Automated tests catch regressions immediately
4. **Flow State**: Minimize interruptions and context switching
5. **Celebration**: Acknowledge progress and completion with dopamine hits

### When to Use This Template

- **New Feature Implementation** (multi-component features with backend/frontend)
- **Large Refactors** (>5 files, >1000 lines affected)
- **New Project Setup** (complex architecture from scratch)
- **Integration Projects** (adding third-party services, APIs)
- **Database Design & Implementation** (schema design, migrations, real-time features)
- **Multi-phase Projects** (where order and dependencies matter)
- **High-risk Changes** (touching core functionality or user-critical features)
- **Performance Optimization** (systematic performance improvements)
- **Security Implementation** (auth systems, permission models)
- **Any Complex Work** (>2 days estimated, multiple moving parts)

### The "Why It's Awesome" Mindset

Every phase should answer:
- **What user problem does this solve?** (for new features)
- **What debugging pain will this solve?** (for refactors)
- **What future work will this enable?** (for architecture)
- **How will this make development more enjoyable?** (for any project)
- **What specific value does this phase add?** (always)

---

## 🏗️ Pre-Project Setup

### 1. Project Health Check

Before starting any refactor:

```bash
# Verify all tests pass
npm test

# Check for TypeScript errors
npm run typecheck

# Ensure dev server works
npm run dev

# Check git status is clean
git status
```

### 2. Database Audit (CRITICAL)

**⚠️ MANDATORY for projects with database changes:**

```bash
# Get current database state
npm run db:status  # or equivalent

# List all tables and their schemas
# For Supabase projects, use MCP tools:
# - mcp__supabase__list_tables
# - mcp__supabase__list_migrations
# - mcp__supabase__list_extensions
```

**Claude Protocol**: Before executing any database-related phase, you MUST:
1. Use Supabase MCP tools to get current schema
2. Validate current state matches phase expectations
3. Create backup plan for any data that could be affected
4. Confirm with user if schema doesn't match expectations

### 3. Environment Documentation

Create a snapshot of your current environment:

```markdown
## Current Environment
- Node version: 
- Package manager: 
- Database: 
- Key services: 
- Deploy target: 
- Test framework: 
```

### 4. Success Metrics

Define what "done" looks like for your project type:

**For New Features:**
- [ ] User can complete the intended workflow
- [ ] Feature works across all supported devices/browsers
- [ ] Performance meets requirements
- [ ] All edge cases handled gracefully

**For Refactors:**
- [ ] Zero breaking changes to user functionality
- [ ] Code organization significantly improved
- [ ] Debugging experience enhanced

**For New Projects:**
- [ ] Core MVP functionality complete
- [ ] Architecture supports planned features
- [ ] Deployment pipeline working

**Universal:**
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Code review ready

---

## 📋 Phase Planning Template

### Phase Document Structure

Each phase should be a separate markdown file: `phase-XX-descriptive-name.md`

```markdown
# Phase X: [Clear Action Title]

*Choose the appropriate template section below based on your project type*

## 🎯 Vibe Check

**What we're doing**: [1-2 sentences explaining what you're building/changing]

**Why it's awesome**: [The user value this creates OR the development pain this solves]

**Time estimate**: [X-Y minutes/hours of Claude working autonomously]

**Project type**: [Feature/Refactor/Integration/Setup/etc.]

## ✅ Success Criteria

- [ ] [Specific, testable outcome 1]
- [ ] [Specific, testable outcome 2]
- [ ] [Performance/functionality maintained]
- [ ] [Tests passing]

## 🚀 Pre-Flight Checklist

Before starting, verify:
- [ ] Previous phases complete and working
- [ ] Dev server is running: `npm run dev`
- [ ] All tests pass: `npm test`
- [ ] Create safety commit: `git add -A && git commit -m "chore: pre-phase-X checkpoint"`
- [ ] Create git tag: `git tag pre-phase-X`

## 🧪 Automated Test Suite

```typescript
// tests/refactor/phase-X-validation.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Phase X: [Title] Validation', () => {
  test('[Main functionality still works]', async ({ page }) => {
    // Test core functionality
  })
  
  test('[New structure works correctly]', async ({ page }) => {
    // Test the changes
  })
  
  test('[Performance benchmark]', async ({ page }) => {
    // Verify no regressions
  })
})
```

## 📝 Implementation Steps

### Step 1: [Clear action]
[Specific instructions for Claude]

### Step 2: [Next action]
[More specific instructions]

[Continue with numbered steps...]

## ✅ Validation Steps

After implementation:

1. **Unit Testing**
   ```bash
   npm test -- [relevant test pattern]
   ```

2. **Integration Testing**
   ```bash
   npx playwright test tests/refactor/phase-X-validation.spec.ts
   ```

3. **Manual Testing**
   - [ ] [Key functionality check 1]
   - [ ] [Key functionality check 2]
   - [ ] No console errors
   - [ ] Performance feels the same

## 🔄 Rollback Plan

If something goes wrong:
```bash
git checkout pre-phase-X
npm install
npm run dev
```

## 📋 Completion Protocol

### Claude will:
1. Update this document with implementation results
2. Create summary commit with detailed message
3. Update main project progress tracker
4. Report completion using the standard format

---

## Implementation Results
*[Claude fills this section after completion]*

### What Changed:
- 

### Issues Encountered:
- 

### Test Results:
- 

### Performance Impact:
- 

### Architecture Improvements:
- 
```

---

## 🤖 Autonomous Claude Protocol

### Working Style for Claude

**You are working with a vibe coder who wants minimal interruptions.**

#### DO:
- Work through phases autonomously
- Make reasonable technical decisions
- Update documentation as you go
- Run tests continuously
- Commit at logical checkpoints
- Use the TodoWrite tool to track progress
- Take screenshots during testing for validation

#### DON'T:
- Ask permission for obvious technical decisions
- Stop mid-phase to ask for clarification
- Ask which files to edit (find them yourself)
- Interrupt with status updates every few minutes
- Ask before making commits (just do it)

### Execution Flow

1. **Phase Start**: Read phase document completely
2. **Pre-flight**: Verify all checklist items
3. **Implementation**: Work through steps autonomously
4. **Testing**: Run automated tests, take screenshots
5. **Validation**: Verify success criteria met
6. **Documentation**: Update phase document with results
7. **Commit**: Create detailed commit message
8. **Report**: Use the standard completion format

### Standard Completion Format

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ PHASE X COMPLETED: [Title]
   - [Key achievement 1]
   - [Key achievement 2]
   - [Performance metric if relevant]
   - [Tests passing: X unit, Y integration]

🎯 READY FOR YOUR REVIEW
   [Specific thing to test or verify]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Error Handling

If Claude encounters issues:
1. Document the problem in the phase file
2. Attempt reasonable solutions
3. If blocked, report clearly what's needed
4. Never leave the codebase in a broken state

---

## 🧪 Testing & Validation Framework

### Three-Layer Testing Approach

#### 1. Unit Tests (Fast, Focused)
```bash
# Run specific tests
npm test -- [pattern]

# With coverage
npm run test:coverage
```

**Purpose**: Validate individual services/components work correctly

#### 2. Integration Tests (Playwright, Comprehensive)
```bash
# Always run in headless mode
npx playwright test --project=chromium

# Take screenshots for validation
await page.screenshot({ path: 'test-results/phase-X-validation.png' })
```

**Purpose**: Validate full user workflows still work

#### 3. Manual Testing (Human, Experiential)
- Only after automated tests pass
- Focus on "feel" and performance
- Test edge cases and error conditions

### Testing Patterns

#### Performance Benchmarking
```typescript
test('Performance benchmark', async ({ page }) => {
  const startTime = Date.now()
  
  // Execute key operations
  
  const endTime = Date.now()
  const totalTime = endTime - startTime
  
  // Assert performance requirements
  expect(totalTime).toBeLessThan(5000)
  console.log(`Performance: Operation took ${totalTime}ms`)
})
```

#### Visual Validation
```typescript
test('Visual validation', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173')
  
  // Test light mode
  await page.screenshot({ path: 'test-results/light-mode.png' })
  
  // Test dark mode
  await page.click('[data-testid="theme-toggle"]')
  await page.screenshot({ path: 'test-results/dark-mode.png' })
  
  // Verify no UI issues
  await expect(page.locator('[class*="text-"]')).toBeVisible()
})
```

### Database Testing (If Applicable)

```typescript
// Before migration
const beforeSchema = await getSchema()

// After migration
const afterSchema = await getSchema()

// Verify expected changes
expect(afterSchema.tables).toInclude('new_table')
expect(afterSchema.policies).toInclude('new_policy')
```

---

## 📚 Git Strategy & Safety Nets

### Commit Strategy

#### Phase Commits
```bash
# Before each phase
git add -A
git commit -m "chore: pre-phase-X checkpoint"
git tag pre-phase-X

# After each phase
git add -A
git commit -m "$(cat <<'EOF'
refactor(phase-X): [descriptive title]

- [Specific change 1]
- [Specific change 2]
- [Performance/test notes]

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

#### Rollback Points
Every phase creates a tagged commit for instant recovery:
- `pre-phase-1a`, `pre-phase-1b`, etc.
- `phase-1a-complete`, `phase-1b-complete`, etc.

### Branch Strategy

```bash
# Create feature branch for the refactor
git checkout -b refactor/[project-name]

# Work through phases on this branch
# Merge back to main when complete
```

### Recovery Commands

```bash
# Go back to last working state
git checkout pre-phase-X

# See what changed
git diff pre-phase-X..HEAD

# Reset to specific commit
git reset --hard [commit-hash]
```

---

## 🗄️ Database Migration Safety

### Pre-Migration Checklist

**⚠️ CRITICAL: Complete this before any database changes**

1. **Schema Audit**
   ```bash
   # For Supabase projects
   # Claude: Use these MCP tools
   mcp__supabase__list_tables
   mcp__supabase__list_migrations
   mcp__supabase__list_extensions
   ```

2. **Data Backup**
   - Export critical data
   - Document current RLS policies
   - Save current schema definitions

3. **Dependency Check**
   - Map all services using affected tables
   - Identify real-time subscriptions
   - Check for foreign key constraints

### Migration Protocol

#### 1. Schema Validation
```sql
-- Before making changes, verify current state
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public';
```

#### 2. Non-Destructive Changes First
- Add new columns/tables before removing old ones
- Create new indexes before dropping old ones
- Update code to use new schema while maintaining compatibility

#### 3. Real-time Considerations
```sql
-- Update real-time publications
ALTER PUBLICATION supabase_realtime ADD TABLE new_table;

-- Verify RLS policies
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

### Rollback Migrations

Every migration needs a reverse:

```sql
-- Forward migration
ALTER TABLE messages ADD COLUMN new_field TEXT;

-- Reverse migration (create this first!)
ALTER TABLE messages DROP COLUMN new_field;
```

### Claude Database Protocol

When Claude encounters database work:

1. **STOP** - Don't proceed without verification
2. **AUDIT** - Use MCP tools to get current state
3. **VALIDATE** - Confirm current state matches expectations
4. **BACKUP** - Document what will change
5. **PROCEED** - Only after user confirmation if uncertain

---

## 🚨 Emergency Procedures

### Quick Recovery Commands

#### If Something Just Broke (Last 5 minutes)
```bash
# Quick undo of recent changes
git stash
git checkout HEAD~1
npm install
npm run dev
```

#### If You Need to Go Back Further
```bash
# List recent commits
git log --oneline -20

# Go back to specific commit
git checkout [commit-hash]
npm install
npm run dev
```

#### Phase-Specific Rollbacks
```bash
# Go back to before any phase
git checkout pre-phase-X
npm install
npm run dev
```

### Common Issues & Fixes

#### "Module not found" errors
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

#### Dev server won't start
```bash
# Kill any running processes
pkill -f "vite"
# Clear cache and restart
rm -rf node_modules/.vite
npm run dev
```

#### Tests failing after rollback
```bash
# Clear test cache
npm run test -- --clearCache
npm test
```

#### Database connection issues
```bash
# Check environment variables
cat .env.local
# Verify connection
curl [your-db-url]/rest/v1/
```

### When to Call for Help

If you've tried the above and things are still broken:

1. **Save current state**
   ```bash
   git stash save "emergency-backup-$(date +%Y%m%d-%H%M%S)"
   ```

2. **Document the situation**
   - What phase were you on?
   - What was the last successful step?
   - What error messages are you seeing?
   - Screenshots of any visual issues

3. **Use the simplest rollback**
   ```bash
   git checkout pre-phase-1a  # Go back to the very beginning
   ```

---

## 📚 Examples & Reference

### Real-World Examples

#### Example 1: Feature Implementation (Chat Translation App)
**Project**: Add real-time voice translation feature to existing app
**Duration**: 3 days across 8 phases
**Result**: Feature shipped on time, zero production issues

**Phase Structure:**
- **Phase 1**: Audio capture and permissions
- **Phase 2**: Whisper API integration
- **Phase 3**: Translation service integration
- **Phase 4**: Real-time sync infrastructure
- **Phase 5**: UI components and state management
- **Phase 6**: Testing and edge cases
- **Phase 7**: Performance optimization
- **Phase 8**: Documentation and deployment

#### Example 2: Refactor Project (Component Architecture)
**Project**: 1600-line component → Clean service architecture
**Duration**: 2 days across 9 phases
**Result**: 100% functionality preserved, debugging time reduced by 80%

**Phase Structure:**
- **Phase 1a-1e**: Service extraction (Queue, Pipeline, Presence, Connection, State)
- **Phase 2a-2d**: Component restructuring (Shared, Solo, Session, Cleanup)

#### Example 3: New Project Setup (SaaS MVP)
**Project**: Authentication + Dashboard + Payment processing
**Duration**: 5 days across 12 phases
**Result**: MVP ready for beta users

**Phase Structure:**
- **Phase 1-3**: Database design and setup
- **Phase 4-6**: Authentication system
- **Phase 7-9**: Core dashboard functionality
- **Phase 10-11**: Payment integration
- **Phase 12**: Polish and deployment

#### Universal Patterns:
- Each phase took 30-90 minutes (or 2-4 hours for complex phases)
- Automated tests caught issues early
- Git tags enabled fearless experimentation
- Database changes required extra safety protocols

### Common Refactor Patterns

#### Service Extraction
```typescript
// Before: Everything in component
class BigComponent {
  async processData() { /* 100 lines */ }
  async syncData() { /* 80 lines */ }
  async validateData() { /* 60 lines */ }
}

// After: Clean services
class DataProcessor implements IDataProcessor {
  async process(data: Data): Promise<Result> { /* focused logic */ }
}
```

#### Dependency Injection
```typescript
// Component receives services
interface Props {
  dataProcessor?: IDataProcessor
  syncService?: ISyncService
}

// Fallback for backward compatibility
const processor = props.dataProcessor || new DataProcessor()
```

### Performance Patterns

#### Metrics Collection
```typescript
const startTime = performance.now()
const result = await service.process(data)
const endTime = performance.now()

console.log(`Performance: ${service.name} took ${endTime - startTime}ms`)
```

#### Memory Management
```typescript
// Cleanup subscriptions
useEffect(() => {
  const unsubscribe = service.subscribe(callback)
  return () => unsubscribe()
}, [])
```

---

## 🎛️ Customization Guide

### Adapting for Different Project Types

#### New Feature Development
- **Phase 1-2**: Backend API/service layer
- **Phase 3-4**: Frontend components and state
- **Phase 5**: Integration and user flows
- **Phase 6**: Testing, polish, and edge cases
- Focus on user experience and performance

#### Large Refactors
- **Phase 1-N**: Extract services one by one
- **Phase N+1-M**: Restructure components
- **Phase M+1**: Cleanup and optimization
- Maintain 100% backward compatibility until final cleanup

#### New Project Setup
- **Phase 1-2**: Project structure and core dependencies
- **Phase 3-4**: Database design and authentication
- **Phase 5-6**: Core business logic and APIs
- **Phase 7-8**: Frontend foundation and key components
- **Phase 9+**: Feature implementation phases

#### Integration Projects
- **Phase 1**: Research and API exploration
- **Phase 2**: Authentication and connection setup
- **Phase 3**: Core integration logic
- **Phase 4**: Error handling and edge cases
- **Phase 5**: UI integration and user experience
- **Phase 6**: Testing and monitoring

#### Performance Optimization
- **Phase 1**: Profiling and bottleneck identification
- **Phase 2-N**: Address each performance issue
- **Phase N+1**: Monitoring and alerting
- Focus on measurable improvements and regression prevention

#### Migration Projects (Database, Framework, etc.)
- **Phase 1**: Dual-write setup (if applicable)
- **Phase 2-N**: Migrate components/modules incrementally
- **Phase N+1**: Switch over and cleanup
- Extensive rollback planning required

### Scaling the Template

#### Small Refactors (2-3 phases)
- Combine related changes
- Shorter time estimates
- Simpler testing requirements

#### Large Refactors (10+ phases)
- Group phases into "waves"
- Add intermediate celebration points
- Consider parallel work streams

#### High-Risk Refactors
- Add extra rollback points
- Require manual testing after each phase
- Consider feature flags for gradual rollout

### Time Estimation Guidelines

#### Simple Service Extraction
- 30-45 minutes per service
- Add 15 minutes for tests
- Add 10 minutes for documentation

#### Complex Architecture Changes
- 60-90 minutes per major change
- Add 30 minutes for integration testing
- Add 15 minutes for performance validation

#### Database Migrations
- 45-60 minutes per migration
- Add 30 minutes for safety protocols
- Add 15 minutes for rollback testing

---

## 🎉 Success Celebration

### Completion Rituals

1. **Notification System**: Set up completion sounds/alerts
2. **Progress Visualization**: Update progress charts
3. **Documentation**: Capture what was learned
4. **Metrics**: Measure the improvement achieved

### Project Completion Checklist

- [ ] All phases complete
- [ ] All tests passing
- [ ] Performance maintained or improved
- [ ] Documentation updated
- [ ] Rollback procedures tested
- [ ] Team/stakeholders notified
- [ ] Deployment successful
- [ ] Monitoring confirms stability

### Learning Capture

Document what you learned:
- What worked well?
- What would you do differently?
- What patterns emerged?
- What can be reused next time?

---

**Remember**: The goal isn't just to refactor code—it's to create a more enjoyable, debuggable, and maintainable codebase that makes future development a joy rather than a chore.

*Template created by a vibe coder, for vibe coders. 🚀*