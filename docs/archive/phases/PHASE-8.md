# Phase 8: Error Handling & Edge Cases

## Overview
Implement comprehensive error handling, recovery mechanisms, and edge case management for a robust user experience.

**⚡ IMPACT FROM PHASE 5**: Extensive error handling and recovery mechanisms have already been implemented in Phase 5 Mobile Network Resilience, including intelligent retry logic, network-aware error classification, progress preservation, and comprehensive error recovery. This phase now focuses on UI error handling and user experience improvements.

## Prerequisites
- Phase 0-7 completed ✅
- All features functional ✅
- Performance optimized ✅
- Error scenarios identified ✅
- Enterprise-grade error recovery implemented ✅
- Network-aware retry logic active ✅
- Progress preservation for workflow recovery ✅

## Goals
- ~~Handle all API failures gracefully~~ ✅ **COMPLETED in Phase 5** (comprehensive error classification and recovery)
- ~~Implement retry mechanisms~~ ✅ **COMPLETED in Phase 5** (network-aware intelligent retry logic)
- Add enhanced offline support and user notifications
- ~~Handle permission issues~~ ✅ **PARTIALLY COMPLETED in Phase 5** (iOS audio context management)
- ~~Manage network failures~~ ✅ **COMPLETED in Phase 5** (connection recovery and progress preservation)
- Create user-friendly error messages and UI feedback
- Implement advanced error analytics and logging
- Add error recovery user workflows and guidance

## Implementation Steps

### 1. Create Error Management System

