/**
 * PersistentAudioManager - Stream Persistence Strategy
 * 
 * Based on the working project's approach:
 * - Request permissions once on app load
 * - Keep stream alive between recordings
 * - Create/destroy MediaRecorder instances but reuse stream
 * - Maintain AudioContext for iOS compatibility
 */

import { performanceLogger, PERF_OPS } from '@/lib/performance'
import { QualityDegradationService } from '@/lib/quality-degradation'

export interface AudioRecordingResult {
  audioFile: File
  duration: number
  format: string
  size: number
}

export interface SupportedAudioFormat {
  mimeType: string
  extension: string
}

export type RecorderState = 'idle' | 'recording' | 'processing' | 'error'

export class PersistentAudioManager {
  private static instance: PersistentAudioManager | null = null
  
  // Core persistent elements (like working project)
  private audioStream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private supportedFormat: SupportedAudioFormat | null = null
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationFrameId: number | null = null
  
  // Current recording state
  private mediaRecorder: MediaRecorder | null = null
  private recordingChunks: Blob[] = []
  private startTime: number = 0
  private state: RecorderState = 'idle'
  
  // Status flags
  private streamReady: boolean = false
  private permissionDenied: boolean = false
  private isIOS: boolean = false
  
  // Event callbacks
  public onStateChange?: (state: RecorderState) => void
  public onAudioData?: (audioLevel: number) => void
  public onComplete?: (result: AudioRecordingResult) => void
  public onError?: (error: Error) => void
  
  private constructor() {
    this.detectDevice()
    this.detectSupportedFormat()
  }
  
  static getInstance(): PersistentAudioManager {
    if (!PersistentAudioManager.instance) {
      PersistentAudioManager.instance = new PersistentAudioManager()
    }
    return PersistentAudioManager.instance
  }
  
  /**
   * Detect device type for iOS-specific handling
   */
  private detectDevice(): void {
    if (typeof window === 'undefined') return
    
    const userAgent = navigator.userAgent || navigator.vendor
    this.isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream
    
    // Additional check for iOS 13+ on iPad (reports as macOS)
    if (!this.isIOS && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
      this.isIOS = true
    }
    
    console.log(`📱 Device detected: ${this.isIOS ? 'iOS' : 'Non-iOS'}`)
  }
  
  /**
   * Detect supported audio format (once, like working project)
   */
  private detectSupportedFormat(): void {
    const AUDIO_FORMATS: SupportedAudioFormat[] = [
      { mimeType: 'audio/webm;codecs=opus', extension: 'webm' },  // Best quality
      { mimeType: 'audio/webm', extension: 'webm' },             // Chrome/Firefox
      { mimeType: 'audio/mp4', extension: 'mp4' },               // Safari
      { mimeType: 'audio/wav', extension: 'wav' },               // Universal fallback
      { mimeType: 'audio/ogg', extension: 'ogg' }                // Firefox
    ]
    
    for (const format of AUDIO_FORMATS) {
      if (MediaRecorder.isTypeSupported(format.mimeType)) {
        this.supportedFormat = format
        console.log(`🎵 Supported format detected: ${format.mimeType}`)
        return
      }
    }
    
    // Fallback - let browser choose
    this.supportedFormat = { mimeType: '', extension: 'webm' }
    console.log('🎵 Using browser default format')
  }
  
