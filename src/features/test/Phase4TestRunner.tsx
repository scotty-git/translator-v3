import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Phase4IntegrationTest } from '@/tests/Phase4IntegrationTest'
import { 
  Play, 
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Clock
} from 'lucide-react'

interface TestResult {
  test: string
  passed: boolean
  error?: string
  duration?: number
}

export function Phase4TestRunner() {
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])
  const [showDetails, setShowDetails] = useState(false)
  
  const runTests = async () => {
    setIsRunning(true)
    setResults([])
    
    try {
      // Capture console.log to get test results
      const originalLog = console.log
      const logs: string[] = []
      
      console.log = (...args) => {
        logs.push(args.join(' '))
        originalLog(...args)
      }
      
      await Phase4IntegrationTest.runAllTests()
      
      // Restore console.log
      console.log = originalLog
      
      // Parse results from logs with improved parsing
      const testResults: TestResult[] = []
      
      // Expected test names to filter for actual tests only
      const expectedTests = [
        'Audio Format Support',
        'Audio Recording Capability', 
        'OpenAI API Configuration',
        'Translation Prompts',
        'Cost Calculations',
        'Language Detection',
        'Context Building',
        'Live TTS Test',
        'Live Translation Test'
      ]
      
      logs.forEach(log => {
        // Match pattern: "✅ TestName: additional info"
        const passMatch = log.match(/✅\s+([^:]+):\s*(.*)/)
        if (passMatch) {
          const testName = passMatch[1].trim()
          if (expectedTests.includes(testName)) {
            testResults.push({ test: testName, passed: true })
          }
        }
        
        // Match pattern: "❌ TestName: error message"  
        const failMatch = log.match(/❌\s+([^:]+):\s*(.*)/)
        if (failMatch) {
          const testName = failMatch[1].trim()
          const error = failMatch[2].trim()
          if (expectedTests.includes(testName)) {
            testResults.push({ test: testName, passed: false, error })
          }
        }
      })
      
      // Remove duplicates (keep first occurrence)
      const uniqueResults = testResults.filter((result, index, array) => 
        array.findIndex(r => r.test === result.test) === index
      )
      
      setResults(uniqueResults)
    } catch (error) {
      console.error('Test runner error:', error)
      setResults([{
        test: 'Test Runner',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }])
    } finally {
      setIsRunning(false)
    }
  }
  
  const passedCount = results.filter(r => r.passed).length
  const failedCount = results.filter(r => !r.passed).length
  const successRate = results.length > 0 ? (passedCount / results.length) * 100 : 0
  
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Phase 4 Test Runner</h1>
        <p className="text-gray-600">Comprehensive testing suite for audio & translation features</p>
      </div>
      
      {/* Test Controls */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Integration Tests</h2>
          <Button 
            onClick={runTests} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run All Tests
              </>
            )}
          </Button>
        </div>
        
        <div className="text-sm text-gray-600 space-y-1">
          <p>This will test:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Audio format support and recording capabilities</li>
            <li>OpenAI API configuration and cost calculations</li>
            <li>Translation prompt generation and language detection</li>
            <li>Context building and error handling</li>
            <li>Live API tests (if VITE_RUN_API_TESTS=true)</li>
          </ul>
        </div>
        
        {true && ( {/* API tests available at runtime */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-700">
              Live API tests disabled. Set VITE_RUN_API_TESTS=true to test actual OpenAI APIs.
            </span>
          </div>
        )}
      </Card>
      
      {/* Test Results */}
      {results.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Test Results</h2>
            <Button 
              variant="ghost" 
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </Button>
          </div>
          
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{passedCount}</div>
              <div className="text-sm text-gray-600">Passed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{failedCount}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{results.length}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${successRate === 100 ? 'text-green-600' : successRate > 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                {successRate.toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
          </div>
          
          {/* Overall Status */}
          <div className={`p-4 rounded-lg flex items-center gap-3 ${
            successRate === 100 
              ? 'bg-green-50 border border-green-200' 
              : successRate > 80 
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-red-50 border border-red-200'
          }`}>
            {successRate === 100 ? (
              <>
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div>
                  <div className="font-semibold text-green-900">All tests passed!</div>
                  <div className="text-sm text-green-700">Phase 4 is ready for production use.</div>
                </div>
              </>
            ) : successRate > 80 ? (
              <>
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
                <div>
                  <div className="font-semibold text-yellow-900">Most tests passed</div>
                  <div className="text-sm text-yellow-700">Some minor issues found. Review failed tests.</div>
                </div>
              </>
            ) : (
              <>
                <XCircle className="h-6 w-6 text-red-600" />
                <div>
                  <div className="font-semibold text-red-900">Multiple test failures</div>
                  <div className="text-sm text-red-700">Critical issues found. Fix before proceeding.</div>
                </div>
              </>
            )}
          </div>
          
          {/* Detailed Results */}
          {showDetails && (
            <div className="mt-6 space-y-3">
              <h3 className="font-semibold">Detailed Results</h3>
              {results.map((result, index) => (
                <div key={index} className={`p-3 rounded border ${
                  result.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {result.passed ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className="font-medium">{result.test}</span>
                    </div>
                    {result.duration && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="h-3 w-3" />
                        {result.duration.toFixed(0)}ms
                      </div>
                    )}
                  </div>
                  {result.error && (
                    <div className="mt-2 text-sm text-red-700 ml-8">
                      {result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
      
      {/* Instructions */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-3">Instructions</h2>
        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>1. Run Tests:</strong> Click "Run All Tests" to execute the complete test suite.</p>
          <p><strong>2. Review Results:</strong> Check the success rate and detailed results.</p>
          <p><strong>3. Fix Issues:</strong> If any tests fail, review the error messages and fix the underlying issues.</p>
          <p><strong>4. API Tests:</strong> For live API testing, set VITE_RUN_API_TESTS=true in your environment.</p>
          <p><strong>5. Phase 4 Complete:</strong> When all tests pass, Phase 4 is ready for use.</p>
        </div>
      </Card>
    </div>
  )
}