#### Error Manager (src/lib/errors/ErrorManager.ts)
```typescript
export enum ErrorCode {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_OFFLINE = 'NETWORK_OFFLINE',
  
  // API errors
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  API_QUOTA_EXCEEDED = 'API_QUOTA_EXCEEDED',
  API_INVALID_KEY = 'API_INVALID_KEY',
  API_SERVICE_DOWN = 'API_SERVICE_DOWN',
  
  // Audio errors
  AUDIO_PERMISSION_DENIED = 'AUDIO_PERMISSION_DENIED',
  AUDIO_NOT_SUPPORTED = 'AUDIO_NOT_SUPPORTED',
  AUDIO_RECORDING_FAILED = 'AUDIO_RECORDING_FAILED',
  AUDIO_TOO_SHORT = 'AUDIO_TOO_SHORT',
  AUDIO_TOO_LONG = 'AUDIO_TOO_LONG',
  
  // Session errors
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_FULL = 'SESSION_FULL',
  SESSION_CREATE_FAILED = 'SESSION_CREATE_FAILED',
  
  // Translation errors
  TRANSLATION_FAILED = 'TRANSLATION_FAILED',
  LANGUAGE_NOT_DETECTED = 'LANGUAGE_NOT_DETECTED',
  LANGUAGE_NOT_SUPPORTED = 'LANGUAGE_NOT_SUPPORTED',
  
  // Storage errors
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  STORAGE_NOT_AVAILABLE = 'STORAGE_NOT_AVAILABLE',
  
  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface AppError {
  code: ErrorCode
  message: string
  details?: any
  retryable: boolean
  userMessage: string
}

export class ErrorManager {
  private static errorHandlers = new Map<ErrorCode, (error: AppError) => void>()
  
  /**
   * Create app error from unknown error
   */
  static createError(error: unknown, context?: string): AppError {
    // API errors
    if (this.isOpenAIError(error)) {
      return this.handleOpenAIError(error)
    }
    
    // Supabase errors
    if (this.isSupabaseError(error)) {
      return this.handleSupabaseError(error)
    }
    
    // Network errors
    if (this.isNetworkError(error)) {
      return this.handleNetworkError(error)
    }
    
    // Generic error
    return {
      code: ErrorCode.UNKNOWN_ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error,
      retryable: false,
      userMessage: 'Something went wrong. Please try again.',
    }
  }
  
  /**
   * Check if OpenAI error
   */
  private static isOpenAIError(error: any): boolean {
    return error?.response?.headers?.['x-request-id'] !== undefined
  }
  
  /**
   * Handle OpenAI errors
   */
  private static handleOpenAIError(error: any): AppError {
    const status = error.response?.status
    const errorCode = error.error?.code
    
    switch (status) {
      case 429:
        return {
          code: ErrorCode.API_RATE_LIMIT,
          message: 'Rate limit exceeded',
          details: error,
          retryable: true,
          userMessage: 'Too many requests. Please wait a moment.',
        }
      
      case 401:
        return {
          code: ErrorCode.API_INVALID_KEY,
          message: 'Invalid API key',
          details: error,
          retryable: false,
          userMessage: 'Authentication failed. Please check your settings.',
        }
      
      case 503:
        return {
          code: ErrorCode.API_SERVICE_DOWN,
          message: 'OpenAI service unavailable',
          details: error,
          retryable: true,
          userMessage: 'Translation service is temporarily unavailable.',
        }
      
      default:
        return {
          code: ErrorCode.TRANSLATION_FAILED,
          message: error.message || 'Translation failed',
          details: error,
          retryable: true,
          userMessage: 'Translation failed. Please try again.',
        }
    }
  }
  
  /**
   * Check if Supabase error
   */
  private static isSupabaseError(error: any): boolean {
    return error?.code?.startsWith('PGRST') || error?.code?.startsWith('22')
  }
  
  /**
   * Handle Supabase errors
   */
  private static handleSupabaseError(error: any): AppError {
    if (error.code === 'PGRST116') {
      return {
        code: ErrorCode.SESSION_NOT_FOUND,
        message: 'Session not found',
        details: error,
        retryable: false,
        userMessage: 'Session not found or expired.',
      }
    }
    
    return {
      code: ErrorCode.UNKNOWN_ERROR,
      message: error.message || 'Database error',
      details: error,
      retryable: true,
      userMessage: 'Connection error. Please try again.',
    }
  }
  
  /**
   * Check if network error
   */
  private static isNetworkError(error: any): boolean {
    return error?.code === 'NETWORK_ERROR' || 
           error?.message?.includes('fetch') ||
           !navigator.onLine
  }
  
  /**
   * Handle network errors
   */
  private static handleNetworkError(error: any): AppError {
    if (!navigator.onLine) {
      return {
        code: ErrorCode.NETWORK_OFFLINE,
        message: 'No internet connection',
        details: error,
        retryable: true,
        userMessage: 'You are offline. Please check your connection.',
      }
    }
    
    return {
      code: ErrorCode.NETWORK_ERROR,
      message: 'Network error',
      details: error,
      retryable: true,
      userMessage: 'Connection error. Please try again.',
    }
  }
  
  /**
   * Register error handler
   */
  static registerHandler(code: ErrorCode, handler: (error: AppError) => void): void {
    this.errorHandlers.set(code, handler)
  }
  
  /**
   * Handle error
   */
  static handle(error: AppError): void {
    console.error(`[${error.code}]`, error.message, error.details)
    
    // Call registered handler
    const handler = this.errorHandlers.get(error.code)
    if (handler) {
      handler(error)
    }
    
    // Log to monitoring service
    this.logError(error)
  }
  
  /**
   * Log error to monitoring
   */
  private static logError(error: AppError): void {
    // TODO: Send to error monitoring service
    if (import.meta.env.PROD) {
      // Sentry, LogRocket, etc.
    }
  }
}
```

### 2. Create Retry Logic

