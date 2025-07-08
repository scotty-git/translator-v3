/**
 * Conversation Manager - Message search, export, and session bookmarks
 * Handles conversation history, search, and export functionality
 */

import { supabase } from '@/services/supabase'
import { UserManager } from '@/lib/user/UserManager'

export interface ConversationBookmark {
  id: string
  sessionCode: string
  title: string
  description?: string
  createdAt: string
  lastUsed: string
  messageCount: number
  languages: {
    original: string
    target: string
  }
}

export interface MessageSearchResult {
  id: string
  sessionId: string
  sessionCode: string
  original: string
  translation: string
  originalLang: string
  targetLang: string
  timestamp: string
  matchType: 'original' | 'translation'
  context: string // Surrounding messages for context
}

export interface ConversationExport {
  sessionCode: string
  title: string
  exportedAt: string
  messageCount: number
  languages: {
    original: string
    target: string
  }
  messages: Array<{
    id: string
    original: string
    translation: string
    originalLang: string
    targetLang: string
    timestamp: string
    speaker: 'user' | 'partner'
  }>
}

export class ConversationManager {
  private static instance: ConversationManager
  private bookmarks: ConversationBookmark[] = []
  private searchCache = new Map<string, MessageSearchResult[]>()

  constructor() {
    this.loadBookmarks()
  }

  static getInstance(): ConversationManager {
    if (!ConversationManager.instance) {
      ConversationManager.instance = new ConversationManager()
    }
    return ConversationManager.instance
  }

  /**
   * Load bookmarks from localStorage
   */
  private loadBookmarks(): void {
    try {
      const saved = UserManager.getPreference('conversationBookmarks', [])
      this.bookmarks = Array.isArray(saved) ? saved : []
      console.log(`📚 [ConversationManager] Loaded ${this.bookmarks.length} bookmarks`)
    } catch (error) {
      console.error('Error loading bookmarks:', error)
      this.bookmarks = []
    }
  }

  /**
   * Save bookmarks to localStorage
   */
  private saveBookmarks(): void {
    try {
      UserManager.setPreference('conversationBookmarks', this.bookmarks)
      console.log(`📚 [ConversationManager] Saved ${this.bookmarks.length} bookmarks`)
    } catch (error) {
      console.error('Error saving bookmarks:', error)
    }
  }

  /**
   * Add a session to bookmarks
   */
  async bookmarkSession(sessionCode: string, title?: string, description?: string): Promise<ConversationBookmark> {
    try {
      // Get session details
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('id, created_at')
        .eq('code', sessionCode)
        .single()

      if (sessionError || !session) {
        throw new Error('Session not found')
      }

      // Get message count and languages
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('original_lang, target_lang')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true })

      if (messagesError) {
        throw new Error('Error fetching message details')
      }

      const messageCount = messages?.length || 0
      const firstMessage = messages?.[0]
      const languages = {
        original: firstMessage?.original_lang || 'en',
        target: firstMessage?.target_lang || 'es'
      }

