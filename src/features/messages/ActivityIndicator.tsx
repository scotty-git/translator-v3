import { clsx } from 'clsx'
import { Mic, Brain, Loader2 } from 'lucide-react'
import type { UserActivity } from '@/types/database'

export interface ActivityIndicatorProps {
  activity: UserActivity['activity']
  userName?: string
  isOwnMessage?: boolean
}

export function ActivityIndicator({ activity, userName = 'Partner', isOwnMessage = false }: ActivityIndicatorProps) {
  const getActivityContent = () => {
    switch (activity) {
      case 'recording':
        return {
          icon: <Mic className="h-4 w-4 text-red-500" />,
          text: isOwnMessage ? 'Recording' : 'is recording',
          animation: 'animate-pulse',
          dots: (
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse-recording" />
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse-recording" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse-recording" style={{ animationDelay: '0.4s' }} />
            </div>
          )
        }
      case 'processing':
        return {
          icon: <Brain className="h-4 w-4 text-blue-500" />,
          text: isOwnMessage ? 'Processing' : 'is processing',
          animation: 'animate-pulse',
          dots: (
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
          )
        }
      case 'typing':
        return {
          icon: null,
          text: 'is typing',
          animation: '',
          dots: (
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-typing-dots" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-typing-dots" style={{ animationDelay: '0.4s' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-typing-dots" style={{ animationDelay: '0.8s' }} />
            </div>
          )
        }
      default:
        return {
          icon: null,
          text: 'is idle',
          animation: '',
          dots: null
        }
    }
  }

  const content = getActivityContent()

  return (
    <div className={clsx(
      'flex animate-slide-up-spring',
      isOwnMessage ? 'justify-end' : 'justify-start'
    )}>
      <div className={clsx(
        'glass-effect rounded-2xl px-4 py-3 max-w-[70%] transition-all duration-300 ease-in-out transform-gpu hover:scale-105',
        content.animation
      )}>
        <div className="flex items-center gap-3">
          <div className="transition-all duration-200 ease-in-out">
            {content.icon}
          </div>
          <span className="text-sm text-gray-600 italic transition-all duration-200 ease-in-out whitespace-nowrap">
            {isOwnMessage ? content.text : `${userName} ${content.text}`}
          </span>
          <div className="transition-all duration-200 ease-in-out">
            {content.dots}
          </div>
        </div>
      </div>
    </div>
  )
}