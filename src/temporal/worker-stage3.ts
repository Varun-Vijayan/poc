import { Worker, NativeConnection } from '@temporalio/worker';
import * as stage3Activities from './activities-stage3';

async function run() {
  console.log('=== TEMPORAL WORKER 3 (FINAL PROCESSING & NOTIFICATIONS) STARTING ===');
  console.log('Environment variables loaded:');
  console.log('TEMPORAL_ADDRESS:', process.env.TEMPORAL_ADDRESS || 'localhost:7233');
  console.log('SENDGRID_API_KEY present:', !!process.env.SENDGRID_API_KEY);
  console.log('SENDGRID_FROM_EMAIL:', process.env.SENDGRID_FROM_EMAIL);
  
  try {
    const rawAddress = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
    console.log('🔍 Raw address:', rawAddress);
    
    // Parse the address to handle Codespace HTTPS URLs
    let address: string;
    let useTLS = false;
    
    if (rawAddress.startsWith('https://')) {
      // Extract hostname from HTTPS URL and use port 443
      const url = new URL(rawAddress);
      address = `${url.hostname}:443`;
      useTLS = true;
      console.log('🔒 Using HTTPS Codespace URL - extracted address:', address);
    } else if (rawAddress.includes('github.dev')) {
      // Handle github.dev domains without https prefix
      const hostname = rawAddress.replace(/^https?:\/\//, '').replace(/\/$/, '');
      address = `${hostname}:443`;
      useTLS = true;
      console.log('🔒 Using GitHub Codespace domain - address:', address);
    } else {
      // Local or standard hostname:port
      address = rawAddress;
      console.log('🏠 Using local/standard address:', address);
    }
    
    console.log('🔍 Connecting to:', address, useTLS ? '(with TLS)' : '(without TLS)');
    
    // Create connection to Temporal server
    const connectionOptions: any = {
      address: address,
      ...(useTLS ? { tls: {} } : {})
    };
    
    const connection = await NativeConnection.connect(connectionOptions);
    
    console.log('✅ Connection established successfully');

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