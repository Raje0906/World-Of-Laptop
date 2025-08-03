import { useState, useEffect } from 'react';
import { safeApiClient } from '@/services/safeApi';

// This interface should match the structure of the repair data from the backend
interface Repair {
  _id: string;
  ticketNumber: string;
  customer: {
    name: string;
  };
  device: string;
  deviceType: string;
  brand: string;
  model: string;
  issueDescription: string;
  status: string;
  priority: string;
  receivedDate: string;
  totalCost: number;
}

export function useRepairs() {
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRepairs = async () => {
      setLoading(true);
      const response = await safeApiClient.safeRequest<{ data: Repair[] }>('/repairs');
      if (response.success && response.data) {
        setRepairs(response.data.data);
      } else {
        setError(response.error || 'Failed to fetch repairs');
      }
      setLoading(false);
    };

    fetchRepairs();
  }, []);

  return { repairs, loading, error };
} 