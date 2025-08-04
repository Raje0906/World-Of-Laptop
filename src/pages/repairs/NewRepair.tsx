import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Customer } from "@/types";
import { Button } from "@/components/ui/button";
import { User, Laptop, ClipboardList, Clock, AlertTriangle, Calculator, Mail, Phone, MapPin, MessageSquare } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addRepair,
  sendWhatsAppNotification,
} from "@/lib/dataUtils";
import { CustomerSearch } from "@/components/customers/CustomerSearch";
import { StoreSelector } from "@/components/StoreSelector";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/contexts/AuthContext";
import { emailService } from '@/services/emailService';

// Define the Repair interface
export interface Repair {
  id: string;
  _id?: string; // For MongoDB compatibility
  customer: string;
  deviceType: string;
  deviceInfo: {
    brand: string;
    model: string;
    serialNumber: string;
    imei: string;
  };
  issue: string;
  issueDescription: string;
  diagnosis: string;
  estimatedCost: number;
  actualCost?: number;
  repairCost?: number;
  partsCost?: number;
  laborCost?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedCompletion: string;
  storeId: string;
  technicianId: string;
  technician?: string;
  notes?: string;
  contactInfo: {
    whatsappNumber: string;
    notificationEmail: string;
    consentGiven: boolean;
    consentDate: string;
  };
  status: string;
  warrantyPeriod: number;
  estimatedDays: number;
  createdAt?: string;
  updatedAt?: string;
  ticketNumber?: string; // Added for display purposes
}

interface RepairFormData {
  deviceBrand: string;
  deviceModel: string;
  serialNumber: string;
  imei: string;
  issue: string;
  diagnosis: string;
  estimatedCost: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  storeId: string;
  technicianId: string;
  estimatedDays: number;
  whatsappNumber: string;
  notificationEmail: string;
  notificationConsent: boolean;
}