  /**
   * Initialize persistent stream and audio context (like working project)
   * CRITICAL: This must be called on app load, not on first recording
   */
  async initializePersistentStream(): Promise<void> {
    console.log('🔄 Initializing persistent audio stream...')
    
    if (this.streamReady) {
      console.log('✅ Stream already initialized and ready')
      return
    }
    
    try {
      // Get optimized media constraints
      const mediaConstraints = QualityDegradationService.getMediaConstraints()
      console.log('🎚️ Media constraints:', JSON.stringify(mediaConstraints, null, 2))
      
      // Request stream - this is the CRITICAL persistent stream
      console.log('🎤 Requesting persistent microphone stream...')
      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
      
      console.log('✅ Persistent stream obtained:', {
        id: stream.id,
        active: stream.active,
        audioTracks: stream.getAudioTracks().length
      })
      
      // Store the persistent stream
      this.audioStream = stream
      this.streamReady = true
      this.permissionDenied = false
      
      // Initialize audio context for iOS compatibility
      await this.initializeAudioContext()
      
      // Set up audio analysis for visualization
      this.setupAudioAnalysis()
      
      console.log('🎉 Persistent audio manager fully initialized')
      
    } catch (error) {
      console.error('❌ Failed to initialize persistent stream:', error)
      this.handlePermissionError(error as Error)
    }
  }
  
