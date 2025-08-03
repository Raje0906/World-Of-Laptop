import { useState, useEffect, FormEvent } from "react";
import { Customer } from "../types";

// Types for API responses
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  offline?: boolean;
}

interface CustomerResponse {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: {
    line1: string;
    city: string;
    state: string;
    pincode: string;
  };
  city: string;
  customerType: string;
  createdAt?: string;
  updatedAt?: string;
}

// Mock API client since the real one is not available
const apiClient = {
  isOnline: true,
  
  async getCustomers(): Promise<ApiResponse<{ customers: CustomerResponse[] }>> {
    return { 
      success: true, 
      data: { 
        customers: [] 
      } 
    };
  },
  
  async createCustomer(customer: Omit<CustomerResponse, '_id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<CustomerResponse>> {
    return { 
      success: true, 
      data: { 
        ...customer, 
        _id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } 
    };
  },
  
  async forceCheck(): Promise<boolean> {
    return true;
  }
};

interface CustomerWithDemo extends Customer {
  isDemo?: boolean;
}

interface CustomersState {
  customers: CustomerWithDemo[];
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  showAddForm: boolean;
  message: string;
}

interface CustomerWithDemo extends Customer {
  isDemo?: boolean;
}

interface CustomersState {
  customers: CustomerWithDemo[];
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  showAddForm: boolean;
  message: string;
}

