import { renderHook, act } from '@testing-library/react'
import { useLongPress } from '../useLongPress'
import { beforeEach, afterEach, describe, test, expect, vi } from 'vitest'

// Mock timers
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
})

describe('useLongPress', () => {
  test('calls onLongPress after threshold time', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress({ onLongPress }))

    const mockEvent = new MouseEvent('mousedown', { bubbles: true })
    
    // Trigger long press
    act(() => {
      result.current.onMouseDown(mockEvent as any)
    })

    // Fast-forward time to just before threshold
    act(() => {
      vi.advanceTimersByTime(499)
    })
    
    expect(onLongPress).not.toHaveBeenCalled()

    // Fast-forward past threshold
    act(() => {
      vi.advanceTimersByTime(2)
    })
    
    expect(onLongPress).toHaveBeenCalledWith(mockEvent)
  })

  test('calls onClick on quick release', () => {
    const onLongPress = vi.fn()
    const onClick = vi.fn()
    const { result } = renderHook(() => useLongPress({ onLongPress, onClick }))

    const mockDownEvent = new MouseEvent('mousedown', { bubbles: true })
    const mockUpEvent = new MouseEvent('mouseup', { bubbles: true })
    
    // Trigger quick press and release
    act(() => {
      result.current.onMouseDown(mockDownEvent as any)
    })

    act(() => {
      vi.advanceTimersByTime(100) // Less than threshold
    })

    act(() => {
      result.current.onMouseUp(mockUpEvent as any)
    })
    
    expect(onLongPress).not.toHaveBeenCalled()
    expect(onClick).toHaveBeenCalledWith(mockUpEvent)
  })

  test('cancels long press on mouse leave', () => {
    const onLongPress = vi.fn()
    const onClick = vi.fn()
    const { result } = renderHook(() => useLongPress({ onLongPress, onClick }))

    const mockDownEvent = new MouseEvent('mousedown', { bubbles: true })
    const mockLeaveEvent = new MouseEvent('mouseleave', { bubbles: true })
    
    // Start long press
    act(() => {
      result.current.onMouseDown(mockDownEvent as any)
    })

    // Leave before threshold
    act(() => {
      vi.advanceTimersByTime(200)
      result.current.onMouseLeave(mockLeaveEvent as any)
    })

    // Fast-forward past threshold
    act(() => {
      vi.advanceTimersByTime(400)
    })
    
    expect(onLongPress).not.toHaveBeenCalled()
    expect(onClick).not.toHaveBeenCalled()
  })

  test('works with touch events', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress({ onLongPress }))

    const mockTouchEvent = new TouchEvent('touchstart', { 
      touches: [{ clientX: 100, clientY: 100 } as Touch]
    })
    
    // Trigger long press with touch
    act(() => {
      result.current.onTouchStart(mockTouchEvent as any)
    })

    // Fast-forward past threshold
    act(() => {
      vi.advanceTimersByTime(500)
    })
    
    expect(onLongPress).toHaveBeenCalledWith(mockTouchEvent)
  })

  test('respects custom threshold', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress({ 
      onLongPress, 
      threshold: 1000 
    }))

    const mockEvent = new MouseEvent('mousedown', { bubbles: true })
    
    // Trigger long press
    act(() => {
      result.current.onMouseDown(mockEvent as any)
    })

    // Fast-forward to default threshold (should not trigger)
    act(() => {
      vi.advanceTimersByTime(500)
    })
    
    expect(onLongPress).not.toHaveBeenCalled()

    // Fast-forward to custom threshold
    act(() => {
      vi.advanceTimersByTime(500)
    })
    
    expect(onLongPress).toHaveBeenCalledWith(mockEvent)
  })

  test('prevents multiple simultaneous long presses', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress({ onLongPress }))

    const mockEvent1 = new MouseEvent('mousedown', { bubbles: true })
    const mockEvent2 = new MouseEvent('mousedown', { bubbles: true })
    
    // Start first long press
    act(() => {
      result.current.onMouseDown(mockEvent1 as any)
    })

    // Start second long press before first completes
    act(() => {
      vi.advanceTimersByTime(200)
      result.current.onMouseDown(mockEvent2 as any)
    })

    // Fast-forward past threshold
    act(() => {
      vi.advanceTimersByTime(400)
    })
    
    // Should only trigger once for the most recent event
    expect(onLongPress).toHaveBeenCalledTimes(1)
    expect(onLongPress).toHaveBeenCalledWith(mockEvent2)
  })

  test('handles preventDefault option', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress({ 
      onLongPress, 
      preventDefault: true 
    }))

    const mockEvent = {
      preventDefault: vi.fn(),
      target: document.createElement('div')
    }
    
    // Trigger long press
    act(() => {
      result.current.onMouseDown(mockEvent as any)
    })
    
    expect(mockEvent.preventDefault).toHaveBeenCalled()
  })

  test('does not call onClick after long press triggers', () => {
    const onLongPress = vi.fn()
    const onClick = vi.fn()
    const { result } = renderHook(() => useLongPress({ onLongPress, onClick }))

    const mockDownEvent = new MouseEvent('mousedown', { bubbles: true })
    const mockUpEvent = new MouseEvent('mouseup', { bubbles: true })
    
    // Start long press
    act(() => {
      result.current.onMouseDown(mockDownEvent as any)
    })

    // Fast-forward past threshold (triggers long press)
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Release after long press triggered
    act(() => {
      result.current.onMouseUp(mockUpEvent as any)
    })
    
    expect(onLongPress).toHaveBeenCalled()
    expect(onClick).not.toHaveBeenCalled()
  })
})