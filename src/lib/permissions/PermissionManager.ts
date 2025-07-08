/**
 * PermissionManager - Comprehensive permission handling for Phase 8
 * Manages microphone, notification, storage, and other browser permissions
 * Provides recovery guidance and user-friendly error messages
 */

import { ErrorCode } from '@/lib/errors/ErrorCodes'
import { ErrorManager, type AppError } from '@/lib/errors/ErrorManager'
import { performanceLogger } from '@/lib/performance'

export enum PermissionType {
  MICROPHONE = 'microphone',
  NOTIFICATIONS = 'notifications',
  STORAGE = 'storage',
  CAMERA = 'camera',
  GEOLOCATION = 'geolocation'
}

export enum PermissionStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  PROMPT = 'prompt',
  UNKNOWN = 'unknown',
  NOT_SUPPORTED = 'not_supported'
}

export interface PermissionState {
  type: PermissionType
  status: PermissionStatus
  lastChecked: number
  error?: AppError
  userDenied?: boolean
  canPrompt?: boolean
}

export interface PermissionRequestOptions {
  showUI?: boolean
  timeout?: number
  retryOnDenied?: boolean
  customErrorMessage?: string
}

export interface PermissionRecoveryGuide {
  title: string
  steps: string[]
  canAutoRecover: boolean
  recoveryAction?: () => Promise<void>
  helpUrl?: string
}

export class PermissionManager {
  private static permissionStates = new Map<PermissionType, PermissionState>()
  private static permissionListeners = new Map<PermissionType, Set<(state: PermissionState) => void>>()
  private static isListening = false

  /**
   * Initialize permission manager
   */
  static async initialize(): Promise<void> {
    console.log('🔐 [PermissionManager] Initializing permission system')
    
    // Check all permission states
    await Promise.all([
      this.checkPermission(PermissionType.MICROPHONE),
      this.checkPermission(PermissionType.NOTIFICATIONS),
      this.checkPermission(PermissionType.STORAGE),
      this.checkPermission(PermissionType.CAMERA)
    ])
    
    // Start listening for permission changes
    this.startListening()
    
    console.log('✅ [PermissionManager] Permission system initialized')
  }

  /**
   * Request permission with error handling and recovery guidance
   */
  static async requestPermission(
    type: PermissionType,
    options: PermissionRequestOptions = {}
  ): Promise<PermissionState> {
    performanceLogger.start(`permission-request-${type}`)
    
    console.log(`🔐 [PermissionManager] Requesting ${type} permission`)
    
    try {
      let permissionState: PermissionState
      
      switch (type) {
        case PermissionType.MICROPHONE:
          permissionState = await this.requestMicrophonePermission(options)
          break
        case PermissionType.NOTIFICATIONS:
          permissionState = await this.requestNotificationPermission(options)
          break
        case PermissionType.STORAGE:
          permissionState = await this.requestStoragePermission(options)
          break
        case PermissionType.CAMERA:
          permissionState = await this.requestCameraPermission(options)
          break
        default:
          throw new Error(`Unsupported permission type: ${type}`)
      }
      
      // Update state and notify listeners
      this.updatePermissionState(type, permissionState)
      
      performanceLogger.end(`permission-request-${type}`)
      
      console.log(`✅ [PermissionManager] ${type} permission result:`, permissionState.status)
      
      return permissionState
      
    } catch (error) {
      performanceLogger.end(`permission-request-${type}`)
      
      const appError = ErrorManager.createError(
        error,
        `permission-request-${type}`,
        this.getPermissionErrorCode(type, error)
      )
      
      const permissionState: PermissionState = {
        type,
        status: PermissionStatus.DENIED,
        lastChecked: Date.now(),
        error: appError,
        userDenied: true,
        canPrompt: false
      }
      
      this.updatePermissionState(type, permissionState)
      
      console.error(`❌ [PermissionManager] ${type} permission failed:`, appError.code)
      
      return permissionState
    }
  }

