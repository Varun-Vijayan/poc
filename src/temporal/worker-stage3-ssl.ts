import { Worker, NativeConnection } from '@temporalio/worker';
import * as stage3Activities from './activities-stage3';
import * as fs from 'fs';

async function run() {
  console.log('=== TEMPORAL WORKER 3 (SSL + JWT) STARTING ===');
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

    // MANDATORY: Load SSL certificates
    let clientCert: string, clientKey: string, caCert: string;
    try {
      clientCert = fs.readFileSync('./certs/worker-client.pem', 'utf8');
      clientKey = fs.readFileSync('./certs/worker-client-key.pem', 'utf8');
      caCert = fs.readFileSync('./certs/ca.pem', 'utf8');
      console.log('🔐 SSL certificates loaded successfully');
    } catch (error) {
      console.error('❌ SSL CERTIFICATES REQUIRED: Certificates not found!');
      console.error('   Expected files in ./certs/ directory');
      console.error('   Generate certificates with: node src/auth/generate-ssl-certificates.js');
      process.exit(1);
    }

    // Parse the address
    let address: string;
    if (rawAddress.startsWith('https://')) {
      const url = new URL(rawAddress);
      address = `${url.hostname}:443`;
      console.log('🔒 Using HTTPS Codespace URL - extracted address:', address);
    } else if (rawAddress.includes('github.dev')) {
      const hostname = rawAddress.replace(/^https?:\/\//, '').replace(/\/$/, '');
      address = `${hostname}:443`;
      console.log('🔒 Using GitHub Codespace domain - address:', address);
    } else {
      address = rawAddress;
      console.log('🏠 Using local address with mTLS:', address);
    }
    
    console.log('🔍 Connecting to:', address, '(with mTLS + JWT)');
    
    // Create connection with mTLS + JWT authentication
    const connectionOptions: any = {
      address: address,
      tls: {
        clientCertPair: {
          crt: Buffer.from(clientCert),
          key: Buffer.from(clientKey)
        },
        serverNameOverride: 'temporal-server', // Must match certificate CN
        serverRootCACertificate: Buffer.from(caCert)
      },
      metadata: {
        'authorization': `Bearer ${jwtToken}`
      }
    };
    
    const connection = await NativeConnection.connect(connectionOptions);
    console.log('✅ Connection established with mTLS + JWT authentication');

    const worker = await Worker.create({
      connection,
      workflowsPath: require.resolve('./workflows-distributed'),
      activities: stage3Activities,
      taskQueue: 'xflow-stage3-queue',
    });

    console.log('✅ Stage 3 Worker started successfully with mTLS + JWT!');
    console.log('Worker listening on task queue: xflow-stage3-queue');
    console.log('Handles: SEND_EMAIL_NOTIFICATION, LOG_EVENT, DELAY');
    await worker.run();
  } catch (error: any) {
    console.error('❌ Stage 3 Worker startup failed:', error);
    if (error.message?.includes('authentication') || error.message?.includes('authorization')) {
      console.error('🔐 AUTHENTICATION ERROR: Invalid JWT token');
    }
    if (error.message?.includes('certificate') || error.message?.includes('tls')) {
      console.error('🔒 mTLS ERROR: Invalid SSL certificate');
    }
    console.error('   Make sure to generate certificates with: node src/auth/generate-ssl-certificates.js');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
}); 