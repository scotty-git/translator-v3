import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { useTranslation } from '@/lib/i18n/useTranslation'
import { useTheme } from '@/contexts/ThemeContext'
import { UserManager } from '@/lib/user/UserManager'
import { useSounds } from '@/lib/sounds/SoundManager'
import { 
  ArrowLeft, 
  Languages, 
  Palette, 
  Volume2, 
  Bell, 
  Settings,
  Moon,
  Sun,
  Monitor,
  Check,
  Smartphone,
  Type
} from 'lucide-react'

export function SettingsScreen() {
  const navigate = useNavigate()
  const { t, language, setLanguage } = useTranslation()
  const { theme, setTheme } = useTheme()
  const { isEnabled: soundsEnabled, setEnabled: setSoundsEnabled, testSound } = useSounds()
  
  // Get current user preferences
  const [audioQuality, setAudioQuality] = useState(UserManager.getPreference('audioQuality', 'high'))
  const [hapticFeedback, setHapticFeedback] = useState(UserManager.getPreference('hapticFeedback', true))
  const [notifications, setNotifications] = useState(UserManager.getPreference('notifications', true))
  const [autoSave, setAutoSave] = useState(UserManager.getPreference('autoSave', true))
  const [reducedMotion, setReducedMotion] = useState(UserManager.getPreference('reducedMotion', false))
  const [fontSize, setFontSize] = useState(UserManager.getFontSize())

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage)
    UserManager.setPreference('language', newLanguage)
  }

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
    UserManager.setPreference('theme', newTheme)
  }

  const handleAudioQualityChange = (quality: string) => {
    setAudioQuality(quality)
    UserManager.setPreference('audioQuality', quality)
  }

  const handleFontSizeChange = (size: 'small' | 'medium' | 'large' | 'xl') => {
    setFontSize(size)
    UserManager.setFontSize(size)
  }

  const handlePreferenceToggle = (key: string, currentValue: boolean) => {
    const newValue = !currentValue
    UserManager.setPreference(key, newValue)
    
    switch (key) {
      case 'hapticFeedback':
        setHapticFeedback(newValue)
        break
      case 'notifications':
        setNotifications(newValue)
        break
      case 'autoSave':
        setAutoSave(newValue)
        break
      case 'reducedMotion':
        setReducedMotion(newValue)
        break
    }
  }

  const handleTestSound = async () => {
    const success = await testSound()
    if (!success) {
      alert('Sound test failed. Please check your audio settings and permissions.')
    }
  }


  const languages = [
    { code: 'en', name: t('settings.languages.english'), flag: '🇺🇸' },
    { code: 'es', name: t('settings.languages.spanish'), flag: '🇪🇸' },
    { code: 'pt', name: t('settings.languages.portuguese'), flag: '🇵🇹' }
  ]

  const themes = [
    { value: 'light', name: t('settings.themes.light'), icon: Sun },
    { value: 'dark', name: t('settings.themes.dark'), icon: Moon },
    { value: 'system', name: t('settings.themes.system'), icon: Monitor }
  ]

  const audioQualities = [
    { value: 'high', name: t('settings.audio.high'), description: t('settings.audio.highDesc') },
    { value: 'medium', name: t('settings.audio.medium'), description: t('settings.audio.mediumDesc') },
    { value: 'low', name: t('settings.audio.low'), description: t('settings.audio.lowDesc') }
  ]

  const fontSizes = [
    { value: 'small', name: 'Small', description: '14px mobile, 16px desktop' },
    { value: 'medium', name: 'Medium', description: '16px mobile, 18px desktop' },
    { value: 'large', name: 'Large', description: '20px mobile, 22px desktop' },
    { value: 'xl', name: 'Extra Large', description: '24px mobile, 28px desktop' }
  ]

  return (
    <MobileContainer className="min-h-screen py-6 space-y-6 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="p-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t('settings.title')}</h1>
        </div>
      </div>

      {/* Language Settings */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <Languages className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('settings.language')}</h2>
        </div>
        
        <div className="space-y-2">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                language === lang.code
                  ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <span className="text-2xl">{lang.flag}</span>
              <span className="flex-1 text-left text-gray-900 dark:text-gray-100">{lang.name}</span>
              {language === lang.code && (
                <Check className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              )}
            </button>
          ))}
        </div>
      </Card>

      {/* Theme Settings */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('settings.appearance')}</h2>
        </div>
        
        <div className="space-y-2">
          {themes.map((themeOption) => {
            const IconComponent = themeOption.icon
            return (
              <button
                key={themeOption.value}
                onClick={() => handleThemeChange(themeOption.value)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  theme === themeOption.value
                    ? 'border-purple-500 bg-purple-50 dark:border-purple-400 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <IconComponent className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                <span className="flex-1 text-left text-gray-900 dark:text-gray-100">{themeOption.name}</span>
                {theme === themeOption.value && (
                  <Check className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                )}
              </button>
            )
          })}
        </div>
      </Card>

      {/* Font Size Settings */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <Type className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Font Size</h2>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Press F to cycle</span>
        </div>
        
        <div className="space-y-2">
          {fontSizes.map((fontOption) => (
            <button
              key={fontOption.value}
              onClick={() => handleFontSizeChange(fontOption.value as any)}
              className={`w-full p-3 rounded-lg border text-left transition-all ${
                fontSize === fontOption.value
                  ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{fontOption.name}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">{fontOption.description}</div>
                </div>
                {fontSize === fontOption.value && (
                  <Check className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                )}
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Audio Settings */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('settings.audio.title')}</h2>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              {t('settings.audio.quality')}
            </label>
            <div className="space-y-2">
              {audioQualities.map((quality) => (
                <button
                  key={quality.value}
                  onClick={() => handleAudioQualityChange(quality.value)}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    audioQuality === quality.value
                      ? 'border-green-500 bg-green-50 dark:border-green-400 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{quality.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">{quality.description}</div>
                    </div>
                    {audioQuality === quality.value && (
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Experience Settings */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('settings.experience')}</h2>
        </div>
        
        <div className="space-y-3">
          {/* Haptic Feedback */}
          <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">{t('settings.hapticFeedback')}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">{t('settings.hapticFeedbackDesc')}</div>
            </div>
            <button
              onClick={() => handlePreferenceToggle('hapticFeedback', hapticFeedback)}
              className={`w-12 h-6 rounded-full transition-all ${
                hapticFeedback ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                hapticFeedback ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Reduced Motion */}
          <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">{t('settings.reducedMotion')}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">{t('settings.reducedMotionDesc')}</div>
            </div>
            <button
              onClick={() => handlePreferenceToggle('reducedMotion', reducedMotion)}
              className={`w-12 h-6 rounded-full transition-all ${
                reducedMotion ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                reducedMotion ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Auto Save */}
          <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">{t('settings.autoSave')}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">{t('settings.autoSaveDesc')}</div>
            </div>
            <button
              onClick={() => handlePreferenceToggle('autoSave', autoSave)}
              className={`w-12 h-6 rounded-full transition-all ${
                autoSave ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                autoSave ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>
      </Card>

      {/* Notifications */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('settings.notifications')}</h2>
        </div>
        
        <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{t('settings.enableNotifications')}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">{t('settings.notificationsDesc')}</div>
          </div>
          <button
            onClick={() => handlePreferenceToggle('notifications', notifications)}
            className={`w-12 h-6 rounded-full transition-all ${
              notifications ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
              notifications ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </Card>



      {/* App Information */}
      <Card className="space-y-2">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('settings.about')}</h2>
        <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
          <p>{t('settings.appName')}: Real-time Translator v3</p>
          <p>{t('settings.version')}: Phase 9.0.0</p>
          <p>{t('settings.buildDate')}: {new Date().toLocaleDateString()}</p>
        </div>
      </Card>

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 dark:text-gray-400">
        <p>{t('settings.footer')}</p>
      </div>
    </MobileContainer>
  )
}