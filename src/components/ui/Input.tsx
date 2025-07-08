import { InputHTMLAttributes, forwardRef, useState } from 'react'
import { clsx } from 'clsx'
import { useAccessibility } from '@/hooks/useAccessibility'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  errorMessage?: string
  label?: string
  description?: string
  required?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    error, 
    errorMessage, 
    label, 
    description, 
    required, 
    id,
    ...props 
  }, ref) => {
    const { announce } = useAccessibility()
    const [hasBeenFocused, setHasBeenFocused] = useState(false)
    
    // Generate unique IDs for accessibility
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
    const errorId = `${inputId}-error`
    const descriptionId = `${inputId}-description`

    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
      setHasBeenFocused(true)
      props.onFocus?.(event)
      
      // Announce label and description for screen readers
      let announcement = ''
      if (label) announcement += `${label}${required ? ' required' : ''}`
      if (description) announcement += `, ${description}`
      if (announcement) {
        announce(announcement)
      }
    }

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      props.onBlur?.(event)
      
      // Announce validation errors when leaving field
      if (error && errorMessage && hasBeenFocused) {
        announce(`Error: ${errorMessage}`, 'assertive')
      }
    }

    const describedBy = [
      description ? descriptionId : null,
      error && errorMessage ? errorId : null
    ].filter(Boolean).join(' ') || undefined

    return (
      <div className="space-y-1">
        {label && (
          <label 
            htmlFor={inputId}
            className={clsx(
              'block text-sm font-medium',
              error ? 'text-red-700' : 'text-gray-700',
              required && "after:content-['*'] after:ml-0.5 after:text-red-500"
            )}
          >
            {label}
          </label>
        )}
        
        {description && (
          <p 
            id={descriptionId}
            className="text-sm text-gray-600"
          >
            {description}
          </p>
        )}
        
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'flex h-12 w-full rounded-lg border bg-white px-4 py-2 text-base',
            'placeholder:text-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors duration-200',
            {
              'border-gray-300 hover:border-gray-400': !error,
              'border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50': error,
            },
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          aria-required={required}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        
        {error && errorMessage && (
          <p 
            id={errorId}
            className="text-sm text-red-600 flex items-center gap-1"
            role="alert"
            aria-live="polite"
          >
            <svg 
              className="h-4 w-4 flex-shrink-0" 
              viewBox="0 0 20 20" 
              fill="currentColor"
              aria-hidden="true"
            >
              <path 
                fillRule="evenodd" 
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zM9.25 15a.75.75 0 011.5 0v.01a.75.75 0 01-1.5 0V15z" 
                clipRule="evenodd" 
              />
            </svg>
            {errorMessage}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'