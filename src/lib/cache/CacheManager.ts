/**
 * Smart API Response Caching System for Phase 7
 * Caches OpenAI API responses (translations, TTS) to improve performance
 * Integrates with existing Phase 3 performance logging
 */

import { performanceLogger, PERF_OPS } from '@/lib/performance'

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  hitCount: number
  size: number // Size in bytes for storage management
}

export interface CacheStats {
  hits: number
  misses: number
  hitRate: number // Percentage
  totalSize: number // Total cache size in bytes
  entryCount: number
}

export interface CacheConfig {
  ttl: number // Time to live in milliseconds
  maxSize: number // Max cache size in bytes
  maxEntries: number // Max number of entries
}

export class CacheManager {
  private static cache = new Map<string, CacheEntry<any>>()
  private static stats = { hits: 0, misses: 0 }
  
  // Cache configurations for different types
  private static readonly CONFIGS: Record<string, CacheConfig> = {
    translation: {
      ttl: 24 * 60 * 60 * 1000, // 24 hours - translations are stable
      maxSize: 10 * 1024 * 1024, // 10MB for translations
      maxEntries: 5000, // Max 5000 translation entries
    },
    tts: {
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days - audio is expensive to generate
      maxSize: 50 * 1024 * 1024, // 50MB for audio (larger files)
      maxEntries: 1000, // Max 1000 audio entries
    },
    transcription: {
      ttl: 60 * 60 * 1000, // 1 hour - less stable, might change with context
      maxSize: 5 * 1024 * 1024, // 5MB for transcriptions
      maxEntries: 2000, // Max 2000 transcription entries
    }
  }

  /**
   * Generate cache key for translations
   */
  static generateTranslationKey(
    text: string, 
    fromLang: string, 
    toLang: string, 
    mode: string,
    contextHash?: string
  ): string {
    const baseKey = `translation:${fromLang}:${toLang}:${mode}:${this.hashString(text)}`
    return contextHash ? `${baseKey}:${contextHash}` : baseKey
  }

  /**
   * Generate cache key for TTS
   */
  static generateTTSKey(
    text: string, 
    voice: string, 
    speed: number
  ): string {
    return `tts:${voice}:${speed}:${this.hashString(text)}`
  }

  /**
   * Generate cache key for transcription
   */
  static generateTranscriptionKey(
    audioHash: string,
    model: string = 'whisper-1'
  ): string {
    return `transcription:${model}:${audioHash}`
  }

