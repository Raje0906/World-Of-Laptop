import dotenv from 'dotenv';
import https from 'https';

// Load environment variables
dotenv.config();

// Create a custom HTTPS agent with keepAlive
const httpsAgent = new https.Agent({
  keepAlive: true,
  timeout: 10000, // 10 seconds
  rejectUnauthorized: true
});

// Email notifications should be sent from the frontend using EmailJS, or use a backend-friendly provider here if needed.

// Configuration - these should be set in your .env file
const CONFIG = {
  // Main service IDs and template IDs
  SERVICE_ID: process.env.EMAILJS_SERVICE_ID || '',
  TEMPLATE_ID: process.env.EMAILJS_TEMPLATE_ID || '',
  COMPLETE_TEMPLATE_ID: process.env.EMAILJS_COMPLETE_TEMPLATE_ID || 'template_lmw75qc',
  USER_ID: process.env.EMAILJS_USER_ID || '',
  
  // Notify service configuration for update notifications
  NOTIFY_SERVICE_ID: process.env.EMAILJS_NOTIFY_SERVICEID || '',
  NOTIFY_TEMPLATE_ID: process.env.EMAILJS_NOTIFY_TEMPLATEID || '',
  NOTIFY_USER_ID: process.env.EMAILJS_NOTIFY_USERID || '',
};

// Log the configuration (with sensitive values masked)
console.log('Email Service - Configuration loaded:', {
  hasMainConfig: !!(CONFIG.USER_ID && CONFIG.SERVICE_ID && CONFIG.TEMPLATE_ID),
  hasNotifyConfig: !!(CONFIG.NOTIFY_USER_ID && CONFIG.NOTIFY_SERVICE_ID && CONFIG.NOTIFY_TEMPLATE_ID)
});

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates email parameters before sending
 */
function validateEmailParams(params) {
  if (!params.to_email) {
    return { valid: false, error: 'Recipient email is required' };
  }
  
  if (!EMAIL_REGEX.test(params.to_email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  // Ensure required fields have values
  const requiredFields = ['user_name', 'device_name', 'issue_description', 'repair_id'];
  for (const field of requiredFields) {
    if (!params[field]) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }
  
  return { valid: true };
}

/**
 * Email service for sending notifications using EmailJS
 */
const emailService = {
  /**
   * Send a standard email using the default template
   */
  async sendEmail(templateParams, isUpdateNotification = false) {
    // For update notifications, use the notify configuration
    const config = isUpdateNotification 
      ? {
          serviceId: CONFIG.NOTIFY_SERVICE_ID,
          templateId: CONFIG.NOTIFY_TEMPLATE_ID,
          userId: CONFIG.NOTIFY_USER_ID
        }
      : {
          serviceId: CONFIG.SERVICE_ID,
          templateId: CONFIG.TEMPLATE_ID,
          userId: CONFIG.USER_ID
        };

    // Validate required fields
    if (!config.serviceId || !config.templateId || !config.userId) {
      const missing = [];
      if (!config.serviceId) missing.push('serviceId');
      if (!config.templateId) missing.push('templateId');
      if (!config.userId) missing.push('userId');
      throw new Error(`EmailJS configuration is missing required fields: ${missing.join(', ')}`);
    }
    
    if (!templateParams.to_email) {
      throw new Error('Recipient email (to_email) is required in template parameters');
    }
    
    // Log the request details (masking sensitive values)
    console.log('Email Service - Sending email with config:', {
      serviceId: config.serviceId ? '***' : 'MISSING',
      templateId: config.templateId ? '***' : 'MISSING',
      userId: config.userId ? '***' : 'MISSING',
      to_email: templateParams.to_email || 'MISSING',
      isUpdateNotification,
      hasTemplateParams: Object.keys(templateParams).length > 0
    });
    
    // Log template parameters (keys only for security)
    console.log('Email Service - Template params keys:', Object.keys(templateParams));
    
    // Email notifications should be sent from the frontend using EmailJS, or use a backend-friendly provider here if needed.
    // For now, we'll just return a placeholder success response.
    console.log('Email Service - Email sending is currently disabled.');
      return { 
        success: true, 
      messageId: 'Email sending is currently disabled.',
      status: 200
    };
  },
  
  /**
   * Send a repair completion email
   */
  async sendCompletionEmail(templateParams) {
    if (!CONFIG.USER_ID || !CONFIG.SERVICE_ID || !CONFIG.COMPLETE_TEMPLATE_ID) {
      const error = 'EmailJS is not properly configured for completion emails. Missing required configuration.';
      console.error(error);
      throw new Error(error);
    }

    const validation = validateEmailParams(templateParams);
    if (!validation.valid) {
      console.error('Completion email validation failed:', validation.error);
      throw new Error(validation.error);
    }
    
    // Email notifications should be sent from the frontend using EmailJS, or use a backend-friendly provider here if needed.
    // For now, we'll just return a placeholder success response.
    console.log('Email Service - Completion email sending is currently disabled.');
      return { 
        success: true, 
      messageId: 'Completion email sending is currently disabled.',
      status: 200
      };
  },
  
  /**
   * Test the email service connection
   */
  async testConnection() {
    const testParams = {
      user_name: 'Test User',
      device_name: 'Test Device',
      issue_description: 'Test Issue',
      repair_id: 'TEST123',
      estimated_date: new Date().toISOString().split('T')[0],
      to_email: 'test@example.com',
    };
    
    try {
      const result = await this.sendEmail(testParams);
      return { 
        success: true, 
        message: 'Test email sent successfully',
        details: result 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message || 'Failed to send test email',
        details: error 
      };
    }
  },
  
  /**
   * Validate an email address format
   */
  isValidEmail(email) {
    return EMAIL_REGEX.test(email);
  }
};

export { emailService };