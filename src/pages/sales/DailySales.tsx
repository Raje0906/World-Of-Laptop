import { useState, useEffect, useMemo, useCallback } from "react";
import { format, subDays, parseISO, startOfMonth, eachDayOfInterval } from "date-fns";
import { Calendar as CalendarIcon, Download, Loader2 } from "lucide-react";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { saleService } from "@/services/api";

// Define the sale stats response type
interface SaleStatsResponse {
  success: boolean;
  data: Array<{
    _id: string;
    count: number;
    itemsSold: number;
    totalAmount: number;
    avgOrderValue: number;
    sales: Array<{
      _id: string;
      saleNumber: string;
      customerName?: string;
      items: Array<{
        name: string;
        quantity: number;
        price: number;
      }>;
      total: number;
      paymentMethod: string;
      createdAt: string;
    }>;
  }>;
  message?: string;
}

interface SaleItem {
  name: string;
  quantity: number;
  price: number;
}

interface Sale {
  id: string;
  saleNumber: string;
  customerName: string;
  items: SaleItem[];
  total: number;
  paymentMethod: string;
  createdAt: string;
}

interface DailySale {
  date: string;
  salesCount: number;
  itemsSold: number;
  totalAmount: number;
  averageOrderValue: number;
  sales: Sale[];
  transactions?: number; // For backward compatibility
}

interface SummaryStats {
  totalSales: number;
  totalAmount: number;
  totalTransactions: number;
  totalItemsSold: number;
  avgOrderValue: number;
}

