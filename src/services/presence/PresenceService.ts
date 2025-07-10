import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { ActivityState, PresenceData, IPresenceService } from './types'

/**
 * PresenceService - Handles real-time presence and activity indicators
 * 
 * Core Features:
 * - Activity broadcasting ('recording', 'processing', 'typing', 'idle')
 * - Partner online/offline detection
 * - Clean channel management with no timestamp conflicts
 * - Database-first approach with presence fallback
 */
export class PresenceService implements IPresenceService {
  private presenceChannel: RealtimeChannel | null = null
  private participantChannel: RealtimeChannel | null = null
  
  // Current session state
  private currentSessionId: string | null = null
  private currentUserId: string | null = null
  
  // Callbacks
  private onPresenceChanged?: (isOnline: boolean) => void
  private onActivityChanged?: (activity: ActivityState) => void
  
  // Track participant state for immediate presence updates
  private sessionParticipants = new Set<string>()
  private lastPartnerPresenceState = false

  /**
   * Initialize presence service for a session
   */
  async initialize(sessionId: string, userId: string): Promise<void> {
    console.log('👥 [PresenceService] Initializing for session:', sessionId)
    
    this.currentSessionId = sessionId
    this.currentUserId = userId
    
    try {
      // Clean up any existing subscriptions first
      await this.cleanup()
      
      // Set up presence subscription
      await this.setupPresenceSubscription(sessionId, userId)
      
      // Set up participant subscription to detect when partners join
      await this.setupParticipantSubscription(sessionId)
      
      // Load existing participants from database to initialize tracking
      await this.loadExistingParticipants()
      
      console.log('✅ [PresenceService] Initialized successfully')
      
    } catch (error) {
      console.error('❌ [PresenceService] Failed to initialize:', error)
      throw error
    }
  }

  /**
   * Set up real-time presence subscription
   */
  private async setupPresenceSubscription(sessionId: string, userId: string): Promise<void> {
    // Use deterministic channel name so all devices join the same channel
    const channelName = `presence:${sessionId}`
    
    // Clean up any existing presence channels for this session
    const existingChannels = supabase.getChannels()
    const presenceChannels = existingChannels.filter(ch => ch.topic.startsWith(`presence:${sessionId}`))
    
    if (presenceChannels.length > 0) {
      console.warn('⚠️ [PresenceService] Found existing presence channels, cleaning up:', presenceChannels.length)
      for (const channel of presenceChannels) {
        try {
          await channel.unsubscribe()
          await supabase.removeChannel(channel)
        } catch (error) {
          console.error('❌ [PresenceService] Error removing existing presence channel:', error)
        }
      }
    }
    
    this.presenceChannel = supabase
      .channel(channelName)
      .on('presence', { event: 'sync' }, () => {
        const state = this.presenceChannel?.presenceState()
        console.log('👥 [PresenceService] Presence sync:', state)
        this.updatePartnerPresence(state).catch(console.error)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('👋 [PresenceService] User joined:', key, newPresences)
        this.updatePartnerPresence(this.presenceChannel?.presenceState()).catch(console.error)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('👋 [PresenceService] User left:', key, leftPresences)
        this.updatePartnerPresence(this.presenceChannel?.presenceState()).catch(console.error)
      })
      .on('broadcast', { event: 'activity' }, ({ payload }) => {
        console.log(`🎧 [ActivityIndicator] Raw broadcast received:`, {
          payloadUserId: payload.userId,
          currentUserId: userId,
          payloadSessionId: payload.sessionId,
          currentSessionId: this.currentSessionId,
          activity: payload.activity,
          isOwnMessage: payload.userId === userId
        })
        
        // Validate the activity is for our current session
        if (payload.sessionId && payload.sessionId !== this.currentSessionId) {
          console.warn('⚠️ [ActivityIndicator] Received activity for different session')
          return
        }
        if (payload.userId !== userId && payload.activity) {
          console.log(`📥 [ActivityIndicator] Received: ${payload.activity} from partner`)
          console.log(`🎯 [ActivityIndicator] Calling onActivityChanged(${payload.activity})`)
          this.onActivityChanged?.(payload.activity)
        } else {
          console.log(`⏭️ [ActivityIndicator] Skipping own activity or missing data:`, {
            isOwnMessage: payload.userId === userId,
            hasActivity: !!payload.activity
          })
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track this user's presence
          await this.presenceChannel?.track({
            user_id: userId,
            session_id: sessionId,
            online_at: new Date().toISOString(),
            activity: 'idle'
          })
        }
      })
  }

