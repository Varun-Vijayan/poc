import { z } from 'zod';

// Workflow Stage Status
export enum StageStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

// Available predefined functions
export enum PredefinedFunctions {
  VALIDATE_USER_INPUT = 'validateUserInput',
  SEND_EMAIL_NOTIFICATION = 'sendEmailNotification',
  CREATE_USER_ACCOUNT = 'createUserAccount',
  LOG_EVENT = 'logEvent',
  DELAY = 'delay',
  HTTP_REQUEST = 'httpRequest'
}

// Zod schemas for validation
export const WorkflowStageSchema = z.object({
  id: z.string(),
  function: z.nativeEnum(PredefinedFunctions),
  params: z.record(z.any()),
  dependsOn: z.array(z.string()).optional()
});

export const WorkflowSpecSchema = z.object({
  workflowName: z.string(),
  description: z.string().optional(),
  stages: z.array(WorkflowStageSchema)
});

// TypeScript types derived from schemas
export type WorkflowStage = z.infer<typeof WorkflowStageSchema>;
export type WorkflowSpec = z.infer<typeof WorkflowSpecSchema>;

// Runtime workflow execution types
export interface WorkflowExecutionStage extends WorkflowStage {
  status: StageStatus;
  startTime?: Date;
  endTime?: Date;
  error?: string;
  result?: any;
}

export interface WorkflowExecution {
  id: string;
  spec: WorkflowSpec;
  stages: WorkflowExecutionStage[];
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startTime: Date;
  endTime?: Date;
}

// React Flow types for visualization
export interface FlowNode {
  id: string;
  type: 'stage';
  position: { x: number; y: number };
  data: {
    stage: WorkflowExecutionStage;
    label: string;
    status: StageStatus;
  };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type: 'smoothstep';
} 