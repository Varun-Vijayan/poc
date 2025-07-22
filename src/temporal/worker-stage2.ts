import { Worker, NativeConnection } from '@temporalio/worker';
import * as stage2Activities from './activities-stage2';
import * as fs from 'fs';

async function run() {
  console.log('=== TEMPORAL WORKER 2 (PROCESSING & INTERMEDIATE) STARTING ===');
  console.log('Environment variables loaded:');
  console.log('TEMPORAL_ADDRESS:', process.env.TEMPORAL_ADDRESS);
  
  try {
    // Read JWT token for authentication
    const jwtToken = process.env.TEMPORAL_JWT_TOKEN || 
      fs.readFileSync('./src/auth/codespace-worker-stage2-token.jwt', 'utf8').trim();
    
    console.log('🔐 Using JWT authentication for Worker 2');
    
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
      activities: stage2Activities,
      taskQueue: 'xflow-stage2-queue',
    });

    console.log('✅ Stage 2 Worker started successfully!');
    console.log('Worker listening on task queue: xflow-stage2-queue');
    console.log('Handles: CREATE_USER_ACCOUNT, HTTP_REQUEST, DELAY');
    await worker.run();
  } catch (error) {
    console.error('❌ Stage 2 Worker startup failed:', error);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('❌ Stage 2 Worker failed:', err);
  process.exit(1);
});