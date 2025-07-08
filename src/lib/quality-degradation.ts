import { networkQualityDetector, NetworkQuality } from './network-quality'

export interface QualityConfig {
  networkQuality: NetworkQuality
  audioBitsPerSecond: number
  audioSampleRate: number
  description: string
  expectedFileSize: string // For user awareness
}

/**
 * Quality configurations based on network speed
 * Reduces audio quality on slower networks to maintain performance
 */
export const QUALITY_CONFIGS: Record<NetworkQuality, QualityConfig> = {
  fast: {
    networkQuality: 'fast',
    audioBitsPerSecond: 64000, // High quality for fast networks
    audioSampleRate: 44100,
    description: 'High quality audio',
    expectedFileSize: '~32KB per 10s'
  },
  slow: {
    networkQuality: 'slow',
    audioBitsPerSecond: 32000, // Reduced quality for 3G
    audioSampleRate: 22050,
    description: 'Good quality audio',
    expectedFileSize: '~16KB per 10s'
  },
  'very-slow': {
    networkQuality: 'very-slow',
    audioBitsPerSecond: 16000, // Minimal quality for 2G/Edge
    audioSampleRate: 16000,
    description: 'Optimized for slow connection',
    expectedFileSize: '~8KB per 10s'
  },
  unknown: {
    networkQuality: 'unknown',
    audioBitsPerSecond: 32000, // Default to moderate quality for unknown networks
    audioSampleRate: 22050,
    description: 'Default quality audio',
    expectedFileSize: '~16KB per 10s'
  }
}

export class QualityDegradationService {
  private static currentConfig: QualityConfig = QUALITY_CONFIGS.fast
  private static listeners: Array<(config: QualityConfig) => void> = []

  /**
   * Initialize quality degradation monitoring
   */
  static initialize(): void {
    // Listen to network quality changes
    networkQualityDetector.addListener((quality) => {
      this.updateQualityConfig(quality)
    })

    // Set initial config
    this.updateQualityConfig(networkQualityDetector.getCurrentQuality())
  }

  /**
   * Update quality configuration based on network quality
   */
  private static updateQualityConfig(networkQuality: NetworkQuality): void {
    const newConfig = QUALITY_CONFIGS[networkQuality]
    if (!newConfig) {
      console.warn(`🎚️ Unknown network quality: ${networkQuality}, falling back to default`)
      return
    }
    
    if (!this.currentConfig || newConfig.networkQuality !== this.currentConfig.networkQuality) {
      if (this.currentConfig) {
        console.log(`🎚️ Quality degradation: ${this.currentConfig.description} → ${newConfig.description}`)
        console.log(`📊 Audio bitrate: ${this.currentConfig.audioBitsPerSecond}bps → ${newConfig.audioBitsPerSecond}bps`)
      } else {
        console.log(`🎚️ Quality initialization: ${newConfig.description}`)
        console.log(`📊 Audio bitrate: ${newConfig.audioBitsPerSecond}bps`)
      }
      
      this.currentConfig = newConfig
      this.notifyListeners(newConfig)
    }
  }

  /**
   * Get current quality configuration
   */
  static getCurrentConfig(): QualityConfig {
    return this.currentConfig
  }

  /**
   * Get optimized settings for a specific network quality (backwards compatibility)
   */
  static getOptimizedSettings(networkQuality: NetworkQuality): {
    sampleRate: number
    bitRate: number
    quality: NetworkQuality
    description: string
  } {
    const config = QUALITY_CONFIGS[networkQuality] || QUALITY_CONFIGS.unknown
    return {
      sampleRate: config.audioSampleRate,
      bitRate: Math.round(config.audioBitsPerSecond / 1000), // Convert to kbps
      quality: config.networkQuality,
      description: config.description
    }
  }

  /**
   * Get audio recording config optimized for current network
   */
  static getAudioRecordingConfig(): {
    audioBitsPerSecond: number
    sampleRate: number
    channelCount: number
  } {
    const config = this.getCurrentConfig()
    
    return {
      audioBitsPerSecond: config.audioBitsPerSecond,
      sampleRate: config.audioSampleRate,
      channelCount: 1 // Always mono for speech
    }
  }

  /**
   * Get media constraints optimized for current network
   */
  static getMediaConstraints(): MediaStreamConstraints {
    const config = this.getCurrentConfig()
    
    return {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: config.audioSampleRate,
        channelCount: 1,
        // Additional constraints for quality optimization
        latency: config.networkQuality === 'very-slow' ? 0.1 : 0.05,
        volume: 1.0
      }
    }
  }

  /**
   * Add listener for quality changes
   */
  static addListener(callback: (config: QualityConfig) => void): void {
    this.listeners.push(callback)
  }

  /**
   * Remove listener
   */
  static removeListener(callback: (config: QualityConfig) => void): void {
    const index = this.listeners.indexOf(callback)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  /**
   * Notify all listeners of quality changes
   */
  private static notifyListeners(config: QualityConfig): void {
    this.listeners.forEach(listener => {
      try {
        listener(config)
      } catch (error) {
        console.warn('Quality degradation listener error:', error)
      }
    })
  }

  /**
   * Get quality recommendation for user
   */
  static getQualityStatus(): {
    quality: string
    description: string
    recommendation?: string
  } {
    const config = this.getCurrentConfig()
    
    let recommendation: string | undefined
    
    if (config.networkQuality === 'very-slow') {
      recommendation = 'Audio quality reduced for better performance on slow connection'
    } else if (config.networkQuality === 'slow') {
      recommendation = 'Audio quality optimized for your connection'
    }
    
    return {
      quality: config.networkQuality,
      description: config.description,
      recommendation
    }
  }

  /**
   * Force quality level (for testing or manual override)
   */
  static forceQuality(networkQuality: NetworkQuality): void {
    console.log(`🎚️ Force quality override: ${networkQuality}`)
    this.updateQualityConfig(networkQuality)
  }

  /**
   * Reset to automatic quality detection
   */
  static resetToAuto(): void {
    console.log('🎚️ Reset to automatic quality detection')
    this.updateQualityConfig(networkQualityDetector.getCurrentQuality())
  }

  /**
   * Calculate expected file size for recording duration
   */
  static estimateFileSize(durationSeconds: number): {
    bytes: number
    humanReadable: string
  } {
    const config = this.getCurrentConfig()
    const bytesPerSecond = config.audioBitsPerSecond / 8
    const totalBytes = bytesPerSecond * durationSeconds
    
    // Add small overhead for container format
    const totalBytesWithOverhead = totalBytes * 1.1
    
    const humanReadable = totalBytesWithOverhead < 1024 
      ? `${Math.round(totalBytesWithOverhead)}B`
      : totalBytesWithOverhead < 1024 * 1024
      ? `${Math.round(totalBytesWithOverhead / 1024)}KB`
      : `${(totalBytesWithOverhead / (1024 * 1024)).toFixed(1)}MB`
    
    return {
      bytes: Math.round(totalBytesWithOverhead),
      humanReadable
    }
  }
}