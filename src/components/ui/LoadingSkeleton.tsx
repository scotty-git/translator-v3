/**
 * LoadingSkeleton - Loading states and error state skeletons for Phase 8
 * Provides consistent loading experiences with error state fallbacks
 * Supports different content types and responsive layouts
 */

import React from 'react'
import { AlertTriangle, RefreshCw, Wifi, Mic, MessageSquare, Users } from 'lucide-react'
import { Button } from './Button'
import { Card } from './Card'

export interface LoadingSkeletonProps {
  variant?: 'card' | 'list' | 'message' | 'session' | 'audio' | 'custom'
  count?: number
  height?: string | number
  className?: string
  animated?: boolean
  showIcon?: boolean
  rounded?: boolean
}

export interface ErrorSkeletonProps {
  variant?: 'card' | 'list' | 'message' | 'session' | 'audio' | 'custom'
  title?: string
  message?: string
  icon?: React.ReactNode
  showRetry?: boolean
  onRetry?: () => void
  className?: string
}

/**
 * Base skeleton component with shimmer animation
 */
function SkeletonBase({ 
  className = '', 
  animated = true, 
  style 
}: { 
  className?: string
  animated?: boolean
  style?: React.CSSProperties 
}) {
  return (
    <div 
      className={`
        bg-gray-200 
        ${animated ? 'animate-pulse' : ''}
        ${className}
      `}
      style={style}
    />
  )
}

/**
 * Main LoadingSkeleton component
 */
