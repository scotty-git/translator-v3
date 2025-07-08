# Phase 1: Supabase Integration & Database Schema

## Overview
Set up Supabase backend with complete database schema, Row Level Security policies, and real-time subscriptions for the translator app.

## Prerequisites
- Phase 0 completed successfully
- Supabase account created
- New Supabase project initialized
- Project URL and anon key obtained

## Goals
- Implement complete database schema from PRD
- Configure Row Level Security (RLS)
- Set up real-time subscriptions
- Create TypeScript types for database
- Build Supabase service layer
- Test all database operations

## Implementation Steps

### 1. Update Environment Variables (.env)
```bash
# Add your Supabase credentials
VITE_SUPABASE_URL=https://awewzuxizupxyntbevmg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3ZXd6dXhpenVweHludGJldm1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MTA2MDgsImV4cCI6MjA2NzM4NjYwOH0.9tbBoE87BmhmIzSbsczcrQ5BzFltDruiKeAh8huovbA

# OpenAI key (from PRD)
VITE_OPENAI_API_KEY=your-openai-api-key-here
```

### 2. Install Supabase CLI (Optional but recommended)
```bash
npm install -D supabase
npx supabase init
```

### 3. Database Schema (Run in Supabase SQL Editor)
```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron" SCHEMA extensions;

-- Drop existing tables if any (for clean setup)
DROP TABLE IF EXISTS user_activity CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;

-- Sessions table
CREATE TABLE sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code CHAR(4) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '4 hours',
  is_active BOOLEAN DEFAULT true,
  user_count INTEGER DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table with queue support
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  original TEXT NOT NULL,
  translation TEXT,
  original_lang VARCHAR(10) NOT NULL,
  target_lang VARCHAR(10) NOT NULL,
  status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'displayed', 'failed')),
  queued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  displayed_at TIMESTAMP WITH TIME ZONE,
  performance_metrics JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity status table for real-time indicators
CREATE TABLE user_activity (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  activity_type VARCHAR(20) NOT NULL CHECK (activity_type IN ('typing', 'recording', 'processing', 'idle')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_sessions_code ON sessions(code) WHERE is_active = true;
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at) WHERE is_active = true;
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_status ON messages(session_id, status);
CREATE INDEX idx_messages_queue ON messages(session_id, queued_at) WHERE status = 'queued';
CREATE INDEX idx_user_activity_session ON user_activity(session_id);
CREATE INDEX idx_user_activity_updated ON user_activity(updated_at);

-- Enable Row Level Security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies (anonymous access for demo)
-- In production, implement proper auth
CREATE POLICY "Anyone can read sessions" ON sessions 
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create sessions" ON sessions 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update sessions" ON sessions 
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can read messages" ON messages 
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create messages" ON messages 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update messages" ON messages 
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can manage activity" ON user_activity 
  FOR ALL USING (true);

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE user_activity;
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;

-- Activity cleanup trigger
CREATE OR REPLACE FUNCTION cleanup_stale_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete stale activity older than 5 seconds
  DELETE FROM user_activity 
  WHERE updated_at < NOW() - INTERVAL '5 seconds'
  AND activity_type != 'idle';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_activity_cleanup
AFTER INSERT OR UPDATE ON user_activity
FOR EACH STATEMENT
EXECUTE FUNCTION cleanup_stale_activity();

-- Session cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  UPDATE sessions 
  SET is_active = false 
  WHERE expires_at < NOW() 
  AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup every hour using pg_cron
SELECT cron.schedule(
  'cleanup-expired-sessions',
  '0 * * * *',
  'SELECT cleanup_expired_sessions();'
);

-- Function to generate unique session code
CREATE OR REPLACE FUNCTION generate_unique_session_code()
RETURNS CHAR(4) AS $$
DECLARE
  new_code CHAR(4);
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random 4-digit code
    new_code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    -- Check if code already exists
    SELECT EXISTS(
      SELECT 1 FROM sessions 
      WHERE code = new_code 
      AND is_active = true
    ) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;
```

