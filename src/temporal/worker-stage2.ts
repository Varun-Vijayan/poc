import { Worker, NativeConnection } from '@temporalio/worker';
import * as stage2Activities from './activities-stage2';
import * as fs from 'fs';

async function run() {
  console.log('=== TEMPORAL WORKER 2 (TRANSFORMATION & PROCESSING) STARTING ===');
  console.log('Environment variables loaded:');
  console.log('TEMPORAL_ADDRESS:', process.env.TEMPORAL_ADDRESS);
  console.log('SENDGRID_API_KEY present:', !!process.env.SENDGRID_API_KEY);
  console.log('SENDGRID_FROM_EMAIL:', process.env.SENDGRID_FROM_EMAIL);
  
  try {
    console.log('🔍 Connecting to:', process.env.TEMPORAL_ADDRESS);
    
    // Load JWT token for authentication
    let jwtToken;
    try {
      jwtToken = fs.readFileSync('./src/auth/admin-token.jwt', 'utf8');
      console.log('🔑 Using admin JWT token (first 50 chars):', jwtToken.substring(0, 50) + '...');
    } catch (error) {
      console.log('⚠️  No JWT token found, connecting without authentication');
    }
    
    // Create connection to Temporal server
    const connectionOptions: any = {
      address: process.env.TEMPORAL_ADDRESS || 'localhost:7234',
      // Enable TLS if connecting to HTTPS Codespace URL
      ...(process.env.TEMPORAL_ADDRESS?.includes('github.dev') ? {
        tls: {}
      } : {})
    };
    
    // Add JWT authentication if token is available
    if (jwtToken) {
      connectionOptions.metadata = {
        'authorization': `Bearer ${jwtToken}`
      };
    }
    
    const connection = await NativeConnection.connect(connectionOptions);
    
    console.log('✅ Connection established' + (jwtToken ? ' WITH VALID JWT TOKEN' : ' without authentication'));

    // Create a Worker to run Workflows and Activities
    const worker = await Worker.create({
      connection,
      workflowsPath: require.resolve('./workflows-distributed'),
      activities: stage2Activities,
      taskQueue: 'xflow-stage2-queue',
    });

    console.log('✅ Stage 2 Worker started successfully' + (jwtToken ? ' WITH VALID JWT!' : '!'));
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