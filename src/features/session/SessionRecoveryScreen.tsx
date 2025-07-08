/**
 * SessionRecoveryScreen - Session error recovery interface for Phase 8
 * Provides step-by-step session recovery with user guidance and automated workflows
 * Integrates with useErrorRecovery hook and session management systems
 */

import React, { useState, useEffect } from 'react'
import { 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  Users, 
  Wifi, 
  Home,
  ArrowRight,
  X,
  Play,
  SkipForward
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'
import { OfflineIndicator, useNetworkStatus } from '@/components/ui/OfflineIndicator'
import { useErrorRecovery, type RecoveryWorkflow, type RecoveryStep } from '@/hooks/useErrorRecovery'
import { ErrorCode } from '@/lib/errors/ErrorCodes'
import { ErrorManager, type AppError } from '@/lib/errors/ErrorManager'

export interface SessionRecoveryScreenProps {
  error: AppError
  sessionCode?: string
  onRecoveryComplete?: () => void
  onGiveUp?: () => void
  onGoHome?: () => void
  className?: string
  autoStart?: boolean
}

export function SessionRecoveryScreen({
  error,
  sessionCode,
  onRecoveryComplete,
  onGiveUp,
  onGoHome,
  className = '',
  autoStart = true
}: SessionRecoveryScreenProps) {
  const networkStatus = useNetworkStatus()
  const [showDetails, setShowDetails] = useState(false)
  const [userGaveUp, setUserGaveUp] = useState(false)

  const {
    workflow,
    isRecovering,
    currentStep,
    startRecovery,
    executeCurrentStep,
    skipCurrentStep,
    retryWorkflow,
    resetWorkflow,
    canExecuteStep,
    canSkipStep,
    canRetry,
    progress
  } = useErrorRecovery({
    autoStart,
    maxRetries: 3,
    onWorkflowComplete: (completedWorkflow) => {
      console.log('🎉 [SessionRecovery] Recovery workflow completed successfully')
      onRecoveryComplete?.()
    },
    onStepComplete: (step) => {
      console.log(`✅ [SessionRecovery] Step completed: ${step.title}`)
    },
    onError: (stepError) => {
      console.error('❌ [SessionRecovery] Recovery step failed:', stepError)
    }
  })

  // Start recovery when component mounts
  useEffect(() => {
    if (error && !workflow && !userGaveUp) {
      startRecovery(error)
    }
  }, [error, workflow, userGaveUp, startRecovery])

  // Handle giving up
  const handleGiveUp = () => {
    setUserGaveUp(true)
    resetWorkflow()
    onGiveUp?.()
  }

  // Handle going home
  const handleGoHome = () => {
    resetWorkflow()
    onGoHome?.()
  }

  // Render progress bar
  const renderProgressBar = () => {
    if (!workflow) return null

    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Recovery Progress</span>
          <span className="text-sm text-gray-500">
            {progress.completed}/{progress.total} steps
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>
    )
  }

  // Render step list
  const renderStepList = () => {
    if (!workflow) return null

    return (
      <div className="space-y-3 mb-6">
        {workflow.steps.map((step, index) => (
          <div
            key={step.id}
            className={`
              flex items-start space-x-3 p-3 rounded-lg border
              ${index === workflow.currentStep 
                ? 'bg-blue-50 border-blue-200' 
                : step.completed 
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'
              }
            `}
          >
            {/* Step icon */}
            <div className="flex-shrink-0 mt-0.5">
              {step.completed ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : index === workflow.currentStep ? (
                <Clock className="w-5 h-5 text-blue-600" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
              )}
            </div>

            {/* Step content */}
            <div className="flex-1 min-w-0">
              <h4 className={`
                text-sm font-medium
                ${index === workflow.currentStep 
                  ? 'text-blue-800' 
                  : step.completed 
                  ? 'text-green-800'
                  : 'text-gray-700'
                }
              `}>
                {step.title}
              </h4>
              <p className={`
                text-xs mt-1
                ${index === workflow.currentStep 
                  ? 'text-blue-600' 
                  : step.completed 
                  ? 'text-green-600'
                  : 'text-gray-500'
                }
              `}>
                {step.description}
              </p>
            </div>

            {/* Step indicator */}
            {index === workflow.currentStep && isRecovering && (
              <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
            )}
          </div>
        ))}
      </div>
    )
  }

  // Render action buttons
  const renderActionButtons = () => {
    if (!workflow) return null

    if (workflow.completed) {
      return (
        <div className="flex gap-3">
          <Button
            onClick={onRecoveryComplete}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Continue
          </Button>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {/* Primary actions */}
        <div className="flex gap-3">
          {canExecuteStep && (
            <Button
              onClick={executeCurrentStep}
              disabled={isRecovering}
              className="flex-1"
            >
              {isRecovering ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {isRecovering ? 'Working...' : 'Continue'}
            </Button>
          )}

          {canSkipStep && (
            <Button
              onClick={skipCurrentStep}
              variant="outline"
              disabled={isRecovering}
            >
              <SkipForward className="w-4 h-4 mr-2" />
              Skip
            </Button>
          )}
        </div>

        {/* Secondary actions */}
        <div className="flex gap-3">
          {canRetry && (
            <Button
              onClick={retryWorkflow}
              variant="outline"
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry All Steps
            </Button>
          )}

          <Button
            onClick={handleGiveUp}
            variant="outline"
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            Give Up
          </Button>
        </div>
      </div>
    )
  }

  // Render error details
  const renderErrorDetails = () => {
    if (!showDetails) return null

    return (
      <Card className="mt-4 p-4 bg-gray-50">
        <h4 className="text-sm font-medium text-gray-800 mb-2">Technical Details</h4>
        <div className="space-y-1 text-xs text-gray-600">
          <div><strong>Error Code:</strong> {error.code}</div>
          <div><strong>Category:</strong> {error.category}</div>
          <div><strong>Severity:</strong> {error.severity}</div>
          {error.context && <div><strong>Context:</strong> {error.context}</div>}
          {sessionCode && <div><strong>Session:</strong> {sessionCode}</div>}
          <div><strong>Time:</strong> {new Date(error.timestamp).toLocaleString()}</div>
        </div>
      </Card>
    )
  }

  // If user gave up, show give up screen
  if (userGaveUp) {
    return (
      <div className={`min-h-screen bg-gray-50 flex items-center justify-center p-4 ${className}`}>
        <Card className="max-w-md w-full p-6 text-center">
          <div className="text-gray-500 mb-4">
            <X className="w-12 h-12 mx-auto" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Recovery Cancelled</h2>
          <p className="text-gray-600 mb-6">
            No worries! You can try again later or start a new session.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => {
                setUserGaveUp(false)
                startRecovery(error)
              }}
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Recovery Again
            </Button>
            <Button
              onClick={handleGoHome}
              variant="outline"
              className="w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Loading state
  if (!workflow) {
    return (
      <div className={`min-h-screen bg-gray-50 flex items-center justify-center p-4 ${className}`}>
        <Card className="max-w-md w-full p-6">
          <LoadingSkeleton variant="session" />
        </Card>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gray-50 flex items-center justify-center p-4 ${className}`}>
      <Card className="max-w-lg w-full p-6">
        {/* Network status indicator */}
        {!networkStatus.isOnline && (
          <div className="mb-4">
            <OfflineIndicator variant="banner" showRecovery={false} />
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-red-500 mb-4">
            <AlertTriangle className="w-12 h-12 mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{workflow.title}</h1>
          <p className="text-gray-600">{workflow.description}</p>
          {sessionCode && (
            <div className="mt-2 text-sm text-gray-500">
              Session: <span className="font-mono font-medium">{sessionCode}</span>
            </div>
          )}
        </div>

        {/* Progress */}
        {renderProgressBar()}

        {/* Steps */}
        {renderStepList()}

        {/* Actions */}
        {renderActionButtons()}

        {/* Error details toggle */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
          >
            {showDetails ? 'Hide' : 'Show'} technical details
            <ArrowRight className={`w-3 h-3 ml-1 transition-transform ${showDetails ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {/* Error details */}
        {renderErrorDetails()}

        {/* Additional help */}
        <div className="mt-4 pt-4 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500 mb-2">
            Still having trouble? Try these options:
          </p>
          <div className="flex gap-2 justify-center">
            <Button
              onClick={handleGoHome}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <Home className="w-3 h-3 mr-1" />
              Start Over
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Refresh Page
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

/**
 * Quick session recovery variants for common error types
 */
export function NetworkSessionRecovery(props: Omit<SessionRecoveryScreenProps, 'error'>) {
  const error = ErrorManager.createError(
    new Error('Network connection lost'),
    'session-network-recovery',
    ErrorCode.NETWORK_ERROR
  )

  return <SessionRecoveryScreen {...props} error={error} />
}

export function ExpiredSessionRecovery(props: Omit<SessionRecoveryScreenProps, 'error'>) {
  const error = ErrorManager.createError(
    new Error('Session expired'),
    'session-expired-recovery',
    ErrorCode.SESSION_EXPIRED
  )

  return <SessionRecoveryScreen {...props} error={error} />
}

export function PermissionSessionRecovery(props: Omit<SessionRecoveryScreenProps, 'error'>) {
  const error = ErrorManager.createError(
    new Error('Microphone permission denied'),
    'session-permission-recovery',
    ErrorCode.PERMISSION_MICROPHONE_DENIED
  )

  return <SessionRecoveryScreen {...props} error={error} />
}

/**
 * Hook for session recovery state management
 */
export function useSessionRecovery() {
  const [isRecovering, setIsRecovering] = useState(false)
  const [recoveryError, setRecoveryError] = useState<AppError | null>(null)

  const startSessionRecovery = (error: AppError) => {
    setRecoveryError(error)
    setIsRecovering(true)
  }

  const completeSessionRecovery = () => {
    setIsRecovering(false)
    setRecoveryError(null)
  }

  const cancelSessionRecovery = () => {
    setIsRecovering(false)
    setRecoveryError(null)
  }

  return {
    isRecovering,
    recoveryError,
    startSessionRecovery,
    completeSessionRecovery,
    cancelSessionRecovery
  }
}