import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CustomerSearch } from "@/components/customers/CustomerSearch";
import { useToast } from "@/hooks/use-toast";
import {
  ShoppingCart,
  User,
  Package,
  CreditCard,
  Calculator,
  Trash2,
  Plus,
} from "lucide-react";
import { Customer, Product, Sale } from "@/types";
import { getStores } from "@/lib/dataUtils";

interface SaleItem {
  productName: string;
  serialNumber: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

const isMongoId = (id: string) => /^[a-f\d]{24}$/i.test(id);

export function NewSale() {
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [productName, setProductName] = useState<string>("");
  const [serialNumber, setSerialNumber] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [price, setPrice] = useState<string>("");
  const [discount, setDiscount] = useState<number>(0);
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "upi" | "emi">("cash");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const [taxRate] = useState<number>(18); // GST 18%
  const [showCustomerSearch, setShowCustomerSearch] = useState(true);

  // Load stores on component mount
  useEffect(() => {
    const loadStores = async () => {
      try {
        const loadedStores = await getStores();
        setStores(loadedStores);
        if (loadedStores.length > 0) setSelectedStoreId(loadedStores[0]._id);
      } catch (error) {
        console.error('Error loading stores:', error);
        toast({
          title: 'Error',
          description: 'Failed to load stores',
          variant: 'destructive',
        });
      }
    };

    loadStores();
  }, []);

  const addItemToSale = () => {
    if (quantity < 1) {
      toast({
        title: "Invalid Quantity",
        description: "Quantity must be at least 1",
        variant: "destructive",
      });
      return;
    }

    if (!productName.trim()) {
      toast({
        title: "Product Name Required",
        description: "Please enter a product name",
        variant: "destructive",
      });
      return;
    }

    if (!price) {
      toast({
        title: "Price Required",
        description: "Please enter a price for the product",
        variant: "destructive",
      });
      return;
    }

    const unitPrice = parseFloat(price);
    
    const newItem: SaleItem = {
      productName,
      serialNumber: serialNumber || `SN-${Date.now()}`,
      quantity,
      unitPrice,
      discount: 0,
    };
    
    setSaleItems([...saleItems, newItem]);
    setProductName("");
    setSerialNumber("");
    setQuantity(1);
    setPrice("");
  };

  const removeItem = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };



  const updateItemDiscount = (index: number, discount: number) => {
    const updated = [...saleItems];
    updated[index].discount = discount;
    setSaleItems(updated);
  };

  const calculateTotals = () => {
    const subtotal = saleItems.reduce((sum, item) => {
      return sum + item.unitPrice * item.quantity;
    }, 0);

    const totalDiscount =
      saleItems.reduce((sum, item) => {
        return sum + item.discount;
      }, 0) + discount;

    const discountedAmount = subtotal - totalDiscount;
    const tax = (discountedAmount * taxRate) / 100;
    const finalAmount = discountedAmount + tax;

    return {
      subtotal,
      totalDiscount,
      discountedAmount,
      tax,
      finalAmount,
    };
  };

