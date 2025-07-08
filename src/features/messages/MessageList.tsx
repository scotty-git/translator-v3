import { useEffect, useRef, useState } from 'react'
import { MessageBubble } from './MessageBubble'
import { ActivityIndicator } from './ActivityIndicator'
import { ActivityService } from '../../services/supabase/activity'
import { messageQueue, QueuedMessage } from './MessageQueue'
import { useSession } from '../session/SessionContext'
import { Languages, Sparkles } from 'lucide-react'
import type { UserActivity } from '@/types/database'

export function MessageList() {
  const { session, userId } = useSession()
  const [messages, setMessages] = useState<QueuedMessage[]>([])
  const [activities, setActivities] = useState<UserActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, activities])

  // Subscribe to message queue updates
  useEffect(() => {
    const unsubscribe = messageQueue.subscribe(setMessages)
    return unsubscribe
  }, [])

  // Load message history and simulate real-time
  useEffect(() => {
    if (!session) return

    const loadHistory = async () => {
      try {
        // TODO: In real implementation, load from MessageService.getSessionMessages(session.id)
        // For now, simulate loading complete
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to load message history:', error)
        setIsLoading(false)
      }
    }

    loadHistory()

    // Simulate real-time message updates
    // TODO: Replace with actual Supabase real-time subscription
    // const channel = MessageService.subscribeToMessages(session.id, (message) => {
    //   if (message.user_id !== userId) {
    //     messageQueue.add(message)
    //   }
    // })

  }, [session, userId])

  // Handle audio playback
  const handlePlayAudio = (audioUrl: string) => {
    if (audioRef.current) {
      audioRef.current.src = audioUrl
      audioRef.current.play().catch(console.error)
    }
  }

  // Simulate activity updates
  useEffect(() => {
    if (!session) return

    // TODO: Replace with actual ActivityService
    // const loadActivities = async () => {
    //   const currentActivities = await ActivityService.getSessionActivities(session.id)
    //   setActivities(currentActivities)
    // }
    
    // loadActivities()

    // const channel = ActivityService.subscribeToActivities(session.id, (activity) => {
    //   setActivities(prev => {
    //     const filtered = prev.filter(a => a.user_id !== activity.user_id)
    //     if (activity.activity !== 'idle') {
    //       return [...filtered, activity]
    //     }
    //     return filtered
    //   })
    // })

    /**
     * REAL ACTIVITY SERVICE INTEGRATION
     * 
     * Subscribe to actual activity updates from the database.
     * This replaces the mock data that was causing incorrect activity indicators.
     */
    if (!session?.id) return
    
    const channel = ActivityService.subscribeToActivities(session.id, (activity) => {
      console.log('📱 Activity update received:', activity)
      
      // Only show partner's activities, not our own
      if (activity.user_id === userId) {
        console.log('📱 Ignoring own activity:', activity)
        return
      }
      
      setActivities(prevActivities => {
        // Remove any existing activity for this user
        const filtered = prevActivities.filter(a => a.user_id !== activity.user_id)
        
        // Add new activity only if it's not idle
        if (activity.activity !== 'idle') {
          console.log('📱 Adding partner activity:', activity)
          return [...filtered, activity]
        } else {
          console.log('📱 Removing partner activity (idle):', activity)
          return filtered
        }
      })
    })

    // Cleanup subscription on unmount
    return () => {
      if (channel) {
        channel.unsubscribe()
      }
    }
  }, [session?.id, userId])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading conversation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
      <div className="p-4 space-y-4">
        {/* Welcome message */}
        {messages.length === 0 && (
          <div className="text-center py-12 animate-fade-in">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Languages className="h-12 w-12 text-blue-500 dark:text-blue-400" />
                <Sparkles className="h-6 w-6 text-blue-400 dark:text-blue-300 absolute -top-1 -right-1 animate-pulse" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Ready to translate!
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-1">
              Hold the record button to start a conversation
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your messages will appear here with real-time translation
            </p>
          </div>
        )}

        {/* Messages */}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onPlayAudio={handlePlayAudio}
          />
        ))}

        {/* Activity indicators */}
        {activities.filter(a => a.user_id !== userId).map((activity) => (
          <ActivityIndicator
            key={activity.user_id}
            activity={activity.activity}
            userName="Partner"
          />
        ))}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Hidden audio element for playback */}
      <audio ref={audioRef} preload="none" />
    </div>
  )
}