import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'pulse' | 'dots'
  className?: string
  color?: 'blue' | 'gray' | 'white'
}

export function Spinner({ 
  size = 'md', 
  variant = 'default',
  className,
  color = 'blue'
}: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  }

  const colorClasses = {
    blue: 'text-blue-600',
    gray: 'text-gray-600',
    white: 'text-white'
  }

  if (variant === 'pulse') {
    return (
      <div className={clsx('animate-pulse-soft', className)}>
        <Loader2 className={clsx(
          'animate-spin',
          sizeClasses[size],
          colorClasses[color]
        )} />
      </div>
    )
  }

  if (variant === 'dots') {
    return (
      <div className={clsx('flex space-x-1', className)}>
        <div className={clsx(
          'rounded-full animate-bounce-subtle',
          size === 'sm' && 'w-2 h-2',
          size === 'md' && 'w-3 h-3',
          size === 'lg' && 'w-4 h-4',
          size === 'xl' && 'w-6 h-6',
          color === 'blue' && 'bg-blue-600',
          color === 'gray' && 'bg-gray-600',
          color === 'white' && 'bg-white'
        )} />
        <div className={clsx(
          'rounded-full animate-bounce-subtle',
          size === 'sm' && 'w-2 h-2',
          size === 'md' && 'w-3 h-3',
          size === 'lg' && 'w-4 h-4',
          size === 'xl' && 'w-6 h-6',
          color === 'blue' && 'bg-blue-600',
          color === 'gray' && 'bg-gray-600',
          color === 'white' && 'bg-white'
        )} style={{ animationDelay: '0.15s' }} />
        <div className={clsx(
          'rounded-full animate-bounce-subtle',
          size === 'sm' && 'w-2 h-2',
          size === 'md' && 'w-3 h-3',
          size === 'lg' && 'w-4 h-4',
          size === 'xl' && 'w-6 h-6',
          color === 'blue' && 'bg-blue-600',
          color === 'gray' && 'bg-gray-600',
          color === 'white' && 'bg-white'
        )} style={{ animationDelay: '0.3s' }} />
      </div>
    )
  }

  return (
    <svg
      className={clsx(
        'animate-spin',
        sizeClasses[size],
        colorClasses[color],
        className
      )}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}