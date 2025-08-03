import { useState, useEffect } from "react";
import { apiClient } from "../services/api";

export interface UseApiOptions {
  immediate?: boolean;
  dependencies?: any[];
}

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Generic hook for API calls
export function useApi<T>(
  apiCall: () => Promise<any>,
  options: UseApiOptions = {},
): ApiState<T> & { refetch: () => Promise<void> } {
  const { immediate = true, dependencies = [] } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiCall();
      setData(response.data || response);
    } catch (err: any) {
      const errorMessage = err.message || "API connection failed";
      setError(errorMessage);

      // Only log as warning if it's a connection issue
      if (errorMessage.includes("fetch") || errorMessage.includes("network")) {
        console.warn(
          "API connection issue (this is normal if backend is not running):",
          err.message,
        );
      } else {
        console.error("API call failed:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (immediate) {
      fetchData();
    }
  }, dependencies);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

// Specific hooks for common API calls
export function useCustomers(params?: any) {
  return useApi(() => apiClient.getCustomers(params), {
    dependencies: [JSON.stringify(params)],
  });
}

export function useProducts(params?: any) {
  return useApi(() => apiClient.getProducts(params), {
    dependencies: [JSON.stringify(params)],
  });
}

export function useSales(params?: any) {
  return useApi(() => apiClient.getSales(params), {
    dependencies: [JSON.stringify(params)],
  });
}

export function useRepairs(params?: any) {
  return useApi(() => apiClient.getRepairs(params), {
    dependencies: [JSON.stringify(params)],
  });
}

export function useStores() {
  return useApi(() => apiClient.getActiveStores());
}

export function useCustomer(id: string | null) {
  return useApi(
    () => (id ? apiClient.getCustomer(id) : Promise.resolve(null)),
    {
      immediate: !!id,
      dependencies: [id],
    },
  );
}

export function useProduct(id: string | null) {
  return useApi(() => (id ? apiClient.getProduct(id) : Promise.resolve(null)), {
    immediate: !!id,
    dependencies: [id],
  });
}

export function useSale(id: string | null) {
  return useApi(() => (id ? apiClient.getSale(id) : Promise.resolve(null)), {
    immediate: !!id,
    dependencies: [id],
  });
}

export function useRepair(id: string | null) {
  return useApi(() => (id ? apiClient.getRepair(id) : Promise.resolve(null)), {
    immediate: !!id,
    dependencies: [id],
  });
}

// Hook for mutations (create, update, delete)
export function useApiMutation<T = any>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (apiCall: () => Promise<any>): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiCall();
      return response.data || response;
    } catch (err: any) {
      setError(err.message || "An error occurred");
      console.error("API mutation failed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    mutate,
    loading,
    error,
  };
}

// Hook for health check and API connection status
export function useApiHealth() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const { data, loading, error, refetch } = useApi(
    () => apiClient.healthCheck(),
    { immediate: true },
  );

  useEffect(() => {
    setIsConnected(!!data && !error);
    setLastCheck(new Date());
  }, [data, error]);

  // Periodic health check every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);

    return () => clearInterval(interval);
  }, [refetch]);

  return {
    isConnected,
    lastCheck,
    loading,
    error,
    checkHealth: refetch,
  };
}

// Hook for search functionality
export function useSearch<T>(
  searchFunction: (query: string) => Promise<any>,
  initialQuery = "",
) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await searchFunction(searchQuery);
      setResults(response.data || []);
    } catch (err: any) {
      setError(err.message || "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query) {
        search(query);
      } else {
        setResults([]);
      }
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [query]);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    search,
  };
}

export default useApi;
