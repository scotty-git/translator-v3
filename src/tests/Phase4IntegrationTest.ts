import { WhisperService } from '@/services/openai/whisper'
import { TranslationService } from '@/services/openai/translation'
import { TTSService } from '@/services/openai/tts'
import { AudioRecorderService } from '@/services/audio/recorder'
import { AudioFormatService } from '@/services/audio/formats'

export class Phase4IntegrationTest {
  private static results: Array<{ test: string; passed: boolean; error?: string; duration?: number }> = []
  
  /**
   * Run all Phase 4 integration tests
   */
  static async runAllTests(): Promise<void> {
    console.log('🧪 Starting Phase 4 Integration Tests...')
    this.results = []
    
    // Test 1: Audio Format Support
    await this.testAudioFormatSupport()
    
    // Test 2: Audio Recording Capability
    await this.testAudioRecordingCapability()
    
    // Test 3: OpenAI API Configuration
    await this.testOpenAIConfiguration()
    
    // Test 4: Translation Prompts
    await this.testTranslationPrompts()
    
    // Test 5: Cost Calculations
    await this.testCostCalculations()
    
    // Test 6: Language Detection
    await this.testLanguageDetection()
    
    // Test 7: Context Building
    await this.testContextBuilding()
    
    // Skip actual API tests unless explicitly enabled
    if (true) { // Runtime API test configuration
      console.log('🚨 Running LIVE API tests (this will use real API calls and cost money)')
      
      // Test 8: Live TTS Test
      await this.testLiveTTS()
      
      // Test 9: Live Translation Test  
      await this.testLiveTranslation()
      
      // Only run Whisper if we have audio
      // await this.testLiveWhisper()
    }
    
    // Print results
    this.printResults()
  }
  
  /**
   * Test 1: Audio Format Support
   */
  private static async testAudioFormatSupport(): Promise<void> {
    const testName = 'Audio Format Support'
    const startTime = performance.now()
    
    try {
      const isSupported = AudioFormatService.isAudioRecordingSupported()
      const supportedFormats = AudioFormatService.getSupportedFormats()
      const bestFormat = AudioFormatService.getBestSupportedFormat()
      
      if (typeof isSupported !== 'boolean') {
        throw new Error('isAudioRecordingSupported should return boolean')
      }
      
      if (!Array.isArray(supportedFormats)) {
        throw new Error('getSupportedFormats should return array')
      }
      
      if (supportedFormats.length > 0 && !bestFormat) {
        throw new Error('getBestSupportedFormat should return format when formats available')
      }
      
      console.log(`✅ ${testName}: ${supportedFormats.length} formats supported`)
      this.results.push({ 
        test: testName, 
        passed: true, 
        duration: performance.now() - startTime 
      })
    } catch (error) {
      console.error(`❌ ${testName}:`, error)
      this.results.push({ 
        test: testName, 
        passed: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - startTime 
      })
    }
  }
  
  /**
   * Test 2: Audio Recording Capability
   */
  private static async testAudioRecordingCapability(): Promise<void> {
    const testName = 'Audio Recording Capability'
    const startTime = performance.now()
    
    try {
      const isSupported = AudioRecorderService.isSupported()
      const supportedTypes = AudioRecorderService.getSupportedMimeTypes()
      
      if (typeof isSupported !== 'boolean') {
        throw new Error('AudioRecorderService.isSupported should return boolean')
      }
      
      if (!Array.isArray(supportedTypes)) {
        throw new Error('getSupportedMimeTypes should return array')
      }
      
      console.log(`✅ ${testName}: Recording ${isSupported ? 'supported' : 'not supported'}`)
      this.results.push({ 
        test: testName, 
        passed: true, 
        duration: performance.now() - startTime 
      })
    } catch (error) {
      console.error(`❌ ${testName}:`, error)
      this.results.push({ 
        test: testName, 
        passed: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - startTime 
      })
    }
  }
  
  /**
   * Test 3: OpenAI API Configuration
   */
  private static async testOpenAIConfiguration(): Promise<void> {
    const testName = 'OpenAI API Configuration'
    const startTime = performance.now()
    
    try {
      const apiKey = "test-key" // Runtime validation in actual implementation
      
      if (!apiKey) {
        throw new Error('VITE_OPENAI_API_KEY not found in environment')
      }
      
      if (!apiKey.startsWith('sk-')) {
        throw new Error('API key should start with sk-')
      }
      
      if (apiKey.length < 50) {
        throw new Error('API key seems too short')
      }
      
      console.log(`✅ ${testName}: API key configured`)
      this.results.push({ 
        test: testName, 
        passed: true, 
        duration: performance.now() - startTime 
      })
    } catch (error) {
      console.error(`❌ ${testName}:`, error)
      this.results.push({ 
        test: testName, 
        passed: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - startTime 
      })
    }
  }
  
