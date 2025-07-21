import { Worker, NativeConnection } from '@temporalio/worker';
import * as stage1Activities from './activities-stage1';

async function run() {
  console.log('=== TEMPORAL WORKER 1 (VALIDATION & INITIAL) STARTING ===');
  console.log('Environment variables loaded:');
  console.log('TEMPORAL_ADDRESS:', process.env.TEMPORAL_ADDRESS);
  
  try {
    // Create connection to Temporal server
    const connection = await NativeConnection.connect({
      address: process.env.TEMPORAL_ADDRESS || 'localhost:7234',
    });

    // Create a Worker to run Workflows and Activities
    const worker = await Worker.create({
      connection,
      workflowsPath: require.resolve('./workflows-distributed'), // Use distributed workflows
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