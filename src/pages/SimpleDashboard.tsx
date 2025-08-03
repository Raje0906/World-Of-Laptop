import React from "react";
import QuietSystemStatus from "../components/QuietSystemStatus";
import { useDashboardStats } from "../hooks/useDashboardStats";

export default function SimpleDashboard() {
  const { stats, loading, error } = useDashboardStats();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      <p className="text-gray-600">Your laptop store CRM is working!</p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold">Sales</h3>
          <p className="text-2xl font-bold text-blue-600">{stats?.totalSales}</p>
          <p className="text-sm text-gray-500">This month</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold">Revenue</h3>
          <p className="text-2xl font-bold text-green-600">₹{stats?.totalRevenue.toLocaleString()}</p>
          <p className="text-sm text-gray-500">This month</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold">Repairs</h3>
          <p className="text-2xl font-bold text-orange-600">{stats?.activeRepairs}</p>
          <p className="text-sm text-gray-500">Active</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold">Customers</h3>
          <p className="text-2xl font-bold text-purple-600">{stats?.totalCustomers}</p>
          <p className="text-sm text-gray-500">Total</p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Quick Navigation</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a
            href="/customers"
            className="p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
          >
            <h3 className="font-semibold text-blue-900">Customer Management</h3>
            <p className="text-sm text-blue-700">Manage customers</p>
          </a>

<a
            href="/repairs"
            className="p-4 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors"
          >
            <h3 className="font-semibold text-orange-900">Repairs</h3>
            <p className="text-sm text-orange-700">Track repairs</p>
          </a>

          <a
            href="/reports"
            className="p-4 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors"
          >
            <h3 className="font-semibold text-purple-900">Reports</h3>
            <p className="text-sm text-purple-700">View analytics</p>
          </a>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuietSystemStatus />
      </div>
    </div>
  );
}
