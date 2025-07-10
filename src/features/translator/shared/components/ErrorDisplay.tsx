import { useState, useEffect } from 'react'
import { X, RefreshCw, AlertCircle } from 'lucide-react'

interface ErrorDisplayProps {
  error: Error | string | null
  onDismiss?: () => void
  onRetry?: () => void
  className?: string
  'data-testid'?: string
}

/**
 * Shared ErrorDisplay component for translator
 * Simplified version that doesn't depend on external error parsing
 */
export function ErrorDisplay({ 
  error, 
  onDismiss, 
  onRetry, 
  className = '',
  'data-testid': testId = 'error-display'
}: ErrorDisplayProps) {
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    if (error) {
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }, [error])
  
  if (!error || !isVisible) return null
  
  const errorMessage = typeof error === 'string' ? error : error.message
  const errorTitle = typeof error === 'string' ? 'Error' : error.name || 'Error'
  
  return (
    <div 
      className={`relative bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 ${className}`}
      data-testid={testId}
    >
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
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-red-500" />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
            {errorTitle}
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300">
            {errorMessage}
          </p>
          
          {/* Actions */}
          {onRetry && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={onRetry}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-800/50 transition-colors"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Inline error display for form fields or small spaces
 */
export function InlineError({ 
  error, 
  className = '',
  'data-testid': testId = 'inline-error'
}: { 
  error: string | null
  className?: string
  'data-testid'?: string
}) {
  if (!error) return null
  
  return (
    <p 
      className={`text-sm text-red-600 dark:text-red-400 mt-1 ${className}`}
      data-testid={testId}
    >
      {error}
    </p>
  )
}

/**
 * Toast-style error notification
 */
export function ErrorToast({ 
  error, 
  onDismiss, 
  duration = 5000,
  'data-testid': testId = 'error-toast'
}: {
  error: Error | string | null
  onDismiss?: () => void
  duration?: number
  'data-testid'?: string
}) {
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    if (error) {
      setIsVisible(true)
      
      // Auto-dismiss after duration
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => onDismiss?.(), 300) // Wait for animation
      }, duration)
      
      return () => clearTimeout(timer)
    }
  }, [error, onDismiss, duration])
  
  if (!error) return null
  
  const errorMessage = typeof error === 'string' ? error : error.message
  const errorTitle = typeof error === 'string' ? 'Error' : error.name || 'Error'
  
  return (
    <div 
      className={`
        fixed bottom-4 right-4 max-w-md transform transition-all duration-300 z-50
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
      `}
      data-testid={testId}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-red-200 dark:border-red-800 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-900 dark:text-red-100">
              {errorTitle}
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              {errorMessage}
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