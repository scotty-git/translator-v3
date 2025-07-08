import { supabase } from '@/lib/supabase'
import type { Message, PerformanceMetrics } from '@/types/database'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { performanceLogger, PERF_OPS } from '@/lib/performance'
import { WorkflowRetry } from '@/lib/retry-logic'

export class MessageService {
  /**
   * Create a new message in queued state
   */
  static async createMessage(
    sessionId: string,
    userId: string,
    originalText: string,
    originalLang: string,
    targetLang: string
  ): Promise<Message> {
    return performanceLogger.measureAsync(
      PERF_OPS.DB_MESSAGE_CREATE,
      async () => {
        return WorkflowRetry.database(async () => {
          console.log('💾 Creating message in database...')
          
          const { data, error } = await supabase
            .from('messages')
            .insert({
              session_id: sessionId,
              user_id: userId,
              original: originalText,
              original_lang: originalLang,
              target_lang: targetLang,
              status: 'queued',
            })
            .select()
            .single()
            
          if (error) {
            // Enhance error for retry logic
            const enhancedError = error as any
            enhancedError.isNetworkError = true
            throw enhancedError
          }
          return data
        }, (attempt, error) => {
          console.warn(`💾 Database retry attempt ${attempt} for createMessage:`, error.message)
        })
      },
      { sessionId, textLength: originalText.length }
    )
  }

  /**
   * Update message with translation
   */
  static async updateMessageTranslation(
    messageId: string,
    translation: string,
    performanceMetrics?: PerformanceMetrics
  ): Promise<Message> {
    return performanceLogger.measureAsync(
      PERF_OPS.DB_MESSAGE_UPDATE,
      async () => {
        const { data, error } = await supabase
          .from('messages')
          .update({
            translation,
            status: 'processing',
            processed_at: new Date().toISOString(),
            performance_metrics: performanceMetrics,
          })
          .eq('id', messageId)
          .select()
          .single()
          
        if (error) throw error
        return data
      },
      { messageId, translationLength: translation.length }
    )
  }

  /**
   * Mark message as displayed
   */
  static async markMessageDisplayed(messageId: string): Promise<void> {
    await supabase
      .from('messages')
      .update({
        status: 'displayed',
        displayed_at: new Date().toISOString(),
      })
      .eq('id', messageId)
  }

  /**
   * Get messages for a session
   */
  static async getSessionMessages(
    sessionId: string,
    limit = 50
  ): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select()
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(limit)
      
    if (error) throw error
    return data
  }

  /**
   * Get recent messages for conversation context (last N messages)
   */
  static async getRecentMessages(
    sessionId: string,
    limit = 6
  ): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select()
      .eq('session_id', sessionId)
      .eq('status', 'displayed') // Only get completed messages
      .order('created_at', { ascending: false }) // Most recent first
      .limit(limit)
      
    if (error) throw error
    
    // Return in chronological order (oldest first) for context building
    return data.reverse()
  }

  /**
   * Subscribe to new messages in a session
   */
  static subscribeToMessages(
    sessionId: string,
    onMessage: (message: Message) => void
  ): RealtimeChannel {
    return supabase
      .channel(`messages-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          onMessage(payload.new as Message)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          onMessage(payload.new as Message)
        }
      )
      .subscribe()
  }
}