export function DailySales() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  const [dailySales, setDailySales] = useState<DailySale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if we have sales data
  const hasSalesData = useMemo(() => {
    return dailySales.length > 0 && dailySales.some(day => day.salesCount > 0);
  }, [dailySales]);
  
  // Format currency function
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Fetch sales data from API
  const fetchSalesData = useCallback(async () => {
    if (!date?.from || !date?.to) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Format dates for API
      const fromDate = format(date.from, 'yyyy-MM-dd');
      const toDate = format(date.to, 'yyyy-MM-dd');
      
      console.log('Fetching sales data from', fromDate, 'to', toDate);
      
      // Fetch sales data from the backend API
      const response = await saleService.getStats({
        startDate: fromDate,
        endDate: toDate,
        groupBy: 'day'
      });
      
      console.log('API Response:', response);
      
      if (response.success) {
        // Ensure response.data is an array before mapping
        const responseData = Array.isArray(response.data) ? response.data : [response.data];
        
        // Transform API response to match our DailySale interface
        const transformedData = responseData.map((dayData: any) => ({
          date: dayData?._id || dayData?.date || new Date().toISOString().split('T')[0],
          salesCount: dayData?.count || 0,
          itemsSold: dayData?.itemsSold || 0,
          totalAmount: dayData?.totalAmount || 0,
          averageOrderValue: dayData?.avgOrderValue || 0,
          sales: Array.isArray(dayData?.sales) ? dayData.sales : []
        }));
        
        console.log('Transformed data:', transformedData);
        setDailySales(transformedData);
      } else {
        throw new Error(response.message || 'Failed to load sales data');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load sales data';
      setError(errorMessage);
      toast.error(`Error: ${errorMessage}`);
      console.error('Error fetching sales data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [date]);
  
  // Fetch data when component mounts or date range changes
  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);

  // Calculate summary values
  const summary: SummaryStats = useMemo(() => {
    return dailySales.reduce<SummaryStats>((acc, day) => {
      const daySalesCount = day.salesCount || 0;
      const dayTotalAmount = day.totalAmount || 0;
      const dayItemsSold = day.itemsSold || 0;
      
      return {
        totalSales: acc.totalSales + daySalesCount,
        totalAmount: acc.totalAmount + dayTotalAmount,
        totalTransactions: acc.totalTransactions + daySalesCount,
        totalItemsSold: acc.totalItemsSold + dayItemsSold,
        avgOrderValue: daySalesCount > 0 
          ? (acc.avgOrderValue + (dayTotalAmount / daySalesCount)) / 2 
          : acc.avgOrderValue
      };
    }, {
      totalSales: 0,
      totalAmount: 0,
      totalTransactions: 0,
      totalItemsSold: 0,
      avgOrderValue: 0
    });
  }, [dailySales]);
  
  // Export to Excel function
  const handleExport = useCallback(async () => {
    if (dailySales.length === 0) {
      toast.warning('No data to export');
      return;
    }
    
    try {
      setIsExporting(true);
      
      // Prepare data for export
      const exportData = dailySales.flatMap(day => 
        day.sales.map(sale => ({
          'Date': format(parseISO(day.date), 'PP'),
          'Sale #': sale.saleNumber,
          'Customer': sale.customerName || 'Walk-in Customer',
          'Items': sale.items.map(item => `${item.quantity}x ${item.name}`).join(', '),
          'Total': sale.total,
          'Payment Method': sale.paymentMethod,
          'Time': format(parseISO(sale.createdAt), 'p')
        }))
      );
      
      if (exportData.length === 0) {
        // If no detailed sales, export the summary
        const summaryData = dailySales.map(day => ({
          'Date': format(parseISO(day.date), 'PP'),
          'Sales Count': day.salesCount,
          'Items Sold': day.itemsSold,
          'Total Amount': day.totalAmount,
          'Average Order Value': day.averageOrderValue
        }));
        
        const ws = XLSX.utils.json_to_sheet(summaryData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Daily Sales Summary');
        XLSX.writeFile(wb, `daily-sales-summary-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      } else {
        // Export detailed sales data
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Daily Sales');
        XLSX.writeFile(wb, `daily-sales-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      }
      
      toast.success('Export completed successfully');
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  }, [dailySales]);
  


  // Skeleton loader for summary cards
  const renderSummarySkeletons = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-24 mt-2" />
            <Skeleton className="h-4 w-32 mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Skeleton loader for the table
  const renderTableSkeleton = () => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {['Date', 'Sales', 'Items', 'Total', 'Avg. Order'].map((header) => (
              <TableHead key={header}>
                <Skeleton className="h-4 w-20" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {[1, 2, 3, 4, 5].map((row) => (
            <TableRow key={row}>
              {[1, 2, 3, 4, 5].map((cell) => (
                <TableCell key={cell}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daily Sales</h1>
          <p className="text-sm text-muted-foreground">
            Track and analyze your daily sales performance
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExport}
            disabled={isLoading || isExporting || !hasSalesData}
            className="gap-2"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export to Excel
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full sm:w-[300px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
                disabled={isLoading}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} -{" "}
                      {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
                disabled={isLoading}
              />
              <div className="flex flex-col sm:flex-row gap-2 p-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDate({
                      from: subDays(new Date(), 6),
                      to: new Date(),
                    });
                  }}
                  className="w-full sm:w-auto"
                >
                  Last 7 Days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    setDate({
                      from: startOfMonth(today),
                      to: today,
                    });
                  }}
                  className="w-full sm:w-auto"
                >
                  This Month
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daily Sales</h1>
          <p className="text-muted-foreground">Track and analyze your daily sales performance</p>
        </div>
        <div className="flex items-center space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant="outline"
                className={cn(
                  "w-[300px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} -{" "}
                      {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <Button onClick={() => setDate({
            from: new Date(new Date().setDate(new Date().getDate() - 7)),
            to: new Date()
          })} variant="outline">
            Last 7 Days
          </Button>
          <Button onClick={() => setDate({
            from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            to: new Date()
          })} variant="outline">
            This Month
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {isLoading ? (
        renderSummarySkeletons()
      ) : error ? (
        <div className="rounded-md bg-destructive/10 p-4">
          <div className="flex items-center gap-2 text-destructive">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <h3 className="font-medium">Error loading sales data</h3>
          </div>
          <p className="mt-2 text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={fetchSalesData}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Try Again'
            )}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4 text-muted-foreground"
              >
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary.totalAmount)}
              </div>
              <p className="text-xs text-muted-foreground">
                {summary.totalSales} sale{summary.totalSales !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4 text-muted-foreground"
              >
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <path d="M2 10h20" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalTransactions}</div>
              <p className="text-xs text-muted-foreground">
                {summary.totalItemsSold} item{summary.totalItemsSold !== 1 ? 's' : ''} sold
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4 text-muted-foreground"
              >
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary.avgOrderValue)}
              </div>
              <p className="text-xs text-muted-foreground">
                across {summary.totalTransactions} order{summary.totalTransactions !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4 text-muted-foreground"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalItemsSold}</div>
              <p className="text-xs text-muted-foreground">
                {summary.totalTransactions} order{summary.totalTransactions !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Daily Sales</CardTitle>
          {date?.from && date?.to && (
            <CardDescription>
              {format(date.from, 'MMM d, yyyy')} - {format(date.to, 'MMM d, yyyy')}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            renderTableSkeleton()
          ) : error ? (
            <div className="rounded-md bg-destructive/10 p-4 text-center">
              <p className="text-destructive">{error}</p>
            </div>
          ) : dailySales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-12 w-12 text-muted-foreground"
              >
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <div className="text-center">
                <h3 className="text-lg font-medium">No sales data</h3>
                <p className="text-sm text-muted-foreground">
                  No sales were found for the selected date range.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  const today = new Date();
                  setDate({
                    from: startOfMonth(today),
                    to: today,
                  });
                }}
                className="mt-2"
              >
                View This Month
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Avg. Order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailySales.map((day) => (
                    <TableRow key={day.date}>
                      <TableCell className="font-medium">
                        {format(parseISO(day.date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        {day.salesCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {day.itemsSold}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(day.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(day.averageOrderValue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default DailySales;
