'use client';

import { useState, useCallback } from 'react';
import { WorkflowSpec } from '../types/workflow';

interface SpecUploadTabProps {
  onWorkflowUploaded: (spec: WorkflowSpec, workflowId: string) => void;
  workflowSpec: WorkflowSpec | null;
  workflowId: string | null;
}

export default function SpecUploadTab({ 
  onWorkflowUploaded, 
  workflowSpec,
  workflowId 
}: SpecUploadTabProps) {
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jsonInput, setJsonInput] = useState('');
  const [selectedExample, setSelectedExample] = useState<string>('');

  const examples = [
    {
      name: 'Simple Test Workflow',
      description: 'Basic workflow with logging and delay',
      file: 'simple-test.json'
    },
    {
      name: 'E-Commerce Order Processing',
      description: 'Complete order processing with validation, payment, and notifications',
      file: 'e-commerce-order.json'
    },
    {
      name: 'Employee Onboarding',
      description: 'HR onboarding process with IT setup and notifications',
      file: 'employee-onboarding.json'
    },
    {
      name: 'Content Approval Workflow',
      description: 'Editorial review process with multiple approval stages',
      file: 'content-approval.json'
    },
    {
      name: 'API Integration Testing',
      description: 'Automated API testing with health checks and monitoring',
      file: 'api-integration-test.json'
    }
  ];

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, []);

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      const text = await file.text();
      await processWorkflowSpec(text);
    } catch (err: any) {
      setError(`Failed to read file: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleJsonSubmit = async () => {
    if (!jsonInput.trim()) {
      setError('Please enter a workflow specification');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await processWorkflowSpec(jsonInput);
    } catch (err: any) {
      setError(`Failed to process specification: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadExample = async (filename: string) => {
    try {
      const response = await fetch(`/examples/${filename}`);
      if (!response.ok) {
        throw new Error('Failed to load example');
      }
      const exampleSpec = await response.text();
      setJsonInput(exampleSpec);
      setSelectedExample(filename);
    } catch (err: any) {
      setError(`Failed to load example: ${err.message}`);
    }
  };

  const processWorkflowSpec = async (specText: string) => {
    try {
      const spec = JSON.parse(specText);
      
      const response = await fetch('/api/workflows/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ spec }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload workflow');
      }

      onWorkflowUploaded(result.spec, result.workflowId);
      setJsonInput(''); // Clear input after successful upload
      setSelectedExample('');
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        throw new Error('Invalid JSON format');
      }
      throw err;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Upload Workflow Specification</h2>
        
        {/* File Upload */}
        <div
          className={`upload-area ${dragOver ? 'drag-over' : ''} mb-6`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="space-y-2">
            <div className="text-gray-600">
              Drop a JSON workflow file here, or{' '}
              <label className="text-blue-600 hover:text-blue-800 cursor-pointer underline">
                browse files
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>
            <div className="text-sm text-gray-500">
              Supports JSON workflow specifications (.json files)
            </div>
          </div>
        </div>

        {/* JSON Input */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-gray-700">
              Or paste your workflow specification:
            </label>
            <button
              onClick={() => setJsonInput('')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
          
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="Paste your JSON workflow specification here..."
            className="w-full h-64 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          />
          
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {jsonInput.length} characters
            </div>
            <button
              onClick={handleJsonSubmit}
              disabled={loading || !jsonInput.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Upload Specification'}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="text-red-800 text-sm">{error}</div>
          </div>
        )}

        {/* Success Display */}
        {workflowSpec && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="space-y-2">
              <div className="text-green-800 font-medium">
                ✓ Workflow "{workflowSpec.workflowName}" uploaded successfully
              </div>
              <div className="text-sm text-green-700">
                {workflowSpec.stages.length} stages • ID: {workflowId}
              </div>
              {workflowSpec.description && (
                <div className="text-sm text-green-700">
                  {workflowSpec.description}
                </div>
              )}
            </div>
          </div>
        )}

        {loading && (
          <div className="mt-4 flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm text-gray-600">Processing...</span>
          </div>
        )}
      </div>

      {/* Examples */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Example Workflows</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {examples.map((example) => (
            <div
              key={example.file}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedExample === example.file
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => loadExample(example.file)}
            >
              <h4 className="font-medium text-gray-900 mb-2">{example.name}</h4>
              <p className="text-sm text-gray-600 mb-3">{example.description}</p>
              <div className="text-xs text-blue-600 font-medium">
                Click to load →
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Documentation */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Specification Schema</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <pre className="text-sm text-gray-700 overflow-x-auto">
{`{
  "workflowName": "string",
  "description": "string (optional)",
  "stages": [
    {
      "id": "unique-stage-id",
      "function": "predefinedFunction",
      "params": { /* function parameters */ },
      "dependsOn": ["stage-id"] // optional
    }
  ]
}`}
          </pre>
        </div>
        <div className="mt-4 space-y-2 text-sm text-gray-600">
          <p><strong>Available Functions:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><code>validateUserInput</code> - Validate required fields and formats</li>
            <li><code>sendEmailNotification</code> - Send email notifications</li>
            <li><code>createUserAccount</code> - Create user accounts</li>
            <li><code>logEvent</code> - Log events with different levels</li>
            <li><code>delay</code> - Add delays to workflows</li>
            <li><code>httpRequest</code> - Make HTTP requests to external APIs</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 