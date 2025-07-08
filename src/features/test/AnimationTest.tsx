import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { ActivityIndicator } from '@/features/messages/ActivityIndicator'
import { useAnimations, useMessageAnimations, useRecordingAnimations, usePageTransitions } from '@/hooks/useAnimations'
import { Mic, Heart, CheckCircle, AlertCircle, Sparkles } from 'lucide-react'

export function AnimationTest() {
  const { registerElement, animations, getStaggerDelay } = useAnimations()
  const { registerMessage, animateNewMessage } = useMessageAnimations()
  const { registerButton, startRecordingAnimation, stopRecordingAnimation, triggerSuccess, triggerError } = useRecordingAnimations()
  const { registerPage } = usePageTransitions()
  
  const [isRecording, setIsRecording] = useState(false)
  const [messageCount, setMessageCount] = useState(0)
  const [testResults, setTestResults] = useState<string[]>([])

  const logTest = (test: string, result: string) => {
    const logMessage = `🧪 [AnimationTest] ${test}: ${result}`
    console.log(logMessage)
    setTestResults(prev => [...prev, logMessage])
  }

  const testButtonAnimations = () => {
    logTest('Button Press Animation', 'Testing spring and haptic feedback')
    animations.buttonPress('test-button', true)
    
    setTimeout(() => {
      logTest('Success Animation', 'Testing success popup')
      animations.success('success-button')
    }, 500)
    
    setTimeout(() => {
      logTest('Shake Animation', 'Testing error shake')
      animations.shake('error-button')
    }, 1000)
  }

  const testMessageAnimations = () => {
    logTest('Message Entrance', 'Testing staggered message animations')
    
    // Simulate multiple messages with stagger
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const messageId = `test-message-${messageCount + i}`
        const isOwnMessage = i % 2 === 0
        animateNewMessage(messageId, isOwnMessage, i)
        logTest(`Message ${i + 1}`, `Animated from ${isOwnMessage ? 'right' : 'left'} with ${getStaggerDelay(i, 100)}ms delay`)
      }, i * 200)
    }
    
    setMessageCount(prev => prev + 3)
  }

  const testRecordingAnimations = () => {
    if (!isRecording) {
      logTest('Recording Start', 'Starting pulse animation')
      setIsRecording(true)
      startRecordingAnimation()
      
      // Auto-stop after 2 seconds
      setTimeout(() => {
        logTest('Recording Stop', 'Stopping pulse animation')
        stopRecordingAnimation()
        setIsRecording(false)
        
        setTimeout(() => {
          logTest('Recording Success', 'Triggering success animation')
          triggerSuccess()
        }, 200)
      }, 2000)
    }
  }

  const testActivityIndicators = () => {
    logTest('Activity Indicators', 'Testing recording, processing, and typing animations')
  }

  const testSpringAnimations = () => {
    logTest('Spring Animation', 'Testing scale spring effect')
    animations.spring('spring-test', 0.9, 200)
  }

  const runAllTests = () => {
    logTest('Animation Test Suite', 'Starting comprehensive animation tests')
    setTestResults([])
    
    testButtonAnimations()
    setTimeout(() => testMessageAnimations(), 1500)
    setTimeout(() => testRecordingAnimations(), 3000)
    setTimeout(() => testSpringAnimations(), 6000)
    setTimeout(() => {
      logTest('Test Suite Complete', '✅ All animation tests completed')
      console.log('🎉 Animation test suite finished - check visual results above')
    }, 7000)
  }

  return (
    <MobileContainer 
      ref={registerPage}
      className="min-h-screen py-6 space-y-6"
    >
      {/* Header */}
      <Card className="text-center space-y-2">
        <div className="flex justify-center">
          <Sparkles className="h-8 w-8 text-purple-600 animate-bounce" />
        </div>
        <h1 className="text-2xl font-bold">Animation Test Suite</h1>
        <p className="text-gray-600 text-sm">Test all Phase 9 animation enhancements</p>
      </Card>

      {/* Test Controls */}
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Test Controls</h2>
        
        <div className="grid grid-cols-2 gap-2">
          <Button
            ref={(el) => registerElement('test-button', el)}
            onClick={testButtonAnimations}
            size="sm"
          >
            Button Tests
          </Button>
          
          <Button
            onClick={testMessageAnimations}
            variant="secondary"
            size="sm"
          >
            Message Tests
          </Button>
          
          <Button
            ref={(el) => registerButton(el)}
            onClick={testRecordingAnimations}
            disabled={isRecording}
            size="sm"
            className={isRecording ? 'bg-red-500 text-white' : ''}
          >
            <Mic className="h-4 w-4 mr-1" />
            {isRecording ? 'Recording...' : 'Recording Test'}
          </Button>
          
          <Button
            ref={(el) => registerElement('spring-test', el)}
            onClick={testSpringAnimations}
            variant="ghost"
            size="sm"
          >
            Spring Test
          </Button>
        </div>

        <Button
          onClick={runAllTests}
          size="lg"
          fullWidth
          className="mt-4"
        >
          🚀 Run All Animation Tests
        </Button>
      </Card>

      {/* Animation Samples */}
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Animation Samples</h2>
        
        {/* Button Samples */}
        <div className="space-y-2">
          <h3 className="font-medium text-sm">Button Animations</h3>
          <div className="flex gap-2">
            <Button
              ref={(el) => registerElement('success-button', el)}
              variant="primary"
              size="sm"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Success
            </Button>
            <Button
              ref={(el) => registerElement('error-button', el)}
              variant="secondary"
              size="sm"
            >
              <AlertCircle className="h-4 w-4 mr-1" />
              Error
            </Button>
          </div>
        </div>

        {/* Activity Indicators */}
        <div className="space-y-2">
          <h3 className="font-medium text-sm">Activity Indicators</h3>
          <div className="space-y-2">
            <ActivityIndicator activity="recording" userName="Test User" />
            <ActivityIndicator activity="processing" userName="Test User" />
            <ActivityIndicator activity="typing" userName="Test User" />
          </div>
        </div>

        {/* Message Samples */}
        <div className="space-y-2">
          <h3 className="font-medium text-sm">Message Animations</h3>
          <div className="space-y-2">
            {Array.from({ length: messageCount }, (_, i) => (
              <div
                key={`test-message-${i}`}
                ref={(el) => registerMessage(`test-message-${i}`, el)}
                className={`p-3 rounded-lg max-w-[70%] ${
                  i % 2 === 0 
                    ? 'bg-blue-500 text-white ml-auto' 
                    : 'bg-gray-200 text-gray-900'
                }`}
              >
                Test message {i + 1} - {i % 2 === 0 ? 'Own' : 'Partner'}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* CSS Animation Samples */}
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">CSS Animations</h2>
        
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="space-y-2">
            <div className="h-8 w-8 bg-blue-500 rounded-full mx-auto animate-bounce"></div>
            <span className="text-xs">Bounce</span>
          </div>
          
          <div className="space-y-2">
            <div className="h-8 w-8 bg-green-500 rounded-full mx-auto animate-pulse"></div>
            <span className="text-xs">Pulse</span>
          </div>
          
          <div className="space-y-2">
            <div className="h-8 w-8 bg-purple-500 rounded-full mx-auto animate-ping"></div>
            <span className="text-xs">Ping</span>
          </div>
          
          <div className="space-y-2">
            <div className="h-8 w-8 bg-red-500 rounded-full mx-auto animate-spin"></div>
            <span className="text-xs">Spin</span>
          </div>
          
          <div className="space-y-2">
            <div className="h-8 w-8 bg-yellow-500 rounded-full mx-auto animate-slide-up-spring"></div>
            <span className="text-xs">Slide Up Spring</span>
          </div>
          
          <div className="space-y-2">
            <div className="h-8 w-8 bg-indigo-500 rounded-full mx-auto animate-success-pop"></div>
            <span className="text-xs">Success Pop</span>
          </div>
        </div>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card className="space-y-2">
          <h2 className="text-lg font-semibold">Test Results</h2>
          <div className="text-xs font-mono bg-gray-100 p-3 rounded max-h-32 overflow-y-auto">
            {testResults.map((result, i) => (
              <div key={i} className="text-gray-700">
                {result}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Check browser console for detailed logs
          </p>
        </Card>
      )}

      {/* Stagger Animation Demo */}
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Stagger Animation Demo</h2>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className={`h-12 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg animate-stagger-${i} flex items-center justify-center text-white font-medium`}
            >
              {i}
            </div>
          ))}
        </div>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 space-y-1">
        <p>🎨 Phase 9 Animation System</p>
        <p>All animations use transform-gpu for optimal performance</p>
      </div>
    </MobileContainer>
  )
}