  /**
   * Check current permission status without requesting
   */
  static async checkPermission(type: PermissionType): Promise<PermissionState> {
    try {
      let status: PermissionStatus
      
      switch (type) {
        case PermissionType.MICROPHONE:
          status = await this.checkMicrophonePermission()
          break
        case PermissionType.NOTIFICATIONS:
          status = await this.checkNotificationPermission()
          break
        case PermissionType.STORAGE:
          status = await this.checkStoragePermission()
          break
        case PermissionType.CAMERA:
          status = await this.checkCameraPermission()
          break
        default:
          status = PermissionStatus.NOT_SUPPORTED
      }
      
      const permissionState: PermissionState = {
        type,
        status,
        lastChecked: Date.now(),
        canPrompt: status === PermissionStatus.PROMPT
      }
      
      this.updatePermissionState(type, permissionState)
      
      return permissionState
      
    } catch (error) {
      const appError = ErrorManager.createError(
        error,
        `permission-check-${type}`
      )
      
      const permissionState: PermissionState = {
        type,
        status: PermissionStatus.UNKNOWN,
        lastChecked: Date.now(),
        error: appError
      }
      
      this.updatePermissionState(type, permissionState)
      
      return permissionState
    }
  }

  /**
   * Request microphone permission
   */
  private static async requestMicrophonePermission(
    options: PermissionRequestOptions
  ): Promise<PermissionState> {
    try {
      // Check if microphone is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone not supported')
      }
      
      // Request access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      
      // Clean up stream immediately
      stream.getTracks().forEach(track => track.stop())
      
      return {
        type: PermissionType.MICROPHONE,
        status: PermissionStatus.GRANTED,
        lastChecked: Date.now(),
        canPrompt: false
      }
      
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        return {
          type: PermissionType.MICROPHONE,
          status: PermissionStatus.DENIED,
          lastChecked: Date.now(),
          userDenied: true,
          canPrompt: false
        }
      }
      
