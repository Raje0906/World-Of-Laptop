import React from "react";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Store, Lock, Unlock } from "lucide-react";

interface StoreSelectorProps {
  onStoreChange?: (storeId: string) => void;
  required?: boolean;
  label?: string;
  className?: string;
}

export function StoreSelector({ 
  onStoreChange, 
  required = false, 
  label = "Select Store",
  className = "" 
}: StoreSelectorProps) {
  const { user } = useAuth();
  const { currentStore, availableStores, selectStore, isLoading, isStoreLocked } = useStore();

  const isAdmin = user?.role === 'admin';

  // If staff user, show the locked store
  if (!isAdmin) {
    if (user?.store) {
      return (
        <div className={className}>
          <Label>Store</Label>
          <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md">
            <Lock className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">
              {user.store.name} - {typeof user.store.address === 'object' && user.store.address !== null
                ? [user.store.address.street, user.store.address.city, user.store.address.state, user.store.address.zipCode, user.store.address.country].filter(Boolean).join(', ')
                : user.store.address}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Your assigned store (locked for this session)
          </p>
        </div>
      );
    }
    return null;
  }

  // For admin users, show store selector
  const handleStoreChange = (storeId: string) => {
    selectStore(storeId);
    if (onStoreChange) {
      onStoreChange(storeId);
    }
  };

  return (
    <div className={className}>
      <Label htmlFor="store-selector">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Select
        value={currentStore?._id || ""}
        onValueChange={handleStoreChange}
        disabled={isLoading}
      >
        <SelectTrigger id="store-selector" className={required && !currentStore ? "border-red-500" : ""}>
          <SelectValue placeholder={isLoading ? "Loading stores..." : "Choose a store"} />
        </SelectTrigger>
        <SelectContent>
          {availableStores.map((store) => (
            <SelectItem key={store._id} value={store._id}>
              {store.name} - {typeof store.address === 'object' && store.address !== null
                ? [store.address.street, store.address.city, store.address.state, store.address.zipCode, store.address.country].filter(Boolean).join(', ')
                : store.address}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {required && !currentStore && (
        <p className="text-sm text-red-500 mt-1">
          Please select a store to continue
        </p>
      )}
      
      {currentStore && (
        <Alert className="mt-2">
          <Unlock className="h-4 w-4" />
          <AlertDescription>
            Selected: <strong>{currentStore.name}</strong> (can be changed)
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
} 