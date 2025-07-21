import axios from 'axios';
import { PredefinedFunctions } from '../types/workflow';

// Stage 2 Activities (Processing & External Calls)
export async function executeStage2Activity(functionName: PredefinedFunctions, params: Record<string, any>): Promise<any> {
  console.log(`[WORKER-2] Executing ${functionName} with params:`, params);
  
  switch (functionName) {
    case PredefinedFunctions.CREATE_USER_ACCOUNT:
      return createUserAccount(params as { email: string, name: string, role?: string });
    
    case PredefinedFunctions.HTTP_REQUEST:
      return httpRequest(params as { url: string, method?: 'GET' | 'POST' | 'PUT' | 'DELETE', headers?: Record<string, string>, data?: any });
    
    case PredefinedFunctions.DELAY:
      return delay(params as { seconds: number });
    
    default:
      throw new Error(`Worker 2 cannot handle function: ${functionName}`);
  }
}

async function createUserAccount(params: { email: string, name: string, role?: string }): Promise<{ userId: string, created: boolean }> {
  const { email, name, role = 'user' } = params;
  
  // Simulate user creation (in real implementation, this would interact with your database)
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate async operation
  
  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[WORKER-2] Created user account: ${userId} for ${name} (${email}) with role ${role}`);
  
  return {
    userId,
    created: true
  };
}

async function delay(params: { seconds: number }): Promise<{ delayed: boolean, duration: number }> {
  const { seconds } = params;
  
  if (seconds <= 0) {
    throw new Error('Delay seconds must be greater than 0');
  }
  
  console.log(`[WORKER-2] Delaying for ${seconds} seconds...`);
  await new Promise(resolve => setTimeout(resolve, seconds * 1000));
  
  return { delayed: true, duration: seconds };
}

async function httpRequest(params: { 
  url: string, 
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE', 
  headers?: Record<string, string>,
  data?: any 
}): Promise<{ success: boolean, status: number, data: any }> {
  const { url, method = 'GET', headers = {}, data } = params;
  
  try {
    console.log(`[WORKER-2] Making ${method} request to ${url}`);
    const response = await axios({
      url,
      method,
      headers,
      data,
      timeout: 30000 // 30 second timeout
    });
    
    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error: any) {
    console.error('[WORKER-2] HTTP request failed:', error);
    
    if (error.response) {
      return {
        success: false,
        status: error.response.status,
        data: error.response.data
      };
    }
    
    throw new Error(`HTTP request failed: ${error.message}`);
  }
} 