# Phase 3: Audio Recording System

## Overview
Implement the push-to-talk audio recording system with format detection, visualization, and mobile/desktop support, preparing for OpenAI Whisper integration.

## Prerequisites
- Phase 0, 1, 2 completed
- UI components and navigation working
- Session management functional
- OpenAI API key configured

## Goals
- Implement push-to-talk recording
- Audio format detection cascade (Whisper supports: mp3, mp4, mpeg, mpga, m4a, wav, webm)
- WebAudioAPI integration
- Recording visualization (5 bars)
- Audio compression settings optimized for Whisper
- Handle recording states
- Mobile touch vs desktop click
- Prepare audio for Whisper API (25MB limit)

## OpenAI Whisper API Requirements (2024)

### Supported Formats
- **File formats**: mp3, mp4, mpeg, mpga, m4a, wav, webm
- **File size limit**: 25MB maximum
- **Model**: whisper-1 (current production model)
- **Languages**: 99 languages supported with varying accuracy
- **No streaming support**: Complete file must be uploaded

### Best Practices
1. **Audio Quality**: Handle various conditions (accents, background noise)
2. **Chunk Large Files**: Split recordings > 25MB into segments
3. **Rate Limiting**: Implement request scheduling to avoid throttling
4. **Format Selection**: Prefer webm with opus codec for quality/size ratio

## Implementation Steps

### 1. Create Audio Utilities

#### Audio Format Detection (src/lib/audio/formats.ts)
```typescript
export interface AudioFormat {
  mimeType: string
  extension: string
  codec?: string
}

// Formats ordered by preference for Whisper API compatibility
export const AUDIO_FORMATS: AudioFormat[] = [
  { mimeType: 'audio/webm;codecs=opus', extension: 'webm', codec: 'opus' }, // Best compression
  { mimeType: 'audio/webm', extension: 'webm' },
  { mimeType: 'audio/mp4', extension: 'mp4' },
  { mimeType: 'audio/mpeg', extension: 'mp3' }, // Added for Whisper
  { mimeType: 'audio/wav', extension: 'wav' }, // Largest but universal
  { mimeType: 'audio/ogg;codecs=opus', extension: 'ogg', codec: 'opus' },
  { mimeType: 'audio/ogg', extension: 'ogg' },
]

export async function detectSupportedFormat(): Promise<AudioFormat | null> {
  // Check if MediaRecorder is available
  if (!window.MediaRecorder) {
    console.error('MediaRecorder not supported')
    return null
  }

  // Test each format
  for (const format of AUDIO_FORMATS) {
    if (MediaRecorder.isTypeSupported(format.mimeType)) {
      console.log(`✅ Supported audio format: ${format.mimeType}`)
      return format
    }
  }

  console.error('No supported audio formats found')
  return null
}

export function getBrowserDefault(): AudioFormat {
  // Fallback to browser default
  return {
    mimeType: '',
    extension: 'webm',
  }
}
```

#### Audio Constraints (src/lib/audio/constraints.ts)
```typescript
// Optimized for Whisper transcription quality
export const AUDIO_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 16000, // Whisper works well with 16kHz
    channelCount: 1, // Mono audio for smaller file size
  },
  video: false,
}

// Maximum recording duration to stay under 25MB limit
export const MAX_RECORDING_DURATION = 300; // 5 minutes
export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes

export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS)
    // Stop the stream immediately - we just wanted to check permission
    stream.getTracks().forEach(track => track.stop())
    return true
  } catch (error) {
    console.error('Microphone permission denied:', error)
    return false
  }
}

export async function checkMicrophonePermission(): Promise<PermissionState> {
  try {
    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
    return result.state
  } catch (error) {
    // Fallback for browsers that don't support permissions API
    return 'prompt'
  }
}
```

### 2. Create Audio Visualizer

