/**
 * ErrorManager - Central error handling and classification system for Phase 8
 * Provides comprehensive error management with user-friendly messages and recovery guidance
 */

import { ErrorCode, ErrorSeverity, ErrorCategory, ERROR_REGISTRY, type ErrorMetadata } from './ErrorCodes'
import { performanceLogger } from '@/lib/performance'

export interface AppError {
  code: ErrorCode
  message: string
  userMessage: string
  details?: any
  originalError?: unknown
  timestamp: number
  context?: string
  retryable: boolean
  severity: ErrorSeverity
  category: ErrorCategory
  metadata: ErrorMetadata
}

export interface ErrorRecoveryAction {
  label: string
  action: () => void | Promise<void>
  primary?: boolean
}

export interface ErrorHandlerOptions {
  context?: string
  showToUser?: boolean
  logToAnalytics?: boolean
  retryAction?: () => Promise<void>
}

export class ErrorManager {
  private static errorHandlers = new Map<ErrorCode, (error: AppError) => void>()
  private static errorHistory: AppError[] = []
  private static maxHistorySize = 100

  /**
   * Create comprehensive AppError from unknown error
   */
  static createError(
    error: unknown, 
    context?: string,
    overrideCode?: ErrorCode
  ): AppError {
    performanceLogger.start('error-classification')

    let appError: AppError

    try {
      // Use override code if provided
      if (overrideCode) {
        const metadata = ERROR_REGISTRY[overrideCode]
        appError = {
          code: overrideCode,
          message: this.extractErrorMessage(error),
          userMessage: this.generateUserMessage(overrideCode, error),
          details: this.extractErrorDetails(error),
          originalError: error,
          timestamp: Date.now(),
          context,
          retryable: metadata.retryable,
          severity: metadata.severity,
          category: metadata.category,
          metadata
        }
      } else {
        // Auto-classify error
        appError = this.classifyError(error, context)
      }

      // Add to error history
      this.addToHistory(appError)

      performanceLogger.end('error-classification')
      
      // Log error classification for debugging
      console.log(`🚨 [ErrorManager] Classified error:`, {
        code: appError.code,
        severity: appError.severity,
        category: appError.category,
        retryable: appError.retryable,
        context: appError.context
      })

      return appError

    } catch (classificationError) {
      performanceLogger.end('error-classification')
      
      // Fallback error if classification fails
      const fallbackMetadata = ERROR_REGISTRY[ErrorCode.UNKNOWN_ERROR]
      return {
        code: ErrorCode.UNKNOWN_ERROR,
        message: 'Error classification failed',
        userMessage: 'Something unexpected happened. Please try again.',
        details: { originalError: error, classificationError },
        originalError: error,
        timestamp: Date.now(),
        context,
        retryable: true,
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.SYSTEM,
        metadata: fallbackMetadata
      }
    }
  }

  /**
   * Classify error based on error type and content
   */
  private static classifyError(error: unknown, context?: string): AppError {
    let code = ErrorCode.UNKNOWN_ERROR

    // OpenAI API errors
    if (this.isOpenAIError(error)) {
      code = this.classifyOpenAIError(error)
    }
    // Supabase errors
    else if (this.isSupabaseError(error)) {
      code = this.classifySupabaseError(error)
    }
    // Network errors
    else if (this.isNetworkError(error)) {
      code = this.classifyNetworkError(error)
    }
    // Audio/MediaRecorder errors
    else if (this.isAudioError(error)) {
      code = this.classifyAudioError(error)
    }
    // Permission errors
    else if (this.isPermissionError(error)) {
      code = this.classifyPermissionError(error)
    }
    // Storage errors
    else if (this.isStorageError(error)) {
      code = this.classifyStorageError(error)
    }
    // Worker errors
    else if (this.isWorkerError(error)) {
      code = this.classifyWorkerError(error)
    }
    // Browser/Device errors
    else if (this.isBrowserError(error)) {
      code = this.classifyBrowserError(error)
    }

    const metadata = ERROR_REGISTRY[code]
    
    return {
      code,
      message: this.extractErrorMessage(error),
      userMessage: this.generateUserMessage(code, error),
      details: this.extractErrorDetails(error),
      originalError: error,
      timestamp: Date.now(),
      context,
      retryable: metadata.retryable,
      severity: metadata.severity,
      category: metadata.category,
      metadata
    }
  }