#### Retry Manager (src/lib/retry/RetryManager.ts)
```typescript
export interface RetryOptions {
  maxAttempts?: number
  initialDelay?: number
  maxDelay?: number
  backoffFactor?: number
  retryIf?: (error: any) => boolean
}

export class RetryManager {
  private static readonly DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    retryIf: () => true,
  }
  
  /**
   * Execute function with retry
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const config = { ...this.DEFAULT_OPTIONS, ...options }
    let lastError: any
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error
        
        // Check if should retry
        if (!config.retryIf(error) || attempt === config.maxAttempts) {
          throw error
        }
        
        // Calculate delay
        const delay = Math.min(
          config.initialDelay * Math.pow(config.backoffFactor, attempt - 1),
          config.maxDelay
        )
        
        console.log(`Retry attempt ${attempt}/${config.maxAttempts} after ${delay}ms`)
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError
  }
  
  /**
   * Create retryable function
   */
  static createRetryable<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    options: RetryOptions = {}
  ): T {
    return (async (...args: Parameters<T>) => {
      return this.withRetry(() => fn(...args), options)
    }) as T
  }
}
```

### 3. Create Error Boundary

#### Error Boundary Component (src/components/ErrorBoundary.tsx)
```typescript
import { Component, ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo)
    
    // Log to error service
    if (import.meta.env.PROD) {
      // Send to Sentry, etc.
    }
  }
  
  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }
  
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.handleReset)
      }
      
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <div className="text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
              <h2 className="text-xl font-semibold">Something went wrong</h2>
              <p className="text-gray-600">
                We encountered an unexpected error. Please try again.
              </p>
              {import.meta.env.DEV && this.state.error && (
                <details className="text-left">
                  <summary className="cursor-pointer text-sm text-gray-500">
                    Error details
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {this.state.error.message}
                    {'\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
              <Button onClick={this.handleReset} fullWidth>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </Card>
        </div>
      )
    }
    
    return this.props.children
  }
}
```

### 4. Create Network Status Monitor

#### Network Monitor Hook (src/hooks/useNetworkStatus.ts)
```typescript
import { useState, useEffect } from 'react'

export interface NetworkStatus {
  online: boolean
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g'
  downlink?: number
  rtt?: number
  saveData?: boolean
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    online: navigator.onLine,
  })

  useEffect(() => {
    const updateStatus = () => {
      const connection = (navigator as any).connection
      
      setStatus({
        online: navigator.onLine,
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        rtt: connection?.rtt,
        saveData: connection?.saveData,
      })
    }

    // Initial status
    updateStatus()

    // Listen for changes
    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)
    
    const connection = (navigator as any).connection
    if (connection) {
      connection.addEventListener('change', updateStatus)
    }

    return () => {
      window.removeEventListener('online', updateStatus)
      window.removeEventListener('offline', updateStatus)
      if (connection) {
        connection.removeEventListener('change', updateStatus)
      }
    }
  }, [])

  return status
}
```

#### Offline Indicator Component (src/components/OfflineIndicator.tsx)
```typescript
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { WifiOff } from 'lucide-react'
import { clsx } from 'clsx'

export function OfflineIndicator() {
  const { online } = useNetworkStatus()
  
  if (online) return null
  
  return (
    <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-2 text-center z-50">
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span className="text-sm font-medium">
          You are offline. Some features may not work.
        </span>
      </div>
    </div>
  )
}
```

### 5. Create Permission Handler

