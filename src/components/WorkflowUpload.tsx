'use client';

import { useState, useCallback } from 'react';
import { WorkflowSpec, WorkflowExecution, StageStatus } from '../types/workflow';

interface WorkflowUploadProps {
  onWorkflowUploaded: (spec: WorkflowSpec, workflowId: string) => void;
  onWorkflowExecutionStarted: (execution: WorkflowExecution) => void;
  workflowSpec: WorkflowSpec | null;
  workflowId: string | null;
}

export default function WorkflowUpload({ 
  onWorkflowUploaded, 
  onWorkflowExecutionStarted,
  workflowSpec,
  workflowId 
}: WorkflowUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jsonInput, setJsonInput] = useState('');
  const [executing, setExecuting] = useState(false);

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
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        throw new Error('Invalid JSON format');
      }
      throw err;
    }
  };

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

      onWorkflowExecutionStarted(execution);
    } catch (err: any) {
      setError(`Failed to execute workflow: ${err.message}`);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* File Upload Area */}
      <div
        className={`upload-area ${dragOver ? 'drag-over' : ''}`}
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
            Supports JSON workflow specifications
          </div>
        </div>
      </div>

      {/* JSON Input Area */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Or paste your workflow specification:
        </label>
        <textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder="Paste your JSON workflow specification here..."
          className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          onClick={handleJsonSubmit}
          disabled={loading || !jsonInput.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Upload Specification'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="text-red-800 text-sm">{error}</div>
        </div>
      )}

      {/* Workflow Info and Execute Button */}
      {workflowSpec && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
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
            <button
              onClick={handleExecuteWorkflow}
              disabled={executing}
              className="mt-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {executing ? 'Starting Execution...' : 'Execute Workflow'}
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Processing...</span>
        </div>
      )}
    </div>
  );
} 