  /**
   * Initialize audio context with iOS compatibility (like working project)
   */
  private async initializeAudioContext(): Promise<void> {
    if (!this.audioStream) return
    
    try {
      // Create audio context with webkit fallback for iOS
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      this.audioContext = new AudioContextClass()
      
      console.log('🎛️ AudioContext created:', {
        state: this.audioContext.state,
        sampleRate: this.audioContext.sampleRate
      })
      
      // iOS requires resuming audio context after user gesture
      if (this.isIOS && this.audioContext.state === 'suspended') {
        console.log('🍎 iOS AudioContext suspended, will resume on user interaction')
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize audio context:', error)
    }
  }
  
  /**
   * Resume audio context for iOS (called on user interaction)
   */
  async resumeAudioContextForIOS(): Promise<void> {
    if (this.isIOS && this.audioContext && this.audioContext.state === 'suspended') {
      console.log('🍎 Resuming iOS AudioContext...')
      await this.audioContext.resume()
      console.log('✅ iOS AudioContext resumed:', this.audioContext.state)
    }
  }
  
  /**
   * Set up audio analysis for real-time visualization
   */
  private setupAudioAnalysis(): void {
    if (!this.audioContext || !this.audioStream) return
    
    try {
      // Create analyser for real-time audio data
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 1024
      this.analyser.smoothingTimeConstant = 0.2
      
      // Connect stream to analyser
      const source = this.audioContext.createMediaStreamSource(this.audioStream)
      source.connect(this.analyser)
      
      // Create data array for frequency analysis
      const bufferLength = this.analyser.frequencyBinCount
      this.dataArray = new Uint8Array(bufferLength)
      
      console.log('📊 Audio analysis setup complete')
      
    } catch (error) {
      console.warn('⚠️ Audio analysis setup failed:', error)
      // Continue without visualization - not critical
    }
  }
  
  /**
   * Start audio level monitoring (like working project)
   */
  private startAudioLevelMonitoring(): void {
    if (!this.analyser || !this.dataArray) return
    
    const monitorLevel = () => {
      if (this.state !== 'recording') return
      
      // Get frequency data
      this.analyser!.getByteFrequencyData(this.dataArray!)
      
      // Calculate RMS (Root Mean Square) for volume level
      let sum = 0
      for (let i = 0; i < this.dataArray!.length; i++) {
        sum += this.dataArray![i] * this.dataArray![i]
      }
      const rms = Math.sqrt(sum / this.dataArray!.length)
      const normalizedLevel = Math.min(rms / 40, 1)
      
      // Send to callback for visualization
      this.onAudioData?.(normalizedLevel)
      
      // Continue monitoring
      this.animationFrameId = requestAnimationFrame(monitorLevel)
    }
    
    monitorLevel()
  }
  
  /**
   * Stop audio level monitoring
   */
  private stopAudioLevelMonitoring(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    this.onAudioData?.(0) // Reset visualization
  }
  
  /**
   * Start recording using persistent stream (like working project)
   */
  async startRecording(): Promise<void> {
    console.log('🎬 Starting recording with persistent stream...')
    
    if (!this.streamReady || !this.audioStream) {
      throw new Error('Audio stream not ready. Please refresh the page.')
    }
    
    if (this.state !== 'idle') {
      throw new Error('Recording already in progress')
    }
    
    return performanceLogger.measureAsync(
      PERF_OPS.AUDIO_RECORDING_START,
      async () => {
        try {
          // Resume iOS audio context if needed
          await this.resumeAudioContextForIOS()
          
          // Create MediaRecorder with persistent stream
          const mediaRecorderOptions = this.supportedFormat!.mimeType ? 
            { mimeType: this.supportedFormat!.mimeType } : {}
          
          this.mediaRecorder = new MediaRecorder(this.audioStream!, mediaRecorderOptions)
          console.log('🎙️ MediaRecorder created with persistent stream')
          
          // Reset recording chunks
          this.recordingChunks = []
          this.startTime = Date.now()
          
          // Set up data collection handler
          this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              this.recordingChunks.push(event.data)
              console.log('📦 Audio chunk collected:', event.data.size, 'bytes')
            }
          }
          
          // Set up stop handler (like working project)
          this.mediaRecorder.onstop = async () => {
            console.log('🛑 MediaRecorder stopped, processing audio...')
            await this.processRecordedAudio()
          }
          
          // Set up error handler
          this.mediaRecorder.onerror = (event) => {
            console.error('❌ MediaRecorder error:', event.error)
            this.handleError(new Error('MediaRecorder error: ' + event.error))
          }
          
          // Start recording
          this.mediaRecorder.start()
          this.setState('recording')
          
          // Start audio level monitoring
          this.startAudioLevelMonitoring()
          
          console.log('✅ Recording started successfully')
          
        } catch (error) {
          console.error('❌ Failed to start recording:', error)
          this.handleError(error as Error)
        }
      }
    )
  }
  
  /**
   * Stop recording (like working project)
   */
  async stopRecording(): Promise<void> {
    console.log('🛑 Stopping recording...')
    
    if (!this.mediaRecorder || this.state !== 'recording') {
      throw new Error('No active recording to stop')
    }
    
    return performanceLogger.measureAsync(
      PERF_OPS.AUDIO_RECORDING_STOP,
      async () => {
        this.setState('processing')
        
        // Stop audio level monitoring
        this.stopAudioLevelMonitoring()
        
        // Stop MediaRecorder (triggers onstop handler)
        this.mediaRecorder!.stop()
        this.mediaRecorder = null
        
        console.log('✅ Recording stop initiated')
      }
    )
  }
  
  /**
   * Process recorded audio chunks (like working project)
   */
  private async processRecordedAudio(): Promise<void> {
    try {
      const duration = (Date.now() - this.startTime) / 1000
      
      // Combine all chunks into single blob
      const audioBlob = new Blob(this.recordingChunks, {
        type: this.supportedFormat!.mimeType || 'audio/webm'
      })
      
      console.log('📊 Audio processing:', {
        duration: duration.toFixed(2) + 's',
        size: (audioBlob.size / 1024).toFixed(2) + 'KB',
        type: audioBlob.type
      })
      
      // Validate audio blob
      if (!this.validateAudioBlob(audioBlob)) {
        throw new Error('Invalid audio recording')
      }
      
      // Create File object for API
      const audioFile = this.createAudioFile(audioBlob)
      
      const result: AudioRecordingResult = {
        audioFile,
        duration,
        format: audioFile.type,
        size: audioFile.size
      }
      
      this.setState('idle')
      this.onComplete?.(result)
      
      console.log('✅ Audio processing complete')
      
    } catch (error) {
      console.error('❌ Audio processing failed:', error)
      this.handleError(error as Error)
    }
  }
  
  /**
   * Validate audio blob (like working project)
   */
  private validateAudioBlob(audioBlob: Blob): boolean {
    if (!audioBlob || audioBlob.size === 0) {
      console.error('❌ Invalid audio blob: empty or null')
      return false
    }
    
    if (audioBlob.size < 1000) { // Less than 1KB
      console.error('❌ Invalid audio blob: too small')
      return false
    }
    
    return true
  }
  
  /**
   * Create audio file from blob (like working project)
   */
  private createAudioFile(audioBlob: Blob): File {
    const format = this.supportedFormat!
    let fileName = `audio.${format.extension}`
    let mimeType = format.mimeType || audioBlob.type || 'audio/webm'
    
    // Ensure correct extension from MIME type
    if (mimeType.includes('mp4')) fileName = 'audio.mp4'
    else if (mimeType.includes('wav')) fileName = 'audio.wav'
    else if (mimeType.includes('ogg')) fileName = 'audio.ogg'
    
    return new File([audioBlob], fileName, { type: mimeType })
  }
  
  /**
   * Handle permission errors
   */
  private handlePermissionError(error: Error): void {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      this.permissionDenied = true
      console.error('❌ Microphone permission denied')
      this.onError?.(new Error('Microphone access denied. Please grant permissions and refresh.'))
    } else {
      console.error('❌ Stream initialization error:', error)
      this.onError?.(error)
    }
  }
  
  /**
   * Handle general errors
   */
  private handleError(error: Error): void {
    console.error('❌ PersistentAudioManager error:', error)
    this.setState('error')
    this.cleanup()
    this.onError?.(error)
  }
  
  /**
   * Set state and notify listeners
   */
  private setState(newState: RecorderState): void {
    this.state = newState
    this.onStateChange?.(newState)
  }
  
  /**
   * Cleanup current recording (but keep persistent stream)
   */
  private cleanup(): void {
    if (this.mediaRecorder) {
      this.mediaRecorder = null
    }
    
    this.recordingChunks = []
    this.stopAudioLevelMonitoring()
    
    // NOTE: We do NOT close the persistent stream or audio context
    // That's the key difference from the old approach
  }
  
  /**
   * Full cleanup (call on app unmount)
   */
  destroy(): void {
    this.cleanup()
    
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop())
      this.audioStream = null
    }
    
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    
    this.streamReady = false
    PersistentAudioManager.instance = null
  }
  
  /**
   * Retry permission request (like working project)
   */
  async retryPermission(): Promise<void> {
    console.log('🔄 Retrying permission request...')
    this.permissionDenied = false
    this.streamReady = false
    
    // Close existing stream if any
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop())
      this.audioStream = null
    }
    
    // Reinitialize
    await this.initializePersistentStream()
  }

  /**
   * Check and request permissions if not already granted
   */
  async ensurePermissions(): Promise<boolean> {
    console.log('🔐 Checking microphone permissions...')
    
    // If stream already ready, permissions are granted
    if (this.streamReady) {
      console.log('✅ Stream already ready, permissions granted')
      return true
    }
    
    // If permission was previously denied, need user action
    if (this.permissionDenied) {
      console.log('❌ Permission previously denied')
      throw new Error('Microphone permission denied. Please grant permission and refresh.')
    }
    
    // Try to initialize stream (will request permissions)
    try {
      await this.initializePersistentStream()
      return this.streamReady
    } catch (error) {
      console.error('❌ Failed to get permissions:', error)
      return false
    }
  }
  
  /**
   * Get current state
   */
  getState(): RecorderState {
    return this.state
  }
  
  /**
   * Check if stream is ready
   */
  isStreamReady(): boolean {
    return this.streamReady
  }
  
  /**
   * Check if permission was denied
   */
  isPermissionDenied(): boolean {
    return this.permissionDenied
  }
  
  /**
   * Check if recording is supported
   */
  static isSupported(): boolean {
    if (typeof window === 'undefined') return false
    
    return !!(navigator.mediaDevices && 
              typeof navigator.mediaDevices.getUserMedia === 'function' && 
              'MediaRecorder' in window)
  }
}

// Export singleton instance
export const persistentAudioManager = PersistentAudioManager.getInstance()