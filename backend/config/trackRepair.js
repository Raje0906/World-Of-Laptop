// TrackRepair Production Configuration
export const TRACK_REPAIR_CONFIG = {
  // Search Configuration
  SEARCH: {
    MAX_RESULTS: 50,
    DEBOUNCE_MS: 300,
    MIN_QUERY_LENGTH: 1,
    MAX_QUERY_LENGTH: 100,
    SEARCH_TYPES: ['ticket', 'phone', 'name'],
    DEFAULT_SEARCH_TYPE: 'ticket',
  },
  
  // API Configuration
  API: {
    REQUEST_TIMEOUT_MS: 15000,
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 1000,
    EXPONENTIAL_BACKOFF: true,
  },
  
  // Navigation Configuration
  NAVIGATION: {
    REFRESH_DELAY_MS: 500,
    RETURN_BUTTON_TEXT: "← Return to Repairs",
    DETAILS_ROUTE: "/repairs/details",
    TRACK_ROUTE: "/repairs/track",
  },
  
  // Error Messages
  ERROR_MESSAGES: {
    SEARCH_FAILED: "Failed to search repairs. Please try again.",
    NETWORK_ERROR: "Network error. Please check your connection and try again.",
    SERVER_ERROR: "Server error. Please try again later.",
    TIMEOUT_ERROR: "Request timed out. Please try again.",
    NO_RESULTS: "No repairs found matching your search criteria.",
    INVALID_TICKET: "Please enter a valid ticket number.",
    INVALID_PHONE: "Please enter a valid phone number.",
    INVALID_NAME: "Please enter a valid customer name.",
    REFRESH_FAILED: "Failed to refresh the page. Please try again.",
  },
  
  // Success Messages
  SUCCESS_MESSAGES: {
    SEARCH_SUCCESS: "Search completed successfully.",
    REFRESH_SUCCESS: "Page refreshed successfully.",
    UPDATE_SUCCESS: "Repair status updated successfully.",
    NOTIFICATION_SENT: "Notification sent successfully.",
  },
  
  // Validation Rules
  VALIDATION: {
    TICKET_NUMBER: {
      MIN_LENGTH: 1,
      MAX_LENGTH: 20,
      PATTERN: /^[A-Za-z0-9-_]+$/,
    },
    PHONE_NUMBER: {
      MIN_LENGTH: 10,
      MAX_LENGTH: 15,
      PATTERN: /^[\d\s\-\+\(\)]+$/,
    },
    CUSTOMER_NAME: {
      MIN_LENGTH: 2,
      MAX_LENGTH: 50,
      PATTERN: /^[A-Za-z\s]+$/,
    },
  },
  
  // Status Configuration
  STATUS: {
    COLORS: {
      received: "bg-blue-100 text-blue-800",
      diagnosed: "bg-yellow-100 text-yellow-800",
      in_repair: "bg-orange-100 text-orange-800",
      completed: "bg-green-100 text-green-800",
      delivered: "bg-purple-100 text-purple-800",
      cancelled: "bg-red-100 text-red-800",
    },
    PROGRESS: {
      received: 20,
      diagnosed: 40,
      in_repair: 60,
      completed: 80,
      delivered: 100,
      cancelled: 0,
    },
  },
  
  // Performance Configuration
  PERFORMANCE: {
    ENABLE_DEBOUNCING: true,
    ENABLE_CACHING: true,
    CACHE_DURATION_MS: 300000, // 5 minutes
    ENABLE_LAZY_LOADING: true,
    ENABLE_VIRTUAL_SCROLLING: false, // For large lists
  },
  
  // Security Configuration
  SECURITY: {
    SANITIZE_INPUT: true,
    VALIDATE_SEARCH_PARAMS: true,
    RATE_LIMIT_SEARCH: true,
    MAX_SEARCHES_PER_MINUTE: 10,
  },
  
  // Accessibility Configuration
  ACCESSIBILITY: {
    ENABLE_SCREEN_READER: true,
    ENABLE_KEYBOARD_NAVIGATION: true,
    ENABLE_HIGH_CONTRAST: false,
    ENABLE_FOCUS_INDICATORS: true,
  },
  
  // Analytics Configuration
  ANALYTICS: {
    ENABLE_TRACKING: true,
    TRACK_SEARCHES: true,
    TRACK_RESULTS: true,
    TRACK_NAVIGATION: true,
    TRACK_ERRORS: true,
  },
};

// Helper Functions
export const validateSearchQuery = (query: string, type: string): { valid: boolean; message?: string } => {
  if (!query || query.trim().length === 0) {
    return { valid: false, message: "Search query cannot be empty" };
  }
  
  if (query.length > TRACK_REPAIR_CONFIG.VALIDATION[type.toUpperCase()]?.MAX_LENGTH) {
    return { valid: false, message: `Query too long. Maximum ${TRACK_REPAIR_CONFIG.VALIDATION[type.toUpperCase()].MAX_LENGTH} characters allowed.` };
  }
  
  if (query.length < TRACK_REPAIR_CONFIG.VALIDATION[type.toUpperCase()]?.MIN_LENGTH) {
    return { valid: false, message: `Query too short. Minimum ${TRACK_REPAIR_CONFIG.VALIDATION[type.toUpperCase()].MIN_LENGTH} characters required.` };
  }
  
  const pattern = TRACK_REPAIR_CONFIG.VALIDATION[type.toUpperCase()]?.PATTERN;
  if (pattern && !pattern.test(query)) {
    return { valid: false, message: `Invalid ${type} format` };
  }
  
  return { valid: true };
};

export const getStatusColor = (status: string): string => {
  return TRACK_REPAIR_CONFIG.STATUS.COLORS[status] || "bg-gray-100 text-gray-800";
};

export const getStatusProgress = (status: string): number => {
  return TRACK_REPAIR_CONFIG.STATUS.PROGRESS[status] || 0;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

export const debounce = (func: Function, delay: number): Function => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

export const retryWithBackoff = async (
  fn: Function, 
  maxRetries: number = TRACK_REPAIR_CONFIG.API.MAX_RETRY_ATTEMPTS,
  delay: number = TRACK_REPAIR_CONFIG.API.RETRY_DELAY_MS
): Promise<any> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const backoffDelay = TRACK_REPAIR_CONFIG.API.EXPONENTIAL_BACKOFF 
        ? delay * Math.pow(2, i) 
        : delay;
      
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
};

export const logAnalytics = (event: string, data?: any): void => {
  if (!TRACK_REPAIR_CONFIG.ANALYTICS.ENABLE_TRACKING) return;
  
  console.log(`[ANALYTICS] ${event}:`, data);
  // In production, this would send to your analytics service
  // Example: analytics.track(event, data);
};

export const logError = (error: Error, context?: string): void => {
  console.error(`[TRACK_REPAIR_ERROR] ${context || 'Unknown context'}:`, error);
  
  if (TRACK_REPAIR_CONFIG.ANALYTICS.TRACK_ERRORS) {
    logAnalytics('error', {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    });
  }
}; 