import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { performanceLogger } from '@/lib/performance'
import { useConnectionStatus } from '@/hooks/useConnectionStatus'
import { MessageService } from '@/services/supabase/messages'
import { ActivityService } from '@/services/supabase/activity'
import { SessionService } from '@/services/supabase/sessions'
import type { Message } from '@/types/database'

export function Phase3Test() {
  const connectionStatus = useConnectionStatus()
  const [messages, setMessages] = useState<Message[]>([])
  const [sessionId, setSessionId] = useState<string>('')
  const [userId] = useState(() => crypto.randomUUID())
  const [isTyping, setIsTyping] = useState(false)
  const [partnerStatus, setPartnerStatus] = useState<string>('idle')

  // Create test session on mount
  useEffect(() => {
    async function createTestSession() {
      try {
        const session = await SessionService.createSession()
        setSessionId(session.id)
        console.log('Test session created:', session.code)
      } catch (error) {
        console.error('Failed to create test session:', error)
      }
    }
    createTestSession()
  }, [])

  // Subscribe to messages
  useEffect(() => {
    if (!sessionId) return

    const channel = MessageService.subscribeToMessages(sessionId, (message) => {
      console.log('New message received:', message)
      setMessages(prev => [...prev, message])
    })

    return () => {
      channel.unsubscribe()
    }
  }, [sessionId])

  // Subscribe to activity
  useEffect(() => {
    if (!sessionId) return

    const channel = ActivityService.subscribeToActivities(sessionId, (activity) => {
      if (activity.user_id !== userId) {
        setPartnerStatus(activity.activity)
      }
    })

    return () => {
      channel.unsubscribe()
    }
  }, [sessionId, userId])

  // Test functions
  const testMessageQueue = async () => {
    if (!sessionId) return

    // Send 3 messages rapidly to test queue
    for (let i = 1; i <= 3; i++) {
      await MessageService.createMessage(
        sessionId,
        userId,
        `Test message ${i}`,
        'en',
        'es'
      )
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  const testStatusUpdate = async () => {
    if (!sessionId) return

    setIsTyping(true)
    await ActivityService.updateActivity(sessionId, userId, 'typing')
    
    setTimeout(async () => {
      setIsTyping(false)
      await ActivityService.updateActivity(sessionId, userId, 'idle')
    }, 3000)
  }

  const testPerformanceLogging = () => {
    // Test performance measurement
    performanceLogger.measure('test.operation', () => {
      // Simulate work
      const start = Date.now()
      while (Date.now() - start < 100) {
        // Busy wait
      }
    })

    // Show performance summary
    console.log('Performance Summary:', performanceLogger.getSummary())
  }

  const testConnectionRecovery = () => {
    // This will trigger the connection recovery mechanism
    connectionStatus.checkConnection()
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Phase 3 Real-time Features Test</h1>
      
      {/* Connection Status */}
      <Card>
        <h2 className="text-lg font-semibold mb-2">Connection Status</h2>
        <div className="space-y-2">
          <p>Connected: {connectionStatus.isConnected ? '✅' : '❌'}</p>
          <p>Retrying: {connectionStatus.isRetrying ? 'Yes' : 'No'}</p>
          <p>Retry Attempt: {connectionStatus.retryAttempt}</p>
          {connectionStatus.lastError && (
            <p className="text-red-500">Error: {connectionStatus.lastError}</p>
          )}
        </div>
      </Card>

      {/* Session Info */}
      <Card>
        <h2 className="text-lg font-semibold mb-2">Session Info</h2>
        <p>Session ID: {sessionId || 'Creating...'}</p>
        <p>User ID: {userId}</p>
      </Card>

      {/* Test Controls */}
      <Card>
        <h2 className="text-lg font-semibold mb-2">Test Controls</h2>
        <div className="space-y-2">
          <Button onClick={testMessageQueue} disabled={!sessionId}>
            Test Message Queue
          </Button>
          <Button onClick={testStatusUpdate} disabled={!sessionId || isTyping}>
            Test Status Update {isTyping && '(typing...)'}
          </Button>
          <Button onClick={testPerformanceLogging}>
            Test Performance Logging
          </Button>
          <Button onClick={testConnectionRecovery}>
            Test Connection Recovery
          </Button>
        </div>
      </Card>

      {/* Partner Status */}
      <Card>
        <h2 className="text-lg font-semibold mb-2">Partner Status</h2>
        <p>Status: {partnerStatus}</p>
      </Card>

      {/* Messages */}
      <Card>
        <h2 className="text-lg font-semibold mb-2">Messages ({messages.length})</h2>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {messages.map((msg) => (
            <div key={msg.id} className="p-2 bg-gray-100 rounded">
              <p className="text-sm text-gray-600">
                {new Date(msg.created_at).toLocaleTimeString()}
              </p>
              <p>{msg.original}</p>
              <p className="text-sm">Status: {msg.status}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}