export function LoadingSkeleton({
  variant = 'card',
  count = 1,
  height = 'auto',
  className = '',
  animated = true,
  showIcon = false,
  rounded = true
}: LoadingSkeletonProps) {
  const baseClasses = `${rounded ? 'rounded' : ''} ${animated ? 'animate-pulse' : ''}`
  
  const renderSkeleton = () => {
    switch (variant) {
      case 'message':
        return (
          <div className="flex space-x-3 p-3">
            {/* Avatar */}
            <SkeletonBase 
              className={`w-8 h-8 rounded-full flex-shrink-0 ${baseClasses}`} 
              animated={animated}
            />
            <div className="flex-1 space-y-2">
              {/* Message header */}
              <div className="flex items-center space-x-2">
                <SkeletonBase 
                  className={`h-3 w-16 ${baseClasses}`} 
                  animated={animated}
                />
                <SkeletonBase 
                  className={`h-3 w-12 ${baseClasses}`} 
                  animated={animated}
                />
              </div>
              {/* Message content */}
              <div className="space-y-1">
                <SkeletonBase 
                  className={`h-4 w-full ${baseClasses}`} 
                  animated={animated}
                />
                <SkeletonBase 
                  className={`h-4 w-3/4 ${baseClasses}`} 
                  animated={animated}
                />
              </div>
              {/* Translation */}
              <div className="mt-2 p-2 bg-gray-50 rounded space-y-1">
                <SkeletonBase 
                  className={`h-3 w-full ${baseClasses}`} 
                  animated={animated}
                />
                <SkeletonBase 
                  className={`h-3 w-5/6 ${baseClasses}`} 
                  animated={animated}
                />
              </div>
            </div>
          </div>
        )

      case 'session':
        return (
          <Card className="p-4">
            <div className="space-y-4">
              {/* Session header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {showIcon && (
                    <SkeletonBase 
                      className={`w-10 h-10 rounded-full ${baseClasses}`} 
                      animated={animated}
                    />
                  )}
                  <div className="space-y-1">
                    <SkeletonBase 
                      className={`h-4 w-32 ${baseClasses}`} 
                      animated={animated}
                    />
                    <SkeletonBase 
                      className={`h-3 w-24 ${baseClasses}`} 
                      animated={animated}
                    />
                  </div>
                </div>
                <SkeletonBase 
                  className={`h-8 w-16 rounded ${baseClasses}`} 
                  animated={animated}
                />
              </div>
              
              {/* Session details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <SkeletonBase 
                    className={`h-3 w-16 ${baseClasses}`} 
                    animated={animated}
                  />
                  <SkeletonBase 
                    className={`h-4 w-20 ${baseClasses}`} 
                    animated={animated}
                  />
                </div>
                <div className="space-y-1">
                  <SkeletonBase 
                    className={`h-3 w-12 ${baseClasses}`} 
                    animated={animated}
                  />
                  <SkeletonBase 
                    className={`h-4 w-16 ${baseClasses}`} 
                    animated={animated}
                  />
                </div>
              </div>
            </div>
          </Card>
        )

      case 'audio':
        return (
          <div className="flex items-center space-x-3 p-3">
            {/* Microphone icon placeholder */}
            <SkeletonBase 
              className={`w-12 h-12 rounded-full ${baseClasses}`} 
              animated={animated}
            />
            <div className="flex-1 space-y-2">
              {/* Audio status */}
              <SkeletonBase 
                className={`h-3 w-24 ${baseClasses}`} 
                animated={animated}
              />
              {/* Waveform/progress */}
              <div className="flex space-x-1">
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonBase 
                    key={i}
                    className={`w-1 rounded-full ${baseClasses}`}
                    style={{ height: Math.random() * 20 + 10 }}
                    animated={animated}
                  />
                ))}
              </div>
              {/* Duration */}
              <SkeletonBase 
                className={`h-3 w-16 ${baseClasses}`} 
                animated={animated}
              />
            </div>
          </div>
        )

      case 'list':
        return (
          <div className="space-y-3">
            {Array.from({ length: count }).map((_, index) => (
              <div key={index} className="flex items-center space-x-3 p-3">
                {showIcon && (
                  <SkeletonBase 
                    className={`w-6 h-6 rounded ${baseClasses}`} 
                    animated={animated}
                  />
                )}
                <div className="flex-1 space-y-1">
                  <SkeletonBase 
                    className={`h-4 w-3/4 ${baseClasses}`} 
                    animated={animated}
                  />
                  <SkeletonBase 
                    className={`h-3 w-1/2 ${baseClasses}`} 
                    animated={animated}
                  />
                </div>
              </div>
            ))}
          </div>
        )

      case 'custom':
        return (
          <SkeletonBase 
            className={`${baseClasses} ${className}`}
            animated={animated}
            style={{ height: typeof height === 'number' ? `${height}px` : height }}
          />
        )

      default: // card
        return (
          <Card className="p-4">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center space-x-3">
                {showIcon && (
                  <SkeletonBase 
                    className={`w-8 h-8 rounded ${baseClasses}`} 
                    animated={animated}
                  />
                )}
                <div className="space-y-1">
                  <SkeletonBase 
                    className={`h-4 w-32 ${baseClasses}`} 
                    animated={animated}
                  />
                  <SkeletonBase 
                    className={`h-3 w-24 ${baseClasses}`} 
                    animated={animated}
                  />
                </div>
              </div>
              
              {/* Content */}
              <div className="space-y-2">
                <SkeletonBase 
                  className={`h-3 w-full ${baseClasses}`} 
                  animated={animated}
                />
                <SkeletonBase 
                  className={`h-3 w-5/6 ${baseClasses}`} 
                  animated={animated}
                />
                <SkeletonBase 
                  className={`h-3 w-3/4 ${baseClasses}`} 
                  animated={animated}
                />
              </div>
            </div>
          </Card>
        )
    }
  }

  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, index) => (
        <React.Fragment key={index}>
          {renderSkeleton()}
        </React.Fragment>
      ))}
    </div>
  )
}

/**
 * ErrorSkeleton - Shows error state with retry options
 */
export function ErrorSkeleton({
  variant = 'card',
  title = 'Unable to load content',
  message = 'Something went wrong while loading this content.',
  icon,
  showRetry = true,
  onRetry,
  className = ''
}: ErrorSkeletonProps) {
  const getDefaultIcon = () => {
    switch (variant) {
      case 'message':
        return <MessageSquare className="w-6 h-6" />
      case 'session':
        return <Users className="w-6 h-6" />
      case 'audio':
        return <Mic className="w-6 h-6" />
      default:
        return <AlertTriangle className="w-6 h-6" />
    }
  }

  const errorIcon = icon || getDefaultIcon()

  switch (variant) {
    case 'message':
      return (
        <div className={`flex space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg ${className}`}>
          <div className="text-red-500 mt-1">
            {errorIcon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-800 mb-1">{title}</p>
            <p className="text-xs text-red-600 mb-2">{message}</p>
            {showRetry && onRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="text-xs border-red-300 text-red-700 hover:bg-red-50"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Try again
              </Button>
            )}
          </div>
        </div>
      )

    case 'audio':
      return (
        <div className={`flex items-center space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg ${className}`}>
          <div className="text-red-500">
            {errorIcon}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">{title}</p>
            <p className="text-xs text-red-600">{message}</p>
          </div>
          {showRetry && onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
        </div>
      )

    case 'list':
      return (
        <div className={`text-center py-8 ${className}`}>
          <div className="text-red-500 mx-auto mb-3">
            {errorIcon}
          </div>
          <h3 className="text-sm font-medium text-red-800 mb-1">{title}</h3>
          <p className="text-xs text-red-600 mb-3">{message}</p>
          {showRetry && onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try again
            </Button>
          )}
        </div>
      )

    default: // card or session
      return (
        <Card className={`p-6 text-center bg-red-50 border-red-200 ${className}`}>
          <div className="text-red-500 mx-auto mb-4">
            {React.cloneElement(errorIcon as React.ReactElement, {
              className: 'w-8 h-8 mx-auto'
            })}
          </div>
          <h3 className="text-lg font-medium text-red-800 mb-2">{title}</h3>
          <p className="text-sm text-red-600 mb-4">{message}</p>
          {showRetry && onRetry && (
            <Button
              variant="outline"
              onClick={onRetry}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try again
            </Button>
          )}
        </Card>
      )
  }
}

