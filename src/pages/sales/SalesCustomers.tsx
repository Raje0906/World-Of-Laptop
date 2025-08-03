import React from "react";
import { CustomerSearch } from "@/components/customers/CustomerSearch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, Search, QrCode, UserPlus } from "lucide-react";

export function SalesCustomers() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer Search</h1>
          <p className="text-gray-600 mt-2">
            Find existing customers or add new ones to the system
          </p>
        </div>
      </div>

      {/* Search Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            How to Search
          </CardTitle>
          <CardDescription>
            Multiple ways to find customers quickly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
              <Users className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900">
                  Customer Details
                </h3>
                <p className="text-sm text-blue-700">
                  Search by name, email, or phone number
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
              <QrCode className="w-6 h-6 text-green-600 mt-1" />
              <div>
                <h3 className="font-semibold text-green-900">
                  Product Barcode
                </h3>
                <p className="text-sm text-green-700">
                  Scan or enter barcode to find product owner
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
              <UserPlus className="w-6 h-6 text-purple-600 mt-1" />
              <div>
                <h3 className="font-semibold text-purple-900">Add New</h3>
                <p className="text-sm text-purple-700">
                  Create new customer if not found
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Search Component */}
      <CustomerSearch showAddCustomer={true} />
    </div>
  );
}
