import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from './Button'
import { clsx } from 'clsx'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const themes = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
  ] as const

  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      {themes.map(({ value, icon: Icon, label }) => (
        <Button
          key={value}
          onClick={() => setTheme(value)}
          variant="ghost"
          size="sm"
          className={clsx(
            'px-3 py-1.5 text-xs transition-all duration-200',
            theme === value
              ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          )}
          title={label}
        >
          <Icon className="h-4 w-4" />
          <span className="ml-1 hidden sm:inline">{label}</span>
        </Button>
      ))}
    </div>
  )
}