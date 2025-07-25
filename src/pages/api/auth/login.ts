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
    console.log('Login attempt:', req.body);

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await authService.authenticateUser(email, password);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = await authService.generateJWTToken(user);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        company_slug: user.company_slug
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
} 