import { defineConfig, presetUno, presetWebFonts } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(), // Default preset with Tailwind-compatible utilities
    presetWebFonts({
      provider: 'none',
      fonts: {
        sans: 'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
        mono: 'ui-monospace,SFMono-Regular,"SF Mono",Consolas,"Liberation Mono",Menlo,monospace',
      },
    }),
  ],
  darkMode: 'class',
  shortcuts: {
    // Accessibility shortcuts
    'sr-only': 'absolute w-1px h-1px p-0 m--1 overflow-hidden clip-rect-0 whitespace-nowrap border-0',
    'focus-visible-ring': 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
    'high-contrast-text': 'high-contrast:text-black high-contrast:bg-white',
    'high-contrast-border': 'high-contrast:border-black high-contrast:border-2',
    'reduce-motion-safe': 'motion-safe:animate-none motion-safe:transition-none',
  },
  theme: {
    colors: {
      primary: {
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8',
        800: '#1e40af',
        900: '#1e3a8a',
      },
    },
    animation: {
      'fade-in': 'fadeIn 0.3s ease-out',
      'fade-in-fast': 'fadeIn 0.15s ease-out',
      'fade-in-slow': 'fadeIn 0.5s ease-out',
      'slide-up': 'slideUp 0.3s ease-out',
      'slide-up-spring': 'slideUpSpring 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      'slide-down': 'slideDown 0.3s ease-out',
      'slide-down-spring': 'slideDownSpring 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      'slide-left': 'slideLeft 0.3s ease-out',
      'slide-right': 'slideRight 0.3s ease-out',
      'scale-in': 'scaleIn 0.2s ease-out',
      'scale-in-bounce': 'scaleInBounce 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      'pulse-recording': 'pulseRecording 1s ease-out infinite',
      'bounce-subtle': 'bounceSubtle 1s ease-in-out infinite',
      'shake': 'shake 0.5s ease-in-out',
      'success-pop': 'successPop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      'typing-dots': 'typingDots 1.2s ease-in-out infinite',
      'shimmer': 'shimmer 1.5s ease-in-out infinite',
      'float': 'float 3s ease-in-out infinite',
      'stagger-1': 'fadeIn 0.3s ease-out 0.1s both',
      'stagger-2': 'fadeIn 0.3s ease-out 0.2s both',
      'stagger-3': 'fadeIn 0.3s ease-out 0.3s both',
      'stagger-4': 'fadeIn 0.3s ease-out 0.4s both',
      'stagger-5': 'fadeIn 0.3s ease-out 0.5s both',
    },
    keyframes: {
      fadeIn: {
        '0%': { opacity: '0' },
        '100%': { opacity: '1' },
      },
      slideUp: {
        '0%': { transform: 'translateY(10px)', opacity: '0' },
        '100%': { transform: 'translateY(0)', opacity: '1' },
      },
      slideUpSpring: {
        '0%': { transform: 'translateY(20px) scale(0.95)', opacity: '0' },
        '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
      },
      slideDown: {
        '0%': { transform: 'translateY(-10px)', opacity: '0' },
        '100%': { transform: 'translateY(0)', opacity: '1' },
      },
      slideDownSpring: {
        '0%': { transform: 'translateY(-20px) scale(0.95)', opacity: '0' },
        '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
      },
      slideLeft: {
        '0%': { transform: 'translateX(-20px)', opacity: '0' },
        '100%': { transform: 'translateX(0)', opacity: '1' },
      },
      slideRight: {
        '0%': { transform: 'translateX(20px)', opacity: '0' },
        '100%': { transform: 'translateX(0)', opacity: '1' },
      },
      scaleIn: {
        '0%': { transform: 'scale(0.95)', opacity: '0' },
        '100%': { transform: 'scale(1)', opacity: '1' },
      },
      scaleInBounce: {
        '0%': { transform: 'scale(0.8)', opacity: '0' },
        '100%': { transform: 'scale(1)', opacity: '1' },
      },
      pulseSoft: {
        '0%, 100%': { opacity: '1' },
        '50%': { opacity: '0.7' },
      },
      pulseRecording: {
        '0%': { 
          transform: 'scale(1)',
          boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.7)'
        },
        '100%': { 
          transform: 'scale(1.05)',
          boxShadow: '0 0 0 20px rgba(239, 68, 68, 0)'
        },
      },
      bounceSubtle: {
        '0%, 100%': { transform: 'translateY(0)' },
        '50%': { transform: 'translateY(-4px)' },
      },
      shake: {
        '0%, 100%': { transform: 'translateX(0)' },
        '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-8px)' },
        '20%, 40%, 60%, 80%': { transform: 'translateX(8px)' },
      },
      successPop: {
        '0%': { transform: 'scale(1)' },
        '50%': { transform: 'scale(1.15)' },
        '100%': { transform: 'scale(1)' },
      },
      typingDots: {
        '0%, 60%, 100%': { opacity: '0.3' },
        '30%': { opacity: '1' },
      },
      shimmer: {
        '0%': { backgroundPosition: '-200% 0' },
        '100%': { backgroundPosition: '200% 0' },
      },
      float: {
        '0%, 100%': { transform: 'translateY(0px)' },
        '50%': { transform: 'translateY(-10px)' },
      },
    },
  },
  shortcuts: {
    'btn': 'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
    'btn-primary': 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500',
    'btn-secondary': 'bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600',
    'btn-ghost': 'hover:bg-gray-100 text-gray-700 dark:hover:bg-gray-800 dark:text-gray-300',
    'message-bubble': 'max-w-[80%] rounded-2xl px-4 py-2 shadow-sm transition-all duration-200 animate-slide-up',
    'message-own': 'bg-blue-600 text-white ml-auto',
    'message-other': 'bg-white border border-gray-200 mr-auto dark:bg-gray-800 dark:border-gray-700',
    'status-indicator': 'flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400',
    'glass-effect': 'backdrop-blur-sm bg-white/80 border border-white/20 dark:bg-gray-900/80 dark:border-gray-700/20',
    'bg-app': 'bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900',
  },
})