  /**
   * Set up participant subscription to detect when partners join
   */
  private async setupParticipantSubscription(sessionId: string): Promise<void> {
    console.log('👥 [PresenceService] Setting up participant subscription for session:', sessionId)
    
    // Listen for INSERT and UPDATE events on session_participants table
    this.participantChannel = supabase
      .channel(`participants:${sessionId}:${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'session_participants',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        console.log('👤 [PresenceService] New participant joined:', {
          sessionId,
          userId: payload.new.user_id,
          isOnline: payload.new.is_online
        })
        
        // Add participant to our tracking set if online
        if (payload.new.is_online) {
          this.sessionParticipants.add(payload.new.user_id)
        }
        
        // Immediately update partner presence
        this.updatePartnerPresenceImmediate()
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'session_participants',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        console.log('👤 [PresenceService] Participant updated:', {
          sessionId,
          userId: payload.new.user_id,
          isOnline: payload.new.is_online
        })
        
        // Update participant tracking based on online status
        if (payload.new.is_online) {
          this.sessionParticipants.add(payload.new.user_id)
        } else {
          this.sessionParticipants.delete(payload.new.user_id)
        }
        
        // Immediately update partner presence
        this.updatePartnerPresenceImmediate()
      })
      .subscribe()
  }

  /**
   * Load existing participants to initialize presence tracking
   */
  private async loadExistingParticipants(): Promise<void> {
    if (!this.currentSessionId) {
      console.warn('⚠️ [PresenceService] Cannot load participants - no session ID')
      return
    }

    try {
      const { data: participants, error } = await supabase
        .from('session_participants')
        .select('user_id, is_online')
        .eq('session_id', this.currentSessionId)
        .eq('is_online', true)

      if (error) {
        console.error('❌ [PresenceService] Failed to load participants:', error)
        return
      }

      console.log('📋 [PresenceService] Loaded existing participants:', participants)
      
      // Initialize participant tracking
      this.sessionParticipants.clear()
      participants?.forEach(p => {
        if (p.is_online) {
          this.sessionParticipants.add(p.user_id)
        }
      })
      
      // Update partner presence based on loaded data
      this.updatePartnerPresenceImmediate()
      
    } catch (error) {
      console.error('❌ [PresenceService] Error loading participants:', error)
    }
  }

  /**
   * Update partner presence immediately based on realtime participant events
   */
  private updatePartnerPresenceImmediate(): void {
    if (!this.currentUserId || !this.currentSessionId) {
      return
    }

    // Check if we have a partner (someone other than current user)
    const hasPartner = Array.from(this.sessionParticipants).some(userId => userId !== this.currentUserId)
    
    console.log('🚀 [PresenceService] Immediate presence update:', {
      sessionParticipants: Array.from(this.sessionParticipants),
      currentUserId: this.currentUserId,
      hasPartner,
      participantCount: this.sessionParticipants.size
    })
    
    // Only trigger callback if presence state actually changed
    if (hasPartner !== this.lastPartnerPresenceState) {
      console.log('👥 [PresenceService] Partner presence changed (immediate):', {
        from: this.lastPartnerPresenceState,
        to: hasPartner
      })
      
      this.lastPartnerPresenceState = hasPartner
      this.onPresenceChanged?.(hasPartner)
    }
  }

  /**
   * Update partner presence based on database state (DATABASE-FIRST APPROACH)
   */
  private async updatePartnerPresence(presenceState: any): Promise<void> {
    console.log('👥 [PresenceService] updatePartnerPresence called:', {
      hasPresenceState: !!presenceState,
      currentUserId: this.currentUserId,
      presenceKeys: presenceState ? Object.keys(presenceState) : 'none'
    })

    if (!this.currentUserId || !this.currentSessionId) {
      console.log('❌ [PresenceService] Missing session or user ID for presence check')
      this.onPresenceChanged?.(false)
      return
    }

    try {
      // DATABASE-FIRST APPROACH: Check database for reliable presence detection
      const { data: participants, error } = await supabase
        .from('session_participants')
        .select('user_id, is_online')
        .eq('session_id', this.currentSessionId)

      if (error) {
        console.error('❌ [PresenceService] Failed to check participants for presence:', error)
        // Fallback to presence channel if database fails
        this.fallbackToPresenceChannel(presenceState)
        return
      }

      console.log('🔍 [PresenceService] Database presence check:', {
        sessionId: this.currentSessionId,
        currentUserId: this.currentUserId,
        participants: participants?.map(p => ({ user_id: p.user_id, is_online: p.is_online })),
        participantCount: participants?.length
      })

      // Check if we have at least 2 participants and partner is online
      if (!participants || participants.length < 2) {
        console.log('👥 [PresenceService] Less than 2 participants, partner not online')
        this.onPresenceChanged?.(false)
        return
      }

      // Check if partner is online in database
      const partnerOnline = participants.some(p => p.user_id !== this.currentUserId && p.is_online)

      console.log('👥 [PresenceService] Database partner presence check:', {
        partnerOnline,
        participants: participants.map(p => ({ user_id: p.user_id, is_online: p.is_online }))
      })

      this.onPresenceChanged?.(partnerOnline)

    } catch (error) {
      console.error('❌ [PresenceService] Error checking partner presence:', error)
      // Fallback to presence channel if database fails
      this.fallbackToPresenceChannel(presenceState)
    }
  }

  /**
   * Fallback to presence channel when database check fails
   */
  private fallbackToPresenceChannel(presenceState: any): void {
    console.log('🔄 [PresenceService] Falling back to presence channel detection')
    
    if (!presenceState) {
      this.onPresenceChanged?.(false)
      return
    }

    // Check if there are other users present
    const presenceUsers = Object.keys(presenceState)
    const hasOtherUsers = presenceUsers.some(key => {
      const userPresences = presenceState[key]
      return userPresences.some((presence: any) => presence.user_id !== this.currentUserId)
    })

    console.log('🔄 [PresenceService] Presence channel fallback result:', {
      hasOtherUsers,
      presenceUsers: presenceUsers.length
    })

    this.onPresenceChanged?.(hasOtherUsers)
  }

  /**
   * Broadcast activity to other participants
   */
  async updateActivity(activity: ActivityState): Promise<void> {
    if (!this.presenceChannel || !this.currentUserId) {
      console.warn('⚠️ [PresenceService] Cannot broadcast activity - no active channel')
      return
    }

    try {
      // Streamlined activity broadcast logging
      console.log(`📡 [ActivityIndicator] Sent: ${activity}`)
      await this.presenceChannel.send({
        type: 'broadcast',
        event: 'activity',
        payload: {
          userId: this.currentUserId,
          sessionId: this.currentSessionId,
          activity,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('❌ [ActivityIndicator] Broadcast failed:', error)
    }
  }

  /**
   * Subscribe to partner presence changes
   */
  subscribeToPresence(callback: (isOnline: boolean) => void): () => void {
    this.onPresenceChanged = callback
    
    // Return unsubscribe function
    return () => {
      this.onPresenceChanged = undefined
    }
  }

  /**
   * Subscribe to partner activity changes
   */
  subscribeToActivity(callback: (activity: ActivityState) => void): () => void {
    this.onActivityChanged = callback
    
    // Return unsubscribe function
    return () => {
      this.onActivityChanged = undefined
    }
  }

  /**
   * Get currently online users (placeholder implementation)
   */
  getOnlineUsers(): PresenceData[] {
    // This would need to be implemented based on actual presence state
    // For now, return empty array as this is not currently used
    return []
  }

  /**
   * Clean up all subscriptions and channels
   */
  async cleanup(): Promise<void> {
    console.log('🧹 [PresenceService] Cleaning up subscriptions...')
    
    // Properly remove Supabase channels to prevent zombies
    if (this.presenceChannel) {
      console.log('🔌 [PresenceService] Removing presence channel...')
      try {
        await this.presenceChannel.unsubscribe()
        await supabase.removeChannel(this.presenceChannel)
      } catch (error) {
        console.error('❌ [PresenceService] Error removing presence channel:', error)
      }
      this.presenceChannel = null
    }

    if (this.participantChannel) {
      console.log('🔌 [PresenceService] Removing participant channel...')
      try {
        await this.participantChannel.unsubscribe()
        await supabase.removeChannel(this.participantChannel)
      } catch (error) {
        console.error('❌ [PresenceService] Error removing participant channel:', error)
      }
      this.participantChannel = null
    }

    // Reset state
    this.currentSessionId = null
    this.currentUserId = null
    this.sessionParticipants.clear()
    this.lastPartnerPresenceState = false
    this.onPresenceChanged = undefined
    this.onActivityChanged = undefined
    
    console.log('✅ [PresenceService] Cleanup completed')
  }
}