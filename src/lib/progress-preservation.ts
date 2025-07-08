import { performanceLogger, PERF_OPS } from './performance'

export interface WorkflowStep {
  id: string
  type: 'recording' | 'transcription' | 'translation' | 'tts' | 'database'
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'paused'
  data?: any
  result?: any
  error?: Error
  startTime?: number
  endTime?: number
  retryCount?: number
}

export interface WorkflowProgress {
  id: string
  sessionId: string
  userId: string
  messageId?: string
  steps: WorkflowStep[]
  currentStep: number
  startTime: number
  lastUpdate: number
  isComplete: boolean
  isPaused: boolean
}

/**
 * Progress Preservation Service
 * Saves workflow progress to localStorage and can resume from network interruptions
 */
export class ProgressPreservationService {
  private static readonly STORAGE_KEY = 'translator_workflow_progress'
  private static readonly MAX_STORED_WORKFLOWS = 10
  private static activeWorkflows = new Map<string, WorkflowProgress>()
  private static listeners = new Set<(workflows: WorkflowProgress[]) => void>()

  /**
   * Initialize the progress preservation service
   */
  static initialize(): void {
    // Load persisted workflows from localStorage
    this.loadPersistedWorkflows()
    
    // Clean up old workflows periodically
    setInterval(() => {
      this.cleanupOldWorkflows()
    }, 60000) // Every minute

    console.log('📚 Progress preservation service initialized')
  }

  /**
   * Create a new workflow for tracking
   */
  static createWorkflow(
    sessionId: string,
    userId: string,
    steps: Omit<WorkflowStep, 'status' | 'startTime'>[]
  ): string {
    const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const workflow: WorkflowProgress = {
      id: workflowId,
      sessionId,
      userId,
      steps: steps.map(step => ({
        ...step,
        status: 'pending',
        retryCount: 0
      })),
      currentStep: 0,
      startTime: Date.now(),
      lastUpdate: Date.now(),
      isComplete: false,
      isPaused: false
    }

    this.activeWorkflows.set(workflowId, workflow)
    this.persistWorkflows()
    this.notifyListeners()

    console.log(`📚 Created workflow ${workflowId} with ${steps.length} steps`)
    return workflowId
  }

  /**
   * Start a workflow step
   */
  static startStep(workflowId: string, stepIndex: number, data?: any): void {
    const workflow = this.activeWorkflows.get(workflowId)
    if (!workflow || stepIndex >= workflow.steps.length) {
      console.warn(`📚 Invalid workflow or step: ${workflowId}/${stepIndex}`)
      return
    }

    const step = workflow.steps[stepIndex]
    step.status = 'in-progress'
    step.startTime = Date.now()
    step.data = data

    workflow.currentStep = stepIndex
    workflow.lastUpdate = Date.now()
    workflow.isPaused = false

    this.persistWorkflows()
    this.notifyListeners()

    performanceLogger.logEvent(PERF_OPS.WORKFLOW_STEP_START, {
      workflowId,
      stepIndex,
      stepType: step.type,
      stepId: step.id
    })

    console.log(`📚 Started step ${stepIndex} (${step.type}) in workflow ${workflowId}`)
  }

  /**
   * Complete a workflow step with result
   */
  static completeStep(workflowId: string, stepIndex: number, result?: any): void {
    const workflow = this.activeWorkflows.get(workflowId)
    if (!workflow || stepIndex >= workflow.steps.length) {
      console.warn(`📚 Invalid workflow or step: ${workflowId}/${stepIndex}`)
      return
    }

    const step = workflow.steps[stepIndex]
    step.status = 'completed'
    step.endTime = Date.now()
    step.result = result

    workflow.lastUpdate = Date.now()

    // Check if all steps are complete
    if (workflow.steps.every(s => s.status === 'completed')) {
      workflow.isComplete = true
      console.log(`📚 Workflow ${workflowId} completed successfully`)
    }

    this.persistWorkflows()
    this.notifyListeners()

    performanceLogger.logEvent(PERF_OPS.WORKFLOW_STEP_COMPLETE, {
      workflowId,
      stepIndex,
      stepType: step.type,
      stepId: step.id,
      duration: step.endTime! - step.startTime!
    })

    console.log(`📚 Completed step ${stepIndex} (${step.type}) in workflow ${workflowId}`)
  }

