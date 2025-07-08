/**
 * Audio Worker Manager for Phase 7
 * Manages Web Workers for audio processing to prevent UI blocking
 * Integrates with existing Phase 4-5 audio system
 */

import { performanceLogger, PERF_OPS } from '@/lib/performance'
import type { 
  AudioWorkerMessage, 
  AudioWorkerResponse, 
  AudioAnalysisResult, 
  AudioCompressionOptions 
} from '@/workers/audioProcessor.worker'

export class AudioWorkerManager {
  private static instance: AudioWorkerManager | null = null
  private worker: Worker | null = null
  private messageId = 0
  private pendingMessages = new Map<string, {
    resolve: (value: any) => void
    reject: (error: Error) => void
    timer: NodeJS.Timeout
  }>()
  private isInitialized = false
  
  private constructor() {
    this.initializeWorker()
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): AudioWorkerManager {
    if (!this.instance) {
      this.instance = new AudioWorkerManager()
    }
    return this.instance
  }
  
  /**
   * Initialize the Web Worker
   */
  private async initializeWorker(): Promise<void> {
    if (typeof window === 'undefined') {
      console.warn('🚨 [Audio Worker Manager] Web Workers not available in SSR')
      return
    }
    
    try {
      // Create worker from the audio processor
      this.worker = new Worker(
        new URL('@/workers/audioProcessor.worker.ts', import.meta.url),
        { type: 'module' }
      )
      
      // Set up message handler
      this.worker.onmessage = this.handleWorkerMessage.bind(this)
      
      // Set up error handler
      this.worker.onerror = (error) => {
        console.error('🚨 [Audio Worker Manager] Worker error:', error)
        this.rejectAllPending(new Error(`Worker error: ${error.message}`))
      }
      
      // Wait for worker to be ready
      await this.waitForWorkerReady()
      
      this.isInitialized = true
      console.log('🔧 [Audio Worker Manager] Initialized successfully')
      
      performanceLogger.logEvent('audio-worker-init', { success: true })
      
    } catch (error) {
      console.error('🚨 [Audio Worker Manager] Failed to initialize worker:', error)
      performanceLogger.logEvent('audio-worker-init', { success: false, error: String(error) })
    }
  }
  