#### Audio Visualizer Component (src/features/audio/AudioVisualizer.tsx)
```typescript
import { useEffect, useRef } from 'react'
import { clsx } from 'clsx'

interface AudioVisualizerProps {
  stream: MediaStream | null
  isRecording: boolean
}

export function AudioVisualizer({ stream, isRecording }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const analyserRef = useRef<AnalyserNode>()
  const dataArrayRef = useRef<Uint8Array>()

  useEffect(() => {
    if (!stream || !canvasRef.current) return

    const audioContext = new AudioContext()
    const analyser = audioContext.createAnalyser()
    const source = audioContext.createMediaStreamSource(stream)
    
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.8
    source.connect(analyser)
    
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    
    analyserRef.current = analyser
    dataArrayRef.current = dataArray

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    const width = canvas.width
    const height = canvas.height

    const draw = () => {
      if (!isRecording) {
        ctx.clearRect(0, 0, width, height)
        return
      }

      animationRef.current = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(dataArray)

      ctx.fillStyle = 'rgb(249, 250, 251)' // bg-gray-50
      ctx.fillRect(0, 0, width, height)

      const barWidth = width / 5
      const barSpacing = barWidth / 4
      const maxBarHeight = height * 0.8
      
      // Calculate average for 5 frequency bands
      const bands = 5
      const samplesPerBand = Math.floor(bufferLength / bands)
      
      for (let i = 0; i < bands; i++) {
        let sum = 0
        for (let j = 0; j < samplesPerBand; j++) {
          sum += dataArray[i * samplesPerBand + j]
        }
        const average = sum / samplesPerBand
        const barHeight = (average / 255) * maxBarHeight
        
        const x = i * (barWidth + barSpacing) + barSpacing
        const y = (height - barHeight) / 2
        
        // Gradient fill
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight)
        gradient.addColorStop(0, 'rgb(59, 130, 246)') // primary-500
        gradient.addColorStop(1, 'rgb(37, 99, 235)') // primary-600
        
        ctx.fillStyle = gradient
        ctx.fillRect(x, y, barWidth - barSpacing, barHeight)
      }
    }

    draw()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      source.disconnect()
      audioContext.close()
    }
  }, [stream, isRecording])

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={60}
      className={clsx(
        'transition-opacity',
        isRecording ? 'opacity-100' : 'opacity-30'
      )}
    />
  )
}
```

### 3. Create Recording Hook

#### useAudioRecording Hook (src/hooks/useAudioRecording.ts)
```typescript
import { useState, useRef, useCallback, useEffect } from 'react'
import { detectSupportedFormat, getBrowserDefault } from '@/lib/audio/formats'
import { AUDIO_CONSTRAINTS } from '@/lib/audio/constraints'

export interface RecordingState {
  isRecording: boolean
  isPaused: boolean
  duration: number
  error: string | null
}

export interface UseAudioRecordingReturn {
  state: RecordingState
  stream: MediaStream | null
  startRecording: () => Promise<void>
  stopRecording: () => Promise<Blob | null>
  pauseRecording: () => void
  resumeRecording: () => void
  cancelRecording: () => void
}

export function useAudioRecording(): UseAudioRecordingReturn {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    error: null,
  })
  const [stream, setStream] = useState<MediaStream | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const durationIntervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  const startRecording = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }))
      
      // Get audio format
      const format = await detectSupportedFormat() || getBrowserDefault()
      
      // Get media stream
      const mediaStream = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS)
      setStream(mediaStream)
      
      // Create media recorder
      const mediaRecorder = new MediaRecorder(mediaStream, {
        mimeType: format.mimeType || undefined,
      })
      
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      
      // Set up event listeners
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        setState(prev => ({ 
          ...prev, 
          error: 'Recording failed. Please try again.',
          isRecording: false 
        }))
      }
      
      // Start recording with optimal chunk size for Whisper
      mediaRecorder.start(1000) // Collect data every 1s (reduces overhead)
      startTimeRef.current = Date.now()
      
      // Update duration
      durationIntervalRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          duration: Math.floor((Date.now() - startTimeRef.current) / 1000),
        }))
      }, 100)
      
      setState(prev => ({ 
        ...prev, 
        isRecording: true,
        isPaused: false,
        duration: 0 
      }))
      
    } catch (error) {
      console.error('Failed to start recording:', error)
      setState(prev => ({ 
        ...prev, 
        error: 'Microphone access denied',
        isRecording: false 
      }))
    }
  }, [])

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        resolve(null)
        return
      }

      mediaRecorder.onstop = () => {
        // Clear duration interval
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current)
        }
        
        // Stop all tracks
        if (stream) {
          stream.getTracks().forEach(track => track.stop())
          setStream(null)
        }
        
        // Create blob from chunks
        const format = detectSupportedFormat() || getBrowserDefault()
        const blob = new Blob(chunksRef.current, { 
          type: format.mimeType || 'audio/webm' 
        })
        
        setState({
          isRecording: false,
          isPaused: false,
          duration: 0,
          error: null,
        })
        
        resolve(blob)
      }

      mediaRecorder.stop()
    })
  }, [stream])

  const pauseRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause()
      setState(prev => ({ ...prev, isPaused: true }))
    }
  }, [])

  const resumeRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume()
      setState(prev => ({ ...prev, isPaused: false }))
    }
  }, [])

  const cancelRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
      
      // Clear duration interval
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
      
      // Stop all tracks
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
        setStream(null)
      }
      
      setState({
        isRecording: false,
        isPaused: false,
        duration: 0,
        error: null,
      })
    }
  }, [stream])

  return {
    state,
    stream,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
  }
}
```

