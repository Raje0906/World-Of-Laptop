import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { apiClient } from "@/lib/apiClient";

interface Store {
  _id: string;
  name: string;
  address: string;
  status: string;
}

interface StoreContextType {
  currentStore: Store | null;
  availableStores: Store[];
  isLoading: boolean;
  selectStore: (storeId: string) => void;
  clearStoreSelection: () => void;
  refreshStores: () => Promise<void>;
  isStoreLocked: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
};

interface StoreProviderProps {
  children: React.ReactNode;
}

export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [availableStores, setAvailableStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isStoreLocked = !isAdmin; // Staff users have locked stores

  // Load stores on mount
  useEffect(() => {
    if (isAdmin) {
      // Admin users can select stores dynamically
      refreshStores();
    } else if (user?.store) {
      // Staff users have their store locked in from login
      setCurrentStore(user.store);
    }
  }, [user, isAdmin]);

  const refreshStores = async () => {
    if (!isAdmin) return;

    setIsLoading(true);
    try {
      const response = await apiClient.get("/auth/stores");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAvailableStores(data.data.stores);
        }
      }
    } catch (error) {
      console.error("Error fetching stores:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectStore = (storeId: string) => {
    if (!isAdmin) {
      console.warn("Store selection is locked for staff users");
      return;
    }

    const store = availableStores.find(s => s._id === storeId);
    if (store) {
      setCurrentStore(store);
      // Store selection in localStorage for persistence
      localStorage.setItem("selectedStore", JSON.stringify(store));
    }
  };

  const clearStoreSelection = () => {
    if (!isAdmin) {
      console.warn("Store selection is locked for staff users");
      return;
    }

    setCurrentStore(null);
    localStorage.removeItem("selectedStore");
  };

  // Load previously selected store from localStorage (admin only)
  useEffect(() => {
    if (isAdmin) {
      const savedStore = localStorage.getItem("selectedStore");
      if (savedStore) {
        try {
          const store = JSON.parse(savedStore);
          setCurrentStore(store);
        } catch (error) {
          console.error("Error parsing saved store:", error);
          localStorage.removeItem("selectedStore");
        }
      }
    }
  }, [isAdmin]);

  const value: StoreContextType = {
    currentStore,
    availableStores,
    isLoading,
    selectStore,
    clearStoreSelection,
    refreshStores,
    isStoreLocked,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}; 