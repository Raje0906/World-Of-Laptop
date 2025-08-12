// Safe API client that gracefully handles backend unavailability
// Determine API base URL based on environment
const getApiBaseUrl = () => {
  // Check if VITE_API_URL is explicitly set (production environment)
  const hasExplicitApiUrl = import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim() !== '';
  
  if (hasExplicitApiUrl) {
    // Use the explicitly set API URL (production)
    return import.meta.env.VITE_API_URL + '/api';
  }
  
  // Check if we're running on localhost (development or preview)
  const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1'
  );
  
  if (isLocalhost) {
    // In localhost, use local backend
    return 'http://localhost:3002/api';
  } else {
    // In production without explicit URL, use the default production backend URL
    return 'https://world-of-laptop.onrender.com/api';
  }
};

const API_BASE_URL = getApiBaseUrl();

class SafeApiClient {
  private isBackendAvailable: boolean = false;
  private lastCheck: number = 0;
  private checkInterval: number = 60000; // Check every 60 seconds

  constructor() {
    console.log('SafeApiClient initialized with API_BASE_URL:', API_BASE_URL);
    this.checkBackendAvailability();
  }

  private async checkBackendAvailability(): Promise<void> {
    const now = Date.now();

    // Only check if it's been more than the interval since last check
    if (now - this.lastCheck < this.checkInterval) {
      return;
    }

    this.lastCheck = now;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

      console.log('Checking backend availability at:', `${API_BASE_URL}/health`);
      const response = await fetch(`${API_BASE_URL}/health`, {
        signal: controller.signal,
        method: "GET",
      });

      clearTimeout(timeoutId);
      
      if (response.status === 429) {
        // Rate limit exceeded - don't mark backend as unavailable
        console.warn('Rate limit exceeded during health check, but backend is available');
        this.isBackendAvailable = true;
        return;
      }
      
      this.isBackendAvailable = response.ok;

      if (this.isBackendAvailable) {
        console.log("✅ Backend server is available at", API_BASE_URL);
      }
    } catch (error: any) {
      // Don't mark as unavailable for rate limit errors
      if (error.message && error.message.includes('429')) {
        console.warn('Rate limit exceeded during health check, but backend is available');
        this.isBackendAvailable = true; // Keep it as available
        return;
      }
      
      this.isBackendAvailable = false;
      // Only log once per check interval to avoid spam
      console.warn(
        `⚠️ Backend server unavailable at ${API_BASE_URL} (this is normal if not running locally)`,
      );
    }
  }

  public async safeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<{
    success: boolean;
    data?: T;
    error?: string;
    offline?: boolean;
  }> {
    // Check backend availability first
    await this.checkBackendAvailability();

    if (!this.isBackendAvailable) {
      return {
        success: false,
        error: "Backend server is not available",
        offline: true,
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      // Get token from localStorage if available
      const token = localStorage.getItem('token');
      console.log('Token from localStorage:', token ? `Found (${token.substring(0, 10)}...)` : 'Not found');
      
      // Create a new headers object to avoid type issues with the spread operator
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Manually add other headers to avoid type issues
      if (options.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          if (value !== undefined) {
            headers[key] = String(value);
          }
        });
      }
      
      // Add Authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('Request headers with auth:', {
          ...headers,
          // Don't log the full token for security
          Authorization: `Bearer ${token.substring(0, 10)}...`
        });
      } else {
        console.warn('No authentication token found in localStorage');
      }
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limit exceeded - don't mark backend as unavailable
          console.warn('Rate limit exceeded, but backend is available');
          return {
            success: false,
            error: "Rate limit exceeded. Please try again later.",
            offline: false,
          };
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error: any) {
      this.isBackendAvailable = false; // Mark as unavailable on error

      return {
        success: false,
        error: error.message || "Request failed",
        offline: error.name === "AbortError" || error.message.includes("fetch"),
      };
    }
  }

  // Customer methods
  public async getCustomers(params?: any) {
    const queryString = params
      ? `?${new URLSearchParams(params).toString()}`
      : "";
    return this.safeRequest(`/customers${queryString}`);
  }

  public async createCustomer(customerData: any) {
    return this.safeRequest("/customers", {
      method: "POST",
      body: JSON.stringify(customerData),
    });
  }

  public async healthCheck() {
    return this.safeRequest("/health");
  }

  // Public getter for backend status
  public get isOnline(): boolean {
    return this.isBackendAvailable;
  }

  // Force a backend check
  public async forceCheck(): Promise<boolean> {
    this.lastCheck = 0; // Reset check time
    await this.checkBackendAvailability();
    return this.isBackendAvailable;
  }
}

export const safeApiClient = new SafeApiClient();
export default safeApiClient;
