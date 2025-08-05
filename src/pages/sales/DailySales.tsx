import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { format, parseISO, isValid, isToday, isYesterday, isThisWeek } from "date-fns";
import { Calendar as CalendarIcon, Download, Loader2, RefreshCw, AlertCircle, Info } from "lucide-react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { saleService } from "@/services/api";

// Define the daily sales response type
interface DailySalesResponse {
  success: boolean;
  data: {
    date: string;
    totalSales: number;
    totalAmount: number;
    totalItemsSold: number;
    averageOrderValue: number;
    sales: Array<{
      _id: string;
      saleNumber: string;
      customer?: {
        name: string;
        email?: string;
        phone?: string;
      };
      items: Array<{
        name: string;
        quantity: number;
        price: number;
      }>;
      total: number;
      paymentMethod: string;
      createdAt: string;
    }>;
  };
  message?: string;
  meta?: {
    date: string;
    queryTime: string;
    resultCount: number;
  };
}

interface SaleItem {
  name: string;
  quantity: number;
  price: number;
}

interface Sale {
  _id: string;
  saleNumber: string;
  customer?: {
    name: string;
    email?: string;
    phone?: string;
  };
  items: SaleItem[];
  total: number;
  paymentMethod: string;
  createdAt: string;
}

interface SummaryStats {
  totalSales: number;
  totalAmount: number;
  totalItemsSold: number;
  averageOrderValue: number;
}

// Error types for better error handling
type ErrorType = 'network' | 'validation' | 'server' | 'timeout' | 'unknown';

interface ErrorState {
  type: ErrorType;
  message: string;
  retryable: boolean;
}

