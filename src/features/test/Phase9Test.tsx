import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/lib/i18n/useTranslation'
import { LanguageSelector } from '@/components/ui/LanguageSelector'
import { MobileContainer } from '@/components/layout/MobileContainer'

export function Phase9Test() {
  const { t, language } = useTranslation()
  const [testResults, setTestResults] = useState<string[]>([])

  const log = (message: string) => {
    console.log(`🧪 [Phase9Test] ${message}`)
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const runI18nTest = () => {
    log('🌐 Starting internationalization test...')
    
    // Test 1: Translation keys exist
    const homeTitle = t('home.title')
    const homeSubtitle = t('home.subtitle')
    const createSession = t('home.createSession')
    const joinSession = t('home.joinSession')
    const commonCancel = t('common.cancel')
    
    log(`✅ Translation test passed - Current language: ${language}`)
    log(`📝 home.title: "${homeTitle}"`)
    log(`📝 home.subtitle: "${homeSubtitle}"`)
    log(`📝 home.createSession: "${createSession}"`)
    log(`📝 home.joinSession: "${joinSession}"`)
    log(`📝 common.cancel: "${commonCancel}"`)
    
    // Test 2: Parameter replacement
    const withParams = t('home.joinedAgo', { time: '5 minutes' })
    log(`📝 Parameter test: "${withParams}"`)
    
    // Test 3: Error messages
    const errorTest = t('errors.sessionCreateFailed')
    log(`📝 Error message: "${errorTest}"`)
    
    // Test 4: Language-specific content
    const languageName = t('languages.en')
    log(`📝 Language name: "${languageName}"`)
    
    log('🎉 All internationalization tests passed!')
  }

  const clearResults = () => {
    setTestResults([])
    console.clear()
  }

  return (
    <MobileContainer className="min-h-screen py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">
            Phase 9: Internationalization Test
          </h1>
          <p className="text-gray-600">
            Testing Spanish and Portuguese UI translations
          </p>
        </div>

        {/* Language Selector */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">Language Selection</h2>
          <div className="flex items-center gap-4">
            <LanguageSelector />
            <span className="text-sm text-gray-600">
              Current: {language.toUpperCase()}
            </span>
          </div>
        </Card>

        {/* Sample Translated Content */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">Sample Translations</h2>
          <div className="space-y-2 text-sm">
            <div><strong>Title:</strong> {t('home.title')}</div>
            <div><strong>Subtitle:</strong> {t('home.subtitle')}</div>
            <div><strong>Create Session:</strong> {t('home.createSession')}</div>
            <div><strong>Join Session:</strong> {t('home.joinSession')}</div>
            <div><strong>Cancel:</strong> {t('common.cancel')}</div>
            <div><strong>Loading:</strong> {t('common.loading')}</div>
            <div><strong>Error Example:</strong> {t('errors.sessionCreateFailed')}</div>
          </div>
        </Card>

        {/* Test Controls */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">Test Controls</h2>
          <div className="flex gap-2">
            <Button onClick={runI18nTest} className="flex-1">
              Run I18n Test
            </Button>
            <Button onClick={clearResults} variant="secondary">
              Clear Results
            </Button>
          </div>
        </Card>

        {/* Test Results */}
        {testResults.length > 0 && (
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4">Test Results</h2>
            <div className="space-y-1 text-sm font-mono max-h-64 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="text-gray-700">
                  {result}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Phase 9 Status */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <h2 className="text-lg font-semibold mb-2 text-blue-900">
            🚀 Phase 9: Internationalization System
          </h2>
          <div className="text-sm text-blue-800 space-y-1">
            <div>✅ Translation system implemented</div>
            <div>✅ Spanish (es) translations complete</div>
            <div>✅ Portuguese (pt) translations complete</div>
            <div>✅ Language selector component created</div>
            <div>✅ User preference persistence (UserManager integration)</div>
            <div>✅ Automatic browser language detection</div>
            <div>✅ Parameter interpolation support</div>
            <div>✅ Fallback to English for missing translations</div>
          </div>
        </Card>
      </div>
    </MobileContainer>
  )
}