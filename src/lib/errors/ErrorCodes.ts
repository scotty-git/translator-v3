/**
 * Comprehensive Error Code Definitions for Phase 8
 * Central registry of all error types with classification
 */

export enum ErrorCode {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT', 
  NETWORK_OFFLINE = 'NETWORK_OFFLINE',
  NETWORK_SLOW = 'NETWORK_SLOW',
  
  // API errors - OpenAI
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  API_QUOTA_EXCEEDED = 'API_QUOTA_EXCEEDED',
  API_INVALID_KEY = 'API_INVALID_KEY',
  API_SERVICE_DOWN = 'API_SERVICE_DOWN',
  API_INVALID_REQUEST = 'API_INVALID_REQUEST',
  API_TIMEOUT = 'API_TIMEOUT',
  
  // API errors - Supabase
  SUPABASE_AUTH_ERROR = 'SUPABASE_AUTH_ERROR',
  SUPABASE_CONNECTION_ERROR = 'SUPABASE_CONNECTION_ERROR',
  SUPABASE_PERMISSION_ERROR = 'SUPABASE_PERMISSION_ERROR',
  SUPABASE_QUOTA_ERROR = 'SUPABASE_QUOTA_ERROR',
  
  // Audio errors
  AUDIO_PERMISSION_DENIED = 'AUDIO_PERMISSION_DENIED',
  AUDIO_NOT_SUPPORTED = 'AUDIO_NOT_SUPPORTED',
  AUDIO_RECORDING_FAILED = 'AUDIO_RECORDING_FAILED',
  AUDIO_TOO_SHORT = 'AUDIO_TOO_SHORT',
  AUDIO_TOO_LONG = 'AUDIO_TOO_LONG',
  AUDIO_DEVICE_ERROR = 'AUDIO_DEVICE_ERROR',
  AUDIO_FORMAT_ERROR = 'AUDIO_FORMAT_ERROR',
  
  
  // Translation errors
  TRANSLATION_FAILED = 'TRANSLATION_FAILED',
  LANGUAGE_NOT_DETECTED = 'LANGUAGE_NOT_DETECTED',
  LANGUAGE_NOT_SUPPORTED = 'LANGUAGE_NOT_SUPPORTED',
  TRANSLATION_TOO_LONG = 'TRANSLATION_TOO_LONG',
  TRANSLATION_INAPPROPRIATE = 'TRANSLATION_INAPPROPRIATE',
  
  // Transcription errors
  TRANSCRIPTION_FAILED = 'TRANSCRIPTION_FAILED',
  TRANSCRIPTION_NO_SPEECH = 'TRANSCRIPTION_NO_SPEECH',
  TRANSCRIPTION_UNCLEAR = 'TRANSCRIPTION_UNCLEAR',
  TRANSCRIPTION_LANGUAGE_MISMATCH = 'TRANSCRIPTION_LANGUAGE_MISMATCH',
  
  // TTS errors
  TTS_FAILED = 'TTS_FAILED',
  TTS_QUOTA_EXCEEDED = 'TTS_QUOTA_EXCEEDED',
  TTS_VOICE_NOT_AVAILABLE = 'TTS_VOICE_NOT_AVAILABLE',
  TTS_TEXT_TOO_LONG = 'TTS_TEXT_TOO_LONG',
  
  // Storage errors
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  STORAGE_NOT_AVAILABLE = 'STORAGE_NOT_AVAILABLE',
  STORAGE_CORRUPTION = 'STORAGE_CORRUPTION',
  STORAGE_PERMISSION_DENIED = 'STORAGE_PERMISSION_DENIED',
  
  // Permission errors
  PERMISSION_MICROPHONE_DENIED = 'PERMISSION_MICROPHONE_DENIED',
  PERMISSION_NOTIFICATION_DENIED = 'PERMISSION_NOTIFICATION_DENIED',
  PERMISSION_STORAGE_DENIED = 'PERMISSION_STORAGE_DENIED',
  PERMISSION_CAMERA_DENIED = 'PERMISSION_CAMERA_DENIED',
  
  // Cache errors
  CACHE_ERROR = 'CACHE_ERROR',
  CACHE_CORRUPTION = 'CACHE_CORRUPTION',
  CACHE_QUOTA_EXCEEDED = 'CACHE_QUOTA_EXCEEDED',
  
