/**
 * RetryManager - Advanced retry logic with exponential backoff and circuit breakers for Phase 8
 * Builds on Phase 5 network resilience with enhanced error handling and recovery mechanisms
 */

import { ErrorCode, ErrorSeverity, type ErrorMetadata } from '@/lib/errors/ErrorCodes'
import { ErrorManager, type AppError } from '@/lib/errors/ErrorManager'
import { performanceLogger } from '@/lib/performance'

export interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  jitterPercent: number
  retryableErrors: ErrorCode[]
  circuitBreakerThreshold: number
  circuitBreakerTimeout: number
}

export interface RetryAttempt {
  attempt: number
  delay: number
  error?: AppError
  timestamp: number
}

export interface CircuitBreakerState {
  isOpen: boolean
  failures: number
  lastFailureTime: number
  nextRetryTime: number
}

export interface RetryResult<T> {
  success: boolean
  data?: T
  error?: AppError
  attempts: RetryAttempt[]
  totalDuration: number
  circuitBreakerTriggered: boolean
}

/**
 * Default retry configurations for different operation types
 */
export const RETRY_CONFIGS: Record<string, RetryConfig> = {
  // Network operations (API calls)
  network: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitterPercent: 10,
    retryableErrors: [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.NETWORK_TIMEOUT,
      ErrorCode.API_TIMEOUT,
      ErrorCode.API_SERVICE_DOWN,
      ErrorCode.UNKNOWN_ERROR
    ],
    circuitBreakerThreshold: 5,
    circuitBreakerTimeout: 30000
  },

  // Audio operations
  audio: {
    maxAttempts: 2,
    baseDelay: 500,
    maxDelay: 2000,
    backoffMultiplier: 1.5,
    jitterPercent: 15,
    retryableErrors: [
      ErrorCode.AUDIO_RECORDING_FAILED,
      ErrorCode.AUDIO_DEVICE_ERROR,
      ErrorCode.WORKER_FAILED,
      ErrorCode.WORKER_TIMEOUT
    ],
    circuitBreakerThreshold: 3,
    circuitBreakerTimeout: 15000
  },

  // Translation operations
  translation: {
    maxAttempts: 3,
    baseDelay: 2000,
    maxDelay: 15000,
    backoffMultiplier: 2.5,
    jitterPercent: 20,
    retryableErrors: [
      ErrorCode.TRANSLATION_FAILED,
      ErrorCode.TRANSCRIPTION_FAILED,
      ErrorCode.TTS_FAILED,
      ErrorCode.API_RATE_LIMIT,
      ErrorCode.API_TIMEOUT,
      ErrorCode.NETWORK_ERROR
    ],
    circuitBreakerThreshold: 4,
    circuitBreakerTimeout: 60000
  },

  // Session operations
  session: {
    maxAttempts: 2,
    baseDelay: 1500,
    maxDelay: 5000,
    backoffMultiplier: 2,
    jitterPercent: 10,
    retryableErrors: [
      ErrorCode.SESSION_CREATE_FAILED,
      ErrorCode.SESSION_CONNECTION_LOST,
      ErrorCode.SUPABASE_CONNECTION_ERROR,
      ErrorCode.NETWORK_ERROR
    ],
    circuitBreakerThreshold: 3,
    circuitBreakerTimeout: 20000
  },

  // Storage operations
  storage: {
    maxAttempts: 2,
    baseDelay: 500,
    maxDelay: 2000,
    backoffMultiplier: 1.5,
    jitterPercent: 5,
    retryableErrors: [
      ErrorCode.CACHE_ERROR,
      ErrorCode.STORAGE_CORRUPTION
    ],
    circuitBreakerThreshold: 2,
    circuitBreakerTimeout: 10000
  },

  // Default/fallback configuration
  default: {
    maxAttempts: 2,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 2,
    jitterPercent: 10,
    retryableErrors: [
      ErrorCode.UNKNOWN_ERROR,
      ErrorCode.UNEXPECTED_STATE
    ],
    circuitBreakerThreshold: 3,
    circuitBreakerTimeout: 15000
  }
}

export class RetryManager {
  private static circuitBreakers = new Map<string, CircuitBreakerState>()
  private static retryStats = new Map<string, { attempts: number; successes: number; failures: number }>()

