import { useState, useEffect } from 'react'
import { networkQualityDetector, NETWORK_CONFIGS, type NetworkQuality } from '@/lib/network-quality'

export function NetworkQualityTest() {
  const [currentQuality, setCurrentQuality] = useState<NetworkQuality>('unknown')
  const [connectionInfo, setConnectionInfo] = useState<any>(null)
  const [testResults, setTestResults] = useState<string[]>([])

  useEffect(() => {
    // Get initial quality
    setCurrentQuality(networkQualityDetector.getCurrentQuality())

    // Get connection info if available
    if ('connection' in navigator && (navigator as any).connection) {
      setConnectionInfo((navigator as any).connection)
    }

    // Subscribe to quality changes
    const unsubscribe = networkQualityDetector.onQualityChange((quality) => {
      console.log('🌐 Network quality changed:', quality)
      setCurrentQuality(quality)
      setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: Quality changed to ${quality}`])
    })

    return unsubscribe
  }, [])

  const runPingTest = async () => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: Running ping test...`])
    try {
      const quality = await networkQualityDetector.detectQuality()
      setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: Ping test result: ${quality}`])
    } catch (error) {
      setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: Ping test failed: ${error}`])
    }
  }

  const config = NETWORK_CONFIGS[currentQuality]

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Network Quality Test</h2>
      
      {/* Current Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">Current Network Status</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm font-medium text-gray-600">Quality:</span>
            <div className={`inline-block ml-2 px-3 py-1 rounded-full text-sm font-medium ${
              currentQuality === 'fast' ? 'bg-green-100 text-green-800' :
              currentQuality === 'slow' ? 'bg-yellow-100 text-yellow-800' :
              currentQuality === 'very-slow' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {config.label}
            </div>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">Timeout:</span>
            <span className="ml-2 text-sm text-gray-800">{config.timeout}ms</span>
          </div>
        </div>
        <div className="mt-2">
          <span className="text-sm font-medium text-gray-600">Description:</span>
          <span className="ml-2 text-sm text-gray-800">{config.description}</span>
        </div>
      </div>

      {/* Browser Connection API Info */}
      {connectionInfo && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-blue-700">Browser Connection API</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-600">Effective Type:</span>
              <span className="ml-2 text-blue-800">{connectionInfo.effectiveType || 'N/A'}</span>
            </div>
            <div>
              <span className="font-medium text-blue-600">Downlink:</span>
              <span className="ml-2 text-blue-800">{connectionInfo.downlink ? `${connectionInfo.downlink} Mbps` : 'N/A'}</span>
            </div>
            <div>
              <span className="font-medium text-blue-600">RTT:</span>
              <span className="ml-2 text-blue-800">{connectionInfo.rtt ? `${connectionInfo.rtt}ms` : 'N/A'}</span>
            </div>
            <div>
              <span className="font-medium text-blue-600">Save Data:</span>
              <span className="ml-2 text-blue-800">{connectionInfo.saveData ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Test Controls */}
      <div className="mb-6">
        <button
          onClick={runPingTest}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Run Ping Test
        </button>
      </div>

      {/* Test Results Log */}
      {testResults.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">Test Results</h3>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-60 overflow-y-auto">
            {testResults.map((result, index) => (
              <div key={index} className="mb-1">
                {result}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Network Configs */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-700">All Network Configurations</h3>
        <div className="grid grid-cols-1 gap-3">
          {Object.entries(NETWORK_CONFIGS).map(([key, config]) => (
            <div
              key={key}
              className={`p-3 rounded-lg border-2 ${
                currentQuality === key 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium text-gray-800">{config.label}</span>
                  <span className="ml-2 text-sm text-gray-600">({key})</span>
                </div>
                <div className="text-sm text-gray-600">
                  {config.timeout}ms timeout
                </div>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {config.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}