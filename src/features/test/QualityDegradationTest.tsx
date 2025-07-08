import { useState, useEffect } from 'react'
import { QualityDegradationService, QualityConfig } from '@/lib/quality-degradation'
import { networkQualityDetector, NetworkQuality } from '@/lib/network-quality'
import { QualityMonitor } from '@/features/network/QualityMonitor'

export function QualityDegradationTest() {
  const [currentConfig, setCurrentConfig] = useState<QualityConfig>(
    QualityDegradationService.getCurrentConfig()
  )
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>(
    networkQualityDetector.getCurrentQuality()
  )
  const [estimatedSize, setEstimatedSize] = useState('')

  useEffect(() => {
    // Initialize the quality degradation service
    QualityDegradationService.initialize()

    const handleQualityChange = (config: QualityConfig) => {
      setCurrentConfig(config)
    }

    const handleNetworkChange = (quality: NetworkQuality) => {
      setNetworkQuality(quality)
    }

    QualityDegradationService.addListener(handleQualityChange)
    networkQualityDetector.addListener(handleNetworkChange)

    // Calculate estimated file size for 10 seconds
    const updateEstimate = () => {
      const estimate = QualityDegradationService.estimateFileSize(10)
      setEstimatedSize(estimate.humanReadable)
    }
    updateEstimate()

    const interval = setInterval(updateEstimate, 1000)

    return () => {
      QualityDegradationService.removeListener(handleQualityChange)
      networkQualityDetector.removeListener(handleNetworkChange)
      clearInterval(interval)
    }
  }, [])

  const forceQuality = (quality: NetworkQuality) => {
    QualityDegradationService.forceQuality(quality)
  }

  const resetToAuto = () => {
    QualityDegradationService.resetToAuto()
  }

  const audioConfig = QualityDegradationService.getAudioRecordingConfig()
  const mediaConstraints = QualityDegradationService.getMediaConstraints()

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          🎚️ Quality Degradation System Test
        </h2>
        <p className="text-gray-600 mb-6">
          This system automatically adjusts audio quality based on network conditions to maintain performance.
        </p>

        {/* Quality Monitor */}
        <QualityMonitor />

        {/* Current Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Network Status</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-blue-700">Quality:</span>
                <span className="ml-2 font-mono bg-blue-100 px-2 py-1 rounded">
                  {networkQuality}
                </span>
              </div>
              <div>
                <span className="text-blue-700">Timeout:</span>
                <span className="ml-2 font-mono bg-blue-100 px-2 py-1 rounded">
                  {networkQualityDetector.getCurrentTimeout()}ms
                </span>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">Audio Quality</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-green-700">Bitrate:</span>
                <span className="ml-2 font-mono bg-green-100 px-2 py-1 rounded">
                  {currentConfig.audioBitsPerSecond / 1000}kbps
                </span>
              </div>
              <div>
                <span className="text-green-700">Sample Rate:</span>
                <span className="ml-2 font-mono bg-green-100 px-2 py-1 rounded">
                  {currentConfig.audioSampleRate}Hz
                </span>
              </div>
              <div>
                <span className="text-green-700">10s Recording:</span>
                <span className="ml-2 font-mono bg-green-100 px-2 py-1 rounded">
                  {estimatedSize}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quality Controls */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Manual Quality Override</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={() => forceQuality('fast')}
              className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
            >
              Force Fast (64kbps)
            </button>
            <button
              onClick={() => forceQuality('slow')}
              className="px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
            >
              Force Slow (32kbps)
            </button>
            <button
              onClick={() => forceQuality('very-slow')}
              className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            >
              Force Very Slow (16kbps)
            </button>
            <button
              onClick={resetToAuto}
              className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              Reset to Auto
            </button>
          </div>
          <p className="text-xs text-gray-600">
            Use these buttons to test different quality levels. "Reset to Auto" returns to automatic detection.
          </p>
        </div>

        {/* Technical Details */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Technical Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Audio Recording Config</h4>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
{JSON.stringify(audioConfig, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Media Constraints</h4>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
{JSON.stringify(mediaConstraints, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Quality Comparison */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Quality Comparison</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Network</th>
                  <th className="text-left py-2">Bitrate</th>
                  <th className="text-left py-2">Sample Rate</th>
                  <th className="text-left py-2">10s File Size</th>
                  <th className="text-left py-2">API Timeout</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                <tr className="border-b">
                  <td className="py-2 font-medium text-green-600">Fast (4G/WiFi)</td>
                  <td className="py-2">64kbps</td>
                  <td className="py-2">44.1kHz</td>
                  <td className="py-2">~32KB</td>
                  <td className="py-2">5s</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium text-yellow-600">Slow (3G)</td>
                  <td className="py-2">32kbps</td>
                  <td className="py-2">22.05kHz</td>
                  <td className="py-2">~16KB</td>
                  <td className="py-2">15s</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium text-red-600">Very Slow (2G/Edge)</td>
                  <td className="py-2">16kbps</td>
                  <td className="py-2">16kHz</td>
                  <td className="py-2">~8KB</td>
                  <td className="py-2">30s</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Integration Notes */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Integration Notes</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Quality changes are applied to new recordings only</li>
            <li>• The AudioRecorderService automatically uses current quality settings</li>
            <li>• Network detection runs continuously in the background</li>
            <li>• All workflow steps (recording → transcription → translation) maintain the same order</li>
            <li>• File size estimates include container format overhead</li>
          </ul>
        </div>
      </div>
    </div>
  )
}