  /**
   * Test 4: Translation Prompts
   */
  private static async testTranslationPrompts(): Promise<void> {
    const testName = 'Translation Prompts'
    const startTime = performance.now()
    
    try {
      const { PromptService } = await import('@/services/openai/prompts')
      
      // Test casual mode
      const casualPrompt = PromptService.generateTranslationPrompt('English', 'Spanish', 'casual')
      if (!casualPrompt.includes('TRANSLATOR ONLY')) {
        throw new Error('Casual prompt missing TRANSLATOR ONLY instruction')
      }
      
      // Test fun mode
      const funPrompt = PromptService.generateTranslationPrompt('English', 'Spanish', 'fun')
      if (!funPrompt.includes('EMOJI GUIDELINES')) {
        throw new Error('Fun prompt missing EMOJI GUIDELINES')
      }
      
      // Test with context
      const contextPrompt = PromptService.generateTranslationPrompt('English', 'Spanish', 'casual', {
        recentMessages: ['Hello', 'How are you?'],
        isRomanticContext: false
      })
      if (!contextPrompt.includes('RECENT CONVERSATION')) {
        throw new Error('Context prompt missing RECENT CONVERSATION')
      }
      
      console.log(`✅ ${testName}: All prompt types generated correctly`)
      this.results.push({ 
        test: testName, 
        passed: true, 
        duration: performance.now() - startTime 
      })
    } catch (error) {
      console.error(`❌ ${testName}:`, error)
      this.results.push({ 
        test: testName, 
        passed: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - startTime 
      })
    }
  }
  
  /**
   * Test 5: Cost Calculations
   */
  private static async testCostCalculations(): Promise<void> {
    const testName = 'Cost Calculations'
    const startTime = performance.now()
    
    try {
      const { calculateWhisperCost, calculateGPTCost, calculateTTSCost } = await import('@/lib/openai')
      
      // Test Whisper cost
      const whisperCost = calculateWhisperCost(60) // 1 minute
      if (whisperCost !== 0.006) {
        throw new Error(`Whisper cost calculation wrong: expected 0.006, got ${whisperCost}`)
      }
      
      // Test GPT cost
      const gptCost = calculateGPTCost(1000, 500)
      const expected = (1000 / 1000) * 0.00015 + (500 / 1000) * 0.00060
      if (Math.abs(gptCost - expected) > 0.00001) {
        throw new Error(`GPT cost calculation wrong: expected ${expected}, got ${gptCost}`)
      }
      
      // Test TTS cost
      const ttsCost = calculateTTSCost(1000)
      if (ttsCost !== 0.015) {
        throw new Error(`TTS cost calculation wrong: expected 0.015, got ${ttsCost}`)
      }
      
      console.log(`✅ ${testName}: All cost calculations correct`)
      this.results.push({ 
        test: testName, 
        passed: true, 
        duration: performance.now() - startTime 
      })
    } catch (error) {
      console.error(`❌ ${testName}:`, error)
      this.results.push({ 
        test: testName, 
        passed: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - startTime 
      })
    }
  }
  
  /**
   * Test 6: Language Detection
   */
  private static async testLanguageDetection(): Promise<void> {
    const testName = 'Language Detection'
    const startTime = performance.now()
    
    try {
      const languages = ['english', 'spanish', 'portuguese', 'en', 'es', 'pt']
      const expected = ['en', 'es', 'pt', 'en', 'es', 'pt']
      
      for (let i = 0; i < languages.length; i++) {
        const detected = WhisperService.detectLanguage(languages[i])
        if (detected !== expected[i]) {
          throw new Error(`Language detection failed for ${languages[i]}: expected ${expected[i]}, got ${detected}`)
        }
      }
      
      // Test unknown language fallback
      const unknown = WhisperService.detectLanguage('french')
      if (unknown !== 'en') {
        throw new Error(`Unknown language should default to 'en', got ${unknown}`)
      }
      
      console.log(`✅ ${testName}: All language detection correct`)
      this.results.push({ 
        test: testName, 
        passed: true, 
        duration: performance.now() - startTime 
      })
    } catch (error) {
      console.error(`❌ ${testName}:`, error)
      this.results.push({ 
        test: testName, 
        passed: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - startTime 
      })
    }
  }
  
