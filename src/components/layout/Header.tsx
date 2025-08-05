import React from "react";
import { useLocation } from "react-router-dom";
import { Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const getPageTitle = (pathname: string): string => {
  const pathMap: Record<string, string> = {
    "/": "Dashboard",
    "/sales": "Sales",
    "/sales/customers": "Customer Search",
    "/sales/new": "New Sale",
    "/repairs": "Repair Management",
    "/repairs/new": "New Repair",
    "/repairs/track": "Track Repairs",
    "/reports": "Reports",
    "/reports/sales": "Sales Reports",
    "/reports/repairs": "Repair Reports",
    "/reports/stores": "Store Performance",
    "/customers": "Customer Management",
  };

  return pathMap[pathname] || "Laptop Store CRM";
};

export function Header() {
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <header className="bg-gray-50 border-b border-gray-200 px-8 py-5 lg:px-16">
      <div className="flex items-center justify-between">
        {/* Left side - Page title and breadcrumb */}
        <div className="flex items-center gap-6">
          <div className="lg:hidden w-12" />{" "}
          {/* Spacer for mobile menu button */}
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-1">
              {pageTitle}
            </h1>
            <div className="flex items-center gap-3 text-base text-gray-500">
              <span>Laptop Store CRM</span>
              {location.pathname !== "/" && (
                <>
                  <span>/</span>
                  <span className="text-gray-900 font-semibold">{pageTitle}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right side - Online/Offline Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-600" />
            )}
            <Badge
              variant={isOnline ? "default" : "destructive"}
              className={
                "text-xs " + (isOnline ? "bg-green-500 text-white" : "")
              }
            >
              {isOnline ? "Online" : "Offline"}
            </Badge>
          </div>
        </div>
      </div>
    </header>
  );
}
