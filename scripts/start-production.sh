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

# Step 2: Start Temporal server and infrastructure
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

# Step 5: Start production workers (Stage 1 & 2)
echo "👷 Step 5: Starting production workers (Stage 1 & 2)..."
echo "   Starting workers in background..."

# Set environment for workers
export TEMPORAL_ADDRESS="localhost:7233"

# Start workers in background with logging
nohup npm run temporal:worker1:ssl > worker1.log 2>&1 &
WORKER1_PID=$!
echo "   ✅ Worker 1 started (PID: $WORKER1_PID)"

nohup npm run temporal:worker2:ssl > worker2.log 2>&1 &
WORKER2_PID=$!
echo "   ✅ Worker 2 started (PID: $WORKER2_PID)"

# Save PIDs for later cleanup
echo $WORKER1_PID > worker1.pid
echo $WORKER2_PID > worker2.pid

# Step 6: Display connection information
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
echo "👷 Workers Running:"
echo "   - Stage 1 Worker: Active (PID: $WORKER1_PID)"
echo "   - Stage 2 Worker: Active (PID: $WORKER2_PID)"
echo "   - Stage 3 Worker: EXTERNAL (for client connections)"
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
echo "📝 Worker Logs:"
echo "   - Worker 1: tail -f worker1.log"
echo "   - Worker 2: tail -f worker2.log"
echo ""
echo "🛑 To stop workers: ./scripts/stop-production.sh" 