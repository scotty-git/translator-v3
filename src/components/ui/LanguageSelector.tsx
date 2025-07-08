import { Globe, Check } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from '@/lib/i18n/useTranslation'
import type { Language } from '@/lib/i18n/translations'
import { Button } from './Button'
import { Card } from './Card'

export function LanguageSelector() {
  const { t, language, setLanguage } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  const languages: { code: Language; name: string; native: string }[] = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'es', name: 'Spanish', native: 'Español' },
    { code: 'pt', name: 'Portuguese', native: 'Português' },
  ]

  const currentLanguage = languages.find(lang => lang.code === language)

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{currentLanguage?.native}</span>
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Language menu */}
          <Card className="absolute right-0 top-full mt-2 w-48 z-50 p-2">
            <div className="space-y-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code)
                    setIsOpen(false)
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <div>
                    <div className="font-medium">{lang.native}</div>
                    <div className="text-sm text-gray-500">{lang.name}</div>
                  </div>
                  {language === lang.code && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}