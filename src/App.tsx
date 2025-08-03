import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Login } from "@/pages/Login";
import Dashboard from "@/pages/SimpleDashboard";
import { SalesCustomers } from "@/pages/sales/SalesCustomers";
import { NewSale } from "@/pages/sales/NewSale";
import { DailySales } from "@/pages/sales/DailySales";
import SalesOverview from "@/pages/SalesOverview";
import RepairsOverview from "@/pages/SimpleRepairs";
import { NewRepair } from "@/pages/repairs/NewRepair";
import { TrackRepair } from "@/pages/repairs/TrackRepair";
import ReportsOverview from "@/pages/SimpleReports";
import { SalesReports } from "@/pages/reports/SalesReports";
import { RepairReports } from "@/pages/reports/RepairReports";
import { StoreReports } from "@/pages/reports/StoreReports";
import CustomerManagement from "@/pages/CustomerManagement";
import TestPage from "@/pages/TestPage";
import NotFound from "@/pages/NotFound";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import UserManagement from "@/pages/UserManagement";

const AppContent = () => {
  const { setSessionExpiredCallback } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Set up the callback to navigate to login when session expires
    setSessionExpiredCallback(() => {
      navigate('/login');
    });
  }, [navigate, setSessionExpiredCallback]);

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />

      {/* Redirect root to login if not authenticated */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="sales" element={<SalesOverview />} />
        <Route path="sales/customers" element={<SalesCustomers />} />
        <Route path="sales/daily" element={<DailySales />} />
        <Route path="sales/new" element={<NewSale />} />
        <Route path="repairs" element={<RepairsOverview />} />
        <Route path="repairs/new" element={<NewRepair />} />
        <Route path="repairs/track" element={<TrackRepair />} />
        <Route path="reports" element={<ReportsOverview />} />
        <Route path="reports/sales" element={<SalesReports />} />
        <Route path="reports/repairs" element={<RepairReports />} />
        <Route path="reports/store" element={<StoreReports />} />
        {/* Keep both routes for backward compatibility */}
        <Route path="reports/stores" element={<StoreReports />} />
        <Route path="customers" element={<CustomerManagement />} />
        <Route path="users" element={
          <ProtectedRoute requiredRoles={["admin"]}>
            <UserManagement />
          </ProtectedRoute>
        } />
        <Route path="test" element={<TestPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
          <Toaster />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
