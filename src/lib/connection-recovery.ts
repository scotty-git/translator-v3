import { performanceLogger } from './performance'

interface RetryConfig {
  maxRetries: number;
  delays: number[]; // milliseconds
  onRetry?: (attempt: number, nextDelay: number) => void;
  onFailure?: (error: Error) => void;
  onSuccess?: () => void;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 6,
  delays: [1000, 2000, 4000, 8000, 15000, 30000], // Progressive delays as per PRD
};

export class ConnectionRecovery {
  private retryAttempt = 0;
  private retryTimeout: NodeJS.Timeout | null = null;
  private isRetrying = false;

  constructor(private config: RetryConfig = DEFAULT_RETRY_CONFIG) {}

  async retry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    this.isRetrying = true;
    
    while (this.retryAttempt < this.config.maxRetries) {
      try {
        performanceLogger.start(`connection.retry.${operationName}`, {
          attempt: this.retryAttempt + 1,
        });

        const result = await operation();
        
        performanceLogger.end(`connection.retry.${operationName}`, {
          success: true,
        });

        // Success! Reset retry state
        this.retryAttempt = 0;
        this.isRetrying = false;
        this.config.onSuccess?.();
        
        return result;
      } catch (error) {
        performanceLogger.end(`connection.retry.${operationName}`, {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        this.retryAttempt++;
        
        if (this.retryAttempt >= this.config.maxRetries) {
          this.isRetrying = false;
          const finalError = new Error(
            `Failed after ${this.config.maxRetries} attempts: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
          this.config.onFailure?.(finalError);
          throw finalError;
        }

        // Calculate next delay
        const nextDelay = this.config.delays[this.retryAttempt - 1] || 
                         this.config.delays[this.config.delays.length - 1];
        
        this.config.onRetry?.(this.retryAttempt, nextDelay);
        
        // Wait before next retry
        await this.delay(nextDelay);
      }
    }

    throw new Error('Retry logic failed unexpectedly');
  }

  stop(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    this.retryAttempt = 0;
    this.isRetrying = false;
  }

  reset(): void {
    this.stop();
  }

  getRetryAttempt(): number {
    return this.retryAttempt;
  }

  isCurrentlyRetrying(): boolean {
    return this.isRetrying;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.retryTimeout = setTimeout(resolve, ms);
    });
  }
}

// Singleton instance for global connection recovery
export const globalConnectionRecovery = new ConnectionRecovery({
  ...DEFAULT_RETRY_CONFIG,
  onRetry: (attempt, nextDelay) => {
    console.log(`🔄 Retry attempt ${attempt}, next retry in ${nextDelay / 1000}s`);
  },
  onFailure: (error) => {
    console.error('❌ Connection recovery failed:', error);
  },
  onSuccess: () => {
    console.log('✅ Connection recovered successfully');
  },
});

// Helper function for retrying Supabase operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  customConfig?: Partial<RetryConfig>
): Promise<T> {
  const recovery = customConfig 
    ? new ConnectionRecovery({ ...DEFAULT_RETRY_CONFIG, ...customConfig })
    : globalConnectionRecovery;
    
  return recovery.retry(operation, operationName);
}