      const bookmark: ConversationBookmark = {
        id: `bookmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sessionCode,
        title: title || `Session ${sessionCode}`,
        description,
        createdAt: session.created_at,
        lastUsed: new Date().toISOString(),
        messageCount,
        languages
      }

      // Check if already bookmarked
      const existingIndex = this.bookmarks.findIndex(b => b.sessionCode === sessionCode)
      if (existingIndex >= 0) {
        // Update existing bookmark
        this.bookmarks[existingIndex] = { ...this.bookmarks[existingIndex], ...bookmark, id: this.bookmarks[existingIndex].id }
      } else {
        // Add new bookmark
        this.bookmarks.unshift(bookmark)
      }

      this.saveBookmarks()
      console.log(`📚 [ConversationManager] Bookmarked session ${sessionCode}`)
      
      return bookmark
    } catch (error) {
      console.error('Error bookmarking session:', error)
      throw error
    }
  }

  /**
   * Remove a bookmark
   */
  removeBookmark(bookmarkId: string): boolean {
    const initialLength = this.bookmarks.length
    this.bookmarks = this.bookmarks.filter(b => b.id !== bookmarkId)
    
    if (this.bookmarks.length < initialLength) {
      this.saveBookmarks()
      console.log(`📚 [ConversationManager] Removed bookmark ${bookmarkId}`)
      return true
    }
    
    return false
  }

  /**
   * Get all bookmarks
   */
  getBookmarks(): ConversationBookmark[] {
    return [...this.bookmarks].sort((a, b) => 
      new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
    )
  }

  /**
   * Update bookmark last used
   */
  updateBookmarkUsage(sessionCode: string): void {
    const bookmark = this.bookmarks.find(b => b.sessionCode === sessionCode)
    if (bookmark) {
      bookmark.lastUsed = new Date().toISOString()
      this.saveBookmarks()
    }
  }

  /**
   * Search messages across all sessions
   */
  async searchMessages(query: string, options: {
    sessionCode?: string
    languages?: string[]
    dateRange?: { start: string; end: string }
    limit?: number
  } = {}): Promise<MessageSearchResult[]> {
    if (!query.trim()) return []

    const cacheKey = `${query}-${JSON.stringify(options)}`
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey)!
    }

    try {
      let queryBuilder = supabase
        .from('messages')
        .select(`
          id,
          session_id,
          original,
          translation,
          original_lang,
          target_lang,
          timestamp,
          sessions!inner(code)
        `)

      // Add filters
      if (options.sessionCode) {
        queryBuilder = queryBuilder.eq('sessions.code', options.sessionCode)
      }

      if (options.languages?.length) {
        queryBuilder = queryBuilder.in('original_lang', options.languages)
      }

      if (options.dateRange) {
        queryBuilder = queryBuilder
          .gte('timestamp', options.dateRange.start)
          .lte('timestamp', options.dateRange.end)
      }

      // Search in both original and translation
      const { data: originalMatches, error: originalError } = await queryBuilder
        .ilike('original', `%${query}%`)
        .limit(options.limit || 50)

      const { data: translationMatches, error: translationError } = await queryBuilder
        .ilike('translation', `%${query}%`)
        .limit(options.limit || 50)

      if (originalError || translationError) {
        throw new Error('Search query failed')
      }

      // Combine and deduplicate results
      const allMatches = [
        ...(originalMatches || []).map(m => ({ ...m, matchType: 'original' as const })),
        ...(translationMatches || []).map(m => ({ ...m, matchType: 'translation' as const }))
      ]

      const uniqueMatches = allMatches.filter((match, index, array) => 
        array.findIndex(m => m.id === match.id) === index
      )

      // Format results with context
      const results: MessageSearchResult[] = await Promise.all(
        uniqueMatches.map(async (match) => {
          // Get surrounding messages for context
          const { data: contextMessages } = await supabase
            .from('messages')
            .select('original, translation')
            .eq('session_id', match.session_id)
            .order('timestamp', { ascending: true })
            .range(
              Math.max(0, uniqueMatches.indexOf(match) - 1),
              uniqueMatches.indexOf(match) + 1
            )

          const context = contextMessages
            ?.map(msg => `${msg.original} → ${msg.translation}`)
            .join(' | ') || ''

          return {
            id: match.id,
            sessionId: match.session_id,
            sessionCode: (match.sessions as any).code,
            original: match.original,
            translation: match.translation || '',
            originalLang: match.original_lang,
            targetLang: match.target_lang,
            timestamp: match.timestamp,
            matchType: match.matchType,
            context
          }
        })
      )

      // Cache results
      this.searchCache.set(cacheKey, results)
      
      // Clear cache after 5 minutes
      setTimeout(() => {
        this.searchCache.delete(cacheKey)
      }, 5 * 60 * 1000)

      console.log(`🔍 [ConversationManager] Search "${query}" returned ${results.length} results`)
      return results

    } catch (error) {
      console.error('Error searching messages:', error)
      throw error
    }
  }

  /**
   * Export conversation as JSON
   */
  async exportConversation(sessionCode: string, format: 'json' | 'txt' | 'csv' = 'json'): Promise<string> {
    try {
      // Get session details
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('id, created_at')
        .eq('code', sessionCode)
        .single()

      if (sessionError || !session) {
        throw new Error('Session not found')
      }

      // Get all messages
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', session.id)
        .order('timestamp', { ascending: true })

      if (messagesError) {
        throw new Error('Error fetching messages')
      }

      const currentUserId = UserManager.getUserId()
      const exportData: ConversationExport = {
        sessionCode,
        title: `Conversation ${sessionCode}`,
        exportedAt: new Date().toISOString(),
        messageCount: messages?.length || 0,
        languages: {
          original: messages?.[0]?.original_lang || 'en',
          target: messages?.[0]?.target_lang || 'es'
        },
        messages: (messages || []).map(msg => ({
          id: msg.id,
          original: msg.original,
          translation: msg.translation || '',
          originalLang: msg.original_lang,
          targetLang: msg.target_lang,
          timestamp: msg.timestamp,
          speaker: msg.user_id === currentUserId ? 'user' : 'partner'
        }))
      }

      let content: string

      switch (format) {
        case 'txt':
          content = this.formatAsText(exportData)
          break
        case 'csv':
          content = this.formatAsCSV(exportData)
          break
        default:
          content = JSON.stringify(exportData, null, 2)
      }

      console.log(`📤 [ConversationManager] Exported session ${sessionCode} as ${format.toUpperCase()}`)
      return content

    } catch (error) {
      console.error('Error exporting conversation:', error)
      throw error
    }
  }

  /**
   * Format conversation as plain text
   */
  private formatAsText(data: ConversationExport): string {
    const lines = [
      `Conversation Export: ${data.title}`,
      `Session Code: ${data.sessionCode}`,
      `Exported: ${new Date(data.exportedAt).toLocaleString()}`,
      `Messages: ${data.messageCount}`,
      `Languages: ${data.languages.original} ↔ ${data.languages.target}`,
      '',
      '--- Messages ---',
      ''
    ]

    data.messages.forEach((msg, index) => {
      const time = new Date(msg.timestamp).toLocaleTimeString()
      lines.push(`[${time}] ${msg.speaker.toUpperCase()}:`)
      lines.push(`  Original (${msg.originalLang}): ${msg.original}`)
      if (msg.translation) {
        lines.push(`  Translation (${msg.targetLang}): ${msg.translation}`)
      }
      lines.push('')
    })

    return lines.join('\n')
  }

  /**
   * Format conversation as CSV
   */
  private formatAsCSV(data: ConversationExport): string {
    const headers = [
      'Timestamp',
      'Speaker',
      'Original Language',
      'Original Text',
      'Target Language',
      'Translation'
    ]

    const rows = data.messages.map(msg => [
      msg.timestamp,
      msg.speaker,
      msg.originalLang,
      `"${msg.original.replace(/"/g, '""')}"`,
      msg.targetLang,
      `"${(msg.translation || '').replace(/"/g, '""')}"`
    ])

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats(sessionCode?: string): Promise<{
    totalSessions: number
    totalMessages: number
    bookmarkedSessions: number
    languagePairs: Array<{ from: string; to: string; count: number }>
    recentActivity: Array<{ date: string; messageCount: number }>
  }> {
    try {
      let queryBuilder = supabase.from('messages').select('*')
      
      if (sessionCode) {
        const { data: session } = await supabase
          .from('sessions')
          .select('id')
          .eq('code', sessionCode)
          .single()
        
        if (session) {
          queryBuilder = queryBuilder.eq('session_id', session.id)
        }
      }

      const { data: messages, error } = await queryBuilder

      if (error) throw error

      // Calculate statistics
      const sessionIds = new Set(messages?.map(m => m.session_id) || [])
      const languagePairs = new Map<string, number>()
      const dailyActivity = new Map<string, number>()

      messages?.forEach(msg => {
        const pair = `${msg.original_lang}-${msg.target_lang}`
        languagePairs.set(pair, (languagePairs.get(pair) || 0) + 1)

        const date = new Date(msg.timestamp).toISOString().split('T')[0]
        dailyActivity.set(date, (dailyActivity.get(date) || 0) + 1)
      })

      return {
        totalSessions: sessionIds.size,
        totalMessages: messages?.length || 0,
        bookmarkedSessions: this.bookmarks.length,
        languagePairs: Array.from(languagePairs.entries()).map(([pair, count]) => {
          const [from, to] = pair.split('-')
          return { from, to, count }
        }),
        recentActivity: Array.from(dailyActivity.entries())
          .map(([date, count]) => ({ date, messageCount: count }))
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 7)
      }

    } catch (error) {
      console.error('Error getting conversation stats:', error)
      throw error
    }
  }

  /**
   * Clear search cache
   */
  clearSearchCache(): void {
    this.searchCache.clear()
    console.log('🔍 [ConversationManager] Search cache cleared')
  }
}

// Global instance
export const conversationManager = ConversationManager.getInstance()