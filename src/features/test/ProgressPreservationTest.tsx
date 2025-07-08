import { useState, useEffect } from 'react'
import { ProgressPreservationService } from '@/lib/progress-preservation'
import { useProgressPreservation } from '@/hooks/useProgressPreservation'
import { WorkflowProgressMonitor } from '@/features/workflow/WorkflowProgressMonitor'

export function ProgressPreservationTest() {
  const {
    activeWorkflows,
    recoverableWorkflows,
    statistics,
    createWorkflow,
    startStep,
    completeStep,
    failStep,
    pauseWorkflow,
    resumeWorkflow
  } = useProgressPreservation()

  const [currentWorkflowId, setCurrentWorkflowId] = useState<string>('')
  const [simulationRunning, setSimulationRunning] = useState(false)

  useEffect(() => {
    // Initialize the progress preservation service
    ProgressPreservationService.initialize()
  }, [])

  const createTestWorkflow = () => {
    const workflowId = createWorkflow(
      'test_session_123',
      'test_user_456',
      [
        { id: 'recording', type: 'recording' },
        { id: 'transcription', type: 'transcription' },
        { id: 'translation', type: 'translation' },
        { id: 'database', type: 'database' },
        { id: 'tts', type: 'tts' }
      ]
    )
    setCurrentWorkflowId(workflowId)
    console.log('Created test workflow:', workflowId)
  }

  const simulateWorkflowExecution = async () => {
    if (!currentWorkflowId) {
      createTestWorkflow()
      return
    }

    setSimulationRunning(true)
    const workflow = ProgressPreservationService.getWorkflow(currentWorkflowId)
    if (!workflow) {
      setSimulationRunning(false)
      return
    }

    try {
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i]
        
        // Start step
        startStep(currentWorkflowId, i, { stepData: `Test data for ${step.type}` })
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
        
        // Randomly fail some steps to test recovery
        if (Math.random() < 0.2) {
          failStep(currentWorkflowId, i, new Error(`Simulated ${step.type} failure`))
          break
        } else {
          completeStep(currentWorkflowId, i, { result: `${step.type} completed successfully` })
        }
      }
    } catch (error) {
      console.error('Simulation error:', error)
    } finally {
      setSimulationRunning(false)
    }
  }

  const simulateNetworkDrop = () => {
    if (currentWorkflowId) {
      pauseWorkflow(currentWorkflowId, 'Network connection lost')
    }
  }

  const simulateNetworkRestore = () => {
    if (currentWorkflowId) {
      resumeWorkflow(currentWorkflowId)
    }
  }

  const testStepOperations = () => {
    if (!currentWorkflowId) {
      createTestWorkflow()
      return
    }

    const workflow = ProgressPreservationService.getWorkflow(currentWorkflowId)
    if (!workflow) return

    const currentStepIndex = workflow.currentStep

    // Start current step
    startStep(currentWorkflowId, currentStepIndex, { 
      testData: 'Manual test data',
      timestamp: Date.now()
    })

    setTimeout(() => {
      // Complete step after 2 seconds
      completeStep(currentWorkflowId, currentStepIndex, {
        success: true,
        result: `Step ${currentStepIndex} completed manually`
      })
    }, 2000)
  }

  const clearAllWorkflows = () => {
    ProgressPreservationService.clearAllWorkflows()
    setCurrentWorkflowId('')
  }

  const createMultipleWorkflows = () => {
    const workflowTypes = [
      { steps: [{ id: 'rec1', type: 'recording' }, { id: 'trans1', type: 'transcription' }] },
      { steps: [{ id: 'rec2', type: 'recording' }, { id: 'trans2', type: 'transcription' }, { id: 'tts2', type: 'tts' }] },
      { steps: [{ id: 'db1', type: 'database' }, { id: 'trans3', type: 'translation' }] }
    ]

    workflowTypes.forEach((workflow, index) => {
      createWorkflow(
        `session_${index + 1}`,
        `user_${index + 1}`,
        workflow.steps as any
      )
    })
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          📚 Progress Preservation System Test
        </h2>
        <p className="text-gray-600 mb-6">
          This system preserves workflow progress across network interruptions and allows resuming from where you left off.
        </p>

        {/* Control Panel */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Test Controls</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <button
              onClick={createTestWorkflow}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
            >
              Create Test Workflow
            </button>
            <button
              onClick={simulateWorkflowExecution}
              disabled={simulationRunning || !currentWorkflowId}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-300 text-sm"
            >
              {simulationRunning ? 'Running...' : 'Simulate Execution'}
            </button>
            <button
              onClick={testStepOperations}
              disabled={!currentWorkflowId}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:bg-gray-300 text-sm"
            >
              Test Step Operations
            </button>
            <button
              onClick={simulateNetworkDrop}
              disabled={!currentWorkflowId}
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:bg-gray-300 text-sm"
            >
              Simulate Network Drop
            </button>
            <button
              onClick={simulateNetworkRestore}
              disabled={!currentWorkflowId}
              className="bg-teal-500 text-white px-4 py-2 rounded hover:bg-teal-600 disabled:bg-gray-300 text-sm"
            >
              Restore Network
            </button>
            <button
              onClick={createMultipleWorkflows}
              className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 text-sm"
            >
              Create Multiple
            </button>
          </div>
          <div className="mt-3 flex gap-3">
            <button
              onClick={clearAllWorkflows}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 text-sm"
            >
              Clear All Workflows
            </button>
          </div>
        </div>

        {/* Current Workflow Info */}
        {currentWorkflowId && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Current Test Workflow</h3>
            <div className="text-sm text-blue-800">
              <div>ID: <span className="font-mono bg-blue-100 px-2 py-1 rounded">{currentWorkflowId}</span></div>
              <div className="mt-1">
                This workflow simulates a complete translation process: Recording → Transcription → Translation → Database → TTS
              </div>
            </div>
          </div>
        )}

        {/* Workflow Progress Monitor */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Workflow Progress Monitor</h3>
          <WorkflowProgressMonitor 
            showRecoverable={true}
            onResumeWorkflow={(id) => {
              console.log('Resuming workflow:', id)
              setCurrentWorkflowId(id)
            }}
          />
        </div>

        {/* Technical Details */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">System Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Progress Preservation</h4>
              <ul className="text-gray-600 space-y-1">
                <li>• Workflows stored in localStorage</li>
                <li>• Survives page refresh and network drops</li>
                <li>• Automatic cleanup of old workflows</li>
                <li>• Real-time progress tracking</li>
                <li>• Error state preservation</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Recovery Features</h4>
              <ul className="text-gray-600 space-y-1">
                <li>• Resume from any step</li>
                <li>• Retry failed operations</li>
                <li>• Pause/resume workflows</li>
                <li>• Network disruption handling</li>
                <li>• Performance monitoring integration</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Integration Notes */}
        <div className="bg-yellow-50 rounded-lg p-4 mt-4">
          <h3 className="font-semibold text-yellow-900 mb-2">Integration with Mobile Network Resilience</h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• Works seamlessly with retry logic from Phase 2</li>
            <li>• Uses quality degradation settings from Phase 3</li>
            <li>• Automatically pauses workflows during network drops</li>
            <li>• Preserves exact workflow order: recording → transcription → translation → complete</li>
            <li>• Integrates with performance logging for optimization insights</li>
          </ul>
        </div>
      </div>
    </div>
  )
}