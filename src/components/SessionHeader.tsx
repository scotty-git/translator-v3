import { Users, Wifi, WifiOff } from 'lucide-react'
import { useTranslation } from '@/lib/i18n/useTranslation'

interface SessionHeaderProps {
  code: string
  status: 'connecting' | 'connected' | 'disconnected'
  partnerOnline: boolean
}

export function SessionHeader({ code, status, partnerOnline }: SessionHeaderProps) {
  const { t } = useTranslation()
  
  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <Wifi className="h-3 w-3 text-green-600" />
      case 'connecting':
        return <Wifi className="h-3 w-3 text-yellow-600 animate-pulse" />
      case 'disconnected':
        return <WifiOff className="h-3 w-3 text-red-600" />
    }
  }
  
  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return t('session.connected', 'Connected')
      case 'connecting':
        return t('session.connecting', 'Connecting...')
      case 'disconnected':
        return t('session.disconnected', 'Disconnected')
    }
  }
  
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 py-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          {/* Session Code */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-600 dark:text-gray-400">{t('session.code', 'Session:')}</span>
            <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 text-base">
              {code}
            </span>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center gap-1.5">
            {getStatusIcon()}
            <span className="text-gray-600 dark:text-gray-400">{getStatusText()}</span>
          </div>
        </div>
        
        {/* Partner Status */}
        <div className="flex items-center gap-1.5">
          <Users className="h-3 w-3 text-gray-500" />
          <span className={`text-xs ${partnerOnline ? 'text-green-600' : 'text-gray-500'}`}>
            {partnerOnline 
              ? t('session.partnerOnline', 'Partner Online')
              : t('session.partnerOffline', 'Waiting for partner...')
            }
          </span>
        </div>
      </div>
    </div>
  )
}