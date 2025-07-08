# Phase 7: Performance Optimization

## Overview
Optimize the application for sub-100ms latency, efficient bundle size, and smooth performance across all devices.

**⚡ IMPACT FROM PHASE 5**: Significant performance optimizations have already been implemented in Phase 5 Mobile Network Resilience, including network-aware timeout scaling, quality degradation for optimal performance, and comprehensive performance monitoring. This phase now focuses on advanced optimizations and UI performance.

## Prerequisites
- Phase 0-6 completed ✅
- App fully functional ✅
- Performance baselines established ✅
- Metrics tracking in place ✅
- Network-aware performance optimization active ✅
- Quality adaptation system operational ✅

## Goals
- ~~Achieve sub-100ms UI feedback~~ ✅ **COMPLETED in Phase 5** (network-aware performance optimization)
- Optimize bundle size and code splitting
- Implement advanced caching strategies
- ~~Add performance monitoring~~ ✅ **COMPLETED in Phase 5** (comprehensive performance logging)
- ~~Optimize real-time updates~~ ✅ **COMPLETED in Phase 5** (network-aware real-time optimization)
- ~~Reduce API latency~~ ✅ **COMPLETED in Phase 5** (adaptive timeouts and retry logic)
- Focus on UI rendering performance and animations
- Implement virtual scrolling for large message lists
- Advanced memory management and cleanup

## Implementation Steps

### 1. Create Performance Monitoring System

#### Performance Monitor (src/lib/performance/PerformanceMonitor.ts)
```typescript
export interface PerformanceMetric {
  name: string
  value: number
  unit: 'ms' | 'bytes' | 'count'
  timestamp: number
}

export interface PerformanceTarget {
  name: string
  target: number
  actual: number
  passed: boolean
}

export class PerformanceMonitor {
  private static metrics: Map<string, PerformanceMetric[]> = new Map()
  private static observers: Set<(metrics: PerformanceMetric[]) => void> = new Set()
  
  // Performance targets from PRD
  static readonly TARGETS = {
    appLoad: 2000,           // ms - First meaningful paint
    audioStart: 50,          // ms - Recording initiation
    transcription: 1000,     // ms - Whisper API
    translation: 500,        // ms - GPT API
    messageDelivery: 100,    // ms - To partner's device
    statusUpdate: 100,       // ms - Activity indicators
    totalE2E: 2000,         // ms - Voice to displayed translation
  }

  /**
   * Track a performance metric
   */
  static track(name: string, value: number, unit: 'ms' | 'bytes' | 'count' = 'ms'): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
    }
    
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    
    const metrics = this.metrics.get(name)!
    metrics.push(metric)
    
    // Keep only last 100 metrics per name
    if (metrics.length > 100) {
      metrics.shift()
    }
    
    // Check against targets
    if (name in this.TARGETS && unit === 'ms') {
      const target = this.TARGETS[name as keyof typeof this.TARGETS]
      if (value > target) {
        console.warn(`⚠️ Performance target missed: ${name} took ${value}ms (target: ${target}ms)`)
      }
    }
    
    // Notify observers
    this.notifyObservers()
  }

  /**
   * Start a timer
   */
  static startTimer(name: string): () => void {
    const start = performance.now()
    return () => {
      const duration = performance.now() - start
      this.track(name, Math.round(duration))
    }
  }

  /**
   * Get average for a metric
   */
  static getAverage(name: string): number {
    const metrics = this.metrics.get(name)
    if (!metrics || metrics.length === 0) return 0
    
    const sum = metrics.reduce((acc, m) => acc + m.value, 0)
    return Math.round(sum / metrics.length)
  }

  /**
   * Get performance report
   */
  static getReport(): PerformanceTarget[] {
    return Object.entries(this.TARGETS).map(([name, target]) => ({
      name,
      target,
      actual: this.getAverage(name),
      passed: this.getAverage(name) <= target,
    }))
  }

  /**
   * Subscribe to metrics updates
   */
  static subscribe(observer: (metrics: PerformanceMetric[]) => void): () => void {
    this.observers.add(observer)
    return () => this.observers.delete(observer)
  }

  /**
   * Notify observers
   */
  private static notifyObservers(): void {
    const allMetrics = Array.from(this.metrics.values()).flat()
    this.observers.forEach(observer => observer(allMetrics))
  }

  /**
   * Log performance report
   */
  static logReport(): void {
    console.group('📊 Performance Report')
    const report = this.getReport()
    
    report.forEach(({ name, target, actual, passed }) => {
      const icon = passed ? '✅' : '❌'
      const diff = actual - target
      const diffStr = diff > 0 ? `+${diff}ms` : `${diff}ms`
      console.log(`${icon} ${name}: ${actual}ms / ${target}ms (${diffStr})`)
    })
    
    console.groupEnd()
  }
}
```

