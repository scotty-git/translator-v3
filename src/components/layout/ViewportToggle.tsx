import { useState, useEffect, ReactNode } from 'react'
import { Smartphone, Monitor } from 'lucide-react'
import { clsx } from 'clsx'

interface ViewportToggleProps {
  children: ReactNode
}

export function ViewportToggle({ children }: ViewportToggleProps) {
  // Check if we're on desktop (screen width > 768px)
  const isDesktop = typeof window !== 'undefined' && window.innerWidth > 768
  
  // Default to mobile view on desktop, full width on actual mobile
  const [isMobileView, setIsMobileView] = useState(() => {
    if (typeof window === 'undefined') return false
    const saved = localStorage.getItem('viewport-mode')
    return isDesktop ? (saved !== 'desktop') : false
  })

  // Save preference
  useEffect(() => {
    if (isDesktop) {
      localStorage.setItem('viewport-mode', isMobileView ? 'mobile' : 'desktop')
    }
  }, [isMobileView, isDesktop])

  // Don't show toggle on actual mobile devices
  if (!isDesktop) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Toggle Button - Fixed at top right */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setIsMobileView(!isMobileView)}
          className={clsx(
            'flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200',
            'bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700',
            'hover:shadow-xl hover:scale-105 active:scale-95'
          )}
          title={`Switch to ${isMobileView ? 'desktop' : 'mobile'} view`}
        >
          {isMobileView ? (
            <>
              <Monitor className="h-4 w-4" />
              <span className="text-sm font-medium">Desktop View</span>
            </>
          ) : (
            <>
              <Smartphone className="h-4 w-4" />
              <span className="text-sm font-medium">Mobile View</span>
            </>
          )}
        </button>
      </div>

      {/* Viewport Container */}
      {isMobileView ? (
        <div className="flex items-center justify-center min-h-screen p-8">
          {/* Phone Frame */}
          <div className="relative">
            {/* Device Frame */}
            <div className={clsx(
              'relative rounded-[2.5rem] border-[14px] border-gray-800 dark:border-gray-700',
              'shadow-2xl bg-gray-800 dark:bg-gray-700'
            )}>
              {/* Notch */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-7 bg-gray-800 dark:bg-gray-700 rounded-b-2xl" />
              
              {/* Screen */}
              <div className={clsx(
                'relative w-[390px] h-[844px] bg-white dark:bg-gray-950',
                'rounded-[2rem] overflow-hidden'
              )}>
                {/* Status Bar */}
                <div className="absolute top-0 left-0 right-0 h-11 bg-black/5 dark:bg-white/5 z-10 flex items-center justify-between px-6 pt-1">
                  <span className="text-xs font-medium text-gray-800 dark:text-gray-200">9:41</span>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-3 bg-gray-800 dark:bg-gray-200 rounded-sm"></div>
                    <div className="w-4 h-3 bg-gray-800 dark:bg-gray-200 rounded-sm"></div>
                    <div className="w-6 h-3 bg-gray-800 dark:bg-gray-200 rounded-sm"></div>
                  </div>
                </div>
                
                {/* App Content - Important: Use flex to ensure proper height management */}
                <div className="w-full h-full pt-11 flex flex-col">
                  <div className="flex-1 overflow-auto">
                    {children}
                  </div>
                </div>
              </div>
            </div>

            {/* Side Buttons */}
            <div className="absolute right-[-14px] top-32 w-1 h-16 bg-gray-800 dark:bg-gray-700 rounded-r" />
            <div className="absolute left-[-14px] top-24 w-1 h-12 bg-gray-800 dark:bg-gray-700 rounded-l" />
            <div className="absolute left-[-14px] top-40 w-1 h-20 bg-gray-800 dark:bg-gray-700 rounded-l" />
          </div>

          {/* Device Info */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              iPhone 14 Pro Max (390×844)
            </p>
          </div>
        </div>
      ) : (
        // Desktop View - Full Width
        <div className="min-h-screen">
          {children}
        </div>
      )}
    </div>
  )
}