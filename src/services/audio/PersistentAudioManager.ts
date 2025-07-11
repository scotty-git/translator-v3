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
  
  // Audio level tracking for silence detection
  private audioLevels: number[] = []
  private silenceThresholds = {
    avgLevel: 0.8,      // Average level threshold (adjusted for real environment with background noise)
    maxLevel: 0.9,      // Maximum level threshold (must have significant peaks for real speech)
    minSamples: 10      // Minimum number of samples required for analysis
  }
  
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
      
      console.log('📊 Audio analysis setup complete', {
        fftSize: this.analyser.fftSize,
        bufferLength,
        smoothingTimeConstant: this.analyser.smoothingTimeConstant,
        audioContextState: this.audioContext.state,
        isIOS: this.isIOS
      })
      
    } catch (error) {
      console.warn('⚠️ Audio analysis setup failed:', error)
      // Continue without visualization - not critical
    }
  }
  
  /**
   * Start audio level monitoring (like working project)
   */
  private startAudioLevelMonitoring(): void {
    if (!this.analyser || !this.dataArray) {
      console.warn('⚠️ Audio level monitoring not available:', {
        analyser: !!this.analyser,
        dataArray: !!this.dataArray
      })
      return
    }
    
    console.log('📊 Starting audio level monitoring for visualization')
    
    const monitorLevel = () => {
      if (this.state !== 'recording') {
        console.log('📊 Audio level monitoring stopped - not recording')
        return
      }
      
      // Get frequency data
      this.analyser!.getByteFrequencyData(this.dataArray!)
      
      // Calculate RMS (Root Mean Square) for volume level
      let sum = 0
      for (let i = 0; i < this.dataArray!.length; i++) {
        sum += this.dataArray![i] * this.dataArray![i]
      }
      const rms = Math.sqrt(sum / this.dataArray!.length)
      
      // Different normalization for mobile devices
      const normalizationFactor = this.isIOS ? 30 : 40
      const normalizedLevel = Math.min(rms / normalizationFactor, 1)
      
      // Store audio level for silence detection
      this.audioLevels.push(normalizedLevel)
      
      // Send to callback for visualization
      if (this.onAudioData) {
        this.onAudioData(normalizedLevel)
      }
      
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
          
          // Reset recording chunks and audio levels
          this.recordingChunks = []
          this.audioLevels = []
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
      
      // Check minimum recording duration - mobile devices need longer recordings
      const minDuration = this.isMobileDevice() ? 0.3 : 0.5
      if (duration < minDuration) {
        console.warn('⚠️ Recording too short:', duration.toFixed(2) + 's', '(min:', minDuration + 's)')
        throw new Error(`Recording too short: ${duration.toFixed(2)}s (minimum: ${minDuration}s)`)
      }
      
      // Check for silent recording before processing
      if (this.isSilentRecording()) {
        throw new Error('No speech detected')
      }
      
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
      
      // Compress audio for reduced bandwidth usage
      const compressedBlob = await this.compressAudio(audioBlob)
      
      // Create File object for API
      const audioFile = this.createAudioFile(compressedBlob)
      
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
      this.setState('idle') // Reset state to allow future recordings after error
      this.handleError(error as Error)
    }
  }
  
  /**
   * Check if the recording is likely silent based on audio levels
   */
  private isSilentRecording(): boolean {
    // Require minimum number of samples for reliable analysis
    if (this.audioLevels.length < this.silenceThresholds.minSamples) {
      console.log('🔇 Insufficient audio samples for silence detection:', this.audioLevels.length)
      return true
    }
    
    // Calculate average and maximum audio levels
    const avgLevel = this.audioLevels.reduce((a, b) => a + b, 0) / this.audioLevels.length
    const maxLevel = Math.max(...this.audioLevels)
    
    console.log('🔇 Silence detection analysis:', {
      samples: this.audioLevels.length,
      avgLevel: avgLevel.toFixed(4),
      maxLevel: maxLevel.toFixed(4),
      thresholds: this.silenceThresholds
    })
    
    // Recording is considered silent if both average and max levels are below thresholds
    const isSilent = avgLevel < this.silenceThresholds.avgLevel && maxLevel < this.silenceThresholds.maxLevel
    
    if (isSilent) {
      console.log('🔇 Silent recording detected - will not send to OpenAI')
    } else {
      console.log('✅ Audio detected - proceeding to transcription')
    }
    
    return isSilent
  }

  /**
   * Validate audio blob (like working project)
   */
  private validateAudioBlob(audioBlob: Blob): boolean {
    if (!audioBlob || audioBlob.size === 0) {
      console.error('❌ Invalid audio blob: empty or null')
      return false
    }
    
    // Mobile devices (especially iOS) may generate smaller audio blobs
    const minSize = this.isMobileDevice() ? 100 : 1000
    if (audioBlob.size < minSize) {
      console.error('❌ Invalid audio blob: too small -', audioBlob.size, 'bytes (min:', minSize, 'bytes)')
      return false
    }
    
    return true
  }
  
  /**
   * Detect if running on mobile device
   */
  private isMobileDevice(): boolean {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
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
   * Compress audio by downsampling to 16kHz mono
   * This reduces file size by ~66% for typical 48kHz stereo audio
   */
  private async compressAudio(audioBlob: Blob): Promise<Blob> {
    console.log('🗜️ Starting audio compression...')
    console.log('   • Original size:', (audioBlob.size / 1024).toFixed(2) + 'KB')
    
    try {
      // Convert blob to array buffer
      const arrayBuffer = await audioBlob.arrayBuffer()
      
      // Create a temporary audio context for processing
      const offlineCtx = new OfflineAudioContext(1, 1, 16000) // 1 channel, 1 sample, 16kHz
      
      // Decode the audio data
      const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer)
      
      // Create a new offline context with target parameters
      const targetSampleRate = 16000 // 16kHz for Whisper
      const targetChannels = 1 // Mono
      const targetLength = Math.floor(audioBuffer.duration * targetSampleRate)
      
      const compressCtx = new OfflineAudioContext(
        targetChannels,
        targetLength,
        targetSampleRate
      )
      
      // Create buffer source
      const source = compressCtx.createBufferSource()
      source.buffer = audioBuffer
      
      // Connect and start
      source.connect(compressCtx.destination)
      source.start(0)
      
      // Render the compressed audio
      const compressedBuffer = await compressCtx.startRendering()
      
      // Convert to WAV format for better compatibility
      const wavBlob = await this.audioBufferToWav(compressedBuffer)
      
      console.log('   • Compressed size:', (wavBlob.size / 1024).toFixed(2) + 'KB')
      console.log('   • Compression ratio:', ((1 - wavBlob.size / audioBlob.size) * 100).toFixed(1) + '%')
      console.log('✅ Audio compression complete')
      
      return wavBlob
      
    } catch (error) {
      console.error('❌ Audio compression failed:', error)
      console.log('⚠️ Falling back to original audio')
      return audioBlob // Return original if compression fails
    }
  }
  
  /**
   * Convert AudioBuffer to WAV blob
   */
  private async audioBufferToWav(audioBuffer: AudioBuffer): Promise<Blob> {
    const length = audioBuffer.length * audioBuffer.numberOfChannels * 2 + 44
    const buffer = new ArrayBuffer(length)
    const view = new DataView(buffer)
    const channels: Float32Array[] = []
    let offset = 0
    let pos = 0
    
    // Write WAV header
    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true)
      pos += 2
    }
    
    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true)
      pos += 4
    }
    
    // Write string
    const writeString = (str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(pos++, str.charCodeAt(i))
      }
    }
    
    // RIFF header
    writeString('RIFF')
    view.setUint32(pos, length - 8, true)
    pos += 4
    writeString('WAVE')
    
    // fmt sub-chunk
    writeString('fmt ')
    view.setUint32(pos, 16, true) // subchunk size
    pos += 4
    view.setUint16(pos, 1, true) // PCM format
    pos += 2
    view.setUint16(pos, audioBuffer.numberOfChannels, true)
    pos += 2
    view.setUint32(pos, audioBuffer.sampleRate, true)
    pos += 4
    view.setUint32(pos, audioBuffer.sampleRate * 2 * audioBuffer.numberOfChannels, true) // byte rate
    pos += 4
    view.setUint16(pos, audioBuffer.numberOfChannels * 2, true) // block align
    pos += 2
    view.setUint16(pos, 16, true) // bits per sample
    pos += 2
    
    // data sub-chunk
    writeString('data')
    view.setUint32(pos, length - pos - 4, true) // subchunk size
    pos += 4
    
    // Write interleaved data
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i))
    }
    
    while (pos < length) {
      for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset])) // clamp
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF // scale to 16-bit
        view.setInt16(pos, sample, true)
        pos += 2
      }
      offset++
    }
    
    return new Blob([buffer], { type: 'audio/wav' })
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
    
    // Reset to idle state after a brief delay to allow future recordings
    setTimeout(() => {
      if (this.state === 'error') {
        this.setState('idle')
      }
    }, 100)
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