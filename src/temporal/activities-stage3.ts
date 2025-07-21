import sgMail = require('@sendgrid/mail');
import { PredefinedFunctions } from '../types/workflow';

// Initialize SendGrid (you'll need to set the API key via environment variable)
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Stage 3 Activities (Notifications & Finalization)
export async function executeStage3Activity(functionName: PredefinedFunctions, params: Record<string, any>): Promise<any> {
  console.log(`[WORKER-3] Executing ${functionName} with params:`, params);
  
  switch (functionName) {
    case PredefinedFunctions.SEND_EMAIL_NOTIFICATION:
      return sendEmailNotification(params as { email: string, subject?: string, content?: string });
    
    // case PredefinedFunctions.LOG_EVENT:
    //   return logEvent(params as { event: string, data?: Record<string, any>, level?: 'info' | 'warn' | 'error' });
    
    default:
      throw new Error(`Worker 3 cannot handle function: ${functionName}`);
  }
}

async function sendEmailNotification(params: { email: string, subject?: string, content?: string }): Promise<{ success: boolean, messageId?: string }> {
  const { email, subject = 'Workflow Notification', content = 'Your workflow has completed successfully.' } = params;
  
  console.log('[WORKER-3] === EMAIL NOTIFICATION ATTEMPT ===');
  console.log('[WORKER-3] Email params:', { email, subject, content });
  console.log('[WORKER-3] SENDGRID_API_KEY present:', !!process.env.SENDGRID_API_KEY);
  console.log('[WORKER-3] SENDGRID_FROM_EMAIL:', process.env.SENDGRID_FROM_EMAIL);
  
  try {
    if (!process.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY === 'your_sendgrid_api_key_here') {
      console.log('[WORKER-3] ⚠️  Using mock email (no valid SendGrid API key)');
      console.log(`[WORKER-3] Mock email sent to ${email}: ${subject}`);
      return { success: true, messageId: 'mock-id-' + Date.now() };
    }
    
    console.log('[WORKER-3] 🚀 Attempting to send real email via SendGrid...');
    
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@xflow.com',
      subject,
      text: content,
      html: `<p>${content}</p>`
    };
    
    console.log('[WORKER-3] SendGrid message object:', msg);
    
    const response = await sgMail.send(msg);
    console.log('[WORKER-3] ✅ Email sent successfully!', response[0].statusCode);
    return { success: true, messageId: response[0].headers['x-message-id'] };
  } catch (error: any) {
    console.error('[WORKER-3] ❌ Email sending failed:', error);
    if (error.response) {
      console.error('[WORKER-3] SendGrid response:', error.response.body);
    }
    throw new Error(`Failed to send email: ${error}`);
  }
}

// async function logEvent(params: { event: string, data?: Record<string, any>, level?: 'info' | 'warn' | 'error' }): Promise<{ logged: boolean }> {
//   const { event, data = {}, level = 'info' } = params;
  
//   const logEntry = {
//     timestamp: new Date().toISOString(),
//     level,
//     event,
//     data
//   };
  
//   console.log(`[WORKER-3][${level.toUpperCase()}] Event: ${event}`, logEntry);
  
//   return { logged: true };
// } 