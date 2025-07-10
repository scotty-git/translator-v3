/**
 * TranslatorShared Component Library
 * 
 * Reusable UI components for both SoloTranslator and SessionTranslator
 * Extracted from SingleDeviceTranslator during Phase 2a refactor
 */

export { MessageBubble } from './MessageBubble'
export { ActivityIndicator } from './ActivityIndicator'
export { AudioVisualization, AudioFrequencyAnalyzer } from './AudioVisualization'
export { ScrollToBottomButton } from './ScrollToBottomButton'
export { UnreadMessagesDivider } from './UnreadMessagesDivider'
export { ErrorDisplay, InlineError, ErrorToast } from './ErrorDisplay'

// Re-export types
export type { QueuedMessage } from './MessageBubble'