  /**
   * Execute operation with retry logic and circuit breaker
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationType: string = 'default',
    customConfig?: Partial<RetryConfig>,
    context?: string
  ): Promise<RetryResult<T>> {
    const config = { ...RETRY_CONFIGS[operationType] || RETRY_CONFIGS.default, ...customConfig }
    const attempts: RetryAttempt[] = []
    const startTime = Date.now()
    
    performanceLogger.start(`retry-${operationType}`)
    
    console.log(`🔄 [RetryManager] Starting ${operationType} operation (max ${config.maxAttempts} attempts)`)

    // Check circuit breaker
    const circuitBreaker = this.getCircuitBreaker(operationType)
    if (this.isCircuitBreakerOpen(circuitBreaker, config)) {
      performanceLogger.end(`retry-${operationType}`)
      
      const error = ErrorManager.createError(
        new Error('Circuit breaker is open'),
        context,
        ErrorCode.API_SERVICE_DOWN
      )
      
      console.log(`🚫 [RetryManager] Circuit breaker open for ${operationType}`)
      
      return {
        success: false,
        error,
        attempts: [],
        totalDuration: Date.now() - startTime,
        circuitBreakerTriggered: true
      }
    }

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      const attemptStart = Date.now()
      
      try {
        console.log(`🎯 [RetryManager] Attempt ${attempt}/${config.maxAttempts} for ${operationType}`)
        
        const result = await operation()
        
        // Success - reset circuit breaker and log
        this.resetCircuitBreaker(operationType)
        this.updateStats(operationType, true)
        
        attempts.push({
          attempt,
          delay: 0,
          timestamp: attemptStart
        })
        
        performanceLogger.end(`retry-${operationType}`)
        
        console.log(`✅ [RetryManager] ${operationType} succeeded on attempt ${attempt}`)
        
        return {
          success: true,
          data: result,
          attempts,
          totalDuration: Date.now() - startTime,
          circuitBreakerTriggered: false
        }
        
      } catch (error) {
        const appError = ErrorManager.createError(error, context)
        
        attempts.push({
          attempt,
          delay: 0,
          error: appError,
          timestamp: attemptStart
        })
        
        console.log(`❌ [RetryManager] Attempt ${attempt} failed:`, appError.code)
        
        // Check if error is retryable
        if (!config.retryableErrors.includes(appError.code)) {
          console.log(`🚫 [RetryManager] Error ${appError.code} is not retryable`)
          this.updateStats(operationType, false)
          performanceLogger.end(`retry-${operationType}`)
          
          return {
            success: false,
            error: appError,
            attempts,
            totalDuration: Date.now() - startTime,
            circuitBreakerTriggered: false
          }
        }
        
        // Record circuit breaker failure
        this.recordCircuitBreakerFailure(operationType)
        
        // If this was the last attempt, fail
        if (attempt === config.maxAttempts) {
          this.updateStats(operationType, false)
          performanceLogger.end(`retry-${operationType}`)
          
          console.log(`💥 [RetryManager] All ${config.maxAttempts} attempts failed for ${operationType}`)
          
          return {
            success: false,
            error: appError,
            attempts,
            totalDuration: Date.now() - startTime,
            circuitBreakerTriggered: false
          }
        }
        
        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, config)
        attempts[attempts.length - 1].delay = delay
        
        console.log(`⏳ [RetryManager] Waiting ${delay}ms before attempt ${attempt + 1}`)
        
        // Wait before retry
        await this.sleep(delay)
      }
    }
    
    // This should never be reached, but TypeScript requires it
    performanceLogger.end(`retry-${operationType}`)
    const fallbackError = ErrorManager.createError(
      new Error('Retry logic error'),
      context,
      ErrorCode.UNEXPECTED_STATE
    )
    
    return {
      success: false,
      error: fallbackError,
      attempts,
      totalDuration: Date.now() - startTime,
      circuitBreakerTriggered: false
    }
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private static calculateDelay(attempt: number, config: RetryConfig): number {
    // Base exponential backoff
    const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1)
    
    // Apply maximum delay limit
    const cappedDelay = Math.min(exponentialDelay, config.maxDelay)
    
    // Add jitter to prevent thundering herd
    const jitterRange = cappedDelay * (config.jitterPercent / 100)
    const jitter = (Math.random() - 0.5) * 2 * jitterRange
    
    return Math.max(0, Math.round(cappedDelay + jitter))
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get or create circuit breaker state
   */
  private static getCircuitBreaker(operationType: string): CircuitBreakerState {
    if (!this.circuitBreakers.has(operationType)) {
      this.circuitBreakers.set(operationType, {
        isOpen: false,
        failures: 0,
        lastFailureTime: 0,
        nextRetryTime: 0
      })
    }
    return this.circuitBreakers.get(operationType)!
  }

  /**
   * Check if circuit breaker is open
   */
  private static isCircuitBreakerOpen(
    circuitBreaker: CircuitBreakerState,
    config: RetryConfig
  ): boolean {
    if (!circuitBreaker.isOpen) return false
    
    // Check if timeout has passed
    if (Date.now() >= circuitBreaker.nextRetryTime) {
      console.log(`🔓 [RetryManager] Circuit breaker timeout expired, allowing retry`)
      circuitBreaker.isOpen = false
      circuitBreaker.failures = 0
      return false
    }
    
    return true
  }

