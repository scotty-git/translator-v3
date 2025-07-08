/**
 * iOS Audio Context Fix for Mobile Safari
 * 
 * iOS Safari has strict audio context restrictions that require user interaction
 * to enable audio context and Web Audio API functionality. This module provides
 * utilities to properly initialize and manage audio contexts on iOS devices.
 */

import { performanceLogger } from '@/lib/performance'

interface IOSAudioContextConfig {
  enableLowLatency?: boolean
  sampleRate?: number
  bufferSize?: number
  enableEchoCancellation?: boolean
}

export class IOSAudioContextManager {
  private static instance: IOSAudioContextManager | null = null
  private audioContext: AudioContext | null = null
  private isInitialized = false
  private isIOS = false
  private requiresUserInteraction = true
  private config: IOSAudioContextConfig

  private constructor(config: IOSAudioContextConfig = {}) {
    this.config = {
      enableLowLatency: true,
      sampleRate: 44100,
      bufferSize: 4096,
      enableEchoCancellation: true,
      ...config
    }
    
    this.detectIOS()
    this.setupEventListeners()
  }

  static getInstance(config?: IOSAudioContextConfig): IOSAudioContextManager {
    if (!IOSAudioContextManager.instance) {
      IOSAudioContextManager.instance = new IOSAudioContextManager(config)
    }
    return IOSAudioContextManager.instance
  }

  /**
   * Detect if running on iOS device
   */
  private detectIOS(): void {
    if (typeof window === 'undefined') return

    // Check User Agent for iOS
    const userAgent = navigator.userAgent || navigator.vendor
    this.isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream
    
    // Additional check for iOS 13+ on iPad (reports as macOS)
    if (!this.isIOS && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
      this.isIOS = true
    }

    console.log(`🍎 iOS Detection: ${this.isIOS ? 'iOS device' : 'Non-iOS device'}`)
  }

  /**
   * Set up event listeners for user interaction
   */
  private setupEventListeners(): void {
    if (!this.isIOS) return

    // iOS requires user interaction to enable audio context
    const userEvents = ['touchstart', 'touchend', 'click', 'keydown']
    
    const handleUserInteraction = () => {
      if (this.requiresUserInteraction) {
        this.initializeAudioContext()
        // Remove listeners after first interaction
        userEvents.forEach(event => {
          document.removeEventListener(event, handleUserInteraction, true)
        })
      }
    }

    userEvents.forEach(event => {
      document.addEventListener(event, handleUserInteraction, true)
    })
  }

