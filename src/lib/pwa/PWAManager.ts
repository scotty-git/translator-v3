/**
 * PWA Manager - Progressive Web App functionality
 * Handles service worker registration, install prompts, and offline capabilities
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export class PWAManager {
  private static instance: PWAManager
  private deferredPrompt: BeforeInstallPromptEvent | null = null
  private isInstalled = false
  private swRegistration: ServiceWorkerRegistration | null = null

  constructor() {
    this.initializePWA()
  }

  static getInstance(): PWAManager {
    if (!PWAManager.instance) {
      PWAManager.instance = new PWAManager()
    }
    return PWAManager.instance
  }

  /**
   * Initialize PWA functionality
   */
  private async initializePWA(): Promise<void> {
    if (typeof window === 'undefined') return

    try {
      await this.registerServiceWorker()
      this.setupInstallPrompt()
      this.detectInstallation()
      this.setupUpdateChecking()
      
      console.log('📱 [PWA] PWA Manager initialized')
    } catch (error) {
      console.error('📱 [PWA] Initialization failed:', error)
    }
  }

  /**
   * Register service worker
   */
  private async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.log('📱 [PWA] Service Worker not supported')
      return
    }

    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })

      console.log('📱 [PWA] Service Worker registered:', this.swRegistration.scope)

      // Listen for updates
      this.swRegistration.addEventListener('updatefound', () => {
        console.log('📱 [PWA] Service Worker update found')
        this.handleUpdate()
      })

      // Check for existing controller
      if (navigator.serviceWorker.controller) {
        console.log('📱 [PWA] Service Worker already controlling')
      }

    } catch (error) {
      console.error('📱 [PWA] Service Worker registration failed:', error)
    }
  }

  /**
   * Setup install prompt handling
   */
  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('📱 [PWA] Install prompt available')
      
      // Prevent default mini-infobar
      e.preventDefault()
      
      // Save event for later use
      this.deferredPrompt = e as BeforeInstallPromptEvent
      
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('pwa-installable'))
    })

    window.addEventListener('appinstalled', () => {
      console.log('📱 [PWA] App installed')
      this.isInstalled = true
      this.deferredPrompt = null
      
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('pwa-installed'))
    })
  }

  /**
   * Detect if app is already installed
   */
  private detectInstallation(): void {
    // Check if running in standalone mode
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true
      console.log('📱 [PWA] App running in standalone mode')
    }

    // Check for iOS installation
    if ((window.navigator as any).standalone === true) {
      this.isInstalled = true
      console.log('📱 [PWA] App installed on iOS')
    }
  }

  /**
   * Setup automatic update checking
   */
  private setupUpdateChecking(): void {
    // Check for updates every 60 seconds when app is visible
    let updateInterval: NodeJS.Timeout

    const startUpdateChecking = () => {
      updateInterval = setInterval(() => {
        this.checkForUpdates()
      }, 60000)
    }

    const stopUpdateChecking = () => {
      if (updateInterval) {
        clearInterval(updateInterval)
      }
    }

    // Start checking when page becomes visible
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        startUpdateChecking()
      } else {
        stopUpdateChecking()
      }
    })

    // Start immediately if page is visible
    if (document.visibilityState === 'visible') {
      startUpdateChecking()
    }
  }

  /**
   * Show install prompt
   */
  async showInstallPrompt(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.log('📱 [PWA] No install prompt available')
      return false
    }

    try {
      // Show the prompt
      await this.deferredPrompt.prompt()
      
      // Wait for user choice
      const choiceResult = await this.deferredPrompt.userChoice
      
      console.log('📱 [PWA] Install prompt result:', choiceResult.outcome)
      
      // Clear the prompt
      this.deferredPrompt = null
      
      return choiceResult.outcome === 'accepted'
    } catch (error) {
      console.error('📱 [PWA] Install prompt error:', error)
      return false
    }
  }

  /**
   * Check if app can be installed
   */
  canInstall(): boolean {
    return !this.isInstalled && this.deferredPrompt !== null
  }

  /**
   * Check if app is installed
   */
  isAppInstalled(): boolean {
    return this.isInstalled
  }

  /**
   * Check for updates
   */
  async checkForUpdates(): Promise<boolean> {
    if (!this.swRegistration) return false

    try {
      await this.swRegistration.update()
      return true
    } catch (error) {
      console.error('📱 [PWA] Update check failed:', error)
      return false
    }
  }

  /**
   * Handle service worker update
   */
  private handleUpdate(): void {
    if (!this.swRegistration || !this.swRegistration.installing) return

    const newWorker = this.swRegistration.installing

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        console.log('📱 [PWA] New content available')
        
        // Dispatch custom event for UI notification
        window.dispatchEvent(new CustomEvent('pwa-update-available'))
      }
    })
  }

  /**
   * Apply pending update
   */
  async applyUpdate(): Promise<void> {
    if (!this.swRegistration || !this.swRegistration.waiting) return

    try {
      // Tell the waiting service worker to skip waiting
      this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' })
      
      // Reload the page to use new service worker
      window.location.reload()
    } catch (error) {
      console.error('📱 [PWA] Failed to apply update:', error)
    }
  }

  /**
   * Get service worker version
   */
  async getServiceWorkerVersion(): Promise<string> {
    if (!this.swRegistration) return 'unknown'

    try {
      return new Promise((resolve) => {
        const messageChannel = new MessageChannel()
        
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data.version || 'unknown')
        }
        
        if (this.swRegistration.active) {
          this.swRegistration.active.postMessage(
            { type: 'GET_VERSION' },
            [messageChannel.port2]
          )
        } else {
          resolve('unknown')
        }
      })
    } catch (error) {
      console.error('📱 [PWA] Failed to get version:', error)
      return 'unknown'
    }
  }

  /**
   * Clear all caches
   */
  async clearCaches(): Promise<void> {
    if (!this.swRegistration) return

    try {
      // Tell service worker to clear caches
      if (this.swRegistration.active) {
        this.swRegistration.active.postMessage({ type: 'CLEAR_CACHE' })
      }
      
      // Also clear any client-side caches
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        )
      }
      
      console.log('📱 [PWA] All caches cleared')
    } catch (error) {
      console.error('📱 [PWA] Failed to clear caches:', error)
    }
  }

  /**
   * Get offline status
   */
  isOffline(): boolean {
    return !navigator.onLine
  }

  /**
   * Setup offline/online event listeners
   */
  onConnectionChange(callback: (online: boolean) => void): void {
    const handleOnline = () => callback(true)
    const handleOffline = () => callback(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Return cleanup function
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }

  /**
   * Request persistent storage
   */
  async requestPersistentStorage(): Promise<boolean> {
    if (!('storage' in navigator) || !('persist' in navigator.storage)) {
      console.log('📱 [PWA] Persistent storage not supported')
      return false
    }

    try {
      const granted = await navigator.storage.persist()
      console.log('📱 [PWA] Persistent storage:', granted ? 'granted' : 'denied')
      return granted
    } catch (error) {
      console.error('📱 [PWA] Persistent storage request failed:', error)
      return false
    }
  }

  /**
   * Get storage estimate
   */
  async getStorageEstimate(): Promise<StorageEstimate | null> {
    if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
      return null
    }

    try {
      return await navigator.storage.estimate()
    } catch (error) {
      console.error('📱 [PWA] Storage estimate failed:', error)
      return null
    }
  }
}

// Global instance
export const pwaManager = PWAManager.getInstance()