### 4. Generate TypeScript Types (src/types/database.ts)
```typescript
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string
          code: string
          created_at: string
          expires_at: string
          is_active: boolean
          user_count: number
          last_activity: string
        }
        Insert: {
          id?: string
          code: string
          created_at?: string
          expires_at?: string
          is_active?: boolean
          user_count?: number
          last_activity?: string
        }
        Update: {
          id?: string
          code?: string
          created_at?: string
          expires_at?: string
          is_active?: boolean
          user_count?: number
          last_activity?: string
        }
      }
      messages: {
        Row: {
          id: string
          session_id: string
          user_id: string
          original: string
          translation: string | null
          original_lang: string
          target_lang: string
          status: 'queued' | 'processing' | 'displayed' | 'failed'
          queued_at: string
          processed_at: string | null
          displayed_at: string | null
          performance_metrics: Json | null
          timestamp: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          original: string
          translation?: string | null
          original_lang: string
          target_lang: string
          status?: 'queued' | 'processing' | 'displayed' | 'failed'
          queued_at?: string
          processed_at?: string | null
          displayed_at?: string | null
          performance_metrics?: Json | null
          timestamp?: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          original?: string
          translation?: string | null
          original_lang?: string
          target_lang?: string
          status?: 'queued' | 'processing' | 'displayed' | 'failed'
          queued_at?: string
          processed_at?: string | null
          displayed_at?: string | null
          performance_metrics?: Json | null
          timestamp?: string
          created_at?: string
        }
      }
      user_activity: {
        Row: {
          id: string
          session_id: string
          user_id: string
          activity_type: 'typing' | 'recording' | 'processing' | 'idle'
          started_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          activity_type: 'typing' | 'recording' | 'processing' | 'idle'
          started_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          activity_type?: 'typing' | 'recording' | 'processing' | 'idle'
          started_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// Helper types
export type Session = Database['public']['Tables']['sessions']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type UserActivity = Database['public']['Tables']['user_activity']['Row']

export type MessageStatus = Message['status']
export type ActivityType = UserActivity['activity_type']

// Performance metrics type
export interface PerformanceMetrics {
  audioRecordingStart: number
  audioRecordingEnd: number
  whisperRequestStart: number
  whisperResponseEnd: number
  translationRequestStart: number
  translationResponseEnd: number
  messageDeliveryTime: number
  totalEndToEndTime: number
}
```

### 5. Supabase Client Configuration (src/lib/supabase.ts)
```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL
let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  // Use dummy values to prevent crash during development
  supabaseUrl = 'https://dummy.supabase.co'
  supabaseAnonKey = 'dummy-key'
  console.warn('Using dummy Supabase credentials - API calls will fail')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // No auth for this app
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Connection health check
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('sessions').select('count').limit(1)
    if (error) throw error
    return true
  } catch (error) {
    console.error('Supabase connection error:', error)
    return false
  }
}
```

