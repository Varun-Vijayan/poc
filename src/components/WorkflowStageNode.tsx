'use client';

import { Handle, Position } from 'reactflow';
import { WorkflowExecutionStage, StageStatus } from '../types/workflow';

interface WorkflowStageNodeProps {
  data: {
    stage: WorkflowExecutionStage;
    label: string;
  };
}

export default function WorkflowStageNode({ data }: WorkflowStageNodeProps) {
  const { stage } = data;

  const getStatusColor = (status: StageStatus) => {
    switch (status) {
      case StageStatus.PENDING:
        return 'border-gray-300 bg-gray-50 text-gray-700';
      case StageStatus.IN_PROGRESS:
        return 'border-blue-400 bg-blue-50 text-blue-800';
      case StageStatus.COMPLETED:
        return 'border-green-400 bg-green-50 text-green-800';
      case StageStatus.FAILED:
        return 'border-red-400 bg-red-50 text-red-800';
      default:
        return 'border-gray-300 bg-gray-50 text-gray-700';
    }
  };

  const getStatusIcon = (status: StageStatus) => {
    switch (status) {
      case StageStatus.PENDING:
        return '⏳';
      case StageStatus.IN_PROGRESS:
        return '🔄';
      case StageStatus.COMPLETED:
        return '✅';
      case StageStatus.FAILED:
        return '❌';
      default:
        return '⏳';
    }
  };

  const formatDuration = (startTime?: Date, endTime?: Date) => {
    if (!startTime) return null;
    const end = endTime || new Date();
    const duration = end.getTime() - startTime.getTime();
    return `${(duration / 1000).toFixed(1)}s`;
  };

  return (
    <div className={`workflow-stage ${getStatusColor(stage.status)} min-w-[200px] max-w-[250px]`}>
      <Handle type="target" position={Position.Left} />
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            {stage.function}
          </div>
          <div className="text-lg">
            {getStatusIcon(stage.status)}
          </div>
        </div>
        
        <div className="text-sm font-medium">
          {stage.id}
        </div>
        
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-600">Status:</span>
            <span className="font-medium">{stage.status}</span>
          </div>
          
          {stage.startTime && (
            <div className="flex justify-between">
              <span className="text-gray-600">Duration:</span>
              <span className="font-medium">
                {formatDuration(stage.startTime, stage.endTime)}
              </span>
            </div>
          )}
          
          {stage.error && (
            <div className="text-red-600 text-xs mt-1 p-1 bg-red-100 rounded">
              {stage.error}
            </div>
          )}
        </div>
        
        {/* Parameters preview */}
        {Object.keys(stage.params).length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
              Parameters
            </summary>
            <div className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-hidden">
              <pre className="whitespace-pre-wrap break-words">
                {JSON.stringify(stage.params, null, 2)}
              </pre>
            </div>
          </details>
        )}
        
        {/* Result preview */}
        {stage.result && (
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
              Result
            </summary>
            <div className="mt-1 p-2 bg-green-100 rounded text-xs overflow-hidden">
              <pre className="whitespace-pre-wrap break-words">
                {JSON.stringify(stage.result, null, 2)}
              </pre>
            </div>
          </details>
        )}
      </div>
      
      <Handle type="source" position={Position.Right} />
    </div>
  );
} 