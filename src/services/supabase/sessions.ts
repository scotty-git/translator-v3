import { supabase } from '@/lib/supabase'
import type { Session } from '@/types/database'

export class SessionService {
  /**
   * Generate a unique 4-digit session code
   */
  static async generateSessionCode(): Promise<string> {
    console.log('🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧')
    console.log('🎲 [SESSION SERVICE] GENERATING UNIQUE SESSION CODE')
    console.log('🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧')
    
    // Use database function to ensure uniqueness
    console.log('🎯 Attempting to use Supabase RPC function for code generation...')
    const { data, error } = await supabase
      .rpc('generate_unique_session_code')
      
    if (error) {
      console.log('⚠️ RPC function failed, falling back to client-side generation')
      console.log('   • RPC Error:', error.message)
      console.log('   • RPC Code:', error.code)
      
      // Fallback to client-side generation
      let code: string
      let attempts = 0
      
      console.log('🔄 Starting client-side code generation loop...')
      
      do {
        code = Math.floor(1000 + Math.random() * 9000).toString()
        console.log(`   🎲 Attempt ${attempts + 1}: Generated code "${code}"`)
        
        const exists = await this.sessionExists(code)
        console.log(`   🔍 Code "${code}" exists check:`, exists)
        
        if (!exists) {
          console.log('✅ Found unique code:', code)
          return code
        }
        attempts++
      } while (attempts < 10)
      
      console.log('❌ Failed to generate unique code after 10 attempts')
      throw new Error('Failed to generate unique session code')
    }
    
    console.log('🎉 RPC function succeeded!')
    console.log('   • Generated code:', data)
    console.log('🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧')
    
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
    console.log('🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀')
    console.log('🎯 [SESSION SERVICE] CREATING NEW SESSION')
    console.log('🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀')
    
    console.log('📝 Step 1: Generating unique session code...')
    const code = await this.generateSessionCode()
    console.log('✅ Step 1 Complete: Session code generated:', code)
    
    console.log('📝 Step 2: Inserting session into database...')
    console.log('   • Session code:', code)
    console.log('   • Table: sessions')
    console.log('   • Will auto-generate: id, created_at, expires_at, is_active, user_count, last_activity')
    
    const { data, error } = await supabase
      .from('sessions')
      .insert({ 
        code,
        user_count: 1  // Creator is the first user
      })
      .select()
      .single()
    
    if (error) {
      console.log('❌ SESSION CREATION FAILED!')
      console.log('   • Error Message:', error.message)
      console.log('   • Error Code:', error.code)
      console.log('   • Error Details:', error.details)
      console.log('   • Error Hint:', error.hint)
      console.log('🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀')
      throw error
    }
    
    console.log('🎉 SESSION CREATION SUCCESSFUL!')
    console.log('   • Session ID:', data.id)
    console.log('   • Session Code:', data.code)
    console.log('   • Created At:', data.created_at)
    console.log('   • Expires At:', data.expires_at)
    console.log('   • Is Active:', data.is_active)
    console.log('   • User Count:', data.user_count)
    console.log('   • Last Activity:', data.last_activity)
    console.log('🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀')
    
    return data
  }

