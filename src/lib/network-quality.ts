/**
 * Network Quality Detection and Adaptive Timeouts
 * 
 * This module provides network quality detection and adaptive timeout configuration
 * for API requests based on connection speed. Critical for mobile network reliability.
 */

export type NetworkQuality = 'fast' | 'slow' | 'very-slow' | 'unknown'

export interface NetworkQualityConfig {
  type: NetworkQuality
  timeout: number
  label: string
  description: string
}

/**
 * Network quality configurations with timeouts optimized for real-time translation
 */
export const NETWORK_CONFIGS: Record<NetworkQuality, NetworkQualityConfig> = {
  fast: {
    type: 'fast',
    timeout: 5000,     // 5 seconds for fast networks (4G/WiFi)
    label: 'Fast',
    description: '4G/WiFi connection'
  },
  slow: {
    type: 'slow',
    timeout: 15000,    // 15 seconds for slow networks (3G)
    label: 'Slow',
    description: '3G connection'
  },
  'very-slow': {
    type: 'very-slow',
    timeout: 30000,    // 30 seconds for very slow networks (Edge/2G)
    label: 'Very Slow',
    description: 'Edge/2G connection'
  },
  unknown: {
    type: 'unknown',
    timeout: 15000,    // Default to slow timeout for unknown connections
    label: 'Unknown',
    description: 'Connection speed unknown'
  }
}

export class NetworkQualityDetector {
  private currentQuality: NetworkQuality = 'unknown'
  private listeners: ((quality: NetworkQuality) => void)[] = []
  private pingTestResults: number[] = []
  private isMonitoring = false

  constructor() {
    this.detectInitialQuality()
    this.setupNetworkChangeListener()
  }

  /**
   * Get current network quality
   */
  getCurrentQuality(): NetworkQuality {
    return this.currentQuality
  }

  /**
   * Get timeout for current network quality
   */
  getCurrentTimeout(): number {
    return NETWORK_CONFIGS[this.currentQuality].timeout
  }

  /**
   * Get configuration for current network quality
   */
  getCurrentConfig(): NetworkQualityConfig {
    return NETWORK_CONFIGS[this.currentQuality]
  }

  /**
   * Get quality configuration for a specific network quality (alias for compatibility)
   */
  getQualityConfig(quality?: NetworkQuality): NetworkQualityConfig {
    return NETWORK_CONFIGS[quality || this.currentQuality]
  }

  /**
   * Run a ping test manually (public method for testing)
   */
  async pingTest(): Promise<{ quality: NetworkQuality; pingTime: number; avgPing: number }> {
    const startTime = performance.now()
    
    try {
      // Use a simple GET request to measure network latency
      // Create a minimal blob URL for testing
      const blob = new Blob([''], { type: 'text/plain' })
      const testUrl = URL.createObjectURL(blob)
      
      await fetch(testUrl, {
        method: 'GET',
        cache: 'no-cache'
      })
      
      // Clean up the blob URL
      URL.revokeObjectURL(testUrl)
      
      const pingTime = performance.now() - startTime
      
      // Store ping result
      this.pingTestResults.push(pingTime)
      
      // Keep only last 5 results
      if (this.pingTestResults.length > 5) {
        this.pingTestResults.shift()
      }
      
      // Calculate average ping
      const avgPing = this.pingTestResults.reduce((sum, ping) => sum + ping, 0) / this.pingTestResults.length
      
      // Determine quality based on ping time
      let quality: NetworkQuality
      if (avgPing < 100) {
        quality = 'fast'
      } else if (avgPing < 300) {
        quality = 'slow'
      } else {
        quality = 'very-slow'
      }
      
      this.updateQuality(quality)
      
      return {
        quality,
        pingTime,
        avgPing
      }
      
    } catch (error) {
      console.warn('🌐 Ping test failed:', error)
      this.updateQuality('unknown')
      return {
        quality: 'unknown',
        pingTime: startTime,
        avgPing: 0
      }
    }
  }

  /**
   * Initialize the network quality detector (for compatibility)
   */
  async initialize(): Promise<void> {
    console.log('🌐 NetworkQualityDetector: Initializing...')
    await this.detectQuality()
    this.startMonitoring()
    console.log('🌐 NetworkQualityDetector: Initialized successfully')
  }

  /**
   * Add listener for network quality changes (alias for onQualityChange)
   */
  addListener(callback: (quality: NetworkQuality) => void): () => void {
    return this.onQualityChange(callback)
  }