### 2. Implement Component Memoization

#### Memoized Message Bubble (src/features/messages/MessageBubble.tsx)
```typescript
import { memo } from 'react'

// Wrap existing MessageBubble with memo
export const MessageBubble = memo(function MessageBubble({ message }: MessageBubbleProps) {
  // ... existing implementation
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.status === nextProps.message.status &&
    prevProps.message.translation === nextProps.message.translation
  )
})
```

### 3. Add Virtual Scrolling for Messages

#### Virtual Message List (src/features/messages/VirtualMessageList.tsx)
```typescript
import { useEffect, useRef, useState, useCallback } from 'react'
import { MessageBubble } from './MessageBubble'
import type { QueuedMessage } from './MessageQueue'

interface VirtualMessageListProps {
  messages: QueuedMessage[]
  height: number
}

const ITEM_HEIGHT_ESTIMATE = 80 // Average message height
const OVERSCAN = 5 // Render extra items outside viewport

export function VirtualMessageList({ messages, height }: VirtualMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true)

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT_ESTIMATE) - OVERSCAN)
  const endIndex = Math.min(
    messages.length,
    Math.ceil((scrollTop + height) / ITEM_HEIGHT_ESTIMATE) + OVERSCAN
  )

  const visibleMessages = messages.slice(startIndex, endIndex)
  const totalHeight = messages.length * ITEM_HEIGHT_ESTIMATE
  const offsetY = startIndex * ITEM_HEIGHT_ESTIMATE

  // Handle scroll
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    setScrollTop(scrollTop)
    
    // Check if scrolled to bottom
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
    setIsScrolledToBottom(isAtBottom)
  }, [])

  // Auto-scroll to bottom for new messages
  useEffect(() => {
    if (isScrolledToBottom && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length, isScrolledToBottom])

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto"
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
          <div className="p-4 space-y-4">
            {visibleMessages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

### 4. Optimize Bundle Size

#### Code Splitting Routes (src/App.tsx)
```typescript
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Spinner } from '@/components/ui/Spinner'

// Lazy load route components
const HomeScreen = lazy(() => import('@/features/home/HomeScreen'))
const SessionRoom = lazy(() => import('@/features/session/SessionRoom'))

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={
            <Layout>
              <HomeScreen />
            </Layout>
          } />
          <Route path="/session/:code" element={
            <SessionRoom />
          } />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
```

### 5. Implement API Response Caching

#### Cache Manager (src/lib/cache/CacheManager.ts)
```typescript
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

export class CacheManager {
  private static cache = new Map<string, CacheEntry<any>>()
  private static readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Get from cache
   */
  static get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) return null
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }

  /**
   * Set in cache
   */
  static set<T>(key: string, data: T, ttl = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  /**
   * Clear cache
   */
  static clear(pattern?: string): void {
    if (pattern) {
      Array.from(this.cache.keys())
        .filter(key => key.includes(pattern))
        .forEach(key => this.cache.delete(key))
    } else {
      this.cache.clear()
    }
  }

  /**
   * Wrap async function with cache
   */
  static async withCache<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Check cache first
    const cached = this.get<T>(key)
    if (cached) return cached
    
    // Fetch and cache
    const data = await fn()
    this.set(key, data, ttl)
    return data
  }
}
```

### 6. Optimize Real-time Updates

#### Batched Updates Hook (src/hooks/useBatchedUpdates.ts)
```typescript
import { useRef, useCallback, useEffect } from 'react'

export function useBatchedUpdates<T>(
  callback: (items: T[]) => void,
  delay = 16 // ~60fps
) {
  const timeoutRef = useRef<NodeJS.Timeout>()
  const batchRef = useRef<T[]>([])

  const flush = useCallback(() => {
    if (batchRef.current.length > 0) {
      callback(batchRef.current)
      batchRef.current = []
    }
  }, [callback])

  const add = useCallback((item: T) => {
    batchRef.current.push(item)
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    // Set new timeout
    timeoutRef.current = setTimeout(flush, delay)
  }, [flush, delay])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      flush()
    }
  }, [flush])

  return add
}
```

### 7. Optimize Audio Processing

#### Audio Processor Worker (src/workers/audioProcessor.worker.ts)
```typescript
// Web Worker for audio processing
self.addEventListener('message', async (event) => {
  const { type, data } = event.data
  
  switch (type) {
    case 'COMPRESS_AUDIO':
      const compressed = await compressAudio(data.buffer, data.sampleRate)
      self.postMessage({ type: 'AUDIO_COMPRESSED', data: compressed })
      break
      
    case 'ANALYZE_AUDIO':
      const analysis = analyzeAudio(data.buffer)
      self.postMessage({ type: 'AUDIO_ANALYZED', data: analysis })
      break
  }
})

