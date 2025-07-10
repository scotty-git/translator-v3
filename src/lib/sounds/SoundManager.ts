import { useState, useCallback } from 'react'
import { UserManager } from '@/lib/user/UserManager'

/**
 * Sound Manager - Based on oldappfeatures.md specifications
 * 
 * Provides configurable sound notifications for:
 * - Message arrival sounds
 * - Button interaction feedback
 * - Translation completion
 * - Error notifications
 * 
 * Features:
 * - Graceful audio permission handling
 * - User preference controls
 * - Web Audio API for high-quality sounds
 * - Fallback for browsers without Web Audio API
 */

export type SoundType = 
  | 'message_received'
  | 'message_sent' 
  | 'translation_complete'
  | 'recording_start'
  | 'recording_stop'
  | 'button_click'
  | 'error'
  | 'notification'

export type VolumeLevel = 'quiet' | 'loud'
export type NotificationSound = 'chime' | 'bell' | 'pop'

interface SoundConfig {
  frequency: number
  duration: number
  volume: number
  type: 'sine' | 'square' | 'triangle' | 'sawtooth'
}

export class SoundManager {
  private static instance: SoundManager
  private audioContext: AudioContext | null = null
  private isEnabled: boolean = true
  private hasPermission: boolean = false
  private volumeLevel: VolumeLevel = 'loud'
  private notificationSound: NotificationSound = 'chime'
  private messageNotifications: boolean = true
  private interfaceSounds: boolean = false
  
  // Three different notification sound presets
  private notificationPresets: Record<NotificationSound, SoundConfig> = {
    chime: {
      frequency: 800,
      duration: 0.15,
      volume: 0.3,
      type: 'sine'
    },
    bell: {
      frequency: 523.25, // C5 note
      duration: 0.3,
      volume: 0.3,
      type: 'triangle'
    },
    pop: {
      frequency: 1047, // C6 note
      duration: 0.08,
      volume: 0.3,
      type: 'square'
    }
  }
  
  // Sound configurations based on common notification patterns
  private soundConfigs: Record<SoundType, SoundConfig> = {
    message_received: {
      frequency: 800,
      duration: 0.15,
      volume: 0.3,
      type: 'sine'
    },
    message_sent: {
      frequency: 600,
      duration: 0.1,
      volume: 0.2,
      type: 'sine'
    },
    translation_complete: {
      frequency: 1000,
      duration: 0.2,
      volume: 0.4,
      type: 'triangle'
    },
    recording_start: {
      frequency: 440,
      duration: 0.05,
      volume: 0.2,
      type: 'square'
    },
    recording_stop: {
      frequency: 330,
      duration: 0.05,
      volume: 0.2,
      type: 'square'
    },
    button_click: {
      frequency: 1200,
      duration: 0.03,
      volume: 0.1,
      type: 'sine'
    },
    error: {
      frequency: 200,
      duration: 0.3,
      volume: 0.5,
      type: 'square'
    },
    notification: {
      frequency: 880,
      duration: 0.25,
      volume: 0.3,
      type: 'triangle'
    }
  }