  const processSale = async () => {
    if (!selectedCustomer) {
      toast({
        title: "Customer Required",
        description: "Please select a customer for this sale",
        variant: "destructive",
      });
      return;
    }

    if (saleItems.length === 0) {
      toast({
        title: "No Items",
        description: "Please add at least one item to the sale",
        variant: "destructive",
      });
      return;
    }

    // Check for items with quantity 0
    const hasInvalidQuantity = saleItems.some(item => item.quantity < 1);
    if (hasInvalidQuantity) {
      toast({
        title: "Invalid Quantity",
        description: "All items must have a quantity of at least 1",
        variant: "destructive",
      });
      return;
    }

    const customerId = selectedCustomer?._id || selectedCustomer?.id;
    if (!customerId || !isMongoId(customerId)) {
      toast({
        title: "Invalid Customer",
        description: "Customer ID is not valid.",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedStoreId || !isMongoId(selectedStoreId)) {
      toast({
        title: "Invalid Store",
        description: "Store ID is not valid.",
        variant: "destructive",
      });
      return;
    }
    
    // No need to validate product IDs since we're only doing manual entries now
    try {
      const totals = calculateTotals();
      // Prepare items for backend
      const items = saleItems.map((item) => ({
        productName: item.productName,
        serialNumber: item.serialNumber,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        isManualEntry: true, // All items are manual entries now
      }));
      const requestBody = {
        customer: customerId,
        store: selectedStoreId,
        items,
        totalAmount: totals.subtotal,
        discount: totals.totalDiscount,
        tax: totals.tax,
        paymentMethod,
        // Add more fields as needed (e.g., paymentDetails, notes)
      };
      console.log('[SALE CREATE] Request body:', requestBody);
      // Send to backend
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      let result;
      try {
        result = await response.json();
      } catch (e) {
        result = { success: false, message: 'Invalid server response' };
      }
      if (response.ok && result.success) {
        toast({
          title: "Sale Completed Successfully",
          description: `Sale ID: ${result.data.saleNumber || result.data._id}`,
        });
        setSaleItems([]);
        setQuantity(1);
        setPrice("");
        setDiscount(0);
      } else {
        toast({
          title: "Error",
          description: result.message || result.error || "Failed to create sale",
          variant: "destructive",
        });
        if (result.error || result.message) {
          console.error('[SALE CREATE ERROR]', result.error || result.message);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create sale";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      console.error('[SALE CREATE ERROR]', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const totals = calculateTotals();

  if (showCustomerSearch) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Sale</h1>
          <p className="text-gray-600 mt-2">
            Select customer to begin sale process
          </p>
        </div>

        <CustomerSearch
          onCustomerSelect={(customer) => {
            setSelectedCustomer(customer);
            setShowCustomerSearch(false);
          }}
          showAddCustomer={true}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Sale</h1>
          <p className="text-gray-600 mt-2">Create a new sale transaction</p>
        </div>
        <Button variant="outline" onClick={() => setShowCustomerSearch(true)}>
          <User className="w-4 h-4 mr-2" />
          Change Customer
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Sale Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Selected Customer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCustomer && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-semibold">{selectedCustomer.name}</h3>
                    <p className="text-sm text-gray-600">
                      {selectedCustomer.email}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedCustomer.phone}
                    </p>
                  </div>
                  <Badge variant="default">{selectedCustomer.status}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Add Products
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="productName">Product Name *</Label>
                    <Input
                      id="productName"
                      placeholder="Enter product name"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="serialNumber">Serial Number</Label>
                    <Input
                      id="serialNumber"
                      placeholder="Enter serial number"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Price *</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Enter price"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Button
                    type="button"
                    onClick={addItemToSale}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>
              </div>

            </CardContent>
          </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Sale Items ({saleItems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {saleItems.length === 0 ? (
                    <div className="text-center py-8">
                      <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No items added to sale yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {saleItems.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="font-medium">
                              {item.productName}
                              {item.serialNumber && (
                                <span className="text-xs text-gray-500 ml-2">
                                  (SN: {item.serialNumber})
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {item.quantity} × ₹{item.unitPrice.toFixed(2)}
                              {item.discount > 0 && (
                                <span className="text-red-500 ml-2">
                                  -₹{item.discount.toFixed(2)}
                                </span>
                              )}

                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                          placeholder="Discount"
                          value={item.discount}
                          onChange={(e) =>
                            updateItemDiscount(
                              index,
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="w-24"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Store selection dropdown */}
          <div className="mb-4">
            <Label htmlFor="store">Store</Label>
            <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
              <SelectTrigger id="store" className="w-full">
                <SelectValue placeholder="Select a store" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store._id} value={store._id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Right Column - Sale Summary */}
        <div className="space-y-6">
          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={paymentMethod}
                onValueChange={(value: any) => setPaymentMethod(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="emi">EMI</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Bill Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Bill Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{totals.subtotal.toLocaleString()}</span>
              </div>

              <div className="flex justify-between">
                <Label htmlFor="additional-discount">
                  Additional Discount:
                </Label>
                <Input
                  id="additional-discount"
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-24 text-right"
                />
              </div>

              <div className="flex justify-between text-green-600">
                <span>Total Discount:</span>
                <span>-₹{totals.totalDiscount.toLocaleString()}</span>
              </div>

              <div className="flex justify-between">
                <span>After Discount:</span>
                <span>₹{totals.discountedAmount.toLocaleString()}</span>
              </div>

              <div className="flex justify-between">
                <span>GST ({taxRate}%):</span>
                <span>₹{totals.tax.toLocaleString()}</span>
              </div>

              <Separator />

              <div className="flex justify-between text-lg font-bold">
                <span>Total Amount:</span>
                <span>₹{totals.finalAmount.toLocaleString()}</span>
              </div>

              <Button
                onClick={processSale}
                disabled={
                  isProcessing || saleItems.length === 0 || !selectedCustomer
                }
                className="w-full mt-4"
                size="lg"
              >
                {isProcessing ? "Processing..." : "Complete Sale"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
