import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ActivityIndicator } from './ActivityIndicator'

describe('ActivityIndicator', () => {
  describe('Recording Activity', () => {
    it('should render recording indicator with mic icon', () => {
      render(<ActivityIndicator activity="recording" />)
      
      expect(screen.getByText('Partner is recording')).toBeInTheDocument()
      const icon = document.querySelector('.lucide-mic')
      expect(icon).toBeInTheDocument()
    })

    it('should show animated dots for recording', () => {
      render(<ActivityIndicator activity="recording" />)
      
      const dots = screen.getAllByRole('generic').filter(el => 
        el.className.includes('bg-red-500') && el.className.includes('animate-bounce-subtle')
      )
      expect(dots).toHaveLength(3)
    })

    it('should apply pulse animation for recording', () => {
      render(<ActivityIndicator activity="recording" />)
      
      const container = document.querySelector('.animate-pulse')
      expect(container).toBeInTheDocument()
    })

    it('should use custom user name for recording', () => {
      render(<ActivityIndicator activity="recording" userName="Alice" />)
      
      expect(screen.getByText('Alice is recording')).toBeInTheDocument()
    })
  })

  describe('Processing Activity', () => {
    it('should render processing indicator with brain icon', () => {
      render(<ActivityIndicator activity="processing" />)
      
      expect(screen.getByText('Partner is translating')).toBeInTheDocument()
      expect(document.querySelector('.lucide-brain')).toBeInTheDocument()
    })

    it('should show spinner for processing', () => {
      render(<ActivityIndicator activity="processing" />)
      
      const spinner = document.querySelector('svg.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('should apply pulse animation for processing', () => {
      render(<ActivityIndicator activity="processing" />)
      
      const container = screen.getByText('Partner is translating').closest('div')
      expect(container).toHaveClass('animate-pulse')
    })

    it('should use custom user name for processing', () => {
      render(<ActivityIndicator activity="processing" userName="Bob" />)
      
      expect(screen.getByText('Bob is translating')).toBeInTheDocument()
    })
  })

  describe('Typing Activity', () => {
    it('should render typing indicator without icon', () => {
      render(<ActivityIndicator activity="typing" />)
      
      expect(screen.getByText('Partner is typing')).toBeInTheDocument()
    })

    it('should show animated dots for typing', () => {
      render(<ActivityIndicator activity="typing" />)
      
      const dots = screen.getAllByRole('generic').filter(el => 
        el.className.includes('bg-gray-400') && el.className.includes('animate-bounce-subtle')
      )
      expect(dots).toHaveLength(3)
    })

    it('should not apply pulse animation for typing', () => {
      render(<ActivityIndicator activity="typing" />)
      
      const container = screen.getByText('Partner is typing').closest('div')
      expect(container).not.toHaveClass('animate-pulse')
    })

    it('should use custom user name for typing', () => {
      render(<ActivityIndicator activity="typing" userName="Charlie" />)
      
      expect(screen.getByText('Charlie is typing')).toBeInTheDocument()
    })
  })

  describe('Visual Styling', () => {
    it('should apply glass effect styling', () => {
      render(<ActivityIndicator activity="typing" />)
      
      const glassElement = document.querySelector('.glass-effect')
      expect(glassElement).toBeInTheDocument()
      expect(glassElement).toHaveClass('rounded-2xl')
    })

    it('should apply slide-up animation', () => {
      render(<ActivityIndicator activity="recording" />)
      
      const slideUpElement = document.querySelector('.animate-slide-up')
      expect(slideUpElement).toBeInTheDocument()
    })

    it('should position indicator to the left', () => {
      render(<ActivityIndicator activity="processing" />)
      
      const justifyStartElement = document.querySelector('.justify-start')
      expect(justifyStartElement).toBeInTheDocument()
    })

    it('should limit max width', () => {
      render(<ActivityIndicator activity="typing" />)
      
      const maxWidthElement = document.querySelector('.max-w-\\[70\\%\\]')
      expect(maxWidthElement).toBeInTheDocument()
    })
  })

  describe('Animation Delays', () => {
    it('should apply different animation delays to recording dots', () => {
      render(<ActivityIndicator activity="recording" />)
      
      const dots = screen.getAllByRole('generic').filter(el => 
        el.className.includes('bg-red-500') && el.className.includes('animate-bounce-subtle')
      )
      
      expect(dots[0]).not.toHaveAttribute('style')
      expect(dots[1]).toHaveAttribute('style', 'animation-delay: 0.2s;')
      expect(dots[2]).toHaveAttribute('style', 'animation-delay: 0.4s;')
    })

    it('should apply different animation delays to typing dots', () => {
      render(<ActivityIndicator activity="typing" />)
      
      const dots = screen.getAllByRole('generic').filter(el => 
        el.className.includes('bg-gray-400') && el.className.includes('animate-bounce-subtle')
      )
      
      expect(dots[0]).not.toHaveAttribute('style')
      expect(dots[1]).toHaveAttribute('style', 'animation-delay: 0.15s;')
      expect(dots[2]).toHaveAttribute('style', 'animation-delay: 0.3s;')
    })
  })

  describe('Accessibility', () => {
    it('should have proper text content for screen readers', () => {
      render(<ActivityIndicator activity="recording" userName="Alice" />)
      
      expect(screen.getByText('Alice is recording')).toBeInTheDocument()
    })

    it('should use italic styling for activity text', () => {
      render(<ActivityIndicator activity="processing" />)
      
      const text = screen.getByText('Partner is translating')
      expect(text).toHaveClass('italic')
    })

    it('should have proper color contrast for text', () => {
      render(<ActivityIndicator activity="typing" />)
      
      const text = screen.getByText('Partner is typing')
      expect(text).toHaveClass('text-gray-600')
    })
  })

  describe('Color Themes', () => {
    it('should use red theme for recording', () => {
      render(<ActivityIndicator activity="recording" />)
      
      const icon = document.querySelector('.text-red-500')
      expect(icon).toBeInTheDocument()
      
      const dots = document.querySelectorAll('.bg-red-500')
      expect(dots).toHaveLength(4) // Icon + 3 dots
    })

    it('should use blue theme for processing', () => {
      render(<ActivityIndicator activity="processing" />)
      
      const blueElements = document.querySelectorAll('.text-blue-500')
      expect(blueElements.length).toBeGreaterThanOrEqual(2) // Brain icon + spinner
    })

    it('should use gray theme for typing', () => {
      render(<ActivityIndicator activity="typing" />)
      
      const dots = screen.getAllByRole('generic').filter(el => 
        el.className.includes('bg-gray-400')
      )
      expect(dots).toHaveLength(3)
    })
  })

  describe('Performance', () => {
    it('should render quickly with minimal DOM nodes', () => {
      const startTime = performance.now()
      
      render(<ActivityIndicator activity="recording" />)
      
      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(5)
      
      // Should have minimal DOM structure
      const container = screen.getByText('Partner is recording').closest('div')?.parentElement
      expect(container?.children.length).toBeLessThanOrEqual(2)
    })
  })
})