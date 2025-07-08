import { useState, useEffect } from 'react'
import { iosAudioContextManager, testIOSAudioContext, ensureIOSAudioContextReady } from '@/lib/ios-audio-context'
import { IOSAudioRecorderService, testIOSAudioCompatibility } from '@/services/audio/ios-recorder'
import { AudioRecordingResult } from '@/services/audio/recorder'

export function IOSAudioTest() {
  const [audioContextInfo, setAudioContextInfo] = useState<any>(null)
  const [compatibilityInfo, setCompatibilityInfo] = useState<any>(null)
  const [recorder, setRecorder] = useState<IOSAudioRecorderService | null>(null)
  const [recording, setRecording] = useState(false)
  const [recordingResult, setRecordingResult] = useState<AudioRecordingResult | null>(null)
  const [testResults, setTestResults] = useState<any>(null)
  const [audioLevel, setAudioLevel] = useState(0)

  useEffect(() => {
    // Initialize iOS audio context manager
    const manager = iosAudioContextManager
    
    // Run initial compatibility test
    testIOSAudioCompatibility().then(setCompatibilityInfo)
    
    // Set up audio context info updates
    const updateAudioInfo = () => {
      setAudioContextInfo(manager.getIOSAudioInfo())
    }
    
    updateAudioInfo()
    
    // Update every second while component is mounted
    const interval = setInterval(updateAudioInfo, 1000)
    
    return () => clearInterval(interval)
  }, [])

  const testAudioContextFunctionality = async () => {
    try {
      const results = await testIOSAudioContext()
      setTestResults(results)
      console.log('🧪 iOS Audio Context Test Results:', results)
    } catch (error) {
      console.error('❌ Audio context test failed:', error)
      setTestResults({ error: error.message })
    }
  }

  const initializeRecorder = async () => {
    try {
      const newRecorder = new IOSAudioRecorderService({
        enableIOSOptimizations: true,
        autoResumeAudioContext: true,
        maxDuration: 10 // 10 seconds for testing
      })

      // Set up event handlers
      newRecorder.onStateChange = (state) => {
        console.log(`🎤 Recorder state: ${state}`)
        setRecording(state === 'recording')
      }

      newRecorder.onAudioData = (level) => {
        setAudioLevel(level)
      }

      newRecorder.onComplete = (result) => {
        console.log('🎉 Recording complete:', result)
        setRecordingResult(result)
        setRecording(false)
      }

      newRecorder.onError = (error) => {
        console.error('❌ Recording error:', error)
        setRecording(false)
      }

      setRecorder(newRecorder)
      console.log('🎤 iOS Audio Recorder initialized')
    } catch (error) {
      console.error('❌ Failed to initialize recorder:', error)
    }
  }

  const startRecording = async () => {
    if (!recorder) {
      await initializeRecorder()
      return
    }

    try {
      await recorder.startRecording()
    } catch (error) {
      console.error('❌ Failed to start recording:', error)
    }
  }

  const stopRecording = async () => {
    if (!recorder) return

    try {
      await recorder.stopRecording()
    } catch (error) {
      console.error('❌ Failed to stop recording:', error)
    }
  }

  const testRecorderFunctionality = async () => {
    if (!recorder) {
      await initializeRecorder()
      return
    }

    try {
      const testResult = await recorder.testIOSAudio()
      console.log('🧪 iOS Recorder Test Results:', testResult)
      setTestResults(testResult)
    } catch (error) {
      console.error('❌ Recorder test failed:', error)
    }
  }

  const playRecording = () => {
    if (!recordingResult) return

    const audio = new Audio(URL.createObjectURL(recordingResult.audioFile))
    audio.play().catch(error => {
      console.error('❌ Playback failed:', error)
    })
  }

  const checkAudioContextReady = async () => {
    const isReady = await ensureIOSAudioContextReady()
    console.log(`🔍 Audio Context Ready: ${isReady}`)
    setAudioContextInfo(iosAudioContextManager.getIOSAudioInfo())
  }

  const resumeAudioContext = async () => {
    try {
      await iosAudioContextManager.resumeAudioContext()
      console.log('🔊 Audio context resumed')
      setAudioContextInfo(iosAudioContextManager.getIOSAudioInfo())
    } catch (error) {
      console.error('❌ Failed to resume audio context:', error)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          🍎 iOS Audio Context & Recording Test
        </h2>
        <p className="text-gray-600 mb-6">
          Test iOS-specific audio context handling and recording functionality for Mobile Safari compatibility.
        </p>

        {/* Platform Detection */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Platform Detection</h3>
          {compatibilityInfo && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Platform:</strong> {compatibilityInfo.platform}
              </div>
              <div>
                <strong>Recommended Recorder:</strong> {compatibilityInfo.recommendedRecorder}
              </div>
              <div>
                <strong>AudioContext:</strong> {compatibilityInfo.audioContextSupported ? '✅ Supported' : '❌ Not Supported'}
              </div>
              <div>
                <strong>MediaRecorder:</strong> {compatibilityInfo.mediaRecorderSupported ? '✅ Supported' : '❌ Not Supported'}
              </div>
              {compatibilityInfo.issues && compatibilityInfo.issues.length > 0 && (
                <div className="col-span-2">
                  <strong>Issues:</strong>
                  <ul className="list-disc list-inside text-red-600 mt-1">
                    {compatibilityInfo.issues.map((issue: string, index: number) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Audio Context Status */}
        <div className="bg-green-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-green-900 mb-2">Audio Context Status</h3>
          {audioContextInfo && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Is iOS:</strong> {audioContextInfo.isIOS ? '✅ Yes' : '❌ No'}
              </div>
              <div>
                <strong>Initialized:</strong> {audioContextInfo.isInitialized ? '✅ Yes' : '❌ No'}
              </div>
              <div>
                <strong>Requires User Interaction:</strong> {audioContextInfo.requiresUserInteraction ? '⚠️ Yes' : '✅ No'}
              </div>
              <div>
                <strong>Context State:</strong> {audioContextInfo.contextState || 'Not Available'}
              </div>
              <div>
                <strong>Sample Rate:</strong> {audioContextInfo.sampleRate || 'Unknown'}Hz
              </div>
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <button
              onClick={checkAudioContextReady}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-sm"
            >
              Check Audio Context
            </button>
            <button
              onClick={resumeAudioContext}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
            >
              Resume Audio Context
            </button>
          </div>
        </div>

        {/* Test Controls */}
        <div className="bg-purple-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-purple-900 mb-3">Test Controls</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={testAudioContextFunctionality}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 text-sm"
            >
              Test Audio Context
            </button>
            <button
              onClick={initializeRecorder}
              className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 text-sm"
            >
              Initialize Recorder
            </button>
            <button
              onClick={testRecorderFunctionality}
              disabled={!recorder}
              className="bg-cyan-500 text-white px-4 py-2 rounded hover:bg-cyan-600 disabled:bg-gray-300 text-sm"
            >
              Test Recorder
            </button>
          </div>
        </div>

        {/* Recording Controls */}
        <div className="bg-orange-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-orange-900 mb-3">Recording Test</h3>
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={startRecording}
              disabled={recording || !recorder}
              className="bg-red-500 text-white px-6 py-3 rounded-full hover:bg-red-600 disabled:bg-gray-300 font-medium"
            >
              {recording ? '🎤 Recording...' : '🎤 Start Recording'}
            </button>
            <button
              onClick={stopRecording}
              disabled={!recording}
              className="bg-gray-500 text-white px-6 py-3 rounded-full hover:bg-gray-600 disabled:bg-gray-300 font-medium"
            >
              ⏹️ Stop Recording
            </button>
            {recordingResult && (
              <button
                onClick={playRecording}
                className="bg-green-500 text-white px-6 py-3 rounded-full hover:bg-green-600 font-medium"
              >
                ▶️ Play Recording
              </button>
            )}
          </div>

          {/* Audio Level Visualizer */}
          {recording && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium">Audio Level:</span>
                <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-400 to-red-500 h-full transition-all duration-100"
                    style={{ width: `${audioLevel * 100}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600">{Math.round(audioLevel * 100)}%</span>
              </div>
            </div>
          )}

          {/* Recording Result */}
          {recordingResult && (
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <h4 className="font-medium text-orange-900 mb-2">Recording Result</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Duration: {recordingResult.duration.toFixed(2)}s</div>
                <div>Format: {recordingResult.format}</div>
                <div>Size: {(recordingResult.size / 1024).toFixed(2)}KB</div>
                <div>Bitrate: ~{Math.round(recordingResult.size * 8 / recordingResult.duration / 1000)}kbps</div>
              </div>
            </div>
          )}
        </div>

        {/* Test Results */}
        {testResults && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Test Results</h3>
            <pre className="text-sm text-gray-600 bg-white p-3 rounded border overflow-x-auto">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        )}

        {/* iOS Integration Notes */}
        <div className="bg-yellow-50 rounded-lg p-4 mt-6">
          <h3 className="font-semibold text-yellow-900 mb-2">iOS Integration Notes</h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• iOS Safari requires user interaction to initialize AudioContext</li>
            <li>• Audio context may be suspended and needs to be resumed</li>
            <li>• MediaRecorder support varies by iOS version</li>
            <li>• Optimal audio formats: MP4, WebM with Opus codec</li>
            <li>• Low latency settings help with recording responsiveness</li>
            <li>• Echo cancellation and noise suppression are recommended</li>
          </ul>
        </div>
      </div>
    </div>
  )
}