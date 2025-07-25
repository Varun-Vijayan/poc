import jwt from 'jsonwebtoken';
import * as fs from 'fs';

export class AuthService {
  private static privateKey = fs.readFileSync('./src/auth/private-key.pem', 'utf8');

  static generateWorkerToken(
    userId: string,
    companySlug: string,
    namespace: string,
    permissions: string[]
  ): string {
    const payload = {
      iss: 'xflow-platform',
      aud: ['temporal-frontend'],
      sub: userId,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
      permissions: permissions.map(p => `${namespace}:${p}`) // Format: namespace:permission
    };

    return jwt.sign(payload, this.privateKey, {
      algorithm: 'RS256',
      keyid: 'xflow-platform-key'
    });
  }

  static generateCompanyTokens(companySlug: string, userId: string) {
    return {
      // Admin token - full access to all company namespaces
      adminToken: this.generateWorkerToken(
        userId,
        companySlug,
        `${companySlug}-production`,
        ['read', 'write', 'admin']
      ),
      
      // Worker token - can only execute tasks
      workerToken: this.generateWorkerToken(
        userId,
        companySlug,
        `${companySlug}-production`,
        ['worker']
      ),
      
      // Read-only token - monitoring/observability
      readToken: this.generateWorkerToken(
        userId,
        companySlug,
        `${companySlug}-production`,
        ['read']
      )
    };
  }
} 
