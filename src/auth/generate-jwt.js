const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const fs = require('fs');

// Generate RSA key pair
console.log('🔑 Generating new RSA key pair...');
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
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

// Save keys to files
fs.writeFileSync('./src/auth/jwt-private.pem', privateKey);
fs.writeFileSync('./src/auth/jwt-public.pem', publicKey);

// Generate JWKS (JSON Web Key Set) for the JWT server
console.log('🔐 Generating JWKS for JWT server...');

// Extract public key components for JWKS
const publicKeyObj = crypto.createPublicKey(publicKey);
const keyDetails = publicKeyObj.asymmetricKeyDetails;

// Create JWKS
const jwks = {
  keys: [
    {
      kty: "RSA",
      kid: "temporal-key",
      use: "sig",
      alg: "RS256",
      n: publicKeyObj.export({ format: 'jwk' }).n,
      e: publicKeyObj.export({ format: 'jwk' }).e
    }
  ]
};

// Save JWKS to temporal-config directory
const jwksJson = JSON.stringify(jwks, null, 2);
fs.writeFileSync('./temporal-config/jwks', jwksJson);

console.log('✅ RSA key pair generated and saved');
console.log('✅ JWKS file created at ./temporal-config/jwks');

console.log('\n=== GENERATING TEMPORAL JWT TOKENS ===\n');

// Common claims for all tokens
const basePayload = {
  iss: 'xflow-temporal-server',
  aud: ['temporal-service'],
  exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours
  iat: Math.floor(Date.now() / 1000),
  sub: 'worker-client'
};

const signOptions = {
  algorithm: 'RS256',
  keyid: 'temporal-key'
};

// 1. Admin token (should work for everything)
const adminPayload = {
  ...basePayload,
  permissions: ['default:admin']
};

const adminToken = jwt.sign(adminPayload, privateKey, signOptions);
fs.writeFileSync('./src/auth/admin-token.jwt', adminToken);

console.log('1. ADMIN TOKEN (should work):');
console.log(`Bearer ${adminToken}`);
console.log('\nDecoded payload:', jwt.decode(adminToken));

// 2. Reader token (limited permissions)
const readerPayload = {
  ...basePayload,
  permissions: ['default:read']
};

const readerToken = jwt.sign(readerPayload, privateKey, signOptions);
fs.writeFileSync('./src/auth/reader-token.jwt', readerToken);

console.log('\n2. READER TOKEN (should work):');
console.log(`Bearer ${readerToken}`);

// 3. Multi-namespace token
const multiPayload = {
  ...basePayload,
  permissions: ['default:admin', 'temporal-system:read']
};

const multiToken = jwt.sign(multiPayload, privateKey, signOptions);
fs.writeFileSync('./src/auth/multi-token.jwt', multiToken);

console.log('\n3. MULTI-NAMESPACE TOKEN (should work):');
console.log(`Bearer ${multiToken}`);

console.log('\n✅ Tokens saved to ./src/auth/');
console.log('   - admin-token.jwt (default:admin)');
console.log('   - reader-token.jwt (default:read)');
console.log('   - multi-token.jwt (multiple namespaces)');

console.log('\n✅ JWKS saved to ./temporal-config/jwks');
console.log('   - Available at http://localhost:8080/jwks');

console.log('\n🧪 TEST WITH:');
console.log(`   docker exec temporal temporal workflow list --address localhost:7233 --header "authorization=Bearer ${adminToken}"`);