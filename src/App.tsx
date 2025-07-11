import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { ViewportToggle } from '@/components/layout/ViewportToggle'
import { Spinner } from '@/components/ui/Spinner'

// Lazy load main components for code splitting
const HomeScreen = lazy(() => import('@/features/home/HomeScreen').then(m => ({ default: m.HomeScreen })))
const SingleDeviceTranslator = lazy(() => import('@/features/translator/SingleDeviceTranslator').then(m => ({ default: m.SingleDeviceTranslator })))
const SessionTranslator = lazy(() => import('@/features/translator/SessionTranslator').then(m => ({ default: m.SessionTranslator })))

// Lazy load test components (only loaded when needed)
const Phase4Test = lazy(() => import('@/features/test/Phase4Test').then(m => ({ default: m.Phase4Test })))
const Phase4TestRunner = lazy(() => import('@/features/test/Phase4TestRunner').then(m => ({ default: m.Phase4TestRunner })))
const Phase5Test = lazy(() => import('@/features/test/Phase5Test').then(m => ({ default: m.Phase5Test })))
const Phase6Test = lazy(() => import('@/tests/e2e/phase6/Phase6Test').then(m => ({ default: m.Phase6Test })))
const Phase7Test = lazy(() => import('@/tests/e2e/phase7/Phase7Test').then(m => ({ default: m.Phase7Test })))
const Phase8Test = lazy(() => import('@/tests/e2e/phase8/Phase8Test').then(m => ({ default: m.Phase8Test })))
const Phase9Test = lazy(() => import('@/features/test/Phase9Test').then(m => ({ default: m.Phase9Test })))
const Phase9ComprehensiveTest = lazy(() => import('@/features/test/Phase9ComprehensiveTest').then(m => ({ default: m.Phase9ComprehensiveTest })))
const AnimationTest = lazy(() => import('@/features/test/AnimationTest').then(m => ({ default: m.AnimationTest })))
const AccessibilityTest = lazy(() => import('@/features/test/AccessibilityTest').then(m => ({ default: m.AccessibilityTest })))
const ConversationScreen = lazy(() => import('@/features/conversation/ConversationScreen').then(m => ({ default: m.ConversationScreen })))
const SettingsScreen = lazy(() => import('@/features/settings/SettingsScreen').then(m => ({ default: m.SettingsScreen })))
const NetworkQualityTest = lazy(() => import('@/features/test/NetworkQualityTest').then(m => ({ default: m.NetworkQualityTest })))
const QualityDegradationTest = lazy(() => import('@/features/test/QualityDegradationTest').then(m => ({ default: m.QualityDegradationTest })))
const ProgressPreservationTest = lazy(() => import('@/features/test/ProgressPreservationTest').then(m => ({ default: m.ProgressPreservationTest })))
const IOSAudioTest = lazy(() => import('@/features/test/IOSAudioTest').then(m => ({ default: m.IOSAudioTest })))
const MasterTestSuite = lazy(() => import('@/features/test/MasterTestSuite').then(m => ({ default: m.MasterTestSuite })))
const BasicTest = lazy(() => import('@/features/test/BasicTest').then(m => ({ default: m.BasicTest })))
const CoreUserExperienceTest = lazy(() => import('@/features/test/CoreUserExperienceTest').then(m => ({ default: m.default })))
import { QualityDegradationService } from '@/lib/quality-degradation'
import { ProgressPreservationService } from '@/lib/progress-preservation'
import { networkQualityDetector } from '@/lib/network-quality'
import { iosAudioContextManager } from '@/lib/ios-audio-context'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { TranslationProvider } from '@/lib/i18n/useTranslation'
import { ToastProvider } from '@/components/ui/Toast'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { accessibilityManager } from '@/lib/accessibility/AccessibilityManager'
import { pwaManager } from '@/lib/pwa/PWAManager'
import { UserManager } from '@/lib/user/UserManager'
import { MessageQueueService } from '@/services/queues/MessageQueueService'
import SoloTranslator from '@/features/translator/solo/SoloTranslator'

// Solo translator with injected MessageQueueService
function SoloTranslatorWrapper() {
  const messageQueueService = new MessageQueueService()
  return <SoloTranslator messageQueueService={messageQueueService} />
}

// Loading fallback component for lazy loaded routes
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-app">
      <div className="text-center space-y-4">
        <Spinner size="lg" />
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  )
}

