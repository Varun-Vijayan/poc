import { Worker, NativeConnection } from '@temporalio/worker';
import * as activities from './activities';

async function run() {
  console.log('=== TEMPORAL WORKER STARTING ===');
  console.log('Environment variables loaded:');
  console.log('TEMPORAL_ADDRESS:', process.env.TEMPORAL_ADDRESS);
  console.log('SENDGRID_API_KEY present:', !!process.env.SENDGRID_API_KEY);
  console.log('SENDGRID_FROM_EMAIL:', process.env.SENDGRID_FROM_EMAIL);
  
  try {
    // Create connection to Temporal server
    const connection = await NativeConnection.connect({
      address: process.env.TEMPORAL_ADDRESS || 'localhost:7234',
    });

    // Create a Worker to run Workflows and Activities
    const worker = await Worker.create({
      connection,
      workflowsPath: require.resolve('./workflows'),
      activities,
      taskQueue: 'xflow-task-queue',
    });

    console.log('✅ Temporal Worker started successfully!');
    console.log('Worker listening on task queue: xflow-task-queue');
    await worker.run();
  } catch (error) {
    console.error('❌ Worker startup failed:', error);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('❌ Worker failed:', err);
  process.exit(1);
}); 