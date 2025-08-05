// Daily Sales Configuration for Production
export const DAILY_SALES_CONFIG = {
  // Query limits
  MAX_RESULTS_PER_QUERY: 1000,
  DEFAULT_RESULTS_LIMIT: 1000,
  
  // Date validation
  MAX_DAYS_IN_PAST: 365, // 1 year
  MAX_DAYS_IN_FUTURE: 1, // Allow today + 1 day for timezone differences
  
  // Cache settings
  CACHE_DURATION_SECONDS: 300, // 5 minutes
  CACHE_HEADERS: {
    'Cache-Control': 'private, max-age=300',
    'X-Data-Source': 'database'
  },
  
  // Request timeouts
  REQUEST_TIMEOUT_MS: 30000, // 30 seconds
  FETCH_TIMEOUT_MS: 25000,   // 25 seconds (slightly less than request timeout)
  
  // Retry settings
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 2000,
  EXPONENTIAL_BACKOFF: true,
  
  // Error messages
  ERROR_MESSAGES: {
    INVALID_DATE: 'Date must be in ISO format (YYYY-MM-DD)',
    DATE_TOO_OLD: 'Date must be within the last year',
    DATE_IN_FUTURE: 'Date cannot be in the future',
    INVALID_STORE_ID: 'Invalid store ID format',
    INVALID_LIMIT: 'Limit must be between 1 and 1000',
    TIMEOUT: 'Request timed out. Please try again.',
    NETWORK_ERROR: 'Network error. Please check your connection and try again.',
    SERVER_ERROR: 'Server error. Please try again later.',
    VALIDATION_ERROR: 'Validation error',
    CAST_ERROR: 'Invalid data format',
    INTERNAL_ERROR: 'Internal server error',
    UNKNOWN_ERROR: 'An unexpected error occurred'
  },
  
  // Logging
  LOG_LEVELS: {
    REQUEST: 'info',
    SUCCESS: 'info',
    ERROR: 'error',
    VALIDATION: 'warn'
  },
  
  // Performance monitoring
  ENABLE_PERFORMANCE_MONITORING: true,
  SLOW_QUERY_THRESHOLD_MS: 1000, // Log queries taking longer than 1 second
  
  // Security
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100 // Max 100 requests per 15 minutes per IP
  },
  
  // Data sanitization
  SANITIZE_RESPONSE: true,
  REMOVE_SENSITIVE_FIELDS: ['__v', 'updatedAt'], // Fields to remove from response
  
  // Export settings
  EXPORT: {
    MAX_ROWS: 10000,
    ALLOWED_FORMATS: ['xlsx', 'csv'],
    INCLUDE_TIMESTAMP: true
  }
};

// Helper functions for configuration
export const getDateValidationRules = () => {
  const now = new Date();
  const maxPastDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const maxFutureDate = new Date(now.getTime() + DAILY_SALES_CONFIG.MAX_DAYS_IN_FUTURE * 24 * 60 * 60 * 1000);
  
  return {
    maxPastDate,
    maxFutureDate,
    isValidDate: (date) => {
      return date >= maxPastDate && date <= maxFutureDate;
    }
  };
};

export const getCacheHeaders = (date) => ({
  ...DAILY_SALES_CONFIG.CACHE_HEADERS,
  'X-Query-Date': date,
  'X-Cache-Timestamp': new Date().toISOString()
});

export const sanitizeResponse = (data) => {
  if (!DAILY_SALES_CONFIG.SANITIZE_RESPONSE) return data;
  
  const removeFields = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(removeFields);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        if (!DAILY_SALES_CONFIG.REMOVE_SENSITIVE_FIELDS.includes(key)) {
          sanitized[key] = removeFields(value);
        }
      }
      return sanitized;
    }
    
    return obj;
  };
  
  return removeFields(data);
};

export default DAILY_SALES_CONFIG; 