  /**
   * Record circuit breaker failure
   */
  private static recordCircuitBreakerFailure(operationType: string): void {
    const circuitBreaker = this.getCircuitBreaker(operationType)
    const config = RETRY_CONFIGS[operationType] || RETRY_CONFIGS.default
    
    circuitBreaker.failures++
    circuitBreaker.lastFailureTime = Date.now()
    
    // Open circuit breaker if threshold reached
    if (circuitBreaker.failures >= config.circuitBreakerThreshold) {
      circuitBreaker.isOpen = true
      circuitBreaker.nextRetryTime = Date.now() + config.circuitBreakerTimeout
      
      console.log(`🔒 [RetryManager] Circuit breaker opened for ${operationType} (${circuitBreaker.failures} failures)`)
    }
  }

  /**
   * Reset circuit breaker on success
   */
  private static resetCircuitBreaker(operationType: string): void {
    const circuitBreaker = this.getCircuitBreaker(operationType)
    
    if (circuitBreaker.isOpen || circuitBreaker.failures > 0) {
      console.log(`🔄 [RetryManager] Circuit breaker reset for ${operationType}`)
    }
    
    circuitBreaker.isOpen = false
    circuitBreaker.failures = 0
    circuitBreaker.lastFailureTime = 0
    circuitBreaker.nextRetryTime = 0
  }

  /**
   * Update retry statistics
   */
  private static updateStats(operationType: string, success: boolean): void {
    if (!this.retryStats.has(operationType)) {
      this.retryStats.set(operationType, { attempts: 0, successes: 0, failures: 0 })
    }
    
    const stats = this.retryStats.get(operationType)!
    stats.attempts++
    
    if (success) {
      stats.successes++
    } else {
      stats.failures++
    }
  }

  /**
   * Get retry configuration for a specific operation type (backwards compatibility)
   */
  static getRetryConfig(operationType: string = 'default'): RetryConfig {
    return RETRY_CONFIGS[operationType] || RETRY_CONFIGS.default
  }

  /**
   * Get retry statistics for monitoring
   */
  static getRetryStats() {
    const stats = {
      operations: new Map<string, any>(),
      circuitBreakers: new Map<string, CircuitBreakerState>(),
      totalAttempts: 0,
      totalSuccesses: 0,
      totalFailures: 0
    }

    // Collect operation stats
    this.retryStats.forEach((operationStats, operationType) => {
      const successRate = operationStats.attempts > 0 
        ? (operationStats.successes / operationStats.attempts) * 100 
        : 0
        
      stats.operations.set(operationType, {
        ...operationStats,
        successRate: Math.round(successRate * 100) / 100
      })
      
      stats.totalAttempts += operationStats.attempts
      stats.totalSuccesses += operationStats.successes
      stats.totalFailures += operationStats.failures
    })

    // Collect circuit breaker states
    this.circuitBreakers.forEach((breaker, operationType) => {
      stats.circuitBreakers.set(operationType, { ...breaker })
    })

    return stats
  }

  /**
   * Clear retry statistics and circuit breakers
   */
  static clearStats(): void {
    this.retryStats.clear()
    this.circuitBreakers.clear()
    console.log(`🧹 [RetryManager] Statistics and circuit breakers cleared`)
  }

  /**
   * Test circuit breaker behavior (for testing)
   */
  static testCircuitBreaker(operationType: string): void {
    const circuitBreaker = this.getCircuitBreaker(operationType)
    const config = RETRY_CONFIGS[operationType] || RETRY_CONFIGS.default
    
    // Force circuit breaker to open
    circuitBreaker.failures = config.circuitBreakerThreshold
    circuitBreaker.isOpen = true
    circuitBreaker.nextRetryTime = Date.now() + config.circuitBreakerTimeout
    
    console.log(`🧪 [RetryManager] Circuit breaker forced open for testing: ${operationType}`)
  }

  /**
   * Check if operation should be retried based on error
   */
  static shouldRetry(error: AppError, operationType: string = 'default'): boolean {
    const config = RETRY_CONFIGS[operationType] || RETRY_CONFIGS.default
    return config.retryableErrors.includes(error.code)
  }

  /**
   * Get next retry delay for an operation
   */
  static getNextRetryDelay(attempt: number, operationType: string = 'default'): number {
    const config = RETRY_CONFIGS[operationType] || RETRY_CONFIGS.default
    return this.calculateDelay(attempt, config)
  }

  /**
   * Log retry report for debugging
   */
  static logRetryReport(): void {
    const stats = this.getRetryStats()
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 [RetryManager] Retry Statistics Report')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    console.log(`📈 Overall: ${stats.totalAttempts} attempts, ${stats.totalSuccesses} successes, ${stats.totalFailures} failures`)
    
    stats.operations.forEach((operationStats, operationType) => {
      console.log(`🔧 ${operationType}: ${operationStats.attempts} attempts, ${operationStats.successRate}% success rate`)
    })
    
    stats.circuitBreakers.forEach((breaker, operationType) => {
      const status = breaker.isOpen ? '🔒 OPEN' : '🔓 CLOSED'
      console.log(`⚡ ${operationType}: ${status}, ${breaker.failures} failures`)
    })
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  }
}