### 4. Create Push-to-Talk Component

#### Recording Controls (src/features/audio/RecordingControls.tsx)
```typescript
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Mic, MicOff, Square } from 'lucide-react'
import { AudioVisualizer } from './AudioVisualizer'
import { useAudioRecording } from '@/hooks/useAudioRecording'
import { useSession } from '../session/SessionContext'
import { ActivityService } from '@/services/supabase'
import { clsx } from 'clsx'

export function RecordingControls() {
  const { session, userId } = useSession()
  const { state, stream, startRecording, stopRecording, cancelRecording } = useAudioRecording()
  const [isHolding, setIsHolding] = useState(false)
  const holdTimeoutRef = useRef<NodeJS.Timeout>()
  const recordingBlobRef = useRef<Blob | null>(null)

  // Update activity status
  useEffect(() => {
    if (!session) return
    
    if (state.isRecording) {
      ActivityService.updateActivity(session.id, userId, 'recording')
    }
  }, [state.isRecording, session, userId])

  // Force stop on Space key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && state.isRecording) {
        e.preventDefault()
        handleForceStop()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.isRecording])

  const handlePointerDown = async (e: React.PointerEvent) => {
    e.preventDefault()
    setIsHolding(true)
    
    // Start recording after brief delay to prevent accidental taps
    holdTimeoutRef.current = setTimeout(async () => {
      await startRecording()
    }, 100)
  }

  const handlePointerUp = async (e: React.PointerEvent) => {
    e.preventDefault()
    setIsHolding(false)
    
    // Clear timeout if not started yet
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current)
    }
    
    // Stop recording if active
    if (state.isRecording) {
      const blob = await stopRecording()
      if (blob) {
        recordingBlobRef.current = blob
        // TODO: Send blob to translation service
        console.log('Recording complete:', blob.size, 'bytes')
      }
    }
  }

  const handlePointerCancel = () => {
    setIsHolding(false)
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current)
    }
    if (state.isRecording) {
      cancelRecording()
    }
  }

  const handleForceStop = async () => {
    console.log('Force stopping recording...')
    const blob = await stopRecording()
    if (blob) {
      recordingBlobRef.current = blob
      // TODO: Send blob to translation service
      console.log('Recording force stopped:', blob.size, 'bytes')
    }
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-white border-t border-gray-200">
      <div className="container mx-auto max-w-6xl p-4">
        {/* Visualizer */}
        {(state.isRecording || stream) && (
          <div className="flex justify-center mb-4">
            <AudioVisualizer stream={stream} isRecording={state.isRecording} />
          </div>
        )}
        
        {/* Recording Info */}
        {state.isRecording && (
          <div className="text-center mb-2">
            <p className="text-sm font-medium text-red-600 animate-pulse">
              Recording... {formatDuration(state.duration)}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Release to send • Press SPACE to force send
            </p>
          </div>
        )}
        
        {/* Error Message */}
        {state.error && (
          <div className="text-center mb-2">
            <p className="text-sm text-red-600">{state.error}</p>
          </div>
        )}
        
        {/* Record Button */}
        <div className="flex justify-center">
          <button
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onPointerLeave={handlePointerCancel}
            disabled={!session}
            className={clsx(
              'relative rounded-full transition-all touch-none select-none',
              'focus:outline-none focus:ring-4 focus:ring-primary-500/50',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              {
                'h-20 w-20': !isHolding && !state.isRecording,
                'h-24 w-24 scale-110': isHolding || state.isRecording,
              }
            )}
          >
            <div
              className={clsx(
                'absolute inset-0 rounded-full transition-colors',
                {
                  'bg-primary-600 hover:bg-primary-700': !state.isRecording,
                  'bg-red-600 animate-pulse': state.isRecording,
                }
              )}
            />
            <div className="relative flex items-center justify-center h-full">
              {state.isRecording ? (
                <Square className="h-8 w-8 text-white" />
              ) : (
                <Mic className="h-8 w-8 text-white" />
              )}
            </div>
          </button>
        </div>
        
        {/* Instructions */}
        {!state.isRecording && (
          <p className="text-center text-sm text-gray-600 mt-3">
            Hold to record • Release to translate
          </p>
        )}
      </div>
    </div>
  )
}
```

