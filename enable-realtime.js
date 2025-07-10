import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://awewzuxizupxyntbevmg.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3ZXd6dXhpenVweHludGJldm1nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTgxMDYwOCwiZXhwIjoyMDY3Mzg2NjA4fQ.vblIKVKmN_Pss7E_bT8zbh7r-Ktz1KBkB_NWgyaB4CQ'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function enableRealtimeForParticipants() {
  console.log('🔧 Enabling realtime for session_participants table...')
  
  try {
    // Enable realtime publication for session_participants
    console.log('\\n📡 Adding session_participants to realtime publication...')
    const { error } = await supabase.rpc('sql', {
      query: 'ALTER PUBLICATION supabase_realtime ADD TABLE public.session_participants;'
    })
    
    if (error) {
      console.error('❌ Error enabling realtime:', error)
      
      // Try alternative approach using raw SQL
      console.log('\\n🔄 Trying alternative approach...')
      const { error: sqlError } = await supabase
        .from('pg_publication_tables')
        .insert({
          pubname: 'supabase_realtime',
          schemaname: 'public',
          tablename: 'session_participants'
        })
        
      if (sqlError) {
        console.error('❌ Alternative approach failed:', sqlError)
      } else {
        console.log('✅ Alternative approach succeeded')
      }
    } else {
      console.log('✅ Realtime enabled for session_participants')
    }
    
    // Test the realtime subscription
    console.log('\\n🧪 Testing realtime subscription...')
    const testChannel = supabase
      .channel('test-participants')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'session_participants'
      }, (payload) => {
        console.log('📨 Test INSERT event received:', payload)
      })
      .subscribe((status) => {
        console.log('📡 Test subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime subscription is working!')
          setTimeout(() => {
            testChannel.unsubscribe()
            console.log('🔌 Test subscription closed')
          }, 2000)
        }
      })
    
    // Wait for test to complete
    await new Promise(resolve => setTimeout(resolve, 3000))
    
  } catch (error) {
    console.error('❌ Error enabling realtime:', error)
  }
}

enableRealtimeForParticipants()