require('dotenv').config({ path: '.env.local' });
const sgMail = require('@sendgrid/mail');

console.log('=== EMAIL TEST ===');
console.log('SENDGRID_API_KEY present:', !!process.env.SENDGRID_API_KEY);
console.log('SENDGRID_FROM_EMAIL:', process.env.SENDGRID_FROM_EMAIL);

async function testEmail() {
  try {
    if (!process.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY === 'your_sendgrid_api_key_here') {
      console.log('⚠️  No valid SendGrid API key found');
      return;
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to: 'varunvijayan21@gmail.com',
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'Test Email from X Flow',
      text: 'This is a test email to verify SendGrid integration.',
      html: '<p>This is a test email to verify SendGrid integration.</p>'
    };

    console.log('🚀 Sending test email...');
    const response = await sgMail.send(msg);
    console.log('✅ Email sent successfully!', response[0].statusCode);
    console.log('Message ID:', response[0].headers['x-message-id']);
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    if (error.response) {
      console.error('SendGrid response:', error.response.body);
    }
  }
}

testEmail(); 