### 5. Create Audio Service

#### Audio Service (src/services/audio/AudioService.ts)
```typescript
import { detectSupportedFormat } from '@/lib/audio/formats'

export class AudioService {
  /**
   * Convert blob to base64 for API transmission
   */
  static async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result as string
        // Remove data URL prefix
        const base64Data = base64.split(',')[1]
        resolve(base64Data)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  /**
   * Create File object from blob with proper extension
   */
  static blobToFile(blob: Blob, filename?: string): File {
    const format = detectSupportedFormat()
    const extension = format?.extension || 'webm'
    const name = filename || `recording-${Date.now()}.${extension}`
    
    return new File([blob], name, { 
      type: blob.type || format?.mimeType || 'audio/webm' 
    })
  }

  /**
   * Play audio blob
   */
  static async playAudioBlob(blob: Blob): Promise<void> {
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    
    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(url)
        resolve()
      }
      audio.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to play audio'))
      }
      audio.play()
    })
  }

  /**
   * Get audio duration from blob
   */
  static async getAudioDuration(blob: Blob): Promise<number> {
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    
    return new Promise((resolve, reject) => {
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url)
        resolve(audio.duration)
      }
      audio.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load audio'))
      }
    })
  }

  /**
   * Validate audio blob for Whisper API
   */
  static async validateAudioBlob(blob: Blob): Promise<boolean> {
    // Check size (max 25MB for Whisper)
    if (blob.size > MAX_FILE_SIZE) {
      console.error('Audio file too large for Whisper API:', blob.size)
      return false
    }
    
    // Check if we can get duration
    try {
      const duration = await this.getAudioDuration(blob)
      return duration > 0 && duration < MAX_RECORDING_DURATION
    } catch {
      return false
    }
  }

  /**
   * Prepare audio for Whisper API
   */
  static async prepareForWhisper(blob: Blob): Promise<File> {
    // Validate first
    const isValid = await this.validateAudioBlob(blob)
    if (!isValid) {
      throw new Error('Audio file invalid for Whisper API')
    }

    // Convert to file with proper naming
    return this.blobToFile(blob, `audio-${Date.now()}.webm`)
  }
}
```

### 6. Create Permission Handler