  /**
   * Initialize audio context with iOS-specific settings
   */
  private async initializeAudioContext(): Promise<void> {
    if (this.isInitialized || !this.isIOS) return

    try {
      await performanceLogger.measureAsync(
        'ios_audio_context_init',
        async () => {
          // Create audio context with iOS-optimized settings
          const contextOptions: AudioContextOptions = {
            latencyHint: this.config.enableLowLatency ? 'interactive' : 'balanced',
            sampleRate: this.config.sampleRate
          }

          this.audioContext = new AudioContext(contextOptions)

          // iOS requires resuming the audio context after user interaction
          if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume()
          }

          this.isInitialized = true
          this.requiresUserInteraction = false

          console.log('🎵 iOS Audio Context initialized successfully')
          console.log(`📊 Sample Rate: ${this.audioContext.sampleRate}Hz`)
          console.log(`🔊 Audio Context State: ${this.audioContext.state}`)
        }
      )
    } catch (error) {
      console.error('❌ Failed to initialize iOS audio context:', error)
      throw error
    }
  }

  /**
   * Get audio context (will initialize if needed on user interaction)
   */
  async getAudioContext(): Promise<AudioContext | null> {
    if (!this.isIOS) {
      // For non-iOS devices, create a standard audio context
      if (!this.audioContext) {
        this.audioContext = new AudioContext()
      }
      return this.audioContext
    }

    if (!this.isInitialized && this.requiresUserInteraction) {
      console.warn('🚨 iOS Audio Context requires user interaction to initialize')
      return null
    }

    if (!this.isInitialized) {
      await this.initializeAudioContext()
    }

    return this.audioContext
  }

  /**
   * Get optimized media constraints for iOS audio recording
   */
  getIOSMediaConstraints(): MediaStreamConstraints {
    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: this.config.enableEchoCancellation,
        noiseSuppression: true,
        autoGainControl: true,
        // iOS-specific optimizations
        sampleRate: this.config.sampleRate,
        channelCount: 1, // Mono for better performance
        latency: this.config.enableLowLatency ? 0.01 : 0.02 // 10ms or 20ms
      }
    }

    if (this.isIOS) {
      // iOS-specific constraints
      const audioConstraints = constraints.audio as MediaTrackConstraints
      audioConstraints.sampleSize = 16
      audioConstraints.volume = 1.0
    }

    return constraints
  }

  /**
   * Test if audio context is working properly
   */
  async testAudioContext(): Promise<boolean> {
    try {
      const context = await this.getAudioContext()
      if (!context) return false

      // Test with a simple oscillator
      const oscillator = context.createOscillator()
      const gainNode = context.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(context.destination)
      
      // Set very low volume for test
      gainNode.gain.setValueAtTime(0.001, context.currentTime)
      oscillator.frequency.setValueAtTime(440, context.currentTime)
      
      oscillator.start(context.currentTime)
      oscillator.stop(context.currentTime + 0.1)
      
      return true
    } catch (error) {
      console.error('❌ Audio context test failed:', error)
      return false
    }
  }

  /**
   * Resume audio context if suspended (iOS requirement)
   */
  async resumeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
      console.log('🔊 Audio context resumed')
    }
  }

  /**
   * Get current audio context state
   */
  getAudioContextState(): AudioContextState | null {
    return this.audioContext?.state || null
  }

  /**
   * Check if iOS audio context is properly initialized
   */
  isAudioContextReady(): boolean {
    return this.isInitialized && this.audioContext?.state === 'running'
  }

  /**
   * Get iOS-specific audio information
   */
  getIOSAudioInfo(): {
    isIOS: boolean
    isInitialized: boolean
    requiresUserInteraction: boolean
    contextState: AudioContextState | null
    sampleRate: number | null
  } {
    return {
      isIOS: this.isIOS,
      isInitialized: this.isInitialized,
      requiresUserInteraction: this.requiresUserInteraction,
      contextState: this.getAudioContextState(),
      sampleRate: this.audioContext?.sampleRate || null
    }
  }

  /**
   * Cleanup audio context
   */
  async cleanup(): Promise<void> {
    if (this.audioContext) {
      await this.audioContext.close()
      this.audioContext = null
    }
    this.isInitialized = false
    this.requiresUserInteraction = true
  }
}

// Export singleton instance
export const iosAudioContextManager = IOSAudioContextManager.getInstance()

/**
 * Helper function to ensure iOS audio context is ready before audio operations
 */
export async function ensureIOSAudioContextReady(): Promise<boolean> {
  const manager = iosAudioContextManager
  const info = manager.getIOSAudioInfo()
  
  if (!info.isIOS) {
    // Non-iOS device, audio context should work normally
    return true
  }
  
  if (info.requiresUserInteraction) {
    console.warn('🚨 iOS requires user interaction to enable audio context')
    return false
  }
  
  if (!info.isInitialized) {
    console.warn('🚨 iOS audio context not initialized')
    return false
  }
  
  if (info.contextState === 'suspended') {
    await manager.resumeAudioContext()
  }
  
  return manager.isAudioContextReady()
}

/**
 * Get iOS-optimized media constraints
 */
export function getIOSOptimizedMediaConstraints(): MediaStreamConstraints {
  return iosAudioContextManager.getIOSMediaConstraints()
}

/**
 * Test iOS audio context functionality
 */
export async function testIOSAudioContext(): Promise<{
  isSupported: boolean
  isReady: boolean
  info: ReturnType<typeof iosAudioContextManager.getIOSAudioInfo>
  testResult: boolean
}> {
  const manager = iosAudioContextManager
  const info = manager.getIOSAudioInfo()
  
  const isSupported = typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined'
  const isReady = manager.isAudioContextReady()
  const testResult = await manager.testAudioContext()
  
  return {
    isSupported,
    isReady,
    info,
    testResult
  }
}