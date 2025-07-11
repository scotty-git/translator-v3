# 🎨 Components Guide - UI Design System

Complete guide to the Real-time Translator's component library, design system, and styling patterns.

---

## 🎯 Design System Overview

### Design Principles
- **Mobile-First**: All components optimized for touch interactions
- **Accessibility-First**: WCAG 2.1 AA compliance built-in
- **Performance-First**: Minimal CSS, GPU acceleration, reduced motion support
- **Consistency**: Unified spacing, colors, and interaction patterns

### Tech Stack
- **UnoCSS**: Atomic CSS with Tailwind compatibility
- **TypeScript**: Full type safety for props and refs
- **Accessibility**: useAccessibility hook integration
- **Sound Feedback**: Built-in sound system integration

---

## 🎨 Design Tokens

### Color Palette

```typescript
// Primary Blue Scale
primary: {
  50: '#eff6ff',   // Very light blue
  100: '#dbeafe',  // Light blue  
  200: '#bfdbfe',  // Lighter blue
  300: '#93c5fd',  // Light blue
  400: '#60a5fa',  // Medium blue
  500: '#3b82f6',  // Default blue
  600: '#2563eb',  // Primary blue (default)
  700: '#1d4ed8',  // Dark blue
  800: '#1e40af',  // Darker blue
  900: '#1e3a8a',  // Darkest blue
}
```

**Usage Guidelines**:
- **Primary 600** - Main actions, buttons, links
- **Primary 100** - Light backgrounds, subtle highlights  
- **Primary 700** - Hover states, focus states
- **Gray Scale** - Text, borders, backgrounds (follows standard gray scale)

### Typography System

```css
/* Font Stack */
font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
font-mono: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace

/* Text Sizes */
text-xs: 0.75rem    /* 12px - Labels, captions */
text-sm: 0.875rem   /* 14px - Body text, descriptions */
text-base: 1rem     /* 16px - Default text (mobile-optimized) */
text-lg: 1.125rem   /* 18px - Headings, emphasis */
text-xl: 1.25rem    /* 20px - Page titles */
text-2xl: 1.5rem    /* 24px - Main headings */
```

### Spacing System

```css
/* Consistent 4px base unit */
space-1: 0.25rem    /* 4px */
space-2: 0.5rem     /* 8px */  
space-3: 0.75rem    /* 12px */
space-4: 1rem       /* 16px - Default spacing */
space-6: 1.5rem     /* 24px - Section spacing */
space-8: 2rem       /* 32px - Component spacing */
space-12: 3rem      /* 48px - Page section spacing */
```

### Border Radius

```css
rounded-md: 0.375rem   /* 6px - Small elements */
rounded-lg: 0.5rem     /* 8px - Default buttons, inputs */
rounded-xl: 0.75rem    /* 12px - Cards, modals */
rounded-2xl: 1rem      /* 16px - Message bubbles */
```

---

## 🧩 Core Components

### Button Component

**File**: `src/components/ui/Button.tsx`

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  loading?: boolean
  loadingText?: string
  ariaLabel?: string
  pressed?: boolean
  soundDisabled?: boolean
}
```

**Usage Examples**:

```tsx
// Primary action button
<Button variant="primary" size="lg" fullWidth>
  Start Translation
</Button>

// Secondary button with loading
<Button variant="secondary" loading loadingText="Processing...">
  Join Session
</Button>

// Toggle button with sound feedback
<Button 
  variant="ghost" 
  pressed={isRecording}
  ariaLabel="Start recording"
  onClick={toggleRecording}
>
  🎤 Record
</Button>

// Accessible button with custom sound
<Button 
  ariaLabel="Delete message"
  ariaDescribedBy="delete-help"
  soundDisabled={true}
>
  Delete
</Button>
```

**Built-in Features**:
- ✅ **Accessibility**: ARIA labels, announcements, keyboard support
- ✅ **Sound Feedback**: Click sounds (can be disabled)
- ✅ **Loading States**: Spinner, loading text, aria-busy
- ✅ **Reduced Motion**: Respects user preferences
- ✅ **Focus Management**: Visible focus indicators
- ✅ **Touch Optimization**: 44px minimum touch targets

### Input Component

**File**: `src/components/ui/Input.tsx`

```typescript
interface InputProps {
  error?: boolean
  errorMessage?: string
  label?: string
  description?: string
  required?: boolean
}
```

**Usage Examples**:

```tsx
// Standard input with label
<Input 
  label="Session Code"
  placeholder="Enter 4-digit code"
  maxLength={4}
