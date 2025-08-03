import {
  Customer,
  Product,
  Sale,
  BarcodeResult,
  SearchFilters,
  Report,
} from "@/types";
import { openDB } from 'idb';

// Local storage keys
const STORAGE_KEYS = {
  CUSTOMERS: "laptop-store-customers",
  PRODUCTS: "laptop-store-products",
  SALES: "laptop-store-sales",
  REPAIRS: "laptop-store-repairs",
};

const DB_NAME = 'laptop-store-crm';
const DB_VERSION = 2;
const STORE_CUSTOMERS = 'customers';
const STORE_SALES = 'sales';
const STORE_REPORTS = 'reports';
const STORE_REPAIRS = 'repairs';
const STORE_STORES = 'stores';
const STORE_USERS = 'users';
const STORE_NOTIFICATIONS = 'notifications';

// Upgrade DB to support all stores
export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_CUSTOMERS)) {
        db.createObjectStore(STORE_CUSTOMERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SALES)) {
        db.createObjectStore(STORE_SALES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_REPORTS)) {
        db.createObjectStore(STORE_REPORTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_REPAIRS)) {
        db.createObjectStore(STORE_REPAIRS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_STORES)) {
        db.createObjectStore(STORE_STORES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_USERS)) {
        db.createObjectStore(STORE_USERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_NOTIFICATIONS)) {
        db.createObjectStore(STORE_NOTIFICATIONS, { keyPath: 'id' });
      }
    },
  });
}

// Customers
export async function saveCustomersToIDB(customers: any[]) {
  const db = await getDB();
  const tx = db.transaction(STORE_CUSTOMERS, 'readwrite');
  for (const customer of customers) {
    await tx.store.put(customer);
  }
  await tx.done;
}

export async function getCustomersFromIDB() {
  const db = await getDB();
  return db.getAll(STORE_CUSTOMERS);
}

// Sales
export async function saveSalesToIDB(sales: any[]) {
  const db = await getDB();
  const tx = db.transaction(STORE_SALES, 'readwrite');
  for (const sale of sales) {
    await tx.store.put(sale);
  }
  await tx.done;
}

export async function getSalesFromIDB() {
  const db = await getDB();
  return db.getAll(STORE_SALES);
}

// Reports
export async function saveReportsToIDB(reports: any[]) {
  const db = await getDB();
  const tx = db.transaction(STORE_REPORTS, 'readwrite');
  for (const report of reports) {
    await tx.store.put(report);
  }
  await tx.done;
}

export async function getReportsFromIDB() {
  const db = await getDB();
  return db.getAll(STORE_REPORTS);
}

// Repairs
export async function saveRepairsToIDB(repairs: any[]) {
  const db = await getDB();
  const tx = db.transaction(STORE_REPAIRS, 'readwrite');
  for (const repair of repairs) {
    await tx.store.put(repair);
  }
  await tx.done;
}
export async function getRepairsFromIDB() {
  const db = await getDB();
  return db.getAll(STORE_REPAIRS);
}

// Stores
export async function saveStoresToIDB(stores: any[]) {
  const db = await getDB();
  const tx = db.transaction(STORE_STORES, 'readwrite');
  for (const store of stores) {
    await tx.store.put(store);
  }
  await tx.done;
}
export async function getStoresFromIDB() {
  const db = await getDB();
  return db.getAll(STORE_STORES);
}

// Users
export async function saveUsersToIDB(users: any[]) {
  const db = await getDB();
  const tx = db.transaction(STORE_USERS, 'readwrite');
  for (const user of users) {
    await tx.store.put(user);
  }
  await tx.done;
}
export async function getUsersFromIDB() {
  const db = await getDB();
  return db.getAll(STORE_USERS);
}

// Notifications
export async function saveNotificationsToIDB(notifications: any[]) {
  const db = await getDB();
  const tx = db.transaction(STORE_NOTIFICATIONS, 'readwrite');
  for (const notification of notifications) {
    await tx.store.put(notification);
  }
  await tx.done;
}
export async function getNotificationsFromIDB() {
  const db = await getDB();
  return db.getAll(STORE_NOTIFICATIONS);
}

