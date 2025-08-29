import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { format, parseISO, isToday, isYesterday, isThisWeek, startOfDay, endOfDay, subDays, isValid } from 'date-fns';
import { Calendar as CalendarIcon, Download, Loader2, RefreshCw, X, Info, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

// Define types for our sales data
interface SaleItem {
  name: string;
  quantity: number;
  price: number;
}

interface Customer {
  name: string;
  email?: string;
  phone?: string;
}

interface Sale {
  _id: string;
  saleNumber: string;
  customer?: Customer;
  items: SaleItem[];
  total: number;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
}

interface DailySalesData {
  sales: Sale[];
  totalSales: number;
  totalAmount: number;
  totalItems: number;
  averageOrder: number;
}

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { saleService } from "@/services/api";
import { formatCurrency } from "@/lib/utils";

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

// Removed duplicate interfaces

interface SummaryStats {
  totalSales: number;
  totalAmount: number;
  totalItemsSold: number;
  averageOrderValue: number;
}

// Error types for better error handling
type ErrorType = 'timeout' | 'network' | 'validation' | 'server' | 'unknown';

interface ErrorState {
  type: ErrorType;
  message: string;
  retryable: boolean;
}

export function DailySales() {
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date())
  });
  const [dailyData, setDailyData] = useState<DailySalesResponse['data'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  
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
        return '₹0.00';
      }
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);
    } catch (error) {
      console.error('Currency formatting error:', error);
      return '₹0.00';
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
    const twoYearsFromNow = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
    
    if (date < oneYearAgo || date > twoYearsFromNow) {
      setError({
        type: 'validation',
        message: 'Date must be within a reasonable range (1 year past to 2 years future)',
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

    // Validate date range before making request
    if (!dateRange.from || !dateRange.to) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      
      // Format dates for API (YYYY-MM-DD)
      const startDate = format(dateRange.from, 'yyyy-MM-dd');
      const endDate = format(dateRange.to, 'yyyy-MM-dd');
      
      console.log(`[DailySales] Fetching data from ${startDate} to ${endDate}${isRetry ? ' (retry attempt)' : ''}`);
      
      // Set timeout for the request
      fetchTimeoutRef.current = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      }, 30000); // 30 second timeout

      // Fetch daily sales data from the backend API
      const response = await saleService.getDailySales({
        startDate,
        endDate,
        signal: abortControllerRef.current?.signal
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

  // Filter sales based on search query and active tab
  const filteredSales = useMemo(() => {
    if (!dailyData?.sales) return [];
    
    let filtered = [...dailyData.sales];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(sale =>
        sale.saleNumber.toLowerCase().includes(query) ||
        (sale.customer?.name?.toLowerCase().includes(query) ?? false) ||
        sale.items.some(item => item.name.toLowerCase().includes(query))
      );
    }
    
    // Apply date filters based on active tab
    switch (activeTab) {
      case 'today':
        return filtered.filter(sale => isToday(parseISO(sale.createdAt)));
      case 'yesterday':
        return filtered.filter(sale => isYesterday(parseISO(sale.createdAt)));
      case 'week':
        return filtered.filter(sale => isThisWeek(parseISO(sale.createdAt)));
      default:
        return filtered;
    }
  }, [dailyData, searchQuery, activeTab]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    if (!filteredSales.length) {
      return {
        totalSales: 0,
        totalAmount: 0,
        totalItems: 0,
        averageOrder: 0
      };
    }
    
    return filteredSales.reduce((acc, sale) => {
      const itemsCount = sale.items.reduce((sum, item) => sum + item.quantity, 0);
      const newTotalSales = acc.totalSales + 1;
      const newTotalAmount = acc.totalAmount + sale.total;
      const newTotalItems = acc.totalItems + itemsCount;
      
      return {
        totalSales: newTotalSales,
        totalAmount: newTotalAmount,
        totalItems: newTotalItems,
        averageOrder: newTotalAmount / newTotalSales
      };
    }, { totalSales: 0, totalAmount: 0, totalItems: 0, averageOrder: 0 });
  }, [filteredSales]);

  // Handle API errors
  const handleApiError = useCallback((error: any): ErrorState => {
    let errorState: ErrorState = {
      type: 'unknown',
      message: 'An unexpected error occurred',
      retryable: true
    };

    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      errorState = {
        type: 'timeout',
        message: 'Request timed out. Please try again.',
        retryable: true
      };
    } else if (error.message?.includes('Network error') || error.message?.includes('fetch')) {
      errorState = {
        type: 'network',
        message: 'Network error. Please check your connection and try again.',
        retryable: true
      };
    } else if (error.message?.includes('Invalid date') || error.message?.includes('validation')) {
      errorState = {
        type: 'validation',
        message: error.message,
        retryable: false
      };
    } else if (error.response?.status >= 500) {
      errorState = {
        type: 'server',
        message: 'Server error. Please try again later.',
        retryable: true
      };
    }

    setError(errorState);
    toast.error(errorState.message);
    
    console.error('[DailySales] API Error:', {
      error: error.message,
      type: errorState.type,
      retryable: errorState.retryable
    });
    
    return errorState;
  }, [setError, toast]);

  // Handle date selection
  const handleDateSelect = useCallback((date: Date | undefined) => {
    if (!date) return;
    
    setDateRange((prev: { from: Date; to: Date }) => ({
      from: startOfDay(date),
      to: endOfDay(date)
    }));
    setError(null); // Clear any previous errors
  }, [setDateRange, setError]);

  // Handle quick date range selection
  const handleQuickRange = useCallback((days: number) => {
    const today = new Date();
    setDateRange({
      from: startOfDay(subDays(today, days - 1)),
      to: endOfDay(today)
    });
  }, []);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header with title and actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Daily Sales</h1>
          <p className="text-sm text-muted-foreground">
            View and analyze your sales data
          </p>
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Sales</h1>
          <p className="text-muted-foreground">
            View and analyze sales for a specific date
          </p>
        </div>
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
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search sales..."
            className="w-full pl-8 sm:w-[200px] md:w-[300px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <X 
              className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer"
              onClick={() => setSearchQuery('')}
            />
          )}
        </div>
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="yesterday">Yesterday</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
          </TabsList>
        </Tabs>
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
