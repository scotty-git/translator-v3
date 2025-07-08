import { ButtonHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'
import { useAccessibility } from '@/hooks/useAccessibility'
import { useSounds } from '@/lib/sounds/SoundManager'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'default'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  loading?: boolean
  loadingText?: string
  ariaLabel?: string
  ariaDescribedBy?: string
  pressed?: boolean // For toggle buttons
  soundDisabled?: boolean // Disable sound feedback for this button
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    fullWidth, 
    loading, 
    loadingText = 'Loading...', 
    ariaLabel, 
    ariaDescribedBy,
    pressed,
    disabled,
    soundDisabled = false,
    children, 
    onClick,
    ...props 
  }, ref) => {
    const { reducedMotion, announce } = useAccessibility()
    const { playButtonClick } = useSounds()

    // Handle click with accessibility announcements and sound feedback
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) return
      
      // Play button click sound
      if (!soundDisabled) {
        playButtonClick()
      }
      
      onClick?.(event)
      
      // Announce button press for screen readers
      if (ariaLabel) {
        announce(`${ariaLabel} activated`)
      }
    }

    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center font-medium transition-all duration-200',
          // Enhanced focus styles for accessibility
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          // Conditional animations based on reduced motion
          !reducedMotion && 'active:scale-[0.98] hover:scale-[1.02] transform-gpu',
          reducedMotion && 'hover:brightness-110',
          {
            // Variants with enhanced contrast
            'bg-blue-600 text-white hover:bg-blue-700 focus:bg-blue-700': variant === 'primary',
            'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:bg-gray-300': variant === 'secondary',
            'hover:bg-gray-100 focus:bg-gray-100 text-gray-700': variant === 'ghost',
            'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50': variant === 'outline',
            'bg-gray-100 text-gray-900 hover:bg-gray-200': variant === 'default',
            // Sizes
            'h-8 px-3 text-sm rounded-md': size === 'sm',
            'h-10 px-4 text-base rounded-lg': size === 'md',
            'h-12 px-6 text-lg rounded-lg': size === 'lg',
            // Full width
            'w-full': fullWidth,
            // Pressed state for toggle buttons
            'ring-2 ring-blue-500': pressed,
          },
          className
        )}
        disabled={isDisabled}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-pressed={pressed !== undefined ? pressed : undefined}
        aria-disabled={isDisabled}
        aria-busy={loading}
        onClick={handleClick}
        {...props}
      >
        {loading && (
          <svg 
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" 
            fill="none" 
            viewBox="0 0 24 24"
            aria-hidden="true"
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
        )}
        <span className={loading ? 'sr-only' : ''}>
          {loading ? loadingText : children}
        </span>
        {loading && (
          <span aria-live="polite" aria-atomic="true">
            {loadingText}
          </span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'