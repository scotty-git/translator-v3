/**
 * Advanced Memory Management System for Phase 7
 * Prevents memory leaks, manages cleanup, and optimizes memory usage
 * Integrates with existing Phase 3-6 systems for comprehensive memory control
 */

import { performanceLogger, PERF_OPS } from '@/lib/performance'

export interface MemoryStats {
  used: number // MB
  total: number // MB
  percentage: number
  limit: number // MB
  gc: {
    available: boolean
    lastRun?: number
    forced: boolean
  }
}

export interface MemoryAlert {
  type: 'warning' | 'critical'
  threshold: number
  currentUsage: number
  message: string
  timestamp: number
}

export interface CleanupTarget {
  id: string
  cleanup: () => void | Promise<void>
  priority: 'low' | 'medium' | 'high'
  description: string
  estimatedSize?: number // bytes
}

export class MemoryManager {
  private static instance: MemoryManager | null = null
  private cleanupTargets = new Map<string, CleanupTarget>()
  private memoryAlerts: MemoryAlert[] = []
  private monitoringInterval: NodeJS.Timeout | null = null
  private isMonitoring = false
  
  // Memory thresholds
  private readonly WARNING_THRESHOLD = 70 // % of total memory
  private readonly CRITICAL_THRESHOLD = 85 // % of total memory
  private readonly MAX_MEMORY_LIMIT = 100 // MB - arbitrary limit for aggressive cleanup
  
  private constructor() {
    this.startMonitoring()
    this.setupUnloadCleanup()
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): MemoryManager {
    if (!this.instance) {
      this.instance = new MemoryManager()
    }
    return this.instance
  }
  
