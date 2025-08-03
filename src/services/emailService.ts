// EmailJS Frontend Service
import emailjs from '@emailjs/browser';

// Configuration - these should be set in your .env file
const CONFIG = {
  // Main service IDs and template IDs
  SERVICE_ID: import.meta.env.VITE_EMAILJS_SERVICE_ID || '',
  TEMPLATE_ID: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '',
  COMPLETE_TEMPLATE_ID: import.meta.env.VITE_EMAILJS_COMPLETE_TEMPLATE_ID || 'template_lmw75qc',
  USER_ID: import.meta.env.VITE_EMAILJS_USER_ID || '',
  
  // Notify service configuration for update notifications
  NOTIFY_SERVICE_ID: import.meta.env.VITE_EMAILJS_NOTIFY_SERVICEID || '',
  NOTIFY_TEMPLATE_ID: import.meta.env.VITE_EMAILJS_NOTIFY_TEMPLATEID || '',
  NOTIFY_USER_ID: import.meta.env.VITE_EMAILJS_NOTIFY_USERID || '',
  
  // Get service ID - use notify service for updates, fallback to main service
  get serviceId() {
    return this.SERVICE_ID || '';
  },
  
  // Get template ID - use notify template for updates, fallback to main template
  get templateId() {
    return this.TEMPLATE_ID || '';
  },
  
  // Get user ID - use notify user ID for updates, fallback to main user ID
  get userId() {
    return this.USER_ID || '';
  },
  
  // Get notify service configuration
  get notifyConfig() {
    return {
      serviceId: this.NOTIFY_SERVICE_ID,
      templateId: this.NOTIFY_TEMPLATE_ID,
      userId: this.NOTIFY_USER_ID
    };
  }
};

// Initialize EmailJS
if (CONFIG.userId) {
  try {
    emailjs.init(CONFIG.userId);
  } catch (error) {
    console.error('Failed to initialize EmailJS:', error);
  }
} else {
  console.warn('EmailJS User ID is not set. Email functionality will be disabled.');
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EmailParams {
  user_name: string;
  device_name: string;
  issue_description: string;
  repair_id: string;
  estimated_date: string;
  to_email: string;
  [key: string]: any; // Allow additional properties
}

/**
 * Validates email parameters before sending
 */
function validateEmailParams(params: Record<string, any>): { valid: boolean; error?: string } {
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
 * Email service for sending notifications
 */
export const emailService = {
  /**
   * Send a standard email using the default template
   */
  /**
   * Send a standard email using the default template
   */
  async sendEmail(templateParams: EmailParams, isUpdateNotification = false) {
    console.log('Starting email send process...');
    console.log('Is update notification:', isUpdateNotification);
    
    // For update notifications, use the notify configuration
    const config = isUpdateNotification 
      ? CONFIG.notifyConfig 
      : {
          serviceId: CONFIG.serviceId,
          templateId: CONFIG.templateId,
          userId: CONFIG.userId
        };
        
    console.log('Using config:', {
      serviceId: config.serviceId ? '***' : 'MISSING',
      templateId: config.templateId ? '***' : 'MISSING',
      userId: config.userId ? '***' : 'MISSING'
    });

    if (!config.userId || !config.serviceId || !config.templateId) {
      const error = 'EmailJS is not properly configured. Missing required configuration.';
      console.error(error);
      throw new Error(error);
    }

    const validation = validateEmailParams(templateParams);
    if (!validation.valid) {
      console.error('Email validation failed:', validation.error);
      throw new Error(validation.error);
    }
    
    try {
      const templateId = templateParams.template_id || config.templateId;
      console.log('Sending email with params:', {
        serviceId: config.serviceId ? '***' : 'MISSING',
        templateId: templateId ? '***' : 'MISSING',
        toEmail: templateParams.to_email || 'MISSING',
        userId: config.userId ? '***' : 'MISSING'
      });
      
      const result = await emailjs.send(
        config.serviceId,
        templateId,
        templateParams,
        config.userId
      );
      
      console.log('Email sent successfully:', {
        status: result.status,
        text: result.text,
        statusText: result.statusText
      });
      return { 
        success: true, 
        messageId: result.text,
        status: result.status
      };
    } catch (error: any) {
      const errorMessage = error?.text || error?.message || 'Failed to send email';
      console.error('Failed to send email:', errorMessage, error);
      throw new Error(errorMessage);
    }
  },
  
  /**
   * Send a repair completion email
   */
  /**
   * Send a repair completion email
   */
  async sendCompletionEmail(templateParams: EmailParams) {
    if (!CONFIG.userId || !CONFIG.serviceId || !CONFIG.COMPLETE_TEMPLATE_ID) {
      const error = 'EmailJS is not properly configured for completion emails. Missing required configuration.';
      console.error(error);
      throw new Error(error);
    }

    const validation = validateEmailParams(templateParams);
    if (!validation.valid) {
      console.error('Completion email validation failed:', validation.error);
      throw new Error(validation.error);
    }
    
    try {
      const result = await emailjs.send(
        CONFIG.serviceId,
        CONFIG.COMPLETE_TEMPLATE_ID,
        templateParams,
        CONFIG.userId
      );
      
      console.log('Completion email sent successfully:', result.status, result.text);
      return { 
        success: true, 
        messageId: result.text,
        status: result.status
      };
    } catch (error: any) {
      const errorMessage = error?.text || error?.message || 'Failed to send completion email';
      console.error('Failed to send completion email:', errorMessage, error);
      throw new Error(errorMessage);
    }
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
    } catch (error: any) {
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
  isValidEmail(email: string): boolean {
    return EMAIL_REGEX.test(email);
  }
};