#### Permission Manager (src/lib/permissions/PermissionManager.ts)
```typescript
export type PermissionType = 'microphone' | 'notifications' | 'persistent-storage'

export interface PermissionStatus {
  granted: boolean
  prompt: boolean
  denied: boolean
}

export class PermissionManager {
  /**
   * Check permission status
   */
  static async checkPermission(type: PermissionType): Promise<PermissionStatus> {
    try {
      // Map to correct permission name
      const permissionName = this.mapPermissionName(type)
      
      const result = await navigator.permissions.query({ 
        name: permissionName as PermissionName 
      })
      
      return {
        granted: result.state === 'granted',
        prompt: result.state === 'prompt',
        denied: result.state === 'denied',
      }
    } catch (error) {
      // Fallback for unsupported permissions API
      return {
        granted: false,
        prompt: true,
        denied: false,
      }
    }
  }
  
  /**
   * Request permission
   */
  static async requestPermission(type: PermissionType): Promise<boolean> {
    switch (type) {
      case 'microphone':
        return this.requestMicrophonePermission()
      
      case 'notifications':
        return this.requestNotificationPermission()
      
      case 'persistent-storage':
        return this.requestPersistentStorage()
      
      default:
        return false
    }
  }
  
  /**
   * Request microphone permission
   */
  private static async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      return true
    } catch (error) {
      console.error('Microphone permission denied:', error)
      return false
    }
  }
  
  /**
   * Request notification permission
   */
  private static async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false
    
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }
  
  /**
   * Request persistent storage
   */
  private static async requestPersistentStorage(): Promise<boolean> {
    if (!navigator.storage?.persist) return false
    
    return await navigator.storage.persist()
  }
  
  /**
   * Map permission names
   */
  private static mapPermissionName(type: PermissionType): string {
    const mapping: Record<PermissionType, string> = {
      'microphone': 'microphone',
      'notifications': 'notifications',
      'persistent-storage': 'persistent-storage',
    }
    return mapping[type]
  }
}
```

### 6. Create Fallback UI Components

#### Error Message Component (src/components/ErrorMessage.tsx)
```typescript
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { AppError } from '@/lib/errors/ErrorManager'

interface ErrorMessageProps {
  error: AppError
  onRetry?: () => void
}

export function ErrorMessage({ error, onRetry }: ErrorMessageProps) {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="text-center space-y-3 max-w-sm">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
        <h3 className="text-lg font-semibold">Oops!</h3>
        <p className="text-gray-600">{error.userMessage}</p>
        
        {error.retryable && onRetry && (
          <Button onClick={onRetry} variant="secondary" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
        
        {import.meta.env.DEV && (
          <details className="text-left mt-4">
            <summary className="cursor-pointer text-xs text-gray-500">
              Debug info
            </summary>
            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
              Code: {error.code}
              Message: {error.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}
```

#### Loading Skeleton (src/components/LoadingSkeleton.tsx)
```typescript
import { clsx } from 'clsx'

interface LoadingSkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  animation?: 'pulse' | 'wave'
}

export function LoadingSkeleton({
  className,
  variant = 'text',
  animation = 'pulse',
}: LoadingSkeletonProps) {
  return (
    <div
      className={clsx(
        'bg-gray-200',
        {
          'rounded': variant === 'text',
          'rounded-full': variant === 'circular',
          'rounded-lg': variant === 'rectangular',
          'animate-pulse': animation === 'pulse',
          'animate-shimmer': animation === 'wave',
        },
        className
      )}
    />
  )
}

// Add to uno.config.ts theme:
// animation: {
//   keyframes: {
//     shimmer: {
//       '0%': { backgroundPosition: '-200% 0' },
//       '100%': { backgroundPosition: '200% 0' },
//     },
//   },
//   durations: {
//     shimmer: '2s',
//   },
// },
```

### 7. Update Services with Error Handling

#### Updated Translation Pipeline (add error handling)
```typescript
// In TranslationPipeline.ts
import { ErrorManager, ErrorCode } from '@/lib/errors/ErrorManager'
import { RetryManager } from '@/lib/retry/RetryManager'

static async processAudioTranslation(
  options: TranslationPipelineOptions
): Promise<void> {
  try {
    // Wrap API calls with retry
    const whisperResponse = await RetryManager.withRetry(
      () => WhisperService.transcribeAudio(audioBlob, contextPrompt),
      {
        maxAttempts: 3,
        retryIf: (error) => {
          const appError = ErrorManager.createError(error)
          return appError.retryable
        },
      }
    )
    
    // Handle empty transcription
    if (!whisperResponse.text.trim()) {
      throw ErrorManager.createError({
        code: ErrorCode.AUDIO_TOO_SHORT,
        message: 'No speech detected',
        retryable: false,
        userMessage: 'No speech detected. Please speak clearly.',
      })
    }
    
    // ... rest of implementation with error handling
    
  } catch (error) {
    const appError = ErrorManager.createError(error, 'TranslationPipeline')
    ErrorManager.handle(appError)
    
    // Update UI to show error
    await ActivityService.updateActivity(sessionId, userId, 'idle')
    
    // Re-throw for UI to handle
    throw appError
  }
}
```

