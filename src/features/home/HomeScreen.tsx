import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Languages, Users, MessageSquare } from 'lucide-react'
import { useTranslation } from '@/lib/i18n/useTranslation'
import { LanguageSelector } from '@/components/ui/LanguageSelector'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { usePageTransitions } from '@/hooks/useAnimations'
import { Settings } from 'lucide-react'

export function HomeScreen() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { registerPage } = usePageTransitions()


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

        {/* Main Action */}
        <Card className="space-y-4 animate-stagger-2">
          <Button
            onClick={() => navigate('/translator')}
            size="lg"
            fullWidth
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            🗣️ {t('home.singleDevice', 'Start Translating')}
          </Button>
          
          <div className="text-xs text-gray-500 text-center px-4">
            {t('home.singleDeviceDescription', 'Perfect for face-to-face conversations. Auto-detects languages.')}
          </div>
        </Card>


      </div>
    </MobileContainer>
  )
}