  /**
   * OpenAI error detection and classification
   */
  private static isOpenAIError(error: unknown): boolean {
    if (typeof error === 'object' && error !== null) {
      const err = error as any
      return err.name === 'OpenAIError' || 
             err.status !== undefined ||
             (err.message && typeof err.message === 'string' && 
              (err.message.includes('openai') || err.message.includes('rate limit') || err.message.includes('quota')))
    }
    return false
  }

  private static classifyOpenAIError(error: unknown): ErrorCode {
    const err = error as any
    
    if (err.status === 429) return ErrorCode.API_RATE_LIMIT
    if (err.status === 401) return ErrorCode.API_INVALID_KEY
    if (err.status >= 500) return ErrorCode.API_SERVICE_DOWN
    if (err.status === 400) return ErrorCode.API_INVALID_REQUEST
    
    const message = err.message?.toLowerCase() || ''
    if (message.includes('quota')) return ErrorCode.API_QUOTA_EXCEEDED
    if (message.includes('timeout')) return ErrorCode.API_TIMEOUT
    if (message.includes('rate limit')) return ErrorCode.API_RATE_LIMIT
    
    return ErrorCode.UNKNOWN_ERROR
  }

  /**
   * Supabase error detection and classification
   */
  private static isSupabaseError(error: unknown): boolean {
    if (typeof error === 'object' && error !== null) {
      const err = error as any
      return err.name === 'SupabaseError' ||
             (err.message && typeof err.message === 'string' && 
              (err.message.includes('supabase') || err.message.includes('PostgrestError')))
    }
    return false
  }

  private static classifySupabaseError(error: unknown): ErrorCode {
    const err = error as any
    const message = err.message?.toLowerCase() || ''
    
    if (message.includes('auth')) return ErrorCode.SUPABASE_AUTH_ERROR
    if (message.includes('permission') || message.includes('rls')) return ErrorCode.SUPABASE_PERMISSION_ERROR
    if (message.includes('quota') || message.includes('limit')) return ErrorCode.SUPABASE_QUOTA_ERROR
    if (message.includes('connection') || message.includes('network')) return ErrorCode.SUPABASE_CONNECTION_ERROR
    
    return ErrorCode.UNKNOWN_ERROR
  }

  /**
   * Network error detection and classification
   */
  private static isNetworkError(error: unknown): boolean {
    if (typeof error === 'object' && error !== null) {
      const err = error as any
      return err.name === 'NetworkError' ||
             err.name === 'TypeError' && err.message?.includes('fetch') ||
             !navigator.onLine
    }
    return false
  }

  private static classifyNetworkError(error: unknown): ErrorCode {
    if (!navigator.onLine) return ErrorCode.NETWORK_OFFLINE
    
    const err = error as any
    const message = err.message?.toLowerCase() || ''
    
    if (message.includes('timeout')) return ErrorCode.NETWORK_TIMEOUT
    if (message.includes('fetch')) return ErrorCode.NETWORK_ERROR
    
    return ErrorCode.NETWORK_ERROR
  }

  /**
   * Audio error detection and classification
   */
  private static isAudioError(error: unknown): boolean {
    if (typeof error === 'object' && error !== null) {
      const err = error as any
      return err.name === 'NotAllowedError' ||
             err.name === 'NotSupportedError' ||
             err.name === 'MediaRecorderError' ||
             (err.message && typeof err.message === 'string' && 
              (err.message.includes('audio') || err.message.includes('microphone') || err.message.includes('media')))
    }
    return false
  }

  private static classifyAudioError(error: unknown): ErrorCode {
    const err = error as any
    
    if (err.name === 'NotAllowedError') return ErrorCode.AUDIO_PERMISSION_DENIED
    if (err.name === 'NotSupportedError') return ErrorCode.AUDIO_NOT_SUPPORTED
    
    const message = err.message?.toLowerCase() || ''
    if (message.includes('permission')) return ErrorCode.AUDIO_PERMISSION_DENIED
    if (message.includes('device')) return ErrorCode.AUDIO_DEVICE_ERROR
    if (message.includes('recording')) return ErrorCode.AUDIO_RECORDING_FAILED
    if (message.includes('format')) return ErrorCode.AUDIO_FORMAT_ERROR
    
    return ErrorCode.AUDIO_RECORDING_FAILED
  }

  /**
   * Permission error detection and classification
   */
  private static isPermissionError(error: unknown): boolean {
    if (typeof error === 'object' && error !== null) {
      const err = error as any
      return err.name === 'NotAllowedError' ||
             (err.message && typeof err.message === 'string' && 
              err.message.includes('permission'))
    }
    return false
  }

