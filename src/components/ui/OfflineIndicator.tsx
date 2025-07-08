/**
 * OfflineIndicator - Network status monitoring component for Phase 8
 * Displays connection status and provides recovery guidance when offline
 * Integrates with network quality detection from Phase 5
 */

import React, { useState, useEffect } from 'react'
import { Wifi, WifiOff, Signal, SignalLow, SignalMedium, SignalHigh, RefreshCw } from 'lucide-react'
import { Button } from './Button'
import { Card } from './Card'

export type NetworkQuality = 'fast' | 'slow' | 'very-slow' | 'offline'
export type ConnectionType = 'wifi' | 'cellular' | 'ethernet' | 'unknown'

export interface NetworkStatus {
  isOnline: boolean
  quality: NetworkQuality
  connectionType: ConnectionType
  effectiveType?: string
  downlink?: number
  rtt?: number
  lastCheck: number
}

export interface OfflineIndicatorProps {
  variant?: 'banner' | 'toast' | 'badge' | 'status-bar'
  showQuality?: boolean
  showDetails?: boolean
  showRecovery?: boolean
  position?: 'top' | 'bottom' | 'fixed-top' | 'fixed-bottom'
  autoHide?: boolean
  autoHideDelay?: number
  className?: string
  onRetry?: () => void | Promise<void>
}

export function useNetworkStatus(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(() => ({
    isOnline: navigator.onLine,
    quality: 'fast',
    connectionType: 'unknown',
    lastCheck: Date.now()
  }))

  useEffect(() => {
    const updateNetworkStatus = () => {
      const isOnline = navigator.onLine
      let quality: NetworkQuality = 'fast'
      let connectionType: ConnectionType = 'unknown'
      let effectiveType: string | undefined
      let downlink: number | undefined
      let rtt: number | undefined

      // Use Network Information API if available
      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        effectiveType = connection.effectiveType
        downlink = connection.downlink
        rtt = connection.rtt

        // Determine connection type
        if (connection.type) {
          connectionType = connection.type === 'wifi' ? 'wifi' : 
                          connection.type === 'cellular' ? 'cellular' :
                          connection.type === 'ethernet' ? 'ethernet' : 'unknown'
        }

        // Determine quality based on effective type and metrics
        if (!isOnline) {
          quality = 'offline'
        } else if (effectiveType === '4g' && downlink > 10) {
          quality = 'fast'
        } else if (effectiveType === '4g' || (effectiveType === '3g' && downlink > 1.5)) {
          quality = 'slow'
        } else if (effectiveType === '3g' || effectiveType === '2g') {
          quality = 'very-slow'
        } else if (rtt && rtt > 2000) {
          quality = 'very-slow'
        } else if (rtt && rtt > 1000) {
          quality = 'slow'
        }
      } else {
        // Fallback: assume fast if online, offline if not
        quality = isOnline ? 'fast' : 'offline'
      }

      setNetworkStatus({
        isOnline,
        quality,
        connectionType,
        effectiveType,
        downlink,
        rtt,
        lastCheck: Date.now()
      })

      console.log(`📡 [NetworkStatus] Updated:`, {
        isOnline,
        quality,
        connectionType,
        effectiveType,
        downlink,
        rtt
      })
    }

    // Update immediately
    updateNetworkStatus()

    // Listen for online/offline events
    const handleOnline = () => {
      console.log('🌐 [NetworkStatus] Connection restored')
      updateNetworkStatus()
    }

    const handleOffline = () => {
      console.log('📴 [NetworkStatus] Connection lost')
      updateNetworkStatus()
    }

    // Listen for connection changes
    const handleConnectionChange = () => {
      console.log('🔄 [NetworkStatus] Connection changed')
      updateNetworkStatus()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Listen for connection changes if supported
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      connection.addEventListener('change', handleConnectionChange)
    }

    // Periodic check (every 30 seconds)
    const interval = setInterval(updateNetworkStatus, 30000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      
      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        connection.removeEventListener('change', handleConnectionChange)
      }
      
      clearInterval(interval)
    }
  }, [])

  return networkStatus
}

