import { useEffect, useState } from 'react'
import { clsx } from 'clsx'

interface UnreadMessagesDividerProps {
  isVisible: boolean
  messageCount?: number
  className?: string
  'data-testid'?: string
}

/**
 * Visual divider that shows between read and unread messages
 * Similar to WhatsApp's "Unread messages" indicator
 * 
 * Features:
 * - Green line with text
 * - Fades out after a few seconds
 * - Smooth animations
 */
export function UnreadMessagesDivider({ 
  isVisible, 
  messageCount,
  className,
  'data-testid': testId = 'unread-messages-divider'
}: UnreadMessagesDividerProps) {
  const [shouldShow, setShouldShow] = useState(isVisible)
  const [isFading, setIsFading] = useState(false)
  
  useEffect(() => {
    if (isVisible) {
      setShouldShow(true)
      setIsFading(false)
      
      // Start fading after 3 seconds
      const fadeTimer = setTimeout(() => {
        setIsFading(true)
      }, 3000)
      
      // Remove completely after fade animation
      const removeTimer = setTimeout(() => {
        setShouldShow(false)
      }, 3500)
      
      return () => {
        clearTimeout(fadeTimer)
        clearTimeout(removeTimer)
      }
    } else {
      setShouldShow(false)
    }
  }, [isVisible])
  
  if (!shouldShow) return null
  
  return (
    <div 
      className={clsx(
        'relative flex items-center gap-3 py-2 px-4',
        'transition-opacity duration-500',
        isFading ? 'opacity-0' : 'opacity-100',
        className
      )}
      data-testid={testId}
    >
      {/* Left line */}
      <div className="flex-1 h-px bg-green-500/30" />
      
      {/* Text */}
      <span className="text-xs font-medium text-green-600 dark:text-green-500 whitespace-nowrap">
        {messageCount && messageCount > 1 
          ? `${messageCount} unread messages`
          : 'Unread messages'
        }
      </span>
      
      {/* Right line */}
      <div className="flex-1 h-px bg-green-500/30" />
    </div>
  )
}