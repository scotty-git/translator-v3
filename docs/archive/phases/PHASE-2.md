# Phase 2: Core UI Layout & Navigation

## Overview
Build the mobile-first responsive UI layout with session creation/join functionality and core navigation structure.

## Prerequisites
- Phase 0 & 1 completed
- Supabase connection working
- TypeScript types generated
- UnoCSS configured

## Goals
- Create mobile-first responsive design system
- Build home screen with session UI
- Implement session room layout
- Create reusable component library
- Set up routing and navigation
- Add loading and error states

## Implementation Steps

### 1. Install Additional Dependencies
```bash
npm install react-router-dom
npm install clsx
npm install lucide-react
```

### 2. Create Base UI Components

#### Button Component (src/components/ui/Button.tsx)
```typescript
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', fullWidth, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          'disabled:pointer-events-none disabled:opacity-50',
          'active:scale-[0.98] transition-transform',
          {
            // Variants
            'bg-blue-600 text-white hover:bg-blue-700': variant === 'primary',
            'bg-gray-200 text-gray-900 hover:bg-gray-300': variant === 'secondary',
            'hover:bg-gray-100 text-gray-700': variant === 'ghost',
            // Sizes
            'h-8 px-3 text-sm rounded-md': size === 'sm',
            'h-10 px-4 text-base rounded-lg': size === 'md',
            'h-12 px-6 text-lg rounded-lg': size === 'lg',
            // Full width
            'w-full': fullWidth,
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
```

#### Input Component (src/components/ui/Input.tsx)
```typescript
import { InputHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={clsx(
          'flex h-12 w-full rounded-lg border bg-white px-4 py-2 text-base',
          'placeholder:text-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          {
            'border-gray-300': !error,
            'border-red-500 focus:ring-red-500': error,
          },
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
```

#### Card Component (src/components/ui/Card.tsx)
```typescript
import { HTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered'
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'rounded-xl p-6',
          {
            'bg-white shadow-sm': variant === 'default',
            'bg-white border border-gray-200': variant === 'bordered',
          },
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'
```

#### Loading Spinner (src/components/ui/Spinner.tsx)
```typescript
import { clsx } from 'clsx'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <svg
      className={clsx(
        'animate-spin',
        {
          'h-4 w-4': size === 'sm',
          'h-6 w-6': size === 'md',
          'h-8 w-8': size === 'lg',
        },
        className
      )}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}
```

### 3. Create Layout Components

#### Main Layout (src/components/layout/Layout.tsx)
```typescript
import { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {children}
      </main>
    </div>
  )
}
```

#### Mobile Container (src/components/layout/MobileContainer.tsx)
```typescript
import { ReactNode } from 'react'
import { clsx } from 'clsx'

interface MobileContainerProps {
  children: ReactNode
  className?: string
}

export function MobileContainer({ children, className }: MobileContainerProps) {
  return (
    <div className={clsx('w-full max-w-md mx-auto', className)}>
      {children}
    </div>
  )
}
```

### 4. Create Home Screen Components

#### Home Screen (src/features/home/HomeScreen.tsx)
```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { MobileContainer } from '@/components/layout/MobileContainer'
import { Languages, Users } from 'lucide-react'
import { SessionService } from '@/services/supabase'

export function HomeScreen() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'create' | 'join' | null>(null)
  const [sessionCode, setSessionCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreateSession = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      const session = await SessionService.createSession()
      navigate(`/session/${session.code}`)
    } catch (err) {
      setError('Failed to create session. Please try again.')
      console.error('Create session error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinSession = async () => {
    if (sessionCode.length !== 4) {
      setError('Please enter a 4-digit code')
      return
    }

    setIsLoading(true)
    setError('')
    
    try {
      const session = await SessionService.joinSession(sessionCode)
      navigate(`/session/${session.code}`)
    } catch (err) {
      setError('Session not found or expired')
      console.error('Join session error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <MobileContainer className="min-h-screen flex flex-col justify-center py-12">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Languages className="h-16 w-16 text-blue-600" />
              <Users className="h-8 w-8 text-blue-500 absolute -bottom-1 -right-1" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Real-time Translator
          </h1>
          <p className="text-gray-600">
            Break language barriers instantly
          </p>
        </div>

        {/* Main Actions */}
        {mode === null && (
          <Card className="space-y-4">
            <Button
              onClick={() => setMode('create')}
              size="lg"
              fullWidth
              disabled={isLoading}
            >
              Create New Session
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>
            <Button
              onClick={() => setMode('join')}
              variant="secondary"
              size="lg"
              fullWidth
              disabled={isLoading}
            >
              Join Existing Session
            </Button>
          </Card>
        )}

        {/* Create Session */}
        {mode === 'create' && (
          <Card className="space-y-4">
            <h2 className="text-xl font-semibold text-center">
              Creating New Session
            </h2>
            <p className="text-sm text-gray-600 text-center">
              You'll get a 4-digit code to share
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleCreateSession}
                size="lg"
                fullWidth
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Create Session'}
              </Button>
              <Button
                onClick={() => {
                  setMode(null)
                  setError('')
                }}
                variant="ghost"
                size="lg"
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}
          </Card>
        )}

        {/* Join Session */}
        {mode === 'join' && (
          <Card className="space-y-4">
            <h2 className="text-xl font-semibold text-center">
              Join Session
            </h2>
            <p className="text-sm text-gray-600 text-center">
              Enter the 4-digit session code
            </p>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              placeholder="0000"
              value={sessionCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '')
                setSessionCode(value)
                setError('')
              }}
              className="text-center text-2xl font-mono tracking-widest"
              error={!!error}
              disabled={isLoading}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleJoinSession}
                size="lg"
                fullWidth
                disabled={isLoading || sessionCode.length !== 4}
              >
                {isLoading ? 'Joining...' : 'Join Session'}
              </Button>
              <Button
                onClick={() => {
                  setMode(null)
                  setSessionCode('')
                  setError('')
                }}
                variant="ghost"
                size="lg"
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>Sessions expire after 4 hours</p>
        </div>
      </div>
    </MobileContainer>
  )
}
```

