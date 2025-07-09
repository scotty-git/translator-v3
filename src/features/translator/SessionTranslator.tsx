import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * SessionTranslator - Placeholder for Phase 2
 * This will wrap SingleDeviceTranslator with session functionality
 */
export function SessionTranslator() {
  const navigate = useNavigate()

  useEffect(() => {
    // Check if we have an active session
    const sessionInfo = localStorage.getItem('activeSession')
    if (!sessionInfo) {
      // No session info, redirect to home
      navigate('/')
      return
    }

    const session = JSON.parse(sessionInfo)
    console.log('📍 [SessionTranslator] Session loaded:', session.sessionCode)
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center space-y-4 p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Session Mode
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Session functionality will be implemented in Phase 2
        </p>
        <button
          onClick={() => {
            localStorage.removeItem('activeSession')
            navigate('/')
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}