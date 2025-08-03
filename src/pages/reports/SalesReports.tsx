import React, { useState, useEffect } from "react";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Download,
  Calendar,
  Store,
  Users,
  Loader2,
} from "lucide-react";
import {
  generateMonthlySalesReport,
  generateQuarterlyReport,
  generateAnnualReport,
  getCustomers,
  getProducts,
} from "@/lib/dataUtils";
import { Report } from "@/types";
import * as XLSX from "xlsx";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function SalesReports() {
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
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const generateReport = async () => {
      setIsLoading(true);
      try {
        let generatedReport: Report | null = null;
        switch (reportType) {
          case "monthly":
            generatedReport = await generateMonthlySalesReport(selectedYear, selectedMonth);
            break;
          case "quarterly":
            generatedReport = await generateQuarterlyReport(
              selectedYear,
              selectedQuarter,
            );
            break;
          case "annually":
            generatedReport = await generateAnnualReport(selectedYear);
            break;
          default:
            generatedReport = await generateMonthlySalesReport(selectedYear, selectedMonth);
        }
        setReport(generatedReport);
      } catch (error) {
        console.error("Error generating report:", error);
        setError("An error occurred while generating the report.");
        setReport(null);
      } finally {
        setIsLoading(false);
      }
    };
    generateReport();
  }, [reportType, selectedYear, selectedMonth, selectedQuarter]);

  useEffect(() => {
    fetch("/api/stores")
      .then((res) => res.json())
      .then((data) => setStores(data.data || []))
      .catch((err) => console.error("Failed to fetch stores", err));
    fetch("/api/products?limit=1000")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data && data.data.products) {
          setProducts(data.data.products);
        } else {
          setProducts([]);
          console.warn("Products API did not return expected data", data);
        }
      })
      .catch((err) => {
        setProducts([]);
        console.error("Failed to fetch products", err);
      });
  }, []);

  const getStoreName = (storeId: string) => {
    return stores.find((s) => s._id === storeId)?.name || "Unknown Store";
  };

  const getProductName = (productId: string) => {
    if (!products || products.length === 0) return "Unknown Product";
    return products.find((p) => p._id === productId)?.name || "Unknown Product";
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

  const exportReport = () => {
    if (!report) return;

    // Store Performance Sheet
    const storePerf = (report.sales?.storePerformance || []).map((store: any) => ({
      'Store ID': store.storeId,
      'Revenue': store.revenue,
      'Transactions': store.transactions,
    }));
    // Top Products Sheet
    const topProducts = (report.sales?.topProducts || []).map((prod: any) => ({
      'Product ID': prod.productId,
      'Name': prod.name,
      'Quantity Sold': prod.quantity,
      'Revenue': prod.revenue,
    }));
    // Summary Sheet
    const summary = [{
      'Period': formatPeriod(),
      'Report Type': reportType,
      'Generated': new Date().toISOString(),
      'Total Revenue': report.sales?.totalRevenue,
      'Total Transactions': report.sales?.totalTransactions,
      'Average Order Value': report.sales?.averageOrderValue,
    }];

    const wb = XLSX.utils.book_new();
    if (storePerf.length > 0) {
      const ws1 = XLSX.utils.json_to_sheet(storePerf);
      XLSX.utils.book_append_sheet(wb, ws1, 'Store Performance');
    }
    if (topProducts.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(topProducts);
      XLSX.utils.book_append_sheet(wb, ws2, 'Top Products');
    }
    const ws3 = XLSX.utils.json_to_sheet(summary);
    XLSX.utils.book_append_sheet(wb, ws3, 'Summary');
    XLSX.writeFile(wb, `sales-report-${reportType}-${selectedYear}.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="space-y-6">
        {/* Render filters so user can re-trigger report */}
        <p className="text-center text-gray-500">
          No report data available. Please select your desired report period.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales Reports</h1>
          <p className="text-gray-600 mt-2">
            Analyze sales performance and trends
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
          <div className="grid gap-4 md:grid-cols-4">
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

            <div className="flex items-end">
              <Button
                onClick={() => generateMonthlySalesReport(selectedYear, selectedMonth)}
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Report"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="ml-4 text-muted-foreground">Generating report...</p>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-destructive">
          <h4 className="font-semibold">Error</h4>
          <p>{error}</p>
        </div>
      )}

      {report && (
        <>
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{(report.sales.totalRevenue / 100000).toFixed(1)}L
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatPeriod()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Sales
                </CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {report.sales.totalTransactions}
                </div>
                <p className="text-xs text-muted-foreground">
                  Completed transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Order Value
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{Math.round(report.sales.averageOrderValue).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Per transaction</p>
              </CardContent>
            </Card>

            {report.sales.storePerformance?.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Best Store
                  </CardTitle>
                  <Store className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">
                    {getStoreName(
                      report.sales.storePerformance.reduce((a, b) =>
                        a.revenue > b.revenue ? a : b
                      ).storeId
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Highest revenue
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Store Performance Chart */}
            {report.sales.storePerformance?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Store Performance</CardTitle>
                  <CardDescription>Revenue comparison by store</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={report.sales.storePerformance}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                      <XAxis
                        dataKey="storeId"
                        tickFormatter={(value) =>
                          getStoreName(value).split(" - ")[1] || "Store"
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
                          `₹${(value ?? 0).toLocaleString()}`,
                          "Revenue",
                        ]}
                        labelFormatter={(label) => getStoreName(label)}
                        contentStyle={{
                          backgroundColor: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: "6px",
                        }}
                      />
                      <Bar
                        dataKey="revenue"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Top Products Chart */}
            {report.sales.topProducts?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Products by Revenue</CardTitle>
                  <CardDescription>Best selling products</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={report.sales.topProducts}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name.split(" ")[0]} ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="revenue"
                      >
                        {report.sales.topProducts.map((entry, index) => (
                          <Cell
                            key={entry.productId || `cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => [
                          `₹${(value ?? 0).toLocaleString()}`,
                          "Revenue",
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top Products Table */}
            <Card>
              <CardHeader>
                <CardTitle>Top Products</CardTitle>
                <CardDescription>
                  Products by quantity sold and revenue
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.sales.topProducts.map((product, index) => (
                      <TableRow key={product.productId || index}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">#{index + 1}</Badge>
                            {product.name}
                          </div>
                        </TableCell>
                        <TableCell>{product.quantity}</TableCell>
                        <TableCell>
                          ₹{(product.revenue ?? 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Store Performance Table */}
            {report.sales.storePerformance?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Store Performance</CardTitle>
                  <CardDescription>
                    Revenue and transactions by store
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Store</TableHead>
                        <TableHead>Transactions</TableHead>
                        <TableHead>Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.sales.storePerformance
                        .sort((a, b) => b.revenue - a.revenue)
                        .map((store, index) => (
                          <TableRow key={store.storeId || index}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">#{index + 1}</Badge>
                                {getStoreName(store.storeId)}
                              </div>
                            </TableCell>
                            <TableCell>{store.transactions}</TableCell>
                            <TableCell>
                              ₹{(store.revenue ?? 0).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Report Summary</CardTitle>
              <CardDescription>
                {formatPeriod()} Sales Performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <h4 className="font-semibold">Key Insights</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Total revenue: ₹
                      {(report.sales.totalRevenue ?? 0).toLocaleString()}
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      {report.sales.totalTransactions} transactions completed
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      Average order value: ₹
                      {Math.round(
                        report.sales.averageOrderValue ?? 0,
                      ).toLocaleString()}
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      Best performing store:{" "}
                      {report?.sales?.storePerformance?.length > 0 
                        ? getStoreName(
                            report.sales.storePerformance.reduce((a, b) =>
                              a.revenue > b.revenue ? a : b
                            ).storeId
                          )
                        : 'N/A'}
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Recommendations</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      Focus on promoting top-selling products
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      Analyze underperforming stores for improvement
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                      Consider inventory optimization based on sales data
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                      Implement customer retention strategies
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
