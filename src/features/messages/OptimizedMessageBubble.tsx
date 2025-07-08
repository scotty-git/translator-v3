/**
 * Optimized Message Bubble for Phase 7 Performance
 * Enhanced with React.memo, useMemo, useCallback for minimal re-renders
 * Maintains compatibility with existing Phase 3-6 message system
 */

import { useState, useRef, memo, useMemo, useCallback } from 'react'
import { clsx } from 'clsx'
import { Check, Clock, AlertCircle, Play, Pause, Loader2, Volume2, Edit3 } from 'lucide-react'
import type { QueuedMessage } from './MessageQueue'
import { useSession } from '../session/SessionContext'
import { TTSService } from '../../services/openai/tts'
import { EmojiReactionPicker } from './EmojiReactionPicker'
import { MessageReactions } from './MessageReactions'
import { useLongPress } from '../../hooks/useLongPress'
import { performanceLogger, PERF_OPS } from '@/lib/performance'

export interface OptimizedMessageBubbleProps {
  message: QueuedMessage
  onPlayAudio?: (audioUrl: string) => void
  theme?: 'blue' | 'emerald' | 'purple' | 'rose' | 'amber'
}

type TTSStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'error'

// Memoized theme configuration to prevent recreation on every render
const THEME_COLORS = {
  blue: { bg: 'bg-blue-600', hover: 'hover:bg-blue-700', text: 'text-blue-200', border: 'border-blue-200' },
  emerald: { bg: 'bg-emerald-600', hover: 'hover:bg-emerald-700', text: 'text-emerald-200', border: 'border-emerald-200' },
  purple: { bg: 'bg-purple-600', hover: 'hover:bg-purple-700', text: 'text-purple-200', border: 'border-purple-200' },
  rose: { bg: 'bg-rose-600', hover: 'hover:bg-rose-700', text: 'text-rose-200', border: 'border-rose-200' },
  amber: { bg: 'bg-amber-600', hover: 'hover:bg-amber-700', text: 'text-amber-200', border: 'border-amber-200' }
} as const

