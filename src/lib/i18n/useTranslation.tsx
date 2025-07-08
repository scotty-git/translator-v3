import { useContext, createContext, ReactNode, useState, useEffect } from 'react'
import { translations, Language } from './translations'
import { UserManager } from '@/lib/user/UserManager'

interface TranslationContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string>) => string
}

const TranslationContext = createContext<TranslationContextValue | null>(null)

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const user = UserManager.getOrCreateUser()
    return user.language
  })
  
  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    UserManager.updateUser({ language: lang })
  }
  
  const t = (key: string, params?: Record<string, string>): string => {
    const keys = key.split('.')
    let value: any = translations[language]
    
    for (const k of keys) {
      value = value?.[k]
    }
    
    if (typeof value !== 'string') {
      console.warn(`Translation not found: ${key} for language ${language}`)
      // Fallback to English
      let fallbackValue: any = translations.en
      for (const k of keys) {
        fallbackValue = fallbackValue?.[k]
      }
      if (typeof fallbackValue === 'string') {
        return fallbackValue
      }
      return key
    }
    
    // Replace parameters
    if (params) {
      Object.entries(params).forEach(([param, val]) => {
        value = value.replace(`{{${param}}}`, val)
      })
    }
    
    return value
  }
  
  return (
    <TranslationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(TranslationContext)
  if (!context) {
    throw new Error('useTranslation must be used within TranslationProvider')
  }
  return context
}