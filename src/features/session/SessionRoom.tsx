import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { SessionProvider } from './SessionContext'
import { SessionHeader } from './SessionHeader'
import { MessageList } from '../messages/MessageList'
import { SessionRecordingControls } from '../audio/SessionRecordingControls'
import { PerformanceMonitor } from '../messages/PerformanceMonitor'
import { Spinner } from '@/components/ui/Spinner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AlertTriangle } from 'lucide-react'
import { useSessionState } from '@/hooks/useSessionState'
import { useSessionUnloadWarning } from '@/hooks/useBeforeUnload'
import { UserManager } from '@/lib/user/UserManager'
import { useTranslation } from '@/lib/i18n/useTranslation'
import type { Session } from '@/types/database'

export function SessionRoom() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  
  // Use new session state management
  const { session, connectionState, error, leave } = useSessionState(code)
  
  // Get user profile with enhanced management
  const user = UserManager.getOrCreateUser()
  const userId = user.id
  const isLeft = user.isLeft

  // Browser warning when leaving active session
  useSessionUnloadWarning(!!session, t('session.unloadWarning'))

  useEffect(() => {
    if (!code) {
      navigate('/')
      return
    }
  }, [code, navigate])

  const handleLeave = async () => {
    if (window.confirm(t('session.leaveConfirm'))) {
      try {
        await leave()
        navigate('/')
      } catch (error) {
        console.error('Error leaving session:', error)
        // Navigate anyway
        navigate('/')
      }
    }
  }

  // Loading state
  if (connectionState === 'connecting') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Spinner size="lg" />
          <p className="text-gray-600">{t('session.connectingToSession')}</p>
          {code && <p className="text-sm text-gray-500 font-mono">Session: {code}</p>}
        </div>
      </div>
    )
  }

  // Error state
  if (connectionState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-semibold">{t('session.connectionError')}</h2>
            <p className="text-gray-600">{error}</p>
            <div className="space-y-2">
              <Button onClick={() => navigate('/')} fullWidth>
                {t('session.returnHome')}
              </Button>
              {code && (
                <Button 
                  variant="secondary" 
                  onClick={() => window.location.reload()} 
                  fullWidth
                >
                  {t('session.tryAgain')}
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <SessionProvider session={session} userId={userId} isLeft={isLeft}>
      <div className="min-h-screen bg-app flex flex-col relative overflow-hidden">
        <SessionHeader onLeave={handleLeave} />
        
        <div className="flex-1 flex flex-col">
          <MessageList />
        </div>
        
        <SessionRecordingControls />
        
        {/* Performance monitor (dev only) */}
        <PerformanceMonitor />
      </div>
    </SessionProvider>
  )
}