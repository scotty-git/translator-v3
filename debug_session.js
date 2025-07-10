import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://awewzuxizupxyntbevmg.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3ZXd6dXhpenVweHludGJldm1nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTgxMDYwOCwiZXhwIjoyMDY3Mzg2NjA4fQ.vblIKVKmN_Pss7E_bT8zbh7r-Ktz1KBkB_NWgyaB4CQ'

// Create admin client with service role
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function investigateSession() {
  console.log('🔍 Investigating session participants issue...\n')
  
  const sessionCode = '5748'
  const sessionId = 'c2e9aa31-ff59-4804-9dd6-b1d58f75fd45'
  const hostUserId = '84f016a5-81fb-40a0-a344-975e521f28b5'
  
  try {
    // 1. Check sessions table
    console.log('📋 1. Checking sessions table...')
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .eq('code', sessionCode)
    
    if (sessionsError) {
      console.error('❌ Error querying sessions:', sessionsError)
    } else {
      console.log('✅ Sessions found:', sessions.length)
      sessions.forEach(session => {
        console.log(`   - ID: ${session.id}`)
        console.log(`   - Code: ${session.code}`)
        console.log(`   - Active: ${session.is_active}`)
        console.log(`   - Created: ${session.created_at}`)
        console.log(`   - Host ID: ${session.host_id}`)
        console.log(`   - Language pair: ${session.language_pair}`)
        console.log('')
      })
    }
    
    // 2. Check session_participants table
    console.log('👥 2. Checking session_participants table...')
    const { data: participants, error: participantsError } = await supabase
      .from('session_participants')
      .select('*')
      .eq('session_id', sessionId)
      .order('joined_at', { ascending: true })
    
    if (participantsError) {
      console.error('❌ Error querying participants:', participantsError)
    } else {
      console.log('✅ Participants found:', participants.length)
      participants.forEach((participant, index) => {
        console.log(`   Participant ${index + 1}:`)
        console.log(`   - User ID: ${participant.user_id}`)
        console.log(`   - Is online: ${participant.is_online}`)
        console.log(`   - Joined at: ${participant.joined_at}`)
        console.log(`   - Role: ${participant.role}`)
        console.log(`   - Is host: ${participant.user_id === hostUserId}`)
        console.log('')
      })
    }
    
    // 3. Check recent participants activity (last 10 minutes)
    console.log('📊 3. Checking recent participants activity...')
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    
    const { data: recentParticipants, error: recentError } = await supabase
      .from('session_participants')
      .select('*')
      .gte('joined_at', tenMinutesAgo)
      .order('joined_at', { ascending: false })
    
    if (recentError) {
      console.error('❌ Error querying recent participants:', recentError)
    } else {
      console.log('✅ Recent participants (last 10 min):', recentParticipants.length)
      recentParticipants.forEach((participant, index) => {
        console.log(`   Recent ${index + 1}:`)
        console.log(`   - Session ID: ${participant.session_id}`)
        console.log(`   - User ID: ${participant.user_id}`)
        console.log(`   - Is online: ${participant.is_online}`)
        console.log(`   - Joined at: ${participant.joined_at}`)
        console.log('')
      })
    }
    
    // 4. Check if there are any duplicate participants
    console.log('🔍 4. Checking for duplicate participants...')
    const { data: duplicates, error: duplicatesError } = await supabase
      .from('session_participants')
      .select('user_id, session_id, count(*)')
      .eq('session_id', sessionId)
      .group('user_id, session_id')
      .having('count(*) > 1')
    
    if (duplicatesError) {
      console.error('❌ Error checking duplicates:', duplicatesError)
    } else {
      console.log('✅ Duplicate participants:', duplicates.length)
      if (duplicates.length > 0) {
        duplicates.forEach(dup => {
          console.log(`   - User ${dup.user_id} appears ${dup.count} times`)
        })
      }
    }
    
    // 5. Check session messages to see if guest is actually sending messages
    console.log('💬 5. Checking session messages...')
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('sender_id, created_at, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (messagesError) {
      console.error('❌ Error querying messages:', messagesError)
    } else {
      console.log('✅ Recent messages:', messages.length)
      const uniqueSenders = new Set(messages.map(m => m.sender_id))
      console.log('   - Unique senders:', uniqueSenders.size)
      console.log('   - Sender IDs:', Array.from(uniqueSenders))
      
      messages.forEach((message, index) => {
        console.log(`   Message ${index + 1}:`)
        console.log(`   - Sender: ${message.sender_id}`)
        console.log(`   - Time: ${message.created_at}`)
        console.log(`   - Content: ${message.content ? message.content.substring(0, 50) + '...' : 'No content'}`)
        console.log('')
      })
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

investigateSession()