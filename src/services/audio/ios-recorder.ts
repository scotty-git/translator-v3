/**
 * iOS-Enhanced Audio Recorder
 * 
 * Extends the base AudioRecorderService with iOS-specific optimizations
 * and fixes for Mobile Safari audio context restrictions.
 */

import { AudioRecorderService, RecorderConfig, AudioRecordingResult, RecorderState } from './recorder'
import { iosAudioContextManager, ensureIOSAudioContextReady, getIOSOptimizedMediaConstraints } from '@/lib/ios-audio-context'
import { performanceLogger } from '@/lib/performance'

export interface IOSRecorderConfig extends RecorderConfig {
  enableIOSOptimizations?: boolean
  autoResumeAudioContext?: boolean
  fallbackToStandardRecorder?: boolean
}

export class IOSAudioRecorderService extends AudioRecorderService {
  private iosConfig: IOSRecorderConfig
  private audioContextManager = iosAudioContextManager
  private isIOS = false

  constructor(config: IOSRecorderConfig = {}) {
    super(config)
    
    this.iosConfig = {
      enableIOSOptimizations: true,
      autoResumeAudioContext: true,
      fallbackToStandardRecorder: true,
      ...config
    }
    
    this.detectIOS()
    this.initializeIOSOptimizations()
  }

  /**
   * Detect if running on iOS
   */
  private detectIOS(): void {
    if (typeof window === 'undefined') return
    
    const userAgent = navigator.userAgent || navigator.vendor
    this.isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream
    
    // Additional check for iOS 13+ on iPad
    if (!this.isIOS && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
      this.isIOS = true
    }
  }

  /**
   * Initialize iOS-specific optimizations
   */
  private async initializeIOSOptimizations(): Promise<void> {
    if (!this.isIOS || !this.iosConfig.enableIOSOptimizations) return

    try {
      await performanceLogger.measureAsync(
        'ios_recorder_init',
        async () => {
          // Pre-initialize audio context on first user interaction
          const info = this.audioContextManager.getIOSAudioInfo()
          console.log(`🍎 iOS Recorder initialized: ${JSON.stringify(info)}`)
        }
      )
    } catch (error) {
      console.warn('⚠️ iOS optimization initialization failed:', error)
    }
  }

  /**
   * iOS-enhanced start recording with audio context management
   */
  async startRecording(): Promise<void> {
    if (!this.isIOS) {
      // Use standard recording for non-iOS devices
      return super.startRecording()
    }

    return performanceLogger.measureAsync(
      'ios_audio_recording_start',
      async () => {
        try {
          // Check if iOS audio context is ready
          const isReady = await ensureIOSAudioContextReady()
          if (!isReady) {
            throw new Error('iOS audio context not ready. User interaction required.')
          }

          // Resume audio context if suspended
          if (this.iosConfig.autoResumeAudioContext) {
            await this.audioContextManager.resumeAudioContext()
          }

          // Get iOS-optimized media constraints
          const constraints = this.getIOSOptimizedConstraints()
          console.log('🎙️ Using iOS-optimized recording constraints')

          // Start recording with enhanced error handling
          await this.startIOSRecording(constraints)

        } catch (error) {
          console.error('❌ iOS recording failed:', error)
          
          // Fallback to standard recorder if enabled
          if (this.iosConfig.fallbackToStandardRecorder) {
            console.log('🔄 Falling back to standard recorder')
            return super.startRecording()
          }
          
          throw error
        }
      }
    )
  }

  /**
   * Start iOS-specific recording with enhanced constraints
   */
  private async startIOSRecording(constraints: MediaStreamConstraints): Promise<void> {
    try {
      // Request media with iOS-specific constraints
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      
      // Verify audio context is still active
      const audioContext = await this.audioContextManager.getAudioContext()
      if (!audioContext || audioContext.state !== 'running') {
        throw new Error('Audio context not active during recording start')
      }

      // Use the enhanced stream for recording
      await this.createIOSMediaRecorder(stream)

    } catch (error) {
      throw new Error(`iOS recording initialization failed: ${error.message}`)
    }
  }

