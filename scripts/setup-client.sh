#!/bin/bash

echo "🖥️  Setting up Local Client Environment"
echo "======================================"

# Check if we have the required files
echo "🔍 Checking required files..."

# Check directories
if [ ! -d "src/auth" ]; then
    mkdir -p src/auth
    echo "   📁 Created src/auth directory"
fi

if [ ! -d "certs" ]; then
    mkdir -p certs
    echo "   📁 Created certs directory"
fi

# Check JWT token
if [ ! -f "src/auth/admin-token.jwt" ]; then
    echo "   ❌ Missing: src/auth/admin-token.jwt"
    echo "      Copy from server or download from Codespaces client-export"
    MISSING_FILES=true
fi

# Check certificates
if [ ! -f "certs/ca.pem" ]; then
    echo "   ❌ Missing: certs/ca.pem"
    MISSING_FILES=true
fi

if [ ! -f "certs/worker-client.pem" ]; then
    echo "   ❌ Missing: certs/worker-client.pem"
    MISSING_FILES=true
fi

if [ ! -f "certs/worker-client-key.pem" ]; then
    echo "   ❌ Missing: certs/worker-client-key.pem"
    MISSING_FILES=true
fi

if [ "$MISSING_FILES" = true ]; then
    echo ""
    echo "❌ Missing required files for mTLS authentication"
    echo ""
    echo "📥 To get these files from Codespaces:"
    echo "   1. In Codespaces, run: ./scripts/export-client-files.sh"
    echo "   2. Download the client-export directory"
    echo "   3. Copy files to your local project:"
    echo "      cp client-export/admin-token.jwt ./src/auth/"
    echo "      cp client-export/*.pem ./certs/"
    echo ""
    exit 1
fi

echo "   ✅ All required files found"

# Check .env.local
if [ ! -f ".env.local" ]; then
    echo ""
    echo "⚙️  Setting up .env.local..."
    echo "TEMPORAL_ADDRESS=https://YOUR-CODESPACE-7233.app.github.dev" > .env.local
    echo "   📝 Created .env.local template"
    echo "   ⚠️  Update TEMPORAL_ADDRESS with your actual Codespaces URL"
else
    echo "   ✅ .env.local exists"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "✅ Client setup completed!"
echo ""
echo "🚀 Next steps:"
echo "   1. Update TEMPORAL_ADDRESS in .env.local with your Codespaces URL"
echo "   2. Make sure port 7233 is PUBLIC in Codespaces"
echo "   3. Test connection: npm run temporal:test-connection"
echo "   4. Start client worker: npm run temporal:worker3:client"
echo ""
echo "🔗 Codespaces URL format:"
echo "   https://YOUR-CODESPACE-7233.app.github.dev" 