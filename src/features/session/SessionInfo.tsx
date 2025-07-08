import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Users, Clock, Link2, AlertTriangle, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { useSessionState } from '@/hooks/useSessionState'

interface SessionInfoProps {
  sessionCode: string
  className?: string
}

interface TimeDisplay {
  text: string
  color: string
  isWarning: boolean
}

export function SessionInfo({ sessionCode, className = '' }: SessionInfoProps) {
  const { session, connectionState, error, reconnectAttempts, getTimeUntilExpiry, extendSession } = useSessionState(sessionCode)
  const [timeDisplay, setTimeDisplay] = useState<TimeDisplay>({ text: '', color: '', isWarning: false })
  const [isExtending, setIsExtending] = useState(false)

  // Update time display every minute
  useEffect(() => {
    if (!session) return

    const updateTimeDisplay = () => {
      const timeLeft = getTimeUntilExpiry()
      
      if (timeLeft <= 0) {
        setTimeDisplay({
          text: 'Expired',
          color: 'text-red-600',
          isWarning: true
        })
        return
      }

      const minutes = Math.floor(timeLeft / (60 * 1000))
      const hours = Math.floor(minutes / 60)
      
      let text: string
      let color: string
      let isWarning: boolean

      if (hours > 1) {
        text = `${hours}h ${minutes % 60}m`
        color = 'text-gray-600'
        isWarning = false
      } else if (minutes > 30) {
        text = `${minutes}m`
        color = 'text-gray-600'
        isWarning = false
      } else if (minutes > 5) {
        text = `${minutes}m`
        color = 'text-yellow-600'
        isWarning = true
      } else {
        text = `${minutes}m`
        color = 'text-red-600'
        isWarning = true
      }

      setTimeDisplay({ text, color, isWarning })
    }

    updateTimeDisplay()
    const interval = setInterval(updateTimeDisplay, 60000) // Update every minute
    
    return () => clearInterval(interval)
  }, [session, getTimeUntilExpiry])

  // Listen for session expiry warnings
  useEffect(() => {
    const handleExpiryWarning = (event: CustomEvent) => {
      const { minutes } = event.detail
      console.log(`⚠️ Session expires in ${minutes} minutes`)
    }

    const handleSessionExpired = () => {
      console.log('❌ Session has expired')
    }

    window.addEventListener('session-expiry-warning', handleExpiryWarning as EventListener)
    window.addEventListener('session-expired', handleSessionExpired)
    
    return () => {
      window.removeEventListener('session-expiry-warning', handleExpiryWarning as EventListener)
      window.removeEventListener('session-expired', handleSessionExpired)
    }
  }, [])

  const getConnectionStatus = () => {
    switch (connectionState) {
      case 'connecting':
        return { 
          icon: RefreshCw, 
          text: 'Connecting...', 
          color: 'text-yellow-600',
          iconClass: 'animate-spin'
        }
      case 'connected':
        return { 
          icon: Wifi, 
          text: 'Connected', 
          color: 'text-green-600',
          iconClass: ''
        }
      case 'disconnected':
        return { 
          icon: WifiOff, 
          text: `Reconnecting... (${reconnectAttempts}/5)`, 
          color: 'text-orange-600',
          iconClass: 'animate-pulse'
        }
      case 'error':
        return { 
          icon: WifiOff, 
          text: error || 'Connection error', 
          color: 'text-red-600',
          iconClass: ''
        }
    }
  }

  const handleExtendSession = async () => {
    if (!session || isExtending) return
    
    setIsExtending(true)
    try {
      await extendSession()
      console.log('✅ Session extended by 4 hours')
    } catch (error) {
      console.error('Failed to extend session:', error)
    } finally {
      setIsExtending(false)
    }
  }

  const status = getConnectionStatus()
  const StatusIcon = status.icon

  return (
    <Card className={`space-y-3 ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon className={`h-4 w-4 ${status.color} ${status.iconClass}`} />
          <span className="text-sm text-gray-600">Status</span>
        </div>
        <span className={`text-sm font-medium ${status.color}`}>
          {status.text}
        </span>
      </div>

      {/* Session Code */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">Session</span>
        </div>
        <span className="text-lg font-mono font-bold text-gray-900" data-testid="session-code">{sessionCode}</span>
      </div>

      {/* User Count */}
      {session && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Users</span>
          </div>
          <span className="text-sm font-medium text-gray-900">{session.user_count}</span>
        </div>
      )}

      {/* Time Until Expiry */}
      {session && timeDisplay.text && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Expires in</span>
          </div>
          <span className={`text-sm font-medium ${timeDisplay.color}`}>
            {timeDisplay.text}
          </span>
        </div>
      )}

      {/* Expiry Warning */}
      {timeDisplay.isWarning && session && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-yellow-800 font-medium">
                Session expiring soon
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Extend now to avoid disconnection
              </p>
            </div>
          </div>
          
          <Button
            onClick={handleExtendSession}
            disabled={isExtending || connectionState !== 'connected'}
            size="sm"
            className="w-full"
          >
            {isExtending ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Extending...
              </div>
            ) : (
              'Extend Session (+4h)'
            )}
          </Button>
        </div>
      )}

      {/* Error State */}
      {connectionState === 'error' && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-800 font-medium">
              Connection Lost
            </p>
            <p className="text-xs text-red-700 mt-1">
              {error || 'Unable to maintain connection'}
            </p>
          </div>
        </div>
      )}
    </Card>
  )
}