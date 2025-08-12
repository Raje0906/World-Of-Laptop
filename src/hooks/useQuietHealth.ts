import { useState, useEffect } from "react";
import { safeApiClient } from "@/services/safeApi";

export function useQuietHealth() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [checking, setChecking] = useState(false);

  const checkHealth = async () => {
    if (checking) return; // Prevent multiple simultaneous checks

    setChecking(true);
    try {
      const available = await safeApiClient.forceCheck();
      setIsConnected(available);
      setLastCheck(new Date());
    } catch (error) {
      // Silently handle errors
      setIsConnected(false);
      setLastCheck(new Date());
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    // Initial check
    checkHealth();

    // Periodic check every 2 minutes (less frequent to reduce rate limiting)
    const interval = setInterval(() => {
      checkHealth();
    }, 120000);

    return () => clearInterval(interval);
  }, []);

  return {
    isConnected,
    lastCheck,
    checking,
    checkHealth,
  };
}

export default useQuietHealth;
