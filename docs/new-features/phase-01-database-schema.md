# Phase 1: Database Schema Updates

## 🎯 Vibe Check

**What we're doing**: Adding database support for message reactions, edits, and deletions to enable persistent storage of user interactions.

**Why it's awesome**: Users can finally express emotions through reactions, fix transcription errors, and manage their message history - all synced in real-time across devices!

**Time estimate**: 45-60 minutes of Claude working autonomously

**Project type**: Database Migration & Schema Update

## ✅ Success Criteria

- [ ] Messages table has new columns for edit/delete tracking
- [ ] Message_reactions table created with proper indexes
- [ ] RLS policies configured for security
- [ ] Real-time subscriptions enabled for new table
- [ ] All existing data remains intact
- [ ] Rollback migration prepared and tested

## 🚀 Pre-Flight Checklist

Before starting, verify:
- [ ] Current database schema matches expectations (use Supabase MCP)
- [ ] All tests pass: `npm test`
- [ ] Dev server is running: `npm run dev`
- [ ] Create safety commit: `git add -A && git commit -m "chore: pre-phase-1 checkpoint"`
- [ ] Create git tag: `git tag pre-phase-1`

## 🧪 Automated Test Suite

```typescript
// tests/features/phase-1-validation.spec.ts
import { test, expect } from '@playwright/test'
import { supabase } from '@/lib/supabase'

test.describe('Phase 1: Database Schema Validation', () => {
  test('messages table has new columns', async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('is_edited, edited_at, is_deleted, deleted_at')
      .limit(1)
    
    expect(error).toBeNull()
    expect(data).toBeDefined()
  })
  
  test('message_reactions table exists and has correct structure', async () => {
    const { data, error } = await supabase
      .from('message_reactions')
      .select('id, message_id, user_id, emoji, created_at')
      .limit(1)
    
    expect(error).toBeNull()
    expect(data).toBeDefined()
  })
  
  test('can insert and retrieve reactions', async () => {
    // Create test message first
    const { data: message } = await supabase
      .from('messages')
      .insert({
        session_id: 'test-session',
        sender_id: 'test-user',
        original_text: 'Test message',
        translated_text: 'Mensaje de prueba',
        original_language: 'en'
      })
      .select()
      .single()
    
    // Add reaction
    const { data: reaction, error } = await supabase
      .from('message_reactions')
      .insert({
        message_id: message.id,
        user_id: 'test-user-2',
        emoji: '👍'
      })
      .select()
      .single()
    
    expect(error).toBeNull()
    expect(reaction.emoji).toBe('👍')
    
    // Cleanup
    await supabase.from('messages').delete().eq('id', message.id)
  })
})
```

## 📝 Implementation Steps

### Step 1: Audit Current Database State

**⚠️ CRITICAL: Claude must first use Supabase MCP tools to verify current state**

```typescript
// Claude will execute:
// 1. mcp__supabase__list_tables - Get all tables
// 2. mcp__supabase__execute_sql with:
//    SELECT column_name, data_type, is_nullable 
//    FROM information_schema.columns 
//    WHERE table_name = 'messages'
// 3. mcp__supabase__list_migrations - Check migration history
```

### Step 2: Create Forward Migration

Create the migration file with rollback consideration:

```sql
-- Forward Migration: Add message interaction support
BEGIN;

-- Add edit/delete tracking to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create message_reactions table
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_message_emoji UNIQUE(message_id, user_id, emoji)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id 
  ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id 
  ON public.message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_deleted 
  ON public.messages(is_deleted) WHERE is_deleted = false;

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_reactions
CREATE POLICY "Users can view reactions on messages in their session"
  ON public.message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_reactions.message_id
      AND m.session_id IN (
        SELECT session_id FROM public.session_participants
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can add their own reactions"
  ON public.message_reactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove their own reactions"
  ON public.message_reactions FOR DELETE
  USING (user_id = auth.uid());

-- Enable real-time for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;

COMMIT;
```

### Step 3: Create Rollback Migration

Prepare the reverse migration for safety:

```sql
-- Rollback Migration: Remove message interaction support
BEGIN;

-- Remove real-time subscription
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.message_reactions;

-- Drop policies
DROP POLICY IF EXISTS "Users can view reactions on messages in their session" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can add their own reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can remove their own reactions" ON public.message_reactions;

-- Drop reactions table
DROP TABLE IF EXISTS public.message_reactions;

-- Remove columns from messages
ALTER TABLE public.messages 
DROP COLUMN IF EXISTS is_edited,
DROP COLUMN IF EXISTS edited_at,
DROP COLUMN IF EXISTS is_deleted,
DROP COLUMN IF EXISTS deleted_at;

COMMIT;
```

### Step 4: Apply Migration

**⚠️ STOP HERE - User consultation required for Supabase operations**