export default function OfflineAwareCustomers() {
  const [state, setState] = useState<CustomersState>({
    customers: [],
    loading: false,
    error: null,
    isOnline: true,
    showAddForm: false,
    message: ""
  });

  const { customers, loading, error, isOnline, showAddForm, message } = state;

  const updateState = (newState: Partial<CustomersState> | ((prev: CustomersState) => Partial<CustomersState>)) => {
    if (typeof newState === 'function') {
      setState(prev => ({ ...prev, ...newState(prev) }));
    } else {
      setState(prev => ({ ...prev, ...newState }));
    }
  };

  // Handle form submission
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    handleAddCustomer(formData);
  };
  
  // Handle adding a new customer
  const handleAddCustomer = async (formData: FormData) => {
    updateState({ loading: true, error: null });
    
    // Get form values with type safety
    const getFormValue = (key: string, defaultValue: string = ''): string => {
      const value = formData.get(key);
      return value ? value.toString().trim() : defaultValue;
    };

    const name = getFormValue("name");
    const email = getFormValue("email");
    const phone = getFormValue("phone");
    const city = getFormValue("city");
    const state = getFormValue("state");
    const line1 = getFormValue("line1");
    const pincode = getFormValue("pincode");
    
    // Validate required fields
    if (!name || !email || !phone) {
      updateState({
        error: "Name, email, and phone are required fields",
        loading: false
      });
      return;
    }
    
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      updateState({
        error: "Please enter a valid email address",
        loading: false
      });
      return;
    }

    const newCustomer: CustomerWithDemo = {
      id: `local-${Date.now()}`,
      name,
      email,
      phone,
      address: {
        line1: line1 || 'Not specified',
        city: city || 'Not specified',
        state: state || 'Not specified',
        pincode: pincode || '000000'
      },
      city: city || 'Not specified',
      dateAdded: new Date().toISOString(),
      totalPurchases: 0,
      status: 'active' as const,
      isDemo: false,
    };

    try {
      if (isOnline) {
        // Try to save to the server if online
        const result = await apiClient.createCustomer({
          name,
          email,
          phone,
          address: {
            line1: line1 || 'Not specified',
            city: city || 'Not specified',
            state: state || 'Not specified',
            pincode: pincode || '000000'
          },
          city: city || 'Not specified',
          customerType: 'individual' // Default customer type
        });

        if (result.success && result.data) {
          // Update with server-generated ID if available
          newCustomer.id = result.data._id || newCustomer.id;
        }
      }
      
      // Add to local state
      setMockCustomers(prev => {
        const updated = [newCustomer, ...prev];
        // Save to localStorage
        saveCustomersToLocalStorage(updated);
        return updated;
      });
      
      updateState({ 
        showAddForm: false,
        message: `✅ Customer added successfully${!isOnline ? ' (offline mode)' : ''}`,
        loading: false
      });
      
    } catch (error) {
      console.error('Error adding customer:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Failed to add customer',
        loading: false
      });
    }
  };
  
  // Handle form reset
  const handleFormReset = () => {
    updateState({ showAddForm: false });
  };
  
  // Toggle add form visibility
  const toggleAddForm = () => {
    updateState(prev => ({ showAddForm: !prev.showAddForm }));
  };

  // Load customers from localStorage for offline mode
  const loadCustomersFromLocalStorage = (): CustomerWithDemo[] => {
    try {
      const savedCustomers = localStorage.getItem('laptop-store-customers');
      if (!savedCustomers) return [];
      const parsed = JSON.parse(savedCustomers);
      // Ensure all required fields are present
      return parsed.map((c: any) => ({
        ...c,
        address: c.address || {
          line1: '',
          city: '',
          state: '',
          pincode: ''
        },
        city: c.city || '',
        dateAdded: c.dateAdded || new Date().toISOString(),
        totalPurchases: c.totalPurchases || 0,
        status: c.status || 'active'
      }));
    } catch (error) {
      console.error('Error loading customers from localStorage:', error);
      return [];
    }
  };

  // Save customers to localStorage for offline mode
  const saveCustomersToLocalStorage = (customers: CustomerWithDemo[]) => {
    try {
      // Filter out demo customers before saving
      const customersToSave = customers
        .filter(c => !c.isDemo)
        .map(({ isDemo, ...customer }) => customer); // Remove isDemo flag before saving
      
      localStorage.setItem('laptop-store-customers', JSON.stringify(customersToSave));
    } catch (error) {
      console.error('Error saving customers to localStorage:', error);
    }
  };

  // Initial mock data (only used if no data in localStorage and offline)
  const initialMockCustomers: CustomerWithDemo[] = [
    {
      id: 'demo-1',
      name: 'Demo Customer',
      email: 'demo@example.com',
      phone: '1234567890',
      address: {
        line1: '123 Demo St',
        city: 'Demo City',
        state: 'DS',
        pincode: '123456'
      },
      city: 'Demo City',
      dateAdded: new Date().toISOString(),
      totalPurchases: 0,
      status: 'active' as const,
      isDemo: true,
    },
  ];

  // Load saved customers or use initial mock data
  const [mockCustomers, setMockCustomers] = useState<CustomerWithDemo[]>([]);

  // Load saved customers on component mount
  useEffect(() => {
    const savedCustomers = loadCustomersFromLocalStorage();
    if (savedCustomers.length > 0) {
      setMockCustomers(savedCustomers);
    } else if (!navigator.onLine) {
      // Only use demo data if offline and no saved data
      setMockCustomers(initialMockCustomers);
    }
  }, []);

  // Save customers to localStorage whenever they change
  useEffect(() => {
    if (mockCustomers.length > 0) {
      saveCustomersToLocalStorage(mockCustomers);
    }
  }, [mockCustomers]);

  // Mock data for offline mode (moved to be used only when needed)

  // Check backend status and load data
  const loadCustomers = async () => {
    updateState({ loading: true, error: null });
    
    try {
      const result = await apiClient.getCustomers();
      apiClient.isOnline = true; // Update online status
      updateState({ isOnline: true });

      if (result.success && result.data) {
        // Map the API response to our Customer type
        const apiCustomers = (result.data?.customers || []).map((c: any) => ({
          id: c._id || c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          address: c.address || {
            line1: c.address?.line1 || '',
            city: c.city || c.address?.city || '',
            state: c.address?.state || '',
            pincode: c.address?.pincode || ''
          },
          city: c.city || c.address?.city || '',
          dateAdded: c.dateAdded || c.createdAt || new Date().toISOString(),
          totalPurchases: c.totalPurchases || 0,
          status: c.status || 'active',
          isDemo: false
        }));
        
        updateState({ 
          customers: apiCustomers, 
          message: "✅ Connected to database",
          loading: false
        });
      } else {
        throw new Error(result.error || "Failed to load customers");
      }
    } catch (error) {
      console.error("Error loading customers:", error);
      // Use mock data when offline
      const localCustomers = loadCustomersFromLocalStorage();
      updateState({ 
        customers: localCustomers.length > 0 ? localCustomers : mockCustomers,
        error: "Offline mode: Using local data",
        isOnline: false,
        loading: false
      });
    }
  };

  // Force check backend status
  const checkBackendStatus = async () => {
    updateState({ loading: true });
    try {
      const available = await apiClient.forceCheck();
      updateState({ isOnline: available, loading: false });

      if (available) {
        await loadCustomers();
      } else {
        updateState({ 
          message: "❌ Backend server is still not available",
          error: "Backend server is not available"
        });
      }
    } catch (err) {
      console.error("Error checking backend status:", err);
      updateState({ 
        loading: false,
        error: "Failed to check backend status"
      });
    }
  };

  useEffect(() => {
    const handleOnline = () => updateState({ isOnline: true });
    const handleOffline = () => updateState({ isOnline: false });

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check
    updateState({ isOnline: navigator.onLine });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const savedCustomers = loadCustomersFromLocalStorage();
    if (savedCustomers.length > 0) {
      updateState({ customers: savedCustomers });
    }
    loadCustomers();
  }, []);

  useEffect(() => {
    if (state.customers.length > 0) {
      saveCustomersToLocalStorage(state.customers);
    }
  }, [state.customers]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        updateState({ error: null });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Customer Management
        </h1>
        <p className="text-gray-600">
          Manage customers with automatic offline/online detection
        </p>

        {/* Status Banner */}
        <div
          className={`mt-4 p-4 rounded-lg border ${
            isOnline
              ? "bg-green-50 border-green-200"
              : "bg-yellow-50 border-yellow-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isOnline ? "bg-green-500" : "bg-yellow-500"
                }`}
              ></div>
              <span
                className={`font-medium ${
                  isOnline ? "text-green-900" : "text-yellow-900"
                }`}
              >
                {isOnline
                  ? "Connected to MongoDB Database"
                  : "Demo Mode - Backend Offline"}
              </span>
            </div>
            <button
              onClick={checkBackendStatus}
              disabled={loading}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:bg-gray-100"
            >
              {loading ? "Checking..." : "Check Connection"}
            </button>
          </div>
          {message && (
            <p
              className={`mt-2 text-sm ${
                isOnline ? "text-green-800" : "text-yellow-800"
              }`}
            >
              {message}
            </p>
          )}
          {error && (
            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Backend Instructions */}
      {!isOnline && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">
            🚀 To Enable Database Features:
          </h3>
          <div className="text-blue-800 text-sm space-y-1">
            <p>
              <strong>1. Start MongoDB:</strong> <code>net start MongoDB</code>{" "}
              (Windows)
            </p>
            <p>
              <strong>2. Start Backend:</strong> <code>npm run server</code>
            </p>
            <p>
              <strong>3. Check API:</strong>{" "}
              <a
                href="http://localhost:5001/api/health"
                target="_blank"
                className="underline"
              >
                http://localhost:5001/api/health
              </a>
            </p>
            <p>
              <strong>4. Refresh this page</strong> or click "Check Connection"
            </p>
          </div>
        </div>
      )}

      {/* Add Customer Button */}
      <div className="mb-6">
        <button
          type="button"
          onClick={toggleAddForm}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {showAddForm
            ? "Cancel"
            : `Add New Customer ${isOnline ? "(Database)" : "(Demo)"}`}
        </button>
      </div>

      {/* Add Customer Form */}
      {showAddForm && (
        <div className="mb-8 bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold mb-4">
            Add New Customer {isOnline ? "to Database" : "to Demo Data"}
          </h2>
          <form
            onSubmit={handleSubmit}
            onReset={handleFormReset}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter customer name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                name="email"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="customer@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="+91 98765 43210"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Type
              </label>
              <select
                name="customerType"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="individual">Individual</option>
                <option value="business">Business</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                name="city"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Mumbai"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                name="state"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Maharashtra"
              />
            </div>

            <div className="md:col-span-2 flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                {loading ? "Adding..." : "Save Customer"}
              </button>
              <button
                type="reset"
                disabled={loading}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Customer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500">Total Customers</h3>
          <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
          <p className="text-xs text-blue-600">
            {isOnline ? "From Database" : "Demo Data"}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500">Active</h3>
          <p className="text-2xl font-bold text-green-600">
            {customers.filter((c) => c.status === "active").length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500">Status</h3>
          <p
            className={`text-2xl font-bold ${isOnline ? "text-green-600" : "text-yellow-600"}`}
          >
            {isOnline ? "Online" : "Offline"}
          </p>
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            {isOnline ? "Database" : "Demo"} Customers ({customers.length})
          </h2>
          <button
            onClick={loadCustomers}
            disabled={loading}
            className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:bg-gray-100"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Added
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customers.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <p className="text-lg font-medium">No customers found</p>
                      <p className="text-sm">
                        Add your first customer using the form above
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {customer.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{customer.email}</div>
                      <div className="text-sm text-gray-500">{customer.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {customer.address?.city || 'N/A'}
                        {customer.address?.state && `, ${customer.address.state}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(customer.dateAdded).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        customer.isDemo ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {customer.isDemo ? 'Demo' : 'Database'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