/>

// Input with validation
<Input
  label="Your Name"
  description="This will be shown to other participants"
  required
  error={hasError}
  errorMessage="Name is required"
/>

// Controlled input
<Input
  label="Message"
  value={message}
  onChange={(e) => setMessage(e.target.value)}
  onKeyDown={handleKeyDown}
/>
```

**Built-in Features**:
- ✅ **Accessibility**: Auto-generated IDs, ARIA relationships
- ✅ **Validation**: Error states, live announcements
- ✅ **Focus Management**: Screen reader announcements
- ✅ **Mobile Optimization**: Large touch targets, appropriate keyboards

### Card Component

**File**: `src/components/ui/Card.tsx`

```tsx
// Glass effect card
<Card className="glass-effect">
  <Card.Header>
    <Card.Title>Session Information</Card.Title>
  </Card.Header>
  <Card.Content>
    Session code: {sessionCode}
  </Card.Content>
</Card>

// Message bubble (specialized card)
<div className="message-bubble message-own">
  Hello world!
</div>
```

---

## 🎭 Theme System

### Theme Context Usage

```tsx
import { useTheme } from '@/contexts/ThemeContext'

function MyComponent() {
  const { theme, actualTheme, setTheme } = useTheme()
  
  return (
    <div className={`bg-white dark:bg-gray-900`}>
      <button onClick={() => setTheme('dark')}>
        Current: {actualTheme}
      </button>
    </div>
  )
}
```

### Dark Mode Classes

**Pattern**: Add `dark:` prefix to any utility class

```css
/* Light mode → Dark mode */
bg-white → bg-gray-900
text-gray-900 → text-gray-100
border-gray-200 → border-gray-700
hover:bg-gray-100 → hover:bg-gray-800
```

**Example Component**:
```tsx
<div className="
  bg-white dark:bg-gray-900
  text-gray-900 dark:text-gray-100
  border-gray-200 dark:border-gray-700
  transition-colors duration-200
">
  Content that adapts to theme
</div>
```

### Theme-Aware Shortcuts

Use predefined shortcuts from `uno.config.ts`:

```css
/* Background gradients */
bg-app: /* Light: blue gradient, Dark: gray gradient */

/* Glass effects */  
glass-effect: /* Backdrop blur with theme-aware opacity */

/* Button variants */
btn-secondary: /* Auto theme-aware secondary button */
btn-ghost: /* Auto theme-aware ghost button */

/* Message bubbles */
message-other: /* Auto theme-aware received messages */
```

---

## ✨ Animation System

### Built-in Animations

**Fade Animations**:
```css
animate-fade-in        /* 0.3s fade in */
animate-fade-in-fast   /* 0.15s fade in */
animate-fade-in-slow   /* 0.5s fade in */
```

**Slide Animations**:
```css
animate-slide-up       /* Slide up with fade */
animate-slide-up-spring /* Slide up with spring easing */
animate-slide-down     /* Slide down with fade */
animate-slide-left     /* Slide from left */
animate-slide-right    /* Slide from right */
```

**Interactive Animations**:
```css
animate-scale-in       /* Scale in effect */
animate-scale-in-bounce /* Scale in with bounce */
animate-pulse-soft     /* Gentle pulsing */
animate-pulse-recording /* Recording indicator pulse */
```

**Staggered Animations**:
```css
animate-stagger-1      /* Fade in with 0.1s delay */
animate-stagger-2      /* Fade in with 0.2s delay */
animate-stagger-3      /* Fade in with 0.3s delay */
/* ... up to stagger-5 */
```

### Usage Examples

```tsx
// Message appearing
<div className="animate-slide-up">
  New translation message
</div>

// Staggered list items
<ul>
  <li className="animate-stagger-1">Item 1</li>
  <li className="animate-stagger-2">Item 2</li>
  <li className="animate-stagger-3">Item 3</li>
</ul>

// Recording indicator
<div className={cn(
  "w-4 h-4 bg-red-500 rounded-full",
  isRecording && "animate-pulse-recording"
)}>
</div>

// Success feedback
<div className="animate-success-pop">
  ✅ Message sent!
</div>
```

### Reduced Motion Support

All animations automatically respect `prefers-reduced-motion`:

```tsx
import { useAccessibility } from '@/hooks/useAccessibility'

