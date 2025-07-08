import { useState, useEffect, useCallback } from 'react'
import { ProgressPreservationService, WorkflowProgress, WorkflowStep } from '@/lib/progress-preservation'

export interface ProgressHookResult {
  activeWorkflows: WorkflowProgress[]
  recoverableWorkflows: WorkflowProgress[]
  statistics: ReturnType<typeof ProgressPreservationService.getStatistics>
  createWorkflow: (
    sessionId: string,
    userId: string,
    steps: Omit<WorkflowStep, 'status' | 'startTime'>[]
  ) => string
  startStep: (workflowId: string, stepIndex: number, data?: any) => void
  completeStep: (workflowId: string, stepIndex: number, result?: any) => void
  failStep: (workflowId: string, stepIndex: number, error: Error) => void
  pauseWorkflow: (workflowId: string, reason?: string) => void
  resumeWorkflow: (workflowId: string) => boolean
  removeWorkflow: (workflowId: string) => void
  getWorkflow: (workflowId: string) => WorkflowProgress | undefined
}

/**
 * React hook for progress preservation functionality
 */
export function useProgressPreservation(): ProgressHookResult {
  const [activeWorkflows, setActiveWorkflows] = useState<WorkflowProgress[]>([])
  const [recoverableWorkflows, setRecoverableWorkflows] = useState<WorkflowProgress[]>([])
  const [statistics, setStatistics] = useState(ProgressPreservationService.getStatistics())

  // Update state when workflows change
  const updateState = useCallback((workflows: WorkflowProgress[]) => {
    setActiveWorkflows(workflows)
    setRecoverableWorkflows(ProgressPreservationService.getRecoverableWorkflows())
    setStatistics(ProgressPreservationService.getStatistics())
  }, [])

  useEffect(() => {
    // Add listener for workflow changes
    ProgressPreservationService.addListener(updateState)
    
    // Initial state
    updateState(ProgressPreservationService.getActiveWorkflows())

    return () => {
      ProgressPreservationService.removeListener(updateState)
    }
  }, [updateState])

  const createWorkflow = useCallback((
    sessionId: string,
    userId: string,
    steps: Omit<WorkflowStep, 'status' | 'startTime'>[]
  ): string => {
    return ProgressPreservationService.createWorkflow(sessionId, userId, steps)
  }, [])

  const startStep = useCallback((workflowId: string, stepIndex: number, data?: any) => {
    ProgressPreservationService.startStep(workflowId, stepIndex, data)
  }, [])

  const completeStep = useCallback((workflowId: string, stepIndex: number, result?: any) => {
    ProgressPreservationService.completeStep(workflowId, stepIndex, result)
  }, [])

  const failStep = useCallback((workflowId: string, stepIndex: number, error: Error) => {
    ProgressPreservationService.failStep(workflowId, stepIndex, error)
  }, [])

  const pauseWorkflow = useCallback((workflowId: string, reason?: string) => {
    ProgressPreservationService.pauseWorkflow(workflowId, reason)
  }, [])

  const resumeWorkflow = useCallback((workflowId: string): boolean => {
    return ProgressPreservationService.resumeWorkflow(workflowId)
  }, [])

  const removeWorkflow = useCallback((workflowId: string) => {
    ProgressPreservationService.removeWorkflow(workflowId)
  }, [])

  const getWorkflow = useCallback((workflowId: string): WorkflowProgress | undefined => {
    return ProgressPreservationService.getWorkflow(workflowId)
  }, [])

  return {
    activeWorkflows,
    recoverableWorkflows,
    statistics,
    createWorkflow,
    startStep,
    completeStep,
    failStep,
    pauseWorkflow,
    resumeWorkflow,
    removeWorkflow,
    getWorkflow
  }
}