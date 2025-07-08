interface PerformanceMetric {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceLogger {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private completedMetrics: PerformanceMetric[] = [];
  private maxCompletedMetrics = 1000; // Keep last 1000 metrics

  start(operation: string, metadata?: Record<string, any>): void {
    this.metrics.set(operation, {
      operation,
      startTime: performance.now(),
      metadata
    });
  }

  end(operation: string, additionalMetadata?: Record<string, any>): void {
    const metric = this.metrics.get(operation);
    if (!metric) {
      console.warn(`Performance metric '${operation}' was not started`);
      return;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    
    if (additionalMetadata) {
      metric.metadata = { ...metric.metadata, ...additionalMetadata };
    }

    this.completedMetrics.push(metric);
    this.metrics.delete(operation);

    // Keep only the last N metrics to prevent memory leak
    if (this.completedMetrics.length > this.maxCompletedMetrics) {
      this.completedMetrics = this.completedMetrics.slice(-this.maxCompletedMetrics);
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log(`⏱️ ${operation}: ${metric.duration.toFixed(2)}ms`, metric.metadata);
    }
  }

  measure<T>(operation: string, fn: () => T, metadata?: Record<string, any>): T {
    this.start(operation, metadata);
    try {
      const result = fn();
      this.end(operation);
      return result;
    } catch (error) {
      this.end(operation, { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  async measureAsync<T>(
    operation: string, 
    fn: () => Promise<T>, 
    metadata?: Record<string, any>
  ): Promise<T> {
    this.start(operation, metadata);
    try {
      const result = await fn();
      this.end(operation);
      return result;
    } catch (error) {
      this.end(operation, { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.completedMetrics];
  }

  getAverageByOperation(operation: string): number | null {
    const metrics = this.completedMetrics.filter(m => m.operation === operation);
    if (metrics.length === 0) return null;
    
    const total = metrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    return total / metrics.length;
  }

  getPercentile(operation: string, percentile: number): number | null {
    const metrics = this.completedMetrics
      .filter(m => m.operation === operation && m.duration !== undefined)
      .sort((a, b) => (a.duration || 0) - (b.duration || 0));
    
    if (metrics.length === 0) return null;
    
    const index = Math.ceil((percentile / 100) * metrics.length) - 1;
    return metrics[index].duration || null;
  }

  getSummary(): Record<string, any> {
    const operations = new Set(this.completedMetrics.map(m => m.operation));
    const summary: Record<string, any> = {};

    operations.forEach(op => {
      const metrics = this.completedMetrics.filter(m => m.operation === op);
      const durations = metrics
        .map(m => m.duration)
        .filter((d): d is number => d !== undefined);

      if (durations.length > 0) {
        summary[op] = {
          count: metrics.length,
          average: this.getAverageByOperation(op),
          p50: this.getPercentile(op, 50),
          p95: this.getPercentile(op, 95),
          p99: this.getPercentile(op, 99),
          min: Math.min(...durations),
          max: Math.max(...durations)
        };
      }
    });

    return summary;
  }

  clear(): void {
    this.metrics.clear();
    this.completedMetrics = [];
  }

  /**
   * Log an event with optional metadata (alias for start+end)
   */
  logEvent(operation: string, metadata?: Record<string, any>): void {
    this.start(operation, metadata)
    this.end(operation)
  }

  /**
   * Start an operation and return the start time (backwards compatibility)
   */
  startOperation(operation: string, metadata?: Record<string, any>): number {
    this.start(operation, metadata)
    return performance.now()
  }

  /**
   * End an operation with the start time (backwards compatibility)
   */
  endOperation(operation: string, startTime: number, additionalMetadata?: Record<string, any>): { duration: number; operation: string } {
    this.end(operation, additionalMetadata)
    const duration = performance.now() - startTime
    return { duration, operation }
  }
}

// Export singleton instance
export const performanceLogger = new PerformanceLogger();

// Export common operation names as constants
export const PERF_OPS = {
  // Audio operations
  AUDIO_RECORDING_START: 'audio.recording.start',
  AUDIO_RECORDING_STOP: 'audio.recording.stop',
  AUDIO_PROCESSING: 'audio.processing',
  
  // API operations
  API_WHISPER: 'api.whisper',
  API_TRANSLATION: 'api.translation',
  API_TTS: 'api.tts',
  
  // Database operations
  DB_MESSAGE_CREATE: 'db.message.create',
  DB_MESSAGE_UPDATE: 'db.message.update',
  DB_SESSION_JOIN: 'db.session.join',
  
  // Real-time operations
  RT_MESSAGE_SEND: 'realtime.message.send',
  RT_MESSAGE_RECEIVE: 'realtime.message.receive',
  RT_STATUS_UPDATE: 'realtime.status.update',
  
  // UI operations
  UI_RENDER: 'ui.render',
  UI_MESSAGE_DISPLAY: 'ui.message.display',
  UI_AUDIO_VISUALIZER: 'ui.audio.visualizer',
  
  // Workflow operations
  WORKFLOW_STEP_START: 'workflow.step.start',
  WORKFLOW_STEP_COMPLETE: 'workflow.step.complete',
  WORKFLOW_STEP_FAIL: 'workflow.step.fail'
} as const;