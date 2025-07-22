import { Worker, NativeConnection } from '@temporalio/worker';
import * as stage3Activities from './activities-stage3';
import * as fs from 'fs';

async function run() {
  console.log('=== TEMPORAL WORKER 3 (FINAL PROCESSING & NOTIFICATIONS) STARTING ===');
  console.log('Environment variables loaded:');
  console.log('TEMPORAL_ADDRESS:', process.env.TEMPORAL_ADDRESS);
  console.log('SENDGRID_API_KEY present:', !!process.env.SENDGRID_API_KEY);
  console.log('SENDGRID_FROM_EMAIL:', process.env.SENDGRID_FROM_EMAIL);
  
  try {
    // Read JWT token for authentication
    const jwtToken = process.env.TEMPORAL_JWT_TOKEN || 
      fs.readFileSync('local-worker-stage3-token.jwt', 'utf8').trim();
    
    console.log('🔐 Using JWT authentication for Worker 3');
    
    // Create connection to Temporal server with JWT auth
    const connection = await NativeConnection.connect({
      address: process.env.TEMPORAL_ADDRESS || 'localhost:7234',
      // No TLS needed for localhost port forwarding
      metadata: {
        'authorization': `Bearer ${jwtToken}`
      }
    });

    // Create a Worker to run Workflows and Activities
    const worker = await Worker.create({
      connection,
      workflowsPath: require.resolve('./workflows-distributed'),
      activities: stage3Activities,
      taskQueue: 'xflow-stage3-queue',
    });

    console.log('✅ Stage 3 Worker started successfully!');
    console.log('Worker listening on task queue: xflow-stage3-queue');
    console.log('Handles: SEND_EMAIL_NOTIFICATION, LOG_EVENT, DELAY');
    await worker.run();
  } catch (error) {
    console.error('❌ Stage 3 Worker startup failed:', error);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('❌ Stage 3 Worker failed:', err);
  process.exit(1);
});