### 6. Session Service (src/services/supabase/sessions.ts)
```typescript
import { supabase } from '@/lib/supabase'
import type { Session } from '@/types/database'

export class SessionService {
  /**
   * Generate a unique 4-digit session code
   */
  static async generateSessionCode(): Promise<string> {
    // Use database function to ensure uniqueness
    const { data, error } = await supabase
      .rpc('generate_unique_session_code')
      
    if (error) {
      // Fallback to client-side generation
      let code: string
      let attempts = 0
      
      do {
        code = Math.floor(1000 + Math.random() * 9000).toString()
        const exists = await this.sessionExists(code)
        if (!exists) return code
        attempts++
      } while (attempts < 10)
      
      throw new Error('Failed to generate unique session code')
    }
    
    return data
  }

  /**
   * Check if a session with given code exists and is active
   */
  static async sessionExists(code: string): Promise<boolean> {
    const { data } = await supabase
      .from('sessions')
      .select('id')
      .eq('code', code)
      .eq('is_active', true)
      .single()
      
    return !!data
  }

  /**
   * Create a new session
   */
  static async createSession(): Promise<Session> {
    const code = await this.generateSessionCode()
    
    const { data, error } = await supabase
      .from('sessions')
      .insert({ code })
      .select()
      .single()
      
    if (error) throw error
    return data
  }

  /**
   * Join an existing session
   */
  static async joinSession(code: string): Promise<Session> {
    // First, check if session exists and is active
    const { data: session, error: fetchError } = await supabase
      .from('sessions')
      .select()
      .eq('code', code)
      .eq('is_active', true)
      .single()
      
    if (fetchError || !session) {
      throw new Error('Session not found or expired')
    }
    
    // Update user count and last activity
    const { data, error } = await supabase
      .from('sessions')
      .update({ 
        user_count: session.user_count + 1,
        last_activity: new Date().toISOString()
      })
      .eq('id', session.id)
      .select()
      .single()
      
    if (error) throw error
    return data
  }

  /**
   * Leave a session
   */
  static async leaveSession(sessionId: string): Promise<void> {
    const { data: session } = await supabase
      .from('sessions')
      .select('user_count')
      .eq('id', sessionId)
      .single()
      
    if (session && session.user_count > 0) {
      await supabase
        .from('sessions')
        .update({ 
          user_count: Math.max(0, session.user_count - 1),
          last_activity: new Date().toISOString()
        })
        .eq('id', sessionId)
    }
  }

  /**
   * Subscribe to session updates
   */
  static subscribeToSession(
    sessionId: string,
    onUpdate: (session: Session) => void
  ) {
    return supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.new) {
            onUpdate(payload.new as Session)
          }
        }
      )
      .subscribe()
  }
}
```

### 7. Message Service (src/services/supabase/messages.ts)
```typescript
import { supabase } from '@/lib/supabase'
import type { Message, PerformanceMetrics } from '@/types/database'
import type { RealtimeChannel } from '@supabase/supabase-js'

export class MessageService {
  /**
   * Create a new message in queued state
   */
  static async createMessage(
    sessionId: string,
    userId: string,
    originalText: string,
    originalLang: string,
    targetLang: string
  ): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        session_id: sessionId,
        user_id: userId,
        original: originalText,
        original_lang: originalLang,
        target_lang: targetLang,
        status: 'queued',
      })
      .select()
      .single()
      
    if (error) throw error
    return data
  }

  /**
   * Update message with translation
   */
  static async updateMessageTranslation(
    messageId: string,
    translation: string,
    performanceMetrics?: PerformanceMetrics
  ): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .update({
        translation,
        status: 'processing',
        processed_at: new Date().toISOString(),
        performance_metrics: performanceMetrics,
      })
      .eq('id', messageId)
      .select()
      .single()
      
    if (error) throw error
    return data
  }

  /**
   * Mark message as displayed
   */
  static async markMessageDisplayed(messageId: string): Promise<void> {
    await supabase
      .from('messages')
      .update({
        status: 'displayed',
        displayed_at: new Date().toISOString(),
      })
      .eq('id', messageId)
  }

  /**
   * Get messages for a session
   */
  static async getSessionMessages(
    sessionId: string,
    limit = 50
  ): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select()
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(limit)
      
    if (error) throw error
    return data
  }

  /**
   * Subscribe to new messages in a session
   */
  static subscribeToMessages(
    sessionId: string,
    onMessage: (message: Message) => void
  ): RealtimeChannel {
    return supabase
      .channel(`messages-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          onMessage(payload.new as Message)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          onMessage(payload.new as Message)
        }
      )
      .subscribe()
  }
}
```

### 8. Activity Service (src/services/supabase/activity.ts)
```typescript
import { supabase } from '@/lib/supabase'
import type { UserActivity, ActivityType } from '@/types/database'
import type { RealtimeChannel } from '@supabase/supabase-js'

export class ActivityService {
  private static activityTimers = new Map<string, NodeJS.Timeout>()

