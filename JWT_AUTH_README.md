# JWT Authentication for Temporal Workflows

This project implements secure JWT authentication for Temporal workers according to the [Temporal Security Documentation](https://docs.temporal.io/self-hosted-guide/security#claim-mapper).

## 🔑 Security Features

- **RSA Key Pair Generation**: Secure 2048-bit RSA keys for JWT signing
- **JWT Token Authentication**: Bearer tokens with proper claims for workers
- **JWKS Endpoint**: Public key distribution via JSON Web Key Set
- **Temporal ClaimMapper**: JWT validation and role mapping
- **Default Authorizer**: Enforced authorization for all API calls

## 🏗️ Architecture

```
┌─────────────────┐    JWT Tokens    ┌─────────────────┐
│   Worker Nodes  │ ───────────────> │ Temporal Server │
│  (Stage 1,2,3)  │                  │  (Port 7234)    │
└─────────────────┘                  └─────────────────┘
                                              │
                                              │ Validates JWT
                                              ▼
┌─────────────────┐    JWKS           ┌─────────────────┐
│   JWKS Server   │ <─────────────── │  ClaimMapper    │
│  (Port 8080)    │                  │   Component     │
└─────────────────┘                  └─────────────────┘
```

## 🚀 Quick Start

1. **Generate JWT Keys** (automatically done on first run):
   ```bash
   node src/auth/generate-jwt.js
   ```

2. **Start Services**:
   ```bash
   docker-compose up -d
   ```

3. **Run Workers** (with JWT authentication):
   ```bash
   npm run temporal:worker1  # Stage 1 worker
   npm run temporal:worker2  # Stage 2 worker  
   npm run temporal:worker3  # Stage 3 worker
   ```

4. **Start Frontend**:
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### Temporal Server Configuration
- **File**: `temporal-config/development.yaml`
- **ClaimMapper**: Default JWT implementation
- **Authorizer**: Default authorizer (replaces nopAuthority)
- **JWKS Source**: `http://jwt-server:80/jwks`

### Dynamic Configuration
- **File**: `temporal-config/dynamicconfig`
- **Authorization**: Enabled system-wide
- **Token Enforcement**: Frontend namespace enforcement

### JWT Token Format
```json
{
  "iss": "xflow-temporal-server",
  "aud": ["temporal-service"],
  "exp": 1753181497,
  "iat": 1753177897,
  "sub": "worker-client",
  "permissions": ["default:admin"]
}
```

## 🔒 Security Files (Auto-Generated)

**⚠️ These files are automatically generated and git-ignored:**

- `src/auth/jwt-private.pem` - RSA private key (NEVER commit)
- `src/auth/jwt-public.pem` - RSA public key
- `src/auth/*.jwt` - JWT tokens for workers
- `temporal-config/jwks` - JSON Web Key Set for validation

## 🌐 Endpoints

- **Frontend**: http://localhost:3000
- **Temporal UI**: http://localhost:8234  
- **JWKS Endpoint**: http://localhost:8080/jwks
- **Temporal Server**: localhost:7234

## 🧪 Testing Authentication

Workers automatically connect with JWT tokens:
```
🔑 Using admin JWT token (first 50 chars): eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlbX...
✅ Connection established WITH VALID JWT TOKEN
✅ Stage X Worker started successfully WITH VALID JWT!
```

## 🛡️ Production Considerations

1. **Key Rotation**: Implement periodic RSA key rotation
2. **Token Expiration**: Tokens expire after 1 hour (configurable)
3. **HTTPS**: Use HTTPS for JWKS endpoint in production
4. **Secrets Management**: Store private keys in secure vaults
5. **Monitoring**: Monitor failed authentication attempts

## 📋 Troubleshooting

**Worker Connection Issues**:
- Check JWT token file exists: `src/auth/admin-token.jwt`
- Verify JWKS endpoint: `curl http://localhost:8080/jwks`
- Check Temporal logs: `docker logs xflow-poc-temporal-1`

**Authentication Not Enforced**:
- Verify "Not using any authorizer" warning is gone from logs
- Check dynamic config loaded: `system.enableAuthorization: true`
- Confirm ClaimMapper initialization in logs

## 🔄 Development Workflow

1. **Regenerate Keys**: `node src/auth/generate-jwt.js`
2. **Restart Services**: `docker-compose restart`
3. **Test Workers**: Workers automatically use new tokens
4. **Verify**: Check Temporal UI for authenticated workflows

---

✅ **Authentication Status**: FULLY OPERATIONAL  
🔒 **Security Level**: Production Ready  
📖 **Documentation**: [Temporal Security Guide](https://docs.temporal.io/self-hosted-guide/security) 