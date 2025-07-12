import { useState, useRef, useCallback } from 'react'
import { clsx } from 'clsx'
import { Check, Clock, AlertCircle, Play, Pause, Loader2, Volume2, ChevronDown, ChevronUp } from 'lucide-react'
import type { TranslatorMessage } from '../types'
import { useLongPress } from '@/hooks/useLongPress'
import { EmojiReactionPickerFixed as EmojiReactionPicker } from '@/features/messages/EmojiReactionPickerFixed'
import { MessageReactions } from '@/features/messages/MessageReactions'
import type { MessageReactions as MessageReactionsType } from '@/types/database'

// Re-export compatible type for compatibility
export type QueuedMessage = TranslatorMessage & {
  created_at: string
  original_lang: string
  target_lang: string
  reactions?: MessageReactionsType
}

export interface MessageBubbleProps {
  message: QueuedMessage
  onPlayAudio?: (audioUrl: string) => void
  theme?: 'blue' | 'emerald' | 'purple' | 'rose' | 'amber'
  currentUserId?: string
  isSessionMode?: boolean
  fontSize?: 'small' | 'medium' | 'large' | 'xl'
  onReactionToggle?: (messageId: string, emoji: string, userId: string) => void
  onLongPress?: (messageId: string, position: { x: number, y: number }) => void
  className?: string
  'data-testid'?: string
}

type TTSStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'error'

