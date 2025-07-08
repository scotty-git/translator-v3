import React, { Component, ReactNode, useEffect, useState, useMemo } from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { Button } from './Button'
import { ErrorCode } from '@/lib/errors/ErrorCodes'
import { ErrorManager, type AppError } from '@/lib/errors/ErrorManager'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: AppError, errorInfo: React.ErrorInfo) => void
  resetOnPropsChange?: boolean
  resetKeys?: Array<string | number>
  isolate?: boolean
  level?: 'page' | 'component' | 'feature'
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: AppError
  errorInfo?: React.ErrorInfo
  errorId: string
  retryCount: number
  lastResetTime: number
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null
  private readonly maxRetries = 3
  private readonly retryDelay = 1000

  constructor(props: ErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      errorId: '',
      retryCount: 0,
      lastResetTime: Date.now()
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // This runs during the render phase, so side effects are not allowed
    return {
      hasError: true,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Create comprehensive error report
    const appError = ErrorManager.createError(
      error,
      `component-crash-${this.props.level || 'unknown'}`,
      ErrorCode.COMPONENT_CRASH
    )

    // Update state with full error info
    this.setState({
      error: appError,
      errorInfo
    })

    // Call custom error handler if provided
    if (this.props.onError) {
      try {
        this.props.onError(appError, errorInfo)
      } catch (handlerError) {
        console.error('Error boundary onError handler failed:', handlerError)
      }
    }

    // Log comprehensive error report
    this.logErrorReport(appError, errorInfo, error)

    // Auto-retry for certain error types (with limits)
    if (this.shouldAutoRetry(appError) && this.state.retryCount < this.maxRetries) {
      this.scheduleAutoRetry()
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props
    const { hasError, errorId } = this.state

    // Reset error state when resetKeys change
    if (hasError && resetOnPropsChange && resetKeys) {
      const prevResetKeys = prevProps.resetKeys || []
      const hasResetKeyChanged = resetKeys.some((key, index) => key !== prevResetKeys[index])
      
      if (hasResetKeyChanged) {
        console.log(`🔄 [ErrorBoundary] Resetting due to resetKeys change:`, { errorId })
        this.resetErrorBoundary()
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }

  /**
   * Check if error should trigger auto-retry
   */
  private shouldAutoRetry(error: AppError): boolean {
    // Only auto-retry certain error types
    const autoRetryErrors = [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.WORKER_FAILED,
      ErrorCode.MEMORY_PRESSURE,
      ErrorCode.UNEXPECTED_STATE
    ]
    
    return autoRetryErrors.includes(error.code)
  }

  /**
   * Schedule automatic retry with delay
   */
  private scheduleAutoRetry(): void {
    const delay = this.retryDelay * Math.pow(2, this.state.retryCount) // Exponential backoff
    
    console.log(`⏳ [ErrorBoundary] Scheduling auto-retry in ${delay}ms (attempt ${this.state.retryCount + 1}/${this.maxRetries})`)
    
    this.resetTimeoutId = window.setTimeout(() => {
      this.setState(prevState => ({
        retryCount: prevState.retryCount + 1
      }))
      this.resetErrorBoundary()
    }, delay)
  }

  /**
   * Reset error boundary state
   */
  private resetErrorBoundary = (): void => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
      this.resetTimeoutId = null
    }

    console.log(`🔄 [ErrorBoundary] Resetting error boundary:`, { 
      errorId: this.state.errorId,
      retryCount: this.state.retryCount 
    })

    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: '',
      lastResetTime: Date.now()
    })
  }

  /**
   * Hard refresh the entire page
   */
  private refreshPage = (): void => {
    console.log(`🔄 [ErrorBoundary] Performing hard page refresh`)
    window.location.reload()
  }

  /**
   * Navigate to home page
   */
  private goHome = (): void => {
    console.log(`🏠 [ErrorBoundary] Navigating to home page`)
    window.location.href = '/'
  }

  /**
   * Copy error details to clipboard
   */
  private copyErrorDetails = async (): Promise<void> => {
    const { error, errorInfo, errorId } = this.state
    
    if (!error || !errorInfo) return
    
    const errorDetails = {
      errorId,
      timestamp: new Date().toISOString(),
      error: {
        code: error.code,
        message: error.message,
        severity: error.severity,
        category: error.category
      },
      stack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href
    }
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      console.log('📋 [ErrorBoundary] Error details copied to clipboard')
      // Could show a toast notification here
    } catch (err) {
      console.error('Failed to copy error details:', err)
    }
  }

  /**
   * Log comprehensive error report
   */
  private logErrorReport(appError: AppError, errorInfo: React.ErrorInfo, originalError: Error): void {
    console.group(`💥 [ErrorBoundary] Component Crash Report`)
    console.log('Error ID:', this.state.errorId)
    console.log('Level:', this.props.level || 'unknown')
    console.log('Retry Count:', this.state.retryCount)
    console.log('App Error:', appError)
    console.log('Component Stack:', errorInfo.componentStack)
    console.log('Original Error:', originalError)
    console.log('Props:', this.props)
    console.groupEnd()
  }

  /**
   * Render error fallback UI
   */
  private renderErrorFallback(): ReactNode {
    const { error, errorInfo, errorId, retryCount } = this.state
    const { level = 'component', isolate = false } = this.props

    if (!error) {
      return (
        <div className="flex items-center justify-center p-8 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h3>
            <p className="text-red-600 mb-4">An unexpected error occurred</p>
            <Button onClick={this.resetErrorBoundary} className="bg-red-600 hover:bg-red-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      )
    }

    // Different UI based on error level and isolation
    if (isolate || level === 'component') {
      return this.renderMinimalErrorUI()
    }

    if (level === 'page') {
      return this.renderFullPageErrorUI()
    }

    return this.renderFeatureErrorUI()
  }

  /**
   * Render minimal error UI for isolated components
   */
  private renderMinimalErrorUI(): ReactNode {
    const { error } = this.state

    return (
      <div className="flex items-center justify-center p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-700 mb-3">{error?.userMessage || 'Component error'}</p>
          <Button 
            onClick={this.resetErrorBoundary} 
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  /**
   * Render feature-level error UI
   */
  private renderFeatureErrorUI(): ReactNode {
    const { error, retryCount } = this.state

    return (
      <div className="flex items-center justify-center p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Feature Unavailable</h3>
          <p className="text-red-700 mb-4">{error?.userMessage || 'This feature is temporarily unavailable'}</p>
          
          <div className="flex flex-col space-y-2">
            <Button 
              onClick={this.resetErrorBoundary} 
              className="bg-red-600 hover:bg-red-700"
              disabled={retryCount >= this.maxRetries}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {retryCount >= this.maxRetries ? 'Max Retries Reached' : 'Try Again'}
            </Button>
            
            {retryCount >= this.maxRetries && (
              <Button 
                onClick={this.refreshPage} 
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                <Home className="w-4 h-4 mr-2" />
                Refresh Page
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  /**
   * Render full page error UI
   */
  private renderFullPageErrorUI(): ReactNode {
    const { error, errorId, retryCount } = this.state
    const isDevelopment = process.env.NODE_ENV === 'development'

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Oops! Something broke</h1>
            <p className="text-gray-600 mb-6">
              {error?.userMessage || 'The application encountered an unexpected error'}
            </p>

            <div className="space-y-3">
              <Button 
                onClick={this.resetErrorBoundary} 
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={retryCount >= this.maxRetries}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {retryCount >= this.maxRetries ? 'Max Retries Reached' : 'Try Again'}
              </Button>

              <Button 
                onClick={this.refreshPage} 
                variant="outline"
                className="w-full border-gray-300"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Page
              </Button>

              <Button 
                onClick={this.goHome} 
                variant="outline"
                className="w-full border-gray-300"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>

              {isDevelopment && (
                <Button 
                  onClick={this.copyErrorDetails} 
                  variant="outline"
                  className="w-full border-gray-300 text-xs"
                >
                  <Bug className="w-4 h-4 mr-2" />
                  Copy Error Details
                </Button>
              )}
            </div>

            {isDevelopment && (
              <div className="mt-6 p-3 bg-gray-100 rounded text-left">
                <details>
                  <summary className="cursor-pointer text-sm font-medium text-gray-700">
                    Debug Information
                  </summary>
                  <div className="mt-2 text-xs text-gray-600 space-y-1">
                    <div><strong>Error ID:</strong> {errorId}</div>
                    <div><strong>Code:</strong> {error?.code}</div>
                    <div><strong>Severity:</strong> {error?.severity}</div>
                    <div><strong>Retries:</strong> {retryCount}/{this.maxRetries}</div>
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Check if custom fallback is provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      return this.renderErrorFallback()
    }

    return this.props.children
  }
}

/**
 * Higher-order component for easy error boundary wrapping
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

/**
 * Hook for imperative error boundary triggering
 */
export function useErrorBoundary() {
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return useMemo(
    () => ({
      captureError: (error: Error) => {
        setError(error)
      },
      resetError: () => {
        setError(null)
      }
    }),
    []
  )
}