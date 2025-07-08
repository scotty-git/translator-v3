import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { UserManager, SessionHistoryEntry } from '@/lib/user/UserManager'
import { History, ArrowRight, Trash2, Clock } from 'lucide-react'

interface SessionRecoveryProps {
  onSelectSession: (code: string) => void
  className?: string
}

export function SessionRecovery({ onSelectSession, className = '' }: SessionRecoveryProps) {
  const [history, setHistory] = useState<SessionHistoryEntry[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [loadingSession, setLoadingSession] = useState<string | null>(null)

  useEffect(() => {
    // Load session history
    const sessionHistory = UserManager.getSessionHistory()
    setHistory(sessionHistory)
  }, [])

  const handleSelectSession = async (code: string) => {
    setLoadingSession(code)
    try {
      onSelectSession(code)
    } catch (error) {
      console.error('Failed to join session:', error)
    } finally {
      setLoadingSession(null)
    }
  }

  const handleRemoveSession = (code: string, event: React.MouseEvent) => {
    event.stopPropagation()
    
    UserManager.removeFromSessionHistory(code)
    setHistory(prev => prev.filter(session => session.code !== code))
  }

  const handleClearHistory = () => {
    if (confirm('Clear all session history?')) {
      UserManager.clearSessionHistory()
      setHistory([])
    }
  }

  const formatTimeAgo = (dateString: string): string => {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now.getTime() - date.getTime()
    
    const diffMinutes = Math.floor(diffMs / (60 * 1000))
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) {
      return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`
    } else if (diffHours > 0) {
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
    } else if (diffMinutes > 0) {
      return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`
    } else {
      return 'Just now'
    }
  }

  if (history.length === 0) {
    return null
  }

  const recentSessions = isExpanded ? history : history.slice(0, 3)

  return (
    <Card className={`${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-700">Recent Sessions</h3>
        </div>
        
        {history.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearHistory}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      <div className="space-y-2">
        {recentSessions.map((session) => (
          <div
            key={session.code}
            className="group relative flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => handleSelectSession(session.code)}
          >
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className="font-mono font-semibold text-lg text-gray-900">
                  {session.code}
                </span>
                
                {loadingSession === session.code && (
                  <div className="flex items-center gap-1 text-xs text-blue-600">
                    <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    Joining...
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                <Clock className="h-3 w-3" />
                <span>{formatTimeAgo(session.joinedAt)}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Remove button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => handleRemoveSession(session.code, e)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-600"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
              
              {/* Arrow icon */}
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </div>
          </div>
        ))}
      </div>
      
      {/* Show more/less button */}
      {history.length > 3 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-3 text-gray-500 hover:text-gray-700"
        >
          {isExpanded ? (
            <div className="flex items-center gap-1">
              <span>Show less</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span>Show all ({history.length})</span>
            </div>
          )}
        </Button>
      )}
    </Card>
  )
}