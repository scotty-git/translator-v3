import { useState, useEffect } from 'react'
import { X, RefreshCw } from 'lucide-react'
import { Button } from './ui/Button'
import type { ActionableError } from '@/lib/errors/ErrorMessages'
import { parseError } from '@/lib/errors/ErrorMessages'

interface ErrorDisplayProps {
  error: Error | string | null
  onDismiss?: () => void
  onRetry?: () => void
  className?: string
}

export function ErrorDisplay({ error, onDismiss, onRetry, className = '' }: ErrorDisplayProps) {
  const [errorConfig, setErrorConfig] = useState<ActionableError | null>(null)
  
  useEffect(() => {
    if (error) {
      const config = parseError(error)
      setErrorConfig(config)
    } else {
      setErrorConfig(null)
    }
  }, [error])
  
  if (!error || !errorConfig) return null
  
  return (
    <div className={`relative bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 ${className}`}>
      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-800/50 transition-colors"
          aria-label="Dismiss error"
        >
          <X className="h-4 w-4 text-red-600 dark:text-red-400" />
        </button>
      )}
      
      <div className="flex gap-3">
        {/* Icon */}
        {errorConfig.icon && (
          <div className="flex-shrink-0">
            {errorConfig.icon}
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
            {errorConfig.title}
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300">
            {errorConfig.message}
          </p>
          
          {/* Actions */}
          <div className="mt-3 flex gap-2">
            {/* Primary action */}
            {errorConfig.action && (
              <Button
                size="sm"
                variant="primary"
                onClick={errorConfig.action.handler}
                className="bg-red-600 hover:bg-red-700"
              >
                {errorConfig.action.label}
              </Button>
            )}
            
            {/* Retry action */}
            {errorConfig.showRetry && (onRetry || errorConfig.retryAction) && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry || errorConfig.retryAction}
                className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-800/50"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Try Again
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Inline error display for form fields or small spaces
 */
export function InlineError({ error, className = '' }: { error: string | null, className?: string }) {
  if (!error) return null
  
  return (
    <p className={`text-sm text-red-600 dark:text-red-400 mt-1 ${className}`}>
      {error}
    </p>
  )
}

/**
 * Toast-style error notification
 */
export function ErrorToast({ error, onDismiss, duration = 5000 }: {
  error: Error | string | null
  onDismiss?: () => void
  duration?: number
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [errorConfig, setErrorConfig] = useState<ActionableError | null>(null)
  
  useEffect(() => {
    if (error) {
      const config = parseError(error)
      setErrorConfig(config)
      setIsVisible(true)
      
      // Auto-dismiss after duration
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => onDismiss?.(), 300) // Wait for animation
      }, duration)
      
      return () => clearTimeout(timer)
    }
  }, [error, onDismiss, duration])
  
  if (!error || !errorConfig) return null
  
  return (
    <div className={`
      fixed bottom-4 right-4 max-w-md transform transition-all duration-300 z-50
      ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
    `}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-red-200 dark:border-red-800 p-4">
        <div className="flex items-start gap-3">
          {errorConfig.icon && (
            <div className="flex-shrink-0">
              {errorConfig.icon}
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-900 dark:text-red-100">
              {errorConfig.title}
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              {errorConfig.message}
            </p>
          </div>
          {onDismiss && (
            <button
              onClick={() => {
                setIsVisible(false)
                setTimeout(() => onDismiss(), 300)
              }}
              className="flex-shrink-0 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}