  /**
   * Test 7: Context Building
   */
  private static async testContextBuilding(): Promise<void> {
    const testName = 'Context Building'
    const startTime = performance.now()
    
    try {
      // Test empty context
      const emptyContext = WhisperService.buildContextPrompt([])
      if (emptyContext !== '') {
        throw new Error('Empty messages should return empty context')
      }
      
      // Test normal context
      const messages = ['Hello', 'How are you?', 'I am fine']
      const context = WhisperService.buildContextPrompt(messages)
      if (!context.includes('How are you?')) {
        throw new Error('Context should include recent messages')
      }
      
      // Test length limit
      const longMessages = Array(10).fill('This is a very long message that should be truncated')
      const longContext = WhisperService.buildContextPrompt(longMessages)
      if (longContext.length > 200) {
        throw new Error(`Context too long: ${longContext.length} characters (max 200)`)
      }
      
      console.log(`✅ ${testName}: Context building works correctly`)
      this.results.push({ 
        test: testName, 
        passed: true, 
        duration: performance.now() - startTime 
      })
    } catch (error) {
      console.error(`❌ ${testName}:`, error)
      this.results.push({ 
        test: testName, 
        passed: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - startTime 
      })
    }
  }
  
  /**
   * Test 8: Live TTS Test (requires API key)
   */
  private static async testLiveTTS(): Promise<void> {
    const testName = 'Live TTS Test'
    const startTime = performance.now()
    
    try {
      const testText = 'Hello, this is a test of the text-to-speech system.'
      const result = await TTSService.synthesize(testText, 'alloy', 1.0)
      
      if (!result.audioBuffer || result.audioBuffer.byteLength === 0) {
        throw new Error('TTS did not return audio data')
      }
      
      if (result.duration <= 0) {
        throw new Error('TTS duration should be positive')
      }
      
      console.log(`✅ ${testName}: Generated ${result.audioBuffer.byteLength} bytes of audio`)
      this.results.push({ 
        test: testName, 
        passed: true, 
        duration: performance.now() - startTime 
      })
    } catch (error) {
      console.error(`❌ ${testName}:`, error)
      this.results.push({ 
        test: testName, 
        passed: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - startTime 
      })
    }
  }
  
  /**
   * Test 9: Live Translation Test (requires API key)
   */
  private static async testLiveTranslation(): Promise<void> {
    const testName = 'Live Translation Test'
    const startTime = performance.now()
    
    try {
      const testText = 'Hello, how are you today?'
      const result = await TranslationService.translate(
        testText,
        'English',
        'Spanish',
        'casual'
      )
      
      if (!result.translatedText || result.translatedText.trim() === '') {
        throw new Error('Translation did not return translated text')
      }
      
      if (result.translatedText === testText) {
        throw new Error('Translation should be different from original')
      }
      
      if (result.inputTokens <= 0 || result.outputTokens <= 0) {
        throw new Error('Token counts should be positive')
      }
      
      console.log(`✅ ${testName}: "${testText}" → "${result.translatedText}"`)
      this.results.push({ 
        test: testName, 
        passed: true, 
        duration: performance.now() - startTime 
      })
    } catch (error) {
      console.error(`❌ ${testName}:`, error)
      this.results.push({ 
        test: testName, 
        passed: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - startTime 
      })
    }
  }
  
  /**
   * Print test results summary
   */
  private static printResults(): void {
    const passed = this.results.filter(r => r.passed).length
    const failed = this.results.filter(r => !r.passed).length
    const totalTime = this.results.reduce((sum, r) => sum + (r.duration || 0), 0)
    
    console.log('\n📊 Phase 4 Integration Test Results:')
    console.log(`✅ Passed: ${passed}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`⏱️  Total time: ${totalTime.toFixed(0)}ms`)
    console.log(`📈 Success rate: ${((passed / this.results.length) * 100).toFixed(1)}%`)
    
    if (failed > 0) {
      console.log('\n❌ Failed tests:')
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.test}: ${r.error}`)
      })
    }
    
    if (passed === this.results.length) {
      console.log('\n🎉 All tests passed! Phase 4 is ready.')
    } else {
      console.log('\n🚨 Some tests failed. Please fix before proceeding.')
    }
  }
}