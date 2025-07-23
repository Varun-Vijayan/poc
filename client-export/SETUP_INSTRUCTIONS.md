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
