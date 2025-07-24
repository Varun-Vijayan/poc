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
      console.log('🔧 Initializing Temporal client with mTLS + JWT...');
      
      // Load JWT token
      const jwtToken = fs.readFileSync('./src/auth/admin-token.jwt', 'utf8').trim();
      console.log('🔑 JWT token loaded for client');

      // Load SSL certificates
      const clientCert = fs.readFileSync('./certs/worker-client.pem', 'utf8');
      const clientKey = fs.readFileSync('./certs/worker-client-key.pem', 'utf8');
      const caCert = fs.readFileSync('./certs/ca.pem', 'utf8');
      console.log('🔐 SSL certificates loaded for client');

      const address = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
      console.log('🔍 Client connecting to:', address);

      this.connection = await Connection.connect({
        address,
        tls: {
          serverRootCACertificate: Buffer.from(caCert),
          clientCertPair: {
            crt: Buffer.from(clientCert),
            key: Buffer.from(clientKey)
          }
        },
        metadata: {
          'authorization': `Bearer ${jwtToken}`
        }
      });
      
      this.client = new Client({
        connection: this.connection,
      });

      console.log('✅ Temporal client connected with mTLS + JWT');
    }
    return this.client;
  }

  async startDistributedWorkflow(input: WorkflowExecutionInput): Promise<string> {
    const client = await this.getClient();
    
    const handle = await client.workflow.start(executeDistributedWorkflow, {
      args: [input],
      taskQueue: 'xflow-stage1-queue',
      workflowId: input.workflowId,
    });

    console.log(`✅ Started distributed workflow ${handle.workflowId}`);
    return handle.workflowId;
  }

  async getWorkflowResult(workflowId: string): Promise<any> {
    const client = await this.getClient();
    const handle = client.workflow.getHandle(workflowId);
    return await handle.result();
  }

  async getWorkflowStatus(workflowId: string): Promise<any> {
    const client = await this.getClient();
    const handle = client.workflow.getHandle(workflowId);
    return await handle.describe();
  }

  async close(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
      this.client = null;
    }
  }
}

export const temporalClient = new TemporalClient(); 