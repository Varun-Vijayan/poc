'use client';

import { useState, useEffect } from 'react';
import WorkflowVisualization from './WorkflowVisualization';
import { WorkflowSpec, WorkflowExecution, StageStatus } from '../types/workflow';

interface WorkflowExecutionTabProps {
  workflowSpec: WorkflowSpec | null;
  workflowId: string | null;
  onWorkflowExecutionStarted: (execution: WorkflowExecution) => void;
  onWorkflowUpdated: (execution: WorkflowExecution) => void;
  addLiveUpdate: (update: any) => void;
}

export default function WorkflowExecutionTab({
  workflowSpec,
  workflowId,
  onWorkflowExecutionStarted,
  onWorkflowUpdated,
  addLiveUpdate
}: WorkflowExecutionTabProps) {
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentExecution, setCurrentExecution] = useState<WorkflowExecution | null>(null);

  const handleExecuteWorkflow = async () => {
    if (!workflowSpec || !workflowId) {
      setError('No workflow to execute');
      return;
    }

    setExecuting(true);
    setError(null);

    try {
      const response = await fetch('/api/workflows/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflowId,
          spec: workflowSpec,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to execute workflow');
      }

      // Create initial execution state
      const execution: WorkflowExecution = {
        id: workflowId,
        spec: workflowSpec,
        stages: workflowSpec.stages.map(stage => ({
          ...stage,
          status: StageStatus.PENDING,
        })),
        status: 'RUNNING',
        startTime: new Date(),
      };

      setCurrentExecution(execution);
      onWorkflowExecutionStarted(execution);
      
      addLiveUpdate({
        timestamp: new Date(),
        type: 'workflow_started',
        workflowId,
        message: `Workflow "${workflowSpec.workflowName}" started`,
        data: { stageCount: workflowSpec.stages.length }
      });

    } catch (err: any) {
      setError(`Failed to execute workflow: ${err.message}`);
      addLiveUpdate({
        timestamp: new Date(),
        type: 'error',
        workflowId,
        message: `Failed to start workflow: ${err.message}`,
        data: { error: err.message }
      });
    } finally {
      setExecuting(false);
    }
  };

  if (!workflowSpec) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🚀</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Workflow Loaded</h3>
          <p className="text-gray-600">
            Please upload a workflow specification first to execute it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Workflow Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{workflowSpec.workflowName}</h2>
            {workflowSpec.description && (
              <p className="text-gray-600 mt-1">{workflowSpec.description}</p>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Workflow ID</div>
            <div className="font-mono text-sm text-gray-900">{workflowId}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">{workflowSpec.stages.length}</div>
            <div className="text-sm text-gray-600">Total Stages</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">
              {workflowSpec.stages.filter(s => !s.dependsOn || s.dependsOn.length === 0).length}
            </div>
            <div className="text-sm text-gray-600">Independent Stages</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">
              {workflowSpec.stages.filter(s => s.dependsOn && s.dependsOn.length > 0).length}
            </div>
            <div className="text-sm text-gray-600">Dependent Stages</div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="text-red-800 text-sm">{error}</div>
          </div>
        )}

        {/* Execution Controls */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleExecuteWorkflow}
              disabled={executing}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {executing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Execute Workflow</span>
                </>
              )}
            </button>
            
            {currentExecution && (
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                currentExecution.status === 'RUNNING' ? 'bg-blue-100 text-blue-800' :
                currentExecution.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                currentExecution.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {currentExecution.status}
              </div>
            )}
          </div>

          <div className="text-sm text-gray-500">
            {currentExecution ? (
              <>Started: {currentExecution.startTime.toLocaleString()}</>
            ) : (
              'Ready to execute'
            )}
          </div>
        </div>
      </div>

      {/* Workflow Visualization */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Workflow Visualization</h3>
        <WorkflowVisualization 
          workflowExecution={currentExecution}
          workflowSpec={workflowSpec}
        />
      </div>

      {/* Stage Details */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Stage Details</h3>
        <div className="space-y-4">
          {workflowSpec.stages.map((stage, index) => (
            <div key={stage.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{stage.id}</h4>
                    <p className="text-sm text-gray-600">{stage.function}</p>
                  </div>
                </div>
                <div className="text-right">
                  {currentExecution && (
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      currentExecution.stages.find(s => s.id === stage.id)?.status === StageStatus.PENDING ? 'bg-gray-100 text-gray-800' :
                      currentExecution.stages.find(s => s.id === stage.id)?.status === StageStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-800' :
                      currentExecution.stages.find(s => s.id === stage.id)?.status === StageStatus.COMPLETED ? 'bg-green-100 text-green-800' :
                      currentExecution.stages.find(s => s.id === stage.id)?.status === StageStatus.FAILED ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {currentExecution.stages.find(s => s.id === stage.id)?.status || 'PENDING'}
                    </div>
                  )}
                </div>
              </div>
              
              {stage.dependsOn && stage.dependsOn.length > 0 && (
                <div className="mb-2">
                  <span className="text-xs text-gray-500">Depends on: </span>
                  <span className="text-xs text-gray-700">{stage.dependsOn.join(', ')}</span>
                </div>
              )}
              
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                  View Parameters
                </summary>
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                  <pre>{JSON.stringify(stage.params, null, 2)}</pre>
                </div>
              </details>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 