import { useState, useCallback, useEffect, useRef } from 'react'
import type { QueuedMessage } from '@/features/messages/MessageQueue'

interface UseUnreadMessagesOptions {
  userId: string
  isSessionMode?: boolean
}

interface UseUnreadMessagesReturn {
  unreadCount: number
  lastReadMessageId: string | null
  firstUnreadMessageId: string | null
  markMessagesAsRead: (messageIds: string[]) => void
  markAllAsRead: () => void
  isMessageUnread: (messageId: string) => boolean
  setLastReadOnBlur: () => void
  checkForNewMessages: (messages: QueuedMessage[]) => void
}

/**
 * Hook to track unread messages and manage read state
 * 
 * Features:
 * - Tracks last read message ID
 * - Calculates unread count
 * - Provides functions to mark messages as read
 * - Handles blur/focus events for unread tracking
 * - Persists read state in localStorage per session
 */
export function useUnreadMessages(options: UseUnreadMessagesOptions): UseUnreadMessagesReturn {
  const { userId, isSessionMode = false } = options
  
  // Generate storage key based on session
  const storageKey = `unread_messages_${isSessionMode ? 'session' : 'solo'}_${userId}`
  
  // State
  const [lastReadMessageId, setLastReadMessageId] = useState<string | null>(() => {
    // Load from localStorage on mount
    return localStorage.getItem(storageKey)
  })
  const [unreadMessageIds, setUnreadMessageIds] = useState<Set<string>>(new Set())
  const messagesRef = useRef<QueuedMessage[]>([])
  
  // Calculate derived values
  const unreadCount = unreadMessageIds.size
  const firstUnreadMessageId = messagesRef.current.find(msg => unreadMessageIds.has(msg.id))?.id || null
  
  // Check if a message is unread
  const isMessageUnread = useCallback((messageId: string): boolean => {
    return unreadMessageIds.has(messageId)
  }, [unreadMessageIds])
  
  // Mark specific messages as read
  const markMessagesAsRead = useCallback((messageIds: string[]) => {
    setUnreadMessageIds(prev => {
      const newSet = new Set(prev)
      messageIds.forEach(id => newSet.delete(id))
      return newSet
    })
    
    // Update last read to the most recent message
    if (messageIds.length > 0 && messagesRef.current.length > 0) {
      const lastMessage = messagesRef.current[messagesRef.current.length - 1]
      setLastReadMessageId(lastMessage.id)
      localStorage.setItem(storageKey, lastMessage.id)
    }
  }, [storageKey])
  
  // Mark all messages as read
  const markAllAsRead = useCallback(() => {
    setUnreadMessageIds(new Set())
    
    if (messagesRef.current.length > 0) {
      const lastMessage = messagesRef.current[messagesRef.current.length - 1]
      setLastReadMessageId(lastMessage.id)
      localStorage.setItem(storageKey, lastMessage.id)
    }
  }, [storageKey])
  
  // Set last read message when app loses focus
  const setLastReadOnBlur = useCallback(() => {
    if (messagesRef.current.length > 0) {
      const lastMessage = messagesRef.current[messagesRef.current.length - 1]
      setLastReadMessageId(lastMessage.id)
      localStorage.setItem(storageKey, lastMessage.id)
    }
  }, [storageKey])
  
  // Check for new messages and update unread state
  const checkForNewMessages = useCallback((messages: QueuedMessage[]) => {
    messagesRef.current = messages
    
    if (!lastReadMessageId || messages.length === 0) {
      setUnreadMessageIds(new Set())
      return
    }
    
    // Find the index of the last read message
    const lastReadIndex = messages.findIndex(msg => msg.id === lastReadMessageId)
    
    if (lastReadIndex === -1) {
      // Last read message not found, consider all as read
      setUnreadMessageIds(new Set())
      return
    }
    
    // Mark all messages after lastReadIndex as unread
    const newUnreadIds = new Set<string>()
    for (let i = lastReadIndex + 1; i < messages.length; i++) {
      // Only mark partner messages as unread in session mode
      if (isSessionMode && messages[i].user_id === userId) {
        continue
      }
      newUnreadIds.add(messages[i].id)
    }
    
    setUnreadMessageIds(newUnreadIds)
  }, [lastReadMessageId, userId, isSessionMode])
  
  // Clean up localStorage on unmount
  useEffect(() => {
    return () => {
      // Optionally clear the storage on unmount
      // localStorage.removeItem(storageKey)
    }
  }, [storageKey])
  
  return {
    unreadCount,
    lastReadMessageId,
    firstUnreadMessageId,
    markMessagesAsRead,
    markAllAsRead,
    isMessageUnread,
    setLastReadOnBlur,
    checkForNewMessages
  }
}