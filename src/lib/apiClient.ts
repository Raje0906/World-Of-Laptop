// Smart API Client that handles different environments
class ApiClient {
  private baseUrl: string;
  private isDevelopment: boolean;

  constructor() {
    // Determine the base URL based on environment
    this.isDevelopment = import.meta.env.DEV || __IS_DEVELOPMENT__;
    
    if (this.isDevelopment) {
      // In development, use proxy to localhost
      this.baseUrl = '/api';
    } else {
      // In production, use the production backend URL
      this.baseUrl = import.meta.env.VITE_API_URL || 'https://world-of-laptop.onrender.com';
    }
    
    console.log('API Client initialized:', {
      baseUrl: this.baseUrl,
      isDevelopment: this.isDevelopment,
      env: import.meta.env.MODE
    });
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = this.isDevelopment 
      ? `${this.baseUrl}${endpoint}` 
      : `${this.baseUrl}${endpoint}`;

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

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
      if (this.isDevelopment) {
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
      env: import.meta.env.MODE
    };
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient();

// Export the class for testing
export { ApiClient }; 