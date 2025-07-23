import { Worker, NativeConnection } from '@temporalio/worker';
import * as stage1Activities from './activities-stage1';
import * as fs from 'fs';

async function run() {
  console.log('=== TEMPORAL WORKER 1 (SSL + JWT) STARTING ===');
  console.log('Environment variables loaded:');
  console.log('TEMPORAL_ADDRESS:', process.env.TEMPORAL_ADDRESS || 'localhost:7233');
  
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

    // Parse the address to handle Codespace HTTPS URLs
    let address: string;
    if (rawAddress.startsWith('https://')) {
      // Extract hostname from HTTPS URL and use port 443
      const url = new URL(rawAddress);
      address = `${url.hostname}:443`;
      console.log('🔒 Using HTTPS Codespace URL - extracted address:', address);
    } else if (rawAddress.includes('github.dev')) {
      // Handle github.dev domains without https prefix
      const hostname = rawAddress.replace(/^https?:\/\//, '').replace(/\/$/, '');
      address = `${hostname}:443`;
      console.log('🔒 Using GitHub Codespace domain - address:', address);
    } else {
      // Local or standard hostname:port
      address = rawAddress;
      console.log('🏠 Using local address with mTLS:', address);
    }
    
    console.log('🔍 Connecting to:', address, '(with mTLS + JWT)');
    
    // Create connection with mTLS + JWT authentication
    const connectionOptions: any = {
      address: address,
      tls: {
        serverRootCACertificate: Buffer.from(caCert),
        clientCertPair: {
          crt: Buffer.from(clientCert),
          key: Buffer.from(clientKey)
        }
      },
      metadata: {
        'authorization': `Bearer ${jwtToken}`
      }
    };
    
    const connection = await NativeConnection.connect(connectionOptions);
    console.log('✅ Connection established with mTLS + JWT authentication');

    // Create a Worker to run Workflows and Activities
    const worker = await Worker.create({
      connection,
      workflowsPath: require.resolve('./workflows-distributed'),
      activities: stage1Activities,
      taskQueue: 'xflow-stage1-queue',
    });

    console.log('✅ Stage 1 Worker started successfully with mTLS + JWT!');
    console.log('Worker listening on task queue: xflow-stage1-queue');
    console.log('Handles: VALIDATE_INPUT, SANITIZE_DATA, CHECK_PERMISSIONS');
    console.log('');
    console.log('🎯 Worker 1 is ready to process validation and security tasks!');
    await worker.run();
  } catch (error: any) {
    console.error('❌ Stage 1 Worker startup failed:', error);
    if (error.message?.includes('authentication') || error.message?.includes('authorization')) {
      console.error('🔐 AUTHENTICATION ERROR: Invalid or missing JWT token');
      console.error('   Make sure to generate valid tokens with: node src/auth/generate-jwt.js');
    } else if (error.message?.includes('ENOTFOUND') || error.message?.includes('ECONNREFUSED')) {
      console.error('🌐 CONNECTION ERROR: Cannot reach Temporal server');
      console.error('   1. Make sure Temporal server is running');
      console.error('   2. Check TEMPORAL_ADDRESS is correct');
      console.error('   3. Verify certificates are valid');
    }
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
}); 