### 8. Create Error Recovery UI

#### Session Recovery Screen (src/features/session/SessionRecoveryScreen.tsx)
```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import type { AppError } from '@/lib/errors/ErrorManager'

interface SessionRecoveryScreenProps {
  error: AppError
  sessionCode: string
}

export function SessionRecoveryScreen({ error, sessionCode }: SessionRecoveryScreenProps) {
  const navigate = useNavigate()
  const [isRetrying, setIsRetrying] = useState(false)
  
  const handleRetry = async () => {
    setIsRetrying(true)
    // Attempt to rejoin session
    window.location.reload()
  }
  
  const handleHome = () => {
    navigate('/')
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
          
          <div>
            <h2 className="text-xl font-semibold">Session Issue</h2>
            <p className="text-gray-600 mt-2">{error.userMessage}</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-700">
              Session Code: <span className="font-mono font-bold">{sessionCode}</span>
            </p>
          </div>
          
          <div className="space-y-2">
            {error.retryable && (
              <Button
                onClick={handleRetry}
                fullWidth
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </>
                )}
              </Button>
            )}
            
            <Button
              onClick={handleHome}
              variant="secondary"
              fullWidth
              disabled={isRetrying}
            >
              <Home className="h-4 w-4 mr-2" />
              Return Home
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
```

## Tests

### Test 1: Error Manager
```typescript
// tests/lib/errors/ErrorManager.test.ts
import { ErrorManager, ErrorCode } from '@/lib/errors/ErrorManager'

describe('ErrorManager', () => {
  test('creates correct error for OpenAI rate limit', () => {
    const openAIError = {
      response: {
        status: 429,
        headers: { 'x-request-id': '123' }
      }
    }
    
    const appError = ErrorManager.createError(openAIError)
    expect(appError.code).toBe(ErrorCode.API_RATE_LIMIT)
    expect(appError.retryable).toBe(true)
  })
  
  test('creates correct error for network offline', () => {
    // Mock offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    })
    
    const networkError = new Error('Network request failed')
    const appError = ErrorManager.createError(networkError)
    
    expect(appError.code).toBe(ErrorCode.NETWORK_OFFLINE)
    expect(appError.userMessage).toContain('offline')
  })
})
```

### Test 2: Retry Manager
```typescript
// tests/lib/retry/RetryManager.test.ts
import { RetryManager } from '@/lib/retry/RetryManager'

describe('RetryManager', () => {
  test('retries failed function', async () => {
    let attempts = 0
    const fn = jest.fn().mockImplementation(() => {
      attempts++
      if (attempts < 3) {
        throw new Error('Failed')
      }
      return 'Success'
    })
    
    const result = await RetryManager.withRetry(fn, {
      maxAttempts: 3,
      initialDelay: 10,
    })
    
    expect(result).toBe('Success')
    expect(fn).toHaveBeenCalledTimes(3)
  })
  
  test('respects retry condition', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Permanent error'))
    
    await expect(
      RetryManager.withRetry(fn, {
        maxAttempts: 3,
        retryIf: () => false, // Never retry
      })
    ).rejects.toThrow('Permanent error')
    
    expect(fn).toHaveBeenCalledTimes(1) // No retries
  })
})
```

