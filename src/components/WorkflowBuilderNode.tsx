'use client';

import { Handle, Position } from 'reactflow';
import { PredefinedFunctions } from '../types/workflow';

interface WorkflowBuilderNodeProps {
  data: {
    function: PredefinedFunctions;
    label: string;
    params: Record<string, any>;
    isConfigured: boolean;
  };
  selected: boolean;
}

export default function WorkflowBuilderNode({ data, selected }: WorkflowBuilderNodeProps) {
  const { function: functionType, params, isConfigured } = data;

  const getNodeIcon = (func: PredefinedFunctions) => {
    switch (func) {
      case PredefinedFunctions.VALIDATE_USER_INPUT:
        return '✓';
      case PredefinedFunctions.SEND_EMAIL_NOTIFICATION:
        return '📧';
      case PredefinedFunctions.CREATE_USER_ACCOUNT:
        return '👤';
      case PredefinedFunctions.LOG_EVENT:
        return '📝';
      case PredefinedFunctions.DELAY:
        return '⏰';
      case PredefinedFunctions.HTTP_REQUEST:
        return '🌐';
      default:
        return '⚙️';
    }
  };

  const getNodeColor = (func: PredefinedFunctions) => {
    switch (func) {
      case PredefinedFunctions.VALIDATE_USER_INPUT:
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case PredefinedFunctions.SEND_EMAIL_NOTIFICATION:
        return 'bg-green-100 border-green-300 text-green-800';
      case PredefinedFunctions.CREATE_USER_ACCOUNT:
        return 'bg-purple-100 border-purple-300 text-purple-800';
      case PredefinedFunctions.LOG_EVENT:
        return 'bg-gray-100 border-gray-300 text-gray-800';
      case PredefinedFunctions.DELAY:
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case PredefinedFunctions.HTTP_REQUEST:
        return 'bg-orange-100 border-orange-300 text-orange-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getConfigurationSummary = () => {
    if (!isConfigured) return 'Not configured';
    
    const keys = Object.keys(params);
    if (keys.length === 0) return 'No parameters';
    
    return `${keys.length} parameter${keys.length !== 1 ? 's' : ''}`;
  };

  return (
    <div className={`
      relative rounded-lg border-2 shadow-lg transition-all duration-200 min-w-[200px] max-w-[250px]
      ${getNodeColor(functionType)}
      ${selected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
      ${isConfigured ? '' : 'border-dashed opacity-75'}
    `}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />

      <div className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="text-lg">{getNodeIcon(functionType)}</div>
          {!isConfigured && (
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="Not configured" />
          )}
        </div>

        {/* Function Name */}
        <div className="font-medium text-sm leading-tight">
          {functionType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
        </div>

        {/* Configuration Status */}
        <div className="text-xs opacity-75">
          {getConfigurationSummary()}
        </div>

        {/* Parameter Preview */}
        {isConfigured && Object.keys(params).length > 0 && (
          <div className="text-xs bg-white bg-opacity-50 rounded px-2 py-1">
            {Object.entries(params).slice(0, 2).map(([key, value]) => (
              <div key={key} className="truncate">
                <span className="font-medium">{key}:</span> {String(value)}
              </div>
            ))}
            {Object.keys(params).length > 2 && (
              <div className="text-gray-600">
                +{Object.keys(params).length - 2} more...
              </div>
            )}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />
    </div>
  );
} 