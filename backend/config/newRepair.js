// NewRepair Production Configuration
export const NEW_REPAIR_CONFIG = {
  // Field Length Limits
  MAX_DEVICE_BRAND_LENGTH: 50,
  MAX_DEVICE_MODEL_LENGTH: 100,
  MAX_SERIAL_NUMBER_LENGTH: 50,
  MAX_IMEI_LENGTH: 20,
  MAX_ISSUE_LENGTH: 1000,
  MAX_DIAGNOSIS_LENGTH: 500,
  MAX_EMAIL_LENGTH: 254,
  
  // Cost and Time Limits
  MIN_ESTIMATED_COST: 1,
  MAX_ESTIMATED_COST: 100000,
  MIN_ESTIMATED_DAYS: 1,
  MAX_ESTIMATED_DAYS: 365,
  
  // Phone Number Validation
  PHONE_NUMBER_LENGTH: 10,
  
  // Request Timeouts and Retry Settings
  REQUEST_TIMEOUT_MS: 30000,
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 2000,
  EXPONENTIAL_BACKOFF: true,
  
  // Rate Limiting
  RATE_LIMIT: {
    MAX_SUBMISSIONS_PER_MINUTE: 5,
    MAX_SUBMISSIONS_PER_HOUR: 50,
    WINDOW_MS: 60000, // 1 minute
  },
  
  // Validation Messages
  VALIDATION_MESSAGES: {
    CUSTOMER_REQUIRED: "Please select a customer for this repair",
    STORE_REQUIRED: "Please select a store to create the repair ticket",
    DEVICE_BRAND_REQUIRED: "Device brand is required",
    DEVICE_MODEL_REQUIRED: "Device model is required",
    ISSUE_REQUIRED: "Please describe the issue with the device",
    ESTIMATED_COST_REQUIRED: "Please provide a valid estimated cost between ₹1 and ₹100,000",
    TECHNICIAN_REQUIRED: "Please assign a technician to this repair",
    NOTIFICATION_CONSENT_REQUIRED: "Please check the box to send notifications about repair progress",
    INVALID_PHONE: "WhatsApp number must be exactly 10 digits",
    INVALID_EMAIL: "Please enter a valid email address",
    DEVICE_BRAND_TOO_LONG: "Device brand must be 50 characters or less",
    DEVICE_MODEL_TOO_LONG: "Device model must be 100 characters or less",
    SERIAL_NUMBER_TOO_LONG: "Serial number must be 50 characters or less",
    IMEI_TOO_LONG: "IMEI must be 20 characters or less",
    ISSUE_TOO_LONG: "Issue description must be 1000 characters or less",
    DIAGNOSIS_TOO_LONG: "Diagnosis must be 500 characters or less",
    EMAIL_TOO_LONG: "Email must be 254 characters or less",
    ESTIMATED_DAYS_INVALID: "Estimated days must be between 1 and 365",
    RAPID_SUBMISSION: "Please wait before submitting again",
  },
  
  // Error Messages
  ERROR_MESSAGES: {
    SUBMISSION_FAILED: "Failed to create repair ticket. Please try again.",
    NETWORK_ERROR: "Network error. Please check your connection and try again.",
    SERVER_ERROR: "Server error. Please try again later.",
    TIMEOUT_ERROR: "Request timed out. Please try again.",
    ENGINEERS_LOAD_FAILED: "Failed to load technicians. Please refresh the page.",
    ENGINEERS_TIMEOUT: "Request timed out. Please try again.",
    ENGINEERS_NETWORK_ERROR: "Network error. Please check your connection.",
  },
  
  // Error Codes
  ERROR_CODES: {
    NETWORK_ERROR: "NETWORK_ERROR",
    TIMEOUT_ERROR: "TIMEOUT_ERROR",
    VALIDATION_ERROR: "VALIDATION_ERROR",
    SERVER_ERROR: "SERVER_ERROR",
    RATE_LIMIT_ERROR: "RATE_LIMIT_ERROR",
    UNKNOWN_ERROR: "UNKNOWN_ERROR",
  },
  
  // Logging Configuration
  LOG_LEVELS: {
    DEBUG: "debug",
    INFO: "info",
    WARN: "warn",
    ERROR: "error",
  },
  
  // Performance Monitoring
  ENABLE_PERFORMANCE_MONITORING: true,
  SLOW_SUBMISSION_THRESHOLD_MS: 5000,
  SLOW_ENGINEERS_LOAD_THRESHOLD_MS: 3000,
  
  // Security Settings
  SANITIZE_INPUT: true,
  REMOVE_SCRIPT_TAGS: true,
  MAX_FILE_SIZE: 1024 * 1024, // 1MB
  ALLOWED_FILE_TYPES: ['.jpg', '.jpeg', '.png', '.pdf'],
  
  // Notification Settings
  ENABLE_WHATSAPP_NOTIFICATIONS: true,
  ENABLE_EMAIL_NOTIFICATIONS: true,
  NOTIFICATION_TEMPLATES: {
    WHATSAPP: {
      REPAIR_CREATED: "🔧 Repair Ticket Created\n\nCustomer: {customerName}\nDevice: {deviceInfo}\nIssue: {issue}\nEstimated Cost: ₹{estimatedCost}\nEstimated Days: {estimatedDays}\n\nWe'll keep you updated on the repair progress.",
      REPAIR_UPDATED: "🔧 Repair Status Updated\n\nTicket: {ticketNumber}\nStatus: {status}\nUpdated: {updatedAt}\n\nThank you for choosing our service.",
    },
    EMAIL: {
      REPAIR_CREATED_SUBJECT: "Repair Ticket Created - {ticketNumber}",
      REPAIR_UPDATED_SUBJECT: "Repair Status Updated - {ticketNumber}",
    },
  },
  
  // Form Auto-save (Future Feature)
  AUTO_SAVE_ENABLED: false,
  AUTO_SAVE_INTERVAL_MS: 30000, // 30 seconds
  
  // Accessibility
  ENABLE_SCREEN_READER_SUPPORT: true,
  ENABLE_KEYBOARD_NAVIGATION: true,
  ENABLE_HIGH_CONTRAST_MODE: false,
  
  // Analytics and Tracking
  ENABLE_ANALYTICS: true,
  TRACK_FORM_ABANDONMENT: true,
  TRACK_VALIDATION_ERRORS: true,
  TRACK_SUBMISSION_SUCCESS_RATE: true,
};

