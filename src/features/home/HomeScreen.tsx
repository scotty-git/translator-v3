import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Languages, Users, MessageSquare, UserPlus, Hash } from 'lucide-react'
import { useTranslation } from '@/lib/i18n/useTranslation'
import { LanguageSelector } from '@/components/ui/LanguageSelector'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { usePageTransitions } from '@/hooks/useAnimations'
import { Settings } from 'lucide-react'
import { sessionStateManager } from '@/services/session'
import { ErrorManager } from '@/lib/errors/ErrorManager'

export function HomeScreen() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { registerPage } = usePageTransitions()
  const [showJoinInput, setShowJoinInput] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [isJoiningSession, setIsJoiningSession] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStartSession = async () => {
    setError(null)
    setIsCreatingSession(true)
    
    try {
      // Create session via SessionStateManager
      const sessionState = await sessionStateManager.createSession()
      
      // Navigate to session
      navigate('/session')
    } catch (err) {
      const error = ErrorManager.handleError(err)
      setError(error.userMessage)
    } finally {
      setIsCreatingSession(false)
    }
  }

  const handleJoinSession = async () => {
    setError(null)
    setIsJoiningSession(true)
    
    try {
      console.log('🔍 [HomeScreen] Starting join process for code:', joinCode)
      
      // Join session via SessionStateManager
      const sessionState = await sessionStateManager.joinSession(joinCode)
      console.log('🔍 [HomeScreen] Session joined successfully:', sessionState.sessionCode)
      
      // Navigate to session
      navigate('/session')
      
    } catch (err) {
      console.error('❌ [HomeScreen] Join session failed:', err)
      const error = ErrorManager.handleError(err)
      setError(error.userMessage)
    } finally {
      setIsJoiningSession(false)
    }
  }

  return (
    <MobileContainer 
      ref={registerPage}
      className="h-[100dvh] flex flex-col py-4 bg-gray-50 dark:bg-gray-900 overflow-hidden"
      data-testid="home-screen"
    >
      {/* Top Navigation */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/settings')}
            className="p-2"
            ariaLabel="Open settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
          {/* Conversations feature - Work in Progress */}
          {/* <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/conversations')}
            className="p-2"
            ariaLabel="View conversations"
          >
            <MessageSquare className="h-5 w-5" />
          </Button> */}
        </div>
        <div className="flex gap-2 items-center">
          <ThemeToggle />
          <LanguageSelector />
        </div>
      </div>
      
      <div className="space-y-4 mt-12">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('home.title')}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t('home.subtitle')}
          </p>
        </div>

        {/* Main Actions */}
        <div className="space-y-4">
          {/* Solo Translator */}
          <Card className="space-y-4 animate-stagger-2">
            <Button
              onClick={() => navigate('/translator')}
              size="lg"
              fullWidth
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              🗣️ {t('home.singleDevice', 'Start Translating')} Test
            </Button>
            
            <div className="text-xs text-gray-500 text-center px-4">
              {t('home.singleDeviceDescription', 'Perfect for face-to-face conversations. Auto-detects languages.')}
            </div>
          </Card>

          {/* Or Divider */}
          <div className="flex items-center space-x-2">
            <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700"></div>
            <span className="text-sm text-gray-500 dark:text-gray-400">OR</span>
            <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700"></div>
          </div>

          {/* Session Options */}
          <Card className="space-y-4 animate-stagger-3">
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleStartSession}
                size="md"
                variant="outline"
                disabled={isCreatingSession}
                className="flex flex-row items-center justify-center gap-2 h-auto py-4 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <UserPlus className="h-4 w-4" />
                <span className="text-sm">{t('home.startSession', 'Start Session')}</span>
              </Button>
              
              <Button
                onClick={() => setShowJoinInput(!showJoinInput)}
                size="md"
                variant="outline"
                className="flex flex-row items-center justify-center gap-2 h-auto py-4 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <Hash className="h-4 w-4" />
                <span className="text-sm">{t('home.joinSession', 'Join Session')}</span>
              </Button>
            </div>

            {/* Join Input */}
            {showJoinInput && (
              <div className="space-y-3 animate-fade-in">
                <div className="flex gap-2 justify-center items-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 4-digit code"
                    className="w-[140px] h-10 px-4 py-2 text-center text-lg font-mono border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="join-code-input"
                  />
                  <Button
                    onClick={handleJoinSession}
                    disabled={isJoiningSession || joinCode.length !== 4}
                    size="md"
                    className="h-10 px-4 flex-shrink-0"
                  >
                    {isJoiningSession ? 'Joining...' : 'Join'}
                  </Button>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 text-center animate-fade-in">
                {error}
              </div>
            )}

            <div className="text-xs text-gray-500 text-center px-4">
              {t('home.sessionDescription', 'Connect two devices for remote translation. Share the 4-digit code to connect.')}
            </div>
          </Card>
        </div>

      </div>
    </MobileContainer>
  )
}