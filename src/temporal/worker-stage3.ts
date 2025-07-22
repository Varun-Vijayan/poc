import { Worker, NativeConnection } from '@temporalio/worker';
import * as stage3Activities from './activities-stage3';
import * as fs from 'fs';

async function run() {
  console.log('=== TEMPORAL WORKER 3 (FINAL PROCESSING & NOTIFICATIONS) STARTING ===');
  console.log('Environment variables loaded:');
  console.log('TEMPORAL_ADDRESS:', process.env.TEMPORAL_ADDRESS || 'localhost:7233');
  console.log('SENDGRID_API_KEY present:', !!process.env.SENDGRID_API_KEY);
  console.log('SENDGRID_FROM_EMAIL:', process.env.SENDGRID_FROM_EMAIL);
  
  try {
    const rawAddress = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
    console.log('🔍 Raw address:', rawAddress);
    
    // MANDATORY: Load JWT token for authentication
    let jwtToken: string;
    try {
      jwtToken = fs.readFileSync('./src/auth/admin-token.jwt', 'utf8').trim();
      console.log('🔑 JWT token loaded successfully (first 50 chars):', jwtToken.substring(0, 50) + '...');
    } catch (error) {
      console.error('❌ AUTHENTICATION REQUIRED: JWT token not found!');
      console.error('   Expected file: ./src/auth/admin-token.jwt');
      console.error('   Generate tokens with: node src/auth/generate-jwt.js');
      process.exit(1);
    }

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
    
    // Create connection to Temporal server with MANDATORY JWT authentication
    const connectionOptions: any = {
      address: address,
      ...(useTLS ? { tls: {} } : {}),
      // JWT authentication is REQUIRED
      metadata: {
        'authorization': `Bearer ${jwtToken}`
      }
    };
    
    const connection = await NativeConnection.connect(connectionOptions);
    
    console.log('✅ Connection established with JWT authentication');

    // Create a Worker to run Workflows and Activities
    const worker = await Worker.create({
      connection,
      workflowsPath: require.resolve('./workflows-distributed'),
      activities: stage3Activities,
      taskQueue: 'xflow-stage3-queue',
    });

    console.log('✅ Stage 3 Worker started successfully with JWT authentication!');
    console.log('Worker listening on task queue: xflow-stage3-queue');
    console.log('Handles: SEND_EMAIL_NOTIFICATION, LOG_EVENT, DELAY');
    await worker.run();
  } catch (error: any) {
    console.error('❌ Stage 3 Worker startup failed:', error);
    if (error.message?.includes('authentication') || error.message?.includes('authorization')) {
      console.error('🔐 AUTHENTICATION ERROR: Invalid or missing JWT token');
      console.error('   Make sure to generate valid tokens with: node src/auth/generate-jwt.js');
    }
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('❌ Stage 3 Worker failed:', err);
  process.exit(1);
});