  /**
   * Start memory monitoring
   */
  private startMonitoring(): void {
    if (this.isMonitoring || typeof window === 'undefined') return
    
    this.isMonitoring = true
    
    // Monitor every 10 seconds
    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage()
    }, 10000)
    
    console.log('🧠 [Memory Manager] Started memory monitoring')
    performanceLogger.logEvent('memory-manager-start', { monitoring: true })
  }
  
  /**
   * Stop memory monitoring
   */
  private stopMonitoring(): void {
    if (!this.isMonitoring) return
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    
    this.isMonitoring = false
    console.log('🧠 [Memory Manager] Stopped memory monitoring')
  }
  
  /**
   * Setup cleanup on page unload
   */
  private setupUnloadCleanup(): void {
    if (typeof window === 'undefined') return
    
    const cleanup = () => {
      console.log('🧹 [Memory Manager] Page unload - cleaning up all targets')
      this.cleanupAll()
    }
    
    window.addEventListener('beforeunload', cleanup)
    window.addEventListener('unload', cleanup)
    
    // Cleanup on visibility change (when tab becomes hidden)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.performAggressiveCleanup()
      }
    })
  }
  
  /**
   * Get current memory statistics
   */
  getMemoryStats(): MemoryStats {
    const defaultStats: MemoryStats = {
      used: 0,
      total: 0,
      percentage: 0,
      limit: this.MAX_MEMORY_LIMIT,
      gc: {
        available: false,
        forced: false
      }
    }
    
    if (typeof window === 'undefined' || !('memory' in performance)) {
      return defaultStats
    }
    
    try {
      const memory = (performance as any).memory
      const used = Math.round(memory.usedJSHeapSize / 1024 / 1024) // MB
      const total = Math.round(memory.totalJSHeapSize / 1024 / 1024) // MB
      const percentage = total > 0 ? Math.round((used / total) * 100) : 0
      
      return {
        used,
        total,
        percentage,
        limit: this.MAX_MEMORY_LIMIT,
        gc: {
          available: 'gc' in window && typeof (window as any).gc === 'function',
          lastRun: undefined, // Would track if we implemented GC
          forced: false
        }
      }
    } catch (error) {
      console.warn('Failed to get memory stats:', error)
      return defaultStats
    }
  }
  
  /**
   * Check memory usage and trigger alerts/cleanup
   */
  private checkMemoryUsage(): void {
    const stats = this.getMemoryStats()
    
    performanceLogger.logEvent(PERF_OPS.MEMORY_CHECK, {
      used: stats.used,
      total: stats.total,
      percentage: stats.percentage
    })
    
    // Check thresholds
    if (stats.percentage >= this.CRITICAL_THRESHOLD) {
      this.handleCriticalMemory(stats)
    } else if (stats.percentage >= this.WARNING_THRESHOLD) {
      this.handleWarningMemory(stats)
    }
    
    // Clean up old alerts (keep only last 10)
    if (this.memoryAlerts.length > 10) {
      this.memoryAlerts = this.memoryAlerts.slice(-10)
    }
    
    // Log memory status in development
    if (import.meta.env.DEV && stats.percentage > 50) {
      console.log(`🧠 [Memory Manager] Usage: ${stats.used}MB/${stats.total}MB (${stats.percentage}%)`)
    }
  }
  
  /**
   * Handle warning-level memory usage
   */
  private handleWarningMemory(stats: MemoryStats): void {
    const alert: MemoryAlert = {
      type: 'warning',
      threshold: this.WARNING_THRESHOLD,
      currentUsage: stats.percentage,
      message: `Memory usage at ${stats.percentage}% (${stats.used}MB)`,
      timestamp: Date.now()
    }
    
    this.memoryAlerts.push(alert)
    console.warn(`⚠️ [Memory Manager] ${alert.message}`)
    
    // Perform light cleanup
    this.performLightCleanup()
  }
  
  /**
   * Handle critical memory usage
   */
  private handleCriticalMemory(stats: MemoryStats): void {
    const alert: MemoryAlert = {
      type: 'critical',
      threshold: this.CRITICAL_THRESHOLD,
      currentUsage: stats.percentage,
      message: `CRITICAL: Memory usage at ${stats.percentage}% (${stats.used}MB)`,
      timestamp: Date.now()
    }
    
    this.memoryAlerts.push(alert)
    console.error(`🚨 [Memory Manager] ${alert.message}`)
    
    // Perform aggressive cleanup immediately
    this.performAggressiveCleanup()
    
    // Force garbage collection if available
    this.forceGarbageCollection()
  }
  
  /**
   * Register a cleanup target
   */
  registerCleanup(target: CleanupTarget): void {
    this.cleanupTargets.set(target.id, target)
    
    console.log(`📝 [Memory Manager] Registered cleanup: ${target.id} (${target.priority} priority)`)
    performanceLogger.logEvent('memory-cleanup-register', { 
      id: target.id, 
      priority: target.priority,
      estimatedSize: target.estimatedSize 
    })
  }
  
  /**
   * Unregister a cleanup target
   */
  unregisterCleanup(id: string): void {
    const removed = this.cleanupTargets.delete(id)
    if (removed) {
      console.log(`🗑️ [Memory Manager] Unregistered cleanup: ${id}`)
      performanceLogger.logEvent('memory-cleanup-unregister', { id })
    }
  }
  
  /**
   * Perform light cleanup (low and medium priority items)
   */
  private async performLightCleanup(): Promise<void> {
    performanceLogger.start('memory-light-cleanup')
    
    console.log('🧹 [Memory Manager] Performing light cleanup...')
    
    let cleanedCount = 0
    const targets = Array.from(this.cleanupTargets.entries())
      .filter(([, target]) => target.priority === 'low' || target.priority === 'medium')
      .sort(([, a], [, b]) => {
        // Sort by priority (low first) and estimated size (larger first)
        if (a.priority !== b.priority) {
          return a.priority === 'low' ? -1 : 1
        }
        return (b.estimatedSize || 0) - (a.estimatedSize || 0)
      })
    
    for (const [id, target] of targets.slice(0, 5)) { // Limit to 5 items for light cleanup
      try {
        await target.cleanup()
        this.cleanupTargets.delete(id)
        cleanedCount++
        console.log(`✅ [Memory Manager] Cleaned up: ${target.description}`)
      } catch (error) {
        console.error(`❌ [Memory Manager] Cleanup failed for ${id}:`, error)
      }
    }
    
    performanceLogger.end('memory-light-cleanup')
    console.log(`🧹 [Memory Manager] Light cleanup complete: ${cleanedCount} items`)
  }
  
  /**
   * Perform aggressive cleanup (all priority levels)
   */
  private async performAggressiveCleanup(): Promise<void> {
    performanceLogger.start('memory-aggressive-cleanup')
    
    console.log('🧹 [Memory Manager] Performing aggressive cleanup...')
    
    let cleanedCount = 0
    const targets = Array.from(this.cleanupTargets.entries())
      .sort(([, a], [, b]) => {
        // Sort by priority (high first) and estimated size (larger first)
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        const aPriority = priorityOrder[a.priority]
        const bPriority = priorityOrder[b.priority]
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority
        }
        return (b.estimatedSize || 0) - (a.estimatedSize || 0)
      })
    
    for (const [id, target] of targets) {
      try {
        await target.cleanup()
        this.cleanupTargets.delete(id)
        cleanedCount++
        console.log(`✅ [Memory Manager] Cleaned up: ${target.description}`)
      } catch (error) {
        console.error(`❌ [Memory Manager] Cleanup failed for ${id}:`, error)
      }
    }
    
    performanceLogger.end('memory-aggressive-cleanup')
    console.log(`🧹 [Memory Manager] Aggressive cleanup complete: ${cleanedCount} items`)
    
    performanceLogger.logEvent('memory-aggressive-cleanup', { cleanedCount })
  }
  
  /**
   * Clean up all registered targets
   */
  async cleanupAll(): Promise<void> {
    performanceLogger.start('memory-cleanup-all')
    
    console.log('🧹 [Memory Manager] Cleaning up all targets...')
    
    const promises = Array.from(this.cleanupTargets.entries()).map(async ([id, target]) => {
      try {
        await target.cleanup()
        console.log(`✅ [Memory Manager] Cleaned up: ${target.description}`)
      } catch (error) {
        console.error(`❌ [Memory Manager] Cleanup failed for ${id}:`, error)
      }
    })
    
    await Promise.all(promises)
    this.cleanupTargets.clear()
    
    performanceLogger.end('memory-cleanup-all')
    console.log('🧹 [Memory Manager] All cleanup complete')
  }
  
  /**
   * Force garbage collection if available
   */
  private forceGarbageCollection(): boolean {
    if (typeof window !== 'undefined' && 'gc' in window && typeof (window as any).gc === 'function') {
      try {
        (window as any).gc()
        console.log('🗑️ [Memory Manager] Forced garbage collection')
        performanceLogger.logEvent('memory-forced-gc', { success: true })
        return true
      } catch (error) {
        console.error('Failed to force garbage collection:', error)
        performanceLogger.logEvent('memory-forced-gc', { success: false, error: String(error) })
      }
    }
    return false
  }
  
  /**
   * Get memory alerts
   */
  getAlerts(): MemoryAlert[] {
    return [...this.memoryAlerts]
  }
  
  /**
   * Clear memory alerts
   */
  clearAlerts(): void {
    this.memoryAlerts = []
    console.log('🧹 [Memory Manager] Cleared memory alerts')
  }
  
  /**
   * Get cleanup target status
   */
  getCleanupStatus() {
    const targets = Array.from(this.cleanupTargets.values())
    const byPriority = {
      high: targets.filter(t => t.priority === 'high').length,
      medium: targets.filter(t => t.priority === 'medium').length,
      low: targets.filter(t => t.priority === 'low').length,
    }
    
    const estimatedSize = targets.reduce((sum, t) => sum + (t.estimatedSize || 0), 0)
    
    return {
      total: targets.length,
      byPriority,
      estimatedSize: Math.round(estimatedSize / 1024), // KB
    }
  }
  
  /**
   * Manual cleanup trigger
   */
  async triggerCleanup(aggressive = false): Promise<void> {
    console.log(`🧹 [Memory Manager] Manual cleanup triggered (aggressive: ${aggressive})`)
    
    if (aggressive) {
      await this.performAggressiveCleanup()
    } else {
      await this.performLightCleanup()
    }
    
    performanceLogger.logEvent('memory-manual-cleanup', { aggressive })
  }
  
  /**
   * Get comprehensive memory report
   */
  getReport() {
    const stats = this.getMemoryStats()
    const alerts = this.getAlerts()
    const cleanupStatus = this.getCleanupStatus()
    
    return {
      stats,
      alerts: alerts.slice(-5), // Last 5 alerts
      cleanup: cleanupStatus,
      monitoring: this.isMonitoring,
    }
  }
  
  /**
   * Log comprehensive memory report
   */
  logReport(): void {
    console.group('🧠 [Memory Manager] Memory Report')
    
    const stats = this.getMemoryStats()
    console.log(`Memory Usage: ${stats.used}MB / ${stats.total}MB (${stats.percentage}%)`)
    console.log(`GC Available: ${stats.gc.available}`)
    
    const cleanupStatus = this.getCleanupStatus()
    console.log(`Cleanup Targets: ${cleanupStatus.total} (${cleanupStatus.estimatedSize}KB estimated)`)
    console.log(`By Priority: High=${cleanupStatus.byPriority.high}, Medium=${cleanupStatus.byPriority.medium}, Low=${cleanupStatus.byPriority.low}`)
    
    const recentAlerts = this.getAlerts().slice(-3)
    if (recentAlerts.length > 0) {
      console.group('Recent Alerts')
      recentAlerts.forEach(alert => {
        console.log(`${alert.type.toUpperCase()}: ${alert.message}`)
      })
      console.groupEnd()
    }
    
    console.groupEnd()
  }
  
  /**
   * Cleanup on destroy
   */
  destroy(): void {
    console.log('🧹 [Memory Manager] Destroying memory manager')
    
    this.stopMonitoring()
    this.cleanupAll()
    this.memoryAlerts = []
    
    if (MemoryManager.instance === this) {
      MemoryManager.instance = null
    }
  }
}

// Export singleton instance
export const memoryManager = MemoryManager.getInstance()

// Add memory management to existing performance operations
Object.assign(PERF_OPS, {
  MEMORY_CHECK: 'memory.check',
  MEMORY_CLEANUP: 'memory.cleanup',
  MEMORY_GC: 'memory.gc',
} as const)