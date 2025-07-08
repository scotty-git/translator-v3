import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PerformanceMonitor } from './PerformanceMonitor'

// Mock import.meta.env
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        DEV: true
      }
    }
  },
  writable: true
})

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  describe('Development Mode', () => {
    it('should render performance monitor in development', () => {
      render(<PerformanceMonitor />)
      
      expect(screen.getByText('Performance')).toBeInTheDocument()
      expect(screen.getByText(/Whisper:/)).toBeInTheDocument()
      expect(screen.getByText(/Translation:/)).toBeInTheDocument()
      expect(screen.getByText(/Total:/)).toBeInTheDocument()
      expect(screen.getByText(/Messages:/)).toBeInTheDocument()
    })

    it('should show initial metrics values', () => {
      render(<PerformanceMonitor />)
      
      expect(screen.getByText('Whisper: 0ms')).toBeInTheDocument()
      expect(screen.getByText('Translation: 0ms')).toBeInTheDocument()
      expect(screen.getByText('Total: 0ms')).toBeInTheDocument()
      expect(screen.getByText('Messages: 0')).toBeInTheDocument()
    })

    it('should have proper styling', () => {
      render(<PerformanceMonitor />)
      
      const fixedContainer = document.querySelector('.fixed')
      expect(fixedContainer).toBeInTheDocument()
      expect(fixedContainer).toHaveClass('bottom-20')
      expect(fixedContainer).toHaveClass('right-4')
      expect(fixedContainer).toHaveClass('z-50')
    })

    it('should display chart icon', () => {
      render(<PerformanceMonitor />)
      
      const icon = screen.getByText('Performance').parentElement?.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })

    it('should have proper font and text styling', () => {
      render(<PerformanceMonitor />)
      
      const monoContainer = document.querySelector('.font-mono')
      expect(monoContainer).toBeInTheDocument()
      expect(monoContainer).toHaveClass('text-xs')
      
      const title = screen.getByText('Performance')
      expect(title).toHaveClass('font-bold')
    })
  })

  describe('Layout', () => {
    it('should have proper spacing and layout', () => {
      render(<PerformanceMonitor />)
      
      const spaceContainer = document.querySelector('.space-y-1')
      expect(spaceContainer).toBeInTheDocument()
      
      const messagesDiv = screen.getByText('Messages: 0').closest('div')
      expect(messagesDiv).toHaveClass('pt-1')
      expect(messagesDiv).toHaveClass('border-t')
    })
  })

  describe('Performance', () => {
    it('should render quickly', () => {
      const startTime = performance.now()
      
      render(<PerformanceMonitor />)
      
      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(10)
    })
  })
})