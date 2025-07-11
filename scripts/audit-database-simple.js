#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔍 Starting Supabase Database Audit (Simple Version)...\n');
console.log(`Project: ${supabaseUrl.match(/https:\/\/(.+?)\.supabase\.co/)?.[1] || 'unknown'}\n`);

async function auditDatabase() {
  try {
    // 1. Check messages table
    console.log('📋 1. MESSAGES TABLE CHECK');
    console.log('=' .repeat(50));
    
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .limit(1);
    
    if (messagesError) {
      console.log('❌ Error accessing messages table:', messagesError.message);
    } else {
      console.log('✅ Messages table exists and is accessible');
      console.log('Sample structure:', messages.length > 0 ? Object.keys(messages[0]) : 'No data');
    }

    // 2. Check message_reactions table
    console.log('\n🔍 2. MESSAGE_REACTIONS TABLE CHECK');
    console.log('=' .repeat(50));
    
    const { data: reactions, error: reactionsError } = await supabase
      .from('message_reactions')
      .select('*')
      .limit(1);
    
    if (reactionsError) {
      if (reactionsError.code === '42P01') {
        console.log('❌ message_reactions table does not exist');
      } else {
        console.log('❌ Error accessing message_reactions table:', reactionsError.message);
      }
    } else {
      console.log('✅ message_reactions table exists');
      console.log('Sample structure:', reactions.length > 0 ? Object.keys(reactions[0]) : 'No data');
    }

    // 3. Check session_participants table
    console.log('\n👥 3. SESSION_PARTICIPANTS TABLE CHECK');
    console.log('=' .repeat(50));
    
    const { data: participants, error: participantsError } = await supabase
      .from('session_participants')
      .select('*')
      .limit(1);
    
    if (participantsError) {
      console.log('❌ Error accessing session_participants table:', participantsError.message);
    } else {
      console.log('✅ session_participants table exists and is accessible');
      console.log('Sample structure:', participants.length > 0 ? Object.keys(participants[0]) : 'No data');
    }

    // 4. Check sessions table
    console.log('\n🏠 4. SESSIONS TABLE CHECK');
    console.log('=' .repeat(50));
    
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .limit(1);
    
    if (sessionsError) {
      console.log('❌ Error accessing sessions table:', sessionsError.message);
    } else {
      console.log('✅ sessions table exists and is accessible');
      console.log('Sample structure:', sessions.length > 0 ? Object.keys(sessions[0]) : 'No data');
    }

    // 5. Count messages
    console.log('\n📊 5. DATA STATISTICS');
    console.log('=' .repeat(50));
    
    const { count: messageCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Total messages: ${messageCount || 0}`);

    const { count: sessionCount } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Total sessions: ${sessionCount || 0}`);

    // 6. Check for real-time subscriptions (by trying to subscribe)
    console.log('\n📡 6. REAL-TIME SUBSCRIPTION TEST');
    console.log('=' .repeat(50));
    
    const channel = supabase
      .channel('test-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'messages' }, 
        (payload) => {
          // Just testing if we can subscribe
        }
      );
    
    const subscription = await channel.subscribe();
    
    if (subscription === 'SUBSCRIBED') {
      console.log('✅ Real-time subscriptions are working for messages table');
    } else {
      console.log('⚠️  Real-time subscription status:', subscription);
    }
    
    // Clean up
    await supabase.removeChannel(channel);

    // 7. Test a sample message structure
    console.log('\n🧪 7. MESSAGES TABLE STRUCTURE (from TypeScript)');
    console.log('=' .repeat(50));
    console.log('Expected columns based on database.ts:');
    console.log('  - id: string (UUID)');
    console.log('  - session_id: string');
    console.log('  - sender_id: string');
    console.log('  - original_text: string');
    console.log('  - translated_text: string | null');
    console.log('  - original_language: string');
    console.log('  - timestamp: string');
    console.log('  - is_delivered: boolean');
    console.log('  - sequence_number: number');

    console.log('\n✅ Audit completed successfully!');
    
  } catch (error) {
    console.error('❌ Unexpected error during audit:', error);
  }
}

// Run the audit
auditDatabase();