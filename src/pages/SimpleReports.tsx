import React from "react";

export default function SimpleReports() {
  // Mock data for charts
  const salesData = [
    { month: "Jan", sales: 45, revenue: 180000 },
    { month: "Feb", sales: 52, revenue: 210000 },
    { month: "Mar", sales: 48, revenue: 195000 },
    { month: "Apr", sales: 61, revenue: 245000 },
    { month: "May", sales: 55, revenue: 220000 },
    { month: "Jun", sales: 67, revenue: 268000 },
  ];

  const repairData = [
    { month: "Jan", repairs: 23, completed: 20 },
    { month: "Feb", repairs: 28, completed: 25 },
    { month: "Mar", repairs: 31, completed: 29 },
    { month: "Apr", repairs: 26, completed: 24 },
    { month: "May", repairs: 34, completed: 31 },
    { month: "Jun", repairs: 29, completed: 27 },
  ];

  const storePerformance = [
    { store: "Central", sales: 120, revenue: 480000 },
    { store: "North", sales: 98, revenue: 392000 },
    { store: "South", sales: 87, revenue: 348000 },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Reports & Analytics
        </h1>
        <p className="text-gray-600">
          Comprehensive business insights and performance metrics
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500">Total Sales</h3>
          <p className="text-2xl font-bold text-blue-600">328</p>
          <p className="text-sm text-green-600">↑ 12% from last month</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500">Revenue</h3>
          <p className="text-2xl font-bold text-green-600">₹13.2L</p>
          <p className="text-sm text-green-600">↑ 8% from last month</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500">Repairs</h3>
          <p className="text-2xl font-bold text-orange-600">171</p>
          <p className="text-sm text-green-600">↑ 5% completion rate</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500">Customers</h3>
          <p className="text-2xl font-bold text-purple-600">245</p>
          <p className="text-sm text-blue-600">15 new this month</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Sales Chart */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold mb-4">Sales Trend</h2>
          <div className="space-y-4">
            {salesData.map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-12 text-sm font-medium">{item.month}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="bg-blue-200 h-6 rounded"
                      style={{ width: `${(item.sales / 70) * 100}%` }}
                    ></div>
                    <span className="text-sm text-gray-600">{item.sales}</span>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  ₹{(item.revenue / 1000).toFixed(0)}K
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Repairs Chart */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold mb-4">Repair Completion</h2>
          <div className="space-y-4">
            {repairData.map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-12 text-sm font-medium">{item.month}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="bg-orange-200 h-6 rounded"
                      style={{ width: `${(item.repairs / 35) * 100}%` }}
                    ></div>
                    <span className="text-sm text-gray-600">
                      {item.repairs}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-green-600">
                  {Math.round((item.completed / item.repairs) * 100)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Store Performance */}
      <div className="bg-white rounded-lg shadow border mb-8">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Store Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Store
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sales
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg. Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {storePerformance.map((store, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {store.store} Store
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {store.sales} orders
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{(store.revenue / 100000).toFixed(1)}L
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{Math.round(store.revenue / store.sales).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div
                        className="bg-green-200 h-2 rounded-full"
                        style={{
                          width: `${(store.revenue / 500000) * 100}%`,
                          maxWidth: "100px",
                        }}
                      ></div>
                      <span className="ml-2 text-sm text-gray-500">
                        {Math.round((store.revenue / 500000) * 100)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Sales Reports</h3>
          <p className="text-blue-700 text-sm mb-4">
            Detailed sales analysis and trends
          </p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            View Sales Reports
          </button>
        </div>

        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <h3 className="font-semibold text-green-900 mb-2">
            Repair Analytics
          </h3>
          <p className="text-green-700 text-sm mb-4">
            Service performance and metrics
          </p>
          <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            View Repair Reports
          </button>
        </div>

        <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
          <h3 className="font-semibold text-purple-900 mb-2">
            Customer Insights
          </h3>
          <p className="text-purple-700 text-sm mb-4">
            Customer behavior and patterns
          </p>
          <button className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
            View Customer Reports
          </button>
        </div>
      </div>

      <div className="mt-8 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <h3 className="font-semibold text-purple-900">
          ✅ Reports & Analytics Working!
        </h3>
        <p className="text-purple-800">
          This page shows comprehensive business analytics and reporting
          features.
        </p>
        <p className="text-sm text-purple-700 mt-1">
          Sales trends, repair metrics, and store performance data are all
          displayed.
        </p>
      </div>
    </div>
  );
}
