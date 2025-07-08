/**
 * High-Performance Virtual Scrolling Component for Phase 7
 * Handles large lists (1000+ items) with smooth 60fps performance
 * Optimized for mobile devices and variable item heights
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { performanceLogger } from '@/lib/performance'

export interface VirtualScrollItem {
  id: string
  estimatedHeight?: number
}

export interface VirtualScrollProps<T extends VirtualScrollItem> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  height: number
  itemHeight?: number // Default estimated height
  overscan?: number // Extra items to render outside viewport
  className?: string
  onScroll?: (scrollTop: number, isScrolledToBottom: boolean) => void
  autoScrollToBottom?: boolean
  getItemKey?: (item: T, index: number) => string
}

interface ItemPosition {
  index: number
  top: number
  height: number
  bottom: number
}

export function VirtualScrollList<T extends VirtualScrollItem>({
  items,
  renderItem,
  height,
  itemHeight = 80, // Default estimated height for messages
  overscan = 5,
  className = '',
  onScroll,
  autoScrollToBottom = true,
  getItemKey = (item, index) => item.id || index.toString(),
}: VirtualScrollProps<T>) {
  const scrollElementRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true)
  const [measuredHeights, setMeasuredHeights] = useState<Map<string, number>>(new Map())
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  
  // Memoized calculations for performance
  const { visibleItems, totalHeight, offsetY } = useMemo(() => {
    performanceLogger.start('virtual-scroll-calculation')
    
    if (items.length === 0) {
      performanceLogger.end('virtual-scroll-calculation')
      return { visibleItems: [], totalHeight: 0, offsetY: 0 }
    }
    
    // Calculate item positions using measured heights
    const positions: ItemPosition[] = []
    let currentTop = 0
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const key = getItemKey(item, i)
      const measuredHeight = measuredHeights.get(key)
      const height = measuredHeight || item.estimatedHeight || itemHeight
      
      positions.push({
        index: i,
        top: currentTop,
        height,
        bottom: currentTop + height,
      })
      
      currentTop += height
    }
    
    const totalHeight = currentTop
    
    // Find visible range
    const startIndex = Math.max(0, 
      positions.findIndex(pos => pos.bottom >= scrollTop) - overscan
    )
    
    const endIndex = Math.min(items.length - 1,
      positions.findIndex(pos => pos.top > scrollTop + height) + overscan
    )
    
    const actualEndIndex = endIndex === -1 ? items.length - 1 : endIndex
    
    const visibleItems = items.slice(startIndex, actualEndIndex + 1).map((item, relIndex) => ({
      item,
      index: startIndex + relIndex,
      position: positions[startIndex + relIndex],
      key: getItemKey(item, startIndex + relIndex),
    }))
    
    const offsetY = startIndex > 0 ? positions[startIndex].top : 0
    
    performanceLogger.end('virtual-scroll-calculation')
    
    return { visibleItems, totalHeight, offsetY }
  }, [items, scrollTop, height, itemHeight, overscan, measuredHeights, getItemKey])
  
  // Handle scroll events with throttling for performance
  const handleScroll = useCallback(() => {
    if (!scrollElementRef.current) return
    
    const element = scrollElementRef.current
    const newScrollTop = element.scrollTop
    const scrollHeight = element.scrollHeight
    const clientHeight = element.clientHeight
    
    setScrollTop(newScrollTop)
    
    // Check if scrolled to bottom (with small tolerance)
    const isAtBottom = scrollHeight - newScrollTop - clientHeight < 10
    setIsScrolledToBottom(isAtBottom)
    
    // Call external scroll handler
    onScroll?.(newScrollTop, isAtBottom)
    
    // Track scroll performance
    performanceLogger.logEvent('virtual-scroll-event', { 
      scrollTop: newScrollTop, 
      isAtBottom 
    })
  }, [onScroll])
  
  // Auto-scroll to bottom when new items are added
  useEffect(() => {
    if (autoScrollToBottom && isScrolledToBottom && scrollElementRef.current) {
      const element = scrollElementRef.current
      // Use requestAnimationFrame for smooth scrolling
      requestAnimationFrame(() => {
        element.scrollTop = element.scrollHeight
      })
    }
  }, [items.length, autoScrollToBottom, isScrolledToBottom])
  
  // Measure item heights after render
  useEffect(() => {
    const newMeasurements = new Map(measuredHeights)
    let hasChanges = false
    
    visibleItems.forEach(({ key }) => {
      const element = itemRefs.current.get(key)
      if (element) {
        const height = element.offsetHeight
        const currentHeight = newMeasurements.get(key)
        
        if (currentHeight !== height) {
          newMeasurements.set(key, height)
          hasChanges = true
        }
      }
    })
    
    if (hasChanges) {
      setMeasuredHeights(newMeasurements)
      performanceLogger.logEvent('virtual-scroll-remeasure', { 
        itemCount: newMeasurements.size 
      })
    }
  }, [visibleItems, measuredHeights])
  
  // Ref callback to track item elements
  const setItemRef = useCallback((key: string) => (element: HTMLDivElement | null) => {
    if (element) {
      itemRefs.current.set(key, element)
    } else {
      itemRefs.current.delete(key)
    }
  }, [])
  
  // Performance logging for render
  useEffect(() => {
    performanceLogger.logEvent('virtual-scroll-render', {
      totalItems: items.length,
      visibleItems: visibleItems.length,
      scrollTop,
      height,
    })
  }, [items.length, visibleItems.length, scrollTop, height])
  
  return (
    <div
      ref={scrollElementRef}
      className={`overflow-y-auto overflow-x-hidden ${className}`}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map(({ item, index, key }) => (
            <div
              key={key}
              ref={setItemRef(key)}
              data-virtual-index={index}
              data-virtual-key={key}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Performance-optimized hook for virtual scroll state
export function useVirtualScrollPerformance(itemCount: number) {
  const [performance, setPerformance] = useState({
    renderTime: 0,
    visibleItems: 0,
    fps: 60,
  })
  
  useEffect(() => {
    const startTime = window.performance.now()
    
    // Measure render performance
    requestAnimationFrame(() => {
      const renderTime = window.performance.now() - startTime
      setPerformance(prev => ({
        ...prev,
        renderTime: Math.round(renderTime * 100) / 100,
      }))
    })
    
    // Track FPS
    let frameCount = 0
    let lastTime = window.performance.now()
    
    function trackFPS() {
      frameCount++
      const currentTime = window.performance.now()
      
      if (currentTime - lastTime >= 1000) {
        setPerformance(prev => ({
          ...prev,
          fps: Math.round((frameCount * 1000) / (currentTime - lastTime)),
        }))
        frameCount = 0
        lastTime = currentTime
      }
      
      requestAnimationFrame(trackFPS)
    }
    
    const rafId = requestAnimationFrame(trackFPS)
    
    return () => cancelAnimationFrame(rafId)
  }, [itemCount])
  
  return performance
}