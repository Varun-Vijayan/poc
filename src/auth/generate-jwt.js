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

// Extract RSA public key components using crypto.createPublicKey
const keyObject = crypto.createPublicKey(publicKey);
const jwkData = keyObject.export({ format: 'jwk' });

// Create JWKS
const jwks = {
  keys: [
    {
      kty: "RSA",
      kid: "temporal-key",
      use: "sig",
      alg: "RS256",
      n: jwkData.n,
      e: jwkData.e
    }
  ]
};

// Save JWKS to temporal-config directory
const jwksJson = JSON.stringify(jwks, null, 2);
fs.writeFileSync('./temporal-config/jwks', jwksJson);

console.log('✅ RSA key pair generated and saved');
console.log('✅ JWKS file created at ./temporal-config/jwks');

console.log('\n=== GENERATING TEMPORAL JWT TOKEN ===\n');

// Token configuration
const tokenPayload = {
  iss: 'xflow-temporal-server',
  aud: ['temporal-service'],
  exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours
  iat: Math.floor(Date.now() / 1000),
  sub: 'worker-client',
  permissions: ['default:admin']
};

const signOptions = {
  algorithm: 'RS256',
  keyid: 'temporal-key'
};

// Generate single admin token for all workers and client
const adminToken = jwt.sign(tokenPayload, privateKey, signOptions);
fs.writeFileSync('./src/auth/admin-token.jwt', adminToken);

console.log('🔑 ADMIN TOKEN (used by all workers and client):');
console.log(`Bearer ${adminToken}`);
console.log('\nDecoded payload:', jwt.decode(adminToken));

console.log('\n✅ Token saved to ./src/auth/admin-token.jwt');
console.log('✅ JWKS saved to ./temporal-config/jwks');
console.log('   - Available at http://localhost:8080/jwks');

console.log('\n🧪 TEST WITH:');
console.log(`   docker exec temporal temporal workflow list --address localhost:7233 --header "authorization=Bearer ${adminToken}"`);

console.log('\n🎯 USAGE:');
console.log('   - All workers use: ./src/auth/admin-token.jwt');
console.log('   - Frontend client uses: ./src/auth/admin-token.jwt');
console.log('   - Token expires in 24 hours');
console.log('   - Re-run this script to generate new tokens');