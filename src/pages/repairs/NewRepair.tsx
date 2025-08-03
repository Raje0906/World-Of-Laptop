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
import { stores } from "@/lib/mockData";
import { CustomerSearch } from "@/components/customers/CustomerSearch";
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
  priority: "low" | "medium" | "high" | "urgent";
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
  const [engineers, setEngineers] = useState<any[]>([]);

  // Get user's store information
  const getUserStore = () => {
    if (!user) return null;
    
    // If user has a populated store object
    if (user.store && user.store._id) {
      return {
        id: user.store._id,
        name: user.store.name,
        address: user.store.address
      };
    }
    
    // If user has a store_id string, find the store
    if (user.store_id) {
      return stores.find(store => store.id === user.store_id) || null;
    }
    
    return null;
  };

  const userStore = getUserStore();
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
    storeId: isAdmin ? (stores[0]?.id || "") : (userStore?.id || ""),
    technicianId: "",
    estimatedDays: 3,
    whatsappNumber: "",
    notificationEmail: "",
    notificationConsent: false,
  });

  // Update store when user changes
  useEffect(() => {
    if (user && userStore) {
      setFormData(prev => ({
        ...prev,
        storeId: isAdmin ? prev.storeId : (userStore.id || "")
      }));
    }
  }, [user, userStore, isAdmin]);

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
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Calculate estimated completion date based on estimated days
  const calculateEstimatedCompletion = (): Date => {
    const today = new Date();
    const completionDate = new Date(today);
    completionDate.setDate(today.getDate() + (formData.estimatedDays || 0));
    return completionDate;
  };

  // Strict validation: check if all required fields are filled
  const isFormValid = useMemo(() => {
    return (
      !!selectedCustomer &&
      !!formData.deviceBrand.trim() &&
      !!formData.deviceModel.trim() &&
      !!formData.issue.trim() &&
      !!formData.technicianId
    );
  }, [selectedCustomer, formData.deviceBrand, formData.deviceModel, formData.issue, formData.technicianId]);

  const submitRepair = async () => {
    // Validate customer selection
    if (!selectedCustomer || !(selectedCustomer._id || selectedCustomer.id)) {
      toast({
        title: "Customer Required",
        description: "Please select a valid customer from the database.",
        variant: "destructive",
      });
      return;
    }

    // Validate required form fields (must not be empty or whitespace)
    const requiredFields = [
      { field: formData.deviceBrand, label: "Device Brand" },
      { field: formData.deviceModel, label: "Device Model" },
      { field: formData.issue, label: "Issue Description" },
      { field: formData.technicianId, label: "Assigned Technician" },
    ];
    const missingFields = requiredFields
      .filter(({ field }) => !field || !field.toString().trim())
      .map(({ label }) => label);
    if (missingFields.length > 0) {
      toast({
        title: "Required Fields Missing",
        description: `Please fill in: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const estimatedCompletion = calculateEstimatedCompletion();
      
      // Get the correct store based on form data
      const selectedStore = stores.find(store => store.id === formData.storeId) || userStore;
      const store = selectedStore || stores[0]; // Fallback to first store if needed
      
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
          `Store: ${store?.name || 'Not specified'}`
        ].join('\n'),
      };
      console.log('[DEBUG] Submitting repairData:', repairData);
      
      // Submit repair to the API
      const newRepair = await addRepair(repairData);
      
      // Reset form after successful submission
      setFormData({
        deviceBrand: "",
        deviceModel: "",
        serialNumber: "",
        imei: "",
        issue: "",
        diagnosis: "",
        estimatedCost: 0,
        priority: "medium",
        storeId: isAdmin ? (stores[0]?.id || "") : (userStore?.id || ""),
        technicianId: "",
        estimatedDays: 3,
        whatsappNumber: "",
        notificationEmail: "",
        notificationConsent: false,
      });
      
      setSelectedCustomer(null);
      setShowCustomerSearch(true);
      
      // Create and send notifications
      try {
        await sendRepairNotifications(newRepair, formData, selectedCustomer, store);
      } catch (notificationError) {
        console.error('Error sending notifications:', notificationError);
        // Don't fail the whole operation if notifications fail
      }
      
      toast({
        title: "✅ Repair Created Successfully!",
        description: `Repair Ticket #${newRepair.ticketNumber || 'N/A'} has been created.`,
        duration: 5000,
      });
      
    } catch (error) {
      console.error("Error creating repair:", error);
      toast({
        title: "❌ Error",
        description: "Failed to create repair. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Helper function to send repair notifications
  interface RepairNotificationData {
    _id?: string;
    id?: string;
    [key: string]: any;
  }

  const sendRepairNotifications = async (
    newRepair: RepairNotificationData, 
    formData: RepairFormData, 
    customer: Customer | null, 
    store: any
  ) => {
    try {
      // If we don't have a valid repair ID, we can't send notifications
      const repairId = newRepair?.ticketNumber || 'N/A';
      if (!repairId) {
        console.warn('Cannot send notifications: Missing repair ID');
        return;
      }
      
      if (!formData?.notificationConsent || !customer) return;
      
      const completionDate = new Date();
      completionDate.setDate(completionDate.getDate() + (formData.estimatedDays || 3));
      
      const formattedCost = formData.estimatedCost?.toLocaleString('en-IN') || '0';
      const completionDateStr = completionDate.toLocaleDateString();
      
      const message = `📱 Your ${formData.deviceBrand || ''} ${formData.deviceModel || ''} repair is confirmed!

🆔 Repair Ticket: ${repairId}
🔧 Issue: ${formData.issue || 'Not specified'}
💰 Estimated Cost: ₹${formattedCost}
📅 Expected Completion: ${completionDateStr}

We'll keep you updated on the progress.

📞 Questions? Call ${store?.phone || 'us'}
📍 ${store?.name || 'Our Store'}`;
      
      // Send WhatsApp notification if number is provided
      try {
        if (formData.whatsappNumber) {
          await sendWhatsAppNotification(formData.whatsappNumber, message);
        }
      } catch (whatsappError) {
        console.error('Failed to send WhatsApp notification:', whatsappError);
        // Continue with email even if WhatsApp fails
      }
      
      // Send email notification if email is provided
      try {
        if (formData.notificationEmail) {
          const emailSubject = `Repair Confirmation - ${formData.deviceBrand || 'Device'} ${formData.deviceModel || ''}`.trim();
          const emailBody = `
Dear ${customer?.name || 'Valued Customer'},

Thank you for choosing our repair service. Here are your repair details:

` +
            `- Device: ${formData.deviceBrand || 'N/A'} ${formData.deviceModel || ''}\n` +
            `- Issue: ${formData.issue || 'Not specified'}\n` +
            `- Repair ID: ${repairId}\n` +
            `- Estimated Completion: ${completionDate.toLocaleDateString()}\n\n` +
            `We'll notify you once your repair is complete.\n\nBest regards,\n${store?.name || 'Repair Team'}`;

          const templateParams = {
            user_name: customer.name,
            device_name: formData.deviceBrand + ' ' + formData.deviceModel,
            issue_description: formData.issue,
            repair_id: repairId,
            estimated_date: completionDate.toLocaleDateString(),
            to_email: customer.email,
          };

          await emailService.sendEmail(templateParams);
        }
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the whole operation if email fails
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
      // Don't fail the whole operation if notifications fail
    }

    if (!formData.whatsappNumber || !formData.notificationEmail) {
      toast({
        title: "Contact Information Required",
        description: "Please provide WhatsApp number and email for notifications",
        variant: "destructive",
      });
      return;
    }

    if (!formData.notificationConsent) {
      toast({
        title: "Customer Consent Required",
        description: "Customer must consent to receive repair notifications",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const estimatedCompletion = calculateEstimatedCompletion();
      const technician = engineers.find(e => e._id === formData.technicianId)?.name || '';
      const estimatedCost = formData.estimatedCost || 0;

      // Format data for the API
      const repairData: Omit<Repair, '_id' | 'createdAt' | 'updatedAt'> = {
        id: '', // Will be set by the server
        customer: selectedCustomer.id || '',
        customerId: selectedCustomer.id || '',
        deviceType: 'Laptop',
        deviceInfo: {
          brand: formData.deviceBrand,
          model: formData.deviceModel,
          serialNumber: formData.serialNumber || '',
          imei: formData.imei || ''
        },
        issue: formData.issue,
        issueDescription: formData.issue,
        diagnosis: formData.diagnosis || "Initial assessment pending",
        estimatedCost,
        actualCost: estimatedCost, // Initially same as estimated
        repairCost: estimatedCost,
        partsCost: 0,
        laborCost: 0,
        priority: (formData.priority === 'urgent' ? 'high' : formData.priority) || 'medium',
        estimatedCompletion: calculateEstimatedCompletion().toISOString(),
        storeId: formData.storeId,
        technicianId: formData.technicianId,
        technician,
        notes: JSON.stringify({
          customerNotes: [
            `Issue reported: ${formData.issue}`,
            `Estimated cost: ₹${estimatedCost}`,
            `WhatsApp contact: ${formData.whatsappNumber}`,
            `Email contact: ${formData.notificationEmail}`,
            "Customer consented to notifications",
          ],
          internalNotes: []
        }),
        contactInfo: {
          whatsappNumber: formData.whatsappNumber,
          notificationEmail: formData.notificationEmail,
          consentGiven: formData.notificationConsent,
          consentDate: new Date().toISOString()
        },
        status: 'received',
        warrantyPeriod: 30,
        estimatedDays: formData.estimatedDays
      };

      const newRepair = await addRepair(repairData);

      // Calculate completion date
      const estimatedCompletionDate = new Date();
      estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + formData.estimatedDays);
      const completionDate = estimatedCompletionDate.toLocaleDateString();
      const formattedCost = formData.estimatedCost.toLocaleString('en-IN');
      
      // Get store info for notifications
      const store = stores.find(s => s.id === formData.storeId);
      
      // Create confirmation message
      const confirmationMessage = `Hi ${selectedCustomer?.name || 'Customer'},

📱 Your ${formData.deviceBrand} ${formData.deviceModel} has been received for repair!

🆔 Repair Ticket: ${newRepair.ticketNumber || newRepair._id || 'N/A'}
🔧 Issue: ${formData.issue}
💰 Estimated Cost: ₹${formattedCost}
📅 Expected Completion: ${completionDate}

We'll keep you updated on the progress.

📞 Questions? Call ${store?.phone || 'us'}
📍 ${store?.name || 'Laptop Store'}`;

      // Reset form after successful submission
      setFormData({
        deviceBrand: "",
        deviceModel: "",
        serialNumber: "",
        imei: "",
        issue: "",
        diagnosis: "",
        estimatedCost: 0,
        priority: "medium",
        storeId: isAdmin ? (stores[0]?.id || "") : (userStore?.id || ""),
        technicianId: "",
        estimatedDays: 3,
        whatsappNumber: "",
        notificationEmail: "",
        notificationConsent: false,
      });
      setSelectedCustomer(null);
      setShowCustomerSearch(true);

      // Send notifications if consent was given
      if (formData.notificationConsent) {
        try {
          if (formData.whatsappNumber) {
            await sendWhatsAppNotification(
              formData.whatsappNumber,
              confirmationMessage
            );
          }
          
          if (formData.notificationEmail) {
            await emailService.sendEmail(
              formData.notificationEmail,
              `Repair Confirmation - ${formData.deviceBrand} ${formData.deviceModel}`,
              `Dear ${selectedCustomer?.name || 'Valued Customer'}, we've received your device for repair. Repair ID: ${newRepair.ticketNumber || newRepair._id || 'N/A'}. We'll keep you updated!`
            );
          }
          
          toast({
            title: '✅ Repair Created & Customer Notified!',
            description: `Repair Ticket: ${newRepair.ticketNumber || 'N/A'} | Customer notified via ${formData.whatsappNumber ? 'WhatsApp' : ''}${formData.whatsappNumber && formData.notificationEmail ? ' & ' : ''}${formData.notificationEmail ? 'Email' : ''}`,
            duration: 5000,
          });
        } catch (error) {
          console.error('Error sending notifications:', error);
          // Still show success even if notifications fail
          toast({
            title: '✅ Repair Created!',
            description: `Repair Ticket: ${newRepair.ticketNumber || 'N/A'} created successfully, but there was an issue sending notifications.`,
            duration: 5000,
          });
        }
      } else {
        toast({
          title: '✅ Repair Created!',
          description: `Repair Ticket: ${newRepair.ticketNumber || 'N/A'} has been created successfully!`,
          duration: 5000,
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
      
      // Reset form
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
        storeId: isAdmin ? (stores[0]?.id || "") : (userStore?.id || ""),
        technicianId: "",
        estimatedDays: 3,
        whatsappNumber: "",
        notificationEmail: "",
        notificationConsent: false,
      });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Repair</h1>
          <p className="text-gray-600 mt-2">Create a new repair ticket</p>
        </div>
        <Button variant="outline" onClick={() => setShowCustomerSearch(true)}>
          <User className="w-4 h-4 mr-2" />
          Change Customer
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Customer Information & Contact Details
              </CardTitle>
              <CardDescription>
                Verify customer contact information for repair notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedCustomer && (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-lg mb-3">
                      {selectedCustomer.name}
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">Email:</span>{" "}
                        {selectedCustomer.email}
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-green-600" />
                        <span className="font-medium">Phone:</span>{" "}
                        {selectedCustomer.phone}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-600" />
                        <span className="font-medium">Address:</span>{" "}
                        {selectedCustomer.address ? (
                          typeof selectedCustomer.address === 'string' ? (
                            selectedCustomer.address
                          ) : (
                            `${selectedCustomer.address.line1 || ''}${selectedCustomer.address.line2 ? `, ${selectedCustomer.address.line2}` : ''}${selectedCustomer.address.city ? `, ${selectedCustomer.address.city}` : ''}${selectedCustomer.address.state ? `, ${selectedCustomer.address.state}` : ''}${selectedCustomer.address.pincode ? ` - ${selectedCustomer.address.pincode}` : ''}`
                          )
                        ) : selectedCustomer.city ? (
                          selectedCustomer.city
                        ) : (
                          'N/A'
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact Verification Section */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Notification Contacts
                    </h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="whatsapp-number">
                          WhatsApp Number *
                        </Label>
                        <Input
                          id="whatsapp-number"
                          value={
                            formData.whatsappNumber || selectedCustomer.phone
                          }
                          onChange={(e) =>
                            handleInputChange("whatsappNumber", e.target.value)
                          }
                          placeholder="+91 XXXXX XXXXX"
                          className="mt-1"
                        />
                        <p className="text-xs text-blue-700 mt-1">
                          📱 We'll send repair updates via WhatsApp
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="notification-email">
                          Email for Updates *
                        </Label>
                        <Input
                          id="notification-email"
                          type="email"
                          value={
                            formData.notificationEmail || selectedCustomer.email
                          }
                          onChange={(e) =>
                            handleInputChange(
                              "notificationEmail",
                              e.target.value,
                            )
                          }
                          placeholder="customer@email.com"
                          className="mt-1"
                        />
                        <p className="text-xs text-blue-700 mt-1">
                          📧 Detailed repair updates and completion notices
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 p-3 bg-white rounded border">
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          id="consent-notifications"
                          checked={formData.notificationConsent || false}
                          onChange={(e) =>
                            handleInputChange(
                              "notificationConsent",
                              e.target.checked,
                            )
                          }
                          className="mt-1"
                        />
                        <label
                          htmlFor="consent-notifications"
                          className="text-sm text-gray-700"
                        >
                          <strong>
                            Customer consents to receive repair updates via
                            WhatsApp and Email
                          </strong>
                          <br />
                          <span className="text-xs text-gray-500">
                            ✅ Status updates • 🔧 Repair progress • 📱
                            Completion alerts • 📍 Pickup notifications
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Device Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Laptop className="w-5 h-5" />
                Device Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="deviceBrand">Device Brand *</Label>
                  <Input
                    id="deviceBrand"
                    value={formData.deviceBrand}
                    onChange={(e) =>
                      handleInputChange("deviceBrand", e.target.value)
                    }
                    placeholder="e.g. Dell, HP, Apple"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="deviceModel">Device Model *</Label>
                  <Input
                    id="deviceModel"
                    value={formData.deviceModel}
                    onChange={(e) =>
                      handleInputChange("deviceModel", e.target.value)
                    }
                    placeholder="e.g. XPS 13, MacBook Pro"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input
                    id="serialNumber"
                    value={formData.serialNumber}
                    onChange={(e) =>
                      handleInputChange("serialNumber", e.target.value)
                    }
                    placeholder="Device serial number"
                  />
                </div>

                <div>
                  <Label htmlFor="imei">IMEI (for mobile devices)</Label>
                  <Input
                    id="imei"
                    value={formData.imei}
                    onChange={(e) => handleInputChange("imei", e.target.value)}
                    placeholder="IMEI number"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Issue Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                Issue Description
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="issue">Issue Reported by Customer *</Label>
                <Textarea
                  id="issue"
                  value={formData.issue}
                  onChange={(e) => handleInputChange("issue", e.target.value)}
                  placeholder="Describe the issue..."
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label htmlFor="diagnosis">Initial Diagnosis</Label>
                <Textarea
                  id="diagnosis"
                  value={formData.diagnosis}
                  onChange={(e) =>
                    handleInputChange("diagnosis", e.target.value)
                  }
                  placeholder="Initial assessment of the issue (can be updated later)..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Assignment & Priority */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Assignment & Priority
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label>Store Location</Label>
                  {isAdmin ? (
                    <Select
                      value={formData.storeId}
                      onValueChange={(value) => handleInputChange("storeId", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stores.map((store) => (
                          <SelectItem key={store.id} value={store.id}>
                            {store.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center h-10 px-3 py-2 text-sm border rounded-md bg-gray-50">
                      {userStore?.name || "Store not assigned"}
                    </div>
                  )}
                  {!isAdmin && userStore && (
                    <p className="text-xs text-gray-500 mt-1">
                      Your assigned store: {userStore.name}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="technician">Assigned Technician</Label>
                  <Select
                    id="technician"
                    value={formData.technicianId}
                    onValueChange={(value) => handleInputChange("technicianId", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select technician" />
                    </SelectTrigger>
                    <SelectContent>
                      {engineers.map((eng) => (
                        <SelectItem key={eng._id || eng.id} value={eng._id || eng.id}>
                          {eng.name} ({eng.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Priority Level</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: any) =>
                      handleInputChange("priority", value)
                    }
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
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Cost & Timeline */}
        <div className="space-y-6">
          {/* Cost Estimation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Cost Estimation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="estimatedCost">Estimated Cost (₹)</Label>
                <Input
                  id="estimatedCost"
                  type="number"
                  value={formData.estimatedCost}
                  onChange={(e) =>
                    handleInputChange(
                      "estimatedCost",
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Initial estimate - can be updated during diagnosis
                </p>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">
                  Common Repair Costs
                </h4>
                <div className="text-xs text-blue-700 space-y-1">
                  <div>Screen replacement: ₹3,000 - ₹15,000</div>
                  <div>Battery replacement: ₹2,000 - ₹8,000</div>
                  <div>Keyboard repair: ₹1,500 - ₹5,000</div>
                  <div>Motherboard repair: ₹5,000 - ₹25,000</div>
                  <div>Data recovery: ₹2,000 - ₹10,000</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="estimatedDays">
                  Estimated Completion (Days)
                </Label>
                <Input
                  id="estimatedDays"
                  type="number"
                  min="1"
                  max="30"
                  value={formData.estimatedDays}
                  onChange={(e) =>
                    handleInputChange(
                      "estimatedDays",
                      parseInt(e.target.value) || 3,
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm">
                  <strong>Estimated Completion:</strong>
                  <br />
                  {new Date(calculateEstimatedCompletion()).toLocaleDateString(
                    "en-IN",
                    {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    },
                  )}
                </div>
              </div>

              <div className="p-3 bg-yellow-50 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">
                  Typical Repair Times
                </h4>
                <div className="text-xs text-yellow-700 space-y-1">
                  <div>Software issues: 1-2 days</div>
                  <div>Hardware replacement: 2-5 days</div>
                  <div>Complex repairs: 5-10 days</div>
                  <div>Part ordering required: 7-14 days</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={submitRepair}
                disabled={isSubmitting}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? "Creating Repair..." : "Create Repair Ticket"}
              </Button>

              <p className="text-xs text-gray-500 text-center mt-2">
                Customer will be notified once repair is accepted
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
