import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { useAccessibility, useScreenReader, useKeyboardNavigation, useFocusManagement } from '@/hooks/useAccessibility'
import { accessibilityManager } from '@/lib/accessibility/AccessibilityManager'
import { 
  Eye, 
  EyeOff, 
  Volume2, 
  VolumeX, 
  Keyboard, 
  MousePointer, 
  CheckCircle,
  AlertCircle,
  Info,
  Accessibility
} from 'lucide-react'

export function AccessibilityTest() {
  const { 
    screenReaderEnabled, 
    reducedMotion, 
    keyboardNavigation,
    announce,
    validateColorContrast 
  } = useAccessibility()
  
  const { 
    announceNavigation, 
    announceAction, 
    announceError, 
    announceSuccess 
  } = useScreenReader()
  
  const [testResults, setTestResults] = useState<string[]>([])
  const [highContrast, setHighContrast] = useState(false)
  const [testInput, setTestInput] = useState('')
  const [inputError, setInputError] = useState('')
  const [focusTestActive, setFocusTestActive] = useState(false)

  const logTest = (test: string, result: string, success: boolean = true) => {
    const emoji = success ? '✅' : '❌'
    const logMessage = `${emoji} [A11Y Test] ${test}: ${result}`
    console.log(logMessage)
    setTestResults(prev => [...prev, logMessage])
  }

  // Keyboard navigation test
  const { ref: keyboardTestRef } = useKeyboardNavigation({
    onEscape: () => {
      logTest('Keyboard Navigation - Escape', 'Escape key handled correctly')
      announce('Escape key test passed', 'polite')
    },
    onEnter: () => {
      logTest('Keyboard Navigation - Enter', 'Enter key handled correctly')
      announce('Enter key test passed', 'polite')
    },
    onSpace: () => {
      logTest('Keyboard Navigation - Space', 'Space key handled correctly')
      announce('Space key test passed', 'polite')
    },
    onArrowUp: () => {
      logTest('Keyboard Navigation - Arrow Up', 'Arrow up key handled correctly')
    },
    onArrowDown: () => {
      logTest('Keyboard Navigation - Arrow Down', 'Arrow down key handled correctly')
    }
  })

  // Focus management test
  const { ref: focusTestRef, focusWithin, focusElement } = useFocusManagement()

  const testScreenReaderAnnouncements = () => {
    logTest('Screen Reader', 'Testing announcements')
    
    announce('Testing polite announcement', 'polite')
    setTimeout(() => {
      announce('Testing assertive announcement', 'assertive')
      logTest('Screen Reader Announcements', 'Polite and assertive announcements sent')
    }, 1000)

    setTimeout(() => {
      announceNavigation('Accessibility Test Page')
      announceAction('Button clicked')
      announceSuccess('Operation completed successfully')
      announceError('Sample error message')
      logTest('Screen Reader Context', 'Navigation, action, success, and error announcements tested')
    }, 2000)
  }

  const testColorContrast = () => {
    logTest('Color Contrast', 'Testing WCAG compliance')
    
    const tests = [
      { fg: '#000000', bg: '#FFFFFF', name: 'Black on White' },
      { fg: '#FFFFFF', bg: '#0000FF', name: 'White on Blue' },
      { fg: '#666666', bg: '#FFFFFF', name: 'Gray on White' },
      { fg: '#007ACC', bg: '#FFFFFF', name: 'Blue on White' }
    ]

    tests.forEach(test => {
      const result = validateColorContrast(test.fg, test.bg)
      const status = result.wcagAA ? 'PASS' : 'FAIL'
      logTest(
        `Color Contrast - ${test.name}`, 
        `Ratio: ${result.ratio.toFixed(2)}, WCAG AA: ${status}`,
        result.wcagAA
      )
    })
  }

  const testKeyboardNavigation = () => {
    logTest('Keyboard Navigation', 'Focus keyboard test area and press keys')
    setFocusTestActive(true)
    if (keyboardTestRef.current) {
      keyboardTestRef.current.focus()
    }
    
    setTimeout(() => {
      setFocusTestActive(false)
      logTest('Keyboard Navigation Test', 'Completed - check console for key events')
    }, 5000)
  }

  const testFocusManagement = () => {
    logTest('Focus Management', 'Testing focus tracking')
    focusElement()
    
    setTimeout(() => {
      logTest('Focus Management', `Focus within: ${focusWithin}`)
    }, 500)
  }

  const testInputValidation = () => {
    if (!testInput.trim()) {
      setInputError('This field is required')
      announceError('Input validation failed - field is required')
      logTest('Input Validation', 'Error state and announcement triggered')
    } else {
      setInputError('')
      announceSuccess('Input validation passed')
      logTest('Input Validation', 'Valid input accepted')
    }
  }

  const testHighContrast = () => {
    if (highContrast) {
      accessibilityManager.disableHighContrast()
      setHighContrast(false)
      logTest('High Contrast Mode', 'Disabled')
    } else {
      accessibilityManager.enableHighContrast()
      setHighContrast(true)
      logTest('High Contrast Mode', 'Enabled')
    }
  }

  const runAllAccessibilityTests = () => {
    logTest('Accessibility Test Suite', 'Starting comprehensive A11Y tests')
    setTestResults([])
    
    // Test 1: Screen reader announcements
    testScreenReaderAnnouncements()
    
    // Test 2: Color contrast validation
    setTimeout(() => testColorContrast(), 3000)
    
    // Test 3: Keyboard navigation
    setTimeout(() => testKeyboardNavigation(), 4000)
    
    // Test 4: Focus management
    setTimeout(() => testFocusManagement(), 6000)
    
    // Test 5: Input validation
    setTimeout(() => testInputValidation(), 7000)
    
    // Test summary
    setTimeout(() => {
      logTest('Accessibility Test Suite', '✅ All tests completed')
      console.log('♿ [A11Y] Accessibility test suite finished - check visual and audio feedback')
    }, 8000)
  }

  return (
    <MobileContainer className="min-h-screen py-6 space-y-6">
      {/* Header */}
      <Card className="text-center space-y-2">
        <div className="flex justify-center">
          <Accessibility className="h-8 w-8 text-green-600" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold">Accessibility Test Suite</h1>
        <p className="text-gray-600 text-sm">WCAG 2.1 AA Compliance Testing</p>
      </Card>

      {/* Accessibility Status */}
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-600" aria-hidden="true" />
          Accessibility Status
        </h2>
        
        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              {screenReaderEnabled ? (
                <Volume2 className="h-4 w-4 text-green-600" aria-hidden="true" />
              ) : (
                <VolumeX className="h-4 w-4 text-gray-400" aria-hidden="true" />
              )}
              <span>Screen Reader</span>
            </div>
            <span className={`text-sm font-medium ${
              screenReaderEnabled ? 'text-green-600' : 'text-gray-500'
            }`}>
              {screenReaderEnabled ? 'Detected' : 'Not Detected'}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              {reducedMotion ? (
                <EyeOff className="h-4 w-4 text-blue-600" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" aria-hidden="true" />
              )}
              <span>Reduced Motion</span>
            </div>
            <span className={`text-sm font-medium ${
              reducedMotion ? 'text-blue-600' : 'text-gray-500'
            }`}>
              {reducedMotion ? 'Enabled' : 'Normal'}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-purple-600" aria-hidden="true" />
              <span>Keyboard Navigation</span>
            </div>
            <span className={`text-sm font-medium ${
              keyboardNavigation ? 'text-purple-600' : 'text-gray-500'
            }`}>
              {keyboardNavigation ? 'Active' : 'Disabled'}
            </span>
          </div>
        </div>
      </Card>

      {/* Individual Tests */}
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Individual Tests</h2>
        
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={testScreenReaderAnnouncements}
            variant="secondary"
            size="sm"
            ariaLabel="Test screen reader announcements"
          >
            Screen Reader
          </Button>
          
          <Button
            onClick={testColorContrast}
            variant="secondary"
            size="sm"
            ariaLabel="Test color contrast ratios"
          >
            Color Contrast
          </Button>
          
          <Button
            onClick={testKeyboardNavigation}
            variant="secondary"
            size="sm"
            ariaLabel="Test keyboard navigation"
            pressed={focusTestActive}
          >
            Keyboard Nav
          </Button>
          
          <Button
            onClick={testFocusManagement}
            variant="secondary"
            size="sm"
            ariaLabel="Test focus management"
          >
            Focus Test
          </Button>
          
          <Button
            onClick={testHighContrast}
            variant="ghost"
            size="sm"
            ariaLabel={`${highContrast ? 'Disable' : 'Enable'} high contrast mode`}
            pressed={highContrast}
          >
            High Contrast
          </Button>
          
          <Button
            onClick={testInputValidation}
            variant="ghost"
            size="sm"
            ariaLabel="Test input validation"
          >
            Input Test
          </Button>
        </div>
      </Card>

      {/* Interactive Test Area */}
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Interactive Test Area</h2>
        
        {/* Keyboard Navigation Test */}
        <div 
          ref={keyboardTestRef}
          className={`p-4 border-2 rounded-lg ${
            focusTestActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200'
          }`}
          tabIndex={0}
          role="region"
          aria-label="Keyboard navigation test area"
          aria-describedby="keyboard-test-desc"
        >
          <h3 className="font-medium">Keyboard Test Area</h3>
          <p id="keyboard-test-desc" className="text-sm text-gray-600">
            Focus this area and press Escape, Enter, Space, or Arrow keys
          </p>
          {focusTestActive && (
            <p className="text-sm text-blue-600 mt-2">
              ⌨️ Active - Press keys to test
            </p>
          )}
        </div>

        {/* Focus Management Test */}
        <div 
          ref={focusTestRef}
          className={`p-4 border rounded-lg ${
            focusWithin ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
          }`}
          tabIndex={0}
          role="region"
          aria-label="Focus management test area"
        >
          <h3 className="font-medium">Focus Management Test</h3>
          <p className="text-sm text-gray-600">
            Focus within: {focusWithin ? 'Yes' : 'No'}
          </p>
        </div>

        {/* Input Validation Test */}
        <div className="space-y-2">
          <Input
            label="Test Input Field"
            description="Enter some text to test validation"
            placeholder="Type something..."
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            error={!!inputError}
            errorMessage={inputError}
            required
            ariaLabel="Accessibility test input field"
          />
        </div>
      </Card>

      {/* Main Test Button */}
      <Card className="space-y-4">
        <Button
          onClick={runAllAccessibilityTests}
          size="lg"
          fullWidth
          ariaLabel="Run comprehensive accessibility test suite"
        >
          🚀 Run All Accessibility Tests
        </Button>
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
            Check browser console for detailed accessibility logs
          </p>
        </Card>
      )}

      {/* Instructions */}
      <Card className="space-y-2">
        <h2 className="text-lg font-semibold">Testing Instructions</h2>
        <div className="text-sm text-gray-600 space-y-2">
          <p>• Use Tab/Shift+Tab to navigate between interactive elements</p>
          <p>• Press Alt+M to focus main content, Alt+N for navigation</p>
          <p>• Enable screen reader to test announcements</p>
          <p>• Check browser console for detailed test results</p>
          <p>• Test with keyboard-only navigation</p>
        </div>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 space-y-1">
        <p>♿ WCAG 2.1 AA Compliance Testing</p>
        <p>Screen reader compatible • Keyboard accessible • High contrast support</p>
      </div>
    </MobileContainer>
  )
}