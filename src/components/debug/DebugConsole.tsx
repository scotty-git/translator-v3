import { useState, useEffect, useRef } from 'react'
import { Copy, X, Bug } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface LogEntry {
  id: number
  type: 'log' | 'error' | 'warn' | 'info'
  timestamp: string
  message: string
  details?: any
}

export function DebugConsole() {
  const [isOpen, setIsOpen] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const logIdRef = useRef(0)

  useEffect(() => {
    // Store original console methods
    const originalLog = console.log
    const originalError = console.error
    const originalWarn = console.warn
    const originalInfo = console.info

    // Helper to format log entries
    const addLog = (type: LogEntry['type'], ...args: any[]) => {
      const entry: LogEntry = {
        id: logIdRef.current++,
        type,
        timestamp: new Date().toLocaleTimeString(),
        message: args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' '),
        details: args.length > 1 ? args : undefined
      }
      
      setLogs(prev => [...prev.slice(-99), entry]) // Keep last 100 logs
    }

    // Override console methods
    console.log = (...args) => {
      originalLog.apply(console, args)
      addLog('log', ...args)
    }

    console.error = (...args) => {
      originalError.apply(console, args)
      addLog('error', ...args)
    }

    console.warn = (...args) => {
      originalWarn.apply(console, args)
      addLog('warn', ...args)
    }

    console.info = (...args) => {
      originalInfo.apply(console, args)
      addLog('info', ...args)
    }

    // Log initial device info
    console.log('🔍 Debug Console Active')
    console.log('📱 User Agent:', navigator.userAgent)
    console.log('🌐 Platform:', navigator.platform)
    console.log('📍 URL:', window.location.href)

    // Cleanup
    return () => {
      console.log = originalLog
      console.error = originalError
      console.warn = originalWarn
      console.info = originalInfo
    }
  }, [])

  const copyLogs = () => {
    const logText = logs.map(log => 
      `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}`
    ).join('\n')
    
    navigator.clipboard.writeText(logText).then(() => {
      console.log('📋 Logs copied to clipboard')
    }).catch(err => {
      console.error('Failed to copy logs:', err)
    })
  }

  const clearLogs = () => {
    setLogs([])
    console.log('🧹 Logs cleared')
  }

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error': return 'text-red-600 dark:text-red-400'
      case 'warn': return 'text-yellow-600 dark:text-yellow-400'
      case 'info': return 'text-blue-600 dark:text-blue-400'
      default: return 'text-gray-700 dark:text-gray-300'
    }
  }

  // Only show on mobile/tablet
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024

  if (!isMobile) return null

  return (
    <>
      {/* Debug Button - Small and unobtrusive */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-40 w-10 h-10 bg-gray-800 dark:bg-gray-700 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
        aria-label="Open debug console"
      >
        <Bug className="h-5 w-5" />
      </button>

      {/* Debug Console Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50">
          <div className="absolute inset-x-0 bottom-0 h-[70vh] bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Debug Console
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  onClick={clearLogs}
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                >
                  Clear
                </Button>
                <Button
                  onClick={copyLogs}
                  size="sm"
                  variant="primary"
                  className="text-xs"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy Logs
                </Button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Logs */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
              {logs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No logs yet...</p>
              ) : (
                logs.map(log => (
                  <div
                    key={log.id}
                    className={`${getLogColor(log.type)} break-all`}
                  >
                    <span className="text-gray-500">[{log.timestamp}]</span>{' '}
                    <span className="font-semibold">{log.type.toUpperCase()}:</span>{' '}
                    <span className="whitespace-pre-wrap">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}