export function DailySales() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dailyData, setDailyData] = useState<DailySalesResponse['data'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  
  // Refs for performance optimization
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Maximum retry attempts
  const MAX_RETRY_ATTEMPTS = 3;
  const RETRY_DELAY = 2000; // 2 seconds

  // Check if we have sales data
  const hasSalesData = useMemo(() => {
    return dailyData && dailyData.totalSales > 0;
  }, [dailyData]);

  // Get date context for better UX
  const getDateContext = useCallback((date: Date) => {
    if (isToday(date)) return { label: 'Today', variant: 'default' as const };
    if (isYesterday(date)) return { label: 'Yesterday', variant: 'secondary' as const };
    if (isThisWeek(date)) return { label: 'This Week', variant: 'outline' as const };
    return { label: format(date, 'MMM d, yyyy'), variant: 'outline' as const };
  }, []);
  
  // Format currency function with error handling
  const formatCurrency = (value: number): string => {
    try {
      if (typeof value !== 'number' || isNaN(value)) {
        return '$0.00';
      }
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);
    } catch (error) {
      console.error('Currency formatting error:', error);
      return '$0.00';
    }
  };

  // Validate date before fetching
  const validateDate = useCallback((date: Date): boolean => {
    if (!isValid(date)) {
      setError({
        type: 'validation',
        message: 'Invalid date selected',
        retryable: false
      });
      return false;
    }

    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    
    if (date < oneYearAgo) {
      setError({
        type: 'validation',
        message: 'Date cannot be more than one year in the past',
        retryable: false
      });
      return false;
    }

    if (date > new Date(now.getTime() + 24 * 60 * 60 * 1000)) {
      setError({
        type: 'validation',
        message: 'Date cannot be in the future',
        retryable: false
      });
      return false;
    }

    return true;
  }, []);

  // Fetch daily sales data from API with comprehensive error handling
  const fetchDailySales = useCallback(async (isRetry = false) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear any existing timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Validate date before making request
    if (!validateDate(selectedDate)) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      
      // Format date for API (YYYY-MM-DD)
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      
      console.log(`[DailySales] Fetching data for date: ${dateString}${isRetry ? ' (retry attempt)' : ''}`);
      
      // Set timeout for the request
      fetchTimeoutRef.current = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      }, 30000); // 30 second timeout

      // Fetch daily sales data from the backend API
      const response = await saleService.getDailySales({
        date: dateString
      });
      
      // Clear timeout since request completed
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
      
      console.log('[DailySales] API Response received:', {
        success: response.success,
        salesCount: response.data?.totalSales,
        date: response.data?.date
      });
      
      if (response.success && response.data) {
        setDailyData(response.data);
        setLastFetchTime(new Date());
        setRetryCount(0); // Reset retry count on success
        
        // Show success message for retries
        if (isRetry) {
          toast.success('Data refreshed successfully');
        }
      } else {
        throw new Error(response.message || 'Failed to load daily sales data');
      }
    } catch (err: any) {
      // Clear timeout
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }

      let errorState: ErrorState;

      // Determine error type and create appropriate error state
      if (err.name === 'AbortError' || err.message.includes('timeout')) {
        errorState = {
          type: 'timeout',
          message: 'Request timed out. Please try again.',
          retryable: true
        };
      } else if (err.message.includes('Network error') || err.message.includes('fetch')) {
        errorState = {
          type: 'network',
          message: 'Network error. Please check your connection and try again.',
          retryable: true
        };
      } else if (err.message.includes('Invalid date') || err.message.includes('validation')) {
        errorState = {
          type: 'validation',
          message: err.message,
          retryable: false
        };
      } else if (err.response?.status >= 500) {
        errorState = {
          type: 'server',
          message: 'Server error. Please try again later.',
          retryable: true
        };
      } else {
        errorState = {
          type: 'unknown',
          message: err.message || 'An unexpected error occurred',
          retryable: true
        };
      }

      setError(errorState);
      
      // Show error toast
      toast.error(errorState.message);
      
      console.error('[DailySales] Error fetching data:', {
        error: err.message,
        type: errorState.type,
        retryable: errorState.retryable,
        date: format(selectedDate, 'yyyy-MM-dd')
      });

      setDailyData(null);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [selectedDate, validateDate]);

  // Retry mechanism with exponential backoff
  const retryFetch = useCallback(async () => {
    if (retryCount >= MAX_RETRY_ATTEMPTS) {
      setError({
        type: 'unknown',
        message: 'Maximum retry attempts reached. Please try again later.',
        retryable: false
      });
      return;
    }

    setRetryCount(prev => prev + 1);
    
    // Exponential backoff delay
    const delay = RETRY_DELAY * Math.pow(2, retryCount);
    
    toast.info(`Retrying in ${delay / 1000} seconds...`);
    
    setTimeout(() => {
      fetchDailySales(true);
    }, delay);
  }, [retryCount, fetchDailySales]);

  // Fetch data when component mounts or selected date changes
  useEffect(() => {
    fetchDailySales();
  }, [fetchDailySales]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  // Calculate summary values with error handling
  const summary: SummaryStats = useMemo(() => {
    if (!dailyData) {
      return {
        totalSales: 0,
        totalAmount: 0,
        totalItemsSold: 0,
        averageOrderValue: 0
      };
    }

    return {
      totalSales: dailyData.totalSales || 0,
      totalAmount: dailyData.totalAmount || 0,
      totalItemsSold: dailyData.totalItemsSold || 0,
      averageOrderValue: dailyData.averageOrderValue || 0
    };
  }, [dailyData]);

  // Export to Excel function with error handling
  const exportToExcel = async () => {
    if (!dailyData || !dailyData.sales.length) {
      toast.error('No data to export');
      return;
    }

    try {
      setIsExporting(true);

      // Prepare data for export with validation
      const exportData = dailyData.sales.map(sale => ({
        'Sale Number': sale.saleNumber || 'N/A',
        'Customer': sale.customer?.name || 'N/A',
        'Customer Phone': sale.customer?.phone || 'N/A',
        'Customer Email': sale.customer?.email || 'N/A',
        'Items': sale.items.map(item => `${item.name} (${item.quantity}x)`).join(', ') || 'N/A',
        'Total Amount': sale.total || 0,
        'Payment Method': sale.paymentMethod || 'N/A',
        'Date': format(parseISO(sale.createdAt), 'MMM d, yyyy HH:mm')
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, `Daily Sales - ${format(selectedDate, 'MMM d, yyyy')}`);

      // Generate filename with timestamp
      const timestamp = format(new Date(), 'yyyy-MM-dd-HHmm');
      const fileName = `daily-sales-${format(selectedDate, 'yyyy-MM-dd')}-${timestamp}.xlsx`;

      // Save file
      XLSX.writeFile(wb, fileName);
      toast.success('Daily sales exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle date selection with validation
  const handleDateSelect = useCallback((date: Date | undefined) => {
    if (!date) return;
    
    setSelectedDate(date);
    setError(null); // Clear any previous errors
    setRetryCount(0); // Reset retry count
  }, []);

  const dateContext = getDateContext(selectedDate);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Sales</h1>
          <p className="text-muted-foreground">
            View and analyze sales for a specific date
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
                disabled={isLoading}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                initialFocus
                disabled={(date) => {
                  const now = new Date();
                  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                  return date < oneYearAgo || date > new Date(now.getTime() + 24 * 60 * 60 * 1000);
                }}
              />
            </PopoverContent>
          </Popover>
          
          <Badge variant={dateContext.variant}>
            {dateContext.label}
          </Badge>
          
          <Button 
            onClick={() => fetchDailySales(false)} 
            disabled={isLoading}
            variant="outline"
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          
          <Button 
            onClick={exportToExcel} 
            disabled={!hasSalesData || isExporting}
            variant="outline"
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export
          </Button>
        </div>
      </div>

      {/* Last updated indicator */}
      {lastFetchTime && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4" />
          Last updated: {format(lastFetchTime, 'MMM d, yyyy HH:mm:ss')}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant={error.type === 'validation' ? 'destructive' : 'default'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error.message}</span>
            {error.retryable && retryCount < MAX_RETRY_ATTEMPTS && (
              <Button 
                onClick={retryFetch} 
                variant="outline" 
                size="sm"
                disabled={isLoading}
              >
                Retry ({MAX_RETRY_ATTEMPTS - retryCount} left)
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalSales}</div>
            <p className="text-xs text-muted-foreground">
              Sales for {format(selectedDate, 'MMM d, yyyy')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">
              Revenue for {format(selectedDate, 'MMM d, yyyy')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalItemsSold}</div>
            <p className="text-xs text-muted-foreground">
              Items sold on {format(selectedDate, 'MMM d, yyyy')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.averageOrderValue)}</div>
            <p className="text-xs text-muted-foreground">
              Average order value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Details</CardTitle>
          <CardDescription>
            Detailed view of all sales for {format(selectedDate, 'MMM d, yyyy')}
            {dailyData && (
              <span className="ml-2 text-sm text-muted-foreground">
                ({dailyData.totalSales} sales)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[80px]" />
                </div>
              ))}
            </div>
          ) : error && !error.retryable ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{error.message}</p>
            </div>
          ) : !hasSalesData ? (
            <div className="text-center py-8">
              <div className="h-12 w-12 text-muted-foreground mx-auto mb-4 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-12 h-12"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                </svg>
              </div>
              <p className="text-muted-foreground">
                No sales found for {format(selectedDate, 'MMM d, yyyy')}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Try selecting a different date or check back later.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sale #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyData.sales.map((sale) => (
                    <TableRow key={sale._id}>
                      <TableCell className="font-medium">
                        {sale.saleNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {sale.customer?.name || 'N/A'}
                          </div>
                          {sale.customer?.phone && (
                            <div className="text-sm text-muted-foreground">
                              {sale.customer.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate" title={sale.items.map(item => `${item.name} (${item.quantity}x)`).join(', ')}>
                          {sale.items.map(item => `${item.name} (${item.quantity}x)`).join(', ')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(sale.total)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {sale.paymentMethod.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(parseISO(sale.createdAt), 'HH:mm')}
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
