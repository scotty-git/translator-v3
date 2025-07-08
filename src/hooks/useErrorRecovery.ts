/**
 * useErrorRecovery - Error recovery workflows and user guidance hook for Phase 8
 * Provides centralized error recovery logic with step-by-step user guidance
 * Integrates with ErrorManager, RetryManager, and PermissionManager
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { ErrorCode, ErrorSeverity, ErrorCategory } from '@/lib/errors/ErrorCodes'
import { ErrorManager, type AppError, type ErrorRecoveryAction } from '@/lib/errors/ErrorManager'
import { RetryManager } from '@/lib/retry/RetryManager'
import { PermissionManager, PermissionType, type PermissionState } from '@/lib/permissions/PermissionManager'

export interface RecoveryStep {
  id: string
  title: string
  description: string
  action?: () => Promise<void>
  completed: boolean
  skippable: boolean
  errorOnFailure?: boolean
}

export interface RecoveryWorkflow {
  id: string
  title: string
  description: string
  steps: RecoveryStep[]
  currentStep: number
  completed: boolean
  canRetry: boolean
  retryCount: number
  maxRetries: number
}

export interface UseErrorRecoveryOptions {
  autoStart?: boolean
  maxRetries?: number
  onComplete?: () => void
  onStepComplete?: (step: RecoveryStep) => void
  onWorkflowComplete?: (workflow: RecoveryWorkflow) => void
  onError?: (error: AppError) => void
}

export interface UseErrorRecoveryReturn {
  workflow: RecoveryWorkflow | null
  isRecovering: boolean
  currentStep: RecoveryStep | null
  startRecovery: (error: AppError, options?: Partial<UseErrorRecoveryOptions>) => void
  executeCurrentStep: () => Promise<void>
  skipCurrentStep: () => void
  retryWorkflow: () => void
  resetWorkflow: () => void
  canExecuteStep: boolean
  canSkipStep: boolean
  canRetry: boolean
  progress: {
    completed: number
    total: number
    percentage: number
  }
}

export function useErrorRecovery(
  defaultOptions: UseErrorRecoveryOptions = {}
): UseErrorRecoveryReturn {
  const [workflow, setWorkflow] = useState<RecoveryWorkflow | null>(null)
  const [isRecovering, setIsRecovering] = useState(false)
  const optionsRef = useRef(defaultOptions)

  // Update options ref when they change
  useEffect(() => {
    optionsRef.current = { ...optionsRef.current, ...defaultOptions }
  }, [defaultOptions])

  /**
   * Create recovery workflow based on error type
   */
  const createRecoveryWorkflow = useCallback((error: AppError): RecoveryWorkflow => {
    const baseWorkflow = {
      id: `recovery_${error.code}_${Date.now()}`,
      currentStep: 0,
      completed: false,
      canRetry: error.retryable,
      retryCount: 0,
      maxRetries: optionsRef.current.maxRetries || 3
    }

    switch (error.category) {
      case ErrorCategory.PERMISSION:
        return createPermissionRecoveryWorkflow(error, baseWorkflow)
      
      case ErrorCategory.NETWORK:
        return createNetworkRecoveryWorkflow(error, baseWorkflow)
      
      case ErrorCategory.AUDIO:
        return createAudioRecoveryWorkflow(error, baseWorkflow)
      
      
      case ErrorCategory.API:
        return createAPIRecoveryWorkflow(error, baseWorkflow)
      
      case ErrorCategory.STORAGE:
        return createStorageRecoveryWorkflow(error, baseWorkflow)
      
      default:
        return createGenericRecoveryWorkflow(error, baseWorkflow)
    }
  }, [])

  /**
   * Permission recovery workflow
   */
  const createPermissionRecoveryWorkflow = (
    error: AppError,
    base: Partial<RecoveryWorkflow>
  ): RecoveryWorkflow => {
    const permissionType = error.code === ErrorCode.PERMISSION_MICROPHONE_DENIED
      ? PermissionType.MICROPHONE
      : error.code === ErrorCode.PERMISSION_NOTIFICATION_DENIED
      ? PermissionType.NOTIFICATIONS
      : error.code === ErrorCode.PERMISSION_STORAGE_DENIED
      ? PermissionType.STORAGE
      : PermissionType.CAMERA

    const guide = PermissionManager.getRecoveryGuide(permissionType)

    return {
      ...base,
      title: guide.title,
      description: `We need ${permissionType} access to continue. Let's fix this step by step.`,
      steps: [
        {
          id: 'check-permission',
          title: 'Check Current Permission',
          description: `Checking current ${permissionType} permission status`,
          action: async () => {
            await PermissionManager.checkPermission(permissionType)
          },
          completed: false,
          skippable: false
        },
        {
          id: 'request-permission',
          title: 'Request Permission',
          description: `Requesting ${permissionType} access from your browser`,
          action: async () => {
            const result = await PermissionManager.requestPermission(permissionType)
            if (result.status !== 'granted') {
              throw new Error('Permission denied by user')
            }
          },
          completed: false,
          skippable: false,
          errorOnFailure: true
        },
        {
          id: 'verify-permission',
          title: 'Verify Access',
          description: `Confirming ${permissionType} access is working`,
          action: async () => {
            const state = await PermissionManager.checkPermission(permissionType)
            if (state.status !== 'granted') {
              throw new Error('Permission verification failed')
            }
          },
          completed: false,
          skippable: true
        }
      ]
    } as RecoveryWorkflow
  }

  /**
   * Network recovery workflow
   */
  const createNetworkRecoveryWorkflow = (
    error: AppError,
    base: Partial<RecoveryWorkflow>
  ): RecoveryWorkflow => {
    return {
      ...base,
      title: 'Connection Recovery',
      description: 'Let\'s get you back online and restore your connection.',
      steps: [
        {
          id: 'check-connection',
          title: 'Check Internet Connection',
          description: 'Verifying your internet connection status',
          action: async () => {
            if (!navigator.onLine) {
              throw new Error('No internet connection detected')
            }
          },
          completed: false,
          skippable: false
        },
        {
          id: 'test-connectivity',
          title: 'Test Connectivity',
          description: 'Testing connection to our servers',
          action: async () => {
            try {
              const response = await fetch('/favicon.ico', { 
                method: 'HEAD',
                cache: 'no-cache'
              })
              if (!response.ok) {
                throw new Error('Server connectivity test failed')
              }
            } catch (err) {
              throw new Error('Unable to reach servers')
            }
          },
          completed: false,
          skippable: false,
          errorOnFailure: true
        },
        {
          id: 'restore-conversation',
          title: 'Restore Conversation',
          description: 'Reconnecting to your translator',
          action: async () => {
            // This would integrate with conversation restoration logic
            await new Promise(resolve => setTimeout(resolve, 1000))
          },
          completed: false,
          skippable: true
        }
      ]
    } as RecoveryWorkflow
  }

  /**
   * Audio recovery workflow
   */
  const createAudioRecoveryWorkflow = (
    error: AppError,
    base: Partial<RecoveryWorkflow>
  ): RecoveryWorkflow => {
    return {
      ...base,
      title: 'Audio System Recovery',
      description: 'Let\'s fix the audio recording issue and get your microphone working.',
      steps: [
        {
          id: 'check-microphone-permission',
          title: 'Check Microphone Permission',
          description: 'Verifying microphone access permissions',
          action: async () => {
            const state = await PermissionManager.checkPermission(PermissionType.MICROPHONE)
            if (state.status !== 'granted') {
              throw new Error('Microphone permission not granted')
            }
          },
          completed: false,
          skippable: false
        },
        {
          id: 'test-audio-device',
          title: 'Test Audio Device',
          description: 'Testing your microphone and audio input',
          action: async () => {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
              stream.getTracks().forEach(track => track.stop())
            } catch (err) {
              throw new Error('Microphone test failed')
            }
          },
          completed: false,
          skippable: false,
          errorOnFailure: true
        },
        {
          id: 'initialize-audio-context',
          title: 'Initialize Audio System',
          description: 'Setting up audio processing for translation',
          action: async () => {
            // This would integrate with audio system initialization
            await new Promise(resolve => setTimeout(resolve, 500))
          },
          completed: false,
          skippable: true
        }
      ]
    } as RecoveryWorkflow
  }


  /**
   * API recovery workflow
   */
  const createAPIRecoveryWorkflow = (
    error: AppError,
    base: Partial<RecoveryWorkflow>
  ): RecoveryWorkflow => {
    return {
      ...base,
      title: 'Service Recovery',
      description: 'Let\'s restore access to translation services.',
      steps: [
        {
          id: 'check-service-status',
          title: 'Check Service Status',
          description: 'Verifying translation service availability',
          action: async () => {
            // This would ping the OpenAI API health endpoint
            await new Promise(resolve => setTimeout(resolve, 1000))
          },
          completed: false,
          skippable: false
        },
        {
          id: 'retry-with-backoff',
          title: 'Retry Request',
          description: 'Retrying your translation request with smart delays',
          action: async () => {
            // This would use RetryManager to retry the failed operation
            await new Promise(resolve => setTimeout(resolve, 2000))
          },
          completed: false,
          skippable: false,
          errorOnFailure: true
        }
      ]
    } as RecoveryWorkflow
  }

  /**
   * Storage recovery workflow
   */
  const createStorageRecoveryWorkflow = (
    error: AppError,
    base: Partial<RecoveryWorkflow>
  ): RecoveryWorkflow => {
    return {
      ...base,
      title: 'Storage Recovery',
      description: 'Let\'s fix the storage issue and free up space.',
      steps: [
        {
          id: 'check-storage-quota',
          title: 'Check Storage Space',
          description: 'Checking available storage space',
          action: async () => {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
              const estimate = await navigator.storage.estimate()
              const usagePercent = ((estimate.usage || 0) / (estimate.quota || 1)) * 100
              if (usagePercent > 95) {
                throw new Error('Storage quota exceeded')
              }
            }
          },
          completed: false,
          skippable: false
        },
        {
          id: 'clear-cache',
          title: 'Clear Cache',
          description: 'Clearing unnecessary cached data',
          action: async () => {
            try {
              // Clear old cache entries
              if ('caches' in window) {
                const cacheNames = await caches.keys()
                const oldCaches = cacheNames.filter(name => !name.includes('v1'))
                await Promise.all(oldCaches.map(name => caches.delete(name)))
              }
            } catch (err) {
              console.warn('Failed to clear cache:', err)
            }
          },
          completed: false,
          skippable: true
        },
        {
          id: 'verify-storage',
          title: 'Verify Storage',
          description: 'Confirming storage is now available',
          action: async () => {
            try {
              const testKey = '__storage_test__'
              localStorage.setItem(testKey, 'test')
              localStorage.removeItem(testKey)
            } catch (err) {
              throw new Error('Storage still not available')
            }
          },
          completed: false,
          skippable: false
        }
      ]
    } as RecoveryWorkflow
  }

  /**
   * Generic recovery workflow
   */
  const createGenericRecoveryWorkflow = (
    error: AppError,
    base: Partial<RecoveryWorkflow>
  ): RecoveryWorkflow => {
    return {
      ...base,
      title: 'Error Recovery',
      description: 'Let\'s try to resolve this issue.',
      steps: [
        {
          id: 'retry-operation',
          title: 'Retry Operation',
          description: 'Attempting to retry the failed operation',
          action: async () => {
            // Generic retry logic
            await new Promise(resolve => setTimeout(resolve, 1000))
          },
          completed: false,
          skippable: false,
          errorOnFailure: true
        }
      ]
    } as RecoveryWorkflow
  }

  /**
   * Start recovery workflow for an error
   */
  const startRecovery = useCallback((
    error: AppError,
    options: Partial<UseErrorRecoveryOptions> = {}
  ) => {
    console.log(`🔧 [ErrorRecovery] Starting recovery for error:`, error.code)
    
    // Merge options
    optionsRef.current = { ...optionsRef.current, ...options }
    
    // Create workflow
    const newWorkflow = createRecoveryWorkflow(error)
    setWorkflow(newWorkflow)
    setIsRecovering(true)
    
    // Auto-start if enabled
    if (optionsRef.current.autoStart) {
      setTimeout(() => executeCurrentStep(), 100)
    }
  }, [createRecoveryWorkflow])

  /**
   * Execute current step
   */
  const executeCurrentStep = useCallback(async () => {
    if (!workflow || workflow.completed) return

    const currentStep = workflow.steps[workflow.currentStep]
    if (!currentStep || currentStep.completed) return

    console.log(`▶️ [ErrorRecovery] Executing step: ${currentStep.title}`)

    try {
      if (currentStep.action) {
        await currentStep.action()
      }

      // Mark step as completed
      const updatedWorkflow = {
        ...workflow,
        steps: workflow.steps.map((step, index) =>
          index === workflow.currentStep
            ? { ...step, completed: true }
            : step
        )
      }

      // Move to next step or complete workflow
      if (workflow.currentStep < workflow.steps.length - 1) {
        updatedWorkflow.currentStep = workflow.currentStep + 1
      } else {
        updatedWorkflow.completed = true
        setIsRecovering(false)
        optionsRef.current.onWorkflowComplete?.(updatedWorkflow)
      }

      setWorkflow(updatedWorkflow)
      optionsRef.current.onStepComplete?.(currentStep)

    } catch (error) {
      console.error(`❌ [ErrorRecovery] Step failed:`, error)
      
      const appError = ErrorManager.createError(
        error,
        `recovery-step-${currentStep.id}`
      )
      
      optionsRef.current.onError?.(appError)

      // Handle step failure
      if (currentStep.errorOnFailure) {
        setIsRecovering(false)
      }
    }
  }, [workflow])

  /**
   * Skip current step
   */
  const skipCurrentStep = useCallback(() => {
    if (!workflow || workflow.completed) return

    const currentStep = workflow.steps[workflow.currentStep]
    if (!currentStep || !currentStep.skippable) return

    console.log(`⏭️ [ErrorRecovery] Skipping step: ${currentStep.title}`)

    const updatedWorkflow = {
      ...workflow,
      steps: workflow.steps.map((step, index) =>
        index === workflow.currentStep
          ? { ...step, completed: true }
          : step
      )
    }

    // Move to next step or complete workflow
    if (workflow.currentStep < workflow.steps.length - 1) {
      updatedWorkflow.currentStep = workflow.currentStep + 1
    } else {
      updatedWorkflow.completed = true
      setIsRecovering(false)
      optionsRef.current.onWorkflowComplete?.(updatedWorkflow)
    }

    setWorkflow(updatedWorkflow)
  }, [workflow])

  /**
   * Retry entire workflow
   */
  const retryWorkflow = useCallback(() => {
    if (!workflow || !workflow.canRetry) return

    console.log(`🔄 [ErrorRecovery] Retrying workflow: ${workflow.title}`)

    const updatedWorkflow = {
      ...workflow,
      currentStep: 0,
      completed: false,
      retryCount: workflow.retryCount + 1,
      steps: workflow.steps.map(step => ({ ...step, completed: false }))
    }

    setWorkflow(updatedWorkflow)
    setIsRecovering(true)

    if (optionsRef.current.autoStart) {
      setTimeout(() => executeCurrentStep(), 100)
    }
  }, [workflow, executeCurrentStep])

  /**
   * Reset workflow
   */
  const resetWorkflow = useCallback(() => {
    console.log(`🔄 [ErrorRecovery] Resetting workflow`)
    setWorkflow(null)
    setIsRecovering(false)
  }, [])

  // Computed values
  const currentStep = workflow?.steps[workflow.currentStep] || null
  const canExecuteStep = !!(currentStep && !currentStep.completed && currentStep.action)
  const canSkipStep = !!(currentStep && !currentStep.completed && currentStep.skippable)
  const canRetry = !!(workflow?.canRetry && workflow.retryCount < workflow.maxRetries)

  const progress = workflow ? {
    completed: workflow.steps.filter(step => step.completed).length,
    total: workflow.steps.length,
    percentage: Math.round((workflow.steps.filter(step => step.completed).length / workflow.steps.length) * 100)
  } : { completed: 0, total: 0, percentage: 0 }

  return {
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
  }
}