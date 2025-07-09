import { AlertCircle, WifiOff, Mic, RefreshCw, Home } from 'lucide-react'
import type { ReactNode } from 'react'

export interface ActionableError {
  title: string
  message: string
  icon?: ReactNode
  action?: {
    label: string
    handler: () => void
  }
  showRetry?: boolean
  retryAction?: () => void
}

export const ErrorMessages: Record<string, ActionableError> = {
  // Session errors
  SESSION_NOT_FOUND: {
    title: "Session not found",
    message: "This session may have expired. Would you like to start a new one?",
    icon: <AlertCircle className="h-6 w-6 text-red-500" />,
    action: {
      label: "Start New Session",
      handler: () => window.location.href = '/'
    }
  },
  
  SESSION_EXPIRED: {
    title: "Session expired",
    message: "Sessions expire after 12 hours. Please start a new session to continue.",
    icon: <AlertCircle className="h-6 w-6 text-orange-500" />,
    action: {
      label: "Go to Home",
      handler: () => window.location.href = '/'
    }
  },
  
  SESSION_FULL: {
    title: "Session is full",
    message: "This session already has 2 participants. Please create a new session.",
    icon: <AlertCircle className="h-6 w-6 text-yellow-500" />,
    action: {
      label: "Create New Session",
      handler: () => window.location.href = '/'
    }
  },
  
  // Connection errors
  CONNECTION_LOST: {
    title: "Connection lost",
    message: "We're trying to reconnect you automatically...",
    icon: <WifiOff className="h-6 w-6 text-gray-500" />,
    showRetry: true
  },
  
  PARTNER_DISCONNECTED: {
    title: "Partner disconnected",
    message: "Your partner's connection was interrupted. They can rejoin when ready.",
    icon: <WifiOff className="h-6 w-6 text-gray-500" />
  },
  
  NETWORK_ERROR: {
    title: "Network error",
    message: "Please check your internet connection and try again.",
    icon: <WifiOff className="h-6 w-6 text-red-500" />,
    showRetry: true
  },
  
  // Audio errors
  MICROPHONE_DENIED: {
    title: "Microphone access denied",
    message: "Please grant microphone permission in your browser settings and refresh the page.",
    icon: <Mic className="h-6 w-6 text-red-500" />,
    action: {
      label: "Refresh Page",
      handler: () => window.location.reload()
    }
  },
  
  MICROPHONE_NOT_FOUND: {
    title: "No microphone detected",
    message: "Please connect a microphone and refresh the page.",
    icon: <Mic className="h-6 w-6 text-red-500" />,
    action: {
      label: "Refresh Page",
      handler: () => window.location.reload()
    }
  },
  
  RECORDING_FAILED: {
    title: "Recording failed",
    message: "There was an issue with your microphone. Please try again.",
    icon: <Mic className="h-6 w-6 text-red-500" />,
    showRetry: true
  },
  
  // Processing errors
  TRANSCRIPTION_FAILED: {
    title: "Couldn't understand audio",
    message: "Please speak clearly and try again. Make sure there's minimal background noise.",
    icon: <AlertCircle className="h-6 w-6 text-orange-500" />,
    showRetry: true
  },
  
  TRANSLATION_FAILED: {
    title: "Translation failed",
    message: "We couldn't translate your message. Please try again.",
    icon: <AlertCircle className="h-6 w-6 text-orange-500" />,
    showRetry: true
  },
  
  // API errors
  API_KEY_INVALID: {
    title: "Configuration error",
    message: "The translation service is not properly configured. Please contact support.",
    icon: <AlertCircle className="h-6 w-6 text-red-500" />
  },
  
  RATE_LIMIT_EXCEEDED: {
    title: "Too many requests",
    message: "You've sent too many messages. Please wait a moment before trying again.",
    icon: <AlertCircle className="h-6 w-6 text-yellow-500" />
  },
  
  // Generic errors
  UNKNOWN_ERROR: {
    title: "Something went wrong",
    message: "An unexpected error occurred. Please try again.",
    icon: <AlertCircle className="h-6 w-6 text-red-500" />,
    showRetry: true
  }
}

/**
 * Get an actionable error configuration by error code
 */
export function getErrorConfig(errorCode: string): ActionableError {
  return ErrorMessages[errorCode] || ErrorMessages.UNKNOWN_ERROR
}

/**
 * Parse error message and return appropriate error config
 */
export function parseError(error: Error | string): ActionableError {
  const errorMessage = typeof error === 'string' ? error : error.message
  
  // Match common error patterns
  if (errorMessage.includes('NotAllowedError') || errorMessage.includes('Permission denied')) {
    return ErrorMessages.MICROPHONE_DENIED
  }
  
  if (errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch')) {
    return ErrorMessages.NETWORK_ERROR
  }
  
  if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
    return ErrorMessages.RATE_LIMIT_EXCEEDED
  }
  
  if (errorMessage.includes('session') && errorMessage.includes('not found')) {
    return ErrorMessages.SESSION_NOT_FOUND
  }
  
  if (errorMessage.includes('session') && errorMessage.includes('expired')) {
    return ErrorMessages.SESSION_EXPIRED
  }
  
  if (errorMessage.includes('session') && errorMessage.includes('full')) {
    return ErrorMessages.SESSION_FULL
  }
  
  if (errorMessage.includes('microphone') || errorMessage.includes('audio')) {
    return ErrorMessages.RECORDING_FAILED
  }
  
  if (errorMessage.includes('transcription') || errorMessage.includes('whisper')) {
    return ErrorMessages.TRANSCRIPTION_FAILED
  }
  
  if (errorMessage.includes('translation')) {
    return ErrorMessages.TRANSLATION_FAILED
  }
  
  if (errorMessage.includes('Invalid API key') || errorMessage.includes('401')) {
    return ErrorMessages.API_KEY_INVALID
  }
  
  return ErrorMessages.UNKNOWN_ERROR
}