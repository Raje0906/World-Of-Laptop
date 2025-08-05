// Smart API Client that handles different environments
class ApiClient {
  private baseUrl: string;
  private isDevelopment: boolean;

  constructor() {
    // Determine the base URL based on environment
    this.isDevelopment = import.meta.env.DEV || __IS_DEVELOPMENT__;
    
    // Check if we're running on localhost (development or preview)
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
    
    // Check if VITE_API_URL is explicitly set (production environment)
    const hasExplicitApiUrl = import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim() !== '';
    
    if (hasExplicitApiUrl) {
      // Use the explicitly set API URL (production)
      this.baseUrl = import.meta.env.VITE_API_URL + '/api';
    } else if (this.isDevelopment || isLocalhost) {
      // In development or localhost, use proxy to localhost
      this.baseUrl = '/api';
    } else {
      // In production without explicit URL, use the default production backend URL
      this.baseUrl = 'https://world-of-laptop.onrender.com/api';
    }
    
    console.log('API Client initialized:', {
      baseUrl: this.baseUrl,
      isDevelopment: this.isDevelopment,
      isLocalhost,
      hasExplicitApiUrl,
      VITE_API_URL: import.meta.env.VITE_API_URL,
      hostname: window.location.hostname,
      port: window.location.port,
      env: import.meta.env.MODE
    });
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    // Always use the baseUrl that was determined in constructor
    const url = `${this.baseUrl}${endpoint}`;

    const config: RequestInit = {
      ...options,
      headers: {
        ...options.headers,
      },
    };

    // Only set Content-Type for requests with a body (POST, PUT, PATCH)
    const hasBody = options.body || (options.method && ['POST', 'PUT', 'PATCH'].includes(options.method));
    if (hasBody) {
      config.headers = {
        'Content-Type': 'application/json',
        ...config.headers,
      };
    }

    // Add authorization header if token exists
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`,
      };
    }

    try {
      const response = await fetch(url, config);
      
      // Log request details in development
      if (this.isDevelopment || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('API Request:', {
          method: options.method || 'GET',
          url,
          status: response.status,
          statusText: response.statusText
        });
      }
      
      return response;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Generic request methods
  async get(endpoint: string): Promise<Response> {
    return this.makeRequest(endpoint, { method: 'GET' });
  }

  async post(endpoint: string, data?: any): Promise<Response> {
    return this.makeRequest(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put(endpoint: string, data?: any): Promise<Response> {
    return this.makeRequest(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete(endpoint: string): Promise<Response> {
    return this.makeRequest(endpoint, { method: 'DELETE' });
  }

  async patch(endpoint: string, data?: any): Promise<Response> {
    return this.makeRequest(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/health');
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  // Get current configuration
  getConfig() {
    return {
      baseUrl: this.baseUrl,
      isDevelopment: this.isDevelopment,
      isLocalhost: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
      hostname: window.location.hostname,
      port: window.location.port,
      env: import.meta.env.MODE
    };
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient();

// Export the class for testing
export { ApiClient }; 