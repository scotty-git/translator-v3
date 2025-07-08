import { createContext, useContext, ReactNode } from 'react'
import type { Session } from '@/types/database'

interface SessionContextValue {
  session: Session | null
  userId: string
  isLeft: boolean
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({
  children,
  session,
  userId,
  isLeft,
}: {
  children: ReactNode
  session: Session | null
  userId: string
  isLeft: boolean
}) {
  return (
    <SessionContext.Provider value={{ session, userId, isLeft }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within SessionProvider')
  }
  return context
}