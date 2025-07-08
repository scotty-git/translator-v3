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
        activity: activityType,
        last_updated: new Date().toISOString(),
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
      .neq('activity', 'idle')
      
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
    const channel = supabase
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
          console.log('🔄 Activity payload received:', payload)
          if (payload.new) {
            console.log('🔄 Broadcasting activity update:', payload.new)
            onActivity(payload.new as UserActivity)
          }
        }
      )
      .subscribe()
      
    console.log('🔄 Activity subscription created for session:', sessionId)
    return channel
  }

  /**
   * Clean up timers on unmount
   */
  static cleanup(): void {
    this.activityTimers.forEach(timer => clearTimeout(timer))
    this.activityTimers.clear()
  }
}