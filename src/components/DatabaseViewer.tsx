import React, { useState, useEffect } from "react";
import { apiClient } from "@/services/api";

export default function DatabaseViewer() {
  const [customers, setCustomers] = useState([]);
  const [rawData, setRawData] = useState("");
  const [loading, setLoading] = useState(false);

  const loadDatabaseData = async () => {
    try {
      setLoading(true);

      // Check if we can reach the API first
      const response = await apiClient.getCustomers();
      console.log("Raw database response:", response);

      setCustomers(response.data?.customers || []);
      setRawData(JSON.stringify(response, null, 2));
    } catch (error) {
      console.warn("Database connection unavailable:", error.message);
      setCustomers([]);
      setRawData(`Database Status: Disconnected

Error: ${error.message}

This is normal if:
- MongoDB is not running
- Backend server is not started
- Network connectivity issues

To fix:
1. Start MongoDB: net start MongoDB (Windows)
2. Start backend: npm run server
3. Check API at: http://localhost:5001/api/health`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatabaseData();
  }, []);

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white border-2 border-gray-300 rounded-lg shadow-xl z-50">
      <div className="bg-gray-800 text-white px-4 py-2 rounded-t-lg flex justify-between items-center">
        <h3 className="font-semibold">MongoDB Database Viewer</h3>
        <button
          onClick={loadDatabaseData}
          disabled={loading}
          className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="p-4 max-h-96 overflow-y-auto">
        <div className="mb-4">
          <h4 className="font-semibold text-gray-800 mb-2">
            Database Summary:
          </h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              <strong>Collection:</strong> customers
            </p>
            <p>
              <strong>Total Records:</strong> {customers.length}
            </p>
            <p>
              <strong>Database:</strong> laptop_store_crm
            </p>
            <p>
              <strong>Last Updated:</strong> {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <h4 className="font-semibold text-gray-800 mb-2">Recent Records:</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {customers.slice(0, 3).map((customer, index) => (
              <div key={index} className="p-2 bg-gray-50 rounded text-xs">
                <div>
                  <strong>Name:</strong> {customer.name}
                </div>
                <div>
                  <strong>Email:</strong> {customer.email}
                </div>
                <div>
                  <strong>ID:</strong> {customer._id}
                </div>
                <div>
                  <strong>Created:</strong>{" "}
                  {new Date(customer.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        <details className="text-xs">
          <summary className="cursor-pointer font-semibold text-gray-800 mb-2">
            Raw Database Response (Click to expand)
          </summary>
          <pre className="bg-gray-100 p-2 rounded overflow-x-auto text-xs">
            {rawData || "No data"}
          </pre>
        </details>
      </div>
    </div>
  );
}