// Initialize data in localStorage if not present
export const initializeData = () => {
  // Initialize with empty arrays if not present
  if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SALES)) {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.REPAIRS)) {
    localStorage.setItem(STORAGE_KEYS.REPAIRS, JSON.stringify([]));
  }
};

// Customer operations
export const getCustomers = async (status: 'active' | 'inactive' | 'all' = 'active'): Promise<Customer[]> => {
  const apiUrl = 'http://localhost:3002/api'; // Use full backend URL
  try {
    const response = await fetch(`${apiUrl}/customers${status !== 'all' ? `?status=${status}` : ''}`);
    if (!response.ok) {
      throw new Error('Failed to fetch customers');
    }
    const data = await response.json();
    return (data.data || []).map((customer) => ({
      ...customer,
      id: customer._id || customer.id,
      dateAdded: customer.dateAdded || customer.createdAt,
    }));
  } catch (error) {
    console.error('Error fetching customers:', error);
    // Fallback to local storage if API fails
    const localData = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    const allCustomers = localData ? JSON.parse(localData) : [];
    if (status === 'all') return allCustomers;
    return allCustomers.filter((customer: Customer) => customer.status === status);
  }
};

export const getCustomer = async (id: string): Promise<Customer | null> => {
  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  try {
    const response = await fetch(`${apiUrl}/customers/${id}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch customer');
    }
    const result = await response.json();
    return {
      ...result.data,
      id: result.data._id || result.data.id,
    };
  } catch (error) {
    console.error('Error fetching customer:', error);
    throw error;
  }
};

export const addCustomer = async (
  customer: Omit<Customer, "id" | "dateAdded" | "totalPurchases">,
): Promise<Customer> => {
  const apiUrl = 'http://localhost:3002/api'; // Use full backend URL
  try {
    // Ensure required address fields are present with defaults
    const { line1, city, state, pincode, ...restAddress } = customer.address || {};
    const requestBody = {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: {
        ...restAddress,
        line1: line1 || 'Not specified',
        city: city || 'Not specified',
        state: state || 'Not specified',
        pincode: pincode || '000000'
      }
    };

    const response = await fetch(`${apiUrl}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.errors?.[0]?.msg || errorData.message || 'Failed to add customer';
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return {
      ...result.data,
      id: result.data._id || result.data.id,
      dateAdded: result.data.createdAt || new Date().toISOString().split("T")[0],
      totalPurchases: 0,
      status: "active",
    };
  } catch (error) {
    console.error('Error adding customer:', error);
    throw error;
  }
};

export const updateCustomer = async (
  id: string,
  updates: Partial<Customer>,
): Promise<Customer | null> => {
  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  try {
    const response = await fetch(`${apiUrl}/customers/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update customer');
    }

    const result = await response.json();
    return {
      ...result.data,
      id: result.data._id || result.data.id,
    };
  } catch (error) {
    console.error('Error updating customer:', error);
    throw error;
  }
};

export const deleteCustomer = async (id: string): Promise<boolean> => {
  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  try {
    const response = await fetch(`${apiUrl}/customers/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete customer');
    }

    return true;
  } catch (error) {
    console.error('Error deleting customer:', error);
    throw error;
  }
};

// Product operations
export const getProducts = async (): Promise<Product[]> => {
  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  try {
    const response = await fetch(`${apiUrl}/products`);
    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }
    const data = await response.json();
    if (Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};

export const updateProductStock = async (
  productId: string,
  quantity: number,
): Promise<boolean> => {
  // Find the product in the database
  const products = await getProducts();
  const product = (await products).find((p: Product) => p.id === productId);
  if (!product || product.stock < quantity) return false;

  product.stock -= quantity;
  product.status = product.stock === 0 ? "out-of-stock" : "available";
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  return true;
};

// Sales operations
export const getSales = async (): Promise<Sale[]> => {
  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  try {
    const response = await fetch(`${apiUrl}/sales`);
    if (!response.ok) {
      throw new Error('Failed to fetch sales');
    }
    const data = await response.json();
    return Array.isArray(data.data) ? data.data : [];
  } catch (error) {
    console.error('Error fetching sales:', error);
    return [];
  }
};

export const addSale = (sale: Omit<Sale, "id" | "date">): Sale => {
  const sales = getSales();
  const newSale: Sale = {
    ...sale,
    id: `sale-${Date.now()}`,
    date: new Date().toISOString().split("T")[0],
  };

  sales.push(newSale);
  localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));

  // Update product stock
  updateProductStock(sale.productId, sale.quantity);

  // Update customer total purchases
  getCustomers().then(customers => {
    const customer = customers.find((c: Customer) => c.id === sale.customerId);
    if (customer) {
      customer.totalPurchases += sale.finalAmount;
      customer.lastPurchase = newSale.date;
      // Get current customers and update the specific customer
      getCustomers().then(allCustomers => {
        const updatedCustomers = allCustomers.map(c => 
          c.id === customer.id ? customer : c
        );
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updatedCustomers));
      });
    }
  });

  return newSale;
};

