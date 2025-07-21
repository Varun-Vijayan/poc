'use client';

import { useState, useEffect, useRef } from 'react';
import WorkflowVisualization from './WorkflowVisualization';
import { WorkflowExecution, StageStatus } from '../types/workflow';

interface LiveUpdatesTabProps {
  workflowExecution: WorkflowExecution | null;
  liveUpdates: any[];
  addLiveUpdate: (update: any) => void;
  onWorkflowUpdated: (execution: WorkflowExecution) => void;
}

export default function LiveUpdatesTab({
  workflowExecution,
  liveUpdates,
  addLiveUpdate,
  onWorkflowUpdated
}: LiveUpdatesTabProps) {
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const updatesEndRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new updates arrive
  useEffect(() => {
    if (autoScroll && updatesEndRef.current) {
      updatesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveUpdates, autoScroll]);

  // Poll for workflow status updates
  useEffect(() => {
    if (workflowExecution && workflowExecution.status === 'RUNNING') {
      setIsPolling(true);
      const interval = setInterval(async () => {
        try {
          const [statusResponse, resultResponse] = await Promise.all([
            fetch(`/api/workflows/status/${workflowExecution.id}`),
            fetch(`/api/workflows/result/${workflowExecution.id}`)
          ]);

          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            
            addLiveUpdate({
              timestamp: new Date(),
              type: 'status_check',
              workflowId: workflowExecution.id,
              message: `Status check: ${statusData.status?.name || 'Unknown'}`,
              data: statusData
            });
          }

          if (resultResponse.ok) {
            const resultData = await resultResponse.json();
            
            if (resultData.result && Array.isArray(resultData.result)) {
              // Update workflow execution with latest results
              const updatedExecution: WorkflowExecution = {
                ...workflowExecution,
                stages: workflowExecution.stages.map(stage => {
                  const resultStage = resultData.result.find((r: any) => r.stageId === stage.id);
                  if (resultStage) {
                    return {
                      ...stage,
                      status: resultStage.status as StageStatus,
                      startTime: resultStage.startTime ? new Date(resultStage.startTime) : stage.startTime,
                      endTime: resultStage.endTime ? new Date(resultStage.endTime) : stage.endTime,
                      result: resultStage.result,
                      error: resultStage.error
                    };
                  }
                  return stage;
                }),
                status: resultData.result.every((r: any) => r.status === 'COMPLETED') ? 'COMPLETED' :
                        resultData.result.some((r: any) => r.status === 'FAILED') ? 'FAILED' : 'RUNNING',
                endTime: resultData.result.every((r: any) => r.status === 'COMPLETED' || r.status === 'FAILED') ? 
                         new Date() : undefined
              };

              onWorkflowUpdated(updatedExecution);

              // Add live updates for stage changes
              resultData.result.forEach((stageResult: any) => {
                const previousStage = workflowExecution.stages.find(s => s.id === stageResult.stageId);
                if (previousStage && previousStage.status !== stageResult.status) {
                  addLiveUpdate({
                    timestamp: new Date(),
                    type: 'stage_update',
                    workflowId: workflowExecution.id,
                    message: `Stage "${stageResult.stageId}" changed to ${stageResult.status}`,
                    data: stageResult
                  });
                }
              });

              // Stop polling if workflow is complete
              if (updatedExecution.status !== 'RUNNING') {
                setIsPolling(false);
                addLiveUpdate({
                  timestamp: new Date(),
                  type: 'workflow_completed',
                  workflowId: workflowExecution.id,
                  message: `Workflow completed with status: ${updatedExecution.status}`,
                  data: { finalStatus: updatedExecution.status }
                });
              }
            }
          }
        } catch (error) {
          console.error('Error polling workflow status:', error);
          addLiveUpdate({
            timestamp: new Date(),
            type: 'error',
            workflowId: workflowExecution.id,
            message: `Polling error: ${error}`,
            data: { error: String(error) }
          });
        }
      }, 2000); // Poll every 2 seconds

      setPollingInterval(interval);

      return () => {
        clearInterval(interval);
        setPollingInterval(null);
        setIsPolling(false);
      };
    } else {
      setIsPolling(false);
    }
  }, [workflowExecution, addLiveUpdate, onWorkflowUpdated]);

  const getUpdateIcon = (type: string) => {
    switch (type) {
      case 'workflow_started':
        return '🚀';
      case 'stage_update':
        return '⚡';
      case 'workflow_completed':
        return '✅';
      case 'error':
        return '❌';
      case 'status_check':
        return '🔄';
      default:
        return '📡';
    }
  };

  const getUpdateColor = (type: string) => {
    switch (type) {
      case 'workflow_started':
        return 'text-blue-600';
      case 'stage_update':
        return 'text-green-600';
      case 'workflow_completed':
        return 'text-green-700';
      case 'error':
        return 'text-red-600';
      case 'status_check':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  if (!workflowExecution) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📡</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Workflow</h3>
          <p className="text-gray-600">
            Execute a workflow to see live updates here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Workflow Status Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{workflowExecution.spec.workflowName}</h2>
            <p className="text-gray-600 mt-1">Live Monitoring</p>
          </div>
          <div className="flex items-center space-x-4">
            {isPolling && (
              <div className="flex items-center space-x-2 text-blue-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm">Live Updates</span>
              </div>
            )}
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              workflowExecution.status === 'RUNNING' ? 'bg-blue-100 text-blue-800' :
              workflowExecution.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
              workflowExecution.status === 'FAILED' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {workflowExecution.status}
            </div>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-lg font-bold text-gray-900">
              {workflowExecution.stages.filter(s => s.status === 'COMPLETED').length}
            </div>
            <div className="text-xs text-gray-600">Completed</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-lg font-bold text-blue-600">
              {workflowExecution.stages.filter(s => s.status === 'IN_PROGRESS').length}
            </div>
            <div className="text-xs text-gray-600">In Progress</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <div className="text-lg font-bold text-red-600">
              {workflowExecution.stages.filter(s => s.status === 'FAILED').length}
            </div>
            <div className="text-xs text-gray-600">Failed</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-lg font-bold text-gray-600">
              {workflowExecution.stages.filter(s => s.status === 'PENDING').length}
            </div>
            <div className="text-xs text-gray-600">Pending</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Visualization */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Live Workflow Visualization</h3>
          <WorkflowVisualization 
            workflowExecution={workflowExecution}
            workflowSpec={workflowExecution.spec}
          />
        </div>

        {/* Live Updates Feed */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Live Updates</h3>
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-1 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded"
                />
                <span>Auto-scroll</span>
              </label>
              <span className="text-xs text-gray-500">{liveUpdates.length} updates</span>
            </div>
          </div>
          
          <div className="h-96 overflow-y-auto border rounded-lg p-4 space-y-3">
            {liveUpdates.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="text-2xl mb-2">📡</div>
                <p>Waiting for updates...</p>
              </div>
            ) : (
              liveUpdates.map((update, index) => (
                <div key={index} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className="text-lg">{getUpdateIcon(update.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`text-sm font-medium ${getUpdateColor(update.type)}`}>
                        {update.type.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {update.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900">{update.message}</p>
                    {update.data && (
                      <details className="mt-1">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                          View details
                        </summary>
                        <pre className="text-xs text-gray-600 mt-1 p-2 bg-gray-100 rounded overflow-x-auto">
                          {JSON.stringify(update.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={updatesEndRef} />
          </div>
        </div>
      </div>

      {/* Stage Details with Live Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Stage Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflowExecution.stages.map((stage) => (
            <div key={stage.id} className={`border rounded-lg p-4 ${
              stage.status === 'COMPLETED' ? 'border-green-200 bg-green-50' :
              stage.status === 'IN_PROGRESS' ? 'border-blue-200 bg-blue-50' :
              stage.status === 'FAILED' ? 'border-red-200 bg-red-50' :
              'border-gray-200'
            }`}>
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-gray-900">{stage.id}</h4>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  stage.status === 'PENDING' ? 'bg-gray-100 text-gray-600' :
                  stage.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                  stage.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                  stage.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {stage.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{stage.function}</p>
              
              {stage.startTime && (
                <div className="text-xs text-gray-500">
                  Started: {stage.startTime.toLocaleTimeString()}
                </div>
              )}
              
              {stage.endTime && (
                <div className="text-xs text-gray-500">
                  Duration: {Math.round((stage.endTime.getTime() - (stage.startTime?.getTime() || 0)) / 1000)}s
                </div>
              )}
              
              {stage.error && (
                <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-xs text-red-700">
                  {stage.error}
                </div>
              )}
              
              {stage.result && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                    View result
                  </summary>
                  <pre className="text-xs text-gray-600 mt-1 p-2 bg-gray-100 rounded overflow-x-auto">
                    {JSON.stringify(stage.result, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 