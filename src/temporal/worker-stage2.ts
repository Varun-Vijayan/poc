import { Worker, NativeConnection } from '@temporalio/worker';
import * as stage2Activities from './activities-stage2';

async function run() {
  console.log('=== TEMPORAL WORKER 2 (TRANSFORMATION & PROCESSING) STARTING ===');
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
      activities: stage2Activities,
      taskQueue: 'xflow-stage2-queue',
    });

    console.log('✅ Stage 2 Worker started successfully!');
    console.log('Worker listening on task queue: xflow-stage2-queue');
    console.log('Handles: TRANSFORM_DATA, PROCESS_BUSINESS_LOGIC, CALCULATE_RESULTS');
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