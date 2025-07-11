import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { useTranslation } from '@/lib/i18n/useTranslation'
import { useScreenReader } from '@/hooks/useAccessibility'
import { conversationManager, ConversationBookmark, MessageSearchResult } from './ConversationManager'
import { 
  ArrowLeft,
  Search,
  Bookmark,
  BookmarkPlus,
  Download,
  Trash2,
  MessageSquare,
  Clock,
  BarChart3,
  Filter,
  Star,
  FileText,
  Database
} from 'lucide-react'

export function ConversationScreen() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { announceAction, announceSuccess, announceError } = useScreenReader()
  
  const [activeTab, setActiveTab] = useState<'search' | 'bookmarks' | 'stats'>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<MessageSearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [bookmarks, setBookmarks] = useState<ConversationBookmark[]>([])
  const [stats, setStats] = useState<any>(null)
  const [selectedSessions, setSelectedSessions] = useState<string[]>([])

  useEffect(() => {
    loadBookmarks()
    loadStats()
  }, [])

  const loadBookmarks = () => {
    const allBookmarks = conversationManager.getBookmarks()
    setBookmarks(allBookmarks)
    console.log(`📚 [ConversationScreen] Loaded ${allBookmarks.length} bookmarks`)
  }

  const loadStats = async () => {
    try {
      const conversationStats = await conversationManager.getConversationStats()
      setStats(conversationStats)
      console.log('📊 [ConversationScreen] Loaded conversation statistics')
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setSearchLoading(true)
    announceAction('Searching conversations')

    try {
      const results = await conversationManager.searchMessages(searchQuery, {
        limit: 50
      })
      setSearchResults(results)
      announceSuccess(`Found ${results.length} search results`)
      console.log(`🔍 [ConversationScreen] Search "${searchQuery}" returned ${results.length} results`)
    } catch (error) {
      console.error('Search error:', error)
      announceError('Search failed')
    } finally {
      setSearchLoading(false)
    }
  }

  const handleBookmarkSession = async (sessionCode: string) => {
    try {
      const title = prompt('Enter a title for this bookmark:') || `Session ${sessionCode}`
      const description = prompt('Enter a description (optional):')
      
      await conversationManager.bookmarkSession(sessionCode, title, description)
      loadBookmarks()
      announceSuccess(`Session ${sessionCode} bookmarked`)
    } catch (error) {
      console.error('Bookmark error:', error)
      announceError('Failed to bookmark session')
    }
  }

  const handleRemoveBookmark = (bookmarkId: string) => {
    if (confirm('Remove this bookmark?')) {
      const success = conversationManager.removeBookmark(bookmarkId)
      if (success) {
        loadBookmarks()
        announceSuccess('Bookmark removed')
      }
    }
  }

  const handleExportConversation = async (sessionCode: string, format: 'json' | 'txt' | 'csv' = 'json') => {
    try {
      announceAction(`Exporting conversation as ${format.toUpperCase()}`)
      const content = await conversationManager.exportConversation(sessionCode, format)
      
      // Create and download file
      const blob = new Blob([content], { 
        type: format === 'json' ? 'application/json' : 
             format === 'csv' ? 'text/csv' : 'text/plain' 
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `conversation-${sessionCode}.${format}`
      link.click()
      URL.revokeObjectURL(url)
      
      announceSuccess(`Conversation exported as ${format.toUpperCase()}`)
    } catch (error) {
      console.error('Export error:', error)
      announceError('Export failed')
    }
  }

  const handleNavigateToSession = (sessionCode: string) => {
    conversationManager.updateBookmarkUsage(sessionCode)
    navigate(`/session/${sessionCode}`)
  }

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  const tabs = [
    { id: 'search', label: 'Search', icon: Search },
    { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
    { id: 'stats', label: 'Statistics', icon: BarChart3 }
  ] as const

  return (
    <MobileContainer className="min-h-screen py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="p-2"
          ariaLabel="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-purple-600" />
          <h1 className="text-xl font-semibold">Conversations</h1>
        </div>
      </div>

      {/* Tab Navigation */}
      <Card className="p-1">
        <div className="flex space-x-1" role="tablist">
          {tabs.map((tab) => {
            const IconComponent = tab.icon
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`${tab.id}-panel`}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <IconComponent className="h-4 w-4" aria-hidden="true" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </Card>

      {/* Search Tab */}
      {activeTab === 'search' && (
        <div id="search-panel" role="tabpanel" className="space-y-4">
          <Card className="space-y-4">
            <h2 className="font-semibold">Search Conversations</h2>
            
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                label="Search query"
                className="flex-1"
              />
              <Button
                onClick={handleSearch}
                loading={searchLoading}
                disabled={!searchQuery.trim()}
                ariaLabel="Search conversations"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium text-sm">
                  {searchResults.length} results found
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleNavigateToSession(result.sessionCode)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-purple-600">
                          Session {result.sessionCode}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(result.timestamp)}
                        </span>
                      </div>
                      
                      <div className="text-sm space-y-1">
                        <div>
                          <span className="font-medium">Original:</span> {result.original}
                        </div>
                        {result.translation && (
                          <div>
                            <span className="font-medium">Translation:</span> {result.translation}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {result.originalLang} → {result.targetLang}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleBookmarkSession(result.sessionCode)
                            }}
                            ariaLabel="Bookmark this session"
                          >
                            <BookmarkPlus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleExportConversation(result.sessionCode)
                            }}
                            ariaLabel="Export this conversation"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Bookmarks Tab */}
      {activeTab === 'bookmarks' && (
        <div id="bookmarks-panel" role="tabpanel" className="space-y-4">
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Bookmarked Sessions</h2>
              <span className="text-sm text-gray-500">
                {bookmarks.length} bookmarks
              </span>
            </div>

            {bookmarks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No bookmarked sessions yet</p>
                <p className="text-sm">Search and bookmark sessions to see them here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {bookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{bookmark.title}</h3>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleExportConversation(bookmark.sessionCode)}
                          ariaLabel="Export conversation"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveBookmark(bookmark.id)}
                          ariaLabel="Remove bookmark"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {bookmark.description && (
                      <p className="text-sm text-gray-600 mb-2">
                        {bookmark.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Session {bookmark.sessionCode}</span>
                      <span>{bookmark.messageCount} messages</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                      <span>
                        {bookmark.languages.original} ↔ {bookmark.languages.target}
                      </span>
                      <span>
                        Last used: {formatTimeAgo(bookmark.lastUsed)}
                      </span>
                    </div>
                    
                    <Button
                      onClick={() => handleNavigateToSession(bookmark.sessionCode)}
                      size="sm"
                      className="w-full mt-3"
                      ariaLabel={`Open session ${bookmark.sessionCode}`}
                    >
                      Open Session
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'stats' && (
        <div id="stats-panel" role="tabpanel" className="space-y-4">
          {stats ? (
            <>
              <Card className="space-y-4">
                <h2 className="font-semibold">Overview</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-25 dark:bg-blue-950/30 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.totalSessions}
                    </div>
                    <div className="text-sm text-blue-700">Total Sessions</div>
                  </div>
                  <div className="text-center p-3 bg-green-25 dark:bg-green-950/30 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {stats.totalMessages}
                    </div>
                    <div className="text-sm text-green-700">Total Messages</div>
                  </div>
                  <div className="text-center p-3 bg-purple-25 dark:bg-purple-950/30 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {stats.bookmarkedSessions}
                    </div>
                    <div className="text-sm text-purple-700">Bookmarked</div>
                  </div>
                  <div className="text-center p-3 bg-orange-25 dark:bg-orange-950/30 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {stats.languagePairs.length}
                    </div>
                    <div className="text-sm text-orange-700">Language Pairs</div>
                  </div>
                </div>
              </Card>

              <Card className="space-y-4">
                <h2 className="font-semibold">Language Pairs</h2>
                <div className="space-y-2">
                  {stats.languagePairs.map((pair: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-25 dark:bg-gray-800 rounded">
                      <span className="text-sm">
                        {pair.from.toUpperCase()} → {pair.to.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium">
                        {pair.count} messages
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="space-y-4">
                <h2 className="font-semibold">Recent Activity</h2>
                <div className="space-y-2">
                  {stats.recentActivity.map((activity: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-25 dark:bg-gray-800 rounded">
                      <span className="text-sm">
                        {new Date(activity.date).toLocaleDateString()}
                      </span>
                      <span className="text-sm font-medium">
                        {activity.messageCount} messages
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-8 text-center">
              <Database className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-gray-500">Loading statistics...</p>
            </Card>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-gray-500">
        <p>💬 Conversation Management</p>
        <p>Search • Bookmark • Export your translation sessions</p>
      </div>
    </MobileContainer>
  )
}