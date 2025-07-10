export type ActivityState = 'idle' | 'recording' | 'processing' | 'typing'

export interface PresenceData {
  userId: string
  activity: ActivityState
  lastSeen: string
  isOnline: boolean
}

export interface IPresenceService {
  initialize(sessionId: string, userId: string): Promise<void>
  updateActivity(activity: ActivityState): Promise<void>
  subscribeToPresence(callback: (isOnline: boolean) => void): () => void
  subscribeToActivity(callback: (activity: ActivityState) => void): () => void
  getOnlineUsers(): PresenceData[]
  cleanup(): void
}