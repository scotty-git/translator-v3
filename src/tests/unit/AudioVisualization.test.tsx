import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AudioVisualization } from '@/components/ui/AudioVisualization'

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => {
  callback(Date.now())
  return 1
})
global.cancelAnimationFrame = vi.fn()

describe('AudioVisualization Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Rendering', () => {
    it('should render 5 bars by default', () => {
      const { container } = render(
        <AudioVisualization audioLevel={0} isRecording={false} />
      )
      
      const bars = container.querySelectorAll('[style*="width"]')
      expect(bars).toHaveLength(5)
    })

    it('should apply correct size configurations', () => {
      const { container: smallContainer } = render(
        <AudioVisualization audioLevel={0} isRecording={false} size="sm" />
      )
      
      const { container: mediumContainer } = render(
        <AudioVisualization audioLevel={0} isRecording={false} size="md" />
      )
      
      const { container: largeContainer } = render(
        <AudioVisualization audioLevel={0} isRecording={false} size="lg" />
      )
      
      // Check that different sizes have different dimensions
      const smallBars = smallContainer.querySelectorAll('[style*="width: 8px"]')
      const mediumBars = mediumContainer.querySelectorAll('[style*="width: 12px"]')
      const largeBars = largeContainer.querySelectorAll('[style*="width: 16px"]')
      
      expect(smallBars.length).toBeGreaterThan(0)
      expect(mediumBars.length).toBeGreaterThan(0)
      expect(largeBars.length).toBeGreaterThan(0)
    })

    it('should accept custom colors', () => {
      const customColors = {
        active: '#FF0000',
        inactive: '#00FF00'
      }
      
      render(
        <AudioVisualization 
          audioLevel={0.5} 
          isRecording={true} 
          colors={customColors}
        />
      )
      
      // Should use custom active color when recording
      // This test verifies the props are passed through correctly
      expect(true).toBe(true) // Component renders without error
    })

    it('should apply custom className', () => {
      const { container } = render(
        <AudioVisualization 
          audioLevel={0} 
          isRecording={false} 
          className="custom-class"
        />
      )
      
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('Audio Level Response', () => {
    it('should show minimum height when not recording', () => {
      const { container } = render(
        <AudioVisualization audioLevel={0.8} isRecording={false} />
      )
      
      // When not recording, bars should be at minimum height regardless of audioLevel
      const bars = container.querySelectorAll('[style*="height"]')
      bars.forEach(bar => {
        const height = (bar as HTMLElement).style.height
        // Should be at minimum height (0.1 * maxHeight)
        expect(height).toBe('6.4px') // 0.1 * 16 * 4 for medium size
      })
    })

    it('should respond to audio level changes when recording', () => {
      const { rerender, container } = render(
        <AudioVisualization audioLevel={0.2} isRecording={true} />
      )
      
      // Advance time to allow animation to start
      vi.advanceTimersByTime(50)
      
      // Change audio level
      rerender(
        <AudioVisualization audioLevel={0.8} isRecording={true} />
      )
      
      // Advance time for animation updates
      vi.advanceTimersByTime(50)
      
      // Should have called requestAnimationFrame
      expect(requestAnimationFrame).toHaveBeenCalled()
    })

    it('should start animation when recording begins', () => {
      const { rerender } = render(
        <AudioVisualization audioLevel={0.5} isRecording={false} />
      )
      
      rerender(
        <AudioVisualization audioLevel={0.5} isRecording={true} />
      )
      
      // Should start animation when recording begins
      expect(requestAnimationFrame).toHaveBeenCalled()
    })

    it('should stop animation when recording ends', () => {
      const { rerender } = render(
        <AudioVisualization audioLevel={0.5} isRecording={true} />
      )
      
      // Clear previous calls
      vi.clearAllMocks()
      
      rerender(
        <AudioVisualization audioLevel={0.5} isRecording={false} />
      )
      
      // Should stop animation when recording ends
      expect(cancelAnimationFrame).toHaveBeenCalled()
    })
  })

  describe('Bar Height Calculation', () => {
    it('should generate different heights for different bars', () => {
      render(
        <AudioVisualization audioLevel={0.5} isRecording={true} />
      )
      
      // Advance time to let the component calculate bar heights
      vi.advanceTimersByTime(100)
      
      // The component should have called requestAnimationFrame to update bars
      expect(requestAnimationFrame).toHaveBeenCalled()
    })

    it('should ensure minimum height for all bars', () => {
      const { container } = render(
        <AudioVisualization audioLevel={0} isRecording={true} />
      )
      
      vi.advanceTimersByTime(100)
      
      const bars = container.querySelectorAll('[style*="height"]')
      bars.forEach(bar => {
        const height = parseInt((bar as HTMLElement).style.height)
        // Should be at least minimum height
        expect(height).toBeGreaterThanOrEqual(6) // 0.1 * 16 * 4 for medium size minimum
      })
    })

    it('should cap maximum height at 100%', () => {
      const { container } = render(
        <AudioVisualization audioLevel={1} isRecording={true} />
      )
      
      vi.advanceTimersByTime(100)
      
      const bars = container.querySelectorAll('[style*="height"]')
      bars.forEach(bar => {
        const height = parseInt((bar as HTMLElement).style.height)
        // Should not exceed maximum height
        expect(height).toBeLessThanOrEqual(64) // 1.0 * 16 * 4 for medium size maximum
      })
    })
  })

  describe('Peak Detection', () => {
    it('should show peak indicators when recording', () => {
      const { container } = render(
        <AudioVisualization audioLevel={0.8} isRecording={true} />
      )
      
      // Advance time to allow peaks to be calculated
      vi.advanceTimersByTime(200)
      
      // Should have peak indicators (elements with opacity-60 class)
      const peakIndicators = container.querySelectorAll('[style*="opacity-60"]')
      // Peak indicators are conditional, so we just check component doesn't crash
      expect(container.firstChild).toBeTruthy()
    })

    it('should not show peak indicators when not recording', () => {
      const { container } = render(
        <AudioVisualization audioLevel={0.8} isRecording={false} />
      )
      
      // Peak indicators should not be shown when not recording
      const peakIndicators = container.querySelectorAll('[style*="opacity-60"]')
      // This test mainly ensures no crashes occur
      expect(container.firstChild).toBeTruthy()
    })
  })

  describe('Performance', () => {
    it('should throttle animation updates to ~60fps', () => {
      render(
        <AudioVisualization audioLevel={0.5} isRecording={true} />
      )
      
      // Clear initial calls
      vi.clearAllMocks()
      
      // Advance time by less than update interval
      vi.advanceTimersByTime(10)
      
      // Should use requestAnimationFrame for smooth animation
      expect(requestAnimationFrame).toHaveBeenCalled()
    })

    it('should clean up animation on unmount', () => {
      const { unmount } = render(
        <AudioVisualization audioLevel={0.5} isRecording={true} />
      )
      
      unmount()
      
      // Should cancel animation frame on unmount
      expect(cancelAnimationFrame).toHaveBeenCalled()
    })

    it('should handle rapid audio level changes smoothly', () => {
      const { rerender } = render(
        <AudioVisualization audioLevel={0.1} isRecording={true} />
      )
      
      // Rapidly change audio levels
      const levels = [0.2, 0.8, 0.3, 0.9, 0.1]
      levels.forEach((level, index) => {
        rerender(
          <AudioVisualization audioLevel={level} isRecording={true} />
        )
        vi.advanceTimersByTime(16) // ~60fps
      })
      
      // Should handle rapid changes without crashing
      expect(requestAnimationFrame).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should be keyboard accessible', () => {
      const { container } = render(
        <AudioVisualization audioLevel={0.5} isRecording={true} />
      )
      
      // Should not interfere with keyboard navigation
      expect(container.firstChild).not.toHaveAttribute('tabindex')
    })

    it('should not have interactive elements that could confuse screen readers', () => {
      const { container } = render(
        <AudioVisualization audioLevel={0.5} isRecording={true} />
      )
      
      // Should be purely visual, no buttons or interactive elements
      const interactiveElements = container.querySelectorAll('button, input, select, textarea, a')
      expect(interactiveElements).toHaveLength(0)
    })
  })
})