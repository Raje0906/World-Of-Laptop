import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Customer } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerSearch } from "@/components/customers/CustomerSearch";
import { StoreSelector } from "@/components/StoreSelector";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/contexts/AuthContext";
import { getStores } from "@/lib/dataUtils";
import { Trash2, Plus, Calculator, CreditCard, DollarSign, Smartphone, Calendar } from "lucide-react";

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
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "upi" | "emi">("cash");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const [taxRate] = useState<number>(18); // GST 18%
  const [showCustomerSearch, setShowCustomerSearch] = useState(true);
  
  // Use store context
  const { currentStore } = useStore();
  const { user } = useAuth();

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

  const updateItemQuantity = (index: number, quantity: number) => {
    const updated = [...saleItems];
    updated[index].quantity = quantity;
    setSaleItems(updated);
  };

  const updateItemPrice = (index: number, price: number) => {
    const updated = [...saleItems];
    updated[index].unitPrice = price;
    setSaleItems(updated);
  };

  const updateItemDiscount = (index: number, discount: number) => {
    const updated = [...saleItems];
    updated[index].discount = discount;
    setSaleItems(updated);
  };

  const calculateTotals = () => {
    const subtotal = saleItems.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unitPrice;
      const itemDiscount = (itemTotal * item.discount) / 100;
      return sum + itemTotal - itemDiscount;
    }, 0);

    const tax = (subtotal * taxRate) / 100;
    const total = subtotal + tax;

    return { subtotal, tax, total };
  };

  const processSale = async () => {
    // Validate store selection for admin users
    if (user?.role === 'admin' && !currentStore) {
      toast({
        title: "Store Selection Required",
        description: "Please select a store to process the sale",
        variant: "destructive",
      });
      return;
    }

    // Validate customer selection
    if (!selectedCustomer) {
      toast({
        title: "Customer Required",
        description: "Please select a customer for this sale",
        variant: "destructive",
      });
      return;
    }

    // Validate sale items
    if (saleItems.length === 0) {
      toast({
        title: "Sale Items Required",
        description: "Please add at least one item to the sale",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { subtotal, tax, total } = calculateTotals();

      // Determine store ID based on user role
      const storeId = user?.role === 'admin' ? currentStore?._id : user?.store_id;

      const saleData = {
        customer: selectedCustomer._id || selectedCustomer.id,
        items: saleItems.map(item => ({
          productName: item.productName,
          serialNumber: item.serialNumber,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
        })),
        subtotal,
        tax,
        total,
        paymentMethod,
        storeId,
        date: new Date().toISOString(),
      };

      // Process sale logic here
      console.log("Processing sale:", saleData);
      
      toast({
        title: "Sale Processed",
        description: `Sale completed successfully for ${selectedCustomer.name}`,
      });

      // Reset form
      setSaleItems([]);
      setSelectedCustomer(null);
      setShowCustomerSearch(true);
      setPaymentMethod("cash");
    } catch (error) {
      console.error("Error processing sale:", error);
      toast({
        title: "Error",
        description: "Failed to process sale. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

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

  const { subtotal, tax, total } = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Sale</h1>
          <p className="text-gray-600 mt-2">
            Customer: <span className="font-semibold">{selectedCustomer?.name}</span>
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowCustomerSearch(true)}
        >
          Change Customer
        </Button>
      </div>

      {/* Store Selection */}
      <StoreSelector 
        required={user?.role === 'admin'} 
        label="Sale Store"
        className="max-w-md"
      />

      {/* Sale Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Sale Items
          </CardTitle>
          <CardDescription>
            Add products to the sale
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Item Form */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="productName">Product Name</Label>
              <Input
                id="productName"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Enter product name"
              />
            </div>
            <div>
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input
                id="serialNumber"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="Optional"
              />
            </div>
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
              <Label htmlFor="price">Unit Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          
          <Button onClick={addItemToSale} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>

          {/* Items List */}
          {saleItems.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Sale Items</h3>
              {saleItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-sm text-gray-500">SN: {item.serialNumber}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                      className="w-20"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItemPrice(index, parseFloat(e.target.value) || 0)}
                      className="w-24"
                    />
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={item.discount}
                      onChange={(e) => updateItemDiscount(index, parseFloat(e.target.value) || 0)}
                      className="w-20"
                      placeholder="%"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Cash
                </div>
              </SelectItem>
              <SelectItem value="card">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Card
                </div>
              </SelectItem>
              <SelectItem value="upi">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  UPI
                </div>
              </SelectItem>
              <SelectItem value="emi">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  EMI
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Sale Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (18%):</span>
              <span>₹{tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Process Sale Button */}
      <div className="flex justify-end">
        <Button
          onClick={processSale}
          disabled={isProcessing || saleItems.length === 0}
          className="px-8"
        >
          {isProcessing ? "Processing..." : "Process Sale"}
        </Button>
      </div>
    </div>
  );
}
