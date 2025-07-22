# Distributed JWT Authentication Testing Guide

This guide shows how to run a distributed Temporal workflow system with JWT authentication across GitHub Codespaces and local machine.

## 🏗️ **System Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    GITHUB CODESPACES                       │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Temporal      │  │   Worker 1      │  │  Worker 2   │ │
│  │   Server        │  │  (Validation)   │  │ (Transform) │ │
│  │   + JWT Auth    │  │                 │  │             │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│           │                     │                 │        │
│           │                     │                 │        │
└───────────┼─────────────────────┼─────────────────┼────────┘
            │                     │                 │         
            │ JWT                 │ JWT             │ JWT     
            │ Tokens              │ Tokens          │ Tokens  
            │                     │                 │         
┌───────────▼─────────────────────▼─────────────────▼────────┐
│                    LOCAL MACHINE                           │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │    Worker 3     │  │    Frontend     │                  │
│  │ (Notifications) │  │   Dashboard     │                  │
│  │                 │  │                 │                  │
│  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

## 📋 **STEP-BY-STEP SETUP**

### 🌐 **CODESPACES SETUP (Remote)**

#### 1. Start Services
```bash
# In GitHub Codespaces terminal
cd /workspaces/poc
docker-compose up -d

# Verify services are running
docker ps
```

#### 2. Generate JWT Authentication Keys
```bash
# Generate RSA keys and JWT tokens
node src/auth/generate-jwt.js

# Verify tokens were created
ls -la src/auth/*.jwt
```

#### 3. Start Distributed Workers
```bash
# Terminal 1: Start Stage 1 Worker (Validation)
npm run temporal:worker1

# Terminal 2: Start Stage 2 Worker (Transformation)  
npm run temporal:worker2

# Terminal 3: Start Frontend
npm run dev
```

#### 4. Configure Public Access
1. **Go to PORTS tab** in Codespaces
2. **Find port 7234** (Temporal Server)
3. **Right-click** → Change Port Visibility → **Public**
4. **Copy the public URL** (format: `https://animated-invention-7234.app.github.dev`)

#### 5. Verify Codespaces Setup
```bash
# Check worker logs show JWT authentication
# Should see: "✅ Connection established WITH VALID JWT TOKEN"

# Test JWKS endpoint
curl https://animated-invention-8080.app.github.dev/jwks

# Check Temporal UI
# Open: https://animated-invention-8234.app.github.dev
```

### 🏠 **LOCAL SETUP**

#### 1. Clone Repository
```bash
# On your local machine
git clone https://github.com/Varun-Vijayan/poc.git
cd poc
git checkout fresh-main
npm install
```

#### 2. Generate Local JWT Keys
```bash
# Generate local JWT tokens (will create different keys than Codespaces)
node src/auth/generate-jwt.js

# This creates:
# - src/auth/jwt-private.pem (local private key)
# - src/auth/jwt-public.pem (local public key)  
# - src/auth/*.jwt (local JWT tokens)
```

#### 3. Configure Connection to Codespaces
```bash
# Create .env.local with Codespaces Temporal URL
echo "TEMPORAL_ADDRESS=https://animated-invention-7234.app.github.dev" > .env.local

# Replace 'animated-invention-7234' with your actual Codespace URL
```

#### 4. Start Local Worker
```bash
# Start Stage 3 Worker (Final Processing & Notifications)
npm run temporal:worker3

# Should see:
# 🔑 Using admin JWT token (first 50 chars): eyJhbGciOiJS...
# ✅ Connection established WITH VALID JWT TOKEN
# ✅ Stage 3 Worker started successfully WITH VALID JWT!
```

## 🧪 **TESTING WORKFLOWS**

### Test 1: Frontend Workflow Creation
1. **Open Codespaces Frontend**: `https://animated-invention-3000.app.github.dev`
2. **Create a workflow** using the visual builder
3. **Execute the workflow**
4. **Verify distributed execution**:
   - Stage 1: Runs in Codespaces (see worker1 logs)
   - Stage 2: Runs in Codespaces (see worker2 logs)  
   - Stage 3: Runs locally (see local worker3 logs)