  /**
   * Simple hash function for string content
   */
  private static hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(36)
  }

  /**
   * Get from cache
   */
  static get<T>(key: string): T | null {
    performanceLogger.start(PERF_OPS.CACHE_GET)
    
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.stats.misses++
      performanceLogger.end(PERF_OPS.CACHE_GET)
      console.log(`🔍 [Cache] MISS: ${key}`)
      return null
    }
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      this.stats.misses++
      performanceLogger.end(PERF_OPS.CACHE_GET)
      console.log(`⏰ [Cache] EXPIRED: ${key}`)
      return null
    }
    
    // Update hit count
    entry.hitCount++
    this.stats.hits++
    
    performanceLogger.end(PERF_OPS.CACHE_GET)
    console.log(`✅ [Cache] HIT: ${key} (${entry.hitCount} times)`)
    
    // Track cache performance in existing performance logger
    performanceLogger.logEvent(PERF_OPS.CACHE_HIT, { key, hitCount: entry.hitCount })
    
    return entry.data
  }

  /**
   * Set in cache with automatic cleanup
   */
  static set<T>(key: string, data: T, type: 'translation' | 'tts' | 'transcription' = 'translation'): void {
    performanceLogger.start(PERF_OPS.CACHE_SET)
    const config = this.CONFIGS[type]
    
    // Estimate size
    const size = this.estimateSize(data)
    
    // Check if we need cleanup before adding
    this.cleanupIfNeeded(type, size)
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: config.ttl,
      hitCount: 0,
      size,
    }
    
    this.cache.set(key, entry)
    performanceLogger.end(PERF_OPS.CACHE_SET)
    
    console.log(`💾 [Cache] SET: ${key} (${size} bytes, TTL: ${config.ttl}ms)`)
    
    // Track cache performance
    performanceLogger.logEvent(PERF_OPS.CACHE_SET, { key, size, type })
  }

  /**
   * Delete an entry from cache
   */
  static delete(key: string): boolean {
    const existed = this.cache.has(key)
    this.cache.delete(key)
    
    if (existed) {
      console.log(`🗑️ [Cache] DELETE: ${key}`)
    }
    
    return existed
  }

  /**
   * Check if a key exists in cache
   */
  static has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }

  /**
   * Estimate size of data in bytes
   */
  private static estimateSize(data: any): number {
    if (data instanceof ArrayBuffer) {
      return data.byteLength
    }
    
    if (typeof data === 'string') {
      return new Blob([data]).size
    }
    
    // For objects, estimate JSON size
    try {
      return new Blob([JSON.stringify(data)]).size
    } catch {
      return 1024 // Default 1KB estimate
    }
  }

  /**
   * Cleanup cache if needed
   */
  private static cleanupIfNeeded(type: string, newEntrySize: number): void {
    const config = this.CONFIGS[type]
    const typeEntries = Array.from(this.cache.entries())
      .filter(([key]) => key.startsWith(type))
    
    // Check entry count
    if (typeEntries.length >= config.maxEntries) {
      console.log(`🧹 [Cache] Cleaning up ${type} cache (${typeEntries.length} entries)`)
      this.cleanupByLRU(type, Math.floor(config.maxEntries * 0.1)) // Remove 10%
    }
    
    // Check total size
    const totalSize = typeEntries.reduce((sum, [, entry]) => sum + entry.size, 0)
    if (totalSize + newEntrySize > config.maxSize) {
      console.log(`🧹 [Cache] Cleaning up ${type} cache (${totalSize} bytes)`)
      this.cleanupByLRU(type, Math.floor(config.maxEntries * 0.2)) // Remove 20%
    }
  }

  /**
   * Cleanup using Least Recently Used strategy
   */
  private static cleanupByLRU(type: string, removeCount: number): void {
    const typeEntries = Array.from(this.cache.entries())
      .filter(([key]) => key.startsWith(type))
      .sort(([, a], [, b]) => {
        // Sort by last accessed (hitCount) and age
        const aScore = a.hitCount - (Date.now() - a.timestamp) / 1000000
        const bScore = b.hitCount - (Date.now() - b.timestamp) / 1000000
        return aScore - bScore
      })
    
    const toRemove = typeEntries.slice(0, removeCount)
    toRemove.forEach(([key]) => {
      this.cache.delete(key)
      console.log(`🗑️ [Cache] Removed LRU entry: ${key}`)
    })
  }

  /**
   * Wrap async function with cache
   */
  static async withCache<T>(
    key: string,
    fn: () => Promise<T>,
    type: 'translation' | 'tts' | 'transcription' = 'translation'
  ): Promise<T> {
    performanceLogger.start(`cache-wrap-${type}`)
    
    // Check cache first
    const cached = this.get<T>(key)
    if (cached !== null) {
      performanceLogger.end(`cache-wrap-${type}`)
      return cached
    }
    
    // Fetch and cache
    try {
      const data = await fn()
      this.set(key, data, type)
      performanceLogger.end(`cache-wrap-${type}`)
      return data
    } catch (error) {
      performanceLogger.end(`cache-wrap-${type}`)
      throw error
    }
  }

  /**
   * Get cache statistics
   */
  static getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses
    const hitRate = totalRequests > 0 ? Math.round((this.stats.hits / totalRequests) * 100) : 0
    
    const totalSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0)
    
    const entryCount = this.cache.size
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      totalSize,
      entryCount,
    }
  }

  /**
   * Get detailed cache stats by type
   */
  static getDetailedStats(): Record<string, CacheStats & { avgHitCount: number }> {
    const stats: Record<string, CacheStats & { avgHitCount: number }> = {}
    
    Object.keys(this.CONFIGS).forEach(type => {
      const typeEntries = Array.from(this.cache.entries())
        .filter(([key]) => key.startsWith(type))
        .map(([, entry]) => entry)
      
      const hits = typeEntries.reduce((sum, entry) => sum + entry.hitCount, 0)
      const totalSize = typeEntries.reduce((sum, entry) => sum + entry.size, 0)
      const avgHitCount = typeEntries.length > 0 ? hits / typeEntries.length : 0
      
      stats[type] = {
        hits,
        misses: 0, // Per-type misses not tracked separately
        hitRate: avgHitCount > 0 ? Math.round((hits / (hits + typeEntries.length)) * 100) : 0,
        totalSize,
        entryCount: typeEntries.length,
        avgHitCount: Math.round(avgHitCount * 100) / 100,
      }
    })
    
    return stats
  }

  /**
   * Clear cache by type or all
   */
  static clear(type?: string): void {
    if (type) {
      const toDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(type))
      toDelete.forEach(key => this.cache.delete(key))
      console.log(`🧹 [Cache] Cleared ${type} cache (${toDelete.length} entries)`)
    } else {
      this.cache.clear()
      this.stats = { hits: 0, misses: 0 }
      console.log('🧹 [Cache] Cleared all cache')
    }
    
    performanceLogger.logEvent('cache-clear', { type: type || 'all' })
  }

  /**
   * Prefetch common translations (for warming cache)
   */
  static async prefetchCommon(): Promise<void> {
    console.log('🔥 [Cache] Starting cache warm-up for common phrases...')
    
    // Common phrases that users might translate
    const commonPhrases = [
      'Hello, how are you?',
      'Thank you very much',
      'Good morning',
      'Good evening', 
      'How much does this cost?',
      'Where is the bathroom?',
      'I don\'t understand',
      'Can you help me?',
      'What time is it?',
      'Nice to meet you'
    ]
    
    // This would integrate with actual translation service
    // For now, just log the prefetch intention
    console.log(`🔥 [Cache] Would prefetch ${commonPhrases.length} common phrases`)
    
    performanceLogger.logEvent('cache-prefetch', { phraseCount: commonPhrases.length })
  }

  /**
   * Log comprehensive cache report to console
   */
  static logReport(): void {
    console.group('💾 [Cache Manager] Performance Report')
    
    const stats = this.getStats()
    console.log(`Hit Rate: ${stats.hitRate}% (${stats.hits}/${stats.hits + stats.misses})`)
    console.log(`Total Size: ${(stats.totalSize / 1024 / 1024).toFixed(2)}MB`)
    console.log(`Entries: ${stats.entryCount}`)
    
    const detailedStats = this.getDetailedStats()
    console.group('📊 By Type')
    Object.entries(detailedStats).forEach(([type, typeStats]) => {
      if (typeStats.entryCount > 0) {
        console.log(`${type}: ${typeStats.entryCount} entries, ${(typeStats.totalSize / 1024).toFixed(1)}KB, avg ${typeStats.avgHitCount} hits`)
      }
    })
    console.groupEnd()
    
    console.groupEnd()
  }
}

// Add new performance operation constants for caching
const CACHE_PERF_OPS = {
  CACHE_GET: 'cache.get',
  CACHE_SET: 'cache.set', 
  CACHE_HIT: 'cache.hit',
} as const

// Extend existing PERF_OPS with cache operations
Object.assign(PERF_OPS, CACHE_PERF_OPS)

// Global singleton instance with instance methods that delegate to static methods
export const cacheManager = {
  set: <T>(key: string, data: T, type: 'translation' | 'tts' | 'transcription' = 'translation') => 
    CacheManager.set(key, data, type),
  get: <T>(key: string) => CacheManager.get<T>(key),
  delete: (key: string) => CacheManager.delete(key),
  has: (key: string) => CacheManager.has(key),
  clear: () => CacheManager.clear(),
  getStats: () => CacheManager.getStats(),
  wrap: <T>(key: string, fn: () => Promise<T>, type: 'translation' | 'tts' | 'transcription' = 'translation') =>
    CacheManager.wrap(key, fn, type)
}