      throw error
    }
  }

  /**
   * Check microphone permission status
   */
  private static async checkMicrophonePermission(): Promise<PermissionStatus> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return PermissionStatus.NOT_SUPPORTED
    }
    
    try {
      // Use Permissions API if available
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        return result.state as PermissionStatus
      }
      
      // Fallback: Try to get user media with constraints that won't actually access the mic
      return PermissionStatus.PROMPT
      
    } catch (error) {
      return PermissionStatus.UNKNOWN
    }
  }

  /**
   * Request notification permission
   */
  private static async requestNotificationPermission(
    options: PermissionRequestOptions
  ): Promise<PermissionState> {
    if (!('Notification' in window)) {
      throw new Error('Notifications not supported')
    }
    
    const permission = await Notification.requestPermission()
    
    return {
      type: PermissionType.NOTIFICATIONS,
      status: permission as PermissionStatus,
      lastChecked: Date.now(),
      canPrompt: permission === 'default'
    }
  }

  /**
   * Check notification permission status
   */
  private static async checkNotificationPermission(): Promise<PermissionStatus> {
    if (!('Notification' in window)) {
      return PermissionStatus.NOT_SUPPORTED
    }
    
    return Notification.permission as PermissionStatus
  }

  /**
   * Request storage permission (check quota and availability)
   */
  private static async requestStoragePermission(
    options: PermissionRequestOptions
  ): Promise<PermissionState> {
    try {
      // Check if storage is available
      if (!('localStorage' in window)) {
        throw new Error('localStorage not available')
      }
      
      // Try to use localStorage
      const testKey = '__permission_test__'
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)
      
      // Check storage quota if available
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate()
        const usagePercent = ((estimate.usage || 0) / (estimate.quota || 1)) * 100
        
        if (usagePercent > 90) {
          throw new Error('Storage quota exceeded')
        }
      }
      
      return {
        type: PermissionType.STORAGE,
        status: PermissionStatus.GRANTED,
        lastChecked: Date.now(),
        canPrompt: false
      }
      
    } catch (error: any) {
      if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
        return {
          type: PermissionType.STORAGE,
          status: PermissionStatus.DENIED,
          lastChecked: Date.now(),
          error: ErrorManager.createError(error, 'storage-permission', ErrorCode.STORAGE_QUOTA_EXCEEDED)
        }
      }
      
      throw error
    }
  }

  /**
   * Check storage permission status
   */
  private static async checkStoragePermission(): Promise<PermissionStatus> {
    try {
      if (!('localStorage' in window)) {
        return PermissionStatus.NOT_SUPPORTED
      }
      
      // Try to access localStorage
      const testKey = '__permission_check__'
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)
      
      return PermissionStatus.GRANTED
      
    } catch (error) {
      return PermissionStatus.DENIED
    }
  }

  /**
   * Request camera permission
   */
  private static async requestCameraPermission(
    options: PermissionRequestOptions
  ): Promise<PermissionState> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported')
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach(track => track.stop())
      
      return {
        type: PermissionType.CAMERA,
        status: PermissionStatus.GRANTED,
        lastChecked: Date.now(),
        canPrompt: false
      }
      
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        return {
          type: PermissionType.CAMERA,
          status: PermissionStatus.DENIED,
          lastChecked: Date.now(),
          userDenied: true,
          canPrompt: false
        }
      }
      
      throw error
    }
  }

  /**
   * Check camera permission status
   */
  private static async checkCameraPermission(): Promise<PermissionStatus> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return PermissionStatus.NOT_SUPPORTED
    }
    
    try {
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName })
        return result.state as PermissionStatus
      }
      
      return PermissionStatus.PROMPT
      
    } catch (error) {
      return PermissionStatus.UNKNOWN
    }
  }

  /**
   * Get recovery guidance for denied permissions
   */
  static getRecoveryGuide(type: PermissionType): PermissionRecoveryGuide {
    switch (type) {
      case PermissionType.MICROPHONE:
        return {
          title: 'Enable Microphone Access',
          steps: [
            'Click the microphone icon in your browser\'s address bar',
            'Select "Allow" for microphone access',
            'If no icon appears, check your browser settings',
            'Look for "Privacy and Security" → "Site Settings" → "Microphone"',
            'Make sure this site is allowed to use your microphone'
          ],
          canAutoRecover: true,
          recoveryAction: async () => {
            await this.requestPermission(PermissionType.MICROPHONE)
          },
          helpUrl: 'https://support.google.com/chrome/answer/2693767'
        }

      case PermissionType.NOTIFICATIONS:
        return {
          title: 'Enable Notifications',
          steps: [
            'Click the notification icon in your browser\'s address bar',
            'Select "Allow" for notifications',
            'Or go to browser settings → "Privacy and Security" → "Notifications"',
            'Add this site to the allowed list'
          ],
          canAutoRecover: true,
          recoveryAction: async () => {
            await this.requestPermission(PermissionType.NOTIFICATIONS)
          }
        }

      case PermissionType.STORAGE:
        return {
          title: 'Fix Storage Issues',
          steps: [
            'Clear some space by closing other browser tabs',
            'Clear browser cache and cookies for other sites',
            'Check if private/incognito mode is affecting storage',
            'Try refreshing the page'
          ],
          canAutoRecover: true,
          recoveryAction: async () => {
            // Try to clear some cache
            if ('caches' in window) {
              const cacheNames = await caches.keys()
              const oldCaches = cacheNames.filter(name => !name.includes('v1'))
              await Promise.all(oldCaches.map(name => caches.delete(name)))
            }
          }
        }

      case PermissionType.CAMERA:
        return {
          title: 'Enable Camera Access',
          steps: [
            'Click the camera icon in your browser\'s address bar',
            'Select "Allow" for camera access',
            'Check your browser settings under "Privacy and Security"',
            'Make sure no other app is using your camera'
          ],
          canAutoRecover: true,
          recoveryAction: async () => {
            await this.requestPermission(PermissionType.CAMERA)
          }
        }

      default:
        return {
          title: 'Permission Required',
          steps: [
            'Please allow the requested permission in your browser',
            'Check your browser settings if needed',
            'Refresh the page and try again'
          ],
          canAutoRecover: false
        }
    }
  }

  /**
   * Add permission state change listener
   */
  static addPermissionListener(
    type: PermissionType,
    listener: (state: PermissionState) => void
  ): void {
    if (!this.permissionListeners.has(type)) {
      this.permissionListeners.set(type, new Set())
    }
    this.permissionListeners.get(type)!.add(listener)
  }

  /**
   * Remove permission state change listener
   */
  static removePermissionListener(
    type: PermissionType,
    listener: (state: PermissionState) => void
  ): void {
    const listeners = this.permissionListeners.get(type)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  /**
   * Get current permission state
   */
  static getPermissionState(type: PermissionType): PermissionState | undefined {
    return this.permissionStates.get(type)
  }

  /**
   * Get all permission states
   */
  static getAllPermissionStates(): Map<PermissionType, PermissionState> {
    return new Map(this.permissionStates)
  }

  /**
   * Update permission state and notify listeners
   */
  private static updatePermissionState(type: PermissionType, state: PermissionState): void {
    this.permissionStates.set(type, state)
    
    const listeners = this.permissionListeners.get(type)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(state)
        } catch (error) {
          console.error(`Permission listener error for ${type}:`, error)
        }
      })
    }
  }

  /**
   * Start listening for permission changes
   */
  private static startListening(): void {
    if (this.isListening || !('permissions' in navigator)) return
    
    this.isListening = true
    
    // Listen for microphone permission changes
    this.listenForPermissionChange('microphone', PermissionType.MICROPHONE)
    this.listenForPermissionChange('camera', PermissionType.CAMERA)
    
    console.log('👂 [PermissionManager] Started listening for permission changes')
  }

  /**
   * Listen for specific permission changes
   */
  private static async listenForPermissionChange(
    permissionName: string,
    type: PermissionType
  ): Promise<void> {
    try {
      const permission = await navigator.permissions.query({ name: permissionName as PermissionName })
      
      permission.addEventListener('change', () => {
        console.log(`🔄 [PermissionManager] ${type} permission changed to:`, permission.state)
        this.checkPermission(type)
      })
      
    } catch (error) {
      console.warn(`Could not listen for ${permissionName} permission changes:`, error)
    }
  }

  /**
   * Map permission type and error to appropriate error code
   */
  private static getPermissionErrorCode(type: PermissionType, error: unknown): ErrorCode {
    switch (type) {
      case PermissionType.MICROPHONE:
        return ErrorCode.PERMISSION_MICROPHONE_DENIED
      case PermissionType.NOTIFICATIONS:
        return ErrorCode.PERMISSION_NOTIFICATION_DENIED
      case PermissionType.STORAGE:
        return ErrorCode.PERMISSION_STORAGE_DENIED
      case PermissionType.CAMERA:
        return ErrorCode.PERMISSION_CAMERA_DENIED
      default:
        return ErrorCode.UNKNOWN_ERROR
    }
  }

  /**
   * Test if critical permissions are available
   */
  static async validateCriticalPermissions(): Promise<{
    allGranted: boolean
    missing: PermissionType[]
    errors: AppError[]
  }> {
    const criticalPermissions = [PermissionType.MICROPHONE, PermissionType.STORAGE]
    const missing: PermissionType[] = []
    const errors: AppError[] = []
    
    for (const permission of criticalPermissions) {
      const state = await this.checkPermission(permission)
      
      if (state.status !== PermissionStatus.GRANTED) {
        missing.push(permission)
        
        if (state.error) {
          errors.push(state.error)
        }
      }
    }
    
    return {
      allGranted: missing.length === 0,
      missing,
      errors
    }
  }

  /**
   * Log permission report for debugging
   */
  static logPermissionReport(): void {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔐 [PermissionManager] Permission Status Report')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    this.permissionStates.forEach((state, type) => {
      const emoji = state.status === PermissionStatus.GRANTED ? '✅' : 
                   state.status === PermissionStatus.DENIED ? '❌' : 
                   state.status === PermissionStatus.PROMPT ? '❓' : '⚠️'
      
      console.log(`${emoji} ${type}: ${state.status}`)
      
      if (state.error) {
        console.log(`   Error: ${state.error.code} - ${state.error.userMessage}`)
      }
    })
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  }
}