  // Worker errors
  WORKER_FAILED = 'WORKER_FAILED',
  WORKER_NOT_SUPPORTED = 'WORKER_NOT_SUPPORTED',
  WORKER_TIMEOUT = 'WORKER_TIMEOUT',
  
  // Memory errors
  MEMORY_PRESSURE = 'MEMORY_PRESSURE',
  MEMORY_ALLOCATION_FAILED = 'MEMORY_ALLOCATION_FAILED',
  
  // User input errors
  INPUT_VALIDATION_ERROR = 'INPUT_VALIDATION_ERROR',
  INPUT_TOO_LONG = 'INPUT_TOO_LONG',
  INPUT_INVALID_FORMAT = 'INPUT_INVALID_FORMAT',
  
  // Browser/Device errors
  BROWSER_NOT_SUPPORTED = 'BROWSER_NOT_SUPPORTED',
  DEVICE_ORIENTATION_ERROR = 'DEVICE_ORIENTATION_ERROR',
  DEVICE_BATTERY_LOW = 'DEVICE_BATTERY_LOW',
  
  // Rapid interaction errors
  RATE_LIMITED_USER = 'RATE_LIMITED_USER',
  CONCURRENT_OPERATION = 'CONCURRENT_OPERATION',
  OPERATION_CANCELLED = 'OPERATION_CANCELLED',
  
  // Unknown/Generic
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  COMPONENT_CRASH = 'COMPONENT_CRASH',
  UNEXPECTED_STATE = 'UNEXPECTED_STATE'
}

export enum ErrorSeverity {
  LOW = 'low',      // Minor issues, user can continue
  MEDIUM = 'medium', // Significant issues, some features affected
  HIGH = 'high',    // Major issues, core functionality affected
  CRITICAL = 'critical' // App-breaking issues, immediate attention needed
}

export enum ErrorCategory {
  NETWORK = 'network',
  AUDIO = 'audio', 
  API = 'api',
  PERMISSION = 'permission',
  STORAGE = 'storage',
  USER_INPUT = 'user_input',
  SYSTEM = 'system'
}

/**
 * Error metadata for classification and handling
 */
export interface ErrorMetadata {
  code: ErrorCode
  severity: ErrorSeverity
  category: ErrorCategory
  retryable: boolean
  userActionRequired: boolean
  autoRecoverable: boolean
  showToUser: boolean
  logToAnalytics: boolean
}

/**
 * Complete error classification registry
 */
