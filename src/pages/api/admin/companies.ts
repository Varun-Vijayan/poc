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
    // Verify JWT token
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
        return await createCompany(req, res, claims);
      case 'GET':
        return await getCompanies(req, res, claims);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Companies API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function createCompany(req: any, res: any, claims: any) {
  // Only platform admins can create companies
  if (!claims.permissions.includes('system:company:create')) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const { name, slug, adminEmail, adminPassword, adminFirstName, adminLastName } = req.body;

  if (!name || !slug || !adminEmail || !adminPassword) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const client = await db.connect();
  
  try {
    await client.query('BEGIN');

    // Create company
    const companyResult = await client.query(
      'INSERT INTO companies (name, slug) VALUES ($1, $2) RETURNING id',
      [name, slug]
    );
    const companyId = companyResult.rows[0].id;

    // Create default namespaces
    const namespaces = [
      { name: 'production', temporal_namespace: `${slug}-production` },
      { name: 'development', temporal_namespace: `${slug}-development` }
    ];

    const namespaceIds = [];
    for (const ns of namespaces) {
      const nsResult = await client.query(
        'INSERT INTO namespaces (company_id, name, temporal_namespace) VALUES ($1, $2, $3) RETURNING id',
        [companyId, ns.name, ns.temporal_namespace]
      );
      namespaceIds.push(nsResult.rows[0].id);
    }

    // Create admin user
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const userResult = await client.query(
      'INSERT INTO users (company_id, email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [companyId, adminEmail, passwordHash, adminFirstName, adminLastName, 'admin']
    );
    const userId = userResult.rows[0].id;

    // Grant admin permissions to all company namespaces
    for (const namespaceId of namespaceIds) {
      await client.query(
        'INSERT INTO namespace_permissions (user_id, namespace_id, permission_level) VALUES ($1, $2, $3)',
        [userId, namespaceId, 'admin']
      );
    }

    await client.query('COMMIT');

    // Create Temporal namespaces via gRPC
    await createTemporalNamespaces(namespaces.map(ns => ns.temporal_namespace));

    res.status(201).json({
      message: 'Company created successfully',
      companyId,
      namespaces: namespaces.map(ns => ns.temporal_namespace)
    });

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getCompanies(req: any, res: any, claims: any) {
  // Users can only see their own company unless they're platform admin
  let query = `
    SELECT c.id, c.name, c.slug, c.subscription_tier, c.created_at,
           COUNT(n.id) as namespace_count,
           COUNT(u.id) as user_count
    FROM companies c
    LEFT JOIN namespaces n ON c.id = n.company_id AND n.is_active = true
    LEFT JOIN users u ON c.id = u.company_id AND u.is_active = true
    WHERE c.is_active = true
  `;

  const params = [];
  if (!claims.permissions.includes('system:company:list')) {
    query += ' AND c.id = $1';
    params.push(claims.company_id);
  }

  query += ' GROUP BY c.id, c.name, c.slug, c.subscription_tier, c.created_at ORDER BY c.created_at DESC';

  const result = await db.query(query, params);
  
  res.status(200).json({
    companies: result.rows
  });
}

// Helper function to create Temporal namespaces
async function createTemporalNamespaces(namespaceNames: string[]) {
  // This would use existing createNamespaceViaGRPC function
  console.log('Creating Temporal namespaces:', namespaceNames);
} 