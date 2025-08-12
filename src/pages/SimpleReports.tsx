import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Wrench, 
  Calendar,
  Download,
  RefreshCw,
  Loader2,
  ShoppingCart,
  Store,
  Package
} from "lucide-react";
import { reportsService } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

// Type definitions
interface SummaryData {
  totalSales: number;
  totalRevenue: number;
  activeRepairs: number;
  totalCustomers: number;
}

interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: any;
}

interface StoreDataPoint {
  name: string;
  revenue: number;
  repairs: number;
}

interface ReportResponse {
  success: boolean;
  data: {
    period?: string;
    repairs?: {
      totalRepairs: number;
      completedRepairs: number;
      averageRepairTime: number;
      totalRevenue: number;
      statusCounts?: Record<string, number>;
      storePerformance?: Array<{
        storeId: string;
        revenue: number;
        repairs: number;
      }>;
    };
  };
}

export default function SimpleReports() {
  const [summary, setSummary] = useState<SummaryData>({
    totalSales: 0,
    totalRevenue: 0,
    activeRepairs: 0,
    totalCustomers: 0,
  });
  
  const [loading, setLoading] = useState<boolean>(true);
  const [trendData, setTrendData] = useState<ChartDataPoint[]>([]);
  const [repairData, setRepairData] = useState<ChartDataPoint[]>([]);
  const [storeData, setStoreData] = useState<StoreDataPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const fetchSummary = async () => {
    try {
      const response = await reportsService.getSummary();
      
      if (response.success && response.data) {
        setSummary({
          totalSales: response.data.totalSales,
          totalRevenue: response.data.totalRevenue,
          activeRepairs: response.data.activeRepairs,
          totalCustomers: response.data.totalCustomers,
        });
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to load summary data",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
      toast({
        title: "Error",
        description: "Failed to load summary data. Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchReportData = async (): Promise<void> => {
    setTrendLoading(true);
    try {
      const response = await reportsService.getMonthlyReport(new Date().getFullYear(), new Date().getMonth() + 1);
      
      if (response.success && response.data) {
        const { repairs } = response.data;
        
        // Create trend data (repairs by status)
        const statusCounts = repairs.statusCounts || {};
        const newTrendData: ChartDataPoint[] = Object.entries(statusCounts).map(([status, count]) => ({
          name: status,
          value: count as number
        }));
        
        // Create repair completion data
        const newRepairData: ChartDataPoint[] = [
          { name: 'Completed', value: repairs.completedRepairs || 0 },
          { 
            name: 'In Progress', 
            value: Math.max(0, (repairs.totalRepairs || 0) - (repairs.completedRepairs || 0)) 
          }
        ];
        
        // Create store performance data
        const newStoreData: StoreDataPoint[] = Array.isArray(repairs.storePerformance) 
          ? repairs.storePerformance.map(store => ({
              name: store.storeId || 'Unknown',
              revenue: store.revenue || 0,
              repairs: store.repairs || 0
            }))
          : [];
        
        setTrendData(newTrendData);
        setRepairData(newRepairData);
        setStoreData(newStoreData);
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to load report data",
          variant: "destructive",
        });
        setTrendData([]);
        setRepairData([]);
        setStoreData([]);
      }
    } catch (error) {
      console.error("Error fetching report data:", error);
      toast({
        title: "Error",
        description: "Failed to load report data. Please check your connection and try again.",
        variant: "destructive",
      });
      setTrendData([]);
      setRepairData([]);
      setStoreData([]);
    } finally {
      setTrendLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchReportData();
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Reports & Analytics
        </h1>
        <p className="text-gray-600">
          Comprehensive business insights and performance metrics from live database
        </p>
      </div>



      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                summary.totalSales.toLocaleString()
              )}
            </div>
            <p className="text-xs text-muted-foreground">Live from database</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                `₹${summary.totalRevenue.toLocaleString()}`
              )}
            </div>
            <p className="text-xs text-muted-foreground">Real-time calculation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Repairs</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                summary.activeRepairs.toLocaleString()
              )}
            </div>
            <p className="text-xs text-muted-foreground">Currently in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                summary.totalCustomers.toLocaleString()
              )}
            </div>
            <p className="text-xs text-muted-foreground">Registered customers</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Repair Status Distribution</CardTitle>
            <CardDescription>Current repair status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trendLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : trendData.length > 0 ? (
                trendData.map((item, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-24 text-sm font-medium">{item.name}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="bg-blue-200 h-6 rounded"
                          style={{ 
                            width: `${(item.value / Math.max(...trendData.map(d => d.value))) * 100}%` 
                          }}
                        ></div>
                        <span className="text-sm text-gray-600">{item.value}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No repair data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Repairs Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Repair Completion</CardTitle>
            <CardDescription>Completed vs in-progress repairs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trendLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : repairData.length > 0 ? (
                repairData.map((item, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-24 text-sm font-medium">{item.name}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="bg-orange-200 h-6 rounded"
                          style={{ 
                            width: `${(item.value / Math.max(...repairData.map(d => d.value))) * 100}%` 
                          }}
                        ></div>
                        <span className="text-sm text-gray-600">
                          {item.value}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-green-600">
                      {Math.round((item.value / repairData.reduce((sum, d) => sum + d.value, 0)) * 100)}%
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No repair completion data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Store Performance */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Store Performance</CardTitle>
          <CardDescription>Revenue and repair metrics by store</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Store
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Repairs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trendLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : storeData.length > 0 ? (
                  storeData.map((store, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {store.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{store.revenue.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {store.repairs} repairs
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div
                            className="bg-green-200 h-2 rounded-full"
                            style={{
                              width: `${(store.revenue / Math.max(...storeData.map(s => s.revenue))) * 100}%`,
                              maxWidth: "100px",
                            }}
                          ></div>
                          <span className="ml-2 text-sm text-gray-500">
                            {Math.round((store.revenue / Math.max(...storeData.map(s => s.revenue))) * 100)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                      No store performance data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Data Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Real-Time Data Analytics</CardTitle>
              <CardDescription>
                Live data from your database with advanced filtering options
              </CardDescription>
            </div>
            <Button 
              onClick={() => {
                setLoading(true);
                fetchSummary();
                fetchReportData();
              }}
              disabled={loading || trendLoading}
              variant="outline"
              size="sm"
            >
              {loading || trendLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh Data
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <h4 className="font-semibold text-blue-900">
                  Real-Time Updates
                </h4>
                <p className="text-sm text-blue-700">
                  Data refreshes automatically from your live database
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600 mt-1" />
              <div>
                <h4 className="font-semibold text-green-900">
                  Live Analytics
                </h4>
                <p className="text-sm text-green-700">
                  Real-time charts and metrics from actual business data
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
              <Users className="w-6 h-6 text-purple-600 mt-1" />
              <div>
                <h4 className="font-semibold text-purple-900">
                  Database Connected
                </h4>
                <p className="text-sm text-purple-700">
                  Direct connection to MongoDB for accurate reporting
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg">
              <Package className="w-6 h-6 text-orange-600 mt-1" />
              <div>
                <h4 className="font-semibold text-orange-900">Export Ready</h4>
                <p className="text-sm text-orange-700">
                  Download real data for external analysis and sharing
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