#### Permission Modal (src/features/audio/PermissionModal.tsx)
```typescript
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Mic, X } from 'lucide-react'
import { requestMicrophonePermission } from '@/lib/audio/constraints'

interface PermissionModalProps {
  isOpen: boolean
  onClose: () => void
  onPermissionGranted: () => void
}

export function PermissionModal({ isOpen, onClose, onPermissionGranted }: PermissionModalProps) {
  const [isRequesting, setIsRequesting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleRequestPermission = async () => {
    setIsRequesting(true)
    setError('')
    
    const granted = await requestMicrophonePermission()
    
    if (granted) {
      onPermissionGranted()
    } else {
      setError('Microphone access is required for translation')
    }
    
    setIsRequesting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-sm w-full">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
              <Mic className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold">Microphone Access</h3>
              <p className="text-sm text-gray-600">Required for voice translation</p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="p-1"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            To translate your voice in real-time, we need access to your microphone. 
            Your audio is only used for translation and is not stored.
          </p>
          
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          
          <div className="flex gap-2">
            <Button
              onClick={handleRequestPermission}
              fullWidth
              disabled={isRequesting}
            >
              {isRequesting ? 'Requesting...' : 'Allow Microphone'}
            </Button>
            <Button
              onClick={onClose}
              variant="secondary"
              disabled={isRequesting}
            >
              Later
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
```

## Tests

### Test 1: Audio Format Detection
```typescript
// tests/audio/formats.test.ts
import { detectSupportedFormat, AUDIO_FORMATS } from '@/lib/audio/formats'

describe('Audio Format Detection', () => {
  test('detects supported format', async () => {
    // Mock MediaRecorder
    const mockIsTypeSupported = jest.fn()
    mockIsTypeSupported.mockReturnValue(true)
    window.MediaRecorder = {
      isTypeSupported: mockIsTypeSupported,
    } as any
    
    const format = await detectSupportedFormat()
    expect(format).toBeTruthy()
    expect(format?.mimeType).toBe(AUDIO_FORMATS[0].mimeType)
  })
  
  test('returns null if no format supported', async () => {
    const mockIsTypeSupported = jest.fn()
    mockIsTypeSupported.mockReturnValue(false)
    window.MediaRecorder = {
      isTypeSupported: mockIsTypeSupported,
    } as any
    
    const format = await detectSupportedFormat()
    expect(format).toBeNull()
  })
})
```

### Test 2: Recording Hook
```typescript
// tests/hooks/useAudioRecording.test.ts
import { renderHook, act } from '@testing-library/react-hooks'
import { useAudioRecording } from '@/hooks/useAudioRecording'

describe('useAudioRecording', () => {
  test('starts and stops recording', async () => {
    // Mock getUserMedia
    const mockStream = {
      getTracks: () => [{
        stop: jest.fn()
      }]
    }
    
    navigator.mediaDevices = {
      getUserMedia: jest.fn().mockResolvedValue(mockStream)
    } as any
    
    const { result } = renderHook(() => useAudioRecording())
    
    expect(result.current.state.isRecording).toBe(false)
    
    await act(async () => {
      await result.current.startRecording()
    })
    
    expect(result.current.state.isRecording).toBe(true)
    expect(result.current.stream).toBeTruthy()
  })
})
```

### Test 3: Audio Service
```typescript
// tests/services/AudioService.test.ts
import { AudioService } from '@/services/audio/AudioService'

describe('AudioService', () => {
  test('converts blob to base64', async () => {
    const blob = new Blob(['test'], { type: 'audio/webm' })
    const base64 = await AudioService.blobToBase64(blob)
    expect(base64).toBeTruthy()
    expect(typeof base64).toBe('string')
  })
  
  test('validates audio blob size', async () => {
    const smallBlob = new Blob(['test'], { type: 'audio/webm' })
    const largeBlob = new Blob(new Array(26 * 1024 * 1024), { type: 'audio/webm' })
    
    expect(await AudioService.validateAudioBlob(smallBlob)).toBe(false) // Too small
    expect(await AudioService.validateAudioBlob(largeBlob)).toBe(false) // Too large
  })
})
```