// Helper Functions
export const validateRepairData = (data) => {
  const errors = {};
  
  // Required field validations
  if (!data.customer) {
    errors.customer = NEW_REPAIR_CONFIG.VALIDATION_MESSAGES.CUSTOMER_REQUIRED;
  }
  
  if (!data.brand?.trim()) {
    errors.brand = NEW_REPAIR_CONFIG.VALIDATION_MESSAGES.DEVICE_BRAND_REQUIRED;
  } else if (data.brand.length > NEW_REPAIR_CONFIG.MAX_DEVICE_BRAND_LENGTH) {
    errors.brand = NEW_REPAIR_CONFIG.VALIDATION_MESSAGES.DEVICE_BRAND_TOO_LONG;
  }
  
  if (!data.model?.trim()) {
    errors.model = NEW_REPAIR_CONFIG.VALIDATION_MESSAGES.DEVICE_MODEL_REQUIRED;
  } else if (data.model.length > NEW_REPAIR_CONFIG.MAX_DEVICE_MODEL_LENGTH) {
    errors.model = NEW_REPAIR_CONFIG.VALIDATION_MESSAGES.DEVICE_MODEL_TOO_LONG;
  }
  
  if (!data.issueDescription?.trim()) {
    errors.issueDescription = NEW_REPAIR_CONFIG.VALIDATION_MESSAGES.ISSUE_REQUIRED;
  } else if (data.issueDescription.length > NEW_REPAIR_CONFIG.MAX_ISSUE_LENGTH) {
    errors.issueDescription = NEW_REPAIR_CONFIG.VALIDATION_MESSAGES.ISSUE_TOO_LONG;
  }
  
  if (!data.repairCost || data.repairCost < NEW_REPAIR_CONFIG.MIN_ESTIMATED_COST || data.repairCost > NEW_REPAIR_CONFIG.MAX_ESTIMATED_COST) {
    errors.repairCost = NEW_REPAIR_CONFIG.VALIDATION_MESSAGES.ESTIMATED_COST_REQUIRED;
  }
  
  if (!data.technician?.trim()) {
    errors.technician = NEW_REPAIR_CONFIG.VALIDATION_MESSAGES.TECHNICIAN_REQUIRED;
  }
  
  // Optional field validations
  if (data.serialNumber && data.serialNumber.length > NEW_REPAIR_CONFIG.MAX_SERIAL_NUMBER_LENGTH) {
    errors.serialNumber = NEW_REPAIR_CONFIG.VALIDATION_MESSAGES.SERIAL_NUMBER_TOO_LONG;
  }
  
  if (data.imei && data.imei.length > NEW_REPAIR_CONFIG.MAX_IMEI_LENGTH) {
    errors.imei = NEW_REPAIR_CONFIG.VALIDATION_MESSAGES.IMEI_TOO_LONG;
  }
  
  if (data.diagnosis && data.diagnosis.length > NEW_REPAIR_CONFIG.MAX_DIAGNOSIS_LENGTH) {
    errors.diagnosis = NEW_REPAIR_CONFIG.VALIDATION_MESSAGES.DIAGNOSIS_TOO_LONG;
  }
  
  return errors;
};

