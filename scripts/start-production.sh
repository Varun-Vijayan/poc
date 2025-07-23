#!/bin/bash

echo "🚀 Starting Production-like Environment in Codespaces"
echo "====================================================="

# Check if running in Codespaces
if [ -z "$CODESPACES" ]; then
    echo "⚠️  This script is designed for GitHub Codespaces"
    echo "   Continuing anyway..."
fi

# Step 1: Generate certificates and JWT tokens
echo "🔑 Step 1: Generating JWT tokens and SSL certificates..."
node src/auth/generate-jwt.js
node src/auth/generate-ssl-certificates.js

# Step 2: Start Temporal server and infrastructure ONLY
echo "🐳 Step 2: Starting Temporal server and infrastructure..."
docker-compose down
docker-compose up -d

# Step 3: Wait for services to be ready
echo "⏳ Step 3: Waiting for services to start..."
sleep 20

# Step 4: Verify services
echo "🔍 Step 4: Verifying services..."
echo "   - Temporal server: http://localhost:7233"
echo "   - Temporal UI: http://localhost:8234"
echo "   - JWKS endpoint: http://localhost:8080/jwks"

# Test JWKS endpoint
if curl -f -s http://localhost:8080/jwks > /dev/null; then
    echo "   ✅ JWKS endpoint is accessible"
else
    echo "   ❌ JWKS endpoint is not accessible"
fi

# Test Temporal server
echo "   🔍 Testing Temporal server..."
curl -I http://localhost:7233 2>&1 | grep -q "HTTP/0.9" && echo "   ✅ Temporal server is responding" || echo "   ❌ Temporal server not responding"

echo ""
echo "🌐 Production Environment Ready!"
echo "================================="
echo ""
echo "📊 Services Running:"
echo "   - Temporal Server: localhost:7233 (with mTLS + JWT)"
echo "   - Temporal UI: localhost:8234"
echo "   - JWKS Server: localhost:8080"
echo "   - PostgreSQL: localhost:5433"
echo ""
echo "👷 Manual Worker Commands:"
echo "   npm run temporal:worker1:ssl  # Stage 1 worker"
echo "   npm run temporal:worker2:ssl  # Stage 2 worker"
echo "   npm run temporal:worker3:ssl  # Stage 3 worker (for testing)"
echo ""
echo "🔗 For External Connections:"
echo "   1. Make port 7233 PUBLIC in Codespaces"
echo "   2. Use Codespaces URL: https://YOUR-CODESPACE-7233.app.github.dev"
echo "   3. Copy certificates and JWT token to client machine"
echo ""
echo "📋 Required Files for Client:"
echo "   - src/auth/admin-token.jwt"
echo "   - certs/ca.pem"
echo "   - certs/worker-client.pem"
echo "   - certs/worker-client-key.pem"
echo ""
echo "📦 Export client files: ./scripts/export-client-files.sh"
echo ""
echo "🛑 To stop services: docker-compose down" 