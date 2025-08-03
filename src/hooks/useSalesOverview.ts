import { useState, useEffect } from 'react';
import { safeApiClient } from '@/services/safeApi';

interface SalesStats {
  totalSales: number;
  totalRevenue: number;
  // Add other stats fields if available from the backend
}

interface Sale {
  _id: string;
  customer: {
    name: string;
  };
  items: {
    product: {
      name: string;
    };
  }[];
  totalAmount: number;
  createdAt: string;
  status: string;
}

interface TodayStats {
  totalSales: number;
  totalRevenue: number;
}

export function useSalesOverview() {
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [pendingOrders, setPendingOrders] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const startOfDay = `${yyyy}-${mm}-${dd}T00:00:00.000Z`;
        const endOfDay = `${yyyy}-${mm}-${dd}T23:59:59.999Z`;

        const [statsResponse, salesResponse, todayStatsResponse, pendingOrdersResponse] = await Promise.all([
          safeApiClient.safeRequest<{ data: SalesStats }>('/sales/stats'),
          safeApiClient.safeRequest<{ data: { sales: Sale[] } }>('/sales?limit=5'),
          safeApiClient.safeRequest<{ data: SalesStats }>(`/sales/stats?startDate=${startOfDay}&endDate=${endOfDay}`),
          safeApiClient.safeRequest<{ data: { sales: Sale[], pagination: { total: number } } }>(`/sales?status=pending&limit=1`)
        ]);

        if (statsResponse.success && statsResponse.data) {
          setStats(statsResponse.data.data);
        } else {
          throw new Error(statsResponse.error || 'Failed to fetch stats');
        }

        if (salesResponse.success && salesResponse.data) {
          setRecentSales(salesResponse.data.data.sales);
        } else {
          throw new Error(salesResponse.error || 'Failed to fetch recent sales');
        }

        if (todayStatsResponse.success && todayStatsResponse.data) {
          setTodayStats({
            totalSales: todayStatsResponse.data.data.totalSales,
            totalRevenue: todayStatsResponse.data.data.totalRevenue,
          });
        } else {
          setTodayStats({ totalSales: 0, totalRevenue: 0 });
        }

        if (pendingOrdersResponse.success && pendingOrdersResponse.data) {
          setPendingOrders(pendingOrdersResponse.data.data.pagination.total);
        } else {
          setPendingOrders(0);
        }


      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { stats, recentSales, todayStats, pendingOrders, loading, error };
} 