  /**
   * Update user activity status
   */
  static async updateActivity(
    sessionId: string,
    userId: string,
    activityType: ActivityType
  ): Promise<void> {
    const key = `${sessionId}-${userId}`
    
    // Clear existing timer
    const existingTimer = this.activityTimers.get(key)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Update or insert activity
    const { error } = await supabase
      .from('user_activity')
      .upsert({
        session_id: sessionId,
        user_id: userId,
        activity_type: activityType,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'session_id,user_id'
      })
      
    if (error) {
      console.error('Failed to update activity:', error)
      return
    }

    // Set timer to mark as idle after 3 seconds
    if (activityType !== 'idle') {
      const timer = setTimeout(() => {
        this.updateActivity(sessionId, userId, 'idle')
        this.activityTimers.delete(key)
      }, 3000)
      
      this.activityTimers.set(key, timer)
    }
  }

  /**
   * Get current activities for a session
   */
  static async getSessionActivities(
    sessionId: string
  ): Promise<UserActivity[]> {
    const { data, error } = await supabase
      .from('user_activity')
      .select()
      .eq('session_id', sessionId)
      .neq('activity_type', 'idle')
      
    if (error) throw error
    return data || []
  }

  /**
   * Subscribe to activity updates
   */
  static subscribeToActivities(
    sessionId: string,
    onActivity: (activity: UserActivity) => void
  ): RealtimeChannel {
    return supabase
      .channel(`activity-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_activity',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.new) {
            onActivity(payload.new as UserActivity)
          }
        }
      )
      .subscribe()
  }

  /**
   * Clean up timers on unmount
   */
  static cleanup(): void {
    this.activityTimers.forEach(timer => clearTimeout(timer))
    this.activityTimers.clear()
  }
}
```

### 9. Supabase Service Index (src/services/supabase/index.ts)
```typescript
export { SessionService } from './sessions'
export { MessageService } from './messages'
export { ActivityService } from './activity'
export { supabase, checkSupabaseConnection } from '@/lib/supabase'
```

## Tests

### Test 1: Connection Test (tests/supabase-connection.test.ts)
```typescript
import { checkSupabaseConnection } from '@/lib/supabase'

describe('Supabase Connection', () => {
  test('should connect to Supabase', async () => {
    const isConnected = await checkSupabaseConnection()
    expect(isConnected).toBe(true)
  })
})
```

### Test 2: Session Operations (tests/session-operations.test.ts)
```typescript
import { SessionService } from '@/services/supabase/sessions'

describe('Session Operations', () => {
  test('should create a new session with unique code', async () => {
    const session = await SessionService.createSession()
    expect(session.code).toMatch(/^\d{4}$/)
    expect(session.is_active).toBe(true)
  })

  test('should join an existing session', async () => {
    const created = await SessionService.createSession()
    const joined = await SessionService.joinSession(created.code)
    expect(joined.id).toBe(created.id)
    expect(joined.user_count).toBe(1)
  })

  test('should handle non-existent session', async () => {
    await expect(SessionService.joinSession('9999')).rejects.toThrow()
  })
})
```

### Test 3: Real-time Subscriptions (tests/realtime.test.ts)
```typescript
import { MessageService } from '@/services/supabase/messages'
import { SessionService } from '@/services/supabase/sessions'

describe('Real-time Features', () => {
  test('should receive real-time message updates', (done) => {
    let session: Session
    let subscription: RealtimeChannel

    const setup = async () => {
      session = await SessionService.createSession()
      
      subscription = MessageService.subscribeToMessages(
        session.id,
        (message) => {
          expect(message.original).toBe('Test message')
          subscription.unsubscribe()
          done()
        }
      )

      // Wait for subscription to be ready
      setTimeout(async () => {
        await MessageService.createMessage(
          session.id,
          'test-user',
          'Test message',
          'en',
          'es'
        )
      }, 1000)
    }

    setup()
  }, 10000) // 10 second timeout
})
```

### Test 4: Activity Tracking (tests/activity.test.ts)
```typescript
import { ActivityService } from '@/services/supabase/activity'

describe('Activity Tracking', () => {
  test('should update user activity', async () => {
    const sessionId = 'test-session'
    const userId = 'test-user'
    
    await ActivityService.updateActivity(sessionId, userId, 'typing')
    const activities = await ActivityService.getSessionActivities(sessionId)
    
    expect(activities.some(a => 
      a.user_id === userId && a.activity_type === 'typing'
    )).toBe(true)
  })

  test('should auto-idle after timeout', async () => {
    const sessionId = 'test-session-2'
    const userId = 'test-user-2'
    
    await ActivityService.updateActivity(sessionId, userId, 'recording')
    
    // Wait for auto-idle (3 seconds + buffer)
    await new Promise(resolve => setTimeout(resolve, 4000))
    
    const activities = await ActivityService.getSessionActivities(sessionId)
    expect(activities.length).toBe(0) // Should be empty as idle is filtered
  }, 10000)
})
```

### Manual Test Script (scripts/test-supabase.js)
```javascript
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function testSupabase() {
  console.log('🧪 Testing Supabase connection...\n')

  // Test 1: Connection
  try {
    const { error } = await supabase.from('sessions').select('count')
    if (error) throw error
    console.log('✅ Connected to Supabase')
  } catch (error) {
    console.error('❌ Connection failed:', error.message)
    return
  }

  // Test 2: Create session
  try {
    const code = Math.floor(1000 + Math.random() * 9000).toString()
    const { data: session, error } = await supabase
      .from('sessions')
      .insert({ code })
      .select()
      .single()
      
    if (error) throw error
    console.log(`✅ Created session with code: ${session.code}`)
    
    // Test 3: Real-time
    const channel = supabase
      .channel('test-channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `session_id=eq.${session.id}`
      }, (payload) => {
        console.log('✅ Received real-time update:', payload.eventType)
        channel.unsubscribe()
      })
      .subscribe()
      
    // Create a test message
    setTimeout(async () => {
      await supabase.from('messages').insert({
        session_id: session.id,
        user_id: 'test-user',
        original: 'Hello world',
        original_lang: 'en',
        target_lang: 'es'
      })
    }, 1000)
    
    // Cleanup after 5 seconds
    setTimeout(() => {
      console.log('\n🧹 Cleaning up test data...')
      process.exit(0)
    }, 5000)
    
  } catch (error) {
    console.error('❌ Session test failed:', error.message)
  }
}

testSupabase()
```

## Refactoring Checklist
- [ ] Extract database queries into repository pattern
- [ ] Add connection retry logic with exponential backoff
- [ ] Implement database transaction support
- [ ] Create database migration system
- [ ] Add database seed script for development
- [ ] Implement connection pooling optimization
- [ ] Add query performance monitoring
- [ ] Create database backup strategy

## Success Criteria
- [ ] All tables created with proper constraints
- [ ] RLS policies functioning correctly
- [ ] Real-time subscriptions working for all tables
- [ ] Session creation with unique codes
- [ ] Message queue states properly managed
- [ ] Activity tracking with auto-cleanup
- [ ] Performance indexes optimized
- [ ] Scheduled cleanup jobs running
- [ ] TypeScript types match database schema
- [ ] All services have error handling

## Common Issues & Solutions

### Issue: "relation does not exist" error
**Solution**: Ensure you're running SQL in correct order and pg_cron extension is installed

### Issue: Real-time not working
**Solution**: Check that tables are added to supabase_realtime publication

### Issue: RLS blocking operations
**Solution**: Verify policies allow anonymous access (for this demo app)

### Issue: Session codes not unique
**Solution**: Use the database function or implement retry logic

## Performance Considerations
- Indexes on frequently queried columns
- Partial indexes for active sessions
- Automatic cleanup of stale data
- Connection pooling for high traffic
- Batch operations where possible

## Security Notes
- This implementation uses anonymous access for simplicity
- In production, implement proper authentication
- Consider rate limiting for session creation
- Add input validation for all user data
- Implement CORS policies for API access

## Environment Variable Best Practices
- ALWAYS use .env.local for local development (not .env)
- NEVER commit .env files to git
- ALWAYS handle missing env vars gracefully
- Use dummy values in development to prevent crashes
- Document all required env vars in .env.example

## Next Steps
- Phase 2: Build core UI components and navigation
- Implement session creation/join UI
- Create message display components
- Add real-time status indicators