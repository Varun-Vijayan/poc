#!/bin/bash

echo "📦 Exporting Client Connection Files"
echo "===================================="

# Create export directory
mkdir -p client-export

# Copy required files
echo "📁 Copying files to client-export directory..."

# JWT token
cp src/auth/admin-token.jwt client-export/
echo "   ✅ JWT token: admin-token.jwt"

# Certificates
cp certs/ca.pem client-export/
cp certs/worker-client.pem client-export/
cp certs/worker-client-key.pem client-export/
echo "   ✅ Certificates: ca.pem, worker-client.pem, worker-client-key.pem"

# JWKS for reference
cp temporal-config/jwks client-export/
echo "   ✅ JWKS: jwks"

# Create instructions file
cat > client-export/SETUP_INSTRUCTIONS.md << 'EOF'
# Client Setup Instructions

## Files in this directory:
- `admin-token.jwt` - JWT token for authentication
- `ca.pem` - Certificate Authority certificate
- `worker-client.pem` - Client certificate
- `worker-client-key.pem` - Client private key
- `jwks` - JSON Web Key Set (for reference)

## Setup on client machine:

1. Copy files to your project:
   ```bash
   cp admin-token.jwt /path/to/your/project/src/auth/
   cp *.pem /path/to/your/project/certs/
   ```

2. Set environment variable:
   ```bash
   echo "TEMPORAL_ADDRESS=https://YOUR-CODESPACE-7233.app.github.dev" > .env.local
   ```

3. Run client worker:
   ```bash
   npm run temporal:worker3:client
   ```

## Important:
- Replace YOUR-CODESPACE-7233.app.github.dev with your actual Codespaces URL
- Make sure port 7233 is set to PUBLIC in Codespaces
- These certificates are for development only
EOF

echo ""
echo "✅ Client files exported to: ./client-export/"
echo ""
echo "📋 Next steps:"
echo "   1. Download the client-export directory"
echo "   2. Follow instructions in SETUP_INSTRUCTIONS.md"
echo "   3. Make sure port 7233 is PUBLIC in Codespaces"
echo ""
echo "🔗 Codespaces URL format:"
echo "   https://YOUR-CODESPACE-7233.app.github.dev" 