import { useRef, useCallback } from 'react'

/**
 * Configuration options for the useLongPress hook
 * Provides fine-grained control over long-press behavior
 */
export interface UseLongPressOptions {
  /** Callback triggered when long-press threshold is reached */
  onLongPress: (event: React.MouseEvent | React.TouchEvent) => void
  /** Optional callback for regular clicks (when long-press doesn't occur) */
  onClick?: (event: React.MouseEvent | React.TouchEvent) => void
  /** Duration in milliseconds before triggering long-press (default: 500ms) */
  threshold?: number
  /** Whether to cancel long-press if user moves finger/mouse (default: true) */
  cancelOnMovement?: boolean
}

/**
 * useLongPress Hook
 * 
 * A custom React hook that detects long-press gestures on elements.
 * This is the foundation of the emoji reaction system, enabling WhatsApp-style
 * long-press interactions.
 * 
 * Key Features:
 * 1. Configurable press duration threshold
 * 2. Movement cancellation (prevents accidental triggers during scrolling)
 * 3. Supports both mouse and touch events
 * 4. Distinguishes between long-press and regular clicks
 * 5. Clean timeout management to prevent memory leaks
 * 
 * Architecture:
 * - Uses refs to track state without causing re-renders
 * - Implements timeout-based detection
 * - Calculates movement distance to cancel on drag
 * - Provides event handlers for all necessary DOM events
 * 
 * Usage Example:
 * ```tsx
 * const longPressHandlers = useLongPress({
 *   onLongPress: (event) => showEmojiPicker(event),
 *   onClick: (event) => handleClick(event),
 *   threshold: 500,
 *   cancelOnMovement: true
 * })
 * 
 * return <div {...longPressHandlers}>Long press me!</div>
 * ```
 */
export function useLongPress({
  onLongPress,
  onClick,
  threshold = 500,
  cancelOnMovement = true
}: UseLongPressOptions) {
  /**
   * Timeout reference for the long-press timer
   * Stored in ref to persist across renders without causing re-renders
   */
  const timeoutRef = useRef<NodeJS.Timeout>()
  
  /**
   * Flag to track if a long-press was triggered
   * Used to distinguish between long-press and regular click in onEnd handler
   */
  const isLongPressRef = useRef(false)
  
  /**
   * Starting position of the press
   * Used to calculate movement distance for cancellation
   */
  const startPositionRef = useRef({ x: 0, y: 0 })

  /**
   * Clears the long-press timeout and resets state
   * Called when press is cancelled or completed
   */
  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = undefined
    }
    isLongPressRef.current = false
  }, [])

  /**
   * Extracts position coordinates from mouse or touch events
   * Handles the difference between MouseEvent and TouchEvent APIs
   * 
   * @param event - Mouse or touch event
   * @returns Object with x, y coordinates
   */
  const getEventPosition = (event: React.MouseEvent | React.TouchEvent) => {
    // TouchEvent: use first touch point
    if ('touches' in event && event.touches.length > 0) {
      return { x: event.touches[0].clientX, y: event.touches[0].clientY }
    }
    // MouseEvent: use direct coordinates
    return { x: (event as React.MouseEvent).clientX, y: (event as React.MouseEvent).clientY }
  }

  /**
   * Handles the start of a press (mousedown/touchstart)
   * 
   * Flow:
   * 1. Prevent default behavior to avoid conflicts with browser gestures
   * 2. Record starting position for movement tracking
   * 3. Clear any existing timeout
   * 4. Start new timeout for long-press detection
   */
  const onStart = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    // Prevent default behavior like text selection or context menus
    event.preventDefault()
    
    // Record starting position for movement detection
    const position = getEventPosition(event)
    startPositionRef.current = position

    // Clear any existing timeout
    clear()

    // Start countdown to long-press
    timeoutRef.current = setTimeout(() => {
      // Mark that long-press was triggered
      isLongPressRef.current = true
      // Trigger the long-press callback
      onLongPress(event)
    }, threshold)
  }, [onLongPress, threshold, clear])

  /**
   * Handles the end of a press (mouseup/touchend)
   * 
   * Flow:
   * 1. Check if long-press was triggered
   * 2. Clear timeout and reset state
   * 3. If no long-press occurred and onClick is provided, trigger click
   */
  const onEnd = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    // Store whether this was a long-press before clearing state
    const wasLongPress = isLongPressRef.current
    
    // Clean up timeout and state
    clear()

    // If it wasn't a long-press and we have a click handler, trigger it
    if (!wasLongPress && onClick) {
      onClick(event)
    }
  }, [onClick, clear])

  /**
   * Handles movement during press (mousemove/touchmove)
   * 
   * Cancels long-press if user moves too far from starting position.
   * This prevents accidental long-press triggers during scrolling or dragging.
   * 
   * Movement threshold: 10px in any direction
   */
  const onMove = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    // Only check movement if cancellation is enabled and timeout is active
    if (!cancelOnMovement || !timeoutRef.current) return

    // Get current position
    const currentPosition = getEventPosition(event)
    
    // Calculate movement distance from start
    const deltaX = Math.abs(currentPosition.x - startPositionRef.current.x)
    const deltaY = Math.abs(currentPosition.y - startPositionRef.current.y)
    
    // Cancel if moved more than 10px in any direction
    // This threshold balances sensitivity with usability
    if (deltaX > 10 || deltaY > 10) {
      clear()
    }
  }, [cancelOnMovement, clear])

  /**
   * Handles press cancellation (mouseleave/touchcancel)
   * 
   * Called when:
   * - Mouse leaves the element during press
   * - Touch is cancelled by the system
   * - Other interruptions occur
   */
  const onCancel = useCallback(() => {
    clear()
  }, [clear])

  /**
   * Return event handlers for all necessary DOM events
   * 
   * These handlers should be spread onto the target element:
   * <div {...longPressHandlers}>Content</div>
   * 
   * Supports both mouse and touch interfaces for cross-platform compatibility
   */
  return {
    // Mouse events
    onMouseDown: onStart,      // Start detection on mouse press
    onMouseUp: onEnd,          // End detection on mouse release
    onMouseMove: onMove,       // Track movement during press
    onMouseLeave: onCancel,    // Cancel if mouse leaves element
    
    // Touch events  
    onTouchStart: onStart,     // Start detection on touch
    onTouchEnd: onEnd,         // End detection on touch release
    onTouchMove: onMove,       // Track movement during touch
    onTouchCancel: onCancel,   // Cancel if touch is interrupted
  }
}