  /**
   * Fail a workflow step with error
   */
  static failStep(workflowId: string, stepIndex: number, error: Error): void {
    const workflow = this.activeWorkflows.get(workflowId)
    if (!workflow || stepIndex >= workflow.steps.length) {
      console.warn(`📚 Invalid workflow or step: ${workflowId}/${stepIndex}`)
      return
    }

    const step = workflow.steps[stepIndex]
    step.status = 'failed'
    step.endTime = Date.now()
    step.error = error
    step.retryCount = (step.retryCount || 0) + 1

    workflow.lastUpdate = Date.now()

    this.persistWorkflows()
    this.notifyListeners()

    performanceLogger.logEvent(PERF_OPS.WORKFLOW_STEP_FAIL, {
      workflowId,
      stepIndex,
      stepType: step.type,
      stepId: step.id,
      error: error.message,
      retryCount: step.retryCount
    })

    console.log(`📚 Failed step ${stepIndex} (${step.type}) in workflow ${workflowId}:`, error.message)
  }

  /**
   * Pause a workflow (e.g., due to network issues)
   */
  static pauseWorkflow(workflowId: string, reason?: string): void {
    const workflow = this.activeWorkflows.get(workflowId)
    if (!workflow) {
      console.warn(`📚 Workflow not found: ${workflowId}`)
      return
    }

    workflow.isPaused = true
    workflow.lastUpdate = Date.now()

    // Pause the current step if it's in progress
    const currentStep = workflow.steps[workflow.currentStep]
    if (currentStep && currentStep.status === 'in-progress') {
      currentStep.status = 'paused'
    }

    this.persistWorkflows()
    this.notifyListeners()

    console.log(`📚 Paused workflow ${workflowId}${reason ? ` (${reason})` : ''}`)
  }

  /**
   * Resume a paused workflow
   */
  static resumeWorkflow(workflowId: string): boolean {
    const workflow = this.activeWorkflows.get(workflowId)
    if (!workflow) {
      console.warn(`📚 Workflow not found: ${workflowId}`)
      return false
    }

    if (!workflow.isPaused) {
      console.log(`📚 Workflow ${workflowId} is not paused`)
      return true
    }

    workflow.isPaused = false
    workflow.lastUpdate = Date.now()

    // Resume the current step if it was paused
    const currentStep = workflow.steps[workflow.currentStep]
    if (currentStep && currentStep.status === 'paused') {
      currentStep.status = 'pending'
    }

    this.persistWorkflows()
    this.notifyListeners()

    console.log(`📚 Resumed workflow ${workflowId}`)
    return true
  }

  /**
   * Get workflow progress
   */
  static getWorkflow(workflowId: string): WorkflowProgress | undefined {
    return this.activeWorkflows.get(workflowId)
  }

  /**
   * Save/update a workflow (backwards compatibility)
   */
  static saveWorkflow(workflowId: string, workflow: any): void {
    const workflowProgress: WorkflowProgress = {
      id: workflowId,
      sessionId: workflow.sessionId || 'test-session',
      userId: workflow.userId || 'test-user',
      messageId: workflow.messageId,
      steps: workflow.steps || [],
      currentStep: workflow.currentStep || 0,
      startTime: workflow.startTime || Date.now(),
      lastUpdate: Date.now(),
      isComplete: workflow.isComplete || false,
      isPaused: workflow.isPaused || false
    }

    this.activeWorkflows.set(workflowId, workflowProgress)
    this.persistWorkflows()
    this.notifyListeners()
  }

  /**
   * Get all active workflows
   */
  static getActiveWorkflows(): WorkflowProgress[] {
    return Array.from(this.activeWorkflows.values())
      .filter(w => !w.isComplete)
      .sort((a, b) => b.lastUpdate - a.lastUpdate)
  }

  /**
   * Get recoverable workflows (paused or with failed steps that can be retried)
   */
  static getRecoverableWorkflows(): WorkflowProgress[] {
    return Array.from(this.activeWorkflows.values())
      .filter(w => 
        !w.isComplete && (
          w.isPaused || 
          w.steps.some(s => s.status === 'failed' && (s.retryCount || 0) < 3)
        )
      )
      .sort((a, b) => b.lastUpdate - a.lastUpdate)
  }

