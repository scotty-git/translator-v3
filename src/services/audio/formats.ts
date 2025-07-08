export interface AudioFormat {
  mimeType: string;
  extension: string;
  quality: 'high' | 'medium' | 'low';
  compatibility: 'excellent' | 'good' | 'fair' | 'poor';
  whisperSupport: boolean;
}

export class AudioFormatService {
  /**
   * Available audio formats in order of preference
   */
  static readonly FORMATS: AudioFormat[] = [
    {
      mimeType: 'audio/webm;codecs=opus',
      extension: 'webm',
      quality: 'high',
      compatibility: 'excellent',
      whisperSupport: true,
    },
    {
      mimeType: 'audio/ogg;codecs=opus',
      extension: 'ogg', 
      quality: 'high',
      compatibility: 'good',
      whisperSupport: true,
    },
    {
      mimeType: 'audio/webm',
      extension: 'webm',
      quality: 'medium',
      compatibility: 'excellent',
      whisperSupport: true,
    },
    {
      mimeType: 'audio/ogg',
      extension: 'ogg',
      quality: 'medium', 
      compatibility: 'good',
      whisperSupport: true,
    },
    {
      mimeType: 'audio/mp4',
      extension: 'm4a',
      quality: 'high',
      compatibility: 'excellent',
      whisperSupport: true,
    },
    {
      mimeType: 'audio/wav',
      extension: 'wav',
      quality: 'high',
      compatibility: 'excellent',
      whisperSupport: true,
    }
  ];

  /**
   * Get the best supported format for recording
   */
  static getBestSupportedFormat(): AudioFormat | null {
    for (const format of this.FORMATS) {
      if (this.isFormatSupported(format.mimeType)) {
        return format;
      }
    }
    return null;
  }

  /**
   * Get all supported formats
   */
  static getSupportedFormats(): AudioFormat[] {
    return this.FORMATS.filter(format => 
      this.isFormatSupported(format.mimeType)
    );
  }

  /**
   * Check if a specific format is supported
   */
  static isFormatSupported(mimeType: string): boolean {
    if (typeof MediaRecorder === 'undefined') return false;
    return MediaRecorder.isTypeSupported(mimeType);
  }

  /**
   * Get format by MIME type
   */
  static getFormatByMimeType(mimeType: string): AudioFormat | null {
    return this.FORMATS.find(format => format.mimeType === mimeType) || null;
  }

  /**
   * Convert audio file to a Whisper-compatible format if needed
   */
  static async convertForWhisper(audioFile: File): Promise<File> {
    const format = this.getFormatByMimeType(audioFile.type);
    
    // If already in a Whisper-supported format, return as-is
    if (format?.whisperSupport) {
      return audioFile;
    }

    // For unsupported formats, we would need audio conversion
    // This is complex in the browser without additional libraries
    // For now, we'll attempt to use the original file and let Whisper handle it
    console.warn(`Audio format ${audioFile.type} may not be optimal for Whisper`);
    
    return audioFile;
  }

  /**
   * Get recommended bit rate for a format
   */
  static getRecommendedBitRate(mimeType: string): number {
    const format = this.getFormatByMimeType(mimeType);
    
    switch (format?.quality) {
      case 'high':
        return 192000; // 192 kbps
      case 'medium':
        return 128000; // 128 kbps  
      case 'low':
        return 96000;  // 96 kbps
      default:
        return 128000; // Default
    }
  }

  /**
   * Estimate file size for recording duration
   */
  static estimateFileSize(
    durationSeconds: number, 
    mimeType: string
  ): number {
    const bitRate = this.getRecommendedBitRate(mimeType);
    // Convert bit rate to bytes per second and multiply by duration
    return Math.round((bitRate / 8) * durationSeconds);
  }

  /**
   * Get human-readable format description
   */
  static getFormatDescription(mimeType: string): string {
    const format = this.getFormatByMimeType(mimeType);
    if (!format) return 'Unknown format';

    const qualityEmoji = {
      high: '🟢',
      medium: '🟡', 
      low: '🔴'
    };

    const compatEmoji = {
      excellent: '✅',
      good: '👍',
      fair: '⚠️',
      poor: '❌'
    };

    return `${format.extension.toUpperCase()} ${qualityEmoji[format.quality]} ${compatEmoji[format.compatibility]}`;
  }

  /**
   * Check if browser supports audio recording at all
   */
  static isAudioRecordingSupported(): boolean {
    if (typeof window === 'undefined') return false;
    
    return !!(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      'MediaRecorder' in window &&
      this.getSupportedFormats().length > 0
    );
  }
}