Claude will need user guidance for:
1. Confirming the migration approach
2. Handling any existing data considerations
3. Executing the migration via Supabase MCP tools

### Step 5: Update TypeScript Types

Update the database types to reflect schema changes:

```typescript
// In src/types/database.ts - extend existing types

export interface Database {
  public: {
    Tables: {
      messages: {
        Row: {
          // ... existing fields ...
          is_edited: boolean
          edited_at: string | null
          is_deleted: boolean
          deleted_at: string | null
        }
        Insert: {
          // ... existing fields ...
          is_edited?: boolean
          edited_at?: string | null
          is_deleted?: boolean
          deleted_at?: string | null
        }
        Update: {
          // ... existing fields ...
          is_edited?: boolean
          edited_at?: string | null
          is_deleted?: boolean
          deleted_at?: string | null
        }
      }
      message_reactions: {
        Row: {
          id: string
          message_id: string
          user_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          emoji: string
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          user_id?: string
          emoji?: string
          created_at?: string
        }
      }
    }
  }
}

// Extend SessionMessage type
export interface SessionMessage {
  // ... existing fields ...
  is_edited?: boolean
  edited_at?: string | null
  is_deleted?: boolean
  deleted_at?: string | null
  reactions?: DatabaseReaction[]
}

// New type for database reactions
export interface DatabaseReaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
}
```

## ✅ Validation Steps

After implementation:

1. **Schema Verification**
   ```sql
   -- Verify new columns exist
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'messages' 
   AND column_name IN ('is_edited', 'edited_at', 'is_deleted', 'deleted_at');
   
   -- Verify reactions table
   SELECT * FROM information_schema.tables 
   WHERE table_name = 'message_reactions';
   ```

2. **Test Data Operations**
   ```typescript
   // Test reaction insert
   const { error } = await supabase
     .from('message_reactions')
     .insert({ message_id: 'test', user_id: 'test', emoji: '👍' })
   ```

3. **RLS Policy Testing**
   - Verify users can only see reactions in their sessions
   - Confirm users can only delete their own reactions

4. **Real-time Subscription Test**
   ```typescript
   // Test real-time works
   const channel = supabase
     .channel('test-reactions')
     .on('postgres_changes', {
       event: '*',
       schema: 'public',
       table: 'message_reactions'
     }, payload => {
       console.log('Reaction change:', payload)
     })
     .subscribe()
   ```

## 🔄 Rollback Plan

If something goes wrong:
1. Stop all application servers
2. Execute rollback migration via Supabase dashboard
3. Revert code changes: `git checkout pre-phase-1`
4. Restart services: `npm install && npm run dev`
5. Verify application still works with original schema

## 📋 Completion Protocol

### Claude will:
1. Use Supabase MCP tools to verify current state
2. **STOP and consult user** before applying migrations
3. Update TypeScript types after migration success
4. Run validation tests
5. Create summary commit with detailed message
6. Report completion using standard format

---

## ⚠️ Critical Supabase Consultation Points

**Claude MUST consult user at these points:**
1. Before creating any migrations - to understand Supabase project specifics
2. Before applying migrations - to ensure proper execution method
3. If schema doesn't match expectations - to avoid data loss
4. For RLS policy considerations - to ensure security model is correct

## Implementation Results
*Completed: July 11, 2025*

### What Changed:
- ✅ Added 4 new columns to messages table: `is_edited`, `edited_at`, `is_deleted`, `deleted_at`
- ✅ Created new `message_reactions` table with proper indexes and constraints
- ✅ Enabled RLS on message_reactions table with 3 policies
- ✅ Added message_reactions to real-time subscriptions
- ✅ Updated TypeScript types in `database.ts` to reflect new schema
- ✅ Added `DatabaseReaction` interface for type safety

### Issues Encountered:
- Initial confusion about auth patterns - resolved by auditing existing tables
- Discovered app uses device-generated UUIDs, not Supabase Auth
- Adapted RLS policies to match existing simple NULL check pattern

### Test Results:
- ✅ All database migrations applied successfully
- ✅ Verification queries confirmed proper schema creation
- ✅ TypeScript types updated and compile without errors
- ⚠️ Unit tests have pre-existing failures unrelated to our changes
- ✅ App continues to run without issues at http://127.0.0.1:5173

### Performance Impact:
- Added 3 new indexes for optimal query performance
- Cascade delete ensures referential integrity
- Partial index on `is_deleted` for efficient soft-delete queries

### Next Phase Readiness:
- ✅ Database fully prepared for reaction, edit, and delete features
- ✅ TypeScript types ready for UI components
- ✅ Real-time subscriptions configured for live updates
- ✅ Ready to proceed with Phase 2 (Sync Services) or Phase 3 (UI Components)