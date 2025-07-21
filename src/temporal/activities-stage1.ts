import { PredefinedFunctions } from '../types/workflow';

// Stage 1 Activities (Validation & Initial Processing)
export async function executeStage1Activity(functionName: PredefinedFunctions, params: Record<string, any>): Promise<any> {
  console.log(`[WORKER-1] Executing ${functionName} with params:`, params);
  
  switch (functionName) {
    case PredefinedFunctions.VALIDATE_USER_INPUT:
      return validateUserInput(params as { fields: string[], data?: Record<string, any> });
    
    case PredefinedFunctions.LOG_EVENT:
      return logEvent(params as { event: string, data?: Record<string, any>, level?: 'info' | 'warn' | 'error' });
    
    default:
      throw new Error(`Worker 1 cannot handle function: ${functionName}`);
  }
}

async function validateUserInput(params: { fields: string[], data?: Record<string, any> }): Promise<{ valid: boolean, errors?: string[] }> {
  const { fields, data = {} } = params;
  const errors: string[] = [];
  
  for (const field of fields) {
    if (!data[field] || data[field].toString().trim() === '') {
      errors.push(`Field '${field}' is required`);
    }
    
    // Basic email validation
    if (field === 'email' && data[field]) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data[field])) {
        errors.push(`Field '${field}' must be a valid email address`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

async function logEvent(params: { event: string, data?: Record<string, any>, level?: 'info' | 'warn' | 'error' }): Promise<{ logged: boolean }> {
  const { event, data = {}, level = 'info' } = params;
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    data
  };
  
  console.log(`[WORKER-1][${level.toUpperCase()}] Event: ${event}`, logEntry);
  
  return { logged: true };
} 