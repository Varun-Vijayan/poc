const jwt = require('jsonwebtoken');
const fs = require('fs');
const crypto = require('crypto');

// Read or generate RSA key pair
let privateKey, publicKey;

try {
  privateKey = fs.readFileSync('./src/auth/jwt-private.pem', 'utf8');
  publicKey = fs.readFileSync('./src/auth/jwt-public.pem', 'utf8');
  console.log('✅ Using existing RSA key pair');
} catch (error) {
  console.log('🔑 Generating new RSA key pair...');
  const { publicKey: pubKey, privateKey: privKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  privateKey = privKey;
  publicKey = pubKey;
  
  // Save keys
  fs.writeFileSync('./src/auth/jwt-private.pem', privateKey);
  fs.writeFileSync('./src/auth/jwt-public.pem', publicKey);
  console.log('✅ RSA key pair generated and saved');
}

// Generate JWT with format expected by Temporal default ClaimMapper
function generateTemporalJWT(permissions = ['default:admin']) {
  const payload = {
    // Required claims
    "iss": "xflow-temporal-server",
    "aud": ["temporal-service"],
    "exp": Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour expiration
    "iat": Math.floor(Date.now() / 1000),
    "sub": "worker-client",
    
    // Temporal-specific permissions claim
    "permissions": permissions
  };

  const options = {
    algorithm: 'RS256',
    keyid: 'temporal-key'
  };

  return jwt.sign(payload, privateKey, options);
}

// Generate tokens for different scenarios
console.log('\n=== GENERATING TEMPORAL JWT TOKENS ===\n');

// 1. Valid token with admin permissions
const adminToken = generateTemporalJWT(['default:admin']);
console.log('1. ADMIN TOKEN (should work):');
console.log(`Bearer ${adminToken}`);
console.log('\nDecoded payload:', jwt.decode(adminToken));

// 2. Valid token with read-only permissions  
const readerToken = generateTemporalJWT(['default:read']);
console.log('\n2. READER TOKEN (should work):');
console.log(`Bearer ${readerToken}`);

// 3. Valid token with multiple namespace permissions
const multiToken = generateTemporalJWT(['default:admin', 'temporal-system:read']);
console.log('\n3. MULTI-NAMESPACE TOKEN (should work):');
console.log(`Bearer ${multiToken}`);

// Save tokens to files for easy worker testing
fs.writeFileSync('./src/auth/admin-token.jwt', adminToken);
fs.writeFileSync('./src/auth/reader-token.jwt', readerToken);
fs.writeFileSync('./src/auth/multi-token.jwt', multiToken);

console.log('\n✅ Tokens saved to ./src/auth/');
console.log('   - admin-token.jwt (default:admin)');
console.log('   - reader-token.jwt (default:read)');  
console.log('   - multi-token.jwt (multiple namespaces)');

console.log('\n🧪 TEST WITH:');
console.log('   docker exec xflow-poc-temporal-1 temporal workflow list --address localhost:7233 --header "authorization=Bearer ' + adminToken + '"');