  private constructor() {
    this.loadPreferences()
    this.initializeAudioContext()
  }

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager()
    }
    return SoundManager.instance
  }

  /**
   * Initialize Web Audio API context
   * Handles browser compatibility and user gesture requirements
   */
  private async initializeAudioContext(): Promise<void> {
    try {
      // Check if Web Audio API is supported
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) {
        console.warn('🔊 Web Audio API not supported, sound notifications disabled')
        return
      }

      this.audioContext = new AudioContextClass()
      
      // Handle suspended context (requires user interaction)
      if (this.audioContext.state === 'suspended') {
        console.log('🔊 Audio context suspended, will resume on first user interaction')
      }
      
      this.hasPermission = true
      console.log('🔊 Sound manager initialized with Web Audio API')
      
    } catch (error) {
      console.warn('🔊 Failed to initialize audio context:', error)
      this.audioContext = null
    }
  }

  /**
   * Resume audio context after user interaction
   * Required by modern browsers for audio permission
   */
  async resumeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume()
        console.log('🔊 Audio context resumed')
      } catch (error) {
        console.warn('🔊 Failed to resume audio context:', error)
      }
    }
  }

  /**
   * Load user sound preferences
   */
  private loadPreferences(): void {
    this.isEnabled = UserManager.getPreference('soundNotifications', false)
    this.volumeLevel = UserManager.getPreference('soundVolume', 'loud') as VolumeLevel
    this.notificationSound = UserManager.getPreference('notificationSound', 'chime') as NotificationSound
    this.messageNotifications = UserManager.getPreference('messageNotifications', true)
    this.interfaceSounds = UserManager.getPreference('interfaceSounds', false)
  }

  /**
   * Enable or disable sound notifications
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    UserManager.setPreference('soundNotifications', enabled)
    console.log(`🔊 Sound notifications ${enabled ? 'enabled' : 'disabled'}`)
  }

  /**
   * Check if sounds are enabled and supported
   */
  isAvailable(): boolean {
    return this.isEnabled && this.hasPermission && this.audioContext !== null
  }

  /**
   * Play a sound notification
   */
  async playSound(type: SoundType): Promise<void> {
    if (!this.isAvailable()) return

    // Check if sound type is enabled based on category
    const isMessageSound = ['message_received', 'message_sent'].includes(type)
    const isInterfaceSound = ['recording_start', 'recording_stop', 'button_click', 'translation_complete'].includes(type)
    
    if (isMessageSound && !this.messageNotifications) {
      console.log(`🔊 Skipping ${type} - message notifications disabled`)
      return
    }
    
    if (isInterfaceSound && !this.interfaceSounds) {
      console.log(`🔊 Skipping ${type} - interface sounds disabled`)
      return
    }

    try {
      // Ensure audio context is resumed
      await this.resumeAudioContext()
      
      if (!this.audioContext || this.audioContext.state !== 'running') {
        console.warn('🔊 Audio context not running, cannot play sound')
        return
      }

      // For message_received, use the selected notification preset
      let config = this.soundConfigs[type]
      if (type === 'message_received') {
        config = { ...this.notificationPresets[this.notificationSound] }
      }
      
      // Apply volume adjustment
      const volumeMultiplier = this.volumeLevel === 'quiet' ? 0.7 : 1.3 // -30% or +30%
      const adjustedConfig = {
        ...config,
        volume: config.volume * volumeMultiplier
      }
      
      await this.generateTone(adjustedConfig)
      
    } catch (error) {
      console.warn(`🔊 Failed to play ${type} sound:`, error)
    }
  }

  /**
   * Generate a tone using Web Audio API
   */
  private async generateTone(config: SoundConfig): Promise<void> {
    if (!this.audioContext) return

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    // Configure oscillator
    oscillator.type = config.type
    oscillator.frequency.setValueAtTime(config.frequency, this.audioContext.currentTime)

    // Configure volume with fade in/out
    const now = this.audioContext.currentTime
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(config.volume, now + 0.01) // Fade in
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + config.duration) // Fade out

    // Connect nodes
    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    // Play sound
    oscillator.start(now)
    oscillator.stop(now + config.duration)
  }

  /**
   * Play message arrival sound
   */
  async playMessageReceived(): Promise<void> {
    await this.playSound('message_received')
  }

  /**
   * Play message sent sound
   */
  async playMessageSent(): Promise<void> {
    await this.playSound('message_sent')
  }

  /**
   * Play translation complete sound
   */
  async playTranslationComplete(): Promise<void> {
    await this.playSound('translation_complete')
  }

  /**
   * Play recording start sound
   */
  async playRecordingStart(): Promise<void> {
    await this.playSound('recording_start')
  }

  /**
   * Play recording stop sound
   */
  async playRecordingStop(): Promise<void> {
    await this.playSound('recording_stop')
  }

  /**
   * Play button click sound
   */
  async playButtonClick(): Promise<void> {
    await this.playSound('button_click')
  }

  /**
   * Play error sound
   */
  async playError(): Promise<void> {
    await this.playSound('error')
  }

  /**
   * Play generic notification sound
   */
  async playNotification(): Promise<void> {
    await this.playSound('notification')
  }

  /**
   * Test sound functionality
   * Useful for settings screen preview
   */
  async testSound(): Promise<boolean> {
    try {
      await this.resumeAudioContext()
      await this.playNotification()
      return true
    } catch (error) {
      console.warn('🔊 Sound test failed:', error)
      return false
    }
  }

  /**
   * Set volume level
   */
  setVolumeLevel(level: VolumeLevel): void {
    this.volumeLevel = level
    UserManager.setPreference('soundVolume', level)
    console.log(`🔊 Sound volume set to ${level}`)
  }
  
  /**
   * Set notification sound
   */
  setNotificationSound(sound: NotificationSound): void {
    this.notificationSound = sound
    UserManager.setPreference('notificationSound', sound)
    console.log(`🔊 Notification sound set to ${sound}`)
  }
  
  /**
   * Get current volume level
   */
  getVolumeLevel(): VolumeLevel {
    return this.volumeLevel
  }
  
  /**
   * Get current notification sound
   */
  getNotificationSound(): NotificationSound {
    return this.notificationSound
  }
  
  /**
   * Get current enabled state
   */
  getEnabled(): boolean {
    return this.isEnabled
  }
  
  /**
   * Set message notifications enabled/disabled
   */
  setMessageNotifications(enabled: boolean): void {
    this.messageNotifications = enabled
    UserManager.setPreference('messageNotifications', enabled)
    console.log(`🔊 Message notifications ${enabled ? 'enabled' : 'disabled'}`)
  }
  
  /**
   * Get message notifications enabled state
   */
  getMessageNotifications(): boolean {
    return this.messageNotifications
  }
  
  /**
   * Set interface sounds enabled/disabled
   */
  setInterfaceSounds(enabled: boolean): void {
    this.interfaceSounds = enabled
    UserManager.setPreference('interfaceSounds', enabled)
    console.log(`🔊 Interface sounds ${enabled ? 'enabled' : 'disabled'}`)
  }
  
  /**
   * Get interface sounds enabled state
   */
  getInterfaceSounds(): boolean {
    return this.interfaceSounds
  }

  /**
   * Check if audio context is ready
   */
  isReady(): boolean {
    return this.audioContext !== null && this.audioContext.state === 'running'
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }
}

