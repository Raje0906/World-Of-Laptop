import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  store_id: string;
  store?: {
    _id: string;
    name: string;
    address: string;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  updateUser: (userData: Partial<User>) => void;
  setSessionExpiredCallback: (callback: () => void) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [onSessionExpired, setOnSessionExpired] = useState<(() => void) | null>(null);

  // Reset the activity timer
  const resetInactivityTimer = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // Check for inactivity and log out if needed
  useEffect(() => {
    const checkInactivity = () => {
      const TEN_MINUTES = 10 * 60 * 1000; // 10 minutes in milliseconds
      const now = Date.now();
      
      if (user && (now - lastActivity) > TEN_MINUTES) {
        // Session expired due to inactivity
        logout();
        toast.error("Your session has expired due to inactivity. Please log in again.");
        if (onSessionExpired) {
          onSessionExpired();
        }
      }
    };

    // Check every minute
    const interval = setInterval(checkInactivity, 60000);
    
    // Set up activity listeners
    const events = ["mousedown", "keydown", "scroll", "mousemove", "touchstart"];
    const onActivity = () => resetInactivityTimer();
    
    events.forEach(event => window.addEventListener(event, onActivity));
    
    return () => {
      clearInterval(interval);
      events.forEach(event => window.removeEventListener(event, onActivity));
    };
  }, [user, lastActivity, onSessionExpired, resetInactivityTimer]);
  
  // Set the session expired callback
  const setSessionExpiredCallback = useCallback((callback: () => void) => {
    setOnSessionExpired(() => callback);
  }, []);

  // Check authentication status on mount and redirect to login if not authenticated
  useEffect(() => {
    const initializeAuth = async () => {
      const isAuthenticated = await checkAuth();
      if (!isAuthenticated && !window.location.pathname.includes('/login')) {
        // If not on the login page and not authenticated, redirect to login
        window.location.href = '/login';
      }
    };
    
    initializeAuth();
  }, []);

  const checkAuth = async (): Promise<boolean> => {
    try {
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (!storedToken || !storedUser) {
        setToken(null);
        setUser(null);
        setIsLoading(false);
        return false;
      }
      
      // Reset activity timer on auth check
      setLastActivity(Date.now());

      // Verify token with server
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setToken(storedToken);
        setUser(data.data.user);
        setIsLoading(false);
        return true;
      } else {
        // Token is invalid, clear storage
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setToken(null);
        setUser(null);
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error("Auth check error:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setToken(null);
      setUser(null);
      setIsLoading(false);
      return false;
    }
  };

  const login = (newToken: string, userData: User) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(userData));
    setToken(newToken);
    setLastActivity(Date.now()); // Reset activity timer on login
    setUser(userData);
    toast.success(`Welcome back, ${userData.name}!`);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    toast.success("Logged out successfully");
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }
  };

  const value: AuthContextType & { setSessionExpiredCallback: (callback: () => void) => void } = {
    user,
    token,
    isLoading,
    login,
    logout,
    checkAuth,
    updateUser,
    setSessionExpiredCallback,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 