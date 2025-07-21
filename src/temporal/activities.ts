import sgMail = require('@sendgrid/mail');
import axios from 'axios';
import { PredefinedFunctions } from '../types/workflow';

// Initialize SendGrid (you'll need to set the API key via environment variable)
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export async function executeStageActivity(functionName: PredefinedFunctions, params: Record<string, any>): Promise<any> {
  console.log(`Executing ${functionName} with params:`, params);
  
  switch (functionName) {
    case PredefinedFunctions.VALIDATE_USER_INPUT:
      return validateUserInput(params as { fields: string[], data?: Record<string, any> });
    
    case PredefinedFunctions.SEND_EMAIL_NOTIFICATION:
      return sendEmailNotification(params as { email: string, subject?: string, content?: string });
    
    case PredefinedFunctions.CREATE_USER_ACCOUNT:
      return createUserAccount(params as { email: string, name: string, role?: string });
    
    case PredefinedFunctions.LOG_EVENT:
      return logEvent(params as { event: string, data?: Record<string, any>, level?: 'info' | 'warn' | 'error' });
    
    case PredefinedFunctions.DELAY:
      return delay(params as { seconds: number });
    
    case PredefinedFunctions.HTTP_REQUEST:
      return httpRequest(params as { url: string, method?: 'GET' | 'POST' | 'PUT' | 'DELETE', headers?: Record<string, string>, data?: any });
    
    default:
      throw new Error(`Unknown function: ${functionName}`);
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

async function sendEmailNotification(params: { email: string, subject?: string, content?: string }): Promise<{ success: boolean, messageId?: string }> {
  const { email, subject = 'Workflow Notification', content = 'Your workflow has completed successfully.' } = params;
  
  console.log('=== EMAIL NOTIFICATION ATTEMPT ===');
  console.log('Email params:', { email, subject, content });
  console.log('SENDGRID_API_KEY present:', !!process.env.SENDGRID_API_KEY);
  console.log('SENDGRID_FROM_EMAIL:', process.env.SENDGRID_FROM_EMAIL);
  
  try {
    if (!process.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY === 'your_sendgrid_api_key_here') {
      console.log('⚠️  Using mock email (no valid SendGrid API key)');
      console.log(`Mock email sent to ${email}: ${subject}`);
      return { success: true, messageId: 'mock-id-' + Date.now() };
    }
    
    console.log('🚀 Attempting to send real email via SendGrid...');
    
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@xflow.com',
      subject,
      text: content,
      html: `<p>${content}</p>`
    };
    
    console.log('SendGrid message object:', msg);
    
    const response = await sgMail.send(msg);
    console.log('✅ Email sent successfully!', response[0].statusCode);
    return { success: true, messageId: response[0].headers['x-message-id'] };
  } catch (error: any) {
    console.error('❌ Email sending failed:', error);
    if (error.response) {
      console.error('SendGrid response:', error.response.body);
    }
    throw new Error(`Failed to send email: ${error}`);
  }
}

async function createUserAccount(params: { email: string, name: string, role?: string }): Promise<{ userId: string, created: boolean }> {
  const { email, name, role = 'user' } = params;
  
  // Simulate user creation (in real implementation, this would interact with your database)
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate async operation
  
  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`Created user account: ${userId} for ${name} (${email}) with role ${role}`);
  
  return {
    userId,
    created: true
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
  
  console.log(`[${level.toUpperCase()}] Event: ${event}`, logEntry);
  
  return { logged: true };
}

async function delay(params: { seconds: number }): Promise<{ delayed: boolean, duration: number }> {
  const { seconds } = params;
  
  if (seconds <= 0) {
    throw new Error('Delay seconds must be greater than 0');
  }
  
  console.log(`Delaying for ${seconds} seconds...`);
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
    console.error('HTTP request failed:', error);
    
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