// Export singleton instance
export const soundManager = SoundManager.getInstance()

/**
 * Hook for easy sound integration in React components
 * Uses React state for proper reactivity in components
 */
export function useSounds() {
  const [isEnabled, setIsEnabledState] = useState(() => soundManager.getEnabled())
  const [volumeLevel, setVolumeLevelState] = useState(() => soundManager.getVolumeLevel())
  const [notificationSound, setNotificationSoundState] = useState(() => soundManager.getNotificationSound())
  const [messageNotifications, setMessageNotificationsState] = useState(() => soundManager.getMessageNotifications())
  const [interfaceSounds, setInterfaceSoundsState] = useState(() => soundManager.getInterfaceSounds())

  const setEnabled = useCallback((enabled: boolean) => {
    soundManager.setEnabled(enabled)
    setIsEnabledState(enabled)
  }, [])

  const setVolumeLevel = useCallback((level: VolumeLevel) => {
    soundManager.setVolumeLevel(level)
    setVolumeLevelState(level)
  }, [])

  const setNotificationSound = useCallback((sound: NotificationSound) => {
    soundManager.setNotificationSound(sound)
    setNotificationSoundState(sound)
  }, [])

  const setMessageNotifications = useCallback((enabled: boolean) => {
    soundManager.setMessageNotifications(enabled)
    setMessageNotificationsState(enabled)
  }, [])

  const setInterfaceSounds = useCallback((enabled: boolean) => {
    soundManager.setInterfaceSounds(enabled)
    setInterfaceSoundsState(enabled)
  }, [])

  return {
    playMessageReceived: useCallback(() => soundManager.playMessageReceived(), []),
    playMessageSent: useCallback(() => soundManager.playMessageSent(), []),
    playTranslationComplete: useCallback(() => soundManager.playTranslationComplete(), []),
    playRecordingStart: useCallback(() => soundManager.playRecordingStart(), []),
    playRecordingStop: useCallback(() => soundManager.playRecordingStop(), []),
    playButtonClick: useCallback(() => soundManager.playButtonClick(), []),
    playError: useCallback(() => soundManager.playError(), []),
    playNotification: useCallback(() => soundManager.playNotification(), []),
    isEnabled,
    setEnabled,
    volumeLevel,
    setVolumeLevel,
    notificationSound,
    setNotificationSound,
    messageNotifications,
    setMessageNotifications,
    interfaceSounds,
    setInterfaceSounds,
    testSound: useCallback(() => soundManager.testSound(), []),
    isReady: useCallback(() => soundManager.isReady(), [])
  }
}