  /**
   * Create iOS-optimized MediaRecorder
   */
  private async createIOSMediaRecorder(stream: MediaStream): Promise<void> {
    try {
      this.audioStream = stream
      this.recordingChunks = []
      this.startTime = Date.now()

      // iOS-specific MediaRecorder configuration
      const recorderOptions: MediaRecorderOptions = {
        mimeType: this.getIOSOptimizedMimeType(),
        audioBitsPerSecond: this.getIOSOptimizedBitrate(),
      }

      this.mediaRecorder = new MediaRecorder(stream, recorderOptions)

      // Enhanced event handlers for iOS
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordingChunks.push(event.data)
        }
      }

      this.mediaRecorder.onstop = () => {
        this.handleIOSRecordingComplete()
      }

      this.mediaRecorder.onerror = (event) => {
        this.handleError(new Error(`iOS MediaRecorder error: ${event.error}`))
      }

      // Start recording with iOS-optimized settings
      this.mediaRecorder.start(200) // Slightly faster for iOS
      this.setState('recording')

      // Set up iOS-optimized audio monitoring
      this.setupIOSAudioLevelMonitoring(stream)

      console.log('🎤 iOS recording started successfully')

    } catch (error) {
      throw new Error(`iOS MediaRecorder creation failed: ${error.message}`)
    }
  }

  /**
   * Get iOS-optimized media constraints
   */
  private getIOSOptimizedConstraints(): MediaStreamConstraints {
    return getIOSOptimizedMediaConstraints()
  }

  /**
   * Get iOS-optimized MIME type
   */
  private getIOSOptimizedMimeType(): string {
    // iOS Safari has specific MIME type preferences
    const iosTypes = [
      'audio/mp4',
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg'
    ]

    for (const type of iosTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }

    return 'audio/webm' // Fallback
  }

  /**
   * Get iOS-optimized bitrate
   */
  private getIOSOptimizedBitrate(): number {
    // iOS prefers specific bitrates for optimal performance
    const iOSBitrates = [32000, 64000, 128000]
    
    // Use configured bitrate if it's iOS-optimal
    if (this.config.audioBitsPerSecond && iOSBitrates.includes(this.config.audioBitsPerSecond)) {
      return this.config.audioBitsPerSecond
    }

    return 32000 // Default iOS-optimal bitrate
  }

  /**
   * iOS-optimized audio level monitoring
   */
  private setupIOSAudioLevelMonitoring(stream: MediaStream): void {
    // Enhanced audio monitoring for iOS with better performance
    this.audioContextManager.getAudioContext().then(audioContext => {
      if (!audioContext) return

      try {
        const analyser = audioContext.createAnalyser()
        const source = audioContext.createMediaStreamSource(stream)
        
        // iOS-optimized analyser settings
        analyser.fftSize = 128 // Smaller for better iOS performance
        analyser.smoothingTimeConstant = 0.3
        source.connect(analyser)

        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)

        const getAudioLevel = () => {
          if (this.getState() !== 'recording') return

          analyser.getByteFrequencyData(dataArray)
          
          // iOS-optimized level calculation
          const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength
          const normalizedLevel = Math.min(average / 128, 1) // iOS-specific normalization
          
          this.onAudioData?.(normalizedLevel)
          
          requestAnimationFrame(getAudioLevel)
        }

        getAudioLevel()
      } catch (error) {
        console.warn('⚠️ iOS audio level monitoring failed:', error)
        // Continue without visualizer - not critical for iOS
      }
    })
  }

  /**
   * Handle iOS recording completion with enhanced processing
   */
  private handleIOSRecordingComplete(): void {
    try {
      const duration = (Date.now() - this.startTime) / 1000
      const audioBlob = new Blob(this.recordingChunks, { 
        type: this.getIOSOptimizedMimeType()
      })

      // iOS-optimized file creation
      const audioFile = new File(
        [audioBlob],
        `ios_recording_${Date.now()}.${this.getIOSFileExtension()}`,
        { type: audioBlob.type }
      )

      // Enhanced logging for iOS
      const sizeKB = (audioFile.size / 1024).toFixed(2)
      const compressionRatio = (audioFile.size / (duration * 4000)).toFixed(2) // vs raw audio
      console.log(`🍎 iOS Recording completed: ${sizeKB}KB, ${duration.toFixed(1)}s`)
      console.log(`📊 iOS Compression ratio: ${compressionRatio}x`)

      const result: AudioRecordingResult = {
        audioFile,
        duration,
        format: audioFile.type,
        size: audioFile.size,
      }

      this.setState('idle')
      this.onComplete?.(result)

    } catch (error) {
      this.handleError(new Error(`iOS recording completion failed: ${error.message}`))
    }
  }

  /**
   * Get iOS-specific file extension
   */
  private getIOSFileExtension(): string {
    const mimeType = this.getIOSOptimizedMimeType()
    
    if (mimeType.includes('mp4')) return 'm4a'
    if (mimeType.includes('webm')) return 'webm'
    if (mimeType.includes('ogg')) return 'ogg'
    
    return 'm4a' // iOS default
  }

  /**
   * iOS-specific error handling
   */
  protected handleError(error: Error): void {
    console.error('🍎 iOS Audio Recorder Error:', error)
    
    // Add iOS-specific error context
    const audioInfo = this.audioContextManager.getIOSAudioInfo()
    console.error('🍎 iOS Audio Context Info:', audioInfo)
    
    super.handleError(error)
  }

  /**
   * Test iOS audio functionality
   */
  async testIOSAudio(): Promise<{
    isSupported: boolean
    audioContextReady: boolean
    mediaRecorderSupported: boolean
    optimizedMimeType: string
    errorMessage?: string
  }> {
    try {
      const isSupported = IOSAudioRecorderService.isSupported()
      const audioContextReady = await ensureIOSAudioContextReady()
      const mediaRecorderSupported = 'MediaRecorder' in window
      const optimizedMimeType = this.getIOSOptimizedMimeType()

      return {
        isSupported,
        audioContextReady,
        mediaRecorderSupported,
        optimizedMimeType
      }
    } catch (error) {
      return {
        isSupported: false,
        audioContextReady: false,
        mediaRecorderSupported: false,
        optimizedMimeType: 'unknown',
        errorMessage: error.message
      }
    }
  }

  /**
   * Get iOS-specific recorder information
   */
  getIOSInfo(): {
    isIOS: boolean
    isOptimized: boolean
    audioContextInfo: ReturnType<typeof iosAudioContextManager.getIOSAudioInfo>
    supportedMimeTypes: string[]
  } {
    return {
      isIOS: this.isIOS,
      isOptimized: this.iosConfig.enableIOSOptimizations || false,
      audioContextInfo: this.audioContextManager.getIOSAudioInfo(),
      supportedMimeTypes: IOSAudioRecorderService.getSupportedMimeTypes()
    }
  }
}