### 5. Create Session Room Components

#### Session Context (src/features/session/SessionContext.tsx)
```typescript
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
```

#### Session Room Layout (src/features/session/SessionRoom.tsx)
```typescript
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { SessionService } from '@/services/supabase'
import { SessionProvider } from './SessionContext'
import { SessionHeader } from './SessionHeader'
import { MessageList } from '../messages/MessageList'
import { RecordingControls } from '../audio/RecordingControls'
import { Spinner } from '@/components/ui/Spinner'
import type { Session } from '@/types/database'

export function SessionRoom() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [userId] = useState(() => {
    // Get or create persistent user ID
    let id = localStorage.getItem('userId')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('userId', id)
    }
    return id
  })
  const [isLeft] = useState(() => {
    // Determine if user is left or right speaker
    // This is simplified - in production, track who created the session
    return Math.random() > 0.5
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!code) {
      navigate('/')
      return
    }

    loadSession()
  }, [code])

  const loadSession = async () => {
    if (!code) return

    try {
      const sessionData = await SessionService.joinSession(code)
      setSession(sessionData)
    } catch (err) {
      setError('Session not found or expired')
      setTimeout(() => navigate('/'), 2000)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-red-600">{error}</p>
          <p className="text-sm text-gray-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <SessionProvider session={session} userId={userId} isLeft={isLeft}>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <SessionHeader />
        
        <div className="flex-1 flex flex-col md:flex-row">
          {/* Desktop: Side by side, Mobile: Single column */}
          <div className="flex-1 flex flex-col">
            <MessageList />
          </div>
        </div>
        
        <RecordingControls />
      </div>
    </SessionProvider>
  )
}
```

#### Session Header (src/features/session/SessionHeader.tsx)
```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from './SessionContext'
import { Button } from '@/components/ui/Button'
import { Copy, Check, LogOut, Users } from 'lucide-react'

export function SessionHeader() {
  const { session } = useSession()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  if (!session) return null

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(session.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLeave = () => {
    if (confirm('Are you sure you want to leave this session?')) {
      navigate('/')
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Session Info */}
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm text-gray-600">Session Code</p>
              <div className="flex items-center gap-2">
                <span className="text-xl font-mono font-bold">
                  {session.code}
                </span>
                <Button
                  onClick={handleCopyCode}
                  variant="ghost"
                  size="sm"
                  className="p-1"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="hidden sm:flex items-center gap-1 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>{session.user_count} users</span>
            </div>
          </div>

          {/* Actions */}
          <Button
            onClick={handleLeave}
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Leave
          </Button>
        </div>
      </div>
    </header>
  )
}
```

### 6. Create Placeholder Components

#### Message List Placeholder (src/features/messages/MessageList.tsx)
```typescript
export function MessageList() {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="text-center text-gray-500 mt-8">
        <p>No messages yet</p>
        <p className="text-sm mt-2">Start recording to begin translation</p>
      </div>
    </div>
  )
}
```

#### Recording Controls Placeholder (src/features/audio/RecordingControls.tsx)
```typescript
import { Button } from '@/components/ui/Button'
import { Mic } from 'lucide-react'

export function RecordingControls() {
  return (
    <div className="bg-white border-t border-gray-200 p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex justify-center">
          <Button
            size="lg"
            className="rounded-full h-16 w-16"
            onClick={() => console.log('Recording not implemented yet')}
          >
            <Mic className="h-6 w-6" />
          </Button>
        </div>
        <p className="text-center text-sm text-gray-600 mt-2">
          Hold to record
        </p>
      </div>
    </div>
  )
}
```

### 7. Set Up Routing (src/App.tsx)
```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { HomeScreen } from '@/features/home/HomeScreen'
import { SessionRoom } from '@/features/session/SessionRoom'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <Layout>
            <HomeScreen />
          </Layout>
        } />
        <Route path="/session/:code" element={
          <SessionRoom />
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
```

