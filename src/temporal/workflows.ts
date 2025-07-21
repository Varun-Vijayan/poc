import { proxyActivities } from '@temporalio/workflow';
import type * as activities from './activities';
import { WorkflowSpec, WorkflowStage, StageStatus } from '../types/workflow';

// Proxy activities with appropriate timeouts
const { executeStageActivity } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  heartbeatTimeout: '30 seconds',
});

export interface WorkflowExecutionInput {
  workflowId: string;
  spec: WorkflowSpec;
}

export interface StageExecutionResult {
  stageId: string;
  status: StageStatus;
  result?: any;
  error?: string;
  startTime: Date;
  endTime: Date;
}

export async function executeWorkflow(input: WorkflowExecutionInput): Promise<StageExecutionResult[]> {
  const { workflowId, spec } = input;
  const results: StageExecutionResult[] = [];
  const completedStages = new Set<string>();
  
  console.log(`Starting workflow execution: ${workflowId} - ${spec.workflowName}`);
  
  // Build dependency graph
  const stageMap = new Map<string, WorkflowStage>();
  spec.stages.forEach(stage => stageMap.set(stage.id, stage));
  
  // Execute stages in dependency order
  while (completedStages.size < spec.stages.length) {
    const readyStages = spec.stages.filter(stage => {
      // Stage is ready if it's not completed and all dependencies are completed
      if (completedStages.has(stage.id)) return false;
      if (!stage.dependsOn || stage.dependsOn.length === 0) return true;
      return stage.dependsOn.every(depId => completedStages.has(depId));
    });
    
    if (readyStages.length === 0) {
      throw new Error('Circular dependency detected or no stages ready to execute');
    }
    
    // Execute ready stages in parallel
    const stagePromises = readyStages.map(async (stage): Promise<StageExecutionResult> => {
      const startTime = new Date();
      
      try {
        console.log(`Executing stage: ${stage.id} - ${stage.function}`);
        
        const result = await executeStageActivity(stage.function, stage.params);
        const endTime = new Date();
        
        console.log(`Stage ${stage.id} completed successfully`);
        
        return {
          stageId: stage.id,
          status: StageStatus.COMPLETED,
          result,
          startTime,
          endTime
        };
      } catch (error: any) {
        const endTime = new Date();
        console.error(`Stage ${stage.id} failed:`, error);
        
        return {
          stageId: stage.id,
          status: StageStatus.FAILED,
          error: error.message,
          startTime,
          endTime
        };
      }
    });
    
    const stageResults = await Promise.all(stagePromises);
    
    // Add results and mark completed stages
    stageResults.forEach(result => {
      results.push(result);
      if (result.status === StageStatus.COMPLETED) {
        completedStages.add(result.stageId);
      }
    });
    
    // Check if any stage failed and we should stop
    const failedResults = stageResults.filter(r => r.status === StageStatus.FAILED);
    if (failedResults.length > 0) {
      console.error(`Workflow ${workflowId} failed due to stage failures:`, failedResults);
      // Mark remaining stages as failed due to dependency failure
      const remainingStages = spec.stages.filter(stage => !completedStages.has(stage.id));
      remainingStages.forEach(stage => {
        if (!stageResults.some(r => r.stageId === stage.id)) {
          results.push({
            stageId: stage.id,
            status: StageStatus.FAILED,
            error: 'Dependency stage failed',
            startTime: new Date(),
            endTime: new Date()
          });
        }
      });
      break;
    }
  }
  
  console.log(`Workflow ${workflowId} execution completed`);
  return results;
} 