  private static classifyPermissionError(error: unknown): ErrorCode {
    const err = error as any
    const message = err.message?.toLowerCase() || ''
    
    if (message.includes('microphone') || message.includes('audio')) return ErrorCode.PERMISSION_MICROPHONE_DENIED
    if (message.includes('notification')) return ErrorCode.PERMISSION_NOTIFICATION_DENIED
    if (message.includes('storage')) return ErrorCode.PERMISSION_STORAGE_DENIED
    if (message.includes('camera')) return ErrorCode.PERMISSION_CAMERA_DENIED
    
    return ErrorCode.PERMISSION_MICROPHONE_DENIED
  }

  /**
   * Storage error detection and classification
   */
  private static isStorageError(error: unknown): boolean {
    if (typeof error === 'object' && error !== null) {
      const err = error as any
      return err.name === 'QuotaExceededError' ||
             (err.message && typeof err.message === 'string' && 
              (err.message.includes('storage') || err.message.includes('quota')))
    }
    return false
  }

  private static classifyStorageError(error: unknown): ErrorCode {
    const err = error as any
    
    if (err.name === 'QuotaExceededError') return ErrorCode.STORAGE_QUOTA_EXCEEDED
    
    const message = err.message?.toLowerCase() || ''
    if (message.includes('quota')) return ErrorCode.STORAGE_QUOTA_EXCEEDED
    if (message.includes('permission')) return ErrorCode.STORAGE_PERMISSION_DENIED
    if (message.includes('corruption') || message.includes('corrupt')) return ErrorCode.STORAGE_CORRUPTION
    
    return ErrorCode.STORAGE_NOT_AVAILABLE
  }

  /**
   * Web Worker error detection and classification
   */
  private static isWorkerError(error: unknown): boolean {
    if (typeof error === 'object' && error !== null) {
      const err = error as any
      return err.name === 'WorkerError' ||
             (err.message && typeof err.message === 'string' && 
              err.message.includes('worker'))
    }
    return false
  }

  private static classifyWorkerError(error: unknown): ErrorCode {
    const err = error as any
    const message = err.message?.toLowerCase() || ''
    
    if (message.includes('timeout')) return ErrorCode.WORKER_TIMEOUT
    if (message.includes('not supported')) return ErrorCode.WORKER_NOT_SUPPORTED
    
    return ErrorCode.WORKER_FAILED
  }

  /**
   * Browser/Device error detection and classification
   */
  private static isBrowserError(error: unknown): boolean {
    if (typeof error === 'object' && error !== null) {
      const err = error as any
      return (err.message && typeof err.message === 'string' && 
              (err.message.includes('browser') || err.message.includes('device')))
    }
    return false
  }

  private static classifyBrowserError(error: unknown): ErrorCode {
    const err = error as any
    const message = err.message?.toLowerCase() || ''
    
    if (message.includes('not supported')) return ErrorCode.BROWSER_NOT_SUPPORTED
    if (message.includes('orientation')) return ErrorCode.DEVICE_ORIENTATION_ERROR
    if (message.includes('battery')) return ErrorCode.DEVICE_BATTERY_LOW
    
    return ErrorCode.BROWSER_NOT_SUPPORTED
  }

  /**
   * Extract error message from unknown error
   */
  private static extractErrorMessage(error: unknown): string {
    if (typeof error === 'string') return error
    if (error instanceof Error) return error.message
    if (typeof error === 'object' && error !== null && 'message' in error) {
      return String(error.message)
    }
    return 'Unknown error occurred'
  }

  /**
   * Extract error details for debugging
   */
  private static extractErrorDetails(error: unknown): any {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    }
    
    if (typeof error === 'object' && error !== null) {
      return { ...error }
    }
    