  /**
   * Remove a completed or failed workflow
   */
  static removeWorkflow(workflowId: string): void {
    const workflow = this.activeWorkflows.get(workflowId)
    if (workflow) {
      this.activeWorkflows.delete(workflowId)
      this.persistWorkflows()
      this.notifyListeners()
      console.log(`📚 Removed workflow ${workflowId}`)
    }
  }

  /**
   * Add listener for workflow changes
   */
  static addListener(callback: (workflows: WorkflowProgress[]) => void): void {
    this.listeners.add(callback)
  }

  /**
   * Remove listener
   */
  static removeListener(callback: (workflows: WorkflowProgress[]) => void): void {
    this.listeners.delete(callback)
  }

  /**
   * Notify all listeners of workflow changes
   */
  private static notifyListeners(): void {
    const workflows = this.getActiveWorkflows()
    this.listeners.forEach(callback => {
      try {
        callback(workflows)
      } catch (error) {
        console.warn('📚 Progress preservation listener error:', error)
      }
    })
  }

  /**
   * Persist workflows to localStorage
   */
  private static persistWorkflows(): void {
    try {
      const workflows = Array.from(this.activeWorkflows.values())
      const serialized = JSON.stringify(workflows, (key, value) => {
        // Don't serialize Error objects directly
        if (value instanceof Error) {
          return {
            name: value.name,
            message: value.message,
            stack: value.stack
          }
        }
        return value
      })
      
      localStorage.setItem(this.STORAGE_KEY, serialized)
    } catch (error) {
      console.warn('📚 Failed to persist workflows:', error)
    }
  }

  /**
   * Load workflows from localStorage
   */
  private static loadPersistedWorkflows(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) return

      const workflows: WorkflowProgress[] = JSON.parse(stored, (key, value) => {
        // Restore Error objects
        if (value && typeof value === 'object' && value.name && value.message) {
          const error = new Error(value.message)
          error.name = value.name
          error.stack = value.stack
          return error
        }
        return value
      })

      workflows.forEach(workflow => {
        this.activeWorkflows.set(workflow.id, workflow)
      })

      console.log(`📚 Loaded ${workflows.length} persisted workflows`)
    } catch (error) {
      console.warn('📚 Failed to load persisted workflows:', error)
      // Clear corrupted data
      localStorage.removeItem(this.STORAGE_KEY)
    }
  }

  /**
   * Clean up old completed workflows
   */
  private static cleanupOldWorkflows(): void {
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    let removed = 0

    for (const [id, workflow] of this.activeWorkflows.entries()) {
      // Remove completed workflows older than 24 hours
      if (workflow.isComplete && (now - workflow.lastUpdate) > maxAge) {
        this.activeWorkflows.delete(id)
        removed++
      }
    }

    // Limit total stored workflows
    const allWorkflows = Array.from(this.activeWorkflows.values())
      .sort((a, b) => b.lastUpdate - a.lastUpdate)
    
    if (allWorkflows.length > this.MAX_STORED_WORKFLOWS) {
      const toRemove = allWorkflows.slice(this.MAX_STORED_WORKFLOWS)
      toRemove.forEach(workflow => {
        this.activeWorkflows.delete(workflow.id)
        removed++
      })
    }

    if (removed > 0) {
      this.persistWorkflows()
      this.notifyListeners()
      console.log(`📚 Cleaned up ${removed} old workflows`)
    }
  }

  /**
   * Get workflow statistics
   */
  static getStatistics(): {
    total: number
    active: number
    completed: number
    paused: number
    failed: number
    recoverable: number
  } {
    const workflows = Array.from(this.activeWorkflows.values())
    
    return {
      total: workflows.length,
      active: workflows.filter(w => !w.isComplete && !w.isPaused).length,
      completed: workflows.filter(w => w.isComplete).length,
      paused: workflows.filter(w => w.isPaused).length,
      failed: workflows.filter(w => w.steps.some(s => s.status === 'failed')).length,
      recoverable: this.getRecoverableWorkflows().length
    }
  }

  /**
   * Clear all workflows (for testing)
   */
  static clearAllWorkflows(): void {
    this.activeWorkflows.clear()
    localStorage.removeItem(this.STORAGE_KEY)
    this.notifyListeners()
    console.log('📚 Cleared all workflows')
  }
}