### Manual Test Checklist
- [ ] Push-to-talk works on mobile (touch and hold)
- [ ] Push-to-talk works on desktop (click and hold)
- [ ] Audio visualizer shows levels
- [ ] Recording duration updates
- [ ] Space key force stops recording
- [ ] Permission modal appears when needed
- [ ] Error states display correctly
- [ ] Recording cancels on pointer leave
- [ ] Audio format detected correctly
- [ ] Blob created successfully

## Refactoring Checklist
- [ ] Extract recording logic to service
- [ ] Add audio compression options
- [ ] Implement recording size limits
- [ ] Add waveform visualization option
- [ ] Create audio player component
- [ ] Add recording preview
- [ ] Implement voice activity detection

## Success Criteria
- [ ] Push-to-talk recording functional
- [ ] Audio format cascade working
- [ ] Visualization shows audio levels
- [ ] Mobile touch events handled
- [ ] Desktop mouse events handled
- [ ] Permission handling smooth
- [ ] Recording states managed properly
- [ ] Audio blobs created successfully
- [ ] Force stop with Space key works

## Common Issues & Solutions

### Issue: MediaRecorder not available
**Solution**: Check browser compatibility, provide fallback

### Issue: Permission denied
**Solution**: Show clear modal explaining why permission needed

### Issue: Audio format not supported
**Solution**: Use format detection cascade, fallback to default

### Issue: Touch events not working
**Solution**: Use pointer events instead of touch/mouse events

### Issue: Audio file too large for Whisper (>25MB)
**Solution**: 
1. Limit recording duration to 5 minutes
2. Use lower sample rate (16kHz)
3. Implement file chunking for longer recordings

### Issue: Poor transcription quality
**Solution**:
1. Ensure good audio quality with noise suppression
2. Use appropriate language hints
3. Adjust temperature parameter (0 = more accurate)

## Performance Considerations
- Stop media stream when not needed
- Use Web Workers for audio processing
- Implement chunked recording for long audio
- Optimize visualization rendering
- Clean up audio contexts properly
- Use 16kHz sample rate to reduce file size
- Mono channel recording for smaller files
- Monitor file size during recording

## Security Notes
- Audio never stored without user consent
- Use HTTPS for microphone access (required)
- Clear audio blobs after processing
- Implement recording time limits (5 min max)
- Validate audio data before sending
- Sanitize filenames (ASCII only for Whisper)
- Don't log sensitive audio content

## Whisper API Best Practices Summary

1. **File Preparation**
   - Keep files under 25MB
   - Use supported formats (webm preferred)
   - ASCII-only filenames
   - Mono audio at 16kHz for efficiency

2. **Rate Limiting**
   - Implement request queuing
   - Add exponential backoff
   - Monitor usage limits

3. **Error Handling**
   - Handle network failures gracefully
   - Implement retry logic
   - Provide user feedback

4. **Optimization**
   - Use appropriate model (whisper-1)
   - Set temperature to 0 for consistency
   - Specify source language when known

## Integration with Phase 4 (OpenAI APIs)

### Whisper API Integration Preview
```typescript
// Phase 4 will implement:
const transcription = await openai.audio.transcriptions.create({
  file: audioFile,
  model: "whisper-1",
  language: "en", // Optional: specify source language
  response_format: "json",
  temperature: 0, // Lower = more deterministic
});
```

### TTS API Integration Preview (2024)
```typescript
// Using new gpt-4o-mini-tts model for voice generation
const speech = await openai.audio.speech.create({
  model: "tts-1", // or "tts-1-hd" for higher quality
  voice: "alloy", // Available voices: alloy, echo, fable, onyx, nova, shimmer
  input: translatedText,
  response_format: "mp3",
  speed: 1.0, // 0.25 to 4.0
});
```

## Next Steps
- Phase 4: Integrate OpenAI APIs
- Send audio to Whisper for transcription
- Translate with GPT-4o-mini
- Generate TTS response with new 2024 models
- Implement streaming audio playback