async function compressAudio(buffer: ArrayBuffer, sampleRate: number): Promise<ArrayBuffer> {
  // Implement audio compression
  // This is a placeholder - implement actual compression
  return buffer
}

function analyzeAudio(buffer: ArrayBuffer): { peak: number; rms: number } {
  const data = new Float32Array(buffer)
  let peak = 0
  let sum = 0
  
  for (let i = 0; i < data.length; i++) {
    const sample = Math.abs(data[i])
    peak = Math.max(peak, sample)
    sum += sample * sample
  }
  
  const rms = Math.sqrt(sum / data.length)
  
  return { peak, rms }
}
```

### 8. Create Performance Dashboard

#### Performance Dashboard (src/features/performance/PerformanceDashboard.tsx)
```typescript
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { PerformanceMonitor, PerformanceTarget } from '@/lib/performance/PerformanceMonitor'
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { clsx } from 'clsx'

export function PerformanceDashboard() {
  const [report, setReport] = useState<PerformanceTarget[]>([])
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Only show in development
    if (import.meta.env.DEV) {
      setIsVisible(true)
    }

    const unsubscribe = PerformanceMonitor.subscribe(() => {
      setReport(PerformanceMonitor.getReport())
    })

    // Initial report
    setReport(PerformanceMonitor.getReport())

    return unsubscribe
  }, [])

  if (!isVisible) return null

  const passedCount = report.filter(r => r.passed).length
  const totalCount = report.length
  const overallHealth = (passedCount / totalCount) * 100

  return (
    <div className="fixed bottom-4 left-4 max-w-sm">
      <Card className="bg-black/90 text-white p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <h3 className="font-semibold">Performance</h3>
          </div>
          <div className={clsx(
            'text-sm font-medium',
            overallHealth >= 80 ? 'text-green-400' : 
            overallHealth >= 60 ? 'text-yellow-400' : 'text-red-400'
          )}>
            {Math.round(overallHealth)}% Health
          </div>
        </div>

        <div className="space-y-2">
          {report.map(({ name, target, actual, passed }) => (
            <div key={name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {passed ? (
                  <TrendingDown className="h-4 w-4 text-green-400" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-red-400" />
                )}
                <span className="text-gray-300">{name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={passed ? 'text-green-400' : 'text-red-400'}>
                  {actual}ms
                </span>
                <span className="text-gray-500">/ {target}ms</span>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => PerformanceMonitor.logReport()}
          className="mt-4 text-xs text-gray-400 hover:text-white"
        >
          Log detailed report
        </button>
      </Card>
    </div>
  )
}
```

### 9. Optimize Supabase Queries

#### Optimized Message Service (update existing)
```typescript
// Add query optimization to MessageService

/**
 * Get messages with pagination
 */
static async getSessionMessagesPaginated(
  sessionId: string,
  page = 1,
  pageSize = 50
): Promise<{ messages: Message[], hasMore: boolean }> {
  const from = (page - 1) * pageSize
  const to = from + pageSize
  
  const { data, error, count } = await supabase
    .from('messages')
    .select('*', { count: 'exact' })
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .range(from, to)
    
  if (error) throw error
  
  // Reverse for correct display order
  const messages = (data || []).reverse()
  const hasMore = (count || 0) > to
  
  return { messages, hasMore }
}

/**
 * Bulk update message status
 */
static async bulkUpdateStatus(
  messageIds: string[],
  status: MessageStatus
): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ 
      status,
      displayed_at: status === 'displayed' ? new Date().toISOString() : null
    })
    .in('id', messageIds)
    
  if (error) throw error
}
```

## Tests

### Test 1: Performance Monitoring
```typescript
// tests/lib/performance/PerformanceMonitor.test.ts
import { PerformanceMonitor } from '@/lib/performance/PerformanceMonitor'

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    PerformanceMonitor['metrics'].clear()
  })

  test('tracks metrics correctly', () => {
    PerformanceMonitor.track('test', 100)
    PerformanceMonitor.track('test', 200)
    
    expect(PerformanceMonitor.getAverage('test')).toBe(150)
  })

  test('timer measures duration', async () => {
    const stop = PerformanceMonitor.startTimer('operation')
    await new Promise(resolve => setTimeout(resolve, 50))
    stop()
    
    const avg = PerformanceMonitor.getAverage('operation')
    expect(avg).toBeGreaterThan(40)
    expect(avg).toBeLessThan(100)
  })

  test('checks against targets', () => {
    PerformanceMonitor.track('audioStart', 100) // Over target of 50
    const report = PerformanceMonitor.getReport()
    
    const audioStartReport = report.find(r => r.name === 'audioStart')
    expect(audioStartReport?.passed).toBe(false)
  })
})
```

### Test 2: Cache Manager
```typescript
// tests/lib/cache/CacheManager.test.ts
import { CacheManager } from '@/lib/cache/CacheManager'