// Repair operations
// Helper function to find customer by email or phone
const findCustomerByEmailOrPhone = async (email: string, phone: string): Promise<Customer | null> => {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || '/api';
    const response = await fetch(`${apiUrl}/customers/search?email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}`);
    
    if (!response.ok) {
      throw new Error('Failed to search for customer');
    }
    
    const result = await response.json();
    return result.data && result.data.length > 0 ? result.data[0] : null;
  } catch (error) {
    console.error('Error finding customer:', error);
    return null;
  }
};

// Helper function to parse repair data with proper types
const parseRepair = (data: any): Repair => ({
  ...data,
  id: data._id || data.id,
  customer: data.customer?._id || data.customer || '',
  dateReceived: new Date(data.dateReceived || Date.now()),
  estimatedCompletion: data.estimatedCompletion ? new Date(data.estimatedCompletion) : undefined,
  createdAt: new Date(data.createdAt || Date.now()),
  updatedAt: new Date(data.updatedAt || Date.now()),
  parts: Array.isArray(data.parts) ? data.parts : [],
  notes: Array.isArray(data.notes) ? data.notes : [],
  customerNotified: data.customerNotified || { whatsapp: false, email: false }
} as Repair);

export const getRepairs = async (): Promise<Repair[]> => {
  try {
    const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
    const response = await fetch(`${baseUrl}/api/repairs`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch repairs: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data.map(parseRepair) : [];
  } catch (error) {
    console.error('Error fetching repairs from API, falling back to localStorage:', error);
    // Fallback to localStorage
    const repairsJson = localStorage.getItem(STORAGE_KEYS.REPAIRS);
    if (!repairsJson) return [];
    
    try {
      const data = JSON.parse(repairsJson);
      return Array.isArray(data) ? data.map(parseRepair) : [];
    } catch (parseError) {
      console.error('Error parsing localStorage repairs:', parseError);
      return [];
    }
  }
};

// Define the base Repair interface
export interface Repair {
  _id: string;
  customer: string | Customer;
  customerId?: string;
  deviceType: string;
  brand: string;
  model: string;
  serialNumber: string;
  issueDescription: string;
  issue?: string; // Alias for issueDescription
  diagnosis: string;
  repairCost: number;
  partsCost: number;
  laborCost: number;
  actualCost?: number;
  priority: 'low' | 'medium' | 'high';
  status: string;
  notes: string[];
  dateReceived: string | Date;
  estimatedCompletion?: string | Date;
  actualCompletion?: string | Date;
  customerNotified?: {
    whatsapp: boolean;
    email: boolean;
    lastNotified?: string; // Add missing property
  };
  contactInfo?: {
    whatsappNumber: string;
    notificationEmail: string;
    consentGiven: boolean;
    consentDate: string;
  };
  storeId?: string; // Add missing property
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

// Extend the Repair type to include customer info
export interface RepairWithCustomer extends Omit<Repair, 'customer' | 'customerId'> {
  customer?: string | Customer;
  customerId?: string;
  customerName?: string;
}

// Helper function to create a minimal customer
const createMinimalCustomer = async (data: any): Promise<Customer> => {
  const customerData = {
    name: data.name || 'Unknown Customer',
    email: data.email || '',
    phone: data.phone || '',
    address: {
      line1: data.address?.line1 || '',
      city: data.address?.city || 'Unknown',
      state: data.address?.state || '',
      pincode: data.address?.pincode || '',
      country: data.address?.country || ''
    },
    city: data.city || data.address?.city || 'Unknown',
    status: 'active' as const,
    dateAdded: new Date().toISOString()
  };

  // Remove undefined values to avoid validation errors
  Object.keys(customerData).forEach(key => 
    (customerData as any)[key] === undefined && delete (customerData as any)[key]
  );

  return await addCustomer(customerData);
};

// ...

// Search functionality
export const searchCustomers = async (filters: SearchFilters): Promise<Customer[]> => {
  const { query, field } = filters;

  if (!query.trim()) {
    return [];
  }

  try {
    const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
    const searchParams = new URLSearchParams({
      search: query,
      limit: '10' // Limit results to 10 for better performance
    });
    
    // Use the main customers endpoint with search parameter
    const response = await fetch(`${baseUrl}/api/customers?${searchParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Search failed:', errorData);
      throw new Error(errorData.message || `Failed to search customers: ${response.status}`);
    }

    const result = await response.json();
    return Array.isArray(result.data) ? result.data : [];
  } catch (error) {
    console.error('Error searching customers:', error);
    return [];
  }
};

export const searchByBarcode = async (barcode: string): Promise<Product | null> => {
  try {
    const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
    const response = await fetch(`${baseUrl}/api/products/barcode/${barcode}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to search by barcode');
    }
    
    const result = await response.json();
    return result.data || null;
  } catch (error) {
    console.error('Error searching by barcode:', error);
    return null;
  }
};

export const searchBySerialNumber = async (serialNumber: string): Promise<Product | null> => {
  // Mock implementation, replace with API call
  const products = await getProducts();
  return products.find((p) => p.serialNumber === serialNumber) || null;
};

// Report generation
export const generateMonthlySalesReport = async (year: number, month: number): Promise<Report> => {
  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  try {
    const response = await fetch(`${apiUrl}/reports/sales/monthly?year=${year}&month=${month}`);
    if (!response.ok) {
      throw new Error('Failed to generate monthly sales report');
    }
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error generating monthly sales report:', error);
    throw error;
  }
};

export const generateMonthlyRepairReport = async (year: number, month: number): Promise<Report> => {
  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  try {
    const response = await fetch(`${apiUrl}/reports/monthly?year=${year}&month=${month}`);
    if (!response.ok) {
      throw new Error('Failed to generate monthly repair report');
    }
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error generating monthly repair report:', error);
    throw error;
  }
};

export const generateMonthlyStoreReport = async (year: number, month: number): Promise<Report> => {
  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  try {
    const response = await fetch(`${apiUrl}/reports/store/monthly?year=${year}&month=${month}`);
    if (!response.ok) {
      throw new Error('Failed to generate monthly store report');
    }
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error generating monthly store report:', error);
    throw error;
  }
};

export const generateQuarterlyReport = async (year: number, quarter: number): Promise<Report> => {
  try {
    const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
    const response = await fetch(`${baseUrl}/api/reports/quarterly?year=${year}&quarter=${quarter}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate quarterly report');
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error generating quarterly report:', error);
    throw error;
  }
};

export const generateAnnualReport = async (year: number): Promise<Report> => {
  try {
    const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
    const response = await fetch(`${baseUrl}/api/reports/annual?year=${year}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate annual report');
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error generating annual report:', error);
    throw error;
  }
};

// Add repair function
export const addRepair = async (repairData: any): Promise<Repair> => {
  try {
    const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
    
    // Ensure required fields are present
    if (!repairData.customer) {
      throw new Error('Customer information is required');
    }
    if (!repairData.brand) {
      throw new Error('Device brand is required');
    }
    if (!repairData.model) {
      throw new Error('Device model is required');
    }
    
    // Prepare the repair data with default values
    const sanitizedData = {
      ...repairData,
      deviceType: repairData.deviceType || 'Laptop',
      brand: repairData.brand.trim(),
      model: repairData.model.trim(),
      serialNumber: repairData.serialNumber?.trim() || 'N/A',
      imei: repairData.imei?.trim() || 'N/A',
      issueDescription: repairData.issueDescription || 'Not specified',
      diagnosis: repairData.diagnosis || 'Pending diagnosis',
      repairCost: parseFloat(repairData.repairCost) || 0,
      partsCost: parseFloat(repairData.partsCost) || 0,
      laborCost: parseFloat(repairData.laborCost) || 0,
      priority: repairData.priority || 'medium',
      status: repairData.status || 'received',
      // Format notes as a string with newlines
      notes: Array.isArray(repairData.notes) 
        ? repairData.notes.join('\n')
        : [
            `Issue: ${repairData.issueDescription || 'Not specified'}`,
            `Diagnosis: ${repairData.diagnosis || 'Pending diagnosis'}`,
            `Estimated cost: ₹${parseFloat(repairData.repairCost) || 0}`,
            `Created at: ${new Date().toISOString()}`
          ].join('\n'),
      dateReceived: repairData.dateReceived || new Date().toISOString(),
      estimatedCompletion: repairData.estimatedCompletion || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    
    console.log('=== SENDING REPAIR DATA ===');
    console.log('URL:', `${baseUrl}/api/repairs`);
    console.log('Data:', JSON.stringify(sanitizedData, null, 2));
    
    const response = await fetch(`${baseUrl}/api/repairs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: JSON.stringify(sanitizedData),
      credentials: 'include',
    });

    const responseData = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      console.error('=== REPAIR CREATION FAILED ===');
      console.error('Status:', response.status);
      console.error('Response:', JSON.stringify(responseData, null, 2));
      throw new Error(
        `API request failed with status ${response.status}: ${responseData.message || 'Unknown error'}`
      );
    }
    
    console.log('=== REPAIR CREATED SUCCESSFULLY ===');
    console.log('Response:', JSON.stringify(responseData, null, 2));
    return responseData.data || responseData;
  } catch (error) {
    console.error('Error adding repair:', error);
    throw error;
  }
};

// Define repair metrics interface
interface RepairMetrics {
  totalRepairs: number;
  completedRepairs: number;
  completionRate: number;
  averageRepairTime: number;
  topIssues: Array<{ issue: string; count: number }>;
}

// Calculate repair metrics
const calculateRepairMetrics = async (repairsPromise: Promise<Repair[]>): Promise<RepairMetrics> => {
  const repairsData = await repairsPromise;
  const totalRepairs = repairsData.length;
  const completedRepairs = repairsData.filter(
    (r) => r.status === "completed",
  ).length;
  const totalRevenue = repairsData.reduce(
    (sum, repair) => sum + repair.actualCost,
    0,
  );

  // Average repair time for completed repairs
  const completedRepairsWithTime = repairsData.filter(
    (r) => r.status === "completed" && r.actualCompletion,
  );

  const averageRepairTime =
    completedRepairsWithTime.length > 0
      ? completedRepairsWithTime.reduce((sum, repair) => {
          const start = new Date(repair.dateReceived);
          const end = new Date(repair.actualCompletion!);
          const days = Math.ceil(
            (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
          );
          return sum + days;
        }, 0) / completedRepairsWithTime.length
      : 0;

  // Find the most common repair issue
  const issues = repairsData.reduce((acc, repair) => {
    const issue = repair.issue || repair.issueDescription || 'Unknown';
    acc[issue] = (acc[issue] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topIssues = Object.entries(issues)
    .map(([issue, count]) => ({ issue, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Store performance
  const storePerformance = stores.map((store) => {
    const storeRepairs = repairsData.filter(
      (repair) => repair.storeId === store.id,
    );
    return {
      storeId: store.id,
      repairs: storeRepairs.length,
      revenue: storeRepairs.reduce((sum, repair) => sum + repair.actualCost, 0),
    };
  });

  return {
    totalRepairs,
    completedRepairs,
    averageRepairTime,
    totalRevenue,
    topIssues,
    storePerformance,
  };
};

// Barcode scanning simulation
export const simulateBarcodeScan = async (): Promise<BarcodeResult> => {
  try {
    // Get products first
    const products = await getProducts();
    
    if (!products || products.length === 0) {
      throw new Error('No products available');
    }

    // Simulate scanning delay
    return new Promise((resolve) => {
      setTimeout(() => {
        const randomProduct = products[Math.floor(Math.random() * products.length)];
        
        if (!randomProduct || !randomProduct.barcode) {
          throw new Error('Invalid product data');
        }
        
        resolve({
          text: randomProduct.barcode,
          format: "CODE_128",
        });
      }, 2000);
    });
  } catch (error) {
    console.error('Error in barcode simulation:', error);
    // Return a default barcode if there's an error
    return {
      text: '123456789012',
      format: 'CODE_128',
    };
  }
};

// Real notification service integration
export const sendWhatsAppNotification = async (
  phone: string,
  message: string,
): Promise<boolean> => {
  try {
    console.log('[Notification] Attempting to send WhatsApp:', phone, message);
    const { realNotificationService } = await import(
      "@/services/realNotificationService"
    );
    const result = await realNotificationService.sendWhatsAppMessage(
      phone,
      message,
    );
    console.log('[Notification] WhatsApp result:', result);

    // Show visual confirmation
    const event = new CustomEvent("whatsapp-sent", {
      detail: {
        phone,
        message: message.substring(0, 100) + "...",
        timestamp: new Date().toISOString(),
        real: import.meta.env.VITE_ENABLE_REAL_NOTIFICATIONS === "true",
        messageId: result.messageId,
      },
    });
    window.dispatchEvent(event);

    if (result.success) {
      console.log(`✅ WhatsApp sent to ${phone} (ID: ${result.messageId})`);
      return true;
    } else {
      console.error(`❌ WhatsApp failed: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.error("WhatsApp notification error:", error);
    return false;
  }
};

export const sendEmailNotification = async (
  email: string,
  subject: string,
  htmlContent: string,
): Promise<boolean> => {
  try {
    console.log('[Notification] Attempting to send Email:', email, subject);
    const { realNotificationService } = await import(
      "@/services/realNotificationService"
    );
    const result = await realNotificationService.sendEmail(
      email,
      subject,
      htmlContent,
    );
    console.log('[Notification] Email result:', result);

    // Show visual confirmation
    const event = new CustomEvent("email-sent", {
      detail: {
        email,
        subject,
        message: result.success
          ? "Email sent successfully"
          : result.error || "Email failed",
        timestamp: new Date().toISOString(),
        real: import.meta.env.VITE_ENABLE_REAL_NOTIFICATIONS === "true",
        messageId: result.messageId,
      },
    });
    window.dispatchEvent(event);

    if (result.success) {
      console.log(`✅ Email sent to ${email} (ID: ${result.messageId})`);
      return true;
    } else {
      console.error(`❌ Email failed: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.error("Email notification error:", error);
    return false;
  }
};

export const getStores = async (): Promise<any[]> => {
  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  try {
    const response = await fetch(`${apiUrl}/stores`);
    if (!response.ok) {
      throw new Error('Failed to fetch stores');
    }
    const data = await response.json();
    return Array.isArray(data.data) ? data.data : [];
  } catch (error) {
    console.error('Error fetching stores:', error);
    return [];
  }
};

export { getStores as fetchStores };