export function OfflineIndicator({
  variant = 'banner',
  showQuality = true,
  showDetails = false,
  showRecovery = true,
  position = 'top',
  autoHide = false,
  autoHideDelay = 5000,
  className = '',
  onRetry
}: OfflineIndicatorProps) {
  const networkStatus = useNetworkStatus()
  const [isVisible, setIsVisible] = useState(true)
  const [isRetrying, setIsRetrying] = useState(false)

  // Auto-hide logic for online state
  useEffect(() => {
    if (autoHide && networkStatus.isOnline) {
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, autoHideDelay)

      return () => clearTimeout(timer)
    } else if (!networkStatus.isOnline) {
      setIsVisible(true)
    }
  }, [networkStatus.isOnline, autoHide, autoHideDelay])

  // Show indicator when offline or poor connection
  const shouldShow = !networkStatus.isOnline || 
                    (showQuality && networkStatus.quality === 'very-slow')

  if (!shouldShow || !isVisible) return null

  // Get icon based on network status
  const getNetworkIcon = () => {
    if (!networkStatus.isOnline) {
      return <WifiOff className="w-4 h-4" />
    }

    switch (networkStatus.quality) {
      case 'fast':
        return <SignalHigh className="w-4 h-4" />
      case 'slow':
        return <SignalMedium className="w-4 h-4" />
      case 'very-slow':
        return <SignalLow className="w-4 h-4" />
      default:
        return <Signal className="w-4 h-4" />
    }
  }

  // Get status message
  const getStatusMessage = () => {
    if (!networkStatus.isOnline) {
      return 'No internet connection'
    }

    switch (networkStatus.quality) {
      case 'very-slow':
        return 'Very slow connection detected'
      case 'slow':
        return 'Slow connection detected'
      default:
        return 'Connected'
    }
  }

  // Get status color
  const getStatusColor = () => {
    if (!networkStatus.isOnline) {
      return 'red'
    }

    switch (networkStatus.quality) {
      case 'very-slow':
        return 'red'
      case 'slow':
        return 'yellow'
      case 'fast':
        return 'green'
      default:
        return 'gray'
    }
  }

  const statusColor = getStatusColor()

  // Handle retry
  const handleRetry = async () => {
    setIsRetrying(true)
    
    try {
      if (onRetry) {
        await onRetry()
      } else {
        // Default retry: try to fetch a small resource
        await fetch('/favicon.ico', { 
          method: 'HEAD',
          cache: 'no-cache'
        })
      }
    } catch (error) {
      console.log('Retry failed:', error)
    } finally {
      setIsRetrying(false)
    }
  }

  // Render details
  const renderDetails = () => {
    if (!showDetails) return null

    return (
      <div className="text-xs text-gray-600 mt-1 space-y-1">
        <div>Type: {networkStatus.connectionType}</div>
        {networkStatus.effectiveType && (
          <div>Effective: {networkStatus.effectiveType}</div>
        )}
        {networkStatus.downlink && (
          <div>Speed: {networkStatus.downlink} Mbps</div>
        )}
        {networkStatus.rtt && (
          <div>Latency: {networkStatus.rtt}ms</div>
        )}
        <div>Last check: {new Date(networkStatus.lastCheck).toLocaleTimeString()}</div>
      </div>
    )
  }

  // Render recovery actions
  const renderRecovery = () => {
    if (!showRecovery || networkStatus.isOnline) return null

    return (
      <div className="flex gap-2 mt-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleRetry}
          disabled={isRetrying}
          className="text-xs"
        >
          {isRetrying ? (
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3 mr-1" />
          )}
          {isRetrying ? 'Checking...' : 'Check Connection'}
        </Button>
      </div>
    )
  }

  // Position classes
  const getPositionClasses = () => {
    switch (position) {
      case 'fixed-top':
        return 'fixed top-0 left-0 right-0 z-50'
      case 'fixed-bottom':
        return 'fixed bottom-0 left-0 right-0 z-50'
      default:
        return ''
    }
  }

  // Render based on variant
  switch (variant) {
    case 'badge':
      return (
        <div className={`
          inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
          ${statusColor === 'red' ? 'bg-red-100 text-red-800' :
            statusColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
            statusColor === 'green' ? 'bg-green-100 text-green-800' :
            'bg-gray-100 text-gray-800'}
          ${className}
        `}>
          {getNetworkIcon()}
          {showQuality && getStatusMessage()}
        </div>
      )

    case 'status-bar':
      return (
        <div className={`
          flex items-center justify-between px-3 py-2 text-sm
          ${statusColor === 'red' ? 'bg-red-50 text-red-700 border-red-200' :
            statusColor === 'yellow' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
            'bg-green-50 text-green-700 border-green-200'}
          border-b ${getPositionClasses()} ${className}
        `}>
          <div className="flex items-center gap-2">
            {getNetworkIcon()}
            <span>{getStatusMessage()}</span>
          </div>
          {renderRecovery()}
        </div>
      )

    case 'toast':
      return (
        <Card className={`
          flex items-start gap-3 p-3 max-w-sm shadow-lg
          ${statusColor === 'red' ? 'bg-red-50 border-red-200' :
            statusColor === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
            'bg-green-50 border-green-200'}
          ${className}
        `}>
          <div className={`
            mt-0.5
            ${statusColor === 'red' ? 'text-red-600' :
              statusColor === 'yellow' ? 'text-yellow-600' :
              'text-green-600'}
          `}>
            {getNetworkIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`
              text-sm font-medium
              ${statusColor === 'red' ? 'text-red-800' :
                statusColor === 'yellow' ? 'text-yellow-800' :
                'text-green-800'}
            `}>
              {getStatusMessage()}
            </p>
            {!networkStatus.isOnline && (
              <p className={`
                text-xs mt-1
                ${statusColor === 'red' ? 'text-red-600' :
                  statusColor === 'yellow' ? 'text-yellow-600' :
                  'text-green-600'}
              `}>
                Some features may not work properly
              </p>
            )}
            {renderDetails()}
            {renderRecovery()}
          </div>
        </Card>
      )

    default: // banner
      return (
        <div className={`
          ${statusColor === 'red' ? 'bg-red-50 border-red-200' :
            statusColor === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
            'bg-green-50 border-green-200'}
          border p-4 ${getPositionClasses()} ${className}
        `}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className={`
                mt-0.5
                ${statusColor === 'red' ? 'text-red-600' :
                  statusColor === 'yellow' ? 'text-yellow-600' :
                  'text-green-600'}
              `}>
                {getNetworkIcon()}
              </div>
              <div>
                <h3 className={`
                  text-sm font-medium
                  ${statusColor === 'red' ? 'text-red-800' :
                    statusColor === 'yellow' ? 'text-yellow-800' :
                    'text-green-800'}
                `}>
                  {getStatusMessage()}
                </h3>
                {!networkStatus.isOnline && (
                  <p className={`
                    text-xs mt-1
                    ${statusColor === 'red' ? 'text-red-600' :
                      statusColor === 'yellow' ? 'text-yellow-600' :
                      'text-green-600'}
                  `}>
                    Translation and recording features require an internet connection
                  </p>
                )}
                {renderDetails()}
              </div>
            </div>
            {renderRecovery()}
          </div>
        </div>
      )
  }
}