    return { originalError: error }
  }

  /**
   * Generate user-friendly error messages
   */
  private static generateUserMessage(code: ErrorCode, error?: unknown): string {
    switch (code) {
      // Network errors
      case ErrorCode.NETWORK_ERROR:
        return 'Connection problem. Please check your internet and try again.'
      case ErrorCode.NETWORK_TIMEOUT:
        return 'Request timed out. Your connection might be slow.'
      case ErrorCode.NETWORK_OFFLINE:
        return 'No internet connection. Please connect to the internet.'
      case ErrorCode.NETWORK_SLOW:
        return 'Slow connection detected. Some features may be limited.'

      // API errors
      case ErrorCode.API_RATE_LIMIT:
        return 'Too many requests. Please wait a moment and try again.'
      case ErrorCode.API_QUOTA_EXCEEDED:
        return 'Usage limit reached. Please contact support or upgrade your plan.'
      case ErrorCode.API_INVALID_KEY:
        return 'Authentication error. Please refresh the page.'
      case ErrorCode.API_SERVICE_DOWN:
        return 'Translation service is temporarily unavailable. Please try again later.'
      case ErrorCode.API_TIMEOUT:
        return 'Translation took too long. Please try again.'

      // Audio errors
      case ErrorCode.AUDIO_PERMISSION_DENIED:
        return 'Microphone access denied. Please allow microphone access to record audio.'
      case ErrorCode.AUDIO_NOT_SUPPORTED:
        return 'Audio recording is not supported on this device or browser.'
      case ErrorCode.AUDIO_RECORDING_FAILED:
        return 'Recording failed. Please check your microphone and try again.'
      case ErrorCode.AUDIO_TOO_SHORT:
        return 'Recording too short. Please speak for at least 1 second.'
      case ErrorCode.AUDIO_TOO_LONG:
        return 'Recording too long. Maximum recording time is 60 seconds.'
      case ErrorCode.AUDIO_DEVICE_ERROR:
        return 'Microphone problem. Please check your audio device.'

      // Session errors
      case ErrorCode.SESSION_NOT_FOUND:
        return 'Session not found. The session may have expired or the code is incorrect.'
      case ErrorCode.SESSION_EXPIRED:
        return 'Session expired. Sessions last 4 hours. Please create a new session.'
      case ErrorCode.SESSION_FULL:
        return 'Session is full. Maximum 2 people per session.'
      case ErrorCode.SESSION_INVALID_CODE:
        return 'Invalid session code. Please check the 4-digit code and try again.'

      // Translation errors
      case ErrorCode.TRANSLATION_FAILED:
        return 'Translation failed. Please try recording again.'
      case ErrorCode.LANGUAGE_NOT_DETECTED:
        return 'Could not detect language. Please speak more clearly.'
      case ErrorCode.LANGUAGE_NOT_SUPPORTED:
        return 'Language not supported. This app supports English, Spanish, and Portuguese.'
      case ErrorCode.TRANSCRIPTION_NO_SPEECH:
        return 'No speech detected. Please speak into the microphone.'

      // Storage errors
      case ErrorCode.STORAGE_QUOTA_EXCEEDED:
        return 'Storage full. Please clear some space or refresh the page.'
      case ErrorCode.STORAGE_NOT_AVAILABLE:
        return 'Storage not available. Please enable storage in your browser.'

      // Permission errors
      case ErrorCode.PERMISSION_MICROPHONE_DENIED:
        return 'Microphone access required. Please enable microphone access in your browser settings.'
      case ErrorCode.PERMISSION_NOTIFICATION_DENIED:
        return 'Notifications blocked. Enable notifications for status updates.'

      // System errors
      case ErrorCode.MEMORY_PRESSURE:
        return 'Device running low on memory. Please close other apps.'
      case ErrorCode.BROWSER_NOT_SUPPORTED:
        return 'Browser not supported. Please use Chrome, Safari, or Firefox.'
      case ErrorCode.COMPONENT_CRASH:
        return 'Something went wrong. Please refresh the page.'

      // Rate limiting
      case ErrorCode.RATE_LIMITED_USER:
        return 'Too many actions. Please slow down and try again.'

      default:
        return 'Something unexpected happened. Please try again or refresh the page.'
    }
  }

  /**
   * Handle error with appropriate response
   */
  static handleError(
    error: unknown,
    options: ErrorHandlerOptions = {}
  ): AppError {
    const appError = this.createError(error, options.context)

    // Call registered handler if exists
    const handler = this.errorHandlers.get(appError.code)
    if (handler) {
      try {
        handler(appError)
      } catch (handlerError) {
        console.error('Error handler failed:', handlerError)
      }
    }

    // Log to analytics if configured
    if ((options.logToAnalytics ?? appError.metadata.logToAnalytics) && 
        appError.severity !== ErrorSeverity.LOW) {
      this.logErrorToAnalytics(appError)
    }

    // Log to console for debugging
    this.logErrorToConsole(appError)

    return appError
  }

  /**
   * Register error handler for specific error code
   */
  static registerHandler(code: ErrorCode, handler: (error: AppError) => void): void {
    this.errorHandlers.set(code, handler)
  }

  /**
   * Remove error handler
   */
  static unregisterHandler(code: ErrorCode): void {
    this.errorHandlers.delete(code)
  }

  /**
   * Get recovery actions for error
   */
  static getRecoveryActions(error: AppError): ErrorRecoveryAction[] {
    const actions: ErrorRecoveryAction[] = []

    // Common retry action for retryable errors
    if (error.retryable) {
      actions.push({
        label: 'Try Again',
        action: () => window.location.reload(),
        primary: true
      })
    }

    // Specific recovery actions based on error type
    switch (error.code) {
      case ErrorCode.AUDIO_PERMISSION_DENIED:
        actions.push({
          label: 'Enable Microphone',
          action: async () => {
            try {
              await navigator.mediaDevices.getUserMedia({ audio: true })
            } catch (e) {
              console.log('User denied microphone access')
            }
          },
          primary: true
        })
        break

      case ErrorCode.SESSION_EXPIRED:
      case ErrorCode.SESSION_NOT_FOUND:
        actions.push({
          label: 'Create New Session',
          action: () => window.location.href = '/',
          primary: true
        })
        break

      case ErrorCode.NETWORK_OFFLINE:
        actions.push({
          label: 'Check Connection',
          action: () => {
            if (navigator.onLine) {
              window.location.reload()
            } else {
              alert('Please check your internet connection')
            }
          },
          primary: true
        })
        break

      case ErrorCode.STORAGE_QUOTA_EXCEEDED:
        actions.push({
          label: 'Clear Cache',
          action: async () => {
            try {
              localStorage.clear()
              if ('caches' in window) {
                const cacheNames = await caches.keys()
                await Promise.all(cacheNames.map(name => caches.delete(name)))
              }
              window.location.reload()
            } catch (e) {
              console.error('Failed to clear cache:', e)
            }
          },
          primary: true
        })
        break
    }

    // Always provide refresh option
    if (actions.length === 0 || error.severity === ErrorSeverity.CRITICAL) {
      actions.push({
        label: 'Refresh Page',
        action: () => window.location.reload(),
        primary: actions.length === 0
      })
    }

    return actions
  }

  /**
   * Get error statistics
   */
  static getErrorStats() {
    const stats = {
      total: this.errorHistory.length,
      byCode: new Map<ErrorCode, number>(),
      bySeverity: new Map<ErrorSeverity, number>(),
      byCategory: new Map<ErrorCategory, number>(),
      recent: this.errorHistory.slice(-10)
    }

    this.errorHistory.forEach(error => {
      stats.byCode.set(error.code, (stats.byCode.get(error.code) || 0) + 1)
      stats.bySeverity.set(error.severity, (stats.bySeverity.get(error.severity) || 0) + 1)
      stats.byCategory.set(error.category, (stats.byCategory.get(error.category) || 0) + 1)
    })

    return stats
  }

  /**
   * Clear error history
   */
  static clearErrorHistory(): void {
    this.errorHistory = []
  }

  /**
   * Add error to history with size limit
   */
  private static addToHistory(error: AppError): void {
    this.errorHistory.push(error)
    
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize)
    }
  }

  /**
   * Log error to analytics service
   */
  private static logErrorToAnalytics(error: AppError): void {
    // TODO: Integrate with analytics service
    console.log('📊 [Analytics] Error logged:', {
      code: error.code,
      severity: error.severity,
      category: error.category,
      context: error.context,
      timestamp: error.timestamp
    })
    
    // Could integrate with services like:
    // - Google Analytics
    // - Sentry
    // - PostHog
    // - Custom analytics endpoint
  }

  /**
   * Log error to console with formatting
   */
  private static logErrorToConsole(error: AppError): void {
    const emoji = this.getSeverityEmoji(error.severity)
    const badge = `[${error.category.toUpperCase()}]`
    
    console.group(`${emoji} ${badge} ${error.code}`)
    console.log('User Message:', error.userMessage)
    console.log('Technical Message:', error.message)
    console.log('Severity:', error.severity)
    console.log('Retryable:', error.retryable)
    if (error.context) console.log('Context:', error.context)
    if (error.details) console.log('Details:', error.details)
    console.groupEnd()
  }

  /**
   * Get emoji for error severity
   */
  private static getSeverityEmoji(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.LOW: return '⚠️'
      case ErrorSeverity.MEDIUM: return '🚨'
      case ErrorSeverity.HIGH: return '🔥'
      case ErrorSeverity.CRITICAL: return '💥'
      default: return '❓'
    }
  }
}