export function MessageBubble({ 
  message, 
  theme = 'blue', 
  currentUserId, 
  isSessionMode = false,
  fontSize = 'medium',
  onReactionToggle,
  onLongPress,
  className,
  'data-testid': testId = 'message-bubble'
}: MessageBubbleProps) {
  // In solo mode, use a consistent userId for all messages
  const userId = currentUserId || 'single-user'
  const [ttsStatus, setTtsStatus] = useState<TTSStatus>('idle')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showOriginal, setShowOriginal] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 })
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const messageRef = useRef<HTMLDivElement | null>(null)
  
  // Determine message alignment and styling based on mode
  const isOwnMessage = message.user_id === userId || message.userId === userId
  
  // Determine if reactions are allowed
  const canReact = isSessionMode && !isOwnMessage && onReactionToggle
  
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 MessageBubble: canReact=${canReact}, isSessionMode=${isSessionMode}, isOwnMessage=${isOwnMessage}`, {
      messageId: message.id,
      senderId: message.sender_id || message.user_id,
      currentUserId,
      reactionsType: message.reactions ? typeof message.reactions : 'none',
      reactionsFormat: message.reactions ? Object.keys(message.reactions).map(emoji => ({
        emoji,
        dataType: typeof message.reactions![emoji],
        isArray: Array.isArray(message.reactions![emoji]),
        value: message.reactions![emoji]
      })) : []
    })
  }
  
  let isLeftAligned: boolean
  let useOwnMessageStyling: boolean
  
  if (isSessionMode) {
    // Session mode: Use chat interface pattern
    // Own messages on right, partner messages on left
    isLeftAligned = !isOwnMessage
    useOwnMessageStyling = isOwnMessage
  } else {
    // Solo mode: English messages on left, other languages on right
    isLeftAligned = (message.original_lang || message.originalLang) === 'en'
    useOwnMessageStyling = !isLeftAligned // Spanish/Portuguese messages get "own message" styling
  }

  // Theme color mappings
  const themeColors = {
    blue: { bg: 'bg-blue-600', hover: 'hover:bg-blue-700', text: 'text-blue-200', border: 'border-blue-200' },
    emerald: { bg: 'bg-emerald-600', hover: 'hover:bg-emerald-700', text: 'text-emerald-200', border: 'border-emerald-200' },
    purple: { bg: 'bg-purple-600', hover: 'hover:bg-purple-700', text: 'text-purple-200', border: 'border-purple-200' },
    rose: { bg: 'bg-rose-600', hover: 'hover:bg-rose-700', text: 'text-rose-200', border: 'border-rose-200' },
    amber: { bg: 'bg-amber-600', hover: 'hover:bg-amber-700', text: 'text-amber-200', border: 'border-amber-200' }
  }
  
  const colors = themeColors[theme]
  
  // Show translation as primary text, original as secondary
  const primaryText = message.translation || message.original
  const secondaryText = message.translation ? message.original : null

  // Simplified TTS function for shared component
  const generateTTS = async () => {
    if (ttsStatus === 'loading') return
    
    setTtsStatus('loading')
    setError(null)
    
    try {
      // For the shared component, we'll use a simplified approach
      // The actual TTS implementation will be injected through props or context
      console.log('🔊 TTS requested for:', primaryText)
      
      // Simulate TTS generation - in real implementation this would be handled by parent
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Create a simple audio URL (placeholder)
      const url = `data:audio/wav;base64,${btoa('placeholder-audio-data')}`
      setAudioUrl(url)
      setTtsStatus('ready')
      
    } catch (err) {
      console.error('TTS generation failed:', err)
      setError((err as Error).message)
      setTtsStatus('error')
    }
  }

  const playAudioWithUrl = (url: string) => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    
    const audio = new Audio(url)
    audioRef.current = audio
    
    audio.onplay = () => setTtsStatus('playing')
    audio.onended = () => setTtsStatus('ready')
    audio.onerror = () => {
      setError('Audio playback failed')
      setTtsStatus('error')
    }
    
    audio.play().catch(err => {
      console.error('Audio playback failed:', err)
      setError('Audio playback failed')
      setTtsStatus('error')
    })
  }

  const handleTTSClick = () => {
    if (ttsStatus === 'idle' || ttsStatus === 'error') {
      generateTTS()
    } else if (ttsStatus === 'ready') {
      audioUrl && playAudioWithUrl(audioUrl)
    } else if (ttsStatus === 'playing') {
      audioRef.current?.pause()
      setTtsStatus('ready')
    }
  }

  // Get TTS button content based on status
  const getTTSButton = () => {
    switch (ttsStatus) {
      case 'loading':
        return <Loader2 className="h-3 w-3 animate-spin" />
      case 'playing':
        return <Pause className="h-3 w-3" />
      case 'ready':
        return <Play className="h-3 w-3" />
      case 'error':
        return <Volume2 className="h-3 w-3 text-red-400" />
      default:
        return <Volume2 className="h-3 w-3" />
    }
  }

  // Long press handler with logging
  const handleLongPress = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    console.log('👆 Long press detected on message', { 
      messageId: message.id, 
      canReact,
      isOwnMessage 
    })
    
    if (!canReact) {
      console.log('❌ Cannot react to this message')
      return
    }
    
    const rect = messageRef.current?.getBoundingClientRect()
    if (!rect) {
      console.error('❌ Message ref not found')
      return
    }
    
    const clientX = 'clientX' in event ? event.clientX : event.touches[0].clientX
    const clientY = 'clientY' in event ? event.clientY : event.touches[0].clientY
    
    setPickerPosition({
      x: clientX,
      y: rect.bottom + 8
    })
    setShowEmojiPicker(true)
    
    // Also call custom long press handler if provided
    if (onLongPress) {
      onLongPress(message.id, { x: clientX, y: clientY })
    }
  }, [canReact, message.id, onLongPress, isOwnMessage])

  // Handle reaction toggle from picker
  const handleReactionToggle = (emoji: string) => {
    if (onReactionToggle && currentUserId) {
      onReactionToggle(message.id, emoji, currentUserId)
    }
  }

  // Handle reaction click from existing reactions
  const handleReactionClick = (emoji: string, hasReacted: boolean) => {
    if (onReactionToggle && currentUserId) {
      // Toggle the reaction based on current state
      onReactionToggle(message.id, emoji, currentUserId)
    }
  }

  // Transform reactions from simple Record<string, string[]> format to EmojiReaction format
  const transformReactions = (reactions: Record<string, string[]>, currentUserId: string) => {
    const transformed: Record<string, import('@/types/database').EmojiReaction> = {}
    
    Object.entries(reactions).forEach(([emoji, users]) => {
      if (users.length > 0) {
        transformed[emoji] = {
          emoji,
          count: users.length,
          users,
          hasReacted: users.includes(currentUserId)
        }
      }
    })
    
    return transformed
  }
  
  // Long press handlers using proper hook
  const longPressHandlers = useLongPress({
    onLongPress: handleLongPress,
    threshold: 500
  })
  
  // Get user's reactions
  // SessionTranslator provides reactions as Record<string, string[]> format
  const userReactions = message.reactions 
    ? Object.keys(message.reactions).filter(emoji => {
        const reactionData = message.reactions![emoji]
        // Handle both array format (SessionTranslator) and object format (fallback)
        const users = Array.isArray(reactionData) ? reactionData : reactionData?.users || []
        return users.includes(currentUserId || '')
      })
    : []

  return (
    <>
      <div 
        className={clsx(
          'flex mb-4 animate-fade-in',
          isLeftAligned ? 'justify-start' : 'justify-end',
          className
        )}
        data-testid={testId}
        data-own={isOwnMessage}
        {...(canReact ? longPressHandlers : {})}
      >
      <div 
        ref={messageRef}
        className={clsx(
          'max-w-[80%] rounded-2xl px-4 py-3 shadow-sm transition-all duration-300 cursor-pointer select-none relative transform-gpu hover:scale-[1.02]',
          {
            [`${colors.bg} text-white`]: useOwnMessageStyling,
            'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white': !useOwnMessageStyling,
            'opacity-60 scale-95': message.status === 'queued',
            'opacity-80': message.status === 'processing', 
            'animate-scale-in-bounce': message.status === 'displayed',
            'animate-shake': message.status === 'failed',
          }
        )}
      >
        {/* Message content */}
        <div className="mb-1">
          {/* Primary text (translation) */}
          <div className="flex items-start gap-1">
            <p className={clsx(
              'message-text leading-relaxed flex-1',
              fontSize === 'small' ? 'text-sm' : 
              fontSize === 'medium' ? 'text-base' : 
              fontSize === 'large' ? 'text-lg' : 'text-xl',
              !useOwnMessageStyling && 'text-gray-900 dark:text-gray-100'
            )}>
              {primaryText}
            </p>
            
            {/* Chevron toggle for original text */}
            {secondaryText && (
              <button
                onClick={() => setShowOriginal(!showOriginal)}
                className={clsx(
                  'p-0.5 rounded hover:bg-black/10 transition-all duration-200',
                  'opacity-50 hover:opacity-100',
                  useOwnMessageStyling ? 'text-white/70 hover:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                )}
                title={showOriginal ? 'Hide original' : 'Show original'}
              >
                {showOriginal ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
          
          {/* Secondary text (original) - collapsible */}
          {secondaryText && (
            <div className={clsx(
              'overflow-hidden transition-all duration-200',
              showOriginal ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0'
            )}>
              <p className={clsx(
                'message-text-secondary opacity-70 leading-relaxed',
                fontSize === 'small' ? 'text-xs' : 
                fontSize === 'medium' ? 'text-sm' : 
                fontSize === 'large' ? 'text-base' : 'text-lg',
                useOwnMessageStyling ? colors.text : 'text-gray-600 dark:text-gray-400'
              )}>
                {secondaryText}
              </p>
            </div>
          )}
        </div>
        
        {/* Error message */}
        {error && (
          <div className="mb-2 text-xs text-red-400">
            {error}
          </div>
        )}
        
        {/* Bottom control area */}
        <div className={clsx(
          'flex items-center justify-between',
          useOwnMessageStyling ? colors.text : 'text-gray-400 dark:text-gray-500'
        )}>
          {/* Left side - Timestamp and Status */}
          <div className="flex items-center gap-2">
            <span className="opacity-75 text-xs">
              {new Date(message.created_at || message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
            
            {/* Status indicator */}
            {isOwnMessage && (
              <div className="opacity-75">
                {message.status === 'queued' && <Clock className="h-3 w-3" />}
                {message.status === 'processing' && <Clock className="h-3 w-3 animate-spin" />}
                {message.status === 'displayed' && <Check className="h-3 w-3" />}
                {message.status === 'failed' && <AlertCircle className="h-3 w-3 text-red-400" />}
              </div>
            )}
          </div>
          
          {/* Right side - TTS Control */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleTTSClick}
              disabled={ttsStatus === 'loading'}
              className={clsx(
                'p-1 rounded-full transition-all duration-200 hover:bg-black/10',
                {
                  'opacity-50 cursor-not-allowed': ttsStatus === 'loading',
                  'text-green-400': ttsStatus === 'ready' || ttsStatus === 'playing',
                  'text-red-400': ttsStatus === 'error',
                  'hover:scale-110': ttsStatus !== 'loading'
                },
                'opacity-75 hover:opacity-100'
              )}
              title={
                ttsStatus === 'idle' ? 'Play audio' :
                ttsStatus === 'loading' ? 'Generating...' :
                ttsStatus === 'ready' ? 'Play audio' :
                ttsStatus === 'playing' ? 'Pause audio' :
                'Error - click to retry'
              }
            >
              {getTTSButton()}
            </button>
          </div>
          
          {/* Reactions display */}
          {message.reactions && Object.keys(message.reactions).length > 0 && currentUserId && (
            <MessageReactions
              reactions={transformReactions(message.reactions, currentUserId)}
              isOwnMessage={isOwnMessage}
              onReactionClick={handleReactionClick}
              isOverlay={false}
            />
          )}
        </div>
        </div>
      </div>
      
      {/* Emoji picker */}
      <EmojiReactionPicker
        isVisible={showEmojiPicker}
        position={pickerPosition}
        onEmojiSelect={handleReactionToggle}
        onClose={() => setShowEmojiPicker(false)}
      />
    </>
  )
}