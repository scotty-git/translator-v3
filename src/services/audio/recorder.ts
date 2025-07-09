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
    console.log('🎙️ AudioRecorderService.startRecording() called')
    console.log('📊 Current recorder state:', this.state)
    
    return performanceLogger.measureAsync(
      PERF_OPS.AUDIO_RECORDING_START,
      async () => {
        try {
          console.log('🍎 Checking iOS audio context readiness...')
          // Ensure iOS audio context is ready if on iOS
          const isIOSReady = await ensureIOSAudioContextReady()
          console.log('🍎 iOS audio context ready:', isIOSReady)
          
          if (!isIOSReady) {
            console.log('⚠️ iOS audio context not ready, checking requirements...')
            // On iOS, check if this is due to needing user interaction
            const audioInfo = iosAudioContextManager.getIOSAudioInfo()
            console.log('🍎 iOS audio info:', audioInfo)
            
            if (audioInfo.isIOS && audioInfo.requiresUserInteraction) {
              const errorMsg = 'iOS requires user interaction to enable audio recording. Please tap to start recording.'
              console.error('❌ iOS audio context error:', errorMsg)
              throw new Error(errorMsg)
            }
          }

          // Get optimized media constraints for current network quality
          const mediaConstraints = QualityDegradationService.getMediaConstraints()
          console.log(`🎚️ Using audio quality: ${QualityDegradationService.getCurrentConfig().description}`)
          console.log('📋 Media constraints:', JSON.stringify(mediaConstraints, null, 2))
          
          // Check for microphone permissions with network-optimized settings
          console.log('🎤 Requesting microphone access with getUserMedia...')
          console.log('🔧 navigator.mediaDevices available:', !!navigator.mediaDevices)
          console.log('🔧 getUserMedia available:', !!navigator.mediaDevices?.getUserMedia)
          
          const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
          console.log('✅ getUserMedia succeeded, got stream:', !!stream)
          console.log('📊 Stream details:', {
            id: stream.id,
            active: stream.active,
            audioTracks: stream.getAudioTracks().length,
            videoTracks: stream.getVideoTracks().length
          })
          
          // Log audio track details
          const audioTracks = stream.getAudioTracks()
          audioTracks.forEach((track, index) => {
            console.log(`🎵 Audio track ${index}:`, {
              id: track.id,
              label: track.label,
              kind: track.kind,
              enabled: track.enabled,
              muted: track.muted,
              readyState: track.readyState,
              settings: track.getSettings(),
              constraints: track.getConstraints()
            })
          })

          console.log('💾 Setting up recording variables...')
          this.audioStream = stream;
          this.recordingChunks = [];
          this.startTime = Date.now();
          console.log('✅ Recording variables set')

          // Create MediaRecorder
          console.log('🎬 Creating MediaRecorder...')
          console.log('📋 MediaRecorder config:', {
            mimeType: this.config.mimeType,
            audioBitsPerSecond: this.config.audioBitsPerSecond
          })
          
          // Check MediaRecorder support
          console.log('🔧 MediaRecorder available:', !!window.MediaRecorder)
          console.log('🔧 MIME type supported:', MediaRecorder.isTypeSupported(this.config.mimeType || ''))
          
          this.mediaRecorder = new MediaRecorder(stream, {
            mimeType: this.config.mimeType,
            audioBitsPerSecond: this.config.audioBitsPerSecond,
          });
          console.log('✅ MediaRecorder created successfully')
          console.log('📊 MediaRecorder state:', this.mediaRecorder.state)
          console.log('📊 MediaRecorder mimeType:', this.mediaRecorder.mimeType)

          // Set up event handlers
          console.log('🔗 Setting up MediaRecorder event handlers...')
          
          this.mediaRecorder.ondataavailable = (event) => {
            console.log('📦 Data available event:', {
              dataSize: event.data.size,
              dataType: event.data.type,
              timestamp: new Date().toISOString()
            })
            if (event.data.size > 0) {
              this.recordingChunks.push(event.data);
              console.log('💾 Added chunk to recording, total chunks:', this.recordingChunks.length)
            }
          };

          this.mediaRecorder.onstop = () => {
            console.log('🛑 MediaRecorder stop event triggered')
            this.handleRecordingComplete();
          };

          this.mediaRecorder.onerror = (event) => {
            console.error('💥 MediaRecorder error event:', event.error)
            this.handleError(new Error('MediaRecorder error: ' + event.error));
          };
          
          console.log('✅ Event handlers set up')

          // Start recording with optimized data collection for speed
          console.log('▶️ Starting MediaRecorder...')
          console.log('📊 Pre-start MediaRecorder state:', this.mediaRecorder.state)
          
          this.mediaRecorder.start(250); // Collect data every 250ms (less overhead)
          console.log('✅ MediaRecorder.start(250) called')
          console.log('📊 Post-start MediaRecorder state:', this.mediaRecorder.state)
          
          console.log('🎯 Setting recorder state to recording...')
          this.setState('recording');
          console.log('✅ Recorder state set to recording')
          
          console.log('🎙️ AudioRecorderService.startRecording() completed successfully!')

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
          console.error('💥 AudioRecorderService.startRecording() catch block reached')
          console.error('❌ Error details:', {
            name: (error as Error).name,
            message: (error as Error).message,
            stack: (error as Error).stack,
            toString: (error as Error).toString()
          })
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
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('🚨 AudioRecorder.handleError() called - DETAILED ERROR ANALYSIS')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('❌ Error object:', error);
    console.error('📋 Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      toString: error.toString()
    })
    
    console.log('🔍 Current recorder state analysis:')
    console.log('   📊 Current state:', this.state)
    console.log('   🎙️ MediaRecorder exists:', !!this.mediaRecorder)
    console.log('   🎵 Audio stream exists:', !!this.audioStream)
    console.log('   💾 Recording chunks count:', this.recordingChunks.length)
    
    if (this.mediaRecorder) {
      console.log('   📊 MediaRecorder state:', this.mediaRecorder.state)
      console.log('   🎬 MediaRecorder mimeType:', this.mediaRecorder.mimeType)
    }
    
    if (this.audioStream) {
      console.log('   📊 Audio stream active:', this.audioStream.active)
      console.log('   🎵 Audio tracks count:', this.audioStream.getAudioTracks().length)
      this.audioStream.getAudioTracks().forEach((track, index) => {
        console.log(`   🎵 Track ${index} state:`, {
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState
        })
      })
    }
    
    console.log('🎯 Setting state to error...')
    this.setState('error');
    
    console.log('🧹 Cleaning up resources...')
    this.cleanup();
    
    console.log('📞 Calling onError callback...')
    this.onError?.(error);
    
    console.log('🚨 AudioRecorder.handleError() completed')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
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