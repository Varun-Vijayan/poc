const jwt = require('jsonwebtoken');
const fs = require('fs');
const crypto = require('crypto');

// Generate RSA key pair for testing with correct format
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'pkcs1',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs1',
    format: 'pem'
  }
});

console.log('Generated RSA Key Pair');
console.log('Private Key:\n', privateKey);
console.log('Public Key:\n', publicKey);

// Save keys for reference
fs.writeFileSync('private-key.pem', privateKey);
fs.writeFileSync('public-key.pem', publicKey);

function generateWorkerToken(workerId, permissions = ['default:read', 'default:write']) {
  const payload = {
    sub: workerId,
    iss: 'temporal-auth-service',
    aud: 'temporal-server',
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    iat: Math.floor(Date.now() / 1000),
    permissions: permissions,
    worker_identity: workerId
  };

  console.log(`Generating token for ${workerId}...`);
  
  const token = jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    keyid: 'temporal-key'
  });

  return token;
}

// Generate tokens for different workers
console.log('\nGenerating tokens...');
const tokens = {
  'local-worker-stage3': generateWorkerToken('local-worker-stage3'),
  'codespace-worker-stage1': generateWorkerToken('codespace-worker-stage1'),
  'codespace-worker-stage2': generateWorkerToken('codespace-worker-stage2')
};

console.log('\nGenerated JWT Tokens:');
console.log('===================');
Object.entries(tokens).forEach(([worker, token]) => {
  console.log(`\n${worker}:`);
  console.log(token);
});

// Save tokens to files
Object.entries(tokens).forEach(([worker, token]) => {
  fs.writeFileSync(`${worker}-token.jwt`, token);
});

console.log('\n✅ Tokens saved to individual files');
console.log('✅ Keys saved as private-key.pem and public-key.pem');

module.exports = { generateWorkerToken, tokens, privateKey, publicKey };