### Test 2: Manual Workflow Execution
```bash
# In Codespaces terminal
node -e "
const { Client, Connection } = require('@temporalio/client');
const fs = require('fs');

async function test() {
  const connection = await Connection.connect({
    address: 'localhost:7234',
    metadata: {
      'authorization': \`Bearer \${fs.readFileSync('./src/auth/admin-token.jwt', 'utf8')}\`
    }
  });
  
  const client = new Client({ connection });
  
  const result = await client.workflow.start('executeDistributedWorkflow', {
    args: [{
      stage1Data: { input: 'test data' },
      stage2Data: { transform: 'uppercase' },
      stage3Data: { notify: 'email' }
    }],
    taskQueue: 'xflow-main-queue',
    workflowId: 'test-distributed-' + Date.now()
  });
  
  console.log('✅ Workflow started:', result.workflowId);
  console.log('🌐 Result:', await result.result());
}
test();
"
```

### Test 3: Verify JWT Authentication
```bash
# Test from local machine - should work with JWT
node -e "
const { Connection } = require('@temporalio/client');
const fs = require('fs');

async function testAuth() {
  try {
    // Test with valid JWT
    const connection = await Connection.connect({
      address: 'https://animated-invention-7234.app.github.dev',
      tls: {},
      metadata: {
        'authorization': \`Bearer \${fs.readFileSync('./src/auth/admin-token.jwt', 'utf8')}\`
      }
    });
    console.log('✅ Authentication successful with valid JWT');
    connection.close();
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
  }
}
testAuth();
"
```

## 📊 **MONITORING & VERIFICATION**

### Check Worker Status
```bash
# In Codespaces
docker logs xflow-poc-temporal-1 | grep -E "(authorization|JWT|worker)"

# On Local
ps aux | grep worker
```

### View Temporal UI
- **Codespaces**: `https://animated-invention-8234.app.github.dev`
- **Check workflow executions**
- **Verify task queue assignments**:
  - `xflow-stage1-queue` → Codespaces Worker 1
  - `xflow-stage2-queue` → Codespaces Worker 2  
  - `xflow-stage3-queue` → Local Worker 3

### Verify JWT Endpoints
```bash
# JWKS endpoint (Codespaces)
curl https://animated-invention-8080.app.github.dev/jwks

# Should return public keys for JWT validation
```

## 🐛 **TROUBLESHOOTING**

### Worker Connection Issues
```bash
# Check Codespaces port is public
# Verify URL format: https://XXXX-7234.app.github.dev (no trailing slash)

# Test connectivity from local
curl -I https://animated-invention-7234.app.github.dev

# Check JWT token exists locally
ls -la src/auth/admin-token.jwt
```

### Authentication Failures
```bash
# Regenerate tokens if needed
node src/auth/generate-jwt.js

# Check Temporal logs for auth errors
docker logs xflow-poc-temporal-1 | grep -i error

# Verify JWKS is accessible
curl https://animated-invention-8080.app.github.dev/jwks
```

### Worker Not Connecting
```bash
# Check .env.local has correct Codespaces URL
cat .env.local

# Test TLS connection
openssl s_client -connect animated-invention-7234.app.github.dev:443 -servername animated-invention-7234.app.github.dev
```

## 🎯 **SUCCESS INDICATORS**

✅ **Codespaces Workers Running**:
```
✅ Stage 1 Worker started successfully WITH VALID JWT!
✅ Stage 2 Worker started successfully WITH VALID JWT!
Worker state changed: RUNNING
```

✅ **Local Worker Connected**:
```
🔑 Using admin JWT token (first 50 chars): eyJhbGciOiJS...
✅ Connection established WITH VALID JWT TOKEN
✅ Stage 3 Worker started successfully WITH VALID JWT!
```

✅ **Workflow Execution**:
- Frontend shows workflow progress
- Temporal UI shows distributed task execution
- Each stage runs on correct worker (Codespaces vs Local)

## 🔄 **QUICK RESTART COMMANDS**

### Restart Everything (Codespaces)
```bash
docker-compose down && docker-compose up -d
npm run temporal:worker1 &
npm run temporal:worker2 &
npm run dev &
```

### Restart Local Worker
```bash
# Kill existing worker
pkill -f "worker-stage3"

# Restart
npm run temporal:worker3
```

## 🚀 **PRODUCTION CONSIDERATIONS**

1. **Use GitHub CLI for port forwarding** instead of public URLs:
   ```bash
   gh codespace ports forward 7234:7234 --codespace CODESPACE_NAME
   ```

2. **Implement proper secret management** for JWT keys

3. **Use HTTPS** for all JWKS endpoints in production

4. **Monitor worker health** and implement auto-restart mechanisms

5. **Implement token rotation** for enhanced security

---

✅ **System Status**: Distributed JWT Authentication OPERATIONAL  
🌐 **Codespaces**: Workers 1 & 2 + Temporal Server  
🏠 **Local**: Worker 3 + Client  
🔒 **Security**: JWT Authentication enforced across all connections 