### Test 3: Permission Manager
```typescript
// tests/lib/permissions/PermissionManager.test.ts
import { PermissionManager } from '@/lib/permissions/PermissionManager'

describe('PermissionManager', () => {
  test('checks permission status', async () => {
    // Mock permissions API
    const mockQuery = jest.fn().mockResolvedValue({ state: 'granted' })
    navigator.permissions = { query: mockQuery } as any
    
    const status = await PermissionManager.checkPermission('microphone')
    
    expect(status.granted).toBe(true)
    expect(mockQuery).toHaveBeenCalledWith({ name: 'microphone' })
  })
})
```

### Manual Test Checklist
- [ ] API rate limit shows retry message
- [ ] Network offline shows offline indicator
- [ ] Microphone permission denied handled
- [ ] Session not found shows recovery
- [ ] Translation errors show retry option
- [ ] Error boundary catches crashes
- [ ] Retry logic works with backoff
- [ ] Permission prompts appear correctly
- [ ] Error messages are user-friendly
- [ ] Debug info shows in development

## Refactoring Checklist
- [ ] Centralize all error messages
- [ ] Add error analytics tracking
- [ ] Implement error recovery flows
- [ ] Add graceful degradation
- [ ] Create error documentation
- [ ] Add error simulation tools
- [ ] Implement error budgets

## Success Criteria
- [ ] All errors handled gracefully
- [ ] No unhandled promise rejections
- [ ] Retry logic prevents failures
- [ ] Users understand error states
- [ ] Recovery options always available
- [ ] Offline mode partially functional
- [ ] Permission denials handled
- [ ] Error tracking implemented

## Common Issues & Solutions

### Issue: Silent failures
**Solution**: Add comprehensive error logging and user feedback

### Issue: Infinite retry loops
**Solution**: Implement max attempts and circuit breakers

### Issue: Confusing error messages
**Solution**: Create user-friendly message mapping

### Issue: Lost data on errors
**Solution**: Implement local storage backup

## Error Handling Best Practices
- Always provide user feedback
- Log errors for debugging
- Implement graceful degradation
- Test error scenarios regularly
- Monitor error rates
- Document error codes
- Provide recovery options

## Security Notes
- Don't expose sensitive error details
- Sanitize error messages
- Rate limit retry attempts
- Log security-related errors
- Monitor for error-based attacks

## CRITICAL: Comprehensive Testing Before Deployment

### Automated Test Suite
Before marking Phase 8 complete, create and run a comprehensive test suite that validates ALL error handling and edge cases:

#### 1. Error Handling Tests (src/tests/error-handling/phase8/)
```bash
# Create error-specific tests
npm test src/tests/error-handling/phase8/
```

**Required Error Tests:**
- `error-manager.test.ts` - Error classification, user messages, logging
- `retry-manager.test.ts` - Retry logic, exponential backoff, max attempts
- `permission-manager.test.ts` - Permission handling, denials, prompts
- `network-errors.test.ts` - Offline detection, timeout handling, retries
- `api-errors.test.ts` - Rate limits, quota exceeded, server errors
- `audio-errors.test.ts` - Recording failures, format issues, permission denials
- `translation-errors.test.ts` - API failures, invalid responses, timeouts
- `session-errors.test.ts` - Invalid codes, expired sessions, connection failures

#### 2. Edge Case Tests (src/tests/edge-cases/phase8/)
```bash
# Test unusual scenarios
npm test src/tests/edge-cases/phase8/
```

**Required Edge Case Tests:**
- `concurrent-operations.test.ts` - Multiple actions simultaneously
- `rapid-interactions.test.ts` - Fast user actions, race conditions
- `boundary-values.test.ts` - Min/max values, empty states, overflow
- `corrupted-data.test.ts` - Invalid localStorage, malformed responses
- `browser-compatibility.test.ts` - Different browsers, feature detection
- `mobile-specific.test.ts` - Touch events, orientation changes, background

#### 3. Chaos Testing (src/tests/chaos/phase8/)
```bash
# Simulate system failures
npm run test:chaos
```

