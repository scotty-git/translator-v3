import { useState, useEffect } from 'react'
import { QualityDegradationService, QualityConfig } from '@/lib/quality-degradation'

export function QualityMonitor() {
  const [qualityStatus, setQualityStatus] = useState(
    QualityDegradationService.getQualityStatus()
  )
  const [config, setConfig] = useState(
    QualityDegradationService.getCurrentConfig()
  )

  useEffect(() => {
    const handleQualityChange = (newConfig: QualityConfig) => {
      setConfig(newConfig)
      setQualityStatus(QualityDegradationService.getQualityStatus())
    }

    QualityDegradationService.addListener(handleQualityChange)

    return () => {
      QualityDegradationService.removeListener(handleQualityChange)
    }
  }, [])

  if (!qualityStatus.recommendation) {
    return null // Don't show anything for fast networks
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
        <span className="text-sm font-medium text-amber-800">
          Network Quality: {qualityStatus.description}
        </span>
      </div>
      <p className="text-xs text-amber-700 mt-1">
        {qualityStatus.recommendation}
      </p>
      <div className="text-xs text-amber-600 mt-1">
        Audio: {config.audioBitsPerSecond / 1000}kbps • Expected: {config.expectedFileSize}
      </div>
    </div>
  )
}