export const sanitizeRepairData = (data) => {
  const sanitized = { ...data };
  
  // Remove script tags and HTML
  if (NEW_REPAIR_CONFIG.SANITIZE_INPUT) {
    const removeHtml = (str) => str?.replace(/<[^>]*>/g, '')?.trim();
    
    sanitized.brand = removeHtml(sanitized.brand);
    sanitized.model = removeHtml(sanitized.model);
    sanitized.serialNumber = removeHtml(sanitized.serialNumber);
    sanitized.imei = removeHtml(sanitized.imei);
    sanitized.issueDescription = removeHtml(sanitized.issueDescription);
    sanitized.diagnosis = removeHtml(sanitized.diagnosis);
  }
  
  return sanitized;
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const validatePhoneNumber = (phone) => {
  if (!phone?.trim()) return true; // Optional field
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length === NEW_REPAIR_CONFIG.PHONE_NUMBER_LENGTH;
};

export const validateEmail = (email) => {
  if (!email?.trim()) return true; // Optional field
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Performance monitoring
export const logPerformance = (operation, duration, success = true) => {
  if (!NEW_REPAIR_CONFIG.ENABLE_PERFORMANCE_MONITORING) return;
  
  const logData = {
    operation,
    duration,
    success,
    timestamp: new Date().toISOString(),
    threshold: operation === 'submission' ? NEW_REPAIR_CONFIG.SLOW_SUBMISSION_THRESHOLD_MS : NEW_REPAIR_CONFIG.SLOW_ENGINEERS_LOAD_THRESHOLD_MS,
  };
  
  if (duration > logData.threshold) {
    console.warn(`Slow ${operation}: ${duration}ms`, logData);
  } else {
    console.log(`${operation} completed in ${duration}ms`, logData);
  }
};

// Rate limiting helper
export const checkRateLimit = (userId, submissions) => {
  const now = Date.now();
  const windowStart = now - NEW_REPAIR_CONFIG.RATE_LIMIT.WINDOW_MS;
  
  const recentSubmissions = submissions.filter(
    sub => sub.userId === userId && sub.timestamp > windowStart
  );
  
  return recentSubmissions.length < NEW_REPAIR_CONFIG.RATE_LIMIT.MAX_SUBMISSIONS_PER_MINUTE;
}; 