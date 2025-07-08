import { useState } from 'react'
import { useProgressPreservation } from '@/hooks/useProgressPreservation'
import { WorkflowProgress, WorkflowStep } from '@/lib/progress-preservation'

interface WorkflowProgressMonitorProps {
  showRecoverable?: boolean
  onResumeWorkflow?: (workflowId: string) => void
  className?: string
}

export function WorkflowProgressMonitor({ 
  showRecoverable = true,
  onResumeWorkflow,
  className = ''
}: WorkflowProgressMonitorProps) {
  const {
    activeWorkflows,
    recoverableWorkflows,
    statistics,
    resumeWorkflow,
    removeWorkflow
  } = useProgressPreservation()
  
  const [expanded, setExpanded] = useState<string[]>([])

  const toggleExpanded = (workflowId: string) => {
    setExpanded(prev => 
      prev.includes(workflowId)
        ? prev.filter(id => id !== workflowId)
        : [...prev, workflowId]
    )
  }

  const handleResumeWorkflow = (workflowId: string) => {
    const success = resumeWorkflow(workflowId)
    if (success) {
      onResumeWorkflow?.(workflowId)
    }
  }

  const getStepIcon = (step: WorkflowStep): string => {
    switch (step.status) {
      case 'completed': return '✅'
      case 'in-progress': return '🔄'
      case 'failed': return '❌'
      case 'paused': return '⏸️'
      default: return '⏳'
    }
  }

  const getStepTypeLabel = (type: WorkflowStep['type']): string => {
    switch (type) {
      case 'recording': return 'Recording'
      case 'transcription': return 'Transcription'
      case 'translation': return 'Translation'
      case 'tts': return 'Text-to-Speech'
      case 'database': return 'Database'
      default: return type
    }
  }

  const getWorkflowProgress = (workflow: WorkflowProgress): number => {
    const completedSteps = workflow.steps.filter(s => s.status === 'completed').length
    return Math.round((completedSteps / workflow.steps.length) * 100)
  }

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ${seconds % 60}s`
  }

  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  const WorkflowCard = ({ workflow }: { workflow: WorkflowProgress }) => {
    const isExpanded = expanded.includes(workflow.id)
    const progress = getWorkflowProgress(workflow)
    const isRecoverable = workflow.isPaused || workflow.steps.some(s => s.status === 'failed')

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => toggleExpanded(workflow.id)}
              className="text-gray-500 hover:text-gray-700"
            >
              {isExpanded ? '📖' : '📝'}
            </button>
            <span className="font-medium text-gray-900">
              {workflow.id.slice(0, 8)}...
            </span>
            {workflow.isPaused && (
              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                Paused
              </span>
            )}
            {workflow.isComplete && (
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                Complete
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {progress}% • {formatTimeAgo(workflow.lastUpdate)}
            </span>
            {isRecoverable && (
              <button
                onClick={() => handleResumeWorkflow(workflow.id)}
                className="bg-blue-500 text-white text-xs px-2 py-1 rounded hover:bg-blue-600"
              >
                Resume
              </button>
            )}
            <button
              onClick={() => removeWorkflow(workflow.id)}
              className="text-red-500 hover:text-red-700 text-xs"
            >
              Remove
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Workflow Info */}
        <div className="text-sm text-gray-600 mb-2">
          Session: {workflow.sessionId.slice(0, 8)}... • 
          Steps: {workflow.steps.length} • 
          Current: {workflow.currentStep + 1}
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="space-y-2">
              {workflow.steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center space-x-3 p-2 rounded ${
                    index === workflow.currentStep ? 'bg-blue-50' : ''
                  }`}
                >
                  <span className="text-lg">{getStepIcon(step)}</span>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm">
                        {getStepTypeLabel(step.type)}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({step.status})
                      </span>
                      {step.retryCount && step.retryCount > 0 && (
                        <span className="text-xs bg-orange-100 text-orange-800 px-1 rounded">
                          {step.retryCount} retries
                        </span>
                      )}
                    </div>
                    {step.error && (
                      <div className="text-xs text-red-600 mt-1">
                        {step.error.message}
                      </div>
                    )}
                    {step.startTime && step.endTime && (
                      <div className="text-xs text-gray-500 mt-1">
                        Duration: {formatDuration(step.endTime - step.startTime)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (activeWorkflows.length === 0 && recoverableWorkflows.length === 0) {
    return null
  }

  return (
    <div className={`workflow-progress-monitor ${className}`}>
      {/* Statistics */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4">
        <h3 className="font-semibold text-gray-900 mb-2">Workflow Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          <div>Total: <span className="font-medium">{statistics.total}</span></div>
          <div>Active: <span className="font-medium text-blue-600">{statistics.active}</span></div>
          <div>Completed: <span className="font-medium text-green-600">{statistics.completed}</span></div>
          <div>Paused: <span className="font-medium text-yellow-600">{statistics.paused}</span></div>
          <div>Failed: <span className="font-medium text-red-600">{statistics.failed}</span></div>
          <div>Recoverable: <span className="font-medium text-orange-600">{statistics.recoverable}</span></div>
        </div>
      </div>

      {/* Recoverable Workflows */}
      {showRecoverable && recoverableWorkflows.length > 0 && (
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
            <span>🔄</span>
            <span>Recoverable Workflows ({recoverableWorkflows.length})</span>
          </h3>
          {recoverableWorkflows.map(workflow => (
            <WorkflowCard key={workflow.id} workflow={workflow} />
          ))}
        </div>
      )}

      {/* Active Workflows */}
      {activeWorkflows.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
            <span>⚡</span>
            <span>Active Workflows ({activeWorkflows.length})</span>
          </h3>
          {activeWorkflows.map(workflow => (
            <WorkflowCard key={workflow.id} workflow={workflow} />
          ))}
        </div>
      )}
    </div>
  )
}