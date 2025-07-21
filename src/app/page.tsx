'use client';

import { useState, useEffect } from 'react';
import SpecUploadTab from '../components/SpecUploadTab';
import WorkflowExecutionTab from '../components/WorkflowExecutionTab';
import WorkflowHistoryTab from '../components/WorkflowHistoryTab';
import LiveUpdatesTab from '../components/LiveUpdatesTab';
import WorkflowBuilder from '../components/WorkflowBuilder';
import { WorkflowSpec, WorkflowExecution } from '../types/workflow';

type TabType = 'builder' | 'upload' | 'execute' | 'history' | 'live';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('builder');
  const [workflowSpec, setWorkflowSpec] = useState<WorkflowSpec | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [workflowExecution, setWorkflowExecution] = useState<WorkflowExecution | null>(null);
  const [workflowHistory, setWorkflowHistory] = useState<WorkflowExecution[]>([]);
  const [liveUpdates, setLiveUpdates] = useState<any[]>([]);

  const handleWorkflowUploaded = (spec: WorkflowSpec, id: string) => {
    setWorkflowSpec(spec);
    setWorkflowId(id);
    setActiveTab('execute'); // Auto-switch to execution tab
  };

  const handleWorkflowBuilt = (spec: WorkflowSpec) => {
    // Generate a unique ID for the built workflow
    const id = `workflow-${Date.now()}`;
    setWorkflowSpec(spec);
    setWorkflowId(id);
    
    addLiveUpdate({
      timestamp: new Date(),
      type: 'workflow_built',
      workflowId: id,
      message: `Workflow "${spec.workflowName}" built successfully`,
      data: { stageCount: spec.stages.length }
    });
  };

  const handleWorkflowExecuteFromBuilder = async (spec: WorkflowSpec) => {
    const id = `workflow-${Date.now()}`;
    setWorkflowSpec(spec);
    setWorkflowId(id);

    // Execute directly
    try {
      const response = await fetch('/api/workflows/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflowId: id,
          spec: spec,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to execute workflow');
      }

      // Create initial execution state
      const execution: WorkflowExecution = {
        id: id,
        spec: spec,
        stages: spec.stages.map(stage => ({
          ...stage,
          status: 'PENDING' as any,
        })),
        status: 'RUNNING',
        startTime: new Date(),
      };

      setWorkflowExecution(execution);
      setWorkflowHistory(prev => [execution, ...prev]);
      setActiveTab('live'); // Auto-switch to live updates
      
      addLiveUpdate({
        timestamp: new Date(),
        type: 'workflow_started',
        workflowId: id,
        message: `Workflow "${spec.workflowName}" started from builder`,
        data: { stageCount: spec.stages.length }
      });

    } catch (err: any) {
      addLiveUpdate({
        timestamp: new Date(),
        type: 'error',
        workflowId: id,
        message: `Failed to start workflow: ${err.message}`,
        data: { error: err.message }
      });
    }
  };

  const handleWorkflowExecutionStarted = (execution: WorkflowExecution) => {
    setWorkflowExecution(execution);
    setWorkflowHistory(prev => [execution, ...prev]);
    setActiveTab('live'); // Auto-switch to live updates
  };

  const handleWorkflowUpdated = (updatedExecution: WorkflowExecution) => {
    setWorkflowExecution(updatedExecution);
    setWorkflowHistory(prev => 
      prev.map(w => w.id === updatedExecution.id ? updatedExecution : w)
    );
  };

  const addLiveUpdate = (update: any) => {
    setLiveUpdates(prev => [update, ...prev.slice(0, 99)]); // Keep last 100 updates
  };

  const tabs = [
    { id: 'builder' as TabType, name: 'Visual Builder', icon: '🎨' },
    { id: 'upload' as TabType, name: 'Upload Spec', icon: '📁' },
    { id: 'execute' as TabType, name: 'Execute Workflow', icon: '🚀' },
    { id: 'history' as TabType, name: 'History', icon: '📊' },
    { id: 'live' as TabType, name: 'Live Updates', icon: '📡' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary-700">X Flow</h1>
              <span className="ml-2 text-sm text-gray-500">Workflow Orchestration Platform</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="text-sm text-gray-600">System Online</span>
              </div>
              <a 
                href="http://localhost:8234" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Temporal Web UI ↗
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto">
          <nav className="-mb-px flex space-x-8 px-4 sm:px-6 lg:px-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
                  ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'builder' && (
          <WorkflowBuilder
            onSaveWorkflow={handleWorkflowBuilt}
            onExecuteWorkflow={handleWorkflowExecuteFromBuilder}
          />
        )}

        {activeTab === 'upload' && (
          <SpecUploadTab 
            onWorkflowUploaded={handleWorkflowUploaded}
            workflowSpec={workflowSpec}
            workflowId={workflowId}
          />
        )}

        {activeTab === 'execute' && (
          <WorkflowExecutionTab
            workflowSpec={workflowSpec}
            workflowId={workflowId}
            onWorkflowExecutionStarted={handleWorkflowExecutionStarted}
            onWorkflowUpdated={handleWorkflowUpdated}
            addLiveUpdate={addLiveUpdate}
          />
        )}

        {activeTab === 'history' && (
          <WorkflowHistoryTab
            workflowHistory={workflowHistory}
            onSelectWorkflow={(execution) => {
              setWorkflowExecution(execution);
              setActiveTab('live');
            }}
          />
        )}

        {activeTab === 'live' && (
          <LiveUpdatesTab
            workflowExecution={workflowExecution}
            liveUpdates={liveUpdates}
            addLiveUpdate={addLiveUpdate}
            onWorkflowUpdated={handleWorkflowUpdated}
          />
        )}
      </div>

      {/* Status Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <span>Active Tab: {tabs.find(t => t.id === activeTab)?.name}</span>
            {workflowSpec && <span>Loaded: {workflowSpec.workflowName}</span>}
            {workflowExecution && <span>Status: {workflowExecution.status}</span>}
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
} 