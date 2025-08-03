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
  Wrench,
  Clock,
  DollarSign,
  CheckCircle,
  Download,
  Calendar,
  Store,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import {
  generateMonthlyRepairReport,
  generateQuarterlyReport,
  generateAnnualReport,
  getRepairs,
} from "@/lib/dataUtils";
import { Report } from "@/types";
import * as XLSX from "xlsx";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function RepairReports() {
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
  const [stores, setStores] = useState<any[]>([]);

  const generateReport = useCallback(async () => {
    setIsLoading(true);
    try {
      let generatedReport: Report | null = null;

      switch (reportType) {
        case "monthly":
          generatedReport = await generateMonthlyRepairReport(selectedYear, selectedMonth);
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
          generatedReport = await generateMonthlyRepairReport(selectedYear, selectedMonth);
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
    fetch("/api/stores")
      .then((res) => res.json())
      .then((data) => setStores(data.data || []))
      .catch((err) => console.error("Failed to fetch stores", err));
  }, []);

  const getStoreName = (storeId: string) => {
    return stores.find((s) => s._id === storeId)?.name || "Unknown Store";
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

  const exportReport = async () => {
    if (!report) return;

    // Store Performance Sheet
    const storePerf = (report.repairs?.storePerformance || []).map((store: any) => ({
      'Store ID': store.storeId,
      'Repairs': store.repairs,
      'Revenue': store.revenue,
    }));
    // Top Issues Sheet
    const topIssues = (report.repairs?.topIssues || []).map((issue: any) => ({
      'Issue': issue.issue,
      'Count': issue.count,
    }));
    // Summary Sheet
    const summary = [{
      'Period': formatPeriod(),
      'Report Type': reportType,
      'Generated': new Date().toISOString(),
      'Total Repairs': report.repairs?.totalRepairs,
      'Completed Repairs': report.repairs?.completedRepairs,
      'Average Repair Time (days)': report.repairs?.averageRepairTime,
      'Total Revenue': report.repairs?.totalRevenue,
    }];

    // Detailed Repairs Sheet
    let detailedRepairs: any[] = [];
    try {
      const allRepairs = await getRepairs();
      // Filter by selected period
      detailedRepairs = allRepairs.filter((repair: any) => {
        const received = new Date(repair.dateReceived);
        if (reportType === 'monthly') {
          return received.getFullYear() === selectedYear && (received.getMonth() + 1) === selectedMonth;
        } else if (reportType === 'quarterly') {
          const quarter = Math.floor(received.getMonth() / 3) + 1;
          return received.getFullYear() === selectedYear && quarter === selectedQuarter;
        } else if (reportType === 'annually') {
          return received.getFullYear() === selectedYear;
        }
        return false;
      }).map((repair: any) => ({
        'Customer Name': repair.customer?.name || repair.customerName || '',
        'Phone': repair.customer?.phone || '',
        'Issue': repair.issue || repair.issueDescription || '',
        'Cost': repair.actualCost || repair.estimatedCost || '',
        'Date Received': repair.dateReceived ? new Date(repair.dateReceived).toLocaleDateString() : '',
        'Date Completed': repair.actualCompletion ? new Date(repair.actualCompletion).toLocaleDateString() : '',
      }));
    } catch (e) {
      // fallback: leave detailedRepairs empty
    }

    const wb = XLSX.utils.book_new();
    if (storePerf.length > 0) {
      const ws1 = XLSX.utils.json_to_sheet(storePerf);
      XLSX.utils.book_append_sheet(wb, ws1, 'Store Performance');
    }
    if (topIssues.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(topIssues);
      XLSX.utils.book_append_sheet(wb, ws2, 'Top Issues');
    }
    const ws3 = XLSX.utils.json_to_sheet(summary);
    XLSX.utils.book_append_sheet(wb, ws3, 'Summary');
    if (detailedRepairs.length > 0) {
      const ws4 = XLSX.utils.json_to_sheet(detailedRepairs);
      XLSX.utils.book_append_sheet(wb, ws4, 'Detailed Repairs');
    }
    XLSX.writeFile(wb, `repair-report-${reportType}-${selectedYear}.xlsx`);
  };

  const calculateCompletionRate = () => {
    if (!report || !report.repairs || report.repairs.totalRepairs === 0) return 0;
    return (
      (report.repairs.completedRepairs / report.repairs.totalRepairs) * 100
    );
  };

  const getEfficiencyBadge = (avgTime: number) => {
    if (avgTime <= 3)
      return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (avgTime <= 5)
      return <Badge className="bg-blue-100 text-blue-800">Good</Badge>;
    if (avgTime <= 7)
      return <Badge className="bg-yellow-100 text-yellow-800">Average</Badge>;
    return <Badge className="bg-red-100 text-red-800">Needs Improvement</Badge>;
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
          <h1 className="text-3xl font-bold text-gray-900">Repair Reports</h1>
          <p className="text-gray-600 mt-2">
            Analyze repair performance and service quality metrics
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
              <Button onClick={generateReport} className="w-full">
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {report && (
        <>
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Repairs
                </CardTitle>
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {report.repairs.totalRepairs}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatPeriod()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Completion Rate
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {calculateCompletionRate().toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {report.repairs.completedRepairs} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Repair Time
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {report.repairs.averageRepairTime.toFixed(1)} days
                </div>
                <div className="mt-1">
                  {getEfficiencyBadge(report.repairs.averageRepairTime)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Repair Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{(report.repairs.totalRevenue / 1000).toFixed(0)}K
                </div>
                <p className="text-xs text-muted-foreground">Total earnings</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Store Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Store Performance</CardTitle>
                <CardDescription>Repairs handled by each store</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={report.repairs.storePerformance}
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
                      axisLine={true}
                      tickLine={true}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value: any, name: string) => [
                        value,
                        name === "repairs" ? "Repairs" : "Revenue (₹)",
                      ]}
                      labelFormatter={(label) => getStoreName(label)}
                      contentStyle={{
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                      }}
                    />
                    <Bar
                      dataKey="repairs"
                      name="Repairs"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Issues Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Common Issues</CardTitle>
                <CardDescription>Most frequent repair problems</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={report.repairs.topIssues}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ issue, percent }) =>
                        `${issue.split(" ")[0]} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {report.repairs.topIssues.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => [value, "Occurrences"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top Issues Table */}
            <Card>
              <CardHeader>
                <CardTitle>Most Common Issues</CardTitle>
                <CardDescription>
                  Issues by frequency and impact
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Issue</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Impact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.repairs.topIssues.map((issue, index) => (
                      <TableRow key={issue.issue}>
                        <TableCell>
                          <Badge variant="outline">#{index + 1}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate" title={issue.issue}>
                            {issue.issue}
                          </div>
                        </TableCell>
                        <TableCell>{issue.count}</TableCell>
                        <TableCell>
                          {issue.count > 2 ? (
                            <Badge className="bg-red-100 text-red-800">
                              High
                            </Badge>
                          ) : issue.count > 1 ? (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              Medium
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800">
                              Low
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Store Performance Table */}
            <Card>
              <CardHeader>
                <CardTitle>Store Performance</CardTitle>
                <CardDescription>
                  Repair volume and revenue by store
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store</TableHead>
                      <TableHead>Repairs</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Efficiency</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.repairs.storePerformance
                      .sort((a, b) => b.repairs - a.repairs)
                      .map((store, index) => {
                        const avgRevenue =
                          store.repairs > 0 ? store.revenue / store.repairs : 0;
                        return (
                          <TableRow key={store.storeId}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">#{index + 1}</Badge>
                                {getStoreName(store.storeId).split(" - ")[1] ||
                                  "Store"}
                              </div>
                            </TableCell>
                            <TableCell>{store.repairs}</TableCell>
                            <TableCell>
                              ₹{store.revenue.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  avgRevenue > 8000
                                    ? "default"
                                    : avgRevenue > 5000
                                      ? "outline"
                                      : "secondary"
                                }
                              >
                                ₹{Math.round(avgRevenue)}/repair
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Performance Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Performance Insights
              </CardTitle>
              <CardDescription>
                {formatPeriod()} Repair Service Analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-semibold">Service Quality Metrics</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <p className="font-medium text-green-900">
                          Completion Rate
                        </p>
                        <p className="text-sm text-green-700">
                          {report.repairs.completedRepairs} out of{" "}
                          {report.repairs.totalRepairs} repairs completed
                        </p>
                      </div>
                      <div className="text-2xl font-bold text-green-600">
                        {calculateCompletionRate().toFixed(1)}%
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="font-medium text-blue-900">
                          Average Turnaround
                        </p>
                        <p className="text-sm text-blue-700">
                          Time to complete repairs
                        </p>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        {report.repairs.averageRepairTime.toFixed(1)} days
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div>
                        <p className="font-medium text-purple-900">
                          Revenue per Repair
                        </p>
                        <p className="text-sm text-purple-700">
                          Average earnings per repair
                        </p>
                      </div>
                      <div className="text-2xl font-bold text-purple-600">
                        ₹
                        {report.repairs.totalRepairs > 0
                          ? Math.round(
                              report.repairs.totalRevenue /
                                report.repairs.totalRepairs,
                            ).toLocaleString()
                          : 0}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Improvement Areas</h4>
                  <div className="space-y-3">
                    {report.repairs.averageRepairTime > 5 && (
                      <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-yellow-900">
                            Repair Time Optimization
                          </p>
                          <p className="text-sm text-yellow-700">
                            Average repair time exceeds target. Consider process
                            improvements.
                          </p>
                        </div>
                      </div>
                    )}

                    {calculateCompletionRate() < 85 && (
                      <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-900">
                            Completion Rate Below Target
                          </p>
                          <p className="text-sm text-red-700">
                            Focus on completing pending repairs to improve
                            customer satisfaction.
                          </p>
                        </div>
                      </div>
                    )}

                    {report.repairs.topIssues.length > 0 && (
                      <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-blue-900">
                            Common Issue Pattern
                          </p>
                          <p className="text-sm text-blue-700">
                            "{report.repairs.topIssues[0]?.issue}" is the most
                            common issue. Consider preventive measures.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-900">
                          Revenue Growth Opportunity
                        </p>
                        <p className="text-sm text-green-700">
                          Implement preventive maintenance services to increase
                          customer retention.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