describe('CacheManager', () => {
  beforeEach(() => {
    CacheManager.clear()
  })

  test('caches and retrieves data', () => {
    const data = { test: 'value' }
    CacheManager.set('key', data)
    
    expect(CacheManager.get('key')).toEqual(data)
  })

  test('respects TTL', async () => {
    CacheManager.set('key', 'value', 100) // 100ms TTL
    
    expect(CacheManager.get('key')).toBe('value')
    
    await new Promise(resolve => setTimeout(resolve, 150))
    
    expect(CacheManager.get('key')).toBeNull()
  })

  test('withCache prevents duplicate calls', async () => {
    let callCount = 0
    const fn = async () => {
      callCount++
      return 'result'
    }
    
    const result1 = await CacheManager.withCache('key', fn)
    const result2 = await CacheManager.withCache('key', fn)
    
    expect(result1).toBe('result')
    expect(result2).toBe('result')
    expect(callCount).toBe(1) // Called only once
  })
})
```

### Test 3: Virtual Scrolling
```typescript
// tests/features/messages/VirtualMessageList.test.ts
import { render } from '@testing-library/react'
import { VirtualMessageList } from '@/features/messages/VirtualMessageList'

describe('VirtualMessageList', () => {
  test('renders only visible messages', () => {
    const messages = Array.from({ length: 1000 }, (_, i) => ({
      id: `${i}`,
      localId: `local-${i}`,
      // ... other required fields
    }))
    
    const { container } = render(
      <VirtualMessageList messages={messages} height={600} />
    )
    
    // Should render only a subset of messages
    const renderedMessages = container.querySelectorAll('[data-message-id]')
    expect(renderedMessages.length).toBeLessThan(50) // Much less than 1000
  })
})
```

### Performance Test Script (scripts/performance-test.js)
```javascript
// Run performance tests
async function runPerformanceTests() {
  console.log('🚀 Running performance tests...\n')
  
  // Test 1: Bundle size
  const stats = await import('../dist/stats.json')
  const mainBundle = stats.assets.find(a => a.name.includes('index'))
  console.log(`📦 Main bundle size: ${(mainBundle.size / 1024).toFixed(2)}kb`)
  
  // Test 2: Load time
  const start = performance.now()
  await fetch('http://localhost:5173')
  const loadTime = performance.now() - start
  console.log(`⏱️  Page load time: ${loadTime.toFixed(2)}ms`)
  
  // Test 3: API response times
  // ... Add more tests
}

