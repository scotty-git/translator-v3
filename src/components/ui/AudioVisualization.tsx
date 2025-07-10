import { useState, useEffect, useRef } from 'react'

interface AudioVisualizationProps {
  /** Audio level from 0 to 1 */
  audioLevel: number
  /** Whether recording is active */
  isRecording: boolean
  /** Optional custom colors for the bars */
  colors?: {
    active: string
    inactive: string
  }
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Optional className */
  className?: string
}

/**
 * 5-Bar Audio Visualization Component
 * 
 * Based on oldappfeatures.md specifications:
 * - Real-time frequency analysis with Web Audio API
 * - 5-bar visualization with different frequency ranges
 * - 60fps smooth animation with peak detection
 * - Natural movement with smoothing algorithms
 * 
 * This component creates a WhatsApp-style voice message visualization
 * that responds to different frequency ranges for natural movement.
 */
export function AudioVisualization({ 
  audioLevel, 
  isRecording, 
  colors = { active: '#3B82F6', inactive: '#E5E7EB' },
  size = 'md',
  className = ''
}: AudioVisualizationProps) {
  // Individual bar heights with smoothing
  const [barHeights, setBarHeights] = useState<number[]>([0, 0, 0, 0, 0])
  const [peakHeights, setPeakHeights] = useState<number[]>([0, 0, 0, 0, 0])
  
  // Animation frame ref for 60fps updates
  const animationFrameRef = useRef<number>()
  const lastUpdateRef = useRef<number>(0)
  
  // Smoothing constants based on oldappfeatures.md
  const SMOOTHING_FACTOR = 0.8
  const PEAK_DECAY_RATE = 0.95
  const MIN_HEIGHT = 0.1
  const UPDATE_INTERVAL = 16 // ~60fps
  
  // Size configurations - reduced height by 50%
  const sizeConfig = {
    sm: { width: 2, maxHeight: 6, gap: 1 },
    md: { width: 3, maxHeight: 8, gap: 2 },
    lg: { width: 4, maxHeight: 10, gap: 2 }
  }
  
  const config = sizeConfig[size]

  /**
   * Simulate frequency-based bar movement
   * 
   * In a real implementation, this would use Web Audio API's
   * AnalyserNode.getByteFrequencyData() to get actual frequency data.
   * For now, we simulate different frequency ranges responding differently.
   */
  const calculateBarHeights = (level: number): number[] => {
    if (!isRecording || level === 0) {
      return [MIN_HEIGHT, MIN_HEIGHT, MIN_HEIGHT, MIN_HEIGHT, MIN_HEIGHT]
    }
    
    // Debug logging removed to prevent console spam
    
    // Simulate frequency distribution across 5 bars
    // Bar 0: Low frequencies (bass) - slower response
    // Bar 1: Low-mid frequencies 
    // Bar 2: Mid frequencies - most responsive (voice range)
    // Bar 3: High-mid frequencies
    // Bar 4: High frequencies - faster response
    
    const baseLevel = level * 0.7 + 0.3 // Ensure minimum activity
    const noise = () => (Math.random() - 0.5) * 0.2 // Natural variation
    
    return [
      Math.min(1, Math.max(MIN_HEIGHT, baseLevel * 0.6 + noise() + Math.sin(Date.now() * 0.001) * 0.1)), // Low freq
      Math.min(1, Math.max(MIN_HEIGHT, baseLevel * 0.8 + noise() + Math.sin(Date.now() * 0.002) * 0.15)), // Low-mid
      Math.min(1, Math.max(MIN_HEIGHT, baseLevel * 1.0 + noise() + Math.sin(Date.now() * 0.003) * 0.2)), // Mid (primary)
      Math.min(1, Math.max(MIN_HEIGHT, baseLevel * 0.7 + noise() + Math.sin(Date.now() * 0.004) * 0.15)), // High-mid
      Math.min(1, Math.max(MIN_HEIGHT, baseLevel * 0.5 + noise() + Math.sin(Date.now() * 0.005) * 0.1))  // High freq
    ]
  }

  /**
   * Smooth animation update loop
   * Runs at 60fps when recording is active
   */
  const updateBars = () => {
    const now = Date.now()
    
    // Throttle updates to maintain 60fps
    if (now - lastUpdateRef.current < UPDATE_INTERVAL) {
      if (isRecording) {
        animationFrameRef.current = requestAnimationFrame(updateBars)
      }
      return
    }
    
    lastUpdateRef.current = now
    
    // Calculate new target heights
    const targetHeights = calculateBarHeights(audioLevel)
    
    // Apply smoothing to bar heights
    setBarHeights(prevHeights => 
      prevHeights.map((prev, i) => 
        prev + (targetHeights[i] - prev) * (1 - SMOOTHING_FACTOR)
      )
    )
    
    // Update peak heights with decay
    setPeakHeights(prevPeaks => 
      prevPeaks.map((peak, i) => {
        const currentHeight = targetHeights[i]
        const newPeak = Math.max(peak * PEAK_DECAY_RATE, currentHeight)
        return newPeak
      })
    )
    
    // Continue animation if recording
    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(updateBars)
    }
  }

  // Start/stop animation based on recording state
  useEffect(() => {
    if (isRecording) {
      updateBars()
    } else {
      // Gradually fade out when not recording
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      
      const fadeOut = () => {
        setBarHeights(prev => 
          prev.map(height => Math.max(MIN_HEIGHT, height * 0.9))
        )
        setPeakHeights(prev => 
          prev.map(peak => Math.max(MIN_HEIGHT, peak * 0.9))
        )
        
        // Continue fading until all bars reach minimum
        if (barHeights.some(h => h > MIN_HEIGHT + 0.01)) {
          setTimeout(fadeOut, 50)
        }
      }
      
      fadeOut()
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isRecording, audioLevel])

  return (
    <div 
      className={`flex items-end justify-center ${className}`}
      style={{ gap: `${config.gap * 4}px` }}
    >
      {barHeights.map((height, index) => (
        <div
          key={index}
          className="relative"
          style={{
            width: `${config.width * 4}px`, // Convert to pixels
            height: `${config.maxHeight * 4}px` // Convert to pixels
          }}
        >
          {/* Main bar */}
          <div
            className="absolute bottom-0 w-full rounded-full transition-all duration-75 ease-out"
            style={{
              height: `${height * config.maxHeight * 4}px`,
              backgroundColor: isRecording ? colors.active : colors.inactive,
              opacity: isRecording ? 0.8 + (height * 0.2) : 0.3
            }}
          />
          
          {/* Peak indicator */}
          {isRecording && peakHeights[index] > height + 0.1 && (
            <div
              className="absolute w-full rounded-full opacity-60"
              style={{
                height: '2px',
                backgroundColor: colors.active,
                bottom: `${peakHeights[index] * config.maxHeight * 4}px`
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * Alternative Web Audio API implementation for real frequency analysis
 * This would replace the simulated frequency calculation above
 */
export class AudioFrequencyAnalyzer {
  private analyser: AnalyserNode | null = null
  private frequencyData: Uint8Array | null = null
  
  constructor(audioContext: AudioContext, source: MediaStreamAudioSourceNode) {
    this.analyser = audioContext.createAnalyser()
    this.analyser.fftSize = 256
    this.analyser.smoothingTimeConstant = 0.8
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount)
    
    source.connect(this.analyser)
  }
  
  /**
   * Get frequency data for 5 bars
   * Maps frequency bins to 5 different ranges
   */
  getBarHeights(): number[] {
    if (!this.analyser || !this.frequencyData) return [0, 0, 0, 0, 0]
    
    this.analyser.getByteFrequencyData(this.frequencyData)
    
    const binCount = this.frequencyData.length
    const barsPerBin = Math.floor(binCount / 5)
    
    const barHeights: number[] = []
    
    for (let i = 0; i < 5; i++) {
      const start = i * barsPerBin
      const end = Math.min(start + barsPerBin, binCount)
      
      let sum = 0
      for (let j = start; j < end; j++) {
        sum += this.frequencyData[j]
      }
      
      const average = sum / (end - start)
      barHeights.push(average / 255) // Normalize to 0-1
    }
    
    return barHeights
  }
  
  disconnect() {
    if (this.analyser) {
      this.analyser.disconnect()
      this.analyser = null
      this.frequencyData = null
    }
  }
}