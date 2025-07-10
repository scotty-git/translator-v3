import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://awewzuxizupxyntbevmg.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3ZXd6dXhpenVweHludGJldm1nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTgxMDYwOCwiZXhwIjoyMDY3Mzg2NjA4fQ.vblIKVKmN_Pss7E_bT8zbh7r-Ktz1KBkB_NWgyaB4CQ'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkRealtimeConfiguration() {
  console.log('🔍 Checking realtime configuration...')
  
  try {
    // Check if session_participants table is published for realtime
    console.log('\\n📡 1. Checking realtime publication for session_participants...')
    const { data: publications, error: pubError } = await supabase
      .from('pg_publication_tables')
      .select('*')
      .eq('pubname', 'supabase_realtime')
      .eq('tablename', 'session_participants')
      
    if (pubError) {
      console.error('❌ Publications query error:', pubError)
    } else {
      console.log('✅ Publications for session_participants:', publications)
      if (publications.length === 0) {
        console.log('⚠️ session_participants table is NOT published for realtime')
      } else {
        console.log('✅ session_participants table IS published for realtime')
      }
    }
    
    // Check if messages table is published for realtime
    console.log('\\n📡 2. Checking realtime publication for messages...')
    const { data: messagesPub, error: messagesPubError } = await supabase
      .from('pg_publication_tables')
      .select('*')
      .eq('pubname', 'supabase_realtime')
      .eq('tablename', 'messages')
      
    if (messagesPubError) {
      console.error('❌ Messages publication query error:', messagesPubError)
    } else {
      console.log('✅ Publications for messages:', messagesPub)
      if (messagesPub.length === 0) {
        console.log('⚠️ messages table is NOT published for realtime')
      } else {
        console.log('✅ messages table IS published for realtime')
      }
    }
    
    // Check RLS policies
    console.log('\\n🔒 3. Checking RLS policies for session_participants...')
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'session_participants')
      
    if (policiesError) {
      console.error('❌ Policies query error:', policiesError)
    } else {
      console.log('✅ RLS policies for session_participants:', policies?.length || 0)
      policies?.forEach(policy => {
        console.log(`   - ${policy.policyname}: ${policy.cmd} (${policy.permissive ? 'permissive' : 'restrictive'})`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error checking realtime configuration:', error)
  }
}

checkRealtimeConfiguration()