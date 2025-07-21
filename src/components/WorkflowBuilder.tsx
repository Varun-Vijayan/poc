'use client';

import { useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  ConnectionMode,
  Panel,
  MiniMap,
} from 'reactflow';
import { PredefinedFunctions } from '../types/workflow';
import { v4 as uuidv4 } from 'uuid';
import WorkflowBuilderNode from './WorkflowBuilderNode';
import NodeLibraryPanel from './NodeLibraryPanel';
import NodeConfigPanel from './NodeConfigPanel';
import WorkflowBuilderToolbar from './WorkflowBuilderToolbar';

const nodeTypes = {
  workflowFunction: WorkflowBuilderNode,
};

interface WorkflowBuilderProps {
  onSaveWorkflow: (spec: any) => void;
  onExecuteWorkflow: (spec: any) => void;
}

export default function WorkflowBuilder({ onSaveWorkflow, onExecuteWorkflow }: WorkflowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showNodeLibrary, setShowNodeLibrary] = useState(true);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Add a new node from the library
  const addNode = useCallback((functionType: PredefinedFunctions) => {
    const newNode: Node = {
      id: uuidv4(),
      type: 'workflowFunction',
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 400 + 100,
      },
      data: {
        function: functionType,
        label: functionType,
        params: getDefaultParams(functionType),
        isConfigured: false,
      },
    };

    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  // Update node configuration
  const updateNodeConfig = useCallback((nodeId: string, params: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                params,
                isConfigured: Object.keys(params).length > 0,
              },
            }
          : node
      )
    );
  }, [setNodes]);

  // Delete selected node
  const deleteSelectedNode = useCallback(() => {
    if (!selectedNode) return;

    setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
    setEdges((eds) => eds.filter((edge) => 
      edge.source !== selectedNode.id && edge.target !== selectedNode.id
    ));
    setSelectedNode(null);
  }, [selectedNode, setNodes, setEdges]);

  // Generate workflow specification from nodes and edges
  const generateWorkflowSpec = useCallback(() => {
    if (!workflowName.trim()) {
      alert('Please enter a workflow name');
      return null;
    }

    // Build dependency map from edges
    const dependencyMap = new Map<string, string[]>();
    edges.forEach((edge) => {
      const dependencies = dependencyMap.get(edge.target) || [];
      dependencies.push(edge.source);
      dependencyMap.set(edge.target, dependencies);
    });

    // Convert nodes to stages
    const stages = nodes.map((node) => ({
      id: node.id,
      function: node.data.function,
      params: node.data.params || {},
      dependsOn: dependencyMap.get(node.id) || undefined,
    }));

    return {
      workflowName,
      description: workflowDescription,
      stages,
    };
  }, [nodes, edges, workflowName, workflowDescription]);

  // Save workflow
  const handleSaveWorkflow = useCallback(() => {
    const spec = generateWorkflowSpec();
    if (spec) {
      onSaveWorkflow(spec);
    }
  }, [generateWorkflowSpec, onSaveWorkflow]);

  // Execute workflow
  const handleExecuteWorkflow = useCallback(() => {
    const spec = generateWorkflowSpec();
    if (spec) {
      onExecuteWorkflow(spec);
    }
  }, [generateWorkflowSpec, onExecuteWorkflow]);

  // Clear all nodes and edges
  const handleClearWorkflow = useCallback(() => {
    if (confirm('Are you sure you want to clear the entire workflow?')) {
      setNodes([]);
      setEdges([]);
      setSelectedNode(null);
      setWorkflowName('');
      setWorkflowDescription('');
    }
  }, [setNodes, setEdges]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">Workflow Builder</h2>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Workflow Name"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={workflowDescription}
                onChange={(e) => setWorkflowDescription(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <WorkflowBuilderToolbar
            onSave={handleSaveWorkflow}
            onExecute={handleExecuteWorkflow}
            onClear={handleClearWorkflow}
            onToggleLibrary={() => setShowNodeLibrary(!showNodeLibrary)}
            onDeleteSelected={deleteSelectedNode}
            hasSelectedNode={!!selectedNode}
            nodeCount={nodes.length}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Node Library Panel */}
        {showNodeLibrary && (
          <NodeLibraryPanel
            onAddNode={addNode}
            onClose={() => setShowNodeLibrary(false)}
          />
        )}

        {/* Flow Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            connectionMode={ConnectionMode.Loose}
            fitView
            attributionPosition="bottom-left"
          >
            <Background />
            <Controls />
            <MiniMap 
              nodeStrokeColor="#374151"
              nodeColor="#f3f4f6"
              nodeBorderRadius={8}
            />
            
            {/* Canvas Instructions */}
            {nodes.length === 0 && (
              <Panel position="top-center">
                <div className="bg-white rounded-lg shadow-lg p-6 max-w-md text-center border border-gray-200">
                  <div className="text-4xl mb-3">🎯</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Start Building Your Workflow
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Drag function blocks from the library to create your workflow. 
                    Connect them to define dependencies.
                  </p>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* Node Configuration Panel */}
        {selectedNode && (
          <NodeConfigPanel
            node={selectedNode}
            onUpdateConfig={(params) => updateNodeConfig(selectedNode.id, params)}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-gray-100 border-t border-gray-200 px-4 py-2 text-xs text-gray-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span>Nodes: {nodes.length}</span>
            <span>Connections: {edges.length}</span>
            {selectedNode && <span>Selected: {selectedNode.data.function}</span>}
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to get default parameters for each function type
function getDefaultParams(functionType: PredefinedFunctions): Record<string, any> {
  switch (functionType) {
    case PredefinedFunctions.VALIDATE_USER_INPUT:
      return {
        fields: ['email'],
        data: {}
      };
    case PredefinedFunctions.SEND_EMAIL_NOTIFICATION:
      return {
        email: '',
        subject: '',
        content: ''
      };
    case PredefinedFunctions.CREATE_USER_ACCOUNT:
      return {
        email: '',
        name: '',
        role: 'user'
      };
    case PredefinedFunctions.LOG_EVENT:
      return {
        event: '',
        level: 'info'
      };
    case PredefinedFunctions.DELAY:
      return {
        seconds: 1
      };
    case PredefinedFunctions.HTTP_REQUEST:
      return {
        url: '',
        method: 'GET'
      };
    default:
      return {};
  }
} 