### 8. Update Index CSS (src/index.css)
```css
@import "tailwindcss"; /* This is handled by UnoCSS */

/* Custom base styles */
@layer base {
  html {
    -webkit-tap-highlight-color: transparent;
    overscroll-behavior: none;
  }
  
  body {
    @apply antialiased;
    overscroll-behavior: none;
  }
  
  /* Prevent pull-to-refresh on mobile */
  body {
    position: fixed;
    width: 100%;
    height: 100%;
  }
  
  #root {
    height: 100%;
    overflow: auto;
    -webkit-overflow-scrolling: touch;
  }
}

/* Custom utilities */
@layer utilities {
  /* Hide scrollbar but keep functionality */
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}
```

### 9. Create Component Index Files

#### UI Components Index (src/components/ui/index.ts)
```typescript
export { Button } from './Button'
export { Input } from './Input'
export { Card } from './Card'
export { Spinner } from './Spinner'
```

#### Layout Components Index (src/components/layout/index.ts)
```typescript
export { Layout } from './Layout'
export { MobileContainer } from './MobileContainer'
```

## Tests

### Test 1: Component Rendering
```typescript
// tests/components/Button.test.tsx
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/Button'

describe('Button Component', () => {
  test('renders with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  test('applies variant classes', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>)
    expect(screen.getByText('Primary')).toHaveClass('bg-primary-600')
    
    rerender(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByText('Secondary')).toHaveClass('bg-gray-200')
  })
})
```

### Test 2: Navigation Flow
```typescript
// tests/navigation.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import App from '@/App'

describe('Navigation', () => {
  test('navigates from home to session', async () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )
    
    // Should start at home
    expect(screen.getByText('Real-time Translator')).toBeInTheDocument()
    
    // Click create session
    fireEvent.click(screen.getByText('Create New Session'))
    
    // Should show create UI
    expect(screen.getByText('Creating New Session')).toBeInTheDocument()
  })
})
```

### Test 3: Responsive Design
```typescript
// tests/responsive.test.tsx
describe('Responsive Design', () => {
  test('mobile container constrains width', () => {
    render(<MobileContainer>Content</MobileContainer>)
    const container = screen.getByText('Content').parentElement
    expect(container).toHaveClass('max-w-md')
  })
})
```

### Manual Test Checklist
- [ ] Home screen loads correctly
- [ ] Create session flow works
- [ ] Join session with valid code works
- [ ] Join session with invalid code shows error
- [ ] Session header displays code correctly
- [ ] Copy code button works
- [ ] Leave session returns to home
- [ ] Mobile responsive layout works
- [ ] Desktop responsive layout works
- [ ] Loading states display correctly
- [ ] Error states display correctly

## Refactoring Checklist
- [ ] Extract color constants to theme
- [ ] Create form validation utilities
- [ ] Add animation transitions
- [ ] Implement error boundary
- [ ] Add accessibility attributes
- [ ] Create storybook stories
- [ ] Add component documentation

## Success Criteria
- [ ] Mobile-first responsive design working
- [ ] All UI components styled consistently
- [ ] Navigation between screens working
- [ ] Session creation and joining functional
- [ ] Loading and error states implemented
- [ ] TypeScript types properly used
- [ ] Components are reusable and composable
- [ ] UnoCSS utility classes organized and consistent

## Common Issues & Solutions

### Issue: Components not styling properly
**Solution**: Ensure UnoCSS is properly configured and imported in main.tsx

### Issue: Navigation not working
**Solution**: Check BrowserRouter is wrapping the app

### Issue: Mobile viewport issues
**Solution**: Add viewport meta tag and use proper CSS for mobile

### Issue: TypeScript errors with props
**Solution**: Ensure all component props are properly typed

## Performance Considerations
- Use React.memo for expensive components
- Implement virtual scrolling for message lists
- Lazy load route components
- Optimize re-renders with proper state management

## Accessibility Notes
- All interactive elements have focus states
- Proper ARIA labels for screen readers
- Keyboard navigation support
- Color contrast meets WCAG standards

## Implementation Notes

### CRITICAL: CSS Framework Change
- **Original Plan**: Tailwind CSS v4
- **Actual Implementation**: UnoCSS (due to Tailwind v4 instability)
- **Why**: Tailwind v4 alpha caused build failures
- **Result**: UnoCSS provides same utility classes with better stability

### Development Server Access
- **VPN Users**: MUST use http://127.0.0.1:5173 (not localhost)
- **Keep server running**: Use dedicated terminal for `npm run dev`
- **Timeout**: Always use 15s max timeout for commands

### Key Learnings
1. Always test locally before deploying
2. Handle missing environment variables gracefully
3. Use stable packages for production projects
4. Document VPN/localhost issues prominently

## Next Steps
- Phase 3: Implement audio recording system
- Add push-to-talk functionality
- Create audio visualization
- Handle recording states