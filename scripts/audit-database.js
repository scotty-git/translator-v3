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
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 Starting Supabase Database Audit...\n');

async function auditDatabase() {
  try {
    // 1. List all tables
    console.log('📋 1. LISTING ALL TABLES');
    console.log('=' .repeat(50));
    const { data: tables } = await supabase.rpc('get_tables_list', {});
    if (tables) {
      console.log('Tables found:', tables.map(t => t.table_name).join(', '));
    }

    // 2. Get messages table schema
    console.log('\n📊 2. MESSAGES TABLE SCHEMA');
    console.log('=' .repeat(50));
    const { data: messageColumns } = await supabase
      .rpc('get_table_columns', { table_name: 'messages' });
    
    if (messageColumns) {
      console.log('Columns:');
      messageColumns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    }

    // 3. Check if message_reactions table exists
    console.log('\n🔍 3. CHECKING FOR MESSAGE_REACTIONS TABLE');
    console.log('=' .repeat(50));
    const { data: reactionsTable } = await supabase
      .from('message_reactions')
      .select('*')
      .limit(1);
    
    if (reactionsTable) {
      console.log('✅ message_reactions table exists');
      
      // Get its schema
      const { data: reactionColumns } = await supabase
        .rpc('get_table_columns', { table_name: 'message_reactions' });
      
      if (reactionColumns) {
        console.log('Columns:');
        reactionColumns.forEach(col => {
          console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });
      }
    } else {
      console.log('❌ message_reactions table does not exist');
    }

    // 4. Check RLS policies on messages table
    console.log('\n🔐 4. RLS POLICIES ON MESSAGES TABLE');
    console.log('=' .repeat(50));
    const { data: policies } = await supabase
      .rpc('get_table_policies', { table_name: 'messages' });
    
    if (policies && policies.length > 0) {
      policies.forEach(policy => {
        console.log(`Policy: ${policy.policyname}`);
        console.log(`  Command: ${policy.cmd}`);
        console.log(`  Definition: ${policy.qual || 'N/A'}`);
      });
    } else {
      console.log('No RLS policies found');
    }

    // 5. Check if real-time is enabled for messages
    console.log('\n📡 5. REAL-TIME STATUS FOR MESSAGES TABLE');
    console.log('=' .repeat(50));
    const { data: realtimeStatus } = await supabase
      .rpc('check_realtime_enabled', { table_name: 'messages' });
    
    console.log(realtimeStatus ? '✅ Real-time is enabled' : '❌ Real-time is not enabled');

    // 6. Check indexes on messages table
    console.log('\n🗂️ 6. INDEXES ON MESSAGES TABLE');
    console.log('=' .repeat(50));
    const { data: indexes } = await supabase
      .rpc('get_table_indexes', { table_name: 'messages' });
    
    if (indexes && indexes.length > 0) {
      indexes.forEach(idx => {
        console.log(`Index: ${idx.indexname}`);
        console.log(`  Columns: ${idx.indexdef}`);
      });
    } else {
      console.log('No indexes found (besides primary key)');
    }

    // 7. Check foreign key relationships
    console.log('\n🔗 7. FOREIGN KEY RELATIONSHIPS');
    console.log('=' .repeat(50));
    const { data: foreignKeys } = await supabase
      .rpc('get_foreign_keys', { table_name: 'messages' });
    
    if (foreignKeys && foreignKeys.length > 0) {
      foreignKeys.forEach(fk => {
        console.log(`Constraint: ${fk.constraint_name}`);
        console.log(`  From: messages.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    } else {
      console.log('No foreign key relationships found');
    }

    // 8. Check session_participants table
    console.log('\n👥 8. SESSION_PARTICIPANTS TABLE');
    console.log('=' .repeat(50));
    const { data: participantColumns } = await supabase
      .rpc('get_table_columns', { table_name: 'session_participants' });
    
    if (participantColumns) {
      console.log('✅ session_participants table exists');
      console.log('Columns:');
      participantColumns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    } else {
      console.log('❌ session_participants table not found');
    }

    // 9. Sample data check
    console.log('\n📊 9. SAMPLE DATA CHECK');
    console.log('=' .repeat(50));
    const { data: messageCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Total messages in database: ${messageCount?.count || 0}`);

    console.log('\n✅ Audit completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during audit:', error);
  }
}

// Create RPC functions if they don't exist
async function createHelperFunctions() {
  const functions = [
    {
      name: 'get_tables_list',
      sql: `
        CREATE OR REPLACE FUNCTION get_tables_list()
        RETURNS TABLE(table_name text) AS $$
        BEGIN
          RETURN QUERY
          SELECT tablename::text
          FROM pg_tables
          WHERE schemaname = 'public';
        END;
        $$ LANGUAGE plpgsql;
      `
    },
    {
      name: 'get_table_columns',
      sql: `
        CREATE OR REPLACE FUNCTION get_table_columns(table_name text)
        RETURNS TABLE(column_name text, data_type text, is_nullable text) AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            column_name::text,
            data_type::text,
            is_nullable::text
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position;
        END;
        $$ LANGUAGE plpgsql;
      `
    },
    {
      name: 'get_table_policies',
      sql: `
        CREATE OR REPLACE FUNCTION get_table_policies(table_name text)
        RETURNS TABLE(policyname text, cmd text, qual text) AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            pol.policyname::text,
            pol.cmd::text,
            pol.qual::text
          FROM pg_policies pol
          WHERE pol.tablename = $1;
        END;
        $$ LANGUAGE plpgsql;
      `
    },
    {
      name: 'check_realtime_enabled',
      sql: `
        CREATE OR REPLACE FUNCTION check_realtime_enabled(table_name text)
        RETURNS boolean AS $$
        BEGIN
          RETURN EXISTS (
            SELECT 1
            FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
            AND tablename = $1
          );
        END;
        $$ LANGUAGE plpgsql;
      `
    },
    {
      name: 'get_table_indexes',
      sql: `
        CREATE OR REPLACE FUNCTION get_table_indexes(table_name text)
        RETURNS TABLE(indexname text, indexdef text) AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            i.indexname::text,
            i.indexdef::text
          FROM pg_indexes i
          WHERE i.tablename = $1
          AND i.schemaname = 'public';
        END;
        $$ LANGUAGE plpgsql;
      `
    },
    {
      name: 'get_foreign_keys',
      sql: `
        CREATE OR REPLACE FUNCTION get_foreign_keys(table_name text)
        RETURNS TABLE(
          constraint_name text,
          column_name text,
          foreign_table_name text,
          foreign_column_name text
        ) AS $$
        BEGIN
          RETURN QUERY
          SELECT
            tc.constraint_name::text,
            kcu.column_name::text,
            ccu.table_name::text AS foreign_table_name,
            ccu.column_name::text AS foreign_column_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = $1;
        END;
        $$ LANGUAGE plpgsql;
      `
    }
  ];

  console.log('🔧 Setting up helper functions...');
  for (const func of functions) {
    try {
      await supabase.rpc('exec_sql', { sql: func.sql });
    } catch (error) {
      // Functions might already exist, that's okay
    }
  }
}

// Run the audit
createHelperFunctions().then(() => auditDatabase());