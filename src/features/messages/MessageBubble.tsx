import { useState, useRef } from 'react'
import { clsx } from 'clsx'
import { Check, Clock, AlertCircle, Play, Pause, Loader2, Volume2, Edit3, CheckCheck, ChevronDown, ChevronUp } from 'lucide-react'
import type { QueuedMessage } from './MessageQueue'
import { messageQueue } from './MessageQueue'
import { SecureTTSService as TTSService } from '../../services/openai/tts-secure'
import { EmojiReactionPickerFixed as EmojiReactionPicker } from './EmojiReactionPickerFixed'
import { MessageReactions } from './MessageReactions'
import { useLongPress } from '../../hooks/useLongPress'

export interface MessageBubbleProps {
  message: QueuedMessage
  onPlayAudio?: (audioUrl: string) => void
  theme?: 'blue' | 'emerald' | 'purple' | 'rose' | 'amber'
  currentUserId?: string // For session mode
  isSessionMode?: boolean
  fontSize?: 'small' | 'medium' | 'large' | 'xl'
}

type TTSStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'error'

export function MessageBubble({ 
  message, 
  theme = 'blue', 
  currentUserId, 
  isSessionMode = false,
  fontSize = 'medium'
}: MessageBubbleProps) {
  // In solo mode, use a consistent userId for all messages
  const userId = currentUserId || 'single-user'
  const [ttsStatus, setTtsStatus] = useState<TTSStatus>('idle')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiPickerPosition, setEmojiPickerPosition] = useState({ x: 0, y: 0 })
  const [showOriginal, setShowOriginal] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const messageRef = useRef<HTMLDivElement | null>(null)
  
  // Determine message alignment and styling based on mode
  const isOwnMessage = message.user_id === userId
  
  let isLeftAligned: boolean
  let useOwnMessageStyling: boolean
  
  if (isSessionMode) {
    // Session mode: Use chat interface pattern
    // Own messages on right, partner messages on left
    isLeftAligned = !isOwnMessage
    useOwnMessageStyling = isOwnMessage
  } else {
    // Solo mode: English messages on left, other languages on right
    isLeftAligned = message.original_lang === 'en'
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
  // const languageLabel = message.translation ? message.target_lang.toUpperCase() : message.original_lang.toUpperCase()

  // TTS Functions
  const generateTTS = async () => {
    if (ttsStatus === 'loading') return
    
    setTtsStatus('loading')
    setError(null)
    
    try {
      console.log('🔊 Generating TTS for:', primaryText)
      
      const result = await TTSService.synthesize(
        primaryText,
        'nova', // Good for multiple languages
        1.0
      )
      
      if (result.audioBuffer) {
        const blob = TTSService.createAudioBlob(result.audioBuffer)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setTtsStatus('ready')
        console.log('✅ TTS generated successfully')
        
        // Auto-play immediately when ready
        setTimeout(() => {
          if (url) {
            playAudioWithUrl(url)
          }
        }, 100)
      } else {
        throw new Error('No audio data received')
      }
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

  const playAudio = () => {
    if (!audioUrl || ttsStatus !== 'ready') return
    playAudioWithUrl(audioUrl)
  }

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setTtsStatus('ready')
    }
  }

  const handleTTSClick = () => {
    if (ttsStatus === 'idle' || ttsStatus === 'error') {
      generateTTS()
    } else if (ttsStatus === 'ready') {
      playAudio()
    } else if (ttsStatus === 'playing') {
      pauseAudio()
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

  /**
   * EMOJI REACTION SYSTEM INTEGRATION
   * 
   * This section handles the integration of emoji reactions into message bubbles.
   * It coordinates between long-press detection, emoji picker display, and reaction toggling.
   */

  /**
   * Handles long-press events to show the emoji picker
   * 
   * Process:
   * 1. Calculate the message bubble's position on screen
   * 2. Determine optimal position for emoji picker (centered above message)
   * 3. Store position in state and show the picker
   * 
   * The picker appears above the message to avoid blocking content below.
   */
  const handleLongPress = (_event: React.MouseEvent | React.TouchEvent) => {
    // Get the message bubble's position relative to the viewport
    const rect = messageRef.current?.getBoundingClientRect()
    if (!rect) {
      console.warn('Cannot show emoji picker: message ref not available')
      return
    }

    // Calculate centered position above the message
    const position = {
      x: rect.left + rect.width / 2,  // Horizontal center of the message
      y: rect.top - 10                // 10px above the message bubble
    }

    // Update state to show the picker at calculated position
    setEmojiPickerPosition(position)
    setShowEmojiPicker(true)
    
    console.debug('Showing emoji picker for message:', message.id)
  }

  /**
   * Handles emoji selection from the picker
   * 
   * Process:
   * 1. Validate user is logged in
   * 2. Toggle the reaction via MessageQueue
   * 3. Hide the picker
   * 
   * The MessageQueue handles all the complex reaction logic and UI updates.
   */
  const handleEmojiSelect = (emoji: string) => {
    if (!userId) {
      console.warn('Cannot add reaction: user not authenticated')
      return
    }
    
    // Toggle the reaction (add if not present, remove if present)
    messageQueue.toggleReaction(message.id, emoji, userId)
    
    // Hide the picker after selection
    setShowEmojiPicker(false)
    
    console.debug(`User ${userId} reacted with ${emoji} to message ${message.id}`)
  }

  /**
   * Handles clicking on existing reaction bubbles
   * 
   * When users click on reaction bubbles under messages, this toggles their participation
   * in that specific reaction. Same logic as emoji selection, but triggered differently.
   */
  const handleReactionClick = (emoji: string, _hasReacted: boolean) => {
    if (!userId) {
      console.warn('Cannot toggle reaction: user not authenticated')
      return
    }
    
    // Toggle the user's participation in this reaction
    messageQueue.toggleReaction(message.id, emoji, userId)
    
    console.debug(`User ${userId} toggled ${emoji} reaction on message ${message.id}`)
  }

  /**
   * Configure long-press detection for emoji reactions
   * 
   * Settings:
   * - 500ms threshold: Long enough to avoid accidental triggers, short enough for good UX
   * - Movement cancellation: Prevents reactions during scrolling/dragging
   * - No onClick handler: We don't want regular clicks to interfere with other message interactions
   */
  const longPressHandlers = useLongPress({
    onLongPress: handleLongPress,
    threshold: 500,           // 500ms feels natural for long-press
    cancelOnMovement: true    // Cancel if user drags (scrolling, text selection, etc.)
  })


  return (
    <>
      <div className={clsx(
        'flex',
        isLeftAligned ? 'justify-start' : 'justify-end'
      )}>
        <div 
          ref={messageRef}
          {...longPressHandlers}
          className={clsx(
            'max-w-[80%] rounded-2xl px-4 py-3 shadow-sm transition-all duration-300 cursor-pointer select-none relative transform-gpu hover:scale-[1.02]',
            {
              [`${colors.bg} text-white`]: useOwnMessageStyling,
              'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white': !useOwnMessageStyling,
              // Prioritize animations - only one at a time
              'opacity-60 scale-95': message.status === 'queued',
              'opacity-80': message.status === 'processing', 
              'animate-scale-in-bounce': message.status === 'displayed',
              'animate-shake': message.status === 'failed',
            }
          )}
        >
          {/* Message content - reduced bottom margin */}
        <div className="mb-1">
          {/* Primary text (translation) with placeholder handling */}
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
            
            {/* Chevron toggle for original text (only if translation exists) */}
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
          
          {/* Secondary text (original) - collapsible with smooth transition */}
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
              {new Date(message.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
            
            {/* Status indicator next to timestamp (only for own messages) */}
            {isOwnMessage && (
              <div className="opacity-75">
                {message.status === 'queued' && <Clock className="h-3 w-3" />}
                {message.status === 'processing' && <Clock className="h-3 w-3 animate-spin" />}
                {message.status === 'displayed' && !isSessionMode && <Check className="h-3 w-3" />}
                {message.status === 'displayed' && isSessionMode && (
                  // In session mode, show delivery status
                  // TODO: Add delivery confirmation from MessageSyncService
                  <CheckCheck className="h-3 w-3 text-green-400" />
                )}
                {message.status === 'failed' && <AlertCircle className="h-3 w-3 text-red-400" />}
              </div>
            )}
          </div>
          
          {/* Right side - Clickable Controls */}
          <div className="flex items-center gap-1">
            {/* TTS Button (always visible) */}
            <button
              onClick={handleTTSClick}
              disabled={ttsStatus === 'loading'}
              className={clsx(
                'p-1 rounded-full transition-all duration-200 hover:bg-black/10 mr-2',
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
            
            {/* Edit Button - Removed as functionality is not implemented */}
            {/* {isOwnMessage && (
              <button
                className={clsx(
                  'p-1 rounded-full transition-all duration-200 hover:bg-black/10 opacity-75 hover:opacity-100',
                  'hover:scale-110'
                )}
                title="Edit message"
                onClick={() => {
                  // TODO: Implement edit functionality
                  console.log('Edit message:', message.id)
                }}
              >
                <Edit3 className="h-3 w-3" />
              </button>
            )} */}
          </div>
          
          {/* 
            WHATSAPP-STYLE EMOJI REACTIONS OVERLAY
            
            Shows reaction bubbles floating over the bottom-right corner of the message.
            Positioned absolutely within the message bubble container.
            
            Features:
            - Floats over message content like WhatsApp
            - Smart positioning based on message ownership
            - Compact horizontal layout
            - Subtle shadow and background for visibility
          */}
          {message.reactions && Object.keys(message.reactions).length > 0 && (
            <div className={clsx(
              'absolute -bottom-2 z-10',
              // Position based on message styling:
              // Spanish/Portuguese messages: reactions on bottom-left (easier to see)
              // English messages: reactions on bottom-right
              useOwnMessageStyling ? '-left-2' : '-right-2'
            )}>
              <MessageReactions
                reactions={message.reactions}
                isOwnMessage={isOwnMessage}
                onReactionClick={handleReactionClick}
                isOverlay={true}
              />
            </div>
          )}
        </div>
      </div>
    </div>
    
    {/* 
      EMOJI REACTION PICKER OVERLAY
      
      The floating emoji picker that appears on long-press.
      Rendered outside the message container to avoid clipping issues.
      
      Features:
      - Positioned absolutely at calculated coordinates
      - Shows default emojis + expandable grid
      - Backdrop dismissal
      - Smart viewport positioning
      - Only renders when visible state is true
    */}
    {showEmojiPicker && (
      <EmojiReactionPicker
        isVisible={showEmojiPicker}
        position={emojiPickerPosition}
        onEmojiSelect={handleEmojiSelect}
        onClose={() => setShowEmojiPicker(false)}
      />
    )}
  </>
  )
}