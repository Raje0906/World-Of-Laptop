export interface DashboardMetrics {
  totalSales: number;
  totalRevenue: number;
  activeRepairs: number;
  completedRepairs: number;
  totalCustomers: number;
  monthlyGrowth: number;
  repairAvgTime: number;
}

export interface ChartData {
  name: string;
  sales: number;
  repairs: number;
  revenue: number;
}

export interface StoreData {
  id: string;
  name: string;
  sales: number;
  revenue: number;
  repairs: number;
}

export interface Activity {
  id: string;
  type: 'sale' | 'repair' | 'inventory' | 'customer';
  title: string;
  description: string;
  timestamp: Date;
  status?: 'completed' | 'pending' | 'in-progress' | 'cancelled';
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  min_stock_level: number;
  category: string;
  brand?: string;
  model?: string;
  sku?: string;
  status?: 'active' | 'inactive' | 'discontinued';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Sale {
  id: string;
  date: Date;
  totalAmount: number;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  customerId?: string;
  status: 'completed' | 'pending' | 'cancelled';
  paymentMethod?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Repair {
  id: string;
  customerId: string;
  device: string;
  issue: string;
  status: 'pending' | 'in-progress' | 'completed' | 'delivered' | 'cancelled';
  estimatedCost?: number;
  finalCost?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}
