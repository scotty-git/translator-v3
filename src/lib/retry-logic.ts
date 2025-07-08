/**
 * Enhanced Retry Logic for Workflow Steps
 * 
 * This module provides intelligent retry logic for each step of the translation workflow
 * while preserving the exact order: recording → transcribing → translating → complete
 */

import { networkQualityDetector } from './network-quality'

export type RetryableError = Error & {
  isRetryable?: boolean
  isNetworkError?: boolean
  statusCode?: number
}

export interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  networkAwareDelay: boolean
}

export interface RetryOptions {
  stepName: string
  config?: Partial<RetryConfig>
  onRetry?: (attempt: number, error: Error, delay: number) => void
  onFinalFailure?: (error: Error, totalAttempts: number) => void
}

/**
 * Default retry configurations for different workflow steps
 */
export const RETRY_CONFIGS: Record<string, RetryConfig> = {
  transcription: {
    maxAttempts: 3,
    baseDelay: 1000,     // 1 second base delay
    maxDelay: 10000,     // 10 second max delay
    backoffMultiplier: 2,
    networkAwareDelay: true
  },
  translation: {
    maxAttempts: 3,
    baseDelay: 1000,     // 1 second base delay
    maxDelay: 10000,     // 10 second max delay
    backoffMultiplier: 2,
    networkAwareDelay: true
  },
  tts: {
    maxAttempts: 2,      // TTS is manual-only, fewer retries
    baseDelay: 1000,     // 1 second base delay
    maxDelay: 5000,      // 5 second max delay
    backoffMultiplier: 1.5,
    networkAwareDelay: true
  },
  database: {
    maxAttempts: 5,      // Database operations are critical
    baseDelay: 500,      // 500ms base delay
    maxDelay: 8000,      // 8 second max delay
    backoffMultiplier: 2,
    networkAwareDelay: true
  },
  'real-time': {
    maxAttempts: 5,      // Real-time subscriptions need reliability
    baseDelay: 1000,     // 1 second base delay
    maxDelay: 15000,     // 15 second max delay
    backoffMultiplier: 2,
    networkAwareDelay: true
  }
}

/**
 * Determine if an error is retryable based on its characteristics
 */
export function isRetryableError(error: unknown): boolean {
  if (!error) return false
  
  const err = error as RetryableError
  
  // Explicit retry flag
  if (err.isRetryable === false) return false
  if (err.isRetryable === true) return true
  
  // Network-related errors are generally retryable
  if (err.isNetworkError) return true
  
  // Check error message for common retryable patterns
  const message = err.message?.toLowerCase() || ''
  const retryablePatterns = [
    'network',
    'timeout',
    'connection',
    'fetch',
    'econnreset',
    'enotfound',
    'econnrefused',
    'socket hang up',
    'request timeout',
    'gateway timeout',
    'service unavailable',
    'internal server error',
    'bad gateway',
    'rate limit',
    'quota exceeded',
    'temporarily unavailable'
  ]
  
  if (retryablePatterns.some(pattern => message.includes(pattern))) {
    return true
  }
  
  // Check status codes for HTTP errors
  if (err.statusCode) {
    const retryableStatusCodes = [
      408, // Request Timeout
      429, // Too Many Requests
      500, // Internal Server Error
      502, // Bad Gateway
      503, // Service Unavailable
      504, // Gateway Timeout
      520, // Unknown Error (Cloudflare)
      521, // Web Server Is Down (Cloudflare)
      522, // Connection Timed Out (Cloudflare)
      523, // Origin Is Unreachable (Cloudflare)
      524, // A Timeout Occurred (Cloudflare)
    ]
    
    return retryableStatusCodes.includes(err.statusCode)
  }
  
  return false
}

/**
 * Calculate delay with exponential backoff and network awareness
 */
function calculateDelay(
  attempt: number, 
  config: RetryConfig, 
  lastError?: Error
): number {
  // Base exponential backoff
  let delay = Math.min(
    config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
    config.maxDelay
  )
  
  // Network-aware delay adjustment
  if (config.networkAwareDelay) {
    const networkQuality = networkQualityDetector.getCurrentQuality()
    
    switch (networkQuality) {
      case 'very-slow':
        delay *= 2    // Double delay for very slow networks
        break
      case 'slow':
        delay *= 1.5  // 50% longer delay for slow networks
        break
      case 'fast':
        delay *= 0.8  // 20% shorter delay for fast networks
        break
      default:
        // Unknown network - use base delay
        break
    }
  }
  
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.1 * delay // ±10% jitter
  delay += jitter
  
  return Math.floor(delay)
}

