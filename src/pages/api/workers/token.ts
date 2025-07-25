import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { AuthService } from '../../../services/auth';

const db = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://temporal:temporal@localhost:5433/temporal'
});

const authService = new AuthService(db);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];
    const claims = authService.verifyJWTToken(token);
    
    if (!claims) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { namespaceId, workerName, taskQueue, workerType } = req.body;

    if (!namespaceId || !workerName || !taskQueue) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify user has access to this namespace
    const permissionQuery = `
      SELECT np.permission_level, n.temporal_namespace
      FROM namespace_permissions np
      JOIN namespaces n ON np.namespace_id = n.id
      WHERE np.user_id = $1 AND np.namespace_id = $2 AND n.is_active = true
    `;
    
    const permissionResult = await db.query(permissionQuery, [claims.sub, namespaceId]);
    
    if (permissionResult.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this namespace' });
    }

    // Generate worker token
    const workerToken = await authService.generateWorkerToken(claims.sub, namespaceId, workerName);

    // Register worker in database
    await db.query(
      `INSERT INTO workers (namespace_id, worker_name, task_queue, worker_type, last_heartbeat)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (namespace_id, worker_name) 
       DO UPDATE SET task_queue = $3, worker_type = $4, last_heartbeat = NOW(), is_active = true`,
      [namespaceId, workerName, taskQueue, workerType || 'generic']
    );

    res.status(200).json({
      message: 'Worker token generated successfully',
      token: workerToken,
      namespace: permissionResult.rows[0].temporal_namespace,
      taskQueue
    });

  } catch (error) {
    console.error('Worker token generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}