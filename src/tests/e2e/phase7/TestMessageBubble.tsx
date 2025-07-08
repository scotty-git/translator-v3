/**
 * Simple Test Message Bubble for Phase 7 Performance Testing
 * Does not require SessionProvider - standalone component for testing
 */

import { memo } from 'react'
import { clsx } from 'clsx'
import type { QueuedMessage } from '@/features/messages/MessageQueue'

interface TestMessageBubbleProps {
  message: QueuedMessage
  theme?: 'blue' | 'emerald' | 'purple' | 'rose' | 'amber'
}

const TestMessageBubbleComponent = ({ 
  message, 
  theme = 'blue' 
}: TestMessageBubbleProps) => {
  // Mock user ID for testing
  const isOwnMessage = message.user_id === 'test-user-1'
  
  const themeColors = {
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500', 
    purple: 'bg-purple-500',
    rose: 'bg-rose-500',
    amber: 'bg-amber-500'
  }
  
  return (
    <div className={clsx(
      'flex mb-3',
      isOwnMessage ? 'justify-end' : 'justify-start'
    )}>
      <div className={clsx(
        'max-w-xs lg:max-w-md px-4 py-2 rounded-lg text-white shadow-sm',
        isOwnMessage ? themeColors[theme] : 'bg-gray-500',
        isOwnMessage ? 'rounded-br-none' : 'rounded-bl-none'
      )}>
        {/* Primary text (translation if available, otherwise original) */}
        <div className="text-sm font-medium">
          {message.translation || message.original}
        </div>
        
        {/* Secondary text (original when translated) */}
        {message.translation && (
          <div className="text-xs opacity-75 mt-1">
            {message.original}
          </div>
        )}
        
        {/* Status and timestamp */}
        <div className="flex items-center justify-between mt-1 text-xs opacity-60">
          <span>{message.status}</span>
          <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  )
}

// Memoize for performance testing
export const TestMessageBubble = memo(TestMessageBubbleComponent, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.status === nextProps.message.status &&
    prevProps.message.translation === nextProps.message.translation &&
    prevProps.theme === nextProps.theme
  )
})

TestMessageBubble.displayName = 'TestMessageBubble'