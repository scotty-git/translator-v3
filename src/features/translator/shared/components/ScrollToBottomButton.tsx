import { ChevronDown } from 'lucide-react'
import { clsx } from 'clsx'

interface ScrollToBottomButtonProps {
  onClick: () => void
  isVisible: boolean
  unreadCount?: number
  className?: string
  'data-testid'?: string
}

/**
 * Floating button to scroll to bottom of messages
 * Shows unread count badge when there are new messages
 * 
 * Styled like WhatsApp's scroll-to-bottom button:
 * - Positioned bottom-right
 * - Circular with down arrow
 * - Shows unread count when applicable
 * - Smooth fade in/out animation
 */
export function ScrollToBottomButton({ 
  onClick, 
  isVisible, 
  unreadCount = 0,
  className,
  'data-testid': testId = 'scroll-to-bottom-button'
}: ScrollToBottomButtonProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'fixed bottom-24 right-4 z-30',
        'w-12 h-12 rounded-full',
        'bg-white dark:bg-gray-800 shadow-lg',
        'border border-gray-200 dark:border-gray-700',
        'flex items-center justify-center',
        'transition-all duration-200',
        'hover:scale-105 active:scale-95',
        'focus:outline-none focus:ring-2 focus:ring-blue-500',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none',
        className
      )}
      aria-label={unreadCount > 0 ? `Scroll to bottom (${unreadCount} new messages)` : 'Scroll to bottom'}
      data-testid={testId}
    >
      {/* Down arrow icon */}
      <ChevronDown className="h-5 w-5 text-gray-600 dark:text-gray-400" />
      
      {/* Unread count badge */}
      {unreadCount > 0 && (
        <div className={clsx(
          'absolute -top-1 -right-1',
          'min-w-[20px] h-5 px-1',
          'bg-blue-500 text-white',
          'rounded-full',
          'flex items-center justify-center',
          'text-xs font-medium',
          'animate-scale-in'
        )}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      )}
    </button>
  )
}