**Required Chaos Tests:**
- `network-failures.test.ts` - Random disconnections, slow connections
- `api-failures.test.ts` - Intermittent server errors, timeouts
- `memory-pressure.test.ts` - Low memory conditions, browser limits
- `resource-exhaustion.test.ts` - File system full, quota exceeded
- `timing-attacks.test.ts` - Rapid state changes, timing conflicts

#### 4. Recovery Flow Tests (src/tests/recovery/phase8/)
```bash
# Test error recovery mechanisms
npm test src/tests/recovery/phase8/
```

**Required Recovery Tests:**
- `auto-recovery.test.ts` - Automatic retry success scenarios
- `manual-recovery.test.ts` - User-initiated recovery actions
- `graceful-degradation.test.ts` - Partial functionality preservation
- `data-restoration.test.ts` - Local storage recovery, cache restoration
- `session-recovery.test.ts` - Session restoration after errors

#### 5. Manual Error Testing Checklist
**MUST TEST LOCALLY BEFORE TELLING USER TO TEST:**

**Network Error Scenarios:**
- [ ] Disconnect WiFi during session → shows offline message
- [ ] Slow network (throttled) → timeout handling works
- [ ] Server returns 500 error → retry mechanism activates
- [ ] API rate limit exceeded → appropriate delay before retry
- [ ] DNS resolution fails → offline detection works

**Permission Error Scenarios:**
- [ ] Microphone permission denied → clear instructions shown
- [ ] Microphone permission revoked during use → graceful handling
- [ ] No microphone detected → alternative input suggested
- [ ] Browser blocks autoplay → user interaction prompt

**Audio Error Scenarios:**
- [ ] Recording fails to start → error message + retry option
- [ ] Audio format unsupported → fallback format attempted
- [ ] File size exceeds limit → compression or warning
- [ ] Audio corruption during recording → detection + retry

**Translation Error Scenarios:**
- [ ] OpenAI API key invalid → clear error message
- [ ] OpenAI quota exceeded → informative message + timing
- [ ] Translation request timeout → retry with user feedback
- [ ] Malformed translation response → fallback handling

**Session Error Scenarios:**
- [ ] Invalid session code → validation message
- [ ] Session expired → extension option or new session
- [ ] Too many users in session → queue or rejection message
- [ ] Session database error → recovery attempt + fallback

**UI Error Scenarios:**
- [ ] Component crash caught by error boundary
- [ ] Infinite loading states have timeout
- [ ] Form validation errors clear and actionable
- [ ] Navigation errors return to safe state

**Data Error Scenarios:**
- [ ] Corrupted localStorage → recovery or reset
- [ ] Invalid message data → skip with warning
- [ ] Missing required fields → default values or prompts
- [ ] Database constraint violations → user-friendly errors

**Browser Compatibility Errors:**
- [ ] Unsupported features → graceful degradation
- [ ] Old browsers → compatibility warnings
- [ ] Mobile browsers → touch event handling
- [ ] Different screen sizes → responsive error displays

### Test Execution Requirements

#### Before Deployment:
1. **Run All Error Tests:** Every test MUST pass
```bash
npm test                     # Unit tests
npm test:error-handling     # Error handling tests
npm test:edge-cases         # Edge case tests
npm run test:chaos          # Chaos testing
npm test:recovery           # Recovery tests
npm run lint                # Code quality
npm run type-check          # TypeScript validation
```

2. **Manual Error Verification:** Complete ALL checklist items above

3. **Error Coverage Requirements:**
   - 100% of error scenarios handled
   - No unhandled promise rejections
   - All user actions have error states
   - Recovery options always available

4. **Stress Testing:** Must survive
   - Rapid user interactions (clicking/tapping quickly)
   - Network interruptions at random times
   - Memory pressure situations
   - Multiple simultaneous errors

### Test Implementation Template