  /**
   * Wait for worker to signal ready
   */
  private waitForWorkerReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Worker initialization timeout'))
      }, 5000)
      
      const handleReady = (event: MessageEvent) => {
        if (event.data.type === 'WORKER_READY') {
          clearTimeout(timeout)
          this.worker?.removeEventListener('message', handleReady)
          resolve()
        }
      }
      
      this.worker?.addEventListener('message', handleReady)
    })
  }
  
  /**
   * Handle messages from worker
   */
  private handleWorkerMessage(event: MessageEvent<AudioWorkerResponse>) {
    const { id, type, data, error } = event.data
    
    const pending = this.pendingMessages.get(id)
    if (!pending) {
      console.warn(`🚨 [Audio Worker Manager] Received response for unknown message: ${id}`)
      return
    }
    
    // Clean up
    clearTimeout(pending.timer)
    this.pendingMessages.delete(id)
    
    if (type === 'ERROR' || error) {
      console.error(`❌ [Audio Worker Manager] Worker error for ${id}:`, error)
      pending.reject(new Error(error || 'Unknown worker error'))
    } else {
      console.log(`✅ [Audio Worker Manager] Worker success for ${id}:`, type)
      pending.resolve(data)
    }
  }
  
  /**
   * Send message to worker with timeout
   */
  private sendMessage<T>(
    type: AudioWorkerMessage['type'], 
    data: any, 
    timeout = 30000
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.worker || !this.isInitialized) {
        reject(new Error('Audio worker not initialized'))
        return
      }
      
      const id = `msg-${++this.messageId}`
      
      // Set up timeout
      const timer = setTimeout(() => {
        this.pendingMessages.delete(id)
        reject(new Error(`Worker message timeout: ${type}`))
      }, timeout)
      
      // Store pending message
      this.pendingMessages.set(id, { resolve, reject, timer })
      
      // Send message
      const message: AudioWorkerMessage = { id, type, data }
      this.worker.postMessage(message)
      
      console.log(`📤 [Audio Worker Manager] Sent: ${type} (${id})`)
    })
  }
  
  /**
   * Compress audio using worker
   */
  async compressAudio(
    audioBuffer: ArrayBuffer, 
    options: AudioCompressionOptions = { quality: 'medium' }
  ): Promise<ArrayBuffer> {
    performanceLogger.start('audio-worker-compress')
    
    try {
      console.log(`🗜️ [Audio Worker Manager] Compressing ${audioBuffer.byteLength} bytes (${options.quality} quality)`)
      
      const result = await this.sendMessage<ArrayBuffer>('COMPRESS_AUDIO', {
        buffer: audioBuffer,
        options
      })
      
      performanceLogger.end('audio-worker-compress')
      
      const compressionRatio = (1 - result.byteLength / audioBuffer.byteLength) * 100
      console.log(`✅ [Audio Worker Manager] Compression complete: ${compressionRatio.toFixed(1)}% reduction`)
      
      performanceLogger.logEvent(PERF_OPS.AUDIO_PROCESSING, {
        operation: 'compress',
        originalSize: audioBuffer.byteLength,
        compressedSize: result.byteLength,
        compressionRatio,
        quality: options.quality
      })
      
      return result
      
    } catch (error) {
      performanceLogger.end('audio-worker-compress')
      console.error('❌ [Audio Worker Manager] Compression failed:', error)
      throw error
    }
  }
  
  /**
   * Analyze audio properties using worker
   */
  async analyzeAudio(audioBuffer: ArrayBuffer): Promise<AudioAnalysisResult> {
    performanceLogger.start('audio-worker-analyze')
    
    try {
      console.log(`📊 [Audio Worker Manager] Analyzing ${audioBuffer.byteLength} bytes`)
      
      const result = await this.sendMessage<AudioAnalysisResult>('ANALYZE_AUDIO', {
        buffer: audioBuffer
      })
      
      performanceLogger.end('audio-worker-analyze')
      
      console.log(`✅ [Audio Worker Manager] Analysis complete:`, result)
      
      performanceLogger.logEvent(PERF_OPS.AUDIO_PROCESSING, {
        operation: 'analyze',
        size: audioBuffer.byteLength,
        peak: result.peak,
        rms: result.rms,
        duration: result.duration
      })
      
      return result
      
    } catch (error) {
      performanceLogger.end('audio-worker-analyze')
      console.error('❌ [Audio Worker Manager] Analysis failed:', error)
      throw error
    }
  }
  
  /**
   * Convert audio format using worker
   */
  async convertFormat(
    audioBuffer: ArrayBuffer, 
    targetFormat: 'wav' | 'mp3' | 'webm'
  ): Promise<ArrayBuffer> {
    performanceLogger.start('audio-worker-convert')
    
    try {
      console.log(`🔄 [Audio Worker Manager] Converting ${audioBuffer.byteLength} bytes to ${targetFormat}`)
      
      const result = await this.sendMessage<ArrayBuffer>('CONVERT_FORMAT', {
        buffer: audioBuffer,
        format: targetFormat
      })
      
      performanceLogger.end('audio-worker-convert')
      
      console.log(`✅ [Audio Worker Manager] Format conversion complete`)
      
      performanceLogger.logEvent(PERF_OPS.AUDIO_PROCESSING, {
        operation: 'convert',
        originalSize: audioBuffer.byteLength,
        convertedSize: result.byteLength,
        targetFormat
      })
      
      return result
      
    } catch (error) {
      performanceLogger.end('audio-worker-convert')
      console.error('❌ [Audio Worker Manager] Format conversion failed:', error)
      throw error
    }
  }
  
  /**
   * Normalize audio levels using worker
   */
  async normalizeAudio(
    audioBuffer: ArrayBuffer, 
    targetLevel: number = 0.8
  ): Promise<ArrayBuffer> {
    performanceLogger.start('audio-worker-normalize')
    
    try {
      console.log(`🎚️ [Audio Worker Manager] Normalizing ${audioBuffer.byteLength} bytes to ${targetLevel} level`)
      
      const result = await this.sendMessage<ArrayBuffer>('NORMALIZE_AUDIO', {
        buffer: audioBuffer,
        targetLevel
      })
      
      performanceLogger.end('audio-worker-normalize')
      
      console.log(`✅ [Audio Worker Manager] Normalization complete`)
      
      performanceLogger.logEvent(PERF_OPS.AUDIO_PROCESSING, {
        operation: 'normalize',
        size: audioBuffer.byteLength,
        targetLevel
      })
      
      return result
      
    } catch (error) {
      performanceLogger.end('audio-worker-normalize')
      console.error('❌ [Audio Worker Manager] Normalization failed:', error)
      throw error
    }
  }
  
  /**
   * Check if worker is available and ready
   */
  isReady(): boolean {
    return this.isInitialized && this.worker !== null
  }
  
  /**
   * Get worker status for debugging
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      hasWorker: this.worker !== null,
      pendingMessages: this.pendingMessages.size
    }
  }
  
  /**
   * Reject all pending messages (for cleanup)
   */
  private rejectAllPending(error: Error) {
    this.pendingMessages.forEach(pending => {
      clearTimeout(pending.timer)
      pending.reject(error)
    })
    this.pendingMessages.clear()
  }
  
  /**
   * Cleanup worker
   */
  destroy() {
    console.log('🧹 [Audio Worker Manager] Cleaning up worker')
    
    this.rejectAllPending(new Error('Worker manager destroyed'))
    
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    
    this.isInitialized = false
    
    if (AudioWorkerManager.instance === this) {
      AudioWorkerManager.instance = null
    }
  }
}

// Export singleton instance
export const audioWorkerManager = AudioWorkerManager.getInstance()