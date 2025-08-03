// API client for backend communication
const API_BASE_URL = "/api";

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[] & { pagination: Pagination };
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem("token");
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem("token", token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem("token");
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    const headers = new Headers();
    headers.append("Content-Type", "application/json");
    
    if (this.token) {
      headers.append("Authorization", `Bearer ${this.token}`);
    }
    
    // Add any additional headers
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (value) {
          headers.append(key, value.toString());
        }
      });
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || `HTTP error! status: ${response.status}`,
        );
      }

      return data;
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    return this.request("/health");
  }

  // Authentication
  async login(username: string, password: string) {
    const response = await this.request<{ token: string; user: any }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ username, password }),
      },
    );

    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  // Customers
  async getCustomers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    storeId?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.search) searchParams.append("search", params.search);
    if (params?.storeId) searchParams.append("storeId", params.storeId);

    return this.request<PaginatedResponse<any>>(`/customers?${searchParams}`);
  }

  async searchCustomers(query: string, type?: string) {
    const searchParams = new URLSearchParams({ q: query });
    if (type) searchParams.append("type", type);

    return this.request(`/customers/search?${searchParams}`);
  }

  async getCustomer(id: string) {
    return this.request(`/customers/${id}`);
  }

  async createCustomer(customerData: any) {
    return this.request("/customers", {
      method: "POST",
      body: JSON.stringify(customerData),
    });
  }

  async updateCustomer(id: string, customerData: any) {
    return this.request(`/customers/${id}`, {
      method: "PUT",
      body: JSON.stringify(customerData),
    });
  }

  async deleteCustomer(id: string) {
    return this.request(`/customers/${id}`, {
      method: "DELETE",
    });
  }

  // Products
  async getProducts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    storeId?: string;
    status?: string;
    lowStock?: boolean;
  }) {
    const searchParams = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    return this.request<PaginatedResponse<any>>(`/products?${searchParams}`);
  }

  async searchProducts(query: string, type?: string) {
    const searchParams = new URLSearchParams({ q: query });
    if (type) searchParams.append("type", type);

    return this.request(`/products/search?${searchParams}`);
  }

  async getProduct(id: string) {
    return this.request(`/products/${id}`);
  }

  async createProduct(productData: any) {
    return this.request("/products", {
      method: "POST",
      body: JSON.stringify(productData),
    });
  }

  async updateProduct(id: string, productData: any) {
    return this.request(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(productData),
    });
  }



  // Sales
  async getSales(params?: {
    page?: number;
    limit?: number;
    storeId?: string;
    customerId?: string;
    status?: string;
    paymentMethod?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const searchParams = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    return this.request<PaginatedResponse<any>>(`/sales?${searchParams}`);
  }

  async getSalesStats(params?: {
    storeId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const searchParams = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    return this.request(`/sales/stats?${searchParams}`);
  }

  async getSale(id: string) {
    return this.request(`/sales/${id}`);
  }

  async getSaleByNumber(saleNumber: string) {
    return this.request(`/sales/number/${saleNumber}`);
  }

  async createSale(saleData: any) {
    return this.request("/sales", {
      method: "POST",
      body: JSON.stringify(saleData),
    });
  }

  async updateSaleStatus(id: string, status: string, reason?: string) {
    return this.request(`/sales/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status, reason }),
    });
  }

  async addRefund(id: string, refundData: any) {
    return this.request(`/sales/${id}/refund`, {
      method: "POST",
      body: JSON.stringify(refundData),
    });
  }

  // Repairs
  async getRepairs(params?: {
    page?: number;
    limit?: number;
    storeId?: string;
    customerId?: string;
    status?: string;
    priority?: string;
    startDate?: string;
    endDate?: string;
    technician?: string;
    overdue?: boolean;
  }) {
    const searchParams = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    return this.request<PaginatedResponse<any>>(`/repairs?${searchParams}`);
  }

  async getRepairStats(params?: {
    storeId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const searchParams = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    return this.request(`/repairs/stats?${searchParams}`);
  }

  async getOverdueRepairs(storeId?: string) {
    const searchParams = new URLSearchParams();
    if (storeId) searchParams.append("storeId", storeId);

    return this.request(`/repairs/overdue?${searchParams}`);
  }

  async getRepair(id: string) {
    return this.request(`/repairs/${id}`);
  }

  async getRepairByTicket(ticketNumber: string) {
    return this.request(`/repairs/ticket/${ticketNumber}`);
  }

  async createRepair(repairData: any) {
    return this.request("/repairs", {
      method: "POST",
      body: JSON.stringify(repairData),
    });
  }

  async updateRepairStatus(id: string, statusData: any) {
    return this.request(`/repairs/${id}/status`, {
      method: "PUT",
      body: JSON.stringify(statusData),
    });
  }

  async updateRepairDiagnostics(id: string, diagnosticsData: any) {
    return this.request(`/repairs/${id}/diagnostics`, {
      method: "PUT",
      body: JSON.stringify(diagnosticsData),
    });
  }

  async addRepairItem(id: string, itemData: any) {
    return this.request(`/repairs/${id}/items`, {
      method: "POST",
      body: JSON.stringify(itemData),
    });
  }

  async updateRepairPayment(id: string, paymentData: any) {
    return this.request(`/repairs/${id}/payment`, {
      method: "PUT",
      body: JSON.stringify(paymentData),
    });
  }

  async assignTechnician(id: string, technicianData: any) {
    return this.request(`/repairs/${id}/assign-technician`, {
      method: "PUT",
      body: JSON.stringify(technicianData),
    });
  }

  // Stores
  async getStores(params?: { city?: string; active?: boolean }) {
    const searchParams = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    return this.request(`/stores?${searchParams}`);
  }

  async getActiveStores() {
    return this.request("/stores/active");
  }

  async getStore(id: string) {
    return this.request(`/stores/${id}`);
  }

  async getStoreByCode(code: string) {
    return this.request(`/stores/code/${code}`);
  }

  async createStore(storeData: any) {
    return this.request("/stores", {
      method: "POST",
      body: JSON.stringify(storeData),
    });
  }

  async updateStore(id: string, storeData: any) {
    return this.request(`/stores/${id}`, {
      method: "PUT",
      body: JSON.stringify(storeData),
    });
  }

  async getStoreStatus(id: string) {
    return this.request(`/stores/${id}/status`);
  }

  // Notifications
  async testNotificationServices() {
    return this.request("/notifications/test");
  }

  async sendTestNotification(testData: any) {
    return this.request("/notifications/test-send", {
      method: "POST",
      body: JSON.stringify(testData),
    });
  }

  async sendRepairNotification(repairId: string, notificationData: any) {
    return this.request(`/notifications/repair/${repairId}`, {
      method: "POST",
      body: JSON.stringify(notificationData),
    });
  }

  async sendBulkRepairNotifications(bulkData: any) {
    return this.request("/notifications/bulk-repair", {
      method: "POST",
      body: JSON.stringify(bulkData),
    });
  }

  async getNotificationHistory(repairId: string) {
    return this.request(`/notifications/history/${repairId}`);
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Export individual services for convenience
export const customerService = {
  getAll: (params?: any) => apiClient.getCustomers(params),
  search: (query: string, type?: string) =>
    apiClient.searchCustomers(query, type),
  getById: (id: string) => apiClient.getCustomer(id),
  create: (data: any) => apiClient.createCustomer(data),
  update: (id: string, data: any) => apiClient.updateCustomer(id, data),
  delete: (id: string) => apiClient.deleteCustomer(id),
};

export const productService = {
  getAll: (params?: any) => apiClient.getProducts(params),
  search: (query: string, type?: string) =>
    apiClient.searchProducts(query, type),
  getById: (id: string) => apiClient.getProduct(id),
  create: (data: any) => apiClient.createProduct(data),
  update: (id: string, data: any) => apiClient.updateProduct(id, data),
};

export const saleService = {
  getAll: (params?: any) => apiClient.getSales(params),
  getStats: (params?: any) => apiClient.getSalesStats(params),
  getById: (id: string) => apiClient.getSale(id),
  getByNumber: (saleNumber: string) => apiClient.getSaleByNumber(saleNumber),
  create: (data: any) => apiClient.createSale(data),
  updateStatus: (id: string, status: string, reason?: string) =>
    apiClient.updateSaleStatus(id, status, reason),
  addRefund: (id: string, data: any) => apiClient.addRefund(id, data),
};

export const repairService = {
  getAll: (params?: any) => apiClient.getRepairs(params),
  getStats: (params?: any) => apiClient.getRepairStats(params),
  getOverdue: (storeId?: string) => apiClient.getOverdueRepairs(storeId),
  getById: (id: string) => apiClient.getRepair(id),
  getByTicket: (ticketNumber: string) =>
    apiClient.getRepairByTicket(ticketNumber),
  create: (data: any) => apiClient.createRepair(data),
  updateStatus: (id: string, data: any) =>
    apiClient.updateRepairStatus(id, data),
  updateDiagnostics: (id: string, data: any) =>
    apiClient.updateRepairDiagnostics(id, data),
  addItem: (id: string, data: any) => apiClient.addRepairItem(id, data),
  updatePayment: (id: string, data: any) =>
    apiClient.updateRepairPayment(id, data),
  assignTechnician: (id: string, data: any) =>
    apiClient.assignTechnician(id, data),
};

export const storeService = {
  getAll: (params?: any) => apiClient.getStores(params),
  getActive: () => apiClient.getActiveStores(),
  getById: (id: string) => apiClient.getStore(id),
  getByCode: (code: string) => apiClient.getStoreByCode(code),
  create: (data: any) => apiClient.createStore(data),
  update: (id: string, data: any) => apiClient.updateStore(id, data),
  getStatus: (id: string) => apiClient.getStoreStatus(id),
};

export const notificationService = {
  test: () => apiClient.request('/notifications/test'),
  sendTest: (data: any) => apiClient.request('/notifications/test', { method: 'POST', body: JSON.stringify(data) }),
  sendRepair: (repairId: string, data: any) => 
    apiClient.request(`/notifications/repairs/${repairId}`, { method: 'POST', body: JSON.stringify(data) }),
  sendBulk: (data: any) => apiClient.request('/notifications/bulk', { method: 'POST', body: JSON.stringify(data) }),
  getHistory: (repairId: string) => apiClient.request(`/notifications/history/${repairId}`)
};

export default apiClient;