```typescript
// src/tests/phase8/complete-validation.test.ts
describe('Phase 8 Error Handling Validation', () => {
  describe('Network Error Handling', () => {
    test('handles offline state gracefully', async () => {
      // Simulate offline
      // Trigger network operation
      // Verify error handling
      // Check user feedback
    })
    
    test('retries failed requests with backoff', async () => {
      // Mock failing API
      // Trigger retry logic
      // Verify exponential backoff
      // Check max attempts
    })
  })

  describe('Permission Error Handling', () => {
    test('handles microphone denial gracefully', async () => {
      // Mock permission denial
      // Trigger recording
      // Verify error message
      // Check recovery options
    })
  })

  describe('Edge Case Handling', () => {
    test('handles rapid user interactions', async () => {
      // Simulate rapid clicks
      // Verify no race conditions
      // Check state consistency
    })
    
    test('handles corrupted data gracefully', async () => {
      // Corrupt localStorage
      // Trigger data read
      // Verify recovery
      // Check default fallback
    })
  })

  describe('Error Recovery', () => {
    test('recovers from session failures', async () => {
      // Simulate session error
      // Trigger recovery
      // Verify success
      // Check user experience
    })
  })
})
```

### Deployment Readiness Criteria

**ALL of the following MUST be true before deployment:**

✅ **All error handling tests pass (100% success rate)**
✅ **Manual error testing checklist completed**  
✅ **No unhandled promise rejections in console**
✅ **All user actions have error states defined**
✅ **Recovery mechanisms work reliably**
✅ **Error messages are user-friendly**
✅ **Offline mode provides graceful degradation**
✅ **Permission denials handled appropriately**
✅ **Code quality checks pass (lint + type-check)**
✅ **Error boundaries catch all component crashes**

### Error Test Failure Protocol

**If ANY error test fails:**
1. **STOP deployment immediately**
2. **Identify the unhandled error scenario**
3. **Implement proper error handling**
4. **Add recovery mechanism if needed**
5. **Re-run complete error test suite**
6. **Only proceed when ALL error scenarios handled**

**Remember:** Every user action must have a defined error state. Never let users see raw error messages or get stuck without recovery options.

### Critical Error Test Scenarios

#### Scenario 1: Cascade Failure
- Trigger network error during audio recording
- Let translation fail due to network
- Verify each error handled independently
- Check recovery from multiple failures

#### Scenario 2: Permission Revocation
- Start recording with permissions granted
- Revoke microphone permission mid-recording
- Verify graceful handling and user guidance
- Test permission re-request flow

#### Scenario 3: Rapid Error Recovery
- Trigger error condition repeatedly
- Verify no infinite retry loops
- Check rate limiting works
- Ensure recovery eventually succeeds

#### Scenario 4: Mobile Interruption
- Start translation on mobile
- Receive phone call during recording
- Return to app after call
- Verify session and state recovery

#### Scenario 5: Data Corruption Recovery
- Corrupt all localStorage data
- Refresh page/restart app
- Verify clean initialization
- Check no functional impact

### Error Monitoring Integration

#### Production Error Tracking
```typescript
// Error monitoring for production
const errorMonitor = {
  trackError: (error: Error, context: Record<string, any>) => {
    // Log to external service (Sentry, LogRocket, etc.)
    console.error('Production Error:', {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    })
  },
  
  trackUserAction: (action: string, success: boolean, error?: Error) => {
    // Track user action outcomes
    if (!success && error) {
      this.trackError(error, { action, type: 'user_action_failed' })
    }
  }
}
```

### User Experience Requirements

**Error States Must Include:**
- Clear explanation of what went wrong
- Specific steps to resolve the issue
- Alternative actions if available
- Option to retry or start over
- Contact information for persistent issues

**Error Messages Must Be:**
- Written in plain language
- Actionable (tell user what to do)
- Contextual (relevant to user's action)
- Branded consistently
- Translated into user's language

## Next Steps
- Phase 9: Polish and production ready
- Add final UI polish
- Implement localization
- Prepare for deployment