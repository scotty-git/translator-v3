import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from './SessionContext'
import { Button } from '@/components/ui/Button'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Copy, Check, LogOut, Users, Languages, Wifi, WifiOff } from 'lucide-react'

interface SessionHeaderProps {
  onLeave?: () => void
}

export function SessionHeader({ onLeave }: SessionHeaderProps) {
  const { session } = useSession()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!session) return null

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(session.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = session.code
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleLeave = () => {
    if (onLeave) {
      onLeave()
    } else {
      // Fallback to old behavior
      if (confirm('Are you sure you want to leave this session?')) {
        navigate('/')
      }
    }
  }

  return (
    <header className="glass-effect sticky top-0 z-50 border-b border-white/20 backdrop-blur-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Session Info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500 leading-none">Session</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-lg font-mono font-bold text-gray-900 tracking-wider">
                    {session.code}
                  </span>
                  <Button
                    onClick={handleCopyCode}
                    variant="ghost"
                    size="sm"
                    className={`p-1 transition-all duration-200 ${
                      copied ? 'bg-green-100 text-green-700' : 'hover:bg-blue-50 text-gray-500'
                    }`}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Connection & Users Status */}
            <div className="hidden sm:flex items-center gap-3">
              <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                isOnline 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {isOnline ? (
                  <Wifi className="h-3 w-3" />
                ) : (
                  <WifiOff className="h-3 w-3" />
                )}
                <span>{isOnline ? 'Online' : 'Offline'}</span>
              </div>
              
              <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                <Users className="h-3 w-3" />
                <span>{session.user_count || 1} connected</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Mobile status indicators */}
            <div className="sm:hidden flex items-center gap-2">
              <div className={`p-1.5 rounded-full ${
                isOnline ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'
              }`}>
                {isOnline ? (
                  <Wifi className="h-3 w-3 text-green-600 dark:text-green-400" />
                ) : (
                  <WifiOff className="h-3 w-3 text-red-600 dark:text-red-400" />
                )}
              </div>
            </div>
            
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            
            <Button
              onClick={handleLeave}
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 transition-all duration-200"
            >
              <LogOut className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Leave</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}