import React, { useState, useRef } from "react";
import {
  Search,
  QrCode,
  Camera,
  UserPlus,
  Phone,
  Mail,
  MapPin,
  Package,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import {
  searchCustomers,
  searchByBarcode,
  searchBySerialNumber,
  simulateBarcodeScan,
  addCustomer,
  checkApiHealth,
} from "@/lib/dataUtils";
import { Customer, SearchableFields, BarcodeResult } from "@/types";

interface CustomerSearchProps {
  onCustomerSelect?: (customer: Customer) => void;
  showAddCustomer?: boolean;
}

export function CustomerSearch({
  onCustomerSelect,
  showAddCustomer = true,
}: CustomerSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState<SearchableFields>("name");
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [noRealCustomers, setNoRealCustomers] = useState(false);
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setNoRealCustomers(false);
      return;
    }

    setIsLoading(true);
    setNoRealCustomers(false);

    try {
      const results = await searchCustomers({
        query: searchQuery,
        field: searchField,
      });
      setSearchResults(results);
      if (results.length === 0) {
        setNoRealCustomers(true);
        toast({
          title: "No customers found",
          description: "No real customers found in the database. Please add a new customer.",
          variant: "destructive",
        });
      }
      // Auto-scroll to results
      setTimeout(() => {
        if (resultsRef.current) {
          resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setNoRealCustomers(false);
      
      // Provide specific error messages based on error type
      let errorMessage = "Failed to search customers. Please try again.";
      
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        errorMessage = "Unable to connect to the server. Please check your internet connection and try again.";
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Search Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBarcodeScanner = async () => {
    try {
      setIsScanning(true);

      // Check if camera access is available
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }, // Use back camera on mobile
          });

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }

          // Simulate barcode detection after 3 seconds
          setTimeout(async () => {
            const result = await simulateBarcodeScan();
            handleBarcodeResult(result);

            // Stop camera
            stream.getTracks().forEach((track) => track.stop());
            setIsScanning(false);
          }, 3000);
        } catch (cameraError) {
          // Camera access denied or not available
          console.warn(
            "Camera access denied, falling back to manual input:",
            cameraError,
          );
          setIsScanning(false);

          // Show manual barcode input dialog
          const barcodeInput = prompt(
            "Camera access denied. Please enter barcode manually:",
          );
          if (barcodeInput && barcodeInput.trim()) {
            handleBarcodeResult({
              text: barcodeInput.trim(),
              format: "MANUAL",
            });
          } else {
            toast({
              title: "Camera Access Required",
              description:
                "Please enable camera permissions in your browser settings or enter barcode manually",
              variant: "destructive",
            });
          }
        }
      } else {
        // Browser doesn't support camera access
        setIsScanning(false);
        toast({
          title: "Camera Not Supported",
          description:
            "Your browser doesn't support camera access. Using simulated scanner instead.",
        });

        // Fallback to simulated scanning
        const result = await simulateBarcodeScan();
        handleBarcodeResult(result);
      }
    } catch (error) {
      console.error("Barcode scanner error:", error);
      setIsScanning(false);
      toast({
        title: "Scanner Error",
        description:
          "Unable to access camera. Please try again or enter barcode manually.",
        variant: "destructive",
      });
    }
  };

  const handleBarcodeResult = async (result: BarcodeResult) => {
    setSearchField("barcode");
    setSearchQuery(result.text);

    try {
      // Auto-search with the scanned barcode
      const product = await searchByBarcode(result.text);
      if (product) {
        const results = await searchCustomers({
          query: result.text,
          field: "barcode",
        });
        setSearchResults(results);

        toast({
          title: "Barcode Scanned Successfully",
          description: `Found product: ${product.name}`,
        });
      } else {
        setSearchResults([]);
        toast({
          title: "Product not found",
          description: "No product found with this barcode",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error handling barcode result:', error);
      toast({
        title: "Error",
        description: "Failed to process barcode",
        variant: "destructive",
      });
    }
  };

  const handleAddCustomer = async (formData: FormData) => {
    setIsLoading(true);
    try {
      // Validate required fields
      const name = formData.get("name") as string;
      const email = formData.get("email") as string;
      const phone = formData.get("phone") as string;
      const address = formData.get("address") as string;
      const city = formData.get("city") as string;

      // Check if all required fields are filled
      if (!name?.trim()) {
        toast({
          title: "Validation Error",
          description: "Full Name is required",
          variant: "destructive",
        });
        return;
      }

      if (!email?.trim()) {
        toast({
          title: "Validation Error",
          description: "Email is required",
          variant: "destructive",
        });
        return;
      }

      if (!phone?.trim()) {
        toast({
          title: "Validation Error",
          description: "Phone Number is required",
          variant: "destructive",
        });
        return;
      }

      if (!address?.trim()) {
        toast({
          title: "Validation Error",
          description: "Address is required",
          variant: "destructive",
        });
        return;
      }

      if (!city?.trim()) {
        toast({
          title: "Validation Error",
          description: "City is required",
          variant: "destructive",
        });
        return;
      }

      // Validate phone number format (exactly 10 digits)
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(phone)) {
        toast({
          title: "Validation Error",
          description: "Phone number must be exactly 10 digits (numbers only)",
          variant: "destructive",
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid email address",
          variant: "destructive",
        });
        return;
      }

      const addressObj: Address = {
        line1: address,
        city: city,
        state: (formData.get("state") as string) || "",
        pincode: (formData.get("pincode") as string) || "",
      };

      const newCustomer = await addCustomer({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        address: addressObj,
        city: addressObj.city, // For backward compatibility
        status: "active" as const,
        totalPurchases: 0,
        dateAdded: new Date().toISOString(),
      });

      toast({
        title: "Customer Added",
        description: `${newCustomer.name} has been added to the database`,
      });

      setShowAddDialog(false);
      setSearchResults([newCustomer]);

      if (onCustomerSelect) {
        onCustomerSelect(newCustomer);
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      const errorMessage = error instanceof Error && error.message.includes('already exists')
        ? error.message
        : 'Failed to add customer. Please try again.';
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Debug function to test API connectivity
  const handleDebugApi = async () => {
    try {
      const health = await checkApiHealth();
      console.log('API Health Check Result:', health);
      
      if (health.healthy) {
        toast({
          title: "API Connection OK",
          description: `Connected to: ${health.url}`,
          variant: "default",
        });
      } else {
        toast({
          title: "API Connection Failed",
          description: health.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Debug API error:', error);
      toast({
        title: "Debug Failed",
        description: "Could not check API health",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Customer Search
          </CardTitle>
          <CardDescription>
            Find customers by name, email, or phone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select
              value={searchField}
              onValueChange={(value) =>
                setSearchField(value as SearchableFields)
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="serialNumber">Serial Number</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder={`Search by ${searchField}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />

            <Button onClick={handleSearch} disabled={!searchQuery.trim()}>
              <Search className="w-4 h-4" />
            </Button>
            
            {/* Debug button - only show in development */}
            {import.meta.env.DEV && (
              <Button 
                variant="outline" 
                onClick={handleDebugApi}
                title="Debug API Connection"
              >
                🐛 Debug
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      <div ref={resultsRef}>
        {searchResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Search Results ({searchResults.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {searchResults.map((customer, index) => {
                  // Ensure we have a unique key for each item
                  // Use customer.id if available, otherwise fall back to index
                  const uniqueKey = customer?.id ? `customer-${customer.id}` : `customer-${index}`;
                  
                  return (
                    <div
                      key={uniqueKey}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => onCustomerSelect?.(customer)}
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{customer?.name || 'Unnamed Customer'}</h3>
                          <Badge
                            variant={
                              customer?.status === "active" ? "default" : "secondary"
                            }
                            className="whitespace-nowrap"
                          >
                            {customer?.status || 'unknown'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {customer.email}
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {customer.phone}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {customer.address?.city || customer.city || 'N/A'}
                          </div>
                        </div>

                        <div className="text-sm">
                          <span className="font-medium">Total Purchases: </span>
                          <span className="text-green-600">
                            ₹{(customer.totalPurchases || 0).toLocaleString()}
                          </span>
                          {customer.lastPurchase && (
                            <span className="ml-4 text-gray-500">
                              Last:{" "}
                              {new Date(customer.lastPurchase).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {onCustomerSelect && (
                          <Button 
                            className="ml-4"
                            onClick={(e) => {
                              e.stopPropagation();
                              onCustomerSelect(customer);
                            }}
                          >
                            Select
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* No Results */}
      {searchQuery && searchResults.length === 0 && !isScanning && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No customers found
            </h3>
            <p className="text-gray-600 text-center mb-4">
              {noRealCustomers
                ? "No real customers found in the database. Please add a new customer."
                : `No customers found with "${searchQuery}". Would you like to add a new customer?`}
            </p>
            {showAddCustomer && (
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add "{searchField === 'email' ? searchQuery : searchField === 'phone' ? searchQuery : 'New Customer'}"
                  </Button>
                </DialogTrigger>
                <DialogContent 
                  className="sm:max-w-md"
                  aria-labelledby="dialog-title"
                  aria-describedby="dialog-description"
                >
                  <DialogHeader>
                    <DialogTitle id="dialog-title">Add New Customer</DialogTitle>
                    <DialogDescription id="dialog-description">
                      Enter customer details to add them to the database
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
                      <Label htmlFor="name">Full Name *</Label>
                      <Input 
                        id="name" 
                        name="name" 
                        required 
                        defaultValue={searchField === 'name' ? searchQuery : ''}
                        placeholder="Enter customer full name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input 
                        id="email" 
                        name="email" 
                        type="email" 
                        required 
                        defaultValue={searchField === 'email' ? searchQuery : ''}
                        placeholder="customer@example.com"
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input 
                        id="phone" 
                        name="phone" 
                        type="tel"
                        required 
                        defaultValue={searchField === 'phone' ? searchQuery : ''}
                        placeholder="9876543210"
                        pattern="[0-9]{10}"
                        maxLength={10}
                        onKeyPress={(e) => {
                          // Only allow numbers
                          if (!/[0-9]/.test(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        onChange={(e) => {
                          // Remove any non-numeric characters
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          e.target.value = value;
                        }}
                      />
                    </div>

                    <div>
                      <Label htmlFor="address">Address *</Label>
                      <Textarea 
                        id="address" 
                        name="address" 
                        rows={2} 
                        required
                        placeholder="Enter customer address"
                      />
                    </div>

                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input 
                        id="city" 
                        name="city" 
                        required
                        placeholder="Enter city name"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? "Adding..." : "Add Customer"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
