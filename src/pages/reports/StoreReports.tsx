import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  Store,
  TrendingUp,
  Users,
  Package,
  Download,
  Calendar,
  MapPin,
  Phone,
  Crown,
  Target,
} from "lucide-react";
import {
  generateMonthlyStoreReport,
  generateQuarterlyReport,
  generateAnnualReport,
  fetchStores,
  saveStoresToIDB,
  getStoresFromIDB,
} from "@/lib/dataUtils";
import { Report } from "@/types";

export function StoreReports() {
  const [reportType, setReportType] = useState<
    "monthly" | "quarterly" | "annually"
  >("monthly");
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth() + 1,
  );
  const [selectedQuarter, setSelectedQuarter] = useState<number>(
    Math.ceil((new Date().getMonth() + 1) / 3),
  );
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stores, setStores] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  const generateReport = useCallback(async () => {
    setIsLoading(true);
    try {
      let generatedReport: Report | null = null;
      switch (reportType) {
        case "monthly":
          generatedReport = await generateMonthlyStoreReport(selectedYear, selectedMonth);
          break;
        case "quarterly":
          // You might need to create a quarterly store report endpoint as well
          console.warn("Quarterly store report not implemented, using mock data.");
          // generatedReport = await generateQuarterlyStoreReport(selectedYear, selectedQuarter);
          break;
        case "annually":
          // You might need to create an annual store report endpoint as well
          console.warn("Annual store report not implemented, using mock data.");
          // generatedReport = await generateAnnualStoreReport(selectedYear);
          break;
      }
      setReport(generatedReport);
    } catch (error) {
      console.error("Error generating report:", error);
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  }, [reportType, selectedYear, selectedMonth, selectedQuarter]);

  // Generate report when dependencies change
  useEffect(() => {
    generateReport();
  }, [generateReport]);

  useEffect(() => {
    const loadStores = async () => {
      setIsLoading(true);
      try {
        let data = [];
        if (navigator.onLine) {
          data = await fetchStores();
          await saveStoresToIDB(data);
        } else {
          data = await getStoresFromIDB();
        }
        setStores(data);
      } catch (error) {
        console.error("Failed to load stores", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadStores();
    fetch("/api/users?role=employee")
      .then((res) => res.json())
      .then((data) => setEmployees(data.data || []))
      .catch((err) => console.error("Failed to fetch employees", err));
  }, []);

  const getStoreName = (storeId: string) => {
    return stores.find((s) => s._id === storeId)?.name || "Unknown Store";
  };

  const getStoreDetails = (storeId: string) => {
    return stores.find((s) => s._id === storeId);
  };

  const getStoreEmployees = (storeId: string) => {
    return employees.filter((e) => e.storeId === storeId);
  };

  const formatPeriod = () => {
    switch (reportType) {
      case "monthly":
        return `${new Date(selectedYear, selectedMonth - 1).toLocaleString("default", { month: "long" })} ${selectedYear}`;
      case "quarterly":
        return `Q${selectedQuarter} ${selectedYear}`;
      case "annually":
        return `${selectedYear}`;
      default:
        return "";
    }
  };

  const calculateStoreMetrics = () => {
    if (!report || !report.sales || !report.repairs) return [];

    const salesByStore = report.sales.storePerformance || [];
    const repairsByStore = report.repairs.storePerformance || [];

    return stores.map((store) => {
      const salesData = salesByStore.find(
        (s) => s.storeId === store._id,
      ) || { revenue: 0, transactions: 0 };

      const repairData = repairsByStore.find(
        (r) => r.storeId === store._id,
      ) || { repairs: 0, revenue: 0 };

      const storeEmployees = getStoreEmployees(store._id);
      const totalRevenue = salesData.revenue + repairData.revenue;
      const avgRevenuePerEmployee =
        storeEmployees.length > 0 ? totalRevenue / storeEmployees.length : 0;

      return {
        ...store,
        salesRevenue: salesData.revenue,
        salesTransactions: salesData.transactions,
        repairRevenue: repairData.revenue,
        repairCount: repairData.repairs,
        totalRevenue,
        employeeCount: storeEmployees.length,
        avgRevenuePerEmployee,
      };
    });
  };

  const getBestPerformingStore = () => {
    const metrics = calculateStoreMetrics();
    if (!metrics || metrics.length === 0) return null;
    return metrics.reduce((best, current) =>
      current.totalRevenue > best.totalRevenue ? current : best,
    );
  };

  const calculatePerformanceScore = (storeMetrics: any) => {
    const maxRevenue = Math.max(
      ...calculateStoreMetrics().map((s) => s.totalRevenue),
    );
    const maxTransactions = Math.max(
      ...calculateStoreMetrics().map((s) => s.salesTransactions),
    );
    const maxRepairs = Math.max(
      ...calculateStoreMetrics().map((s) => s.repairCount),
    );

    const revenueScore =
      maxRevenue > 0 ? storeMetrics.totalRevenue / maxRevenue : 0;
    const transactionScore =
      maxTransactions > 0
        ? storeMetrics.salesTransactions / maxTransactions
        : 0;
    const repairScore =
      maxRepairs > 0 ? storeMetrics.repairCount / maxRepairs : 0;

    return Math.round(
      ((revenueScore + transactionScore + repairScore) / 3) * 100,
    );
  };

  const exportReport = () => {
    if (!report) return;

    const storeMetrics = calculateStoreMetrics();
    const data = {
      period: formatPeriod(),
      reportType,
      generated: new Date().toISOString(),
      storePerformance: storeMetrics,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `store-report-${reportType}-${selectedYear}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const storeMetrics = report ? calculateStoreMetrics() : [];
  const bestStore = report ? getBestPerformingStore() : null;
  const totalNetworkRevenue = storeMetrics.reduce(
    (sum, store) => sum + store.totalRevenue,
    0,
  );

  // Prepare data for radar chart
  const radarData = storeMetrics.map((store) => ({
    store: store.name.split(" - ")[1] || "Store",
    sales: store.salesRevenue / 10000, // Scale down for visualization
    repairs: store.repairRevenue / 1000,
    transactions: store.salesTransactions,
    efficiency: store.avgRevenuePerEmployee / 1000,
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Store Reports</h1>
          <p className="text-gray-600 mt-2">
            Compare performance across all store locations
          </p>
        </div>
        <Button onClick={exportReport} disabled={!report}>
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Report Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <label className="text-sm font-medium">Report Type</label>
              <Select
                value={reportType}
                onValueChange={(value: any) => setReportType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Year</label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {reportType === "monthly" && (
              <div>
                <label className="text-sm font-medium">Month</label>
                <Select
                  value={selectedMonth.toString()}
                  onValueChange={(value) => setSelectedMonth(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => {
                      const month = i + 1;
                      const monthName = new Date(2024, i).toLocaleString(
                        "default",
                        { month: "long" },
                      );
                      return (
                        <SelectItem key={month} value={month.toString()}>
                          {monthName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {reportType === "quarterly" && (
              <div>
                <label className="text-sm font-medium">Quarter</label>
                <Select
                  value={selectedQuarter.toString()}
                  onValueChange={(value) => setSelectedQuarter(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Q1 (Jan-Mar)</SelectItem>
                    <SelectItem value="2">Q2 (Apr-Jun)</SelectItem>
                    <SelectItem value="3">Q3 (Jul-Sep)</SelectItem>
                    <SelectItem value="4">Q4 (Oct-Dec)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Store Focus</label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stores</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store._id} value={store._id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={generateReport} className="w-full">
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {report && (
        <>
          {/* Network Overview */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Network Revenue
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{(totalNetworkRevenue / 100000).toFixed(1)}L
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatPeriod()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Stores
                </CardTitle>
                <Store className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stores.length}</div>
                <p className="text-xs text-muted-foreground">
                  Active locations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Staff
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{employees.length}</div>
                <p className="text-xs text-muted-foreground">Team members</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Best Performer
                </CardTitle>
                <Crown className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  {bestStore ? bestStore.name.split(" - ")[1] : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  ₹{bestStore ? (bestStore.totalRevenue / 1000).toFixed(0) : 0}K
                  revenue
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Store Comparison Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Comparison</CardTitle>
                <CardDescription>
                  Sales vs Repair revenue by store
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={storeMetrics}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                    <XAxis
                      dataKey="name"
                      tickFormatter={(value) =>
                        value.split(" - ")[1] || "Store"
                      }
                      axisLine={true}
                      tickLine={true}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tickFormatter={(value) =>
                        `₹${(value / 1000).toFixed(0)}K`
                      }
                      axisLine={true}
                      tickLine={true}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value: any) => [
                        `₹${value.toLocaleString()}`,
                        "",
                      ]}
                      labelFormatter={(label) => label}
                      contentStyle={{
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                      }}
                    />
                    <Bar
                      dataKey="salesRevenue"
                      name="Sales Revenue"
                      fill="#3b82f6"
                      stackId="revenue"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="repairRevenue"
                      name="Repair Revenue"
                      fill="#10b981"
                      stackId="revenue"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Radar</CardTitle>
                <CardDescription>
                  Multi-dimensional store comparison
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="store" />
                    <PolarRadiusAxis />
                    <Radar
                      name="Sales (₹10K)"
                      dataKey="sales"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.1}
                    />
                    <Radar
                      name="Repairs (₹1K)"
                      dataKey="repairs"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.1}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Store Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Store Performance</CardTitle>
              <CardDescription>
                Comprehensive metrics for all store locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead>Sales</TableHead>
                    <TableHead>Repairs</TableHead>
                    <TableHead>Total Revenue</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {storeMetrics
                    .sort((a, b) => b.totalRevenue - a.totalRevenue)
                    .map((store, index) => {
                      const performanceScore = calculatePerformanceScore(store);
                      return (
                        <TableRow key={store._id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {index === 0 && (
                                <Crown className="w-4 h-4 text-yellow-600" />
                              )}
                              <div>
                                <p className="font-medium">{store.name}</p>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <MapPin className="w-3 h-3" />
                                  {typeof store.address === 'string' ? store.address.split(",")[0] : ''}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                ₹{store.salesRevenue.toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-500">
                                {store.salesTransactions} transactions
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                ₹{store.repairRevenue.toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-500">
                                {store.repairCount} repairs
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-bold">
                              ₹{store.totalRevenue.toLocaleString()}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              {store.employeeCount}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <Progress
                                value={performanceScore}
                                className="w-16 h-2 mb-1"
                              />
                              <p className="text-xs text-gray-500">
                                ₹
                                {Math.round(store.avgRevenuePerEmployee / 1000)}
                                K/employee
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                performanceScore >= 80
                                  ? "default"
                                  : performanceScore >= 60
                                    ? "outline"
                                    : "secondary"
                              }
                            >
                              {performanceScore}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Store Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Store Directory</CardTitle>
              <CardDescription>
                Contact information and management details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {stores.map((store) => {
                  const storeMetric = storeMetrics.find(
                    (s) => s._id === store._id,
                  );
                  const storeEmployees = getStoreEmployees(store._id);
                  const manager = storeEmployees.find(
                    (e) => e.role === "manager",
                  );

                  return (
                    <Card key={store._id} className="relative">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: store.color }}
                          />
                          {store.name}
                        </CardTitle>
                        {storeMetric && (
                          <Badge variant="outline" className="w-fit">
                            {calculatePerformanceScore(storeMetric)}%
                            Performance
                          </Badge>
                        )}
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                            <span>{
                              typeof store.address === 'string'
                                ? store.address
                                : store.address && typeof store.address === 'object'
                                  ? [store.address.street, store.address.city, store.address.state, store.address.zipCode, store.address.country].filter(Boolean).join(', ')
                                  : ''
                            }</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-500" />
                            <span>{store.phone}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-500" />
                            <span>
                              Manager: {manager?.name || "Not assigned"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-gray-500" />
                            <span>{storeEmployees.length} team members</span>
                          </div>
                          {storeMetric && (
                            <div className="pt-2 border-t">
                              <p className="font-medium">
                                ₹{storeMetric.totalRevenue.toLocaleString()}{" "}
                                revenue
                              </p>
                              <p className="text-xs text-gray-500">
                                {storeMetric.salesTransactions} sales •{" "}
                                {storeMetric.repairCount} repairs
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
