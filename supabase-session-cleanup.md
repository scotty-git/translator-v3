# Supabase Session Cleanup Commands

## 🧹 Complete Session Data Cleanup

Run these commands in your Supabase SQL Editor to completely remove all session-related data and schemas:

### 1. Drop Session Tables (if they exist)
```sql
-- Drop messages table (contains session_id references)
DROP TABLE IF EXISTS public.messages CASCADE;

-- Drop sessions table
DROP TABLE IF EXISTS public.sessions CASCADE;

-- Drop user_sessions junction table (if exists)
DROP TABLE IF EXISTS public.user_sessions CASCADE;

-- Drop session_participants table (if exists) 
DROP TABLE IF EXISTS public.session_participants CASCADE;

-- Drop any session-related indexes
DROP INDEX IF EXISTS idx_messages_session_id;
DROP INDEX IF EXISTS idx_messages_timestamp;
DROP INDEX IF EXISTS idx_sessions_code;
DROP INDEX IF EXISTS idx_sessions_created_at;
DROP INDEX IF EXISTS idx_sessions_status;
```

### 2. Drop Session-Related Functions (if they exist)
```sql
-- Drop any session management functions
DROP FUNCTION IF EXISTS create_session(text);
DROP FUNCTION IF EXISTS join_session(text, uuid);
DROP FUNCTION IF EXISTS leave_session(text, uuid);
DROP FUNCTION IF EXISTS get_session_messages(text);
DROP FUNCTION IF EXISTS cleanup_expired_sessions();
```

### 3. Drop Session-Related Views (if they exist)
```sql
-- Drop any session-related views
DROP VIEW IF EXISTS active_sessions;
DROP VIEW IF EXISTS session_summary;
DROP VIEW IF EXISTS user_session_activity;
```

### 4. Drop Session-Related Row Level Security Policies
```sql
-- Drop RLS policies for sessions
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can create sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.sessions;

-- Drop RLS policies for messages
DROP POLICY IF EXISTS "Users can view messages in their sessions" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages in their sessions" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
```

### 5. Drop Session-Related Types (if they exist)
```sql
-- Drop custom types
DROP TYPE IF EXISTS session_status CASCADE;
DROP TYPE IF EXISTS message_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
```

### 6. Drop Session-Related Storage Buckets (if they exist)
```sql
-- Drop storage buckets for session data
DELETE FROM storage.buckets WHERE id = 'session-recordings';
DELETE FROM storage.buckets WHERE id = 'session-exports';
```

### 7. Clean Up Realtime Subscriptions (if they exist)
```sql
-- Remove realtime publications for session tables
DROP PUBLICATION IF EXISTS supabase_realtime_sessions;
DROP PUBLICATION IF EXISTS supabase_realtime_messages;
```

### 8. Verification Queries
Run these to verify cleanup:

```sql
-- Check for any remaining session-related tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%session%';

-- Check for any remaining session-related functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%session%';

-- Check for any remaining session-related types
SELECT typname 
FROM pg_type 
WHERE typname LIKE '%session%';

-- Should return empty results if cleanup was successful
```

## ⚠️ Important Notes:

1. **Backup First**: Always backup your database before running cleanup commands
2. **Run in Order**: Execute commands in the order listed above
3. **Check Dependencies**: Some commands may fail if there are dependencies - that's normal
4. **Verify Results**: Run the verification queries to ensure cleanup was successful
5. **Production Safety**: These commands are destructive - double-check you're in the right database

## 🔄 Alternative: Selective Cleanup

If you only want to clean data but keep schema:

```sql
-- Just delete data, keep tables
DELETE FROM public.messages WHERE session_id IS NOT NULL;
DELETE FROM public.sessions;
DELETE FROM public.user_sessions;

-- Reset sequences
ALTER SEQUENCE IF EXISTS messages_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS sessions_id_seq RESTART WITH 1;
```

## ✅ Clean Slate Verification

After running cleanup, your database should be ready for single-device mode:
- No session-related tables
- No session-related functions or triggers  
- No session-related storage buckets
- Clean for single-device translator focus

Run these commands in your Supabase SQL Editor dashboard for a complete clean slate\!

