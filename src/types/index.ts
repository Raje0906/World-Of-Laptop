export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  postalCode?: string; // Alias for pincode for compatibility
  country?: string;
}

export interface Customer {
  _id?: string;
  id: string;
  name: string;
  email: string;
  phone: string;
  address: Address;
  city: string; // Keeping for backward compatibility
  dateAdded: string;
  totalPurchases: number;
  lastPurchase?: string;
  status: "active" | "inactive";
}

export interface Product {
  _id?: string;
  id: string;
  name: string;
  brand: string;
  model: string;
  serialNumber: string;
  barcode: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  storeId: string;
  specifications: Record<string, string>;
  images: string[];
  status: "available" | "out-of-stock" | "discontinued";
  dateAdded: string;
}

export interface Sale {
  id: string;
  customerId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  discount: number;
  tax: number;
  finalAmount: number;
  paymentMethod: "cash" | "card" | "upi" | "emi";
  storeId: string;
  salesPersonId: string;
  date: string;
  status: "completed" | "pending" | "cancelled" | "refunded";
  warranty: {
    duration: number; // in months
    startDate: string;
    endDate: string;
  };
}

export interface Repair {
  id: string;
  customerId: string;
  productId?: string;
  deviceInfo: {
    brand: string;
    model: string;
    serialNumber?: string;
    imei?: string;
  };
  issue: string;
  diagnosis: string;
  estimatedCost: number;
  actualCost: number;
  parts: Array<{
    name: string;
    cost: number;
    quantity: number;
  }>;
  labor: number;
  status:
    | "received"
    | "diagnosing"
    | "approved"
    | "in-progress"
    | "completed"
    | "delivered"
    | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  storeId: string;
  technicianId: string;
  dateReceived: string;
  estimatedCompletion?: string;
  actualCompletion?: string;
  notes: string[];
  customerNotified: {
    whatsapp: boolean;
    email: boolean;
    lastNotified?: string;
  };
  contactInfo?: {
    whatsappNumber: string;
    notificationEmail: string;
    consentGiven: boolean;
    consentDate: string;
  };
}

export interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  manager: string;
  color: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "manager" | "sales" | "technician" | "admin";
  storeId: string;
  dateJoined: string;
  isActive: boolean;
}

export interface Report {
  period: "monthly" | "quarterly" | "annually";
  year: number;
  month?: number;
  quarter?: number;
  sales: {
    totalRevenue: number;
    totalTransactions: number;
    averageOrderValue: number;
    topProducts: Array<{
      productId: string;
      name: string;
      quantity: number;
      revenue: number;
    }>;
    storePerformance: Array<{
      storeId: string;
      revenue: number;
      transactions: number;
    }>;
  };
  repairs: {
    totalRepairs: number;
    completedRepairs: number;
    averageRepairTime: number; // in days
    totalRevenue: number;
    topIssues: Array<{
      issue: string;
      count: number;
    }>;
    storePerformance: Array<{
      storeId: string;
      repairs: number;
      revenue: number;
    }>;
  };
}

export interface BarcodeResult {
  text: string;
  format: string;
}

export interface NotificationTemplate {
  id: string;
  type: "repair-status" | "repair-complete" | "payment-reminder";
  title: string;
  whatsappTemplate: string;
  emailTemplate: string;
  emailSubject: string;
}

export type SearchableFields =
  | "name"
  | "email"
  | "phone"
  | "serialNumber"
  | "barcode";

export interface SearchFilters {
  query: string;
  field: SearchableFields;
  storeId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}
