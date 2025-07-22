import { Worker, NativeConnection } from '@temporalio/worker';
import * as stage1Activities from './activities-stage1';

async function run() {
  console.log('=== TEMPORAL WORKER 1 (VALIDATION & INITIAL) STARTING ===');
  console.log('Environment variables loaded:');
  console.log('TEMPORAL_ADDRESS:', process.env.TEMPORAL_ADDRESS || 'localhost:7233');
  
  try {
    console.log('🔍 Connecting to:', process.env.TEMPORAL_ADDRESS || 'localhost:7233');
    
    // Create connection to Temporal server
    const connectionOptions: any = {
      address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
      // Enable TLS if connecting to HTTPS Codespace URL
      ...(process.env.TEMPORAL_ADDRESS?.includes('github.dev') ? {
        tls: {}
      } : {})
    };
    
    const connection = await NativeConnection.connect(connectionOptions);
    
    console.log('✅ Connection established successfully');

    // Create a Worker to run Workflows and Activities
    const worker = await Worker.create({
      connection,
      workflowsPath: require.resolve('./workflows-distributed'),
      activities: stage1Activities,
      taskQueue: 'xflow-stage1-queue',
    });

    console.log('✅ Stage 1 Worker started successfully!');
    console.log('Worker listening on task queue: xflow-stage1-queue');
    console.log('Handles: VALIDATE_INPUT, SANITIZE_DATA, CHECK_PERMISSIONS');
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