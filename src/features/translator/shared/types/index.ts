/**
 * Shared types for TranslatorShared component library
 * Used by both SoloTranslator and SessionTranslator
 */

export interface TranslatorMessage {
  id: string
  original: string
  translation: string | null
  originalLang: string
  targetLang: string
  status: 'queued' | 'processing' | 'displayed' | 'failed'
  timestamp: string
  userId?: string
  sessionId?: string
  user_id?: string // For compatibility with existing message structure
}

export interface SessionInfo {
  code: string
  status: 'connected' | 'connecting' | 'reconnecting' | 'disconnected'
  partnerOnline: boolean
}

export interface TranslatorProps {
  messages: TranslatorMessage[]
  onSendMessage?: (message: TranslatorMessage) => void
  isSessionMode?: boolean
  partnerActivity?: 'idle' | 'recording' | 'processing' | 'typing'
  sessionInfo?: SessionInfo
  currentUserId?: string
}

export interface TranslatorTheme {
  primary: 'blue' | 'emerald' | 'purple' | 'rose' | 'amber'
  fontSize: 'small' | 'medium' | 'large' | 'xl'
}

export type UserActivity = 'idle' | 'recording' | 'processing' | 'typing'