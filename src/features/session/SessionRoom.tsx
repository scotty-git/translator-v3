import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { SessionProvider } from './SessionContext'
import { SessionHeader } from './SessionHeader'
import { MessageList } from '../messages/MessageList'
import { SessionRecordingControls } from '../audio/SessionRecordingControls'
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
  const location = useLocation()
  const { t } = useTranslation()
  
  // Check if this is a newly created session
  const searchParams = new URLSearchParams(location.search)
  const isNewlyCreated = searchParams.get('created') === 'true'
  
  // Use new session state management
  const { session, connectionState, error, leave } = useSessionState(code, {}, isNewlyCreated)
  
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

  // Error state with automatic redirect for invalid sessions
  if (connectionState === 'error') {
    // Check if error indicates session not found and redirect automatically
    const isSessionNotFound = error?.includes('not found') || 
                             error?.includes('does not exist') || 
                             error?.includes('Newly created session not found')
    
    if (isSessionNotFound && code) {
      // Redirect to home after a brief delay to show the error
      setTimeout(() => {
        navigate('/', { 
          state: { 
            error: `Session ${code} was not found or has expired.` 
          } 
        })
      }, 2000)
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-semibold">{t('session.connectionError')}</h2>
            <p className="text-gray-600">{error}</p>
            {isSessionNotFound && (
              <p className="text-sm text-gray-500">
                Redirecting to home page...
              </p>
            )}
            <div className="space-y-2">
              <Button onClick={() => navigate('/')} fullWidth>
                {t('session.returnHome')}
              </Button>
              {code && !isSessionNotFound && (
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
      </div>
    </SessionProvider>
  )
}