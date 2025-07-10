import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://awewzuxizupxyntbevmg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3ZXd6dXhpenVweHludGJldm1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MTA2MDgsImV4cCI6MjA2NzM4NjYwOH0.9tbBoE87BmhmIzSbsczcrQ5BzFltDruiKeAh8huovbA'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debugDatabase() {
  console.log('🔍 Checking Supabase database for session 5748...')
  
  try {
    // 1. Check sessions table for the most recent session
    console.log('\n📋 1. Checking sessions table for most recent session...')
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      
    if (sessionsError) {
      console.error('❌ Sessions query error:', sessionsError)
    } else {
      console.log('✅ Sessions found:', sessions?.length || 0)
      sessions?.forEach(session => {
        console.log(`   - Session ID: ${session.id}`)
        console.log(`   - Code: ${session.code}`)
        console.log(`   - Active: ${session.is_active}`)
        console.log(`   - Created: ${session.created_at}`)
        console.log(`   - Expires: ${session.expires_at}`)
      })
    }
    
    // 2. Check session_participants table for the session ID
    console.log('\n👥 2. Checking session_participants table...')
    const sessionId = sessions?.[0]?.id || 'c2e9aa31-ff59-4804-9dd6-b1d58f75fd45'
    
    const { data: participants, error: participantsError } = await supabase
      .from('session_participants')
      .select('*')
      .eq('session_id', sessionId)
      
    if (participantsError) {
      console.error('❌ Participants query error:', participantsError)
    } else {
      console.log('✅ Participants found:', participants?.length || 0)
      participants?.forEach(participant => {
        console.log(`   - User ID: ${participant.user_id}`)
        console.log(`   - Online: ${participant.is_online}`)
        console.log(`   - Joined: ${participant.joined_at}`)
        console.log(`   - Last seen: ${participant.last_seen}`)
      })
    }
    
    // 3. Check all participants for any session (debug)
    console.log('\n🔍 3. Checking all recent participants...')
    const { data: allParticipants, error: allParticipantsError } = await supabase
      .from('session_participants')
      .select('*')
      .order('joined_at', { ascending: false })
      .limit(10)
      
    if (allParticipantsError) {
      console.error('❌ All participants query error:', allParticipantsError)
    } else {
      console.log('✅ Recent participants found:', allParticipants?.length || 0)
      allParticipants?.forEach((participant, index) => {
        console.log(`   ${index + 1}. Session: ${participant.session_id}`)
        console.log(`      User: ${participant.user_id}`)
        console.log(`      Online: ${participant.is_online}`)
        console.log(`      Joined: ${participant.joined_at}`)
      })
    }
    
    // 4. Check messages table for the session
    console.log('\n💬 4. Checking messages table...')
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: false })
      .limit(5)
      
    if (messagesError) {
      console.error('❌ Messages query error:', messagesError)
    } else {
      console.log('✅ Messages found:', messages?.length || 0)
      messages?.forEach((message, index) => {
        console.log(`   ${index + 1}. From: ${message.sender_id}`)
        console.log(`      Type: ${message.type}`)
        console.log(`      Content: ${message.content?.substring(0, 50)}...`)
        console.log(`      Created: ${message.timestamp}`)
      })
    }
    
    // 5. Check if session_participants table has realtime enabled
    console.log('\n📡 5. Checking realtime configuration for session_participants...')
    try {
      const { data: publications, error: pubError } = await supabase
        .from('pg_publication_tables')
        .select('*')
        .eq('tablename', 'session_participants')
        
      if (pubError) {
        console.error('❌ Publications query error:', pubError)
      } else {
        console.log('✅ Publications for session_participants:', publications)
      }
    } catch (error) {
      console.log('⚠️ Could not check publications (expected if not admin):', error.message)
    }
    
  } catch (error) {
    console.error('❌ Database debug error:', error)
  }
}

debugDatabase()