/**
 * Factory function to create the appropriate recorder for the platform
 */
export function createOptimizedAudioRecorder(config: IOSRecorderConfig = {}): AudioRecorderService {
  // Always use iOS-enhanced recorder - it handles both iOS and non-iOS devices
  return new IOSAudioRecorderService(config)
}

/**
 * Test iOS audio compatibility
 */
export async function testIOSAudioCompatibility(): Promise<{
  platform: 'ios' | 'other'
  audioContextSupported: boolean
  mediaRecorderSupported: boolean
  recommendedRecorder: 'ios-enhanced' | 'standard'
  issues: string[]
}> {
  const issues: string[] = []
  
  // Detect platform
  const userAgent = navigator.userAgent || navigator.vendor
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream
  
  // Check audio context support
  const audioContextSupported = typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined'
  if (!audioContextSupported) {
    issues.push('AudioContext not supported')
  }
  
  // Check MediaRecorder support
  const mediaRecorderSupported = 'MediaRecorder' in window
  if (!mediaRecorderSupported) {
    issues.push('MediaRecorder not supported')
  }
  
  // Check iOS-specific issues
  if (isIOS) {
    const audioContextReady = await ensureIOSAudioContextReady()
    if (!audioContextReady) {
      issues.push('iOS Audio Context requires user interaction')
    }
  }
  
  return {
    platform: isIOS ? 'ios' : 'other',
    audioContextSupported,
    mediaRecorderSupported,
    recommendedRecorder: isIOS ? 'ios-enhanced' : 'standard',
    issues
  }
}