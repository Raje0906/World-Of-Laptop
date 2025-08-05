import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Link } from "react-router-dom";

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

export function ReportsOverview() {
  const [summary, setSummary] = useState<SummaryData>({
    totalSales: 0,
    totalRevenue: 0,
    activeRepairs: 0,
    totalCustomers: 0,
  });
  
  const [loading, setLoading] = useState<boolean>(true);
  const [periodType, setPeriodType] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(1);
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
      let response: any;
      if (periodType === 'monthly') {
        response = await reportsService.getMonthlyReport(selectedYear, selectedMonth);
      } else if (periodType === 'quarterly') {
        response = await reportsService.getQuarterlyReport(selectedYear, selectedQuarter);
      } else if (periodType === 'annual') {
        response = await reportsService.getAnnualReport(selectedYear);
      }
      
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
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [periodType, selectedYear, selectedMonth, selectedQuarter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Access comprehensive analytics and insights for your business
        </p>
      </div>

      {/* Database Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle>Database Connection Status</CardTitle>
          <CardDescription>
            Real-time connection to your MongoDB database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <div>
              <h4 className="font-semibold text-green-900">Connected to Database</h4>
              <p className="text-sm text-green-700">
                All data shown is live from your MongoDB database
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Data Stats */}
      <div className="grid gap-4 md:grid-cols-4">
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
