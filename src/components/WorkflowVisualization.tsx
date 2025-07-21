'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import { WorkflowSpec, WorkflowExecution, StageStatus } from '../types/workflow';
import WorkflowStageNode from './WorkflowStageNode';

interface WorkflowVisualizationProps {
  workflowExecution: WorkflowExecution | null;
  workflowSpec: WorkflowSpec | null;
}

const nodeTypes = {
  workflowStage: WorkflowStageNode,
};

export default function WorkflowVisualization({ 
  workflowExecution, 
  workflowSpec 
}: WorkflowVisualizationProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Generate layout for workflow visualization
  const generateLayout = useCallback((spec: WorkflowSpec, execution?: WorkflowExecution) => {
    const stageMap = new Map(spec.stages.map(stage => [stage.id, stage]));
    const executionStageMap = new Map(
      execution?.stages.map(stage => [stage.id, stage]) || []
    );

    // Calculate positions using a simple algorithm
    const levels: string[][] = [];
    const visited = new Set<string>();
    const inDegree = new Map<string, number>();

    // Calculate in-degrees
    spec.stages.forEach(stage => {
      inDegree.set(stage.id, 0);
    });

    spec.stages.forEach(stage => {
      if (stage.dependsOn) {
        stage.dependsOn.forEach(depId => {
          inDegree.set(stage.id, (inDegree.get(stage.id) || 0) + 1);
        });
      }
    });

    // Topological sort for layout
    let currentLevel = 0;
    while (visited.size < spec.stages.length) {
      const currentLevelNodes = spec.stages.filter(stage => 
        !visited.has(stage.id) && (inDegree.get(stage.id) || 0) === 0
      );

      if (currentLevelNodes.length === 0) {
        // Handle circular dependencies by placing remaining nodes
        const remaining = spec.stages.filter(stage => !visited.has(stage.id));
        levels[currentLevel] = remaining.map(stage => stage.id);
        remaining.forEach(stage => visited.add(stage.id));
        break;
      }

      levels[currentLevel] = currentLevelNodes.map(stage => stage.id);
      currentLevelNodes.forEach(stage => {
        visited.add(stage.id);
        // Update in-degrees for dependent stages
        spec.stages.forEach(s => {
          if (s.dependsOn?.includes(stage.id)) {
            inDegree.set(s.id, (inDegree.get(s.id) || 0) - 1);
          }
        });
      });
      currentLevel++;
    }

    // Generate nodes
    const newNodes: Node[] = [];
    levels.forEach((level, levelIndex) => {
      level.forEach((stageId, nodeIndex) => {
        const stage = stageMap.get(stageId)!;
        const executionStage = executionStageMap.get(stageId);
        
        newNodes.push({
          id: stageId,
          type: 'workflowStage',
          position: {
            x: levelIndex * 250 + 50,
            y: nodeIndex * 150 + 50,
          },
          data: {
            stage: executionStage || { ...stage, status: StageStatus.PENDING },
            label: `${stage.function}\n(${stageId})`,
          },
        });
      });
    });

    // Generate edges
    const newEdges: Edge[] = [];
    spec.stages.forEach(stage => {
      if (stage.dependsOn) {
        stage.dependsOn.forEach(depId => {
          newEdges.push({
            id: `${depId}-${stage.id}`,
            source: depId,
            target: stage.id,
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
            style: {
              strokeWidth: 2,
            },
          });
        });
      }
    });

    return { nodes: newNodes, edges: newEdges };
  }, []);

  // Update visualization when spec or execution changes
  useEffect(() => {
    if (workflowSpec) {
      const { nodes: newNodes, edges: newEdges } = generateLayout(workflowSpec, workflowExecution || undefined);
      setNodes(newNodes);
      setEdges(newEdges);
    } else {
      setNodes([]);
      setEdges([]);
    }
  }, [workflowSpec, workflowExecution, generateLayout]);

  // Poll for workflow status updates
  useEffect(() => {
    if (workflowExecution && workflowExecution.status === 'RUNNING') {
      const interval = setInterval(async () => {
        try {
          const [statusResponse, resultResponse] = await Promise.all([
            fetch(`/api/workflows/status/${workflowExecution.id}`),
            fetch(`/api/workflows/result/${workflowExecution.id}`)
          ]);

          if (statusResponse.ok) {
            const status = await statusResponse.json();
            console.log('Workflow status:', status);
          }

          if (resultResponse.ok) {
            const result = await resultResponse.json();
            console.log('Workflow result:', result);
            
            // Update execution state with results if available
            if (result.result) {
              // Update the workflow execution with the results
              // This would typically come from a state management solution
              console.log('Workflow completed with results:', result.result);
            }
          }
        } catch (error) {
          console.error('Error polling workflow status:', error);
        }
      }, 2000); // Poll every 2 seconds

      setPollingInterval(interval);

      return () => {
        clearInterval(interval);
        setPollingInterval(null);
      };
    }
  }, [workflowExecution]);

  const isEmpty = !workflowSpec && !workflowExecution;

  if (isEmpty) {
    return (
      <div className="h-96 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
        <div className="text-center">
          <div className="text-gray-500 text-lg mb-2">No workflow to display</div>
          <div className="text-gray-400 text-sm">Upload a workflow specification to see the visualization</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-96 border border-gray-300 rounded-lg overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.5}
        maxZoom={1.5}
      >
        <Controls />
        <Background />
      </ReactFlow>
      
      {workflowExecution && (
        <div className="absolute top-2 left-2 bg-white bg-opacity-90 rounded p-2 text-xs">
          <div className="font-medium">{workflowExecution.spec.workflowName}</div>
          <div className="text-gray-600">
            Status: <span className={`font-medium ${
              workflowExecution.status === 'RUNNING' ? 'text-blue-600' :
              workflowExecution.status === 'COMPLETED' ? 'text-green-600' :
              workflowExecution.status === 'FAILED' ? 'text-red-600' :
              'text-gray-600'
            }`}>
              {workflowExecution.status}
            </span>
          </div>
          {pollingInterval && (
            <div className="text-gray-500 flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-1"></div>
              Live Updates
            </div>
          )}
        </div>
      )}
    </div>
  );
} 