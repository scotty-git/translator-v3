import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Languages, Users, MessageSquare } from 'lucide-react'
import { SessionService } from '@/services/supabase'
import { useTranslation } from '@/lib/i18n/useTranslation'
import { LanguageSelector } from '@/components/ui/LanguageSelector'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { usePageTransitions } from '@/hooks/useAnimations'
import { Settings } from 'lucide-react'

export function HomeScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { registerPage } = usePageTransitions()
  const [mode, setMode] = useState<'create' | 'join' | null>(null)
  const [sessionCode, setSessionCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Check for error message from session redirect
  useEffect(() => {
    if (location.state?.error) {
      setError(location.state.error)
      // Clear the error from location state after showing it
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const handleCreateSession = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      const session = await SessionService.createSession()
      navigate(`/session/${session.code}?created=true`)
    } catch (err) {
      setError(t('errors.sessionCreateFailed'))
      console.error('Create session error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinSession = async () => {
    if (sessionCode.length !== 4) {
      setError(t('errors.invalidSessionCode'))
      return
    }

    setIsLoading(true)
    setError('')
    
    try {
      const session = await SessionService.joinSession(sessionCode)
      navigate(`/session/${session.code}`)
    } catch (err) {
      setError(t('errors.sessionJoinFailed'))
      console.error('Join session error:', err)
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <MobileContainer 
      ref={registerPage}
      className="min-h-screen flex flex-col justify-center py-12 bg-gray-50 dark:bg-gray-900"
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/conversations')}
            className="p-2"
            ariaLabel="View conversations"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex gap-2 items-center">
          <ThemeToggle />
          <LanguageSelector />
        </div>
      </div>
      
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Languages className="h-16 w-16 text-blue-600" />
              <Users className="h-8 w-8 text-blue-500 absolute -bottom-1 -right-1" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t('home.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {t('home.subtitle')}
          </p>
        </div>

        {/* Main Actions */}
        {mode === null && (
          <Card className="space-y-4 animate-stagger-2">
            {/* Single Device Mode */}
            <Button
              onClick={() => navigate('/translator')}
              size="lg"
              fullWidth
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              disabled={isLoading}
            >
              🗣️ {t('home.singleDevice', 'Start Translating')}
            </Button>
            
            <div className="text-xs text-gray-500 text-center px-4">
              {t('home.singleDeviceDescription', 'Perfect for face-to-face conversations. Auto-detects languages.')}
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">{t('home.orSeparateDevices', 'or use separate devices')}</span>
              </div>
            </div>
            
            {/* Session Mode */}
            <div className="space-y-2">
              <Button
                onClick={handleCreateSession}
                size="lg"
                fullWidth
                variant="secondary"
                disabled={isLoading}
              >
                {isLoading ? t('home.creating') : t('home.createSession')}
              </Button>
              <Button
                onClick={() => setMode('join')}
                variant="secondary"
                size="lg"
                fullWidth
                disabled={isLoading}
              >
                {t('home.joinSession')}
              </Button>
            </div>
          </Card>
        )}


        {/* Join Session */}
        {mode === 'join' && (
          <Card className="space-y-4">
            <h2 className="text-xl font-semibold text-center">
              {t('home.joinSession')}
            </h2>
            <p className="text-sm text-gray-600 text-center">
              {t('home.joinDescription')}
            </p>
            <Input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              placeholder="0000"
              value={sessionCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '')
                setSessionCode(value)
                setError('')
              }}
              className="text-center text-2xl font-mono tracking-widest"
              error={!!error}
              disabled={isLoading}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleJoinSession}
                size="lg"
                fullWidth
                disabled={isLoading || sessionCode.length !== 4}
              >
                {isLoading ? t('home.joining') : t('home.joinSessionButton')}
              </Button>
              <Button
                onClick={() => {
                  setMode(null)
                  setSessionCode('')
                  setError('')
                }}
                variant="ghost"
                size="lg"
                disabled={isLoading}
              >
                {t('common.cancel')}
              </Button>
            </div>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
            )}
          </Card>
        )}


        {/* Footer */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>{t('home.sessionExpiry')}</p>
        </div>
      </div>
    </MobileContainer>
  )
}