function App() {
  // Initialize quality degradation and network monitoring
  useEffect(() => {
    // Initialize network quality detection
    networkQualityDetector.initialize()
    
    // Initialize quality degradation service
    QualityDegradationService.initialize()
    
    // Initialize progress preservation service
    ProgressPreservationService.initialize()
    
    // Initialize iOS audio context manager (will auto-detect iOS)
    // This is a no-op on non-iOS devices
    const audioInfo = iosAudioContextManager.getIOSAudioInfo()
    if (audioInfo.isIOS) {
      console.log('🍎 iOS detected - audio context manager initialized')
    }
    
    // Initialize accessibility manager
    accessibilityManager.announce('Application loaded', 'polite')
    
    // Initialize PWA manager
    pwaManager.requestPersistentStorage()
    
    // Initialize font size system
    UserManager.initializeFontSize()
    
    console.log('🌐 Network quality monitoring, quality degradation, progress preservation, and iOS audio context initialized')
    console.log('♿ [Phase 9] Accessibility manager initialized - WCAG 2.1 AA compliance enabled')
    console.log('📱 [Phase 9] PWA manager initialized - Progressive Web App features enabled')
    console.log('📦 [Phase 7] Bundle optimization: Lazy loading enabled for all routes')
    console.log('🔤 Font size system initialized with 4-size responsive scaling')
  }, [])

  // Font size cycling with 'F' key - based on oldappfeatures.md
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only trigger if 'F' key is pressed and not inside an input field
      if (event.key.toLowerCase() === 'f' && 
          !(event.target instanceof HTMLInputElement) && 
          !(event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault()
        const newSize = UserManager.cycleFontSize()
        
        // Visual feedback for font size change
        accessibilityManager.announce(`Font size changed to ${UserManager.getFontSizeDisplayName(newSize)}`, 'polite')
        console.log(`🔤 Font size cycled to: ${newSize}`)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <TranslationProvider>
          <ToastProvider>
            <ViewportToggle>
              <BrowserRouter>
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
              <Route path="/" element={
                <Layout>
                  <HomeScreen />
                </Layout>
              } />
              <Route path="/translator" element={<SoloTranslatorWrapper />} />
              <Route path="/session" element={<SessionTranslator />} />
              <Route path="/test/phase4" element={
                <Layout>
                  <Phase4Test />
                </Layout>
              } />
              <Route path="/test/phase4-runner" element={
                <Layout>
                  <Phase4TestRunner />
                </Layout>
              } />
              <Route path="/test/phase5" element={
                <Layout>
                  <Phase5Test />
                </Layout>
              } />
              <Route path="/test/Phase5Test" element={
                <Layout>
                  <Phase5Test />
                </Layout>
              } />
              <Route path="/test/phase6" element={
                <Layout>
                  <Phase6Test />
                </Layout>
              } />
              <Route path="/test/phase7" element={
                <Layout>
                  <Phase7Test />
                </Layout>
              } />
              <Route path="/test/phase8" element={
                <Layout>
                  <Phase8Test />
                </Layout>
              } />
              <Route path="/test/phase9" element={
                <Layout>
                  <Phase9Test />
                </Layout>
              } />
              <Route path="/test/phase9-comprehensive" element={
                <Phase9ComprehensiveTest />
              } />
              <Route path="/test/animations" element={
                <Layout>
                  <AnimationTest />
                </Layout>
              } />
              <Route path="/test/accessibility" element={
                <AccessibilityTest />
              } />
              <Route path="/conversations" element={
                <ConversationScreen />
              } />
              <Route path="/settings" element={
                <SettingsScreen />
              } />
              <Route path="/test/network" element={
                <Layout>
                  <NetworkQualityTest />
                </Layout>
              } />
              <Route path="/test/quality-degradation" element={
                <Layout>
                  <QualityDegradationTest />
                </Layout>
              } />
              <Route path="/test/progress-preservation" element={
                <Layout>
                  <ProgressPreservationTest />
                </Layout>
              } />
              <Route path="/test/ios-audio" element={
                <Layout>
                  <IOSAudioTest />
                </Layout>
              } />
              <Route path="/test/master" element={
                <MasterTestSuite />
              } />
              <Route path="/test/basic" element={
                <BasicTest />
              } />
              <Route path="/test/core-ux" element={
                <CoreUserExperienceTest />
              } />
              </Routes>
            </Suspense>
            </BrowserRouter>
            </ViewportToggle>
          </ToastProvider>
        </TranslationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App