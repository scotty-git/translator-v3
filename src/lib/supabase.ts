import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { withRetry } from './connection-recovery'

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

// Connection health check with retry
export const checkSupabaseConnectionWithRetry = async (): Promise<boolean> => {
  try {
    return await withRetry(
      checkSupabaseConnection,
      'supabase.healthcheck'
    )
  } catch (error) {
    console.error('Failed to establish Supabase connection after retries:', error)
    return false
  }
}