  /**
   * Join an existing session
   */
  static async joinSession(code: string): Promise<Session> {
    console.log('🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗')
    console.log('🤝 [SESSION SERVICE] JOINING EXISTING SESSION')
    console.log('🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗')
    
    console.log('📝 Step 1: Looking up session by code...')
    console.log('   • Session code to find:', code)
    console.log('   • Searching for: active sessions only')
    
    // First, check if session exists and is active
    const { data: session, error: fetchError } = await supabase
      .from('sessions')
      .select()
      .eq('code', code)
      .eq('is_active', true)
      .single()
    
    if (fetchError) {
      console.log('❌ SESSION LOOKUP FAILED!')
      console.log('   • Error Message:', fetchError.message)
      console.log('   • Error Code:', fetchError.code)
      console.log('   • Error Details:', fetchError.details)
      console.log('   • Likely Cause: Session code not found or session inactive')
      console.log('🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗')
      throw new Error('Session not found or expired')
    }
    
    if (!session) {
      console.log('❌ SESSION NOT FOUND!')
      console.log('   • Session code:', code)
      console.log('   • Result: No active session with this code')
      console.log('🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗')
      throw new Error('Session not found or expired')
    }
    
    console.log('✅ Step 1 Complete: Session found!')
    console.log('   • Session ID:', session.id)
    console.log('   • Session Code:', session.code)
    console.log('   • Created At:', session.created_at)
    console.log('   • Current User Count:', session.user_count)
    console.log('   • Is Active:', session.is_active)
    console.log('   • Last Activity:', session.last_activity)
    
    console.log('📝 Step 2: Updating user count and last activity...')
    const newUserCount = session.user_count + 1
    console.log('   • Old user count:', session.user_count)
    console.log('   • New user count:', newUserCount)
    
    // Update user count and last activity
    const { data, error } = await supabase
      .from('sessions')
      .update({ 
        user_count: newUserCount,
        last_activity: new Date().toISOString()
      })
      .eq('id', session.id)
      .select()
      .single()
    
    if (error) {
      console.log('❌ SESSION UPDATE FAILED!')
      console.log('   • Error Message:', error.message)
      console.log('   • Error Code:', error.code)
      console.log('   • Error Details:', error.details)
      console.log('   • Error Hint:', error.hint)
      console.log('🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗')
      throw error
    }
    
    console.log('🎉 SESSION JOIN SUCCESSFUL!')
    console.log('   • Session ID:', data.id)
    console.log('   • Session Code:', data.code)
    console.log('   • Updated User Count:', data.user_count)
    console.log('   • Updated Last Activity:', data.last_activity)
    console.log('   • User successfully joined session!')
    console.log('🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗🔗')
    
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

  /**
   * Update session last activity (heartbeat)
   */
  static async updateLastActivity(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', sessionId)
      
    if (error) throw error
  }

  /**
   * Check if session is still active and not expired
   */
  static async checkSessionActive(sessionId: string): Promise<boolean> {
    const { data } = await supabase
      .from('sessions')
      .select('is_active, expires_at')
      .eq('id', sessionId)
      .single()
      
    if (!data) return false
    
    // Check if session is marked as active
    if (!data.is_active) return false
    
    // Check if session has expired by time
    if (new Date(data.expires_at) <= new Date()) {
      return false
    }
    
    return true
  }

  /**
   * Extend session expiry by 4 hours from now
   */
  static async extendSession(sessionId: string): Promise<void> {
    const newExpiryTime = new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours from now
    
    const { error } = await supabase
      .from('sessions')
      .update({ 
        expires_at: newExpiryTime.toISOString(),
        last_activity: new Date().toISOString()
      })
      .eq('id', sessionId)
      
    if (error) throw error
  }

  /**
   * Get session by ID
   */
  static async getSession(sessionId: string): Promise<Session | null> {
    const { data, error } = await supabase
      .from('sessions')
      .select()
      .eq('id', sessionId)
      .single()
      
    if (error) {
      console.error('Error fetching session:', error)
      return null
    }
    
    return data
  }

  /**
   * Get session by code
   */
  static async getSessionByCode(code: string): Promise<Session | null> {
    const { data, error } = await supabase
      .from('sessions')
      .select()
      .eq('code', code)
      .eq('is_active', true)
      .single()
      
    if (error) {
      console.error('Error fetching session by code:', error)
      if (error.code === 'PGRST116') {
        throw new Error('Session not found')
      }
      throw new Error('Failed to fetch session')
    }
    
    if (!data) {
      throw new Error('Session not found')
    }
    
    return data
  }

  /**
   * Deactivate session (soft delete)
   */
  static async deactivateSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('sessions')
      .update({ 
        is_active: false,
        last_activity: new Date().toISOString()
      })
      .eq('id', sessionId)
      
    if (error) throw error
  }
}