const OptimizedMessageBubbleComponent = ({ 
  message, 
  onPlayAudio,
  theme = 'blue' 
}: OptimizedMessageBubbleProps) => {
  // Performance timer for component render
  useMemo(() => {
    performanceLogger.start(PERF_OPS.UI_MESSAGE_DISPLAY)
    return () => performanceLogger.end(PERF_OPS.UI_MESSAGE_DISPLAY)
  }, [message.id])
  
  const { userId } = useSession()
  const [ttsStatus, setTtsStatus] = useState<TTSStatus>('idle')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiPickerPosition, setEmojiPickerPosition] = useState({ x: 0, y: 0 })
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const messageRef = useRef<HTMLDivElement | null>(null)
  
  // Memoized computations to prevent recalculation
  const isOwnMessage = useMemo(() => message.user_id === userId, [message.user_id, userId])
  const colors = useMemo(() => THEME_COLORS[theme], [theme])
  const primaryText = useMemo(() => message.translation || message.original, [message.translation, message.original])
  const secondaryText = useMemo(() => message.translation ? message.original : null, [message.translation, message.original])
  
  // Memoized status icon to prevent recreation
  const statusIcon = useMemo(() => {
    switch (message.status) {
      case 'queued':
        return <Clock className="h-3 w-3 text-gray-400" />
      case 'processing':
        return <Loader2 className="h-3 w-3 text-gray-400 animate-spin" />
      case 'displayed':
        return <Check className="h-3 w-3 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-red-500" />
      default:
        return null
    }
  }, [message.status])
  
  // Optimized TTS functions with useCallback to prevent recreation
  const generateTTS = useCallback(async () => {
    if (ttsStatus === 'loading') return
    
    performanceLogger.start('message-bubble-tts-generation')
    
    try {
      setTtsStatus('loading')
      setError(null)
      
      console.log(`🔊 Generating TTS for: "${primaryText}"`)
      
      // Use existing TTS service
      const result = await TTSService.synthesize(primaryText)
      
      // Create audio URL from buffer
      const audioBlob = new Blob([result.audioBuffer], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(audioBlob)
      
      setAudioUrl(url)
      setTtsStatus('ready')
      
      console.log(`✅ TTS generated successfully (${(result.audioBuffer.byteLength / 1024).toFixed(1)}KB)`)
      
    } catch (err) {
      console.error('TTS generation failed:', err)
      setError(err instanceof Error ? err.message : 'TTS generation failed')
      setTtsStatus('error')
    } finally {
      performanceLogger.end('message-bubble-tts-generation')
    }
  }, [primaryText, ttsStatus])
  
  const playAudio = useCallback(async () => {
    if (!audioUrl || !audioRef.current) return
    
    performanceLogger.start('message-bubble-audio-play')
    
    try {
      setTtsStatus('playing')
      
      audioRef.current.src = audioUrl
      await audioRef.current.play()
      
      // Call external audio handler if provided
      onPlayAudio?.(audioUrl)
      
      console.log(`🎵 Playing TTS audio`)
      
    } catch (err) {
      console.error('Audio playback failed:', err)
      setError(err instanceof Error ? err.message : 'Audio playback failed')
      setTtsStatus('error')
    } finally {
      performanceLogger.end('message-bubble-audio-play')
    }
  }, [audioUrl, onPlayAudio])
  
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setTtsStatus('ready')
      console.log(`⏹️ TTS audio stopped`)
    }
  }, [])
  
  const handleTTSClick = useCallback(() => {
    performanceLogger.logEvent('message-bubble-tts-click', { messageId: message.id })
    
    if (ttsStatus === 'idle') {
      generateTTS()
    } else if (ttsStatus === 'ready') {
      playAudio()
    } else if (ttsStatus === 'playing') {
      stopAudio()
    }
  }, [ttsStatus, generateTTS, playAudio, stopAudio, message.id])
  
  // Optimized long press handlers
  const handleLongPressStart = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    const rect = messageRef.current?.getBoundingClientRect()
    if (rect) {
      const x = 'touches' in event ? event.touches[0].clientX : event.clientX
      const y = 'touches' in event ? event.touches[0].clientY : event.clientY
      
      setEmojiPickerPosition({
        x: x - rect.left,
        y: y - rect.top
      })
      setShowEmojiPicker(true)
    }
    
    performanceLogger.logEvent('message-bubble-long-press', { messageId: message.id })
  }, [message.id])
  
  const longPressProps = useLongPress(handleLongPressStart)
  
  // Optimized event handlers
  const handleEmojiSelect = useCallback((emoji: string) => {
    console.log(`${emoji} reaction on message ${message.id}`)
    // TODO: Save reaction to database
    setShowEmojiPicker(false)
    
    performanceLogger.logEvent('message-bubble-emoji-reaction', { 
      messageId: message.id, 
      emoji 
    })
  }, [message.id])
  
  const handleEditMessage = useCallback(() => {
    console.log(`Edit message ${message.id}`)
    // TODO: Enable edit mode
    performanceLogger.logEvent('message-bubble-edit', { messageId: message.id })
  }, [message.id])
  
  // Audio event handlers
  const handleAudioEnded = useCallback(() => {
    setTtsStatus('ready')
    console.log(`🎵 TTS audio playback completed`)
  }, [])
  
  const handleAudioError = useCallback(() => {
    setTtsStatus('error')
    setError('Audio playback failed')
    console.error('Audio playback error')
  }, [])
  
  // Cleanup effect
  useMemo(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])
  
  // Memoized TTS button to prevent recreation
  const ttsButton = useMemo(() => {
    if (!primaryText) return null
    
    return (
      <button
        onClick={handleTTSClick}
        disabled={ttsStatus === 'loading'}
        className={clsx(
          "p-1.5 rounded-full transition-all duration-200",
          ttsStatus === 'loading' && "cursor-not-allowed",
          isOwnMessage 
            ? "hover:bg-white/20 text-white/80 hover:text-white" 
            : "hover:bg-gray-100 text-gray-600 hover:text-gray-800"
        )}
        title={
          ttsStatus === 'idle' ? 'Generate audio' :
          ttsStatus === 'loading' ? 'Generating...' :
          ttsStatus === 'ready' ? 'Play audio' :
          ttsStatus === 'playing' ? 'Stop audio' :
          'Audio error'
        }
      >
        {ttsStatus === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
        {ttsStatus === 'idle' && <Volume2 className="h-4 w-4" />}
        {ttsStatus === 'ready' && <Play className="h-4 w-4" />}
        {ttsStatus === 'playing' && <Pause className="h-4 w-4" />}
        {ttsStatus === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
      </button>
    )
  }, [primaryText, ttsStatus, handleTTSClick, isOwnMessage])
  
  return (
    <div
      ref={messageRef}
      className={clsx(
        "message-bubble group relative",
        isOwnMessage ? "message-own" : "message-other"
      )}
      {...longPressProps}
    >
      {/* Status indicator */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1 text-xs">
          {statusIcon}
          <span className="text-gray-500">{message.status}</span>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {ttsButton}
          {isOwnMessage && (
            <button
              onClick={handleEditMessage}
              className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-all duration-200"
              title="Edit message"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Primary text */}
      <div className={clsx(
        "text-sm font-medium mb-1",
        isOwnMessage ? "text-white" : "text-gray-900 dark:text-gray-100"
      )}>
        {primaryText}
      </div>
      
      {/* Secondary text (original when translated) */}
      {secondaryText && (
        <div className={clsx(
          "text-xs opacity-70",
          isOwnMessage ? colors.text : "text-gray-600 dark:text-gray-400"
        )}>
          {secondaryText}
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="text-xs text-red-500 mt-1">
          {error}
        </div>
      )}
      
      {/* Reactions */}
      <MessageReactions message={message} />
      
      {/* Emoji picker */}
      {showEmojiPicker && (
        <EmojiReactionPicker
          isVisible={showEmojiPicker}
          position={emojiPickerPosition}
          onEmojiSelect={handleEmojiSelect}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}
      
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        onError={handleAudioError}
        preload="none"
      />
    </div>
  )
}

// Memoize with custom comparison function for optimal performance
export const OptimizedMessageBubble = memo(OptimizedMessageBubbleComponent, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.status === nextProps.message.status &&
    prevProps.message.translation === nextProps.message.translation &&
    prevProps.message.original === nextProps.message.original &&
    prevProps.theme === nextProps.theme &&
    prevProps.onPlayAudio === nextProps.onPlayAudio
  )
})

OptimizedMessageBubble.displayName = 'OptimizedMessageBubble'