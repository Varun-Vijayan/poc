import { Connection, Client } from '@temporalio/client';
import * as fs from 'fs';

async function main() {
  const address = process.env.TEMPORAL_ADDRESS ?? 'localhost:7233';

  const jwt = fs.readFileSync('./src/auth/admin-token.jwt', 'utf8').trim();
  const tls = {
    serverRootCACertificate: fs.readFileSync('./certs/ca.pem'),
    clientCertPair: {
      crt: fs.readFileSync('./certs/worker-client.pem'),
      key: fs.readFileSync('./certs/worker-client-key.pem'),
    },
  } as const;

  const connection = await Connection.connect({
    address,
    tls,
    metadata: { authorization: `Bearer ${jwt}` },
  });

  const client = new Client({ connection });

  await client.workflowService.registerNamespace({
    namespace: 'default',
    description: 'Default namespace for X Flow workflows',
    workflowExecutionRetentionPeriod: { seconds: 7 * 24 * 60 * 60, nanos: 0 },
  });

  console.log('Default namespace created successfully!');
  process.exit(0);
}

main().catch((err) => {
  const msg = String(err?.message ?? err);
  if (msg.includes('AlreadyExists')) {
    console.log('Default namespace already exists');
    process.exit(0);
  }
  console.error(err);
  process.exit(1);
});