runPerformanceTests()
```

### Manual Test Checklist
- [ ] App loads under 2 seconds
- [ ] Recording starts under 50ms
- [ ] Messages deliver under 100ms
- [ ] Smooth scrolling with 1000+ messages
- [ ] No UI jank during updates
- [ ] Memory usage stable over time
- [ ] Bundle size under target
- [ ] API responses cached properly
- [ ] Performance dashboard accurate
- [ ] Network requests optimized

## Refactoring Checklist
- [ ] Remove unused dependencies
- [ ] Tree-shake imports properly
- [ ] Optimize image assets
- [ ] Implement service worker
- [ ] Add request deduplication
- [ ] Use IndexedDB for offline
- [ ] Implement request queuing

## Success Criteria
- [ ] All performance targets met
- [ ] Bundle size < 200kb gzipped
- [ ] First paint < 1 second
- [ ] 60fps scrolling maintained
- [ ] Memory leaks eliminated
- [ ] API calls minimized
- [ ] Cache hit rate > 50%
- [ ] Lighthouse score > 90

## Common Issues & Solutions

### Issue: Bundle size too large
**Solution**: Analyze with bundle analyzer, remove unused code

### Issue: Slow initial load
**Solution**: Implement progressive loading, optimize critical path

### Issue: Memory leaks
**Solution**: Profile with DevTools, fix subscription cleanup

### Issue: Janky animations
**Solution**: Use CSS transforms, avoid layout thrashing

## Performance Considerations
- Use production builds for testing
- Enable gzip/brotli compression
- Implement HTTP/2 push
- Use CDN for static assets
- Optimize database indexes
- Monitor real user metrics

## Security Notes
- Don't cache sensitive data
- Validate cached responses
- Set appropriate cache headers
- Monitor for cache poisoning
- Rate limit API calls

## CRITICAL: Comprehensive Testing Before Deployment

### Automated Test Suite
Before marking Phase 7 complete, create and run a comprehensive test suite that validates ALL performance optimizations:

#### 1. Performance Tests (src/tests/performance/phase7/)
```bash
# Create performance-specific tests
npm run test:performance -- --grep "Phase 7"
```

**Required Performance Tests:**
- `component-optimization.test.ts` - React.memo, useMemo, useCallback effectiveness
- `bundle-analysis.test.ts` - Bundle size, code splitting, tree shaking
- `memory-profiling.test.ts` - Memory usage, leak detection, garbage collection
- `api-optimization.test.ts` - Caching strategies, request batching, response times
- `rendering-performance.test.ts` - Frame rates, paint times, layout thrashing
- `web-workers.test.ts` - Audio processing performance, thread utilization

#### 2. Load Tests (src/tests/load/phase7/)
```bash
# Test application under load
npm run test:load
```

**Required Load Tests:**
- `concurrent-users.test.ts` - Multiple users, message throughput
- `high-frequency-messages.test.ts` - Rapid message sending/receiving
- `long-session-stability.test.ts` - Memory stability over time
- `audio-processing-load.test.ts` - Multiple simultaneous audio operations
- `database-performance.test.ts` - Query optimization, connection pooling

#### 3. Lighthouse Audit Tests
```bash
# Automated performance auditing
npm run test:lighthouse
```

**Required Audits:**
- Performance score > 90
- Accessibility score > 95
- Best practices score > 90
- SEO score > 80 (where applicable)
- Progressive Web App checklist

#### 4. Bundle Analysis Tests
```bash
# Bundle size and optimization validation
npm run analyze:bundle
```

**Required Validations:**
- Total bundle size < 200KB gzipped
- No duplicate dependencies
- Tree shaking working correctly
- Code splitting effective
- Lazy loading implemented

#### 5. Manual Performance Testing Checklist
**MUST TEST LOCALLY BEFORE TELLING USER TO TEST:**

**Initial Load Performance:**
- [ ] First contentful paint < 1.5s
- [ ] Time to interactive < 3s
- [ ] Total blocking time < 300ms
- [ ] Largest contentful paint < 2.5s
- [ ] Cumulative layout shift < 0.1

**Runtime Performance:**
- [ ] Message display latency < 100ms
- [ ] Audio recording starts < 50ms
- [ ] Translation processing feedback immediate
- [ ] Scrolling maintains 60fps
- [ ] UI interactions responsive (< 16ms frame time)

**Memory Performance:**
- [ ] No memory leaks during normal use
- [ ] Memory usage stable over 1+ hour session
- [ ] Garbage collection happens appropriately
- [ ] Web Workers don't leak memory
- [ ] Message history cleanup working

**Network Performance:**
- [ ] API responses cached appropriately
- [ ] Duplicate requests deduplicated
- [ ] Request batching working
- [ ] Offline mode handles gracefully
- [ ] Network timeout recovery fast

**Component Performance:**
- [ ] Message list renders efficiently with 100+ messages
- [ ] Virtual scrolling (if implemented) smooth
- [ ] Component re-renders minimized
- [ ] State updates batched properly
- [ ] Event handlers optimized

**Audio Performance:**
- [ ] Audio processing doesn't block UI
- [ ] Web Workers handle audio efficiently
- [ ] No audio dropouts or glitches
- [ ] Recording buffer management optimal
- [ ] Format conversion fast

**Bundle Performance:**
- [ ] Initial bundle loads quickly
- [ ] Code splitting working (routes load separately)
- [ ] Tree shaking removes unused code
- [ ] Dependencies optimized
- [ ] Source maps available for debugging

### Test Execution Requirements

#### Before Deployment:
1. **Run All Performance Tests:** Every test MUST pass
```bash
npm run test:performance      # Performance tests
npm run test:load            # Load testing
npm run test:lighthouse      # Lighthouse audits
npm run analyze:bundle       # Bundle analysis
npm test                     # Unit tests (regression check)
npm run lint                 # Code quality
npm run type-check          # TypeScript validation
```

2. **Manual Performance Verification:** Complete ALL checklist items above

3. **Performance Benchmarks:** ALL must be met
   - Sub-100ms latency for user interactions
   - Bundle size < 200KB gzipped
   - Lighthouse performance > 90
   - Memory stable over time
   - 60fps maintained during interactions

4. **Load Testing:** Application must handle
   - 10+ concurrent users per session
   - 100+ messages in conversation
   - 2+ hour session duration
   - Rapid message sending (1 per second)

### Test Implementation Template

```typescript
// src/tests/phase7/complete-validation.test.ts
describe('Phase 7 Performance Validation', () => {
  describe('Component Optimization', () => {
    test('message list renders efficiently with 100+ messages', async () => {
      // Render large message list
      // Measure render time
      // Verify < 100ms
    })
    
    test('React.memo prevents unnecessary re-renders', async () => {
      // Track render counts
      // Update props
      // Verify memoization working
    })
  })

  describe('Memory Performance', () => {
    test('no memory leaks during normal operation', async () => {
      // Perform typical user actions
      // Monitor memory usage
      // Verify stable memory
    })
    
    test('web workers clean up properly', async () => {
      // Start audio processing
      // Terminate workers
      // Verify cleanup
    })
  })

  describe('Bundle Optimization', () => {
    test('bundle size under 200KB gzipped', async () => {
      // Build production bundle
      // Measure gzipped size
      // Verify threshold
    })
    
    test('code splitting working', async () => {
      // Check route-based chunks
      // Verify lazy loading
      // Test dynamic imports
    })
  })

  describe('API Performance', () => {
    test('caching reduces duplicate requests', async () => {
      // Make identical API calls
      // Verify cache hits
      // Check response times
    })
  })
})
```

### Deployment Readiness Criteria

**ALL of the following MUST be true before deployment:**

✅ **All performance tests pass (100% success rate)**
✅ **Manual performance checklist completed**  
✅ **Lighthouse score > 90 for performance**
✅ **Bundle size < 200KB gzipped**
✅ **Sub-100ms latency achieved**
✅ **Memory usage stable over time**
✅ **60fps maintained during interactions**
✅ **Load testing successful (10+ users)**
✅ **Code quality checks pass (lint + type-check)**
✅ **No performance regressions from previous phases**

### Performance Test Failure Protocol

**If ANY performance test fails:**
1. **STOP deployment immediately**
2. **Profile and identify bottlenecks**
3. **Implement performance fixes**
4. **Re-run complete performance test suite**
5. **Only proceed when ALL benchmarks met**

**Remember:** Performance is critical for user experience. Never compromise on the sub-100ms latency requirement.

### Critical Performance Test Scenarios

#### Scenario 1: Heavy Load Simulation
- 10 concurrent users in session
- Rapid message sending (1 per second)
- Monitor for 30+ minutes
- Verify performance remains stable

#### Scenario 2: Long-Running Session
- Single session active for 2+ hours
- Send 500+ messages
- Monitor memory usage continuously
- Verify no degradation over time

#### Scenario 3: Audio Processing Stress
- Multiple simultaneous audio recordings
- Different audio formats
- Large audio files (near 25MB limit)
- Verify UI remains responsive

#### Scenario 4: Mobile Performance
- Test on actual mobile devices
- Verify touch responsiveness
- Check battery usage impact
- Test with limited CPU/memory

### Performance Monitoring Integration

#### Real-time Performance Tracking
```typescript
// Performance monitoring for production
const performanceMonitor = {
  trackUserInteraction: (action: string, duration: number) => {
    if (duration > 100) {
      console.warn(`Slow interaction: ${action} took ${duration}ms`)
    }
  },
  
  trackMemoryUsage: () => {
    if (performance.memory) {
      const { usedJSHeapSize, totalJSHeapSize } = performance.memory
      const usage = (usedJSHeapSize / totalJSHeapSize) * 100
      if (usage > 80) {
        console.warn(`High memory usage: ${usage.toFixed(1)}%`)
      }
    }
  }
}
```

## Next Steps
- Phase 8: Error handling and edge cases
- Implement comprehensive error recovery
- Handle all failure modes
- Add user-friendly error messages