export function NewRepair() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerSearch, setShowCustomerSearch] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentStore } = useStore();
  const [engineers, setEngineers] = useState<any[]>([]);

  const isAdmin = user?.role === 'admin';

  const [formData, setFormData] = useState<RepairFormData>({
    deviceBrand: "",
    deviceModel: "",
    serialNumber: "",
    imei: "",
    issue: "",
    diagnosis: "",
    estimatedCost: 0,
    priority: "medium",
    storeId: "",
    technicianId: "",
    estimatedDays: 3,
    whatsappNumber: "",
    notificationEmail: "",
    notificationConsent: false,
  });

  // Update store when user changes
  useEffect(() => {
    if (user) {
      const storeId = isAdmin ? currentStore?._id : user.store_id;
      setFormData(prev => ({
        ...prev,
        storeId: storeId || ""
      }));
    }
  }, [user, currentStore, isAdmin]);

  useEffect(() => {
    // Fetch engineer users from backend
    fetch('http://localhost:3002/api/users?role=engineer')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setEngineers(data.data);
        }
      })
      .catch(err => {
        console.error('Failed to fetch engineers:', err);
      });
  }, []);

  // Handle form input changes
  const handleInputChange = (field: keyof RepairFormData, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateEstimatedCompletion = () => {
    const today = new Date();
    const completionDate = new Date(today);
    completionDate.setDate(today.getDate() + formData.estimatedDays);
    return completionDate;
  };

  const submitRepair = async () => {
    // Validate customer selection
    if (!selectedCustomer) {
      toast({
        title: "Customer Required",
        description: "Please select a customer for this repair",
        variant: "destructive",
      });
      return;
    }

    // Validate store selection for admin users
    if (isAdmin && !currentStore) {
      toast({
        title: "Store Selection Required",
        description: "Please select a store to create the repair ticket",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    if (!formData.deviceBrand.trim() || !formData.deviceModel.trim()) {
      toast({
        title: "Device Information Required",
        description: "Please provide device brand and model",
        variant: "destructive",
      });
      return;
    }

    if (!formData.issue.trim()) {
      toast({
        title: "Issue Description Required",
        description: "Please describe the issue with the device",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const estimatedCompletion = calculateEstimatedCompletion();
      
      // Determine store ID based on user role
      const storeId = isAdmin ? currentStore?._id : user?.store_id;
      
      const technician = engineers.find((e) => e._id === formData.technicianId)?.name || '';
      
      // Create repair data object with only required properties for backend
      const repairData = {
        customer: selectedCustomer._id || selectedCustomer.id || '',
        deviceType: 'Laptop',
        brand: formData.deviceBrand.trim(),
        model: formData.deviceModel.trim(),
        serialNumber: formData.serialNumber.trim() || 'N/A',
        imei: formData.imei.trim() || 'N/A',
        issueDescription: formData.issue.trim(),
        diagnosis: (formData.diagnosis || 'Pending diagnosis').trim(),
        repairCost: parseFloat(String(formData.estimatedCost)) || 0,
        partsCost: 0,
        laborCost: 0,
        priority: (formData.priority === 'urgent' ? 'high' : formData.priority) || 'medium',
        estimatedCompletion: calculateEstimatedCompletion().toISOString(),
        technician: engineers.find((e) => e._id === formData.technicianId)?.name || '',
        notes: [
          `Issue reported: ${formData.issue}`,
          `Estimated cost: ₹${formData.estimatedCost}`,
          `WhatsApp contact: ${formData.whatsappNumber || 'Not provided'}`,
          `Email contact: ${formData.notificationEmail || 'Not provided'}`,
          `Store: ${currentStore?.name || user?.store?.name || 'Not specified'}`
        ].join('\n'),
        storeId: storeId,
      };
      console.log('[DEBUG] Submitting repairData:', repairData);
      
      // Submit repair to the API
      const newRepair = await addRepair(repairData);
      
      // Reset form after successful submission
      setSelectedCustomer(null);
      setShowCustomerSearch(true);
      setFormData({
        deviceBrand: "",
        deviceModel: "",
        serialNumber: "",
        imei: "",
        issue: "",
        diagnosis: "",
        estimatedCost: 0,
        priority: "medium",
        storeId: "",
        technicianId: "",
        estimatedDays: 3,
        whatsappNumber: "",
        notificationEmail: "",
        notificationConsent: false,
      });
      
      toast({
        title: "✅ Success",
        description: "Repair ticket created successfully!",
      });

      // Send notifications if consent was given
      if (formData.notificationConsent) {
        await sendRepairNotifications({
          repairId: newRepair._id || newRepair.id,
          customerName: selectedCustomer.name,
          deviceInfo: `${formData.deviceBrand} ${formData.deviceModel}`,
          issue: formData.issue,
          estimatedCost: formData.estimatedCost,
          estimatedDays: formData.estimatedDays,
          whatsappNumber: formData.whatsappNumber,
          notificationEmail: formData.notificationEmail,
        });
      }

    } catch (error) {
      console.error("Error creating repair:", error);
      toast({
        title: "❌ Error",
        description: "Failed to create repair request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendRepairNotifications = async (
    newRepair: RepairNotificationData
  ) => {
    try {
      // Send WhatsApp notification
      if (newRepair.whatsappNumber) {
            await sendWhatsAppNotification(
          newRepair.whatsappNumber,
          `🔧 Repair Ticket Created\n\nCustomer: ${newRepair.customerName}\nDevice: ${newRepair.deviceInfo}\nIssue: ${newRepair.issue}\nEstimated Cost: ₹${newRepair.estimatedCost}\nEstimated Days: ${newRepair.estimatedDays}\n\nWe'll keep you updated on the repair progress.`
        );
      }

      // Send email notification
      if (newRepair.notificationEmail) {
        await emailService.sendRepairNotification({
          to: newRepair.notificationEmail,
          customerName: newRepair.customerName,
          deviceInfo: newRepair.deviceInfo,
          issue: newRepair.issue,
          estimatedCost: newRepair.estimatedCost,
          estimatedDays: newRepair.estimatedDays,
        });
      }
    } catch (error) {
      console.error("Error sending notifications:", error);
      // Don't show error to user as the repair was created successfully
    }
  };

  if (showCustomerSearch) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Repair</h1>
          <p className="text-gray-600 mt-2">
            Select customer to begin repair process
          </p>
        </div>

        <CustomerSearch
          onCustomerSelect={(customer) => {
            setSelectedCustomer(customer);
            // Auto-fill contact information from customer data
            setFormData((prev) => ({
              ...prev,
              whatsappNumber: customer.phone,
              notificationEmail: customer.email,
            }));
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Repair</h1>
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
        required={isAdmin} 
        label="Repair Store"
        className="max-w-md"
      />

      {/* Repair Form */}
      <div className="grid gap-6 lg:grid-cols-2">
          {/* Device Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
              <Laptop className="h-5 w-5" />
                Device Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                <Label htmlFor="deviceBrand">Brand *</Label>
                  <Input
                    id="deviceBrand"
                    value={formData.deviceBrand}
                  onChange={(e) => handleInputChange("deviceBrand", e.target.value)}
                  placeholder="e.g., Dell, HP, Lenovo"
                  />
                </div>
                <div>
                <Label htmlFor="deviceModel">Model *</Label>
                  <Input
                    id="deviceModel"
                    value={formData.deviceModel}
                  onChange={(e) => handleInputChange("deviceModel", e.target.value)}
                  placeholder="e.g., Inspiron 15, ThinkPad X1"
                  />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input
                    id="serialNumber"
                    value={formData.serialNumber}
                  onChange={(e) => handleInputChange("serialNumber", e.target.value)}
                  placeholder="Optional"
                  />
                </div>
                <div>
                <Label htmlFor="imei">IMEI</Label>
                  <Input
                    id="imei"
                    value={formData.imei}
                    onChange={(e) => handleInputChange("imei", e.target.value)}
                  placeholder="Optional"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

        {/* Issue Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Issue Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
              <Label htmlFor="issue">Issue Description *</Label>
                <Textarea
                  id="issue"
                  value={formData.issue}
                  onChange={(e) => handleInputChange("issue", e.target.value)}
                placeholder="Describe the problem with the device..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="diagnosis">Initial Diagnosis</Label>
                <Textarea
                  id="diagnosis"
                  value={formData.diagnosis}
                onChange={(e) => handleInputChange("diagnosis", e.target.value)}
                placeholder="Initial assessment of the issue..."
                rows={2}
                />
              </div>
            </CardContent>
          </Card>

        {/* Repair Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Repair Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                <Label htmlFor="estimatedCost">Estimated Cost (₹)</Label>
                <Input
                  id="estimatedCost"
                  type="number"
                  value={formData.estimatedCost}
                  onChange={(e) => handleInputChange("estimatedCost", parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
                </div>
                <div>
                <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                  onValueChange={(value: any) => handleInputChange("priority", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estimatedDays">Estimated Days</Label>
                <Input
                  id="estimatedDays"
                  type="number"
                  min="1"
                  value={formData.estimatedDays}
                  onChange={(e) => handleInputChange("estimatedDays", parseInt(e.target.value) || 1)}
                />
              </div>
              <div>
                <Label htmlFor="technicianId">Assign Technician</Label>
                <Select
                  value={formData.technicianId}
                  onValueChange={(value) => handleInputChange("technicianId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select technician" />
                  </SelectTrigger>
                  <SelectContent>
                    {engineers.map((engineer) => (
                      <SelectItem key={engineer._id} value={engineer._id}>
                        {engineer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              </div>
            </CardContent>
          </Card>

        {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
              <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
                <Input
                id="whatsappNumber"
                value={formData.whatsappNumber}
                onChange={(e) => handleInputChange("whatsappNumber", e.target.value)}
                placeholder="+91 98765 43210"
                />
              </div>
            <div>
              <Label htmlFor="notificationEmail">Notification Email</Label>
              <Input
                id="notificationEmail"
                type="email"
                value={formData.notificationEmail}
                onChange={(e) => handleInputChange("notificationEmail", e.target.value)}
                placeholder="customer@example.com"
              />
                </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="notificationConsent"
                checked={formData.notificationConsent}
                onChange={(e) => handleInputChange("notificationConsent", e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="notificationConsent">
                Send notifications about repair progress
              </Label>
              </div>
            </CardContent>
          </Card>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
              <Button
                onClick={submitRepair}
                disabled={isSubmitting}
          className="px-8"
        >
          {isSubmitting ? (
            <>
              <Clock className="mr-2 h-4 w-4 animate-spin" />
              Creating Repair...
            </>
          ) : (
            <>
              <ClipboardList className="mr-2 h-4 w-4" />
              Create Repair Ticket
            </>
          )}
              </Button>
      </div>
    </div>
  );
}

interface RepairNotificationData {
  repairId: string;
  customerName: string;
  deviceInfo: string;
  issue: string;
  estimatedCost: number;
  estimatedDays: number;
  whatsappNumber: string;
  notificationEmail: string;
}
