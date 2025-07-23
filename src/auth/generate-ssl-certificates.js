const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ensure certs directory exists
const certsDir = './certs';
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

console.log('🔐 Generating SSL/TLS Certificates for Temporal (Compatible Version)...');

// Certificate configuration
const certConfig = {
  keySize: 2048, // Reduced from 4096 for better compatibility
  validityDays: 365,
  country: 'US',
  state: 'CA',
  city: 'San Francisco',
  organization: 'XFlow Temporal',
  organizationalUnit: 'Development'
};

// Create OpenSSL config file for SAN with compatible settings
const opensslConfigContent = `
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = ${certConfig.country}
ST = ${certConfig.state}
L = ${certConfig.city}
O = ${certConfig.organization}
OU = ${certConfig.organizationalUnit}
CN = temporal-server

[v3_req]
basicConstraints = CA:FALSE
keyUsage = keyEncipherment, dataEncipherment, digitalSignature
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names

[v3_ca]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints = critical,CA:true
keyUsage = critical, digitalSignature, cRLSign, keyCertSign

[alt_names]
DNS.1 = temporal-server
DNS.2 = localhost
DNS.3 = temporal
DNS.4 = *.app.github.dev
DNS.5 = *.github.dev
DNS.6 = *.githubpreview.dev
IP.1 = 127.0.0.1
`;

// Write OpenSSL config
fs.writeFileSync('./certs/openssl.cnf', opensslConfigContent);

const opensslCommands = [
  // Generate CA private key (RSA 2048 for compatibility)
  'openssl genrsa -out ./certs/ca-key.pem 2048',
  
  // Generate CA certificate with v3 extensions
  `openssl req -new -x509 -days ${certConfig.validityDays} -key ./certs/ca-key.pem -out ./certs/ca.pem -config ./certs/openssl.cnf -extensions v3_ca -subj "/C=${certConfig.country}/ST=${certConfig.state}/L=${certConfig.city}/O=${certConfig.organization}/OU=${certConfig.organizationalUnit}/CN=XFlow Temporal CA"`,
  
  // Generate Temporal server private key
  'openssl genrsa -out ./certs/temporal-server-key.pem 2048',
  
  // Generate Temporal server certificate signing request
  'openssl req -new -key ./certs/temporal-server-key.pem -out ./certs/temporal-server.csr -config ./certs/openssl.cnf',
  
  // Generate server certificate with v3 extensions and SAN
  'openssl x509 -req -days 365 -in ./certs/temporal-server.csr -CA ./certs/ca.pem -CAkey ./certs/ca-key.pem -CAcreateserial -out ./certs/temporal-server.pem -extfile ./certs/openssl.cnf -extensions v3_req',
  
  // Generate worker client private key
  'openssl genrsa -out ./certs/worker-client-key.pem 2048',
  
  // Generate worker client certificate signing request
  `openssl req -new -key ./certs/worker-client-key.pem -out ./certs/worker-client.csr -subj "/C=${certConfig.country}/ST=${certConfig.state}/L=${certConfig.city}/O=${certConfig.organization}/OU=${certConfig.organizationalUnit}/CN=worker-client"`,
  
  // Generate client certificate with proper extensions
  'openssl x509 -req -days 365 -in ./certs/worker-client.csr -CA ./certs/ca.pem -CAkey ./certs/ca-key.pem -CAcreateserial -out ./certs/worker-client.pem -extfile ./certs/openssl.cnf -extensions v3_req',
  
  // Clean up CSR files and config
  'rm -f ./certs/*.csr ./certs/openssl.cnf'
];

console.log('🔑 Generating certificates using OpenSSL...');

try {
  opensslCommands.forEach((cmd, index) => {
    console.log(`   Step ${index + 1}: ${cmd.split(' ').slice(0, 3).join(' ')}...`);
    execSync(cmd, { stdio: 'pipe' });
  });

  console.log('✅ SSL certificates generated successfully!');
  console.log('\n📁 Certificate files created:');
  console.log('   - ./certs/ca.pem (Certificate Authority)');
  console.log('   - ./certs/ca-key.pem (CA Private Key)');
  console.log('   - ./certs/temporal-server.pem (Server Certificate)');
  console.log('   - ./certs/temporal-server-key.pem (Server Private Key)');
  console.log('   - ./certs/worker-client.pem (Client Certificate)');
  console.log('   - ./certs/worker-client-key.pem (Client Private Key)');

  // Verify certificates
  console.log('\n🔍 Verifying certificates...');
  
  // Verify server certificate
  console.log('\nServer Certificate Details:');
  execSync('openssl x509 -in ./certs/temporal-server.pem -text -noout | grep -E "Subject:|Issuer:|DNS:|IP Address:"', { stdio: 'inherit' });
  
  console.log('\n✅ Certificate verification completed!');
  console.log('\n🛡️  SSL/TLS certificates are ready for mTLS!');
  console.log('⚠️  Keep the CA private key (ca-key.pem) secure!');

} catch (error) {
  console.error('❌ Error generating certificates:', error.message);
  console.error('\n💡 Make sure OpenSSL is installed:');
  console.error('   - macOS: brew install openssl');
  console.error('   - Ubuntu: apt-get install openssl');
  console.error('   - Windows: Download from https://slproweb.com/products/Win32OpenSSL.html');
  process.exit(1);
}