import { Worker, NativeConnection } from '@temporalio/worker';
import * as stage3Activities from './activities-stage3';
import * as fs from 'fs';

async function run() {
  console.log('=== TEMPORAL CLIENT WORKER 3 (REMOTE CONNECTION) STARTING ===');
  console.log('Environment variables loaded:');
  console.log('TEMPORAL_ADDRESS:', process.env.TEMPORAL_ADDRESS || 'localhost:7233');
  console.log('SENDGRID_API_KEY present:', !!process.env.SENDGRID_API_KEY);
  console.log('SENDGRID_FROM_EMAIL:', process.env.SENDGRID_FROM_EMAIL);
  
  try {
    const rawAddress = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
    console.log('🔍 Raw address:', rawAddress);

    if (!rawAddress.includes('github.dev') && !rawAddress.includes('app.github.dev') && !rawAddress.startsWith('https://')) {
      console.log('⚠️  Warning: This worker is designed for remote connections');
      console.log('   For local development, use: npm run temporal:worker3:ssl');
    }
    
    // MANDATORY: Load JWT token for authentication
    let jwtToken: string;
    try {
      jwtToken = fs.readFileSync('./src/auth/admin-token.jwt', 'utf8').trim();
      console.log('🔑 JWT token loaded successfully (first 50 chars):', jwtToken.substring(0, 50) + '...');
    } catch (error) {
      console.error('❌ AUTHENTICATION REQUIRED: JWT token not found!');
      console.error('   Expected file: ./src/auth/admin-token.jwt');
      console.error('   Copy from server: scp server:/path/to/admin-token.jwt ./src/auth/');
      console.error('   Or download from Codespaces client-export directory');
      process.exit(1);
    }

    // MANDATORY: Load SSL certificates for mTLS
    let clientCert: string, clientKey: string, caCert: string;
    try {
      clientCert = fs.readFileSync('./certs/worker-client.pem', 'utf8');
      clientKey = fs.readFileSync('./certs/worker-client-key.pem', 'utf8');
      caCert = fs.readFileSync('./certs/ca.pem', 'utf8');
      console.log('🔐 mTLS certificates loaded successfully');
    } catch (error) {
      console.error('❌ mTLS CERTIFICATES REQUIRED: Certificates not found!');
      console.error('   Expected files in ./certs/ directory:');
      console.error('   - worker-client.pem');
      console.error('   - worker-client-key.pem');
      console.error('   - ca.pem');
      console.error('   Copy from server or download from Codespaces client-export');
      process.exit(1);
    }

    // Parse the address for remote connections
    let address: string;
    let isRemote = false;
    
    if (rawAddress.startsWith('https://')) {
      // Extract hostname from HTTPS URL and use port 443
      const url = new URL(rawAddress);
      address = `${url.hostname}:443`;
      isRemote = true;
      console.log('🌐 Using HTTPS Remote URL - extracted address:', address);
    } else if (rawAddress.includes('github.dev') || rawAddress.includes('app.github.dev')) {
      // Handle github.dev domains
      const hostname = rawAddress.replace(/^https?:\/\//, '').replace(/\/$/, '');
      address = `${hostname}:443`;
      isRemote = true;
      console.log('🌐 Using Remote domain - address:', address);
    } else {
      // Local or direct address
      address = rawAddress;
      console.log('🏠 Using direct address:', address);
    }
    
    console.log('🔍 Connecting to remote Temporal server...');
    console.log('   Address:', address);
    console.log('   Authentication: mTLS + JWT');
    
    // Create connection with mTLS + JWT authentication
    const connectionOptions: any = {
      address: address,
      tls: {
        clientCertPair: {
          crt: Buffer.from(clientCert),
          key: Buffer.from(clientKey)
        },
        serverRootCACertificate: Buffer.from(caCert),
        // For remote connections, be flexible with server name validation
        ...(isRemote ? {
          // Let TLS use the actual hostname from the connection
          serverNameOverride: undefined
        } : {
          // For local connections, use the certificate CN
          serverNameOverride: 'temporal-server'
        })
      },
      // JWT authentication is REQUIRED
      metadata: {
        'authorization': `Bearer ${jwtToken}`
      }
    };
    
    console.log('⚡ Attempting secure connection...');
    const connection = await NativeConnection.connect(connectionOptions);
    
    console.log('✅ Connection to remote Temporal server established!');
    console.log('🔐 Secured with: mTLS + JWT authentication');
    console.log('🌐 Connected to:', address);

    // Create a Worker to run Workflows and Activities
    const worker = await Worker.create({
      connection,
      workflowsPath: require.resolve('./workflows-distributed'),
      activities: stage3Activities,
      taskQueue: 'xflow-stage3-queue',
    });

    console.log('✅ Stage 3 Client Worker started successfully!');
    console.log('🌐 Connected to remote Temporal server');
    console.log('Worker listening on task queue: xflow-stage3-queue');
    console.log('Handles: SEND_EMAIL_NOTIFICATION, LOG_EVENT, DELAY');
    console.log('');
    console.log('🎯 Worker is now ready to process workflows from remote server!');
    
    await worker.run();
  } catch (error: any) {
    console.error('❌ Stage 3 Client Worker startup failed:', error);
    console.error('');
    
    if (error.message?.includes('ENOTFOUND') || error.message?.includes('ECONNREFUSED')) {
      console.error('🌐 CONNECTION ERROR: Cannot reach remote Temporal server');
      console.error('   1. Verify remote server is running');
      console.error('   2. Check if port 7233 is publicly accessible');
      console.error('   3. Verify TEMPORAL_ADDRESS in .env.local');
      console.error('   4. Test connectivity: curl -I <your-server-url>');
    } else if (error.message?.includes('authentication') || error.message?.includes('authorization')) {
      console.error('🔐 AUTHENTICATION ERROR: JWT authentication failed');
      console.error('   1. Verify JWT token is correct and not expired');
      console.error('   2. Ensure JWT token is from the same server');
      console.error('   3. Check JWKS endpoint is accessible from server');
    } else if (error.message?.includes('certificate') || error.message?.includes('tls') || error.message?.includes('ssl')) {
      console.error('🔒 mTLS ERROR: Certificate validation failed');
      console.error('   1. Verify certificates are from the same CA as server');
      console.error('   2. Check certificate expiration dates');
      console.error('   3. Ensure client certificate is valid');
      console.error('   4. For development, verify certificate SAN includes server domain');
    } else {
      console.error('❓ UNKNOWN ERROR:', error.message);
    }
    
    console.error('');
    console.error('🛠️  Troubleshooting checklist:');
    console.error('   □ Remote server is running and accessible');
    console.error('   □ Port 7233 is publicly exposed');
    console.error('   □ JWT token is copied from server');
    console.error('   □ mTLS certificates are copied from server');
    console.error('   □ TEMPORAL_ADDRESS is set correctly in .env.local');
    console.error('   □ Network allows outbound connections to server');
    
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
}); 