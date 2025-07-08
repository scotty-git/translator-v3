/**
 * ErrorMessage - User-friendly error display component for Phase 8
 * Provides consistent error messaging with recovery actions and contextual help
 * Integrates with ErrorManager for comprehensive error handling
 */

import React from 'react'
import { AlertTriangle, RefreshCw, Info, X, ExternalLink, HelpCircle } from 'lucide-react'
import { Button } from './Button'
import { Card } from './Card'
import { ErrorCode, ErrorSeverity, ErrorCategory } from '@/lib/errors/ErrorCodes'
import { ErrorManager, type AppError, type ErrorRecoveryAction } from '@/lib/errors/ErrorManager'
import { PermissionManager, PermissionType } from '@/lib/permissions/PermissionManager'

export interface ErrorMessageProps {
  error: AppError | Error | string
  title?: string
  variant?: 'inline' | 'card' | 'toast' | 'banner' | 'modal'
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  showDetails?: boolean
  showRecoveryActions?: boolean
  showDismiss?: boolean
  className?: string
  onDismiss?: () => void
  onRetry?: () => void | Promise<void>
  customActions?: ErrorRecoveryAction[]
  context?: string
}

export function ErrorMessage({
  error,
  title,
  variant = 'card',
  size = 'md',
  showIcon = true,
  showDetails = false,
  showRecoveryActions = true,
  showDismiss = false,
  className = '',
  onDismiss,
  onRetry,
  customActions,
  context
}: ErrorMessageProps) {
  // Convert error to AppError if needed
  const appError = React.useMemo(() => {
    if (typeof error === 'string') {
      return ErrorManager.createError(new Error(error), context)
    } else if (error instanceof Error && !('code' in error)) {
      return ErrorManager.createError(error, context)
    } else {
      return error as AppError
    }
  }, [error, context])

  // Get recovery actions
  const recoveryActions = React.useMemo(() => {
    if (customActions) return customActions
    return ErrorManager.getRecoveryActions(appError)
  }, [appError, customActions])

  // Get severity-based styling
  const getSeverityStyles = () => {
    switch (appError.severity) {
      case ErrorSeverity.LOW:
        return {
          container: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-600',
          title: 'text-yellow-800',
          message: 'text-yellow-700',
          button: 'bg-yellow-600 hover:bg-yellow-700'
        }
      case ErrorSeverity.MEDIUM:
        return {
          container: 'bg-orange-50 border-orange-200',
          icon: 'text-orange-600',
          title: 'text-orange-800',
          message: 'text-orange-700',
          button: 'bg-orange-600 hover:bg-orange-700'
        }
      case ErrorSeverity.HIGH:
        return {
          container: 'bg-red-50 border-red-200',
          icon: 'text-red-600',
          title: 'text-red-800',
          message: 'text-red-700',
          button: 'bg-red-600 hover:bg-red-700'
        }
      case ErrorSeverity.CRITICAL:
        return {
          container: 'bg-red-100 border-red-300',
          icon: 'text-red-700',
          title: 'text-red-900',
          message: 'text-red-800',
          button: 'bg-red-700 hover:bg-red-800'
        }
      default:
        return {
          container: 'bg-gray-50 border-gray-200',
          icon: 'text-gray-600',
          title: 'text-gray-800',
          message: 'text-gray-700',
          button: 'bg-gray-600 hover:bg-gray-700'
        }
    }
  }

  const styles = getSeverityStyles()

  // Get size-based styling
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'p-3',
          icon: 'w-4 h-4',
          title: 'text-sm font-medium',
          message: 'text-xs',
          button: 'text-xs px-2 py-1'
        }
      case 'lg':
        return {
          container: 'p-6',
          icon: 'w-8 h-8',
          title: 'text-lg font-semibold',
          message: 'text-base',
          button: 'text-base px-4 py-2'
        }
      default: // md
        return {
          container: 'p-4',
          icon: 'w-5 h-5',
          title: 'text-base font-medium',
          message: 'text-sm',
          button: 'text-sm px-3 py-2'
        }
    }
  }

  const sizeStyles = getSizeStyles()

  // Handle retry action
  const handleRetry = async () => {
    if (onRetry) {
      try {
        await onRetry()
      } catch (retryError) {
        console.error('Retry failed:', retryError)
      }
    }
  }

  // Handle permission recovery
  const handlePermissionRecovery = async (permissionType: PermissionType) => {
    try {
      await PermissionManager.requestPermission(permissionType)
    } catch (permissionError) {
      console.error('Permission recovery failed:', permissionError)
    }
  }

  // Get contextual help URL
  const getHelpUrl = () => {
    switch (appError.category) {
      case ErrorCategory.AUDIO:
        return 'https://support.google.com/chrome/answer/2693767'
      case ErrorCategory.NETWORK:
        return 'https://support.google.com/chrome/answer/95414'
      case ErrorCategory.PERMISSION:
        return 'https://support.google.com/chrome/answer/114662'
      default:
        return null
    }
  }

  // Render icon based on error severity
  const renderIcon = () => {
    if (!showIcon) return null

    return (
      <AlertTriangle className={`${sizeStyles.icon} ${styles.icon} flex-shrink-0`} />
    )
  }

  // Render recovery actions
  const renderRecoveryActions = () => {
    if (!showRecoveryActions || recoveryActions.length === 0) return null

    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {recoveryActions.map((action, index) => (
          <Button
            key={index}
            onClick={action.action}
            variant={action.primary ? 'default' : 'outline'}
            size="sm"
            className={action.primary ? styles.button : ''}
          >
            {action.label === 'Try Again' && <RefreshCw className="w-3 h-3 mr-1" />}
            {action.label}
          </Button>
        ))}
        
        {onRetry && (
          <Button
            onClick={handleRetry}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        )}
      </div>
    )
  }

  // Render help link
  const renderHelpLink = () => {
    const helpUrl = getHelpUrl()
    if (!helpUrl) return null

    return (
      <a
        href={helpUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 mt-2"
      >
        <HelpCircle className="w-3 h-3 mr-1" />
        Get help with this issue
        <ExternalLink className="w-3 h-3 ml-1" />
      </a>
    )
  }

  // Render error details
  const renderDetails = () => {
    if (!showDetails) return null

    return (
      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
          Technical details
        </summary>
        <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded border">
          <div><strong>Code:</strong> {appError.code}</div>
          <div><strong>Category:</strong> {appError.category}</div>
          <div><strong>Severity:</strong> {appError.severity}</div>
          {appError.context && <div><strong>Context:</strong> {appError.context}</div>}
          {appError.message && <div><strong>Message:</strong> {appError.message}</div>}
          <div><strong>Timestamp:</strong> {new Date(appError.timestamp).toLocaleString()}</div>
        </div>
      </details>
    )
  }

  // Render based on variant
  switch (variant) {
    case 'inline':
      return (
        <div className={`flex items-start space-x-3 ${className}`}>
          {renderIcon()}
          <div className="flex-1 min-w-0">
            {title && (
              <p className={`${sizeStyles.title} ${styles.title} mb-1`}>
                {title}
              </p>
            )}
            <p className={`${sizeStyles.message} ${styles.message}`}>
              {appError.userMessage}
            </p>
            {renderDetails()}
            {renderHelpLink()}
            {renderRecoveryActions()}
          </div>
          {showDismiss && onDismiss && (
            <button
              onClick={onDismiss}
              className={`${styles.icon} hover:opacity-70`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )

    case 'toast':
      return (
        <div className={`
          flex items-start space-x-3 ${sizeStyles.container} 
          ${styles.container} border rounded-lg shadow-lg
          ${className}
        `}>
          {renderIcon()}
          <div className="flex-1 min-w-0">
            <p className={`${sizeStyles.message} ${styles.message} font-medium`}>
              {appError.userMessage}
            </p>
            {showRecoveryActions && recoveryActions.length > 0 && (
              <div className="flex gap-2 mt-2">
                {recoveryActions.slice(0, 2).map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    className="text-xs underline hover:no-underline"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {showDismiss && onDismiss && (
            <button
              onClick={onDismiss}
              className={`${styles.icon} hover:opacity-70 ml-2`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )

    case 'banner':
      return (
        <div className={`
          ${styles.container} border-l-4 ${sizeStyles.container}
          ${className}
        `}>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              {renderIcon()}
              <div>
                {title && (
                  <h3 className={`${sizeStyles.title} ${styles.title} mb-1`}>
                    {title}
                  </h3>
                )}
                <p className={`${sizeStyles.message} ${styles.message}`}>
                  {appError.userMessage}
                </p>
                {renderDetails()}
                {renderHelpLink()}
              </div>
            </div>
            {showDismiss && onDismiss && (
              <button
                onClick={onDismiss}
                className={`${styles.icon} hover:opacity-70 ml-4`}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          {renderRecoveryActions()}
        </div>
      )

    case 'modal':
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className={`max-w-md w-full ${className}`}>
            <div className={sizeStyles.container}>
              <div className="flex items-start space-x-3 mb-4">
                {renderIcon()}
                <div className="flex-1">
                  {title && (
                    <h3 className={`${sizeStyles.title} ${styles.title} mb-2`}>
                      {title}
                    </h3>
                  )}
                  <p className={`${sizeStyles.message} ${styles.message}`}>
                    {appError.userMessage}
                  </p>
                </div>
                {showDismiss && onDismiss && (
                  <button
                    onClick={onDismiss}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              {renderDetails()}
              {renderHelpLink()}
              {renderRecoveryActions()}
            </div>
          </Card>
        </div>
      )

    default: // card
      return (
        <Card className={`${styles.container} border ${className}`}>
          <div className={sizeStyles.container}>
            <div className="flex items-start space-x-3">
              {renderIcon()}
              <div className="flex-1 min-w-0">
                {title && (
                  <h3 className={`${sizeStyles.title} ${styles.title} mb-2`}>
                    {title}
                  </h3>
                )}
                <p className={`${sizeStyles.message} ${styles.message}`}>
                  {appError.userMessage}
                </p>
                {renderDetails()}
                {renderHelpLink()}
                {renderRecoveryActions()}
              </div>
              {showDismiss && onDismiss && (
                <button
                  onClick={onDismiss}
                  className={`${styles.icon} hover:opacity-70`}
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </Card>
      )
  }
}

/**
 * Quick error message variants for common use cases
 */
export const ErrorToast = (props: Omit<ErrorMessageProps, 'variant'>) => (
  <ErrorMessage {...props} variant="toast" />
)

export const ErrorBanner = (props: Omit<ErrorMessageProps, 'variant'>) => (
  <ErrorMessage {...props} variant="banner" />
)

export const ErrorInline = (props: Omit<ErrorMessageProps, 'variant'>) => (
  <ErrorMessage {...props} variant="inline" />
)

export const ErrorModal = (props: Omit<ErrorMessageProps, 'variant'>) => (
  <ErrorMessage {...props} variant="modal" />
)

/**
 * Permission-specific error message
 */
export function PermissionErrorMessage({ 
  permissionType, 
  ...props 
}: { permissionType: PermissionType } & Omit<ErrorMessageProps, 'error'>) {
  const error = React.useMemo(() => {
    const code = permissionType === PermissionType.MICROPHONE 
      ? ErrorCode.PERMISSION_MICROPHONE_DENIED
      : permissionType === PermissionType.NOTIFICATIONS
      ? ErrorCode.PERMISSION_NOTIFICATION_DENIED
      : permissionType === PermissionType.STORAGE
      ? ErrorCode.PERMISSION_STORAGE_DENIED
      : ErrorCode.PERMISSION_CAMERA_DENIED

    return ErrorManager.createError(
      new Error(`${permissionType} permission denied`),
      `permission-${permissionType}`,
      code
    )
  }, [permissionType])

  const recoveryGuide = PermissionManager.getRecoveryGuide(permissionType)
  
  const customActions: ErrorRecoveryAction[] = React.useMemo(() => [
    {
      label: 'Grant Permission',
      action: recoveryGuide.recoveryAction || (() => {}),
      primary: true
    }
  ], [recoveryGuide])

  return (
    <ErrorMessage
      {...props}
      error={error}
      customActions={customActions}
      title={recoveryGuide.title}
    />
  )
}

/**
 * Network error message with connection status
 */
export function NetworkErrorMessage(props: Omit<ErrorMessageProps, 'error'>) {
  const isOnline = navigator.onLine
  
  const error = React.useMemo(() => {
    const code = isOnline ? ErrorCode.NETWORK_ERROR : ErrorCode.NETWORK_OFFLINE
    return ErrorManager.createError(
      new Error('Network connection problem'),
      'network-error',
      code
    )
  }, [isOnline])

  return (
    <ErrorMessage
      {...props}
      error={error}
      title={isOnline ? 'Connection Problem' : 'No Internet Connection'}
    />
  )
}