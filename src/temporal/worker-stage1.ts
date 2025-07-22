import { Worker, NativeConnection } from '@temporalio/worker';
import * as stage1Activities from './activities-stage1';
import * as fs from 'fs';

async function run() {
  console.log('=== TEMPORAL WORKER 1 (VALIDATION & INITIAL) STARTING ===');
  console.log('Environment variables loaded:');
  console.log('TEMPORAL_ADDRESS:', process.env.TEMPORAL_ADDRESS);
  
  try {
    // Read JWT token for authentication
    const jwtToken = process.env.TEMPORAL_JWT_TOKEN || 
      fs.readFileSync('./src/auth/codespace-worker-stage1-token.jwt', 'utf8').trim();
    
    console.log('🔐 Using JWT authentication for Worker 1');
    
    // Create connection to Temporal server with JWT auth
    const connection = await NativeConnection.connect({
      address: process.env.TEMPORAL_ADDRESS || 'localhost:7234',
      metadata: {
        'authorization': `Bearer ${jwtToken}`
      }
    });

    // Create a Worker to run Workflows and Activities
    const worker = await Worker.create({
      connection,
      workflowsPath: require.resolve('./workflows-distributed'),
      activities: stage1Activities,
      taskQueue: 'xflow-stage1-queue',
    });

    console.log('✅ Stage 1 Worker started successfully!');
    console.log('Worker listening on task queue: xflow-stage1-queue');
    console.log('Handles: VALIDATE_USER_INPUT, LOG_EVENT, and WORKFLOW ORCHESTRATION');
    await worker.run();
  } catch (error) {
    console.error('❌ Stage 1 Worker startup failed:', error);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('❌ Stage 1 Worker failed:', err);
  process.exit(1);
});