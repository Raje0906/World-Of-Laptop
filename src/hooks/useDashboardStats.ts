import { useState, useEffect } from 'react';
import { safeApiClient } from '@/services/safeApi';

interface DashboardStats {
  totalSales: number;
  totalRevenue: number;
  activeRepairs: number;
  totalCustomers: number;
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const response = await safeApiClient.safeRequest<{ data: DashboardStats }>('/reports/summary');
      if (response.success && response.data) {
        setStats(response.data.data);
      } else {
        setError(response.error || 'Failed to fetch dashboard stats');
      }
      setLoading(false);
    };

    fetchStats();
  }, []);

  return { stats, loading, error };
} 