/**
 * Convenience components for specific use cases
 */
export const MessageLoadingSkeleton = (props: Omit<LoadingSkeletonProps, 'variant'>) => (
  <LoadingSkeleton {...props} variant="message" />
)

export const SessionLoadingSkeleton = (props: Omit<LoadingSkeletonProps, 'variant'>) => (
  <LoadingSkeleton {...props} variant="session" />
)

export const AudioLoadingSkeleton = (props: Omit<LoadingSkeletonProps, 'variant'>) => (
  <LoadingSkeleton {...props} variant="audio" />
)

export const ListLoadingSkeleton = (props: Omit<LoadingSkeletonProps, 'variant'>) => (
  <LoadingSkeleton {...props} variant="list" />
)

export const MessageErrorSkeleton = (props: Omit<ErrorSkeletonProps, 'variant'>) => (
  <ErrorSkeleton {...props} variant="message" />
)

export const SessionErrorSkeleton = (props: Omit<ErrorSkeletonProps, 'variant'>) => (
  <ErrorSkeleton {...props} variant="session" />
)

export const AudioErrorSkeleton = (props: Omit<ErrorSkeletonProps, 'variant'>) => (
  <ErrorSkeleton {...props} variant="audio" />
)

export const ListErrorSkeleton = (props: Omit<ErrorSkeletonProps, 'variant'>) => (
  <ErrorSkeleton {...props} variant="list" />
)

/**
 * Adaptive loading component that switches between loading and error states
 */
export interface AdaptiveLoadingProps {
  loading: boolean
  error?: Error | string | null
  loadingComponent?: React.ReactNode
  errorComponent?: React.ReactNode
  children?: React.ReactNode
  variant?: LoadingSkeletonProps['variant']
  onRetry?: () => void
}

export function AdaptiveLoading({
  loading,
  error,
  loadingComponent,
  errorComponent,
  children,
  variant = 'card',
  onRetry
}: AdaptiveLoadingProps) {
  if (loading) {
    return loadingComponent || <LoadingSkeleton variant={variant} />
  }

  if (error) {
    if (errorComponent) {
      return errorComponent
    }

    const errorMessage = typeof error === 'string' ? error : error.message
    return (
      <ErrorSkeleton
        variant={variant}
        message={errorMessage}
        onRetry={onRetry}
      />
    )
  }

  return children || null
}

/**
 * Shimmer effect component for custom loading states
 */
export function Shimmer({ 
  className = '', 
  duration = '2s' 
}: { 
  className?: string
  duration?: string 
}) {
  return (
    <div 
      className={`bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[shimmer_2s_ease-in-out_infinite] ${className}`}
      style={{
        animationDuration: duration,
      }}
    />
  )
}

/**
 * Pulse loading component for simple loading states
 */
export function PulseLoader({ 
  size = 'md',
  color = 'gray',
  className = '' 
}: {
  size?: 'sm' | 'md' | 'lg'
  color?: 'gray' | 'blue' | 'red' | 'green'
  className?: string
}) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  }

  const colorClasses = {
    gray: 'bg-gray-400',
    blue: 'bg-blue-400',
    red: 'bg-red-400',
    green: 'bg-green-400'
  }

  return (
    <div className={`flex space-x-1 ${className}`}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-pulse`}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1.4s'
          }}
        />
      ))}
    </div>
  )
}