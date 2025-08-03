import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus } from "lucide-react";
import { ToastAction } from "@/components/ui/toast";
import BarcodeScannerComponent from 'react-qr-barcode-scanner';

interface FormData {
  name: string;
  brand: string;
  model: string;
  category: string;
  price: string;
  cost: string;
  stock_quantity: string;
  min_stock_level: string;
  description: string;
  specifications: string;
  warranty_period: string;
  status: 'active' | 'inactive';
}

interface AddProductDialogProps {
  onProductAdded?: () => void;
}

const categories = [
  'Laptop', 'Desktop', 'Tablet', 'Smartphone', 'Monitor',
  'Printer', 'Accessory', 'Component', 'Software', 'Other'
];

export function AddProductDialog({ onProductAdded }: AddProductDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    model: '',
    category: '',
    price: '',
    cost: '',
    stock_quantity: '0',
    min_stock_level: '5',
    description: '',
    specifications: '{}',
    warranty_period: '12',
    status: 'active'
  });
  const { toast } = useToast();
  const [isMounted, setIsMounted] = React.useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const skuInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Focus SKU/model input for hardware scanner
  React.useEffect(() => {
    if (open && skuInputRef.current) {
      skuInputRef.current.focus();
    }
  }, [open]);

  // Handle barcode scan result
  const handleScan = (err: any, result: any) => {
    if (err) {
      setScanError('Scan error. Please try again.');
      return;
    }
    if (result) {
      setFormData(prev => ({ ...prev, model: result.text }));
      setShowScanner(false);
      setScanError(null);
      toast({ title: 'Scan Success', description: `Scanned: ${result.text}` });
      // Focus the next field or submit as needed
    }
  };

  if (!isMounted) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          cost: parseFloat(formData.cost),
          stock_quantity: parseInt(formData.stock_quantity, 10),
          min_stock_level: parseInt(formData.min_stock_level, 10),
          warranty_period: parseInt(formData.warranty_period, 10),
          specifications: formData.specifications ? JSON.parse(formData.specifications) : {}
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add product');
      }

      toast({
        title: 'Success',
        description: 'Product added successfully',
      });

      // Reset form
      setFormData({
        name: '',
        brand: '',
        model: '',
        category: '',
        price: '',
        cost: '',
        stock_quantity: '0',
        min_stock_level: '5',
        description: '',
        specifications: '{}',
        warranty_period: '12',
        status: 'active'
      });
      
      setOpen(false);
      onProductAdded?.();
    } catch (error: unknown) {
      console.error('Error adding product:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add product';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Scanner Controls */}
          <div className="flex gap-2 mb-2">
            <Button type="button" variant="outline" onClick={() => setShowScanner(true)}>
              Scan with Camera
            </Button>
            <span className="text-xs text-muted-foreground">Or use a hardware scanner in the SKU/Model field below</span>
          </div>
          {showScanner && (
            <div className="mb-4">
              <BarcodeScannerComponent
                width={300}
                height={200}
                onUpdate={handleScan}
              />
              <Button type="button" variant="outline" onClick={() => setShowScanner(false)}>
                Close Scanner
              </Button>
              {scanError && <div className="text-red-500 text-xs mt-1">{scanError}</div>}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="e.g., MacBook Pro 14 M2"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="brand">Brand *</Label>
              <Input
                id="brand"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                required
                placeholder="e.g., Apple"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="model">Model / SKU</Label>
              <Input
                id="model"
                name="model"
                value={formData.model}
                onChange={handleChange}
                placeholder="e.g., A2442 or scan barcode"
                ref={skuInputRef}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    // Optionally handle auto-submit or move to next field
                  }
                }}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="price">Selling Price *</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={handleChange}
                required
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cost">Cost Price *</Label>
              <Input
                id="cost"
                name="cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.cost}
                onChange={handleChange}
                required
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="stock_quantity">Initial Stock</Label>
              <Input
                id="stock_quantity"
                name="stock_quantity"
                type="number"
                min="0"
                value={formData.stock_quantity}
                onChange={handleChange}
                placeholder="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="min_stock_level">Minimum Stock Level</Label>
              <Input
                id="min_stock_level"
                name="min_stock_level"
                type="number"
                min="0"
                value={formData.min_stock_level}
                onChange={handleChange}
                placeholder="5"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="warranty_period">Warranty (months)</Label>
              <Input
                id="warranty_period"
                name="warranty_period"
                type="number"
                min="0"
                value={formData.warranty_period}
                onChange={handleChange}
                placeholder="12"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Product description..."
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="specifications">Specifications (JSON)</Label>
            <Textarea
              id="specifications"
              name="specifications"
              value={formData.specifications}
              onChange={handleChange}
              placeholder='{"color": "Space Gray", "storage": "512GB"}'
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Enter specifications as a JSON object (e.g., {"color": "Red", "size": "15.6\""})
            </p>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Product'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
