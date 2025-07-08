import { performanceLogger, PERF_OPS } from '@/lib/performance';
import { QualityDegradationService } from '@/lib/quality-degradation';
import { iosAudioContextManager, ensureIOSAudioContextReady } from '@/lib/ios-audio-context';

export interface AudioRecordingResult {
  audioFile: File;
  duration: number;
  format: string;
  size: number;
}

export interface RecorderConfig {
  audioBitsPerSecond?: number;
  mimeType?: string;
  maxDuration?: number; // in seconds
}

export type RecorderState = 'idle' | 'recording' | 'processing' | 'error';

export class AudioRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private recordingChunks: Blob[] = [];
  private startTime: number = 0;
  private state: RecorderState = 'idle';
  private config: RecorderConfig;
  
  // Event callbacks
  public onStateChange?: (state: RecorderState) => void;
  public onAudioData?: (audioLevel: number) => void; // For visualizer
  public onComplete?: (result: AudioRecordingResult) => void;
  public onError?: (error: Error) => void;

  constructor(config: RecorderConfig = {}) {
    // Get optimized quality settings for current network
    const qualityConfig = QualityDegradationService.getAudioRecordingConfig()
    
    this.config = {
      audioBitsPerSecond: qualityConfig.audioBitsPerSecond,
      mimeType: this.getBestMimeType(),
      maxDuration: 60, // 1 minute max
      ...config
    };
    
    // Listen for quality changes during recording
    QualityDegradationService.addListener(this.handleQualityChange.bind(this))
  }

  /**
   * Get the best supported MIME type for recording
   */
  private getBestMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus', 
      'audio/webm',
      'audio/ogg',
      'audio/mp4',
      'audio/wav'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    // Fallback to default
    return 'audio/webm';
  }

  /**
   * Start recording audio
   */
  async startRecording(): Promise<void> {
    return performanceLogger.measureAsync(
      PERF_OPS.AUDIO_RECORDING_START,
      async () => {
        try {
          // Ensure iOS audio context is ready if on iOS
          const isIOSReady = await ensureIOSAudioContextReady()
          if (!isIOSReady) {
            // On iOS, check if this is due to needing user interaction
            const audioInfo = iosAudioContextManager.getIOSAudioInfo()
            if (audioInfo.isIOS && audioInfo.requiresUserInteraction) {
              throw new Error('iOS requires user interaction to enable audio recording. Please tap to start recording.')
            }
          }

          // Get optimized media constraints for current network quality
          const mediaConstraints = QualityDegradationService.getMediaConstraints()
          console.log(`🎚️ Using audio quality: ${QualityDegradationService.getCurrentConfig().description}`)
          
          // Check for microphone permissions with network-optimized settings
          const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);

          this.audioStream = stream;
          this.recordingChunks = [];
          this.startTime = Date.now();

          // Create MediaRecorder
          this.mediaRecorder = new MediaRecorder(stream, {
            mimeType: this.config.mimeType,
            audioBitsPerSecond: this.config.audioBitsPerSecond,
          });

          // Set up event handlers
          this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              this.recordingChunks.push(event.data);
            }
          };

          this.mediaRecorder.onstop = () => {
            this.handleRecordingComplete();
          };

          this.mediaRecorder.onerror = (event) => {
            this.handleError(new Error('MediaRecorder error: ' + event.error));
          };

          // Start recording with optimized data collection for speed
          this.mediaRecorder.start(250); // Collect data every 250ms (less overhead)
          this.setState('recording');

          // Set up audio level monitoring for visualizer
          this.setupAudioLevelMonitoring(stream);

          // Auto-stop after max duration
          if (this.config.maxDuration) {
            setTimeout(() => {
              if (this.state === 'recording') {
                this.stopRecording();
              }
            }, this.config.maxDuration * 1000);
          }

        } catch (error) {
          this.handleError(error instanceof Error ? error : new Error('Unknown recording error'));
        }
      },
      { mimeType: this.config.mimeType }
    );
  }

  /**
   * Stop recording audio
   */
  async stopRecording(): Promise<void> {
    return performanceLogger.measureAsync(
      PERF_OPS.AUDIO_RECORDING_STOP,
      async () => {
        if (!this.mediaRecorder || this.state !== 'recording') {
          throw new Error('No active recording to stop');
        }

        this.setState('processing');
        this.mediaRecorder.stop();
        
        // Stop all audio tracks
        if (this.audioStream) {
          this.audioStream.getTracks().forEach(track => track.stop());
        }
      }
    );
  }

  /**
   * Handle recording completion
   */
  private handleRecordingComplete(): void {
    try {
      const duration = (Date.now() - this.startTime) / 1000;
      const audioBlob = new Blob(this.recordingChunks, { 
        type: this.config.mimeType || 'audio/webm' 
      });

      // Convert to File
      const audioFile = new File(
        [audioBlob], 
        `recording_${Date.now()}.${this.getFileExtension()}`,
        { type: audioBlob.type }
      );

      // Log compression effectiveness
      const sizeKB = (audioFile.size / 1024).toFixed(2);
      const rateKBPerSec = ((audioFile.size / duration) / 1024).toFixed(2);
      console.log(`🎤 Recording completed: ${sizeKB}KB, ${duration.toFixed(1)}s`);
      console.log(`📊 Compression rate: ~${rateKBPerSec}KB/sec (target: ~16KB/sec)`);

      const result: AudioRecordingResult = {
        audioFile,
        duration,
        format: audioFile.type,
        size: audioFile.size,
      };

      this.setState('idle');
      this.onComplete?.(result);

    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error('Failed to process recording'));
    }
  }

  /**
   * Set up audio level monitoring for visualizer
   */
  private setupAudioLevelMonitoring(stream: MediaStream): void {
    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const getAudioLevel = () => {
        if (this.state !== 'recording') return;

        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        const normalizedLevel = average / 255; // Normalize to 0-1
        
        this.onAudioData?.(normalizedLevel);
        
        requestAnimationFrame(getAudioLevel);
      };

      getAudioLevel();
    } catch (error) {
      console.warn('Audio level monitoring failed:', error);
      // Continue without visualizer - not critical
    }
  }

  /**
   * Get file extension based on MIME type
   */
  private getFileExtension(): string {
    const mimeType = this.config.mimeType || 'audio/webm';
    
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('ogg')) return 'ogg';
    if (mimeType.includes('mp4')) return 'm4a';
    if (mimeType.includes('wav')) return 'wav';
    
    return 'webm'; // Default
  }

  /**
   * Set state and notify listeners
   */
  private setState(newState: RecorderState): void {
    this.state = newState;
    this.onStateChange?.(newState);
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    console.error('AudioRecorder error:', error);
    this.setState('error');
    this.cleanup();
    this.onError?.(error);
  }

  /**
   * Handle quality degradation changes during recording
   */
  private handleQualityChange(qualityConfig: any): void {
    if (this.state === 'recording') {
      console.log(`🎚️ Quality changed during recording: ${qualityConfig.description}`)
      // Note: We can't change quality mid-recording, but we can log it
      // The next recording will use the new quality settings
    }
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
    
    if (this.mediaRecorder) {
      this.mediaRecorder = null;
    }
    
    this.recordingChunks = [];
    
    // Remove quality listener to prevent memory leaks
    QualityDegradationService.removeListener(this.handleQualityChange.bind(this))
  }

  /**
   * Get current state
   */
  getState(): RecorderState {
    return this.state;
  }

  /**
   * Check if browser supports audio recording
   */
  static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    
    return !!(navigator.mediaDevices && 
              typeof navigator.mediaDevices.getUserMedia === 'function' && 
              'MediaRecorder' in window);
  }

  /**
   * Get supported MIME types
   */
  static getSupportedMimeTypes(): string[] {
    const types = [
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus', 
      'audio/webm',
      'audio/ogg',
      'audio/mp4',
      'audio/wav'
    ];

    return types.filter(type => MediaRecorder.isTypeSupported(type));
  }
}

// Export as AudioRecorder for backward compatibility
export { AudioRecorderService as AudioRecorder };