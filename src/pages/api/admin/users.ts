import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { AuthService } from '../../../services/auth';
import bcrypt from 'bcrypt';

const db = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://temporal:temporal@localhost:5433/temporal'
});

const authService = new AuthService(db);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    switch (req.method) {
      case 'POST':
        return await createUser(req, res, claims);
      case 'GET':
        return await getUsers(req, res, claims);
      case 'PUT':
        return await updateUser(req, res, claims);
      case 'DELETE':
        return await deleteUser(req, res, claims);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Users API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function createUser(req: any, res: any, claims: any) {
  // Only admins can create users in their company
  if (claims.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create users' });
  }

  const { email, password, firstName, lastName, role, namespacePermissions } = req.body;

  if (!email || !password || !firstName || !lastName || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const client = await db.connect();
  
  try {
    await client.query('BEGIN');

    // Create user
    const passwordHash = await bcrypt.hash(password, 10);
    const userResult = await client.query(
      'INSERT INTO users (company_id, email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [claims.company_id, email, passwordHash, firstName, lastName, role]
    );
    const userId = userResult.rows[0].id;

    // Add namespace permissions
    if (namespacePermissions && Array.isArray(namespacePermissions)) {
      for (const perm of namespacePermissions) {
        await client.query(
          'INSERT INTO namespace_permissions (user_id, namespace_id, permission_level) VALUES ($1, $2, $3)',
          [userId, perm.namespace_id, perm.permission_level]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'User created successfully',
      userId
    });

  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Email already exists' });
    }
    throw error;
  } finally {
    client.release();
  }
}

async function getUsers(req: any, res: any, claims: any) {
  // Users can only see users in their own company
  const query = `
    SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, u.created_at,
           JSON_AGG(
             JSON_BUILD_OBJECT(
               'namespace_id', np.namespace_id,
               'namespace_name', n.name,
               'temporal_namespace', n.temporal_namespace,
               'permission_level', np.permission_level
             )
           ) FILTER (WHERE np.id IS NOT NULL) as namespace_permissions
    FROM users u
    LEFT JOIN namespace_permissions np ON u.id = np.user_id
    LEFT JOIN namespaces n ON np.namespace_id = n.id AND n.is_active = true
    WHERE u.company_id = $1 AND u.is_active = true
    GROUP BY u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, u.created_at
    ORDER BY u.created_at DESC
  `;

  const result = await db.query(query, [claims.company_id]);
  
  res.status(200).json({
    users: result.rows
  });
}