/**
 * Enhanced retry wrapper with exponential backoff and network awareness
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const stepName = options.stepName
  const config = { ...RETRY_CONFIGS[stepName] || RETRY_CONFIGS.database, ...options.config }
  
  console.log(`🔄 Starting ${stepName} with retry config:`, {
    maxAttempts: config.maxAttempts,
    baseDelay: config.baseDelay,
    networkQuality: networkQualityDetector.getCurrentQuality()
  })
  
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      console.log(`🎯 ${stepName}: Attempt ${attempt}/${config.maxAttempts}`)
      
      const result = await operation()
      
      // Success! Log if this wasn't the first attempt
      if (attempt > 1) {
        console.log(`✅ ${stepName}: Succeeded on attempt ${attempt}/${config.maxAttempts}`)
      }
      
      return result
      
    } catch (error) {
      lastError = error as Error
      
      console.warn(`❌ ${stepName}: Attempt ${attempt}/${config.maxAttempts} failed:`, lastError.message)
      
      // Check if error is retryable
      if (!isRetryableError(lastError)) {
        console.error(`💥 ${stepName}: Non-retryable error, failing immediately:`, lastError.message)
        break
      }
      
      // If this was the last attempt, don't delay
      if (attempt === config.maxAttempts) {
        console.error(`💥 ${stepName}: All ${config.maxAttempts} attempts failed`)
        break
      }
      
      // Calculate delay and wait
      const delay = calculateDelay(attempt, config, lastError)
      
      console.log(`⏳ ${stepName}: Retrying in ${delay}ms... (attempt ${attempt + 1}/${config.maxAttempts})`)
      
      // Notify retry callback
      options.onRetry?.(attempt, lastError, delay)
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  // All attempts failed
  const totalAttempts = config.maxAttempts
  console.error(`💥 ${stepName}: Final failure after ${totalAttempts} attempts:`, lastError?.message)
  
  // Notify final failure callback
  options.onFinalFailure?.(lastError!, totalAttempts)
  
  // Re-throw the last error
  throw lastError
}

/**
 * Specialized retry functions for each workflow step
 */
export const WorkflowRetry = {
  /**
   * Retry transcription operations
   */
  async transcription<T>(
    operation: () => Promise<T>,
    onRetry?: (attempt: number, error: Error) => void
  ): Promise<T> {
    return withRetry(operation, {
      stepName: 'transcription',
      onRetry: onRetry ? (attempt, error, delay) => {
        onRetry(attempt, error)
      } : undefined
    })
  },

  /**
   * Retry translation operations
   */
  async translation<T>(
    operation: () => Promise<T>,
    onRetry?: (attempt: number, error: Error) => void
  ): Promise<T> {
    return withRetry(operation, {
      stepName: 'translation',
      onRetry: onRetry ? (attempt, error, delay) => {
        onRetry(attempt, error)
      } : undefined
    })
  },

  /**
   * Retry TTS operations
   */
  async tts<T>(
    operation: () => Promise<T>,
    onRetry?: (attempt: number, error: Error) => void
  ): Promise<T> {
    return withRetry(operation, {
      stepName: 'tts',
      onRetry: onRetry ? (attempt, error, delay) => {
        onRetry(attempt, error)
      } : undefined
    })
  },

  /**
   * Retry database operations
   */
  async database<T>(
    operation: () => Promise<T>,
    onRetry?: (attempt: number, error: Error) => void
  ): Promise<T> {
    return withRetry(operation, {
      stepName: 'database',
      onRetry: onRetry ? (attempt, error, delay) => {
        onRetry(attempt, error)
      } : undefined
    })
  },

  /**
   * Retry real-time operations (subscriptions, activity updates)
   */
  async realTime<T>(
    operation: () => Promise<T>,
    onRetry?: (attempt: number, error: Error) => void
  ): Promise<T> {
    return withRetry(operation, {
      stepName: 'real-time',
      onRetry: onRetry ? (attempt, error, delay) => {
        onRetry(attempt, error)
      } : undefined
    })
  }
}

/**
 * Network-aware retry delay calculator (utility function)
 */
export function getRetryDelay(stepName: string, attempt: number): number {
  const config = RETRY_CONFIGS[stepName] || RETRY_CONFIGS.database
  return calculateDelay(attempt, config)
}

/**
 * Check if we should retry based on current network conditions
 */
export function shouldRetryOnNetwork(): boolean {
  const quality = networkQualityDetector.getCurrentQuality()
  
  // Always retry on slow networks (they're more prone to temporary failures)
  // Skip retries on unknown network conditions to avoid unnecessary delays
  return quality !== 'unknown'
}