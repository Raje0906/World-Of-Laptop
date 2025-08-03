// Safe API client that gracefully handles backend unavailability
// Note: This should match the backend server port in server.js (3002)
const API_BASE_URL = "http://localhost:3002/api";

class SafeApiClient {
  private isBackendAvailable: boolean = false;
  private lastCheck: number = 0;
  private checkInterval: number = 30000; // Check every 30 seconds

  constructor() {
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

      const response = await fetch(`${API_BASE_URL}/health`, {
        signal: controller.signal,
        method: "GET",
      });

      clearTimeout(timeoutId);
      this.isBackendAvailable = response.ok;

      if (this.isBackendAvailable) {
        console.log("✅ Backend server is available");
      }
    } catch (error) {
      this.isBackendAvailable = false;
      // Only log once per check interval to avoid spam
      console.warn(
        "⚠️ Backend server unavailable (this is normal if not running locally)",
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
