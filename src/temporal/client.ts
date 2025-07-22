import { Client, Connection } from '@temporalio/client';
import { executeWorkflow } from './workflows';
import type { WorkflowExecutionInput } from './workflows';
import { executeDistributedWorkflow } from './workflows-distributed';
import * as fs from 'fs';

export class TemporalClient {
  private client: Client | null = null;
  private connection: Connection | null = null;

  async getClient(): Promise<Client> {
    if (!this.client) {
      // MANDATORY: Load JWT token for authentication
      let jwtToken: string;
      try {
        jwtToken = fs.readFileSync('./src/auth/admin-token.jwt', 'utf8').trim();
        console.log('🔑 Temporal client using JWT authentication');
      } catch (error) {
        console.error('❌ AUTHENTICATION REQUIRED: JWT token not found for Temporal client!');
        console.error('   Expected file: ./src/auth/admin-token.jwt');
        console.error('   Generate tokens with: node src/auth/generate-jwt.js');
        throw new Error('JWT authentication required for Temporal client operations');
      }

      this.connection = await Connection.connect({
        address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
        // JWT authentication is REQUIRED for all client operations
        metadata: {
          'authorization': `Bearer ${jwtToken}`
        }
      });
      
      this.client = new Client({
        connection: this.connection,
      });
    }
    return this.client;
  }

  async startWorkflow(input: WorkflowExecutionInput): Promise<string> {
    const client = await this.getClient();
    
    const handle = await client.workflow.start(executeWorkflow, {
      args: [input],
      taskQueue: 'xflow-task-queue',
      workflowId: input.workflowId,
    });

    console.log(`Started workflow ${handle.workflowId}`);
    return handle.workflowId;
  }

  async startDistributedWorkflow(input: WorkflowExecutionInput): Promise<string> {
    const client = await this.getClient();
    
    const handle = await client.workflow.start(executeDistributedWorkflow, {
      args: [input],
      taskQueue: 'xflow-stage1-queue', // Workflows can start on any queue
      workflowId: input.workflowId,
    });

    console.log(`Started distributed workflow ${handle.workflowId}`);
    return handle.workflowId;
  }

  async getWorkflowStatus(workflowId: string) {
    const client = await this.getClient();
    
    /*
    TODO: can create specfic queries for workflow status if needs be
    describe() - Gets workflow metadata
    query() - Gets workflow internal state
    result() - Gets workflow result (if completed)
    */
    try {
      const handle = client.workflow.getHandle(workflowId);
      const description = await handle.describe();
      
      return {
        workflowId,
        status: description.status,
        startTime: description.startTime,
        closeTime: description.closeTime,
        runId: description.runId,
      };
    } catch (error: any) {
      console.error(`Failed to get workflow status for ${workflowId}:`, error);
      throw error;
    }
  }

  async getWorkflowResult(workflowId: string) {
    const client = await this.getClient();
    
    try {
      const handle = client.workflow.getHandle(workflowId);
      const result = await handle.result();
      return result;
    } catch (error: any) {
      console.error(`Failed to get workflow result for ${workflowId}:`, error);
      throw error;
    }
  }
}

export const temporalClient = new TemporalClient(); 