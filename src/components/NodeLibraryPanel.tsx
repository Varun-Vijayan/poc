'use client';

import { PredefinedFunctions } from '../types/workflow';

interface NodeLibraryPanelProps {
  onAddNode: (functionType: PredefinedFunctions) => void;
  onClose: () => void;
}

const FUNCTION_CATEGORIES = {
  'Input & Validation': [
    {
      type: PredefinedFunctions.VALIDATE_USER_INPUT,
      icon: '✓',
      description: 'Validate required fields and formats',
      color: 'bg-blue-100 border-blue-300 text-blue-800'
    }
  ],
  'Processing': [
    {
      type: PredefinedFunctions.CREATE_USER_ACCOUNT,
      icon: '👤',
      description: 'Create user accounts (simulated)',
      color: 'bg-purple-100 border-purple-300 text-purple-800'
    },
    {
      type: PredefinedFunctions.HTTP_REQUEST,
      icon: '🌐',
      description: 'Make HTTP requests to external APIs',
      color: 'bg-orange-100 border-orange-300 text-orange-800'
    },
    {
      type: PredefinedFunctions.DELAY,
      icon: '⏰',
      description: 'Add delays to workflows',
      color: 'bg-yellow-100 border-yellow-300 text-yellow-800'
    }
  ],
  'Notifications & Logging': [
    {
      type: PredefinedFunctions.SEND_EMAIL_NOTIFICATION,
      icon: '📧',
      description: 'Send emails via SendGrid (or mock)',
      color: 'bg-green-100 border-green-300 text-green-800'
    },
    {
      type: PredefinedFunctions.LOG_EVENT,
      icon: '📝',
      description: 'Log events with different levels',
      color: 'bg-gray-100 border-gray-300 text-gray-800'
    }
  ]
};

export default function NodeLibraryPanel({ onAddNode, onClose }: NodeLibraryPanelProps) {
  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Block Library</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Drag blocks to the canvas or click to add them
        </p>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-100">
        <input
          type="text"
          placeholder="Search blocks..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(FUNCTION_CATEGORIES).map(([category, functions]) => (
          <div key={category} className="p-4 border-b border-gray-100">
            <h4 className="text-sm font-medium text-gray-900 mb-3 uppercase tracking-wide">
              {category}
            </h4>
            <div className="space-y-2">
              {functions.map((func) => (
                <button
                  key={func.type}
                  onClick={() => onAddNode(func.type)}
                  className={`
                    w-full text-left p-3 rounded-lg border-2 transition-all duration-200
                    ${func.color}
                    hover:shadow-md hover:scale-105 active:scale-95
                  `}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/reactflow', func.type);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <div className="text-lg flex-shrink-0">{func.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm leading-tight mb-1">
                        {func.type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </div>
                      <div className="text-xs opacity-75 leading-relaxed">
                        {func.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600">
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Click to add to canvas</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Drag to position precisely</span>
          </div>
        </div>
      </div>
    </div>
  );
} 