export const ERROR_REGISTRY: Record<ErrorCode, ErrorMetadata> = {
  // Network errors
  [ErrorCode.NETWORK_ERROR]: {
    code: ErrorCode.NETWORK_ERROR,
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.NETWORK,
    retryable: true,
    userActionRequired: false,
    autoRecoverable: true,
    showToUser: true,
    logToAnalytics: true
  },
  [ErrorCode.NETWORK_TIMEOUT]: {
    code: ErrorCode.NETWORK_TIMEOUT,
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.NETWORK,
    retryable: true,
    userActionRequired: false,
    autoRecoverable: true,
    showToUser: true,
    logToAnalytics: true
  },
  [ErrorCode.NETWORK_OFFLINE]: {
    code: ErrorCode.NETWORK_OFFLINE,
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.NETWORK,
    retryable: true,
    userActionRequired: true,
    autoRecoverable: false,
    showToUser: true,
    logToAnalytics: true
  },
  [ErrorCode.NETWORK_SLOW]: {
    code: ErrorCode.NETWORK_SLOW,
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.NETWORK,
    retryable: false,
    userActionRequired: false,
    autoRecoverable: true,
    showToUser: true,
    logToAnalytics: false
  },

  // API errors - OpenAI
  [ErrorCode.API_RATE_LIMIT]: {
    code: ErrorCode.API_RATE_LIMIT,
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.API,
    retryable: true,
    userActionRequired: false,
    autoRecoverable: true,
    showToUser: true,
    logToAnalytics: true
  },
  [ErrorCode.API_QUOTA_EXCEEDED]: {
    code: ErrorCode.API_QUOTA_EXCEEDED,
    severity: ErrorSeverity.CRITICAL,
    category: ErrorCategory.API,
    retryable: false,
    userActionRequired: true,
    autoRecoverable: false,
    showToUser: true,
    logToAnalytics: true
  },
  [ErrorCode.API_INVALID_KEY]: {
    code: ErrorCode.API_INVALID_KEY,
    severity: ErrorSeverity.CRITICAL,
    category: ErrorCategory.API,
    retryable: false,
    userActionRequired: true,
    autoRecoverable: false,
    showToUser: false,
    logToAnalytics: true
  },
  [ErrorCode.API_SERVICE_DOWN]: {
    code: ErrorCode.API_SERVICE_DOWN,
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.API,
    retryable: true,
    userActionRequired: false,
    autoRecoverable: true,
    showToUser: true,
    logToAnalytics: true
  },
  [ErrorCode.API_INVALID_REQUEST]: {
    code: ErrorCode.API_INVALID_REQUEST,
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.API,
    retryable: false,
    userActionRequired: false,
    autoRecoverable: false,
    showToUser: false,
    logToAnalytics: true
  },
  [ErrorCode.API_TIMEOUT]: {
    code: ErrorCode.API_TIMEOUT,
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.API,
    retryable: true,
    userActionRequired: false,
    autoRecoverable: true,
    showToUser: true,
    logToAnalytics: true
  },

  // Supabase errors
  [ErrorCode.SUPABASE_AUTH_ERROR]: {
    code: ErrorCode.SUPABASE_AUTH_ERROR,
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.API,
    retryable: false,
    userActionRequired: true,
    autoRecoverable: false,
    showToUser: false,
    logToAnalytics: true
  },
  [ErrorCode.SUPABASE_CONNECTION_ERROR]: {
    code: ErrorCode.SUPABASE_CONNECTION_ERROR,
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.NETWORK,
    retryable: true,
    userActionRequired: false,
    autoRecoverable: true,
    showToUser: true,
    logToAnalytics: true
  },
  [ErrorCode.SUPABASE_PERMISSION_ERROR]: {
    code: ErrorCode.SUPABASE_PERMISSION_ERROR,
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.PERMISSION,
    retryable: false,
    userActionRequired: true,
    autoRecoverable: false,
    showToUser: false,
    logToAnalytics: true
  },
  [ErrorCode.SUPABASE_QUOTA_ERROR]: {
    code: ErrorCode.SUPABASE_QUOTA_ERROR,
    severity: ErrorSeverity.CRITICAL,
    category: ErrorCategory.API,
    retryable: false,
    userActionRequired: true,
    autoRecoverable: false,
    showToUser: true,
    logToAnalytics: true
  },

  // Audio errors
  [ErrorCode.AUDIO_PERMISSION_DENIED]: {
    code: ErrorCode.AUDIO_PERMISSION_DENIED,
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.PERMISSION,
    retryable: false,
    userActionRequired: true,
    autoRecoverable: false,
    showToUser: true,
    logToAnalytics: true
  },
  [ErrorCode.AUDIO_NOT_SUPPORTED]: {
    code: ErrorCode.AUDIO_NOT_SUPPORTED,
    severity: ErrorSeverity.CRITICAL,
    category: ErrorCategory.SYSTEM,
    retryable: false,
    userActionRequired: true,
    autoRecoverable: false,
    showToUser: true,
    logToAnalytics: true
  },
  [ErrorCode.AUDIO_RECORDING_FAILED]: {
    code: ErrorCode.AUDIO_RECORDING_FAILED,
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.AUDIO,
    retryable: true,
    userActionRequired: false,
    autoRecoverable: true,
    showToUser: true,
    logToAnalytics: true
  },
  [ErrorCode.AUDIO_TOO_SHORT]: {
    code: ErrorCode.AUDIO_TOO_SHORT,
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.USER_INPUT,
    retryable: false,
    userActionRequired: true,
    autoRecoverable: false,
    showToUser: true,
    logToAnalytics: false
  },
  [ErrorCode.AUDIO_TOO_LONG]: {
    code: ErrorCode.AUDIO_TOO_LONG,
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.USER_INPUT,
    retryable: false,
    userActionRequired: true,
    autoRecoverable: false,
    showToUser: true,
    logToAnalytics: false
  },
  [ErrorCode.AUDIO_DEVICE_ERROR]: {
    code: ErrorCode.AUDIO_DEVICE_ERROR,
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.SYSTEM,
    retryable: true,
    userActionRequired: true,
    autoRecoverable: false,
    showToUser: true,
    logToAnalytics: true
  },
  [ErrorCode.AUDIO_FORMAT_ERROR]: {
    code: ErrorCode.AUDIO_FORMAT_ERROR,
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.AUDIO,
    retryable: false,
    userActionRequired: false,
    autoRecoverable: true,
    showToUser: false,
    logToAnalytics: true
  },


  // Translation errors
  [ErrorCode.TRANSLATION_FAILED]: {
    code: ErrorCode.TRANSLATION_FAILED,
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.API,
    retryable: true,
    userActionRequired: false,
    autoRecoverable: true,
    showToUser: true,
    logToAnalytics: true
  },
  [ErrorCode.LANGUAGE_NOT_DETECTED]: {
    code: ErrorCode.LANGUAGE_NOT_DETECTED,
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.USER_INPUT,
    retryable: false,
    userActionRequired: true,
    autoRecoverable: false,
    showToUser: true,
    logToAnalytics: false
  },
  [ErrorCode.LANGUAGE_NOT_SUPPORTED]: {
    code: ErrorCode.LANGUAGE_NOT_SUPPORTED,
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.USER_INPUT,
    retryable: false,
    userActionRequired: true,
    autoRecoverable: false,
    showToUser: true,
    logToAnalytics: true
  },
  [ErrorCode.TRANSLATION_TOO_LONG]: {
    code: ErrorCode.TRANSLATION_TOO_LONG,
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.USER_INPUT,
    retryable: false,
    userActionRequired: true,
    autoRecoverable: false,
    showToUser: true,
    logToAnalytics: false
  },
  [ErrorCode.TRANSLATION_INAPPROPRIATE]: {
    code: ErrorCode.TRANSLATION_INAPPROPRIATE,
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.API,
    retryable: false,
    userActionRequired: true,
    autoRecoverable: false,
    showToUser: true,
    logToAnalytics: true
  },

  // Transcription errors
  [ErrorCode.TRANSCRIPTION_FAILED]: {
    code: ErrorCode.TRANSCRIPTION_FAILED,
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.API,
    retryable: true,
    userActionRequired: false,
    autoRecoverable: true,
    showToUser: true,
    logToAnalytics: true
  },
  [ErrorCode.TRANSCRIPTION_NO_SPEECH]: {
    code: ErrorCode.TRANSCRIPTION_NO_SPEECH,
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.USER_INPUT,
    retryable: false,
    userActionRequired: true,
    autoRecoverable: false,
    showToUser: true,
    logToAnalytics: false
  },
  [ErrorCode.TRANSCRIPTION_UNCLEAR]: {
    code: ErrorCode.TRANSCRIPTION_UNCLEAR,
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.USER_INPUT,
    retryable: false,
    userActionRequired: true,
    autoRecoverable: false,
    showToUser: true,
    logToAnalytics: false
  },
  [ErrorCode.TRANSCRIPTION_LANGUAGE_MISMATCH]: {
    code: ErrorCode.TRANSCRIPTION_LANGUAGE_MISMATCH,
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.USER_INPUT,
    retryable: false,
    userActionRequired: true,
    autoRecoverable: false,
    showToUser: true,
    logToAnalytics: false
  },

  // TTS errors
  [ErrorCode.TTS_FAILED]: {
    code: ErrorCode.TTS_FAILED,
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.API,
    retryable: true,
    userActionRequired: false,
    autoRecoverable: true,
    showToUser: true,
    logToAnalytics: true
  },
  [ErrorCode.TTS_QUOTA_EXCEEDED]: {
    code: ErrorCode.TTS_QUOTA_EXCEEDED,
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.API,
    retryable: false,
    userActionRequired: true,
    autoRecoverable: false,
    showToUser: true,
    logToAnalytics: true
  },
  [ErrorCode.TTS_VOICE_NOT_AVAILABLE]: {
    code: ErrorCode.TTS_VOICE_NOT_AVAILABLE,
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.API,
    retryable: false,
    userActionRequired: false,
    autoRecoverable: true,
    showToUser: true,
    logToAnalytics: true
  },
  [ErrorCode.TTS_TEXT_TOO_LONG]: {
    code: ErrorCode.TTS_TEXT_TOO_LONG,
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.USER_INPUT,
    retryable: false,
    userActionRequired: true,
    autoRecoverable: false,
    showToUser: true,
    logToAnalytics: false
  },

  // Storage errors
  [ErrorCode.STORAGE_QUOTA_EXCEEDED]: {
    code: ErrorCode.STORAGE_QUOTA_EXCEEDED,
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.STORAGE,
    retryable: false,
    userActionRequired: true,
    autoRecoverable: true,
    showToUser: true,
    logToAnalytics: true
  },
  [ErrorCode.STORAGE_NOT_AVAILABLE]: {
    code: ErrorCode.STORAGE_NOT_AVAILABLE,
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.SYSTEM,
    retryable: false,
    userActionRequired: true,
    autoRecoverable: false,
    showToUser: true,
    logToAnalytics: true
  },
  [ErrorCode.STORAGE_CORRUPTION]: {
    code: ErrorCode.STORAGE_CORRUPTION,
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.STORAGE,
    retryable: false,
    userActionRequired: false,
    autoRecoverable: true,
    showToUser: true,
    logToAnalytics: true
  },
  [ErrorCode.STORAGE_PERMISSION_DENIED]: {
    code: ErrorCode.STORAGE_PERMISSION_DENIED,
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.PERMISSION,
    retryable: false,
    userActionRequired: true,
    autoRecoverable: false,
    showToUser: true,
    logToAnalytics: true
  },

  // Permission errors
  [ErrorCode.PERMISSION_MICROPHONE_DENIED]: {
    code: ErrorCode.PERMISSION_MICROPHONE_DENIED,
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.PERMISSION,
    retryable: false,
    userActionRequired: true,
    autoRecoverable: false,
    showToUser: true,
    logToAnalytics: true
  },
  [ErrorCode.PERMISSION_NOTIFICATION_DENIED]: {
    code: ErrorCode.PERMISSION_NOTIFICATION_DENIED,
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.PERMISSION,
    retryable: false,
    userActionRequired: true,
    autoRecoverable: false,
    showToUser: true,
    logToAnalytics: false
  },
  [ErrorCode.PERMISSION_STORAGE_DENIED]: {
    code: ErrorCode.PERMISSION_STORAGE_DENIED,
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.PERMISSION,
    retryable: false,
    userActionRequired: true,
    autoRecoverable: false,
    showToUser: true,
    logToAnalytics: true
  },
  [ErrorCode.PERMISSION_CAMERA_DENIED]: {
    code: ErrorCode.PERMISSION_CAMERA_DENIED,
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.PERMISSION,
    retryable: false,
    userActionRequired: true,
    autoRecoverable: false,
    showToUser: true,
    logToAnalytics: false
  },

  // Cache errors
  [ErrorCode.CACHE_ERROR]: {
    code: ErrorCode.CACHE_ERROR,
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.STORAGE,
    retryable: true,
    userActionRequired: false,
    autoRecoverable: true,
    showToUser: false,
    logToAnalytics: true
  },
  [ErrorCode.CACHE_CORRUPTION]: {
    code: ErrorCode.CACHE_CORRUPTION,
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.STORAGE,
    retryable: false,
    userActionRequired: false,
    autoRecoverable: true,
    showToUser: false,
    logToAnalytics: true
  },
  [ErrorCode.CACHE_QUOTA_EXCEEDED]: {
    code: ErrorCode.CACHE_QUOTA_EXCEEDED,
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.STORAGE,
    retryable: false,
    userActionRequired: false,
    autoRecoverable: true,
    showToUser: false,
    logToAnalytics: true
  },

  // Worker errors
  [ErrorCode.WORKER_FAILED]: {
    code: ErrorCode.WORKER_FAILED,
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.SYSTEM,
    retryable: true,
    userActionRequired: false,
    autoRecoverable: true,
    showToUser: false,
    logToAnalytics: true
  },
  [ErrorCode.WORKER_NOT_SUPPORTED]: {
    code: ErrorCode.WORKER_NOT_SUPPORTED,
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.SYSTEM,
    retryable: false,
    userActionRequired: false,
    autoRecoverable: true,
    showToUser: true,
    logToAnalytics: true
  },
  [ErrorCode.WORKER_TIMEOUT]: {
    code: ErrorCode.WORKER_TIMEOUT,
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.SYSTEM,
    retryable: true,
    userActionRequired: false,
    autoRecoverable: true,
    showToUser: false,
    logToAnalytics: true
  },

  // Memory errors
  [ErrorCode.MEMORY_PRESSURE]: {
    code: ErrorCode.MEMORY_PRESSURE,
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.SYSTEM,
    retryable: false,
    userActionRequired: false,
    autoRecoverable: true,
    showToUser: true,
    logToAnalytics: true
  },
  [ErrorCode.MEMORY_ALLOCATION_FAILED]: {
    code: ErrorCode.MEMORY_ALLOCATION_FAILED,
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.SYSTEM,
    retryable: true,
    userActionRequired: false,
    autoRecoverable: true,
    showToUser: false,
    logToAnalytics: true
  },

  // User input errors
  [ErrorCode.INPUT_VALIDATION_ERROR]: {
    code: ErrorCode.INPUT_VALIDATION_ERROR,
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.USER_INPUT,
    retryable: false,
    userActionRequired: true,
    autoRecoverable: false,
    showToUser: true,
    logToAnalytics: false
  },
  [ErrorCode.INPUT_TOO_LONG]: {
    code: ErrorCode.INPUT_TOO_LONG,
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.USER_INPUT,
    retryable: false,
    userActionRequired: true,
    autoRecoverable: false,
    showToUser: true,
    logToAnalytics: false
  },
  [ErrorCode.INPUT_INVALID_FORMAT]: {
    code: ErrorCode.INPUT_INVALID_FORMAT,
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.USER_INPUT,
    retryable: false,
    userActionRequired: true,
    autoRecoverable: false,
    showToUser: true,
    logToAnalytics: false
  },

  // Browser/Device errors
  [ErrorCode.BROWSER_NOT_SUPPORTED]: {
    code: ErrorCode.BROWSER_NOT_SUPPORTED,
    severity: ErrorSeverity.CRITICAL,
    category: ErrorCategory.SYSTEM,
    retryable: false,
    userActionRequired: true,
    autoRecoverable: false,
    showToUser: true,
    logToAnalytics: true
  },
  [ErrorCode.DEVICE_ORIENTATION_ERROR]: {
    code: ErrorCode.DEVICE_ORIENTATION_ERROR,
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.SYSTEM,
    retryable: false,
    userActionRequired: true,
    autoRecoverable: false,
    showToUser: true,
    logToAnalytics: false
  },
  [ErrorCode.DEVICE_BATTERY_LOW]: {
    code: ErrorCode.DEVICE_BATTERY_LOW,
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.SYSTEM,
    retryable: false,
    userActionRequired: true,
    autoRecoverable: false,
    showToUser: true,
    logToAnalytics: false
  },

  // Rapid interaction errors
  [ErrorCode.RATE_LIMITED_USER]: {
    code: ErrorCode.RATE_LIMITED_USER,
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.USER_INPUT,
    retryable: true,
    userActionRequired: true,
    autoRecoverable: true,
    showToUser: true,
    logToAnalytics: false
  },
  [ErrorCode.CONCURRENT_OPERATION]: {
    code: ErrorCode.CONCURRENT_OPERATION,
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.SYSTEM,
    retryable: true,
    userActionRequired: false,
    autoRecoverable: true,
    showToUser: false,
    logToAnalytics: true
  },
  [ErrorCode.OPERATION_CANCELLED]: {
    code: ErrorCode.OPERATION_CANCELLED,
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.USER_INPUT,
    retryable: false,
    userActionRequired: false,
    autoRecoverable: false,
    showToUser: false,
    logToAnalytics: false
  },

  // Unknown/Generic
  [ErrorCode.UNKNOWN_ERROR]: {
    code: ErrorCode.UNKNOWN_ERROR,
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.SYSTEM,
    retryable: true,
    userActionRequired: false,
    autoRecoverable: false,
    showToUser: true,
    logToAnalytics: true
  },
  [ErrorCode.COMPONENT_CRASH]: {
    code: ErrorCode.COMPONENT_CRASH,
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.SYSTEM,
    retryable: false,
    userActionRequired: false,
    autoRecoverable: true,
    showToUser: true,
    logToAnalytics: true
  },
  [ErrorCode.UNEXPECTED_STATE]: {
    code: ErrorCode.UNEXPECTED_STATE,
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.SYSTEM,
    retryable: true,
    userActionRequired: false,
    autoRecoverable: true,
    showToUser: false,
    logToAnalytics: true
  }
}