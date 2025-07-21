'use client';

import { WorkflowExecution } from '../types/workflow';

interface WorkflowHistoryTabProps {
  workflowHistory: WorkflowExecution[];
  onSelectWorkflow: (execution: WorkflowExecution) => void;
}

export default function WorkflowHistoryTab({
  workflowHistory,
  onSelectWorkflow
}: WorkflowHistoryTabProps) {
  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end || new Date();
    const duration = endTime.getTime() - start.getTime();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCompletedStagesCount = (execution: WorkflowExecution) => {
    return execution.stages.filter(stage => stage.status === 'COMPLETED').length;
  };

  const getFailedStagesCount = (execution: WorkflowExecution) => {
    return execution.stages.filter(stage => stage.status === 'FAILED').length;
  };

  if (workflowHistory.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Workflow History</h3>
          <p className="text-gray-600">
            Execute workflows to see their execution history here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-gray-900">{workflowHistory.length}</div>
          <div className="text-sm text-gray-600">Total Executions</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-600">
            {workflowHistory.filter(w => w.status === 'COMPLETED').length}
          </div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-blue-600">
            {workflowHistory.filter(w => w.status === 'RUNNING').length}
          </div>
          <div className="text-sm text-gray-600">Running</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-red-600">
            {workflowHistory.filter(w => w.status === 'FAILED').length}
          </div>
          <div className="text-sm text-gray-600">Failed</div>
        </div>
      </div>

      {/* Workflow List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Execution History</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {workflowHistory.map((execution) => (
            <div
              key={execution.id}
              className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onSelectWorkflow(execution)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">
                      {execution.spec.workflowName}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(execution.status)}`}>
                      {execution.status}
                    </span>
                  </div>
                  
                  {execution.spec.description && (
                    <p className="text-gray-600 text-sm mb-2">{execution.spec.description}</p>
                  )}
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <div>
                      <span className="font-medium">ID:</span> {execution.id}
                    </div>
                    <div>
                      <span className="font-medium">Started:</span> {execution.startTime.toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Duration:</span> {formatDuration(execution.startTime, execution.endTime)}
                    </div>
                  </div>
                </div>

                <div className="text-right ml-4">
                  <div className="text-sm text-gray-500 mb-1">Progress</div>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm font-medium text-gray-900">
                      {getCompletedStagesCount(execution)} / {execution.stages.length}
                    </div>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          getFailedStagesCount(execution) > 0 ? 'bg-red-500' : 'bg-green-500'
                        }`}
                        style={{
                          width: `${(getCompletedStagesCount(execution) / execution.stages.length) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                  {getFailedStagesCount(execution) > 0 && (
                    <div className="text-xs text-red-600 mt-1">
                      {getFailedStagesCount(execution)} failed stages
                    </div>
                  )}
                </div>
              </div>

              {/* Stage Summary */}
              <div className="mt-4 flex flex-wrap gap-2">
                {execution.stages.map((stage) => (
                  <div
                    key={stage.id}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      stage.status === 'PENDING' ? 'bg-gray-100 text-gray-600' :
                      stage.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                      stage.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                      stage.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}
                    title={`${stage.id} - ${stage.function}`}
                  >
                    {stage.id}
                  </div>
                ))}
              </div>

              <div className="mt-3 text-xs text-blue-600 hover:text-blue-800">
                Click to view details →
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 