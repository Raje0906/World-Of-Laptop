import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Search,
  UserPlus,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ShoppingCart,
  Wrench,
  Edit,
  Eye,
  Filter,
  Download,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCustomers, addCustomer, updateCustomer, deleteCustomer, getCustomer, saveCustomersToIDB, getCustomersFromIDB } from "@/lib/dataUtils";
import { Address, Customer, Sale, Repair } from "@/types";
import * as XLSX from "xlsx";

// Fetch real customer stats from the backend
async function fetchCustomerStats() {
  const res = await fetch("/api/customers/stats");
  const data = await res.json();
  if (data.success) return data.data;
  throw new Error(data.message || "Failed to fetch customer stats");
}

// Mock data - replace with actual API calls
const getSales = (customerId: string): Sale[] => {
  // This should be replaced with actual API call to fetch sales for a customer
  return [];
};

const getRepairs = (customerId: string): Repair[] => {
  // This should be replaced with actual API call to fetch repairs for a customer
  return [];
};

export default function CustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const handleStatusFilter = (status: "all" | "active" | "inactive") => {
    setStatusFilter(status);
    // No need to call loadCustomers here as the useEffect will trigger it
  };
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [stats, setStats] = useState<{ totalCustomers: number; activeCustomers: number; totalRevenue: number; averageSpend: number } | null>(null);

  useEffect(() => {
    fetchCustomerStats()
      .then(setStats)
      .catch((err) => {
        setStats(null);
        toast({ title: "Error", description: err.message || "Failed to fetch customer stats", variant: "destructive" });
      });
  }, []);

  useEffect(() => {
    loadCustomers(statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchQuery]);

  const loadCustomers = async (status: 'all' | 'active' | 'inactive' = 'active') => {
    setIsLoading(true);
    try {
      let filteredCustomers: any[] = [];
      let online = navigator.onLine;
      if (online) {
        filteredCustomers = await getCustomers(status);
        await saveCustomersToIDB(filteredCustomers);
      } else {
        filteredCustomers = await getCustomersFromIDB();
      }
      setCustomers(filteredCustomers);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load customers',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterCustomers = () => {
    let filtered = [...customers]; // Create a new array to avoid mutating the original

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (customer.email && customer.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (customer.phone && customer.phone.includes(searchQuery)) ||
          (customer.city && customer.city.toLowerCase().includes(searchQuery.toLowerCase())),
      );
    }

    setFilteredCustomers(filtered);
  };

  const handleAddCustomer = async (formData: FormData) => {
    console.log('[handleAddCustomer] called with:', Object.fromEntries(formData.entries()));
    setIsLoading(true);
    try {
      // Ensure all required address fields are present and not empty
      const address = {
        line1: (formData.get("line1") as string || '').trim(),
        city: (formData.get("city") as string || '').trim(),
        state: (formData.get("state") as string || '').trim(),
        pincode: (formData.get("pincode") as string || '').trim(),
        line2: (formData.get("address2") as string || '').trim(),
      };
      if (!address.line1 || !address.city || !address.state || !address.pincode) {
        toast({
          title: "Error",
          description: "All address fields are required.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      const newCustomer = await addCustomer({
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        phone: formData.get("phone") as string,
        address,
        status: "active" as const,
        dateAdded: new Date().toISOString(),
        totalPurchases: 0
      });

      setShowAddDialog(false);
      toast({
        title: "Customer Added",
        description: `${newCustomer.name} has been added successfully`,
      });
      // Reload customers from backend
      await loadCustomers(statusFilter);
    } catch (error: any) {
      console.error('Error adding customer:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add customer",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCustomer = async (formData: FormData) => {
    if (!selectedCustomer) return;

    setIsLoading(true);
    try {
      const updatedCustomer = await updateCustomer(selectedCustomer.id, {
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        phone: formData.get("phone") as string,
        address: {
          line1: formData.get("address") as string,
          city: formData.get("city") as string,
          state: formData.get("state") as string || '',
          pincode: formData.get("pincode") as string || '',
          line2: formData.get("address2") as string || ''
        } as Address,
        // Keep the old city field for backward compatibility
        city: formData.get("city") as string,
        status: (formData.get("status") as "active" | "inactive") || "active",
      });

      if (updatedCustomer) {
        setCustomers(
          customers.map((c) =>
            c.id === selectedCustomer.id ? updatedCustomer : c,
          ),
        );
        setShowEditDialog(false);
        setSelectedCustomer(null);
        toast({
          title: "Customer Updated",
          description: `${updatedCustomer.name} has been updated successfully`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update customer",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle customer deletion
  const handleDeleteCustomer = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      try {
        setIsLoading(true);
        await deleteCustomer(id);
        const updatedCustomers = customers.filter((customer) => customer.id !== id);
        setCustomers(updatedCustomers);
        toast({
          title: "Customer Deleted",
          description: "Customer has been deleted successfully",
        });
      } catch (error: any) {
        console.error('Error deleting customer:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to delete customer",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleViewCustomer = async (id: string) => {
    try {
      setIsLoading(true);
      const customer = await getCustomer(id);
      if (customer) {
        setSelectedCustomer(customer);
      } else {
        toast({
          title: "Error",
          description: "Customer not found",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
      toast({
        title: "Error",
        description: "Failed to load customer details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCustomerStats = (customerId: string) => {
    const sales = getSales(customerId);
    const repairs = getRepairs(customerId);

    const totalSpent = sales.reduce((sum: number, sale: Sale) => {
      return sum + (sale.finalAmount || 0);
    }, 0);

    return {
      totalSales: sales.length,
      totalRepairs: repairs.length,
      totalSpent,
      lastActivity: sales.length > 0 ? sales[sales.length - 1].date : null,
    };
  };

  const exportCustomers = () => {
    // Prepare data for Excel
    const exportData = filteredCustomers.map((customer) => ({
      Name: customer.name,
      Email: customer.email,
      Phone: customer.phone,
      "Address Line 1": customer.address?.line1 || '',
      City: customer.address?.city || '',
      State: customer.address?.state || '',
      Pincode: customer.address?.pincode || '',
      Status: customer.status,
      "Date Added": customer.dateAdded ? new Date(customer.dateAdded).toLocaleDateString() : '',
      "Total Purchases": customer.totalPurchases ?? 0,
    }));

    // Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");

    // Generate Excel file and trigger download
    XLSX.writeFile(workbook, `customers-${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const activeCustomers = stats?.activeCustomers ?? 0;
  const totalRevenue = stats?.totalRevenue ?? 0;
  const averageSpend = stats?.averageSpend ?? 0;
  const totalCustomers = stats?.totalCustomers ?? customers.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Customer Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage customer information and track their engagement
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCustomers}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => { console.log('[DialogTrigger] Add Customer clicked'); }}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent>
              {console.log('[DialogContent] Add Customer dialog rendered')}
              <DialogHeader>
                <DialogTitle>Add New Customer</DialogTitle>
                <DialogDescription>
                  Enter customer information to add them to the database
                </DialogDescription>
              </DialogHeader>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleAddCustomer(formData);
                }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="add-name">Full Name *</Label>
                  <Input id="add-name" name="name" required />
                </div>

                <div>
                  <Label htmlFor="add-email">Email *</Label>
                  <Input id="add-email" name="email" type="email" required />
                </div>

                <div>
                  <Label htmlFor="add-phone">Phone Number *</Label>
                  <Input id="add-phone" name="phone" required />
                </div>

                <div>
                  <Label htmlFor="add-line1">Address Line 1 *</Label>
                  <Input id="add-line1" name="line1" required />
                </div>

                <div>
                  <Label htmlFor="add-city">City *</Label>
                  <Input id="add-city" name="city" required />
                </div>

                <div>
                  <Label htmlFor="add-state">State *</Label>
                  <Input id="add-state" name="state" required />
                </div>

                <div>
                  <Label htmlFor="add-pincode">Pincode *</Label>
                  <Input id="add-pincode" name="pincode" required />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Adding..." : "Add Customer"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Customers</h3>
            <div className="text-3xl font-bold text-gray-900">{totalCustomers}</div>
            <div className="text-xs text-gray-500">{activeCustomers} active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Revenue</h3>
            <div className="text-3xl font-bold text-gray-900">₹{Number.isFinite(totalRevenue) ? totalRevenue.toLocaleString() : 0}L</div>
            <div className="text-xs text-gray-500">Customer lifetime value</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Average Spend</h3>
            <div className="text-3xl font-bold text-gray-900">₹{Number.isFinite(averageSpend) ? averageSpend.toLocaleString() : 0}</div>
            <div className="text-xs text-gray-500">Per customer</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Active Rate</h3>
            <div className="text-3xl font-bold text-green-600">{totalCustomers > 0 ? ((activeCustomers / totalCustomers) * 100).toFixed(1) : 0}%</div>
            <div className="text-xs text-gray-500">Customer engagement</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter Customers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Customer Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
          <CardDescription>
            Showing {filteredCustomers.length} of {customers.length} customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Purchases</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => {
                const stats = getCustomerStats(customer.id);
                return (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-gray-500">
                          Customer since{" "}
                          {new Date(customer.dateAdded).toLocaleDateString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="w-3 h-3" />
                          {customer.email}
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="w-3 h-3" />
                          {customer.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="w-3 h-3" />
                        {customer.city}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          ₹{(customer.totalPurchases ?? 0).toLocaleString()}
                        </p>
                        <div className="flex gap-2 text-xs text-gray-500">
                          <span>{stats.totalSales} sales</span>
                          <span>{stats.totalRepairs} repairs</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          customer.status === "active" ? "default" : "secondary"
                        }
                      >
                        {customer.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCustomer(customer.id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewCustomer(customer.id)}
                              disabled={isLoading}
                              aria-label={`View details for ${customer.name}`}
                            >
                              <Eye className="w-4 h-4" />
                              <span className="sr-only">View customer details</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Customer Details</DialogTitle>
                              <DialogDescription>
                                Complete information about {customer.name}
                              </DialogDescription>
                            </DialogHeader>

                            {selectedCustomer && (
                              <div className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div>
                                    <h4 className="font-semibold mb-2">
                                      Personal Information
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                      <div>
                                        <strong>Name:</strong>{" "}
                                        {selectedCustomer.name}
                                      </div>
                                      <div>
                                        <strong>Email:</strong>{" "}
                                        {selectedCustomer.email}
                                      </div>
                                      <div>
                                        <strong>Phone:</strong>{" "}
                                        {selectedCustomer.phone}
                                      </div>
                                      <div>
                                        <strong>Address Line 1:</strong> {selectedCustomer.address?.line1 || 'N/A'}
                                      </div>
                                      {selectedCustomer.address?.line2 && (
                                        <div>
                                          <strong>Address Line 2:</strong> {selectedCustomer.address.line2}
                                        </div>
                                      )}
                                      <div>
                                        <strong>City:</strong> {selectedCustomer.address?.city || 'N/A'}
                                      </div>
                                      <div>
                                        <strong>State:</strong> {selectedCustomer.address?.state || 'N/A'}
                                      </div>
                                      <div>
                                        <strong>Pincode:</strong> {selectedCustomer.address?.pincode || 'N/A'}
                                      </div>
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="font-semibold mb-2">
                                      Account Information
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                      <div>
                                        <strong>Customer Since:</strong>{" "}
                                        {new Date(
                                          selectedCustomer.dateAdded,
                                        ).toLocaleDateString()}
                                      </div>
                                      <div>
                                        <strong>Status:</strong>
                                        <Badge
                                          className="ml-2"
                                          variant={
                                            selectedCustomer.status === "active"
                                              ? "default"
                                              : "secondary"
                                          }
                                        >
                                          {selectedCustomer.status}
                                        </Badge>
                                      </div>
                                      <div>
                                        <strong>Total Purchases:</strong> ₹
                                        {(selectedCustomer.totalPurchases ?? 0).toLocaleString()}
                                      </div>
                                      {selectedCustomer.lastPurchase && (
                                        <div>
                                          <strong>Last Purchase:</strong>{" "}
                                          {new Date(
                                            selectedCustomer.lastPurchase,
                                          ).toLocaleDateString()}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-semibold mb-2">
                                    Activity Summary
                                  </h4>
                                  <div className="grid gap-4 md:grid-cols-3">
                                    <div className="p-3 bg-blue-50 rounded-lg">
                                      <div className="flex items-center gap-2">
                                        <ShoppingCart className="w-4 h-4 text-blue-600" />
                                        <span className="font-medium text-blue-900">
                                          Sales
                                        </span>
                                      </div>
                                      <p className="text-2xl font-bold text-blue-600">
                                        {
                                          getCustomerStats(selectedCustomer.id)
                                            .totalSales
                                        }
                                      </p>
                                    </div>

                                    <div className="p-3 bg-green-50 rounded-lg">
                                      <div className="flex items-center gap-2">
                                        <Wrench className="w-4 h-4 text-green-600" />
                                        <span className="font-medium text-green-900">
                                          Repairs
                                        </span>
                                      </div>
                                      <p className="text-2xl font-bold text-green-600">
                                        {
                                          getCustomerStats(selectedCustomer.id)
                                            .totalRepairs
                                        }
                                      </p>
                                    </div>

                                    <div className="p-3 bg-purple-50 rounded-lg">
                                      <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-purple-600" />
                                        <span className="font-medium text-purple-900">
                                          Total Spent
                                        </span>
                                      </div>
                                      <p className="text-lg font-bold text-purple-600">
                                        ₹
                                        {getCustomerStats(
                                          selectedCustomer.id,
                                        ).totalSpent.toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        <Dialog
                          open={showEditDialog}
                          onOpenChange={setShowEditDialog}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setShowEditDialog(true);
                              }}
                              disabled={isLoading}
                              aria-label={`Edit ${customer.name}`}
                            >
                              <Edit className="w-4 h-4" />
                              <span className="sr-only">Edit customer</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Customer</DialogTitle>
                              <DialogDescription>
                                Update customer information
                              </DialogDescription>
                            </DialogHeader>

                            {selectedCustomer && (
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  const formData = new FormData(
                                    e.currentTarget,
                                  );
                                  handleUpdateCustomer(formData);
                                }}
                                className="space-y-4"
                              >
                                <div>
                                  <Label htmlFor="edit-name">Full Name *</Label>
                                  <Input
                                    id="edit-name"
                                    name="name"
                                    defaultValue={selectedCustomer.name}
                                    required
                                  />
                                </div>

                                <div>
                                  <Label htmlFor="edit-email">Email *</Label>
                                  <Input
                                    id="edit-email"
                                    name="email"
                                    type="email"
                                    defaultValue={selectedCustomer.email}
                                    required
                                  />
                                </div>

                                <div>
                                  <Label htmlFor="edit-phone">
                                    Phone Number *
                                  </Label>
                                  <Input
                                    id="edit-phone"
                                    name="phone"
                                    defaultValue={selectedCustomer.phone}
                                    required
                                  />
                                </div>

                                <div>
                                  <Label htmlFor="edit-address">Address</Label>
                                  <Textarea
                                    id="edit-address"
                                    name="address"
                                    defaultValue={selectedCustomer.address}
                                    rows={2}
                                  />
                                </div>

                                <div>
                                  <Label htmlFor="edit-city">City</Label>
                                  <Input
                                    id="edit-city"
                                    name="city"
                                    defaultValue={selectedCustomer.city}
                                  />
                                </div>

                                <div>
                                  <Label htmlFor="edit-status">Status</Label>
                                  <Select
                                    name="status"
                                    defaultValue={selectedCustomer.status}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="active">
                                        Active
                                      </SelectItem>
                                      <SelectItem value="inactive">
                                        Inactive
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <Button
                                  type="submit"
                                  className="w-full"
                                  disabled={isLoading}
                                >
                                  {isLoading
                                    ? "Updating..."
                                    : "Update Customer"}
                                </Button>
                              </form>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredCustomers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No customers found
              </h3>
              <p className="text-gray-600">
                Try adjusting your search criteria or add a new customer
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