/**
 * Quick variants for common use cases
 */
export const NetworkStatusBadge = (props: Omit<OfflineIndicatorProps, 'variant'>) => (
  <OfflineIndicator {...props} variant="badge" />
)

export const NetworkStatusBar = (props: Omit<OfflineIndicatorProps, 'variant'>) => (
  <OfflineIndicator {...props} variant="status-bar" />
)

export const NetworkStatusToast = (props: Omit<OfflineIndicatorProps, 'variant'>) => (
  <OfflineIndicator {...props} variant="toast" />
)

/**
 * Connection quality indicator (always visible)
 */
export function ConnectionQualityIndicator({ className = '' }: { className?: string }) {
  const networkStatus = useNetworkStatus()

  return (
    <div className={`inline-flex items-center gap-1 text-xs text-gray-500 ${className}`}>
      {networkStatus.isOnline ? (
        <>
          {networkStatus.quality === 'fast' && <SignalHigh className="w-3 h-3 text-green-500" />}
          {networkStatus.quality === 'slow' && <SignalMedium className="w-3 h-3 text-yellow-500" />}
          {networkStatus.quality === 'very-slow' && <SignalLow className="w-3 h-3 text-red-500" />}
          <span className="capitalize">{networkStatus.quality}</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3 text-red-500" />
          <span>Offline</span>
        </>
      )}
    </div>
  )
}