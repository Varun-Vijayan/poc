import { proxyActivities } from '@temporalio/workflow';
import type * as stage1Activities from './activities-stage1';
import type * as stage2Activities from './activities-stage2';
import type * as stage3Activities from './activities-stage3';
import { WorkflowSpec, WorkflowStage, StageStatus, PredefinedFunctions } from '../types/workflow';

// Create activity proxies for different task queues
const stage1Proxy = proxyActivities<typeof stage1Activities>({
  startToCloseTimeout: '5 minutes',
  heartbeatTimeout: '30 seconds',
  taskQueue: 'xflow-stage1-queue',
});

const stage2Proxy = proxyActivities<typeof stage2Activities>({
  startToCloseTimeout: '5 minutes',
  heartbeatTimeout: '30 seconds',
  taskQueue: 'xflow-stage2-queue',
});

const stage3Proxy = proxyActivities<typeof stage3Activities>({
  startToCloseTimeout: '5 minutes',
  heartbeatTimeout: '30 seconds',
  taskQueue: 'xflow-stage3-queue',
});

// Function to determine which worker should handle each activity
function getActivityProxy(functionName: PredefinedFunctions) {
  switch (functionName) {
    case PredefinedFunctions.VALIDATE_USER_INPUT:
      return { proxy: stage1Proxy.executeStage1Activity, queue: 'stage1' };
    
    case PredefinedFunctions.CREATE_USER_ACCOUNT:
    case PredefinedFunctions.HTTP_REQUEST:
    case PredefinedFunctions.DELAY:
      return { proxy: stage2Proxy.executeStage2Activity, queue: 'stage2' };
    
    case PredefinedFunctions.SEND_EMAIL_NOTIFICATION:
      return { proxy: stage3Proxy.executeStage3Activity, queue: 'stage3' };
    
    case PredefinedFunctions.LOG_EVENT:
      // Log events can be handled by either stage1 or stage3 workers
      // Choose based on context or default to stage1
      return { proxy: stage1Proxy.executeStage1Activity, queue: 'stage1' };
    
    default:
      throw new Error(`Unknown function: ${functionName}`);
  }
}

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
  executedBy?: string; // Track which worker executed this stage
}

export async function executeDistributedWorkflow(input: WorkflowExecutionInput): Promise<StageExecutionResult[]> {
  const { workflowId, spec } = input;
  const results: StageExecutionResult[] = [];
  const completedStages = new Set<string>();
  
  console.log(`Starting distributed workflow execution: ${workflowId} - ${spec.workflowName}`);
  
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
    
    // Execute ready stages in parallel using appropriate workers
    const stagePromises = readyStages.map(async (stage): Promise<StageExecutionResult> => {
      const startTime = new Date();
      
      try {
        console.log(`Executing stage: ${stage.id} - ${stage.function}`);
        
        // Get the appropriate activity proxy for this function
        const { proxy, queue } = getActivityProxy(stage.function);
        
        console.log(`Routing ${stage.function} to ${queue} worker`);
        const result = await proxy(stage.function, stage.params);
        const endTime = new Date();
        
        console.log(`Stage ${stage.id} completed successfully on ${queue} worker`);
        
        return {
          stageId: stage.id,
          status: StageStatus.COMPLETED,
          result,
          startTime,
          endTime,
          executedBy: queue
        };
      } catch (error: any) {
        const endTime = new Date();
        console.error(`Stage ${stage.id} failed:`, error);
        
        return {
          stageId: stage.id,
          status: StageStatus.FAILED,
          error: error.message,
          startTime,
          endTime,
          executedBy: 'unknown'
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
            endTime: new Date(),
            executedBy: 'none'
          });
        }
      });
      break;
    }
  }
  
  console.log(`Distributed workflow ${workflowId} execution completed`);
  return results;
} 