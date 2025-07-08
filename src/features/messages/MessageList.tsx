import { useEffect, useRef, useState } from 'react'
import { MessageBubble } from './MessageBubble'
import { ActivityIndicator } from './ActivityIndicator'
import { messageQueue, QueuedMessage } from './MessageQueue'
import { Languages, Sparkles } from 'lucide-react'

export function MessageList() {
  // Solo mode - simplified without session context
  const userId = 'single-user'
  const [messages, setMessages] = useState<QueuedMessage[]>([])
  const [activities, setActivities] = useState<any[]>([]) // Keep activities for solo mode feedback
  const [isLoading, setIsLoading] = useState(false) // No loading needed in solo mode
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

  // Solo mode - no session loading needed
  // Messages are handled locally via messageQueue

  // Handle audio playback
  const handlePlayAudio = (audioUrl: string) => {
    if (audioRef.current) {
      audioRef.current.src = audioUrl
      audioRef.current.play().catch(console.error)
    }
  }

  // Solo mode - no activity tracking needed
  // Only one user, so no partner activities to display

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

        {/* Activity indicators for solo mode feedback */}
        {activities.map((activity, index) => (
          <ActivityIndicator
            key={`activity-${index}`}
            activity={activity.activity}
            userName="You"
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