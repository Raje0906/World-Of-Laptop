import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Wrench,
  Users,
  Package,
  IndianRupee,
  AlertTriangle,
} from 'lucide-react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  TooltipProps,
} from 'recharts';
import { toast } from 'sonner';
import { Users as UsersIcon } from 'lucide-react';

// Define types for our data models
interface Sale {
  id: string;
  amount?: number;
  total?: number;
  items?: Array<{ id: string; quantity: number; price: number }>;
  date?: string;
  status?: string;
}

interface Repair {
  id: string;
  device?: string;
  status?: string;
  date?: string;
  cost?: number;
}

interface Customer {
  id: string;
  name?: string;
  email?: string;
  isActive: boolean;
  joinDate?: string;
}

interface Product {
  id: string;
  name?: string;
  stockQuantity?: number;
  minStockLevel?: number;
  price?: number;
  category?: string;
}

interface DashboardMetrics {
  totalSales: number;
  totalRevenue: number;
  activeCustomers: number;
  lowStockItems: number;
  salesTrend: number;
  revenueTrend: number;
}

interface ChartData {
  name: string;
  sales: number;
  [key: string]: any;
}

interface StoreData {
  id: string;
  name: string;
  sales: number;
  revenue: number;
  repairs: number;
  color?: string;
}

interface Activity {
  id: string;
  type: 'sale' | 'repair' | 'inventory' | 'customer';
  title: string;
  description: string;
  timestamp: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive?: boolean;
  store_id?: { name: string; address: string; _id: string } | null;
}

import { useApiHealth } from '@/hooks/useApi';

// Mock data initialization
const initializeData = () => ({
  sales: [] as Sale[],
  repairs: [] as Repair[],
  customers: [] as Customer[],
  products: [] as Product[]
});

// Mock API functions
const fetchSales = async (): Promise<Sale[]> => [];
const fetchRepairs = async (): Promise<Repair[]> => [];
const fetchCustomers = async (): Promise<Customer[]> => [];
const fetchProducts = async (): Promise<Product[]> => [];

// Mock store data
const stores: StoreData[] = [
  { 
    id: '1', 
    name: 'Main Store', 
    sales: 0, 
    revenue: 0, 
    repairs: 0,
    color: '#3b82f6' 
  },
  { 
    id: '2', 
    name: 'Downtown', 
    sales: 0, 
    revenue: 0, 
    repairs: 0,
    color: '#10b981' 
  },
  { 
    id: '3', 
    name: 'Uptown', 
    sales: 0, 
    revenue: 0, 
    repairs: 0,
    color: '#f59e0b' 
  },
];

// Custom tooltip component for charts
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
        <p className="font-medium">{label}</p>
        {payload.map((entry, index) => (
          <p key={`tooltip-${index}`} style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalSales: 0,
    totalRevenue: 0,
    activeCustomers: 0,
    salesTrend: 0,
    revenueTrend: 0,
  });
  const [salesData, setSalesData] = useState<ChartData[]>([]);
  const [storeMetrics, setStoreMetrics] = useState<StoreData[]>(stores);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHealthy, setIsHealthy] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [isConnected, setIsConnected] = useState(true);
  const { lastCheck: lastChecked } = useApiHealth();
  const [users, setUsers] = useState<User[]>([]);
  const [userCount, setUserCount] = useState(0);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch data in parallel
      const [sales, repairs, customers, products] = await Promise.all([
        fetchSales(),
        fetchRepairs(),
        fetchCustomers(),
        fetchProducts(),
      ]);

      // Calculate metrics
      const totalSales = sales.reduce((sum, sale) => sum + (sale.amount || 0), 0);
      const totalRevenue = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
      const activeCustomers = customers.filter(c => c.isActive).length;
      const lowStockItems = products.filter(p => (p.stockQuantity || 0) <= (p.minStockLevel || 0)).length;
      
      // Calculate trends (simplified example)
      const salesTrend = sales.length > 0 ? 5.2 : 0;
      const revenueTrend = sales.length > 0 ? 8.7 : 0;

      setMetrics({
        totalSales,
        totalRevenue,
        activeCustomers,
        lowStockItems,
        salesTrend,
        revenueTrend,
      });

      // Prepare chart data
      const monthlySales = Array(12).fill(0).map((_, index) => ({
        name: new Date(2023, index).toLocaleString('default', { month: 'short' }),
        sales: Math.floor(Math.random() * 1000) + 500,
      }));
      setSalesData(monthlySales);

      // Prepare store metrics with random data
      const updatedStoreMetrics = stores.map(store => ({
        ...store,
        sales: Math.floor(Math.random() * 1000),
        revenue: Math.floor(Math.random() * 5000) + 1000,
        repairs: Math.floor(Math.random() * 50),
      }));
      setStoreMetrics(updatedStoreMetrics);

      // Prepare recent activity
      const activities: Activity[] = [
        ...sales.slice(0, 5).map(sale => ({
          id: `sale-${sale.id}`,
          type: 'sale' as const,
          title: `New Sale: ${sale.id}`,
          description: `$${sale.total?.toFixed(2)} - ${sale.items?.length || 0} items`,
          timestamp: sale.date || new Date().toISOString(),
        })),
        ...repairs.slice(0, 3).map(repair => ({
          id: `repair-${repair.id}`,
          type: 'repair' as const,
          title: `Repair ${repair.status}`,
          description: repair.device || 'Device',
          timestamp: repair.date || new Date().toISOString(),
        })),
      ]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);

      setRecentActivity(activities);

      // Fetch users
      const fetchUsers = async () => {
        try {
          const token = localStorage.getItem("token");
          const res = await fetch("/api/auth/admin/users", {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          const data = await res.json();
          setUsers(data.data.users || []);
          setUserCount((data.data.users || []).length);
        } catch (err) {
          setUsers([]);
          setUserCount(0);
        }
      };
      fetchUsers();
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data. Please try again later.');
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
              <div className="mt-2">
                <Button
                  variant="outline"
                  onClick={loadDashboardData}
                  className="text-sm text-red-500 hover:text-red-600"
                >
                  Retry
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* SystemStatus removed */}
      {/* Quick Actions removed */}
      
      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalSales}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.salesTrend >= 0 ? (
                <span className="text-green-500 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {metrics.salesTrend}% from last month
                </span>
              ) : (
                <span className="text-red-500 flex items-center">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  {Math.abs(metrics.salesTrend)}% from last month
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{metrics.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.revenueTrend >= 0 ? (
                <span className="text-green-500 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {metrics.revenueTrend}% from last month
                </span>
              ) : (
                <span className="text-red-500 flex items-center">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  {Math.abs(metrics.revenueTrend)}% from last month
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeCustomers}</div>
            <p className="text-xs text-muted-foreground">
              +20.1% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.lowStockItems}</div>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Stock Status</span>
                <span>{Math.round((metrics.lowStockItems / 50) * 100)}%</span>
              </div>
              <Progress value={(metrics.lowStockItems / 50) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userCount}</div>
            <p className="text-xs text-muted-foreground">
              Total number of users in the system
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
            <CardDescription>Monthly sales performance</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Store Performance</CardTitle>
            <CardDescription>Sales by store location</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={storeMetrics}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="revenue"
                    label={({ name, percent }) => 
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {storeMetrics.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest sales and repairs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-shrink-0 mr-3">
                    {activity.type === 'sale' ? (
                      <div className="p-2 rounded-full bg-green-100 text-green-600">
                        <ShoppingCart className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                        <Wrench className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {activity.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {activity.description}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No recent activity
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
