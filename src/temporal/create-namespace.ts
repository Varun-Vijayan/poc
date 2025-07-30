import { Connection, Client } from '@temporalio/client';

async function createNamespace() {
  try {
    const connection = await Connection.connect({
      address: 'localhost:7233',
    });

    const client = new Client({ connection });

    await client.workflowService.registerNamespace({
      namespace: 'default',
      description: 'Default namespace for X Flow workflows',
      workflowExecutionRetentionPeriod: {
        seconds: BigInt(7 * 24 * 60 * 60), // Use BigInt instead of number
        nanos: 0
      },
    });

    console.log('Default namespace created successfully!');
  } catch (error: any) {
    if (error.message?.includes('already exists') || error.message?.includes('AlreadyExists')) {
      console.log('Default namespace already exists');
    } else {
      console.error('Failed to create namespace:', error.message);
    }
  }
}

createNamespace().catch(console.error); 