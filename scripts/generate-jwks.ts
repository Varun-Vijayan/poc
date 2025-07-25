import * as fs from 'fs';
import * as crypto from 'crypto';

function generateJWKS() {
  // Read the public key
  const publicKeyPem = fs.readFileSync('./src/auth/jwt-public.pem', 'utf8');
  
  // Extract key components (this is simplified - use a proper library)
  const publicKey = crypto.createPublicKey(publicKeyPem);
  const jwk = publicKey.export({ format: 'jwk' });

  const jwks = {
    keys: [{
      kty: jwk.kty,        // Key type (RSA)
      use: 'sig',          // Usage (signature)
      kid: 'temporal-key', // Key ID
      n: jwk.n,            // Modulus
      e: jwk.e             // Exponent
    }]
  };

  // Save JWKS file for Temporal
  fs.writeFileSync('./certs/jwks.json', JSON.stringify(jwks, null, 2));
  console.log('✅ JWKS file generated: ./certs/jwks.json');
}

generateJWKS(); 