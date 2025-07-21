'use client';

import { useState, useEffect } from 'react';
import { Node } from 'reactflow';
import { PredefinedFunctions } from '../types/workflow';

interface NodeConfigPanelProps {
  node: Node;
  onUpdateConfig: (params: Record<string, any>) => void;
  onClose: () => void;
}

export default function NodeConfigPanel({ node, onUpdateConfig, onClose }: NodeConfigPanelProps) {
  const [params, setParams] = useState<Record<string, any>>(node.data.params || {});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setParams(node.data.params || {});
  }, [node]);

  const handleParamChange = (key: string, value: any) => {
    const newParams = { ...params, [key]: value };
    setParams(newParams);
    
    // Clear error for this field
    if (errors[key]) {
      setErrors({ ...errors, [key]: '' });
    }
  };

  const handleSave = () => {
    const validationErrors = validateParams(node.data.function, params);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    onUpdateConfig(params);
    onClose();
  };

  const renderConfigFields = () => {
    const functionType = node.data.function as PredefinedFunctions;

    switch (functionType) {
      case PredefinedFunctions.VALIDATE_USER_INPUT:
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fields to Validate
              </label>
              <textarea
                value={Array.isArray(params.fields) ? params.fields.join(', ') : ''}
                onChange={(e) => handleParamChange('fields', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                placeholder="email, name, phone"
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  errors.fields ? 'border-red-300' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                rows={2}
              />
              {errors.fields && <p className="text-red-600 text-xs mt-1">{errors.fields}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Data (JSON)
              </label>
              <textarea
                value={typeof params.data === 'object' ? JSON.stringify(params.data, null, 2) : '{}'}
                onChange={(e) => {
                  try {
                    const data = JSON.parse(e.target.value);
                    handleParamChange('data', data);
                  } catch {
                    // Keep the raw string for now
                  }
                }}
                placeholder='{"email": "test@example.com", "name": "Test User"}'
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>
          </>
        );

      case PredefinedFunctions.SEND_EMAIL_NOTIFICATION:
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={params.email || ''}
                onChange={(e) => handleParamChange('email', e.target.value)}
                placeholder="recipient@example.com"
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={params.subject || ''}
                onChange={(e) => handleParamChange('subject', e.target.value)}
                placeholder="Email subject"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content
              </label>
              <textarea
                value={params.content || ''}
                onChange={(e) => handleParamChange('content', e.target.value)}
                placeholder="Email content..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>
          </>
        );

      case PredefinedFunctions.CREATE_USER_ACCOUNT:
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={params.email || ''}
                onChange={(e) => handleParamChange('email', e.target.value)}
                placeholder="user@example.com"
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                value={params.name || ''}
                onChange={(e) => handleParamChange('name', e.target.value)}
                placeholder="John Doe"
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                value={params.role || 'user'}
                onChange={(e) => handleParamChange('role', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="premium">Premium</option>
                <option value="employee">Employee</option>
              </select>
            </div>
          </>
        );

      case PredefinedFunctions.LOG_EVENT:
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Name *
              </label>
              <input
                type="text"
                value={params.event || ''}
                onChange={(e) => handleParamChange('event', e.target.value)}
                placeholder="workflow_started"
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  errors.event ? 'border-red-300' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.event && <p className="text-red-600 text-xs mt-1">{errors.event}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Log Level
              </label>
              <select
                value={params.level || 'info'}
                onChange={(e) => handleParamChange('level', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="info">Info</option>
                <option value="warn">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Data (JSON)
              </label>
              <textarea
                value={typeof params.data === 'object' ? JSON.stringify(params.data, null, 2) : '{}'}
                onChange={(e) => {
                  try {
                    const data = JSON.parse(e.target.value);
                    handleParamChange('data', data);
                  } catch {
                    // Keep the raw string for now
                  }
                }}
                placeholder='{"key": "value"}'
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
          </>
        );

      case PredefinedFunctions.DELAY:
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Delay Duration (seconds) *
            </label>
            <input
              type="number"
              min="1"
              value={params.seconds || 1}
              onChange={(e) => handleParamChange('seconds', parseInt(e.target.value) || 1)}
              placeholder="5"
              className={`w-full px-3 py-2 border rounded-md text-sm ${
                errors.seconds ? 'border-red-300' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {errors.seconds && <p className="text-red-600 text-xs mt-1">{errors.seconds}</p>}
          </div>
        );

      case PredefinedFunctions.HTTP_REQUEST:
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL *
              </label>
              <input
                type="url"
                value={params.url || ''}
                onChange={(e) => handleParamChange('url', e.target.value)}
                placeholder="https://api.example.com/endpoint"
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  errors.url ? 'border-red-300' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.url && <p className="text-red-600 text-xs mt-1">{errors.url}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Method
              </label>
              <select
                value={params.method || 'GET'}
                onChange={(e) => handleParamChange('method', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Headers (JSON)
              </label>
              <textarea
                value={typeof params.headers === 'object' ? JSON.stringify(params.headers, null, 2) : '{}'}
                onChange={(e) => {
                  try {
                    const headers = JSON.parse(e.target.value);
                    handleParamChange('headers', headers);
                  } catch {
                    // Keep the raw string for now
                  }
                }}
                placeholder='{"Content-Type": "application/json"}'
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            {(params.method === 'POST' || params.method === 'PUT') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Request Body (JSON)
                </label>
                <textarea
                  value={typeof params.data === 'object' ? JSON.stringify(params.data, null, 2) : '{}'}
                  onChange={(e) => {
                    try {
                      const data = JSON.parse(e.target.value);
                      handleParamChange('data', data);
                    } catch {
                      // Keep the raw string for now
                    }
                  }}
                  placeholder='{"key": "value"}'
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
              </div>
            )}
          </>
        );

      default:
        return (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">⚙️</div>
            <p>No configuration needed for this function</p>
          </div>
        );
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Configure Node</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {node.data.function.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase())}
        </p>
      </div>

      {/* Configuration Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {renderConfigFields()}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex space-x-2">
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Save Configuration
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function validateParams(functionType: PredefinedFunctions, params: Record<string, any>): Record<string, string> {
  const errors: Record<string, string> = {};

  switch (functionType) {
    case PredefinedFunctions.VALIDATE_USER_INPUT:
      if (!params.fields || !Array.isArray(params.fields) || params.fields.length === 0) {
        errors.fields = 'At least one field is required';
      }
      break;

    case PredefinedFunctions.SEND_EMAIL_NOTIFICATION:
      if (!params.email || !params.email.trim()) {
        errors.email = 'Email address is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.email)) {
        errors.email = 'Invalid email address';
      }
      break;

    case PredefinedFunctions.CREATE_USER_ACCOUNT:
      if (!params.email || !params.email.trim()) {
        errors.email = 'Email address is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.email)) {
        errors.email = 'Invalid email address';
      }
      if (!params.name || !params.name.trim()) {
        errors.name = 'Name is required';
      }
      break;

    case PredefinedFunctions.LOG_EVENT:
      if (!params.event || !params.event.trim()) {
        errors.event = 'Event name is required';
      }
      break;

    case PredefinedFunctions.DELAY:
      if (!params.seconds || params.seconds < 1) {
        errors.seconds = 'Delay must be at least 1 second';
      }
      break;

    case PredefinedFunctions.HTTP_REQUEST:
      if (!params.url || !params.url.trim()) {
        errors.url = 'URL is required';
      } else {
        try {
          new URL(params.url);
        } catch {
          errors.url = 'Invalid URL format';
        }
      }
      break;
  }

  return errors;
} 