  /**
   * Remove listener for network quality changes
   */
  removeListener(callback: (quality: NetworkQuality) => void): void {
    const index = this.listeners.indexOf(callback)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  /**
   * Subscribe to network quality changes
   */
  onQualityChange(callback: (quality: NetworkQuality) => void): () => void {
    this.listeners.push(callback)
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * Start monitoring network quality with periodic ping tests
   */
  startMonitoring(): void {
    if (this.isMonitoring) return
    
    this.isMonitoring = true
    
    // Run ping test every 30 seconds
    const intervalId = setInterval(() => {
      this.runPingTest()
    }, 30000)

    // Store interval ID for cleanup
    ;(this as any).monitoringInterval = intervalId
  }

  /**
   * Stop monitoring network quality
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return
    
    this.isMonitoring = false
    
    if ((this as any).monitoringInterval) {
      clearInterval((this as any).monitoringInterval)
      delete (this as any).monitoringInterval
    }
  }

  /**
   * Force a network quality re-detection
   */
  async detectQuality(): Promise<NetworkQuality> {
    const quality = await this.performQualityDetection()
    this.updateQuality(quality)
    return quality
  }

  /**
   * Detect initial network quality using available APIs
   */
  private detectInitialQuality(): void {
    // Use Network Information API if available
    if ('connection' in navigator && (navigator as any).connection) {
      const connection = (navigator as any).connection
      const effectiveType = connection.effectiveType
      
      console.log('🌐 Network API detected:', {
        effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt
      })
      
      this.currentQuality = this.mapEffectiveTypeToQuality(effectiveType)
    } else {
      // Fallback: Run ping test
      this.runPingTest()
    }
  }

  /**
   * Set up listener for network changes
   */
  private setupNetworkChangeListener(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('🌐 Network: Back online')
      this.detectQuality()
    })

    window.addEventListener('offline', () => {
      console.log('🌐 Network: Offline')
      this.updateQuality('very-slow')
    })

    // Listen for connection changes if API is available
    if ('connection' in navigator && (navigator as any).connection) {
      (navigator as any).connection.addEventListener('change', () => {
        console.log('🌐 Network: Connection changed')
        this.detectInitialQuality()
      })
    }
  }

  /**
   * Perform network quality detection using multiple methods
   */
  private async performQualityDetection(): Promise<NetworkQuality> {
    // Method 1: Network Information API (if available)
    if ('connection' in navigator && (navigator as any).connection) {
      const connection = (navigator as any).connection
      const apiQuality = this.mapEffectiveTypeToQuality(connection.effectiveType)
      
      // If API gives us a clear answer, use it
      if (apiQuality !== 'unknown') {
        return apiQuality
      }
    }

    // Method 2: Ping test fallback
    const pingQuality = await this.runPingTest()
    return pingQuality
  }

  /**
   * Map Network Information API effective type to our quality enum
   */
  private mapEffectiveTypeToQuality(effectiveType: string): NetworkQuality {
    switch (effectiveType) {
      case '4g':
        return 'fast'
      case '3g':
        return 'slow'
      case '2g':
      case 'slow-2g':
        return 'very-slow'
      default:
        return 'unknown'
    }
  }

  /**
   * Run ping test to estimate network quality
   */
  private async runPingTest(): Promise<NetworkQuality> {
    try {
      const startTime = performance.now()
      
      // Use a simple GET request to measure network latency
      // Create a minimal blob URL for testing
      const blob = new Blob([''], { type: 'text/plain' })
      const testUrl = URL.createObjectURL(blob)
      
      await fetch(testUrl, {
        method: 'GET',
        cache: 'no-cache'
      })
      
      // Clean up the blob URL
      URL.revokeObjectURL(testUrl)
      
      const pingTime = performance.now() - startTime
      
      console.log('🌐 Ping test result:', `${pingTime.toFixed(2)}ms`)
      
      // Store ping result
      this.pingTestResults.push(pingTime)
      
      // Keep only last 5 results
      if (this.pingTestResults.length > 5) {
        this.pingTestResults.shift()
      }
      
      // Calculate average ping
      const avgPing = this.pingTestResults.reduce((sum, ping) => sum + ping, 0) / this.pingTestResults.length
      
      // Determine quality based on ping time
      let quality: NetworkQuality
      if (avgPing < 100) {
        quality = 'fast'
      } else if (avgPing < 300) {
        quality = 'slow'
      } else {
        quality = 'very-slow'
      }
      
      console.log('🌐 Network quality determined:', quality, `(avg ping: ${avgPing.toFixed(2)}ms)`)
      
      this.updateQuality(quality)
      return quality
      
    } catch (error) {
      console.warn('🌐 Ping test failed:', error)
      this.updateQuality('unknown')
      return 'unknown'
    }
  }

  /**
   * Update current quality and notify listeners
   */
  private updateQuality(newQuality: NetworkQuality): void {
    if (newQuality !== this.currentQuality) {
      const oldQuality = this.currentQuality
      this.currentQuality = newQuality
      
      console.log('🌐 Network quality changed:', {
        from: oldQuality,
        to: newQuality,
        timeout: NETWORK_CONFIGS[newQuality].timeout
      })
      
      // Notify all listeners
      this.listeners.forEach(callback => {
        try {
          callback(newQuality)
        } catch (error) {
          console.error('🌐 Error in network quality listener:', error)
        }
      })
    }
  }
}

// Global network quality detector instance
export const networkQualityDetector = new NetworkQualityDetector()

// Note: Monitoring will be started when initialize() is called