function AnimatedComponent() {
  const { reducedMotion } = useAccessibility()
  
  return (
    <div className={cn(
      // Normal animations
      !reducedMotion && "animate-slide-up hover:scale-105",
      // Reduced motion alternatives
      reducedMotion && "hover:brightness-110"
    )}>
      Content
    </div>
  )
}
```

---

## 📱 Responsive Design

### Mobile-First Breakpoints

```css
/* Default: Mobile (0px+) */
sm: 640px      /* Small tablets */
md: 768px      /* Tablets */  
lg: 1024px     /* Laptops */
xl: 1280px     /* Desktops */
2xl: 1536px    /* Large desktops */
```

### Mobile-First Patterns

**Touch Targets**:
```tsx
// Minimum 44px touch targets
<button className="h-12 px-6 text-base"> {/* 48px height */}
  Touch-friendly button
</button>

// Interactive elements
<div className="p-4 min-h-12"> {/* Adequate spacing */}
  Tappable area
</div>
```

**Typography Scale**:
```tsx
// Mobile-optimized text sizes
<h1 className="text-xl sm:text-2xl lg:text-3xl">
  Responsive heading
</h1>

<p className="text-base leading-relaxed">
  Optimized for mobile reading
</p>
```

**Layout Patterns**:
```tsx
// Stack on mobile, row on desktop
<div className="flex flex-col md:flex-row gap-4">
  <div className="flex-1">Content 1</div>
  <div className="flex-1">Content 2</div>
</div>

// Full width on mobile, constrained on desktop
<div className="w-full max-w-md mx-auto px-4">
  Mobile-centered content
</div>
```

---

## ♿ Accessibility Patterns

### Built-in Accessibility Hook

```tsx
import { useAccessibility } from '@/hooks/useAccessibility'

function AccessibleComponent() {
  const { 
    reducedMotion,     // User prefers reduced motion
    highContrast,      // High contrast mode  
    announce,          // Screen reader announcements
    focusRing         // Focus ring utilities
  } = useAccessibility()
  
  // Announce to screen readers
  const handleSuccess = () => {
    announce("Translation completed successfully", "polite")
  }
  
  return (
    <button 
      className={cn(
        "btn btn-primary",
        focusRing,
        highContrast && "high-contrast-border"
      )}
      onClick={handleSuccess}
    >
      Translate
    </button>
  )
}
```

### Accessibility Shortcuts

Predefined accessibility utilities:

```css
/* Screen reader only */
sr-only: /* Visually hidden but available to screen readers */

/* Focus management */
focus-visible-ring: /* Consistent focus indicators */

/* High contrast support */
high-contrast-text: /* Enhanced contrast in high contrast mode */
high-contrast-border: /* Visible borders in high contrast mode */

/* Reduced motion */
reduce-motion-safe: /* Disable animations for reduced motion users */
```

### ARIA Patterns

**Live Regions**:
```tsx
// Status announcements
<div aria-live="polite" className="sr-only">
  {statusMessage}
</div>

// Error announcements  
<div aria-live="assertive" role="alert">
  {errorMessage}
</div>
```

**Form Accessibility**:
```tsx
<Input
  label="Session Code"
  description="Enter the 4-digit room code"
  required
  aria-describedby="code-help"
  error={hasError}
  errorMessage="Invalid code format"
/>
```

**Button States**:
```tsx
<Button
  pressed={isActive}
  ariaLabel="Toggle recording" 
  ariaDescribedBy="recording-help"
>
  🎤 Record
</Button>
```

---

## 🚀 Performance Optimizations

### CSS Performance

**GPU Acceleration**:
```css
/* Trigger hardware acceleration */
transform-gpu          /* Use transform: translateZ(0) */
will-change-transform   /* Hint to browser for optimization */
```

**Efficient Animations**:
```css
/* Prefer transform and opacity over layout changes */
hover:scale-105        /* GPU-accelerated scaling */
hover:translate-y-1    /* GPU-accelerated movement */
hover:opacity-80       /* GPU-accelerated opacity */

/* Avoid these for animations */
hover:w-32            /* Causes layout reflow */
hover:top-4           /* Causes layout reflow */
```

### Bundle Size Optimization

**Selective UnoCSS**:
- Only used CSS classes are included in final bundle
- Tree-shaking eliminates unused animations and utilities
- Shortcuts reduce duplication

**Component Optimization**:
```tsx
// Lazy load heavy components
const HeavyComponent = lazy(() => import('./HeavyComponent'))

// Memoize expensive calculations
const ExpensiveComponent = memo(({ data }) => {
  const processedData = useMemo(() => 
    expensiveCalculation(data), [data]
  )
  
  return <div>{processedData}</div>
})
```

---

## 🎤 Recording Components

### Audio Recording Integration

The recording functionality uses the **PersistentAudioManager** for optimal mobile performance:

```tsx
// SoloTranslator.tsx
import { PersistentAudioManager } from '@/services/audio/PersistentAudioManager'

function RecordingComponent() {
  const audioManager = useMemo(() => PersistentAudioManager.getInstance(), [])
  const [isRecording, setIsRecording] = useState(false)
  
  const handleRecordClick = async () => {
    // Permission requested on first use only
    if (!audioManager.isStreamReady()) {
      const hasPermission = await audioManager.ensurePermissions()
      if (!hasPermission) {
        setError('Microphone permission denied')
        return
      }
    }
    
    // Start/stop recording with persistent stream
    if (isRecording) {
      await stopRecording()
    } else {
      await startRecording()
    }
  }
  
  return (
    <Button
      onClick={handleRecordClick}
      className={cn(
        "recording-button",
        isRecording && "recording-active"
      )}
    >
      <MicIcon className={isRecording ? "animate-pulse-recording" : ""} />
    </Button>
  )
}
```

### Key Features

1. **Lazy Permission Request**: No permission prompt until user clicks record
2. **Persistent Stream**: MediaStream maintained between recordings
3. **Mobile Optimized**: Works perfectly on iOS Safari and Android Chrome
4. **Visual Feedback**: Pulse animation while recording

### Audio Visualization

```tsx
// Audio bars visualization during recording
<div className="audio-visualizer">
  {audioLevels.map((level, i) => (
    <div
      key={i}
      className="audio-bar"
      style={{ height: `${level * 100}%` }}
    />
  ))}
</div>
```

---

## 🧩 TranslatorShared Components (Phase 2 Refactor)

The translator features use a **shared component library** that provides consistent UI across solo and session modes. All components are located in `src/features/translator/shared/components/`.

### MessageBubble

Complex message display with translation states, TTS, and reactions:

```tsx
import { MessageBubble } from '@/features/translator/shared'

<MessageBubble
  message={message}
  isSessionMode={true}
  onReaction={(emoji) => handleReaction(message.id, emoji)}
  onTTS={() => handleTTS(message.translation)}
  onRetry={() => handleRetry(message.id)}
/>
```

**Features**:
- Translation state display (processing, completed, failed)
- TTS playback with audio controls
- Emoji reactions with real-time sync
- Retry functionality for failed messages
- Accessibility-compliant design

### ActivityIndicator

Real-time status display for recording/processing/idle states:

```tsx
import { ActivityIndicator } from '@/features/translator/shared'

<ActivityIndicator
  activity={partnerActivity}
  isSessionMode={true}
  className="activity-status"
/>
```

**States**:
- `recording` - Partner is actively recording
- `processing` - Partner's audio is being transcribed/translated
- `idle` - Default state when no activity

### AudioVisualization

60fps audio level visualization with Web Audio API:

```tsx
import { AudioVisualization } from '@/features/translator/shared'

<AudioVisualization
  isRecording={isRecording}
  audioLevels={audioLevels}
  className="audio-bars"
/>
```

**Features**:
- 5-bar audio level display
- 60fps smooth animations
- Web Audio API integration
- GPU-accelerated rendering

### ScrollToBottomButton

WhatsApp-style message navigation with unread count:

```tsx
import { ScrollToBottomButton } from '@/features/translator/shared'

<ScrollToBottomButton
  unreadCount={unreadCount}
  onScrollToBottom={() => messagesEndRef.current?.scrollIntoView()}
  className="scroll-button"
/>
```

**Features**:
- Automatic show/hide based on scroll position
- Unread message count display
- Smooth scroll animations
- Mobile-optimized touch targets

### UnreadMessagesDivider

Visual separator for unread messages with auto-fade:

```tsx
import { UnreadMessagesDivider } from '@/features/translator/shared'

<UnreadMessagesDivider
  unreadCount={unreadCount}
  onMarkAsRead={() => setUnreadCount(0)}
/>
```

**Features**:
- Automatic fade after 5 seconds
- Smooth animations
- Accessibility announcements
- Click to mark as read

### ErrorDisplay

Comprehensive error handling with retry actions:

```tsx
import { ErrorDisplay } from '@/features/translator/shared'

<ErrorDisplay
  error={error}
  onRetry={() => handleRetry()}
  onDismiss={() => setError(null)}
  className="error-message"
/>
```

**Error Types**:
- Network errors with retry actions
- Permission errors with guidance
- API errors with explanations
- Generic errors with support contact

### Shared Props Interface

All TranslatorShared components extend base props:

```typescript
interface TranslatorSharedProps {
  message?: Message
  isSessionMode?: boolean
  onAction?: (action: string, data?: any) => void
  className?: string
  'data-testid'?: string
}
```

---

## 🎨 Component Patterns

### Compound Components

```tsx
// Card with sub-components
<Card>
  <Card.Header>
    <Card.Title>Title</Card.Title>
    <Card.Description>Description</Card.Description>
  </Card.Header>
  <Card.Content>
    Main content
  </Card.Content>
  <Card.Footer>
    <Button>Action</Button>
  </Card.Footer>
</Card>
```

### Polymorphic Components

```tsx
// Button that can render as different elements
<Button as="a" href="/link">
  Link Button
</Button>

<Button as="div" role="button">
  Div Button
</Button>
```

### Controlled vs Uncontrolled

```tsx
// Controlled input
<Input 
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>

// Uncontrolled input with ref
<Input 
  defaultValue="initial"
  ref={inputRef}
/>
```

---

## 🛠️ Component Development

### Creating New Components

**1. Component Structure**:
```tsx
// src/components/ui/NewComponent.tsx (for basic UI components)
interface NewComponentProps {
  // Props interface
}

export const NewComponent = forwardRef<HTMLElement, NewComponentProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("base-styles", className)}
        {...props}
      >
        {/* Component content */}
      </div>
    )
  }
)

NewComponent.displayName = 'NewComponent'
```

**2. Shared Translator Components**:
```tsx
// src/features/translator/shared/components/NewTranslatorComponent.tsx
import { TranslatorSharedProps } from '../types'

interface NewTranslatorComponentProps extends TranslatorSharedProps {
  // Component-specific props
}

export default function NewTranslatorComponent({
  message,
  isSessionMode,
  onAction,
  ...props
}: NewTranslatorComponentProps) {
  return (
    <div className="translator-component">
      {/* Component content */}
    </div>
  )
}
```

**3. Add to Exports**:
```tsx
// src/components/ui/index.ts (for basic UI)
export { NewComponent } from './NewComponent'
export type { NewComponentProps } from './NewComponent'

// src/features/translator/shared/index.ts (for translator components)
export { default as NewTranslatorComponent } from './components/NewTranslatorComponent'
export type { NewTranslatorComponentProps } from './components/NewTranslatorComponent'
```

**3. Document Usage**:
- Add component to this COMPONENTS.md file
- Include usage examples
- Document accessibility features
- Add Storybook stories (if using)

### Testing Components

```tsx
// Component.test.tsx
import { render, screen } from '@testing-library/react'
import { NewComponent } from './NewComponent'

test('renders correctly', () => {
  render(<NewComponent>Test content</NewComponent>)
  expect(screen.getByText('Test content')).toBeInTheDocument()
})

test('handles accessibility', () => {
  render(<NewComponent ariaLabel="Test component" />)
  expect(screen.getByLabelText('Test component')).toBeInTheDocument()
})
```

---

## 🔗 Related Documentation

- **[SETUP.md](./SETUP.md)** - Development environment setup
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture overview
- **[TESTING.md](./TESTING.md)** - Component testing strategies
- **[API.md](./API.md)** - Service integration patterns

---

## 🎯 Best Practices

### Do ✅
- Use mobile-first responsive design
- Include accessibility features by default
- Respect reduced motion preferences
- Use consistent spacing and color tokens
- Test with keyboard navigation
- Provide loading and error states
- Use semantic HTML elements

### Don't ❌
- Hard-code colors or spacing values
- Ignore dark mode variants
- Create components without TypeScript types
- Skip accessibility testing
- Use layout-triggering animations
- Forget mobile touch targets
- Override focus indicators without replacement