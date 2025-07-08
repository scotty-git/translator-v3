/**
 * Enhanced Performance Monitor for Phase 7
 * Integrates with existing Phase 3 performance logger and adds Core Web Vitals tracking
 * Works alongside the comprehensive PerformanceDashboard for detailed monitoring
 */

import { useState, useEffect, useCallback } from 'react'
import { BarChart3, Activity, Zap } from 'lucide-react'
import { performanceLogger, PERF_OPS } from '@/lib/performance'
import { CacheManager } from '@/lib/cache/CacheManager'
import { clsx } from 'clsx'

interface PerformanceStats {
  // API Performance (from Phase 3 logger)
  avgWhisperTime: number
  avgTranslationTime: number
  avgTTSTime: number
  avgTotalTime: number
  messageCount: number
  
  // Core Web Vitals (Phase 7 enhancement)
  LCP?: number // Largest Contentful Paint
  FID?: number // First Input Delay
  CLS?: number // Cumulative Layout Shift
  
  // Cache Performance (Phase 7)
  cacheHitRate: number
  cacheSize: number
  
  // System Performance
  memoryUsage: number
}

export function PerformanceMonitor() {
  const [stats, setStats] = useState<PerformanceStats>({
    avgWhisperTime: 0,
    avgTranslationTime: 0,
    avgTTSTime: 0,
    avgTotalTime: 0,
    messageCount: 0,
    cacheHitRate: 0,
    cacheSize: 0,
    memoryUsage: 0,
  })
  const [isVisible, setIsVisible] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  // Collect comprehensive performance stats
  const collectStats = useCallback((): PerformanceStats => {
    // API Performance from Phase 3 performance logger
    const whisperAvg = performanceLogger.getAverageByOperation(PERF_OPS.API_WHISPER) || 0
    const translationAvg = performanceLogger.getAverageByOperation(PERF_OPS.API_TRANSLATION) || 0
    const ttsAvg = performanceLogger.getAverageByOperation(PERF_OPS.API_TTS) || 0
    const totalAvg = performanceLogger.getAverageByOperation(PERF_OPS.UI_MESSAGE_DISPLAY) || 0
    
    // Message count from performance metrics
    const metrics = performanceLogger.getMetrics()
    const messageMetrics = metrics.filter(m => m.operation === PERF_OPS.UI_MESSAGE_DISPLAY)
    
    // Core Web Vitals
    const webVitals = getCoreWebVitals()
    
    // Cache Performance from Phase 7
    const cacheStats = CacheManager.getStats()
    
    // Memory Usage
    const memoryInfo = getMemoryUsage()
    
    return {
      avgWhisperTime: Math.round(whisperAvg),
      avgTranslationTime: Math.round(translationAvg),
      avgTTSTime: Math.round(ttsAvg),
      avgTotalTime: Math.round(totalAvg),
      messageCount: messageMetrics.length,
      cacheHitRate: Math.round(cacheStats.hitRate),
      cacheSize: Math.round(cacheStats.totalSize / 1024 / 1024), // MB
      memoryUsage: memoryInfo,
      ...webVitals
    }
  }, [])

  // Update stats periodically
  useEffect(() => {
    if (import.meta.env.DEV) {
      setIsVisible(true)
    }

    if (!isVisible) return

    // Update stats immediately
    setStats(collectStats())

    // Set up periodic updates
    const interval = setInterval(() => {
      setStats(collectStats())
    }, 2000)

    return () => clearInterval(interval)
  }, [isVisible, collectStats])

  // Log performance data for debugging
  useEffect(() => {
    if (stats.messageCount > 0) {
      console.log('📊 [Performance Monitor] Stats updated:', {
        apiPerformance: {
          whisper: stats.avgWhisperTime,
          translation: stats.avgTranslationTime,
          tts: stats.avgTTSTime,
          total: stats.avgTotalTime
        },
        cachePerformance: {
          hitRate: stats.cacheHitRate,
          size: stats.cacheSize
        },
        coreWebVitals: {
          LCP: stats.LCP,
          FID: stats.FID,
          CLS: stats.CLS
        },
        messages: stats.messageCount
      })
    }
  }, [stats])

  if (!isVisible) return null

  // Minimized view
  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-20 right-4 bg-black/80 text-white p-2 rounded cursor-pointer z-50"
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          <span className="text-xs font-bold">Perf</span>
          <div className={clsx(
            'w-2 h-2 rounded-full',
            stats.avgTotalTime < 3000 ? 'bg-green-400' : 
            stats.avgTotalTime < 6000 ? 'bg-yellow-400' : 'bg-red-400'
          )} />
        </div>
      </div>
    )
  }

  // Health indicator
  const healthScore = calculateHealthScore(stats)

  return (
    <div className="fixed bottom-20 right-4 bg-black/90 text-white p-3 rounded-lg text-xs font-mono z-50 min-w-[200px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          <span className="font-bold">Performance</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={clsx(
            'text-xs px-1 rounded',
            healthScore >= 80 ? 'text-green-400 bg-green-400/20' : 
            healthScore >= 60 ? 'text-yellow-400 bg-yellow-400/20' : 'text-red-400 bg-red-400/20'
          )}>
            {healthScore}%
          </div>
          <button
            onClick={() => setIsMinimized(true)}
            className="text-gray-400 hover:text-white text-xs"
          >
            ─
          </button>
        </div>
      </div>
      
      {/* API Performance */}
      <div className="space-y-1 mb-2">
        <div className="text-gray-300 font-semibold">API Performance</div>
        <div className="flex justify-between">
          <span>Whisper:</span>
          <span className={getLatencyColor(stats.avgWhisperTime, 1000)}>
            {stats.avgWhisperTime}ms
          </span>
        </div>
        <div className="flex justify-between">
          <span>Translation:</span>
          <span className={getLatencyColor(stats.avgTranslationTime, 500)}>
            {stats.avgTranslationTime}ms
          </span>
        </div>
        <div className="flex justify-between">
          <span>TTS:</span>
          <span className={getLatencyColor(stats.avgTTSTime, 2000)}>
            {stats.avgTTSTime}ms
          </span>
        </div>
        <div className="flex justify-between border-t border-white/20 pt-1">
          <span className="font-semibold">Total:</span>
          <span className={getLatencyColor(stats.avgTotalTime, 3000)}>
            {stats.avgTotalTime}ms
          </span>
        </div>
      </div>

      {/* Core Web Vitals */}
      {(stats.LCP || stats.FID || stats.CLS) && (
        <div className="space-y-1 mb-2">
          <div className="text-gray-300 font-semibold flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Core Web Vitals
          </div>
          {stats.LCP && (
            <div className="flex justify-between">
              <span>LCP:</span>
              <span className={getLatencyColor(stats.LCP, 2500)}>
                {Math.round(stats.LCP)}ms
              </span>
            </div>
          )}
          {stats.FID && (
            <div className="flex justify-between">
              <span>FID:</span>
              <span className={getLatencyColor(stats.FID, 100)}>
                {Math.round(stats.FID)}ms
              </span>
            </div>
          )}
          {stats.CLS && (
            <div className="flex justify-between">
              <span>CLS:</span>
              <span className={stats.CLS > 0.1 ? 'text-red-400' : 'text-green-400'}>
                {stats.CLS.toFixed(3)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Cache & System */}
      <div className="space-y-1 mb-2">
        <div className="text-gray-300 font-semibold flex items-center gap-1">
          <Activity className="h-3 w-3" />
          System
        </div>
        <div className="flex justify-between">
          <span>Cache Hit:</span>
          <span className={stats.cacheHitRate >= 70 ? 'text-green-400' : 
                          stats.cacheHitRate >= 50 ? 'text-yellow-400' : 'text-red-400'}>
            {stats.cacheHitRate}%
          </span>
        </div>
        <div className="flex justify-between">
          <span>Cache Size:</span>
          <span className="text-gray-300">{stats.cacheSize}MB</span>
        </div>
        <div className="flex justify-between">
          <span>Memory:</span>
          <span className={stats.memoryUsage > 80 ? 'text-red-400' : 
                          stats.memoryUsage > 60 ? 'text-yellow-400' : 'text-green-400'}>
            {stats.memoryUsage}%
          </span>
        </div>
      </div>

      {/* Message Count */}
      <div className="pt-1 border-t border-white/20 flex justify-between">
        <span className="font-semibold">Messages:</span>
        <span className="text-blue-400">{stats.messageCount}</span>
      </div>
    </div>
  )
}

// Helper functions
function getCoreWebVitals() {
  const vitals: any = {}
  
  try {
    // LCP - Largest Contentful Paint
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint')
    if (lcpEntries.length > 0) {
      vitals.LCP = lcpEntries[lcpEntries.length - 1].startTime
    }
    
    // FID would be measured via event timing in real implementation
    // For now, we'll estimate based on input events
    
    // CLS would be measured via layout shift in real implementation
    
  } catch (error) {
    // Web Vitals not available in this environment
  }
  
  return vitals
}

function getMemoryUsage(): number {
  try {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      const used = memory.usedJSHeapSize
      const total = memory.totalJSHeapSize
      return Math.round((used / total) * 100)
    }
  } catch (error) {
    // Memory API not available
  }
  return 0
}

function getLatencyColor(value: number, threshold: number): string {
  if (value === 0) return 'text-gray-400'
  if (value <= threshold) return 'text-green-400'
  if (value <= threshold * 1.5) return 'text-yellow-400'
  return 'text-red-400'
}

function calculateHealthScore(stats: PerformanceStats): number {
  let score = 100
  
  // API performance penalties
  if (stats.avgWhisperTime > 1000) score -= 15
  if (stats.avgTranslationTime > 500) score -= 15
  if (stats.avgTTSTime > 2000) score -= 15
  if (stats.avgTotalTime > 3000) score -= 20
  
  // Cache performance
  if (stats.cacheHitRate < 50) score -= 10
  if (stats.cacheHitRate < 30) score -= 10
  
  // Memory usage
  if (stats.memoryUsage > 80) score -= 10
  if (stats.memoryUsage > 90) score -= 15
  
  // Core Web Vitals
  if (stats.LCP && stats.LCP > 2500) score -= 10
  if (stats.FID && stats.FID > 100) score -= 10
  if (stats.CLS && stats.CLS > 0.1) score -= 10
  
  return Math.max(0, Math.round(score))
}