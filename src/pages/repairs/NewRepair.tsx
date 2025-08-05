import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Customer } from "@/types";
import { Button } from "@/components/ui/button";
import { User, Laptop, ClipboardList, Clock, AlertTriangle, Calculator, Mail, Phone, MapPin, MessageSquare, Loader2, AlertCircle, CheckCircle, Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

// Test function for email notifications
const testEmailNotification = async () => {
  const testEmail = prompt('Enter test email address:');
  if (!testEmail) return;
  
  try {
    const result = await emailService.testRepairNotification(testEmail);
    if (result.success) {
      alert('Test email sent successfully!');
    } else {
      alert(`Test failed: ${result.message || result.error}`);
    }
  } catch (error) {
    alert(`Test error: ${error.message}`);
  }
};

// Production Configuration
const REPAIR_CONFIG = {
  MAX_DEVICE_BRAND_LENGTH: 50,
  MAX_DEVICE_MODEL_LENGTH: 100,
  MAX_SERIAL_NUMBER_LENGTH: 50,
  MAX_IMEI_LENGTH: 20,
  MAX_ISSUE_LENGTH: 1000,
  MAX_DIAGNOSIS_LENGTH: 500,
  MAX_EMAIL_LENGTH: 254,
  MIN_ESTIMATED_COST: 1,
  MAX_ESTIMATED_COST: 100000,
  MIN_ESTIMATED_DAYS: 1,
  MAX_ESTIMATED_DAYS: 365,
  PHONE_NUMBER_LENGTH: 10,
  REQUEST_TIMEOUT_MS: 30000,
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 2000,
  VALIDATION_MESSAGES: {
    CUSTOMER_REQUIRED: "Please select a customer for this repair",
    STORE_REQUIRED: "Please select a store to create the repair ticket",
    DEVICE_INFO_REQUIRED: "Please provide device brand and model",
    ISSUE_REQUIRED: "Please describe the issue with the device",
    ESTIMATED_COST_REQUIRED: "Please provide a valid estimated cost between ₹1 and ₹100,000",
    TECHNICIAN_REQUIRED: "Please assign a technician to this repair",
    NOTIFICATION_CONSENT_REQUIRED: "Please check the box to send notifications about repair progress",
    INVALID_PHONE: "WhatsApp number must be exactly 10 digits",
    INVALID_EMAIL: "Please enter a valid email address",
    DEVICE_BRAND_TOO_LONG: `Device brand must be ${50} characters or less`,
    DEVICE_MODEL_TOO_LONG: `Device model must be ${100} characters or less`,
    SERIAL_NUMBER_TOO_LONG: `Serial number must be ${50} characters or less`,
    IMEI_TOO_LONG: `IMEI must be ${20} characters or less`,
    ISSUE_TOO_LONG: `Issue description must be ${1000} characters or less`,
    DIAGNOSIS_TOO_LONG: `Diagnosis must be ${500} characters or less`,
    EMAIL_TOO_LONG: `Email must be ${254} characters or less`,
    SUBMISSION_FAILED: "Failed to create repair ticket. Please try again.",
    NETWORK_ERROR: "Network error. Please check your connection and try again.",
    SERVER_ERROR: "Server error. Please try again later.",
    TIMEOUT_ERROR: "Request timed out. Please try again.",
  },
  ERROR_CODES: {
    NETWORK_ERROR: "NETWORK_ERROR",
    TIMEOUT_ERROR: "TIMEOUT_ERROR",
    VALIDATION_ERROR: "VALIDATION_ERROR",
    SERVER_ERROR: "SERVER_ERROR",
    UNKNOWN_ERROR: "UNKNOWN_ERROR",
  }
};

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

interface ValidationErrors {
  [key: string]: string;
}

interface ErrorState {
  type: string;
  message: string;
  code?: string;
}

export function NewRepair() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerSearch, setShowCustomerSearch] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [error, setError] = useState<ErrorState | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastSubmissionTime, setLastSubmissionTime] = useState<Date | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentStore } = useStore();
  const [engineers, setEngineers] = useState<any[]>([]);
  const [isLoadingEngineers, setIsLoadingEngineers] = useState(true);
  const [engineersError, setEngineersError] = useState<string | null>(null);
  
  // Refs for cleanup and timeouts
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Memoized validation functions
  const validateEmail = useCallback((email: string): boolean => {
    if (!email.trim()) return true; // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  const validatePhoneNumber = useCallback((phone: string): boolean => {
    if (!phone.trim()) return true; // Optional field
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length === REPAIR_CONFIG.PHONE_NUMBER_LENGTH;
  }, []);

  const validateFormData = useCallback((data: RepairFormData): ValidationErrors => {
    const errors: ValidationErrors = {};

    // Required field validations
    if (!selectedCustomer) {
      errors.customer = REPAIR_CONFIG.VALIDATION_MESSAGES.CUSTOMER_REQUIRED;
    }

    if (isAdmin && !currentStore) {
      errors.store = REPAIR_CONFIG.VALIDATION_MESSAGES.STORE_REQUIRED;
    }

    if (!data.deviceBrand.trim()) {
      errors.deviceBrand = "Device brand is required";
    } else if (data.deviceBrand.length > REPAIR_CONFIG.MAX_DEVICE_BRAND_LENGTH) {
      errors.deviceBrand = REPAIR_CONFIG.VALIDATION_MESSAGES.DEVICE_BRAND_TOO_LONG;
    }

    if (!data.deviceModel.trim()) {
      errors.deviceModel = "Device model is required";
    } else if (data.deviceModel.length > REPAIR_CONFIG.MAX_DEVICE_MODEL_LENGTH) {
      errors.deviceModel = REPAIR_CONFIG.VALIDATION_MESSAGES.DEVICE_MODEL_TOO_LONG;
    }

    if (!data.issue.trim()) {
      errors.issue = REPAIR_CONFIG.VALIDATION_MESSAGES.ISSUE_REQUIRED;
    } else if (data.issue.length > REPAIR_CONFIG.MAX_ISSUE_LENGTH) {
      errors.issue = REPAIR_CONFIG.VALIDATION_MESSAGES.ISSUE_TOO_LONG;
    }

    if (!data.estimatedCost || data.estimatedCost < REPAIR_CONFIG.MIN_ESTIMATED_COST || data.estimatedCost > REPAIR_CONFIG.MAX_ESTIMATED_COST) {
      errors.estimatedCost = REPAIR_CONFIG.VALIDATION_MESSAGES.ESTIMATED_COST_REQUIRED;
    }

    if (!data.technicianId.trim()) {
      errors.technicianId = REPAIR_CONFIG.VALIDATION_MESSAGES.TECHNICIAN_REQUIRED;
    }

    if (!data.notificationConsent) {
      errors.notificationConsent = REPAIR_CONFIG.VALIDATION_MESSAGES.NOTIFICATION_CONSENT_REQUIRED;
    }

    // Optional field validations
    if (data.serialNumber && data.serialNumber.length > REPAIR_CONFIG.MAX_SERIAL_NUMBER_LENGTH) {
      errors.serialNumber = REPAIR_CONFIG.VALIDATION_MESSAGES.SERIAL_NUMBER_TOO_LONG;
    }

    if (data.imei && data.imei.length > REPAIR_CONFIG.MAX_IMEI_LENGTH) {
      errors.imei = REPAIR_CONFIG.VALIDATION_MESSAGES.IMEI_TOO_LONG;
    }

    if (data.diagnosis && data.diagnosis.length > REPAIR_CONFIG.MAX_DIAGNOSIS_LENGTH) {
      errors.diagnosis = REPAIR_CONFIG.VALIDATION_MESSAGES.DIAGNOSIS_TOO_LONG;
    }

    if (data.whatsappNumber && !validatePhoneNumber(data.whatsappNumber)) {
      errors.whatsappNumber = REPAIR_CONFIG.VALIDATION_MESSAGES.INVALID_PHONE;
    }

    if (data.notificationEmail && !validateEmail(data.notificationEmail)) {
      errors.notificationEmail = REPAIR_CONFIG.VALIDATION_MESSAGES.INVALID_EMAIL;
    }

    if (data.notificationEmail && data.notificationEmail.length > REPAIR_CONFIG.MAX_EMAIL_LENGTH) {
      errors.notificationEmail = REPAIR_CONFIG.VALIDATION_MESSAGES.EMAIL_TOO_LONG;
    }

    if (data.estimatedDays < REPAIR_CONFIG.MIN_ESTIMATED_DAYS || data.estimatedDays > REPAIR_CONFIG.MAX_ESTIMATED_DAYS) {
      errors.estimatedDays = `Estimated days must be between ${REPAIR_CONFIG.MIN_ESTIMATED_DAYS} and ${REPAIR_CONFIG.MAX_ESTIMATED_DAYS}`;
    }

    return errors;
  }, [selectedCustomer, currentStore, isAdmin, validateEmail, validatePhoneNumber]);

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

  // Fetch engineers with error handling and retry logic
  const fetchEngineers = useCallback(async (isRetry = false) => {
    if (isRetry) {
      setRetryCount(prev => prev + 1);
    }

    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setIsLoadingEngineers(true);
      setEngineersError(null);

      // Check if VITE_API_URL is explicitly set (production environment)
      const hasExplicitApiUrl = import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim() !== '';
      
      let apiUrl: string;
      
      if (hasExplicitApiUrl) {
        // Use the explicitly set API URL (production)
        apiUrl = import.meta.env.VITE_API_URL + '/api';
      } else {
        // Check if we're running on localhost (development or preview)
        const isLocalhost = typeof window !== 'undefined' && (
          window.location.hostname === 'localhost' || 
          window.location.hostname === '127.0.0.1'
        );
        
        apiUrl = isLocalhost ? '/api' : 'https://world-of-laptop.onrender.com/api';
      }

      // Set timeout for the request
      const timeoutId = setTimeout(() => {
        abortControllerRef.current?.abort();
      }, REPAIR_CONFIG.REQUEST_TIMEOUT_MS);

      const response = await fetch(`${apiUrl}/users?role=engineer`, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        setEngineers(data.data);
        setRetryCount(0); // Reset retry count on success
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error: any) {
      console.error('Failed to fetch engineers:', error);
      
      if (error.name === 'AbortError') {
        setEngineersError('Request timed out. Please try again.');
      } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        setEngineersError('Network error. Please check your connection.');
      } else {
        setEngineersError('Failed to load technicians. Please refresh the page.');
      }

      // Retry logic
      if (!isRetry && retryCount < REPAIR_CONFIG.MAX_RETRY_ATTEMPTS) {
        retryTimeoutRef.current = setTimeout(() => {
          fetchEngineers(true);
        }, REPAIR_CONFIG.RETRY_DELAY_MS * (retryCount + 1));
      }
    } finally {
      setIsLoadingEngineers(false);
    }
  }, [retryCount]);

  useEffect(() => {
    fetchEngineers();

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Handle form input changes with validation
  const handleInputChange = useCallback((field: keyof RepairFormData, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear validation error for this field when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Clear general error when user makes changes
    if (error) {
      setError(null);
    }
  }, [validationErrors, error]);

  const calculateEstimatedCompletion = useCallback(() => {
    const today = new Date();
    const completionDate = new Date(today);
    completionDate.setDate(today.getDate() + formData.estimatedDays);
    return completionDate;
  }, [formData.estimatedDays]);

  // Memoized form validation
  const formErrors = useMemo(() => validateFormData(formData), [validateFormData, formData]);

  const submitRepair = useCallback(async () => {
    // Clear previous errors
    setError(null);
    setValidationErrors({});

    // Validate form data
    const errors = validateFormData(formData);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      
      // Show first error in toast
      const firstError = Object.values(errors)[0];
      toast({
        title: "Validation Error",
        description: firstError,
        variant: "destructive",
      });
      return;
    }

    // Prevent rapid submissions
    if (lastSubmissionTime && Date.now() - lastSubmissionTime.getTime() < 2000) {
      toast({
        title: "Please Wait",
        description: "Please wait before submitting again",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setLastSubmissionTime(new Date());
    
    try {
      const estimatedCompletion = calculateEstimatedCompletion();
      
      // Determine store ID based on user role
      const storeId = isAdmin ? currentStore?._id : user?.store_id;
      
      const technician = engineers.find((e) => e._id === formData.technicianId)?.name || '';
      
      // Sanitize and validate data before submission
      const repairData = {
        customer: selectedCustomer?._id || selectedCustomer?.id || '',
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
          `Store: ${currentStore?.name || user?.store?.name || 'Not specified'}`,
          `Created by: ${user?.name || 'Unknown'}`,
          `Created at: ${new Date().toISOString()}`
        ].join('\n'),
        storeId: storeId,
      };

      console.log('[DEBUG] Submitting repairData:', repairData);
      
      // Submit repair to the API with timeout
      const newRepair = await Promise.race([
        addRepair(repairData),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), REPAIR_CONFIG.REQUEST_TIMEOUT_MS)
        )
      ]);
      
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
      setValidationErrors({});
      setError(null);
      setRetryCount(0);

      toast({
        title: "Success",
        description: "Repair ticket created successfully!",
        variant: "default",
      });

      // Send notifications if consent was given
      if (formData.notificationConsent && newRepair) {
        console.log('=== SENDING NOTIFICATIONS ===');
        console.log('Notification consent:', formData.notificationConsent);
        console.log('WhatsApp number:', formData.whatsappNumber);
        console.log('Email address:', formData.notificationEmail);
        
        try {
          const notificationResult = await sendRepairNotifications({
            repairId: newRepair._id || newRepair.id,
            customerName: selectedCustomer?.name || 'Customer',
            deviceInfo: `${formData.deviceBrand} ${formData.deviceModel}`,
            issue: formData.issue,
            estimatedCost: formData.estimatedCost,
            estimatedDays: formData.estimatedDays,
            whatsappNumber: formData.whatsappNumber,
            notificationEmail: formData.notificationEmail,
          });
          
          console.log('Notification result:', notificationResult);
          
          // Show success message for notifications
          if (notificationResult.success) {
            toast({
              title: "Notifications Sent",
              description: "Repair notifications have been sent successfully.",
              variant: "default",
            });
          } else if (notificationResult.skipped) {
            console.warn('Notifications skipped:', notificationResult.message);
            toast({
              title: "Notifications Skipped",
              description: notificationResult.message,
              variant: "default",
            });
          } else {
            console.warn('Notification failed:', notificationResult.message);
            toast({
              title: "Notification Warning",
              description: "Repair created but notifications failed to send.",
              variant: "default",
            });
          }
        } catch (notificationError) {
          console.error('Failed to send notifications:', notificationError);
          toast({
            title: "Notification Error",
            description: "Repair created but there was an issue sending notifications.",
            variant: "default",
          });
        }
      } else {
        console.log('Notifications not sent - consent not given or no repair data');
      }
      
    } catch (error: any) {
      console.error('Failed to submit repair:', error);
      
      let errorMessage = REPAIR_CONFIG.VALIDATION_MESSAGES.SUBMISSION_FAILED;
      let errorCode = REPAIR_CONFIG.ERROR_CODES.UNKNOWN_ERROR;

      if (error.message === 'Request timeout') {
        errorMessage = REPAIR_CONFIG.VALIDATION_MESSAGES.TIMEOUT_ERROR;
        errorCode = REPAIR_CONFIG.ERROR_CODES.TIMEOUT_ERROR;
      } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage = REPAIR_CONFIG.VALIDATION_MESSAGES.NETWORK_ERROR;
        errorCode = REPAIR_CONFIG.ERROR_CODES.NETWORK_ERROR;
      } else if (error.response?.status >= 500) {
        errorMessage = REPAIR_CONFIG.VALIDATION_MESSAGES.SERVER_ERROR;
        errorCode = REPAIR_CONFIG.ERROR_CODES.SERVER_ERROR;
      }

      setError({
        type: 'submission',
        message: errorMessage,
        code: errorCode
      });

      toast({
        title: "Submission Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    formData, 
    selectedCustomer, 
    currentStore, 
    user, 
    isAdmin, 
    engineers, 
    calculateEstimatedCompletion, 
    validateFormData, 
    lastSubmissionTime, 
    toast
  ]);

  const sendRepairNotifications = async (
    newRepair: RepairNotificationData
  ) => {
    const results = {
      whatsapp: { success: false, message: '' },
      email: { success: false, message: '' }
    };

    try {
      // Send WhatsApp notification
      if (newRepair.whatsappNumber) {
        console.log('Sending WhatsApp notification to:', newRepair.whatsappNumber);
        try {
          await sendWhatsAppNotification(
            newRepair.whatsappNumber,
            `🔧 Repair Ticket Created\n\nCustomer: ${newRepair.customerName}\nDevice: ${newRepair.deviceInfo}\nIssue: ${newRepair.issue}\nEstimated Cost: ₹${newRepair.estimatedCost}\nEstimated Days: ${newRepair.estimatedDays}\n\nWe'll keep you updated on the repair progress.`
          );
          results.whatsapp = { success: true, message: 'WhatsApp notification sent successfully' };
        } catch (whatsappError) {
          console.error('WhatsApp notification failed:', whatsappError);
          results.whatsapp = { success: false, message: 'WhatsApp notification failed' };
        }
      } else {
        console.log('No WhatsApp number provided');
        results.whatsapp = { success: false, message: 'No WhatsApp number provided' };
      }

      // Send email notification
      if (newRepair.notificationEmail) {
        console.log('Sending email notification to:', newRepair.notificationEmail);
        try {
          const emailResult = await emailService.sendRepairNotification({
            to: newRepair.notificationEmail,
            customerName: newRepair.customerName,
            deviceInfo: newRepair.deviceInfo,
            issue: newRepair.issue,
            estimatedCost: newRepair.estimatedCost,
            estimatedDays: newRepair.estimatedDays,
          });
          
          if (emailResult.success) {
            results.email = { success: true, message: 'Email notification sent successfully' };
          } else {
            results.email = { success: false, message: emailResult.message || 'Email notification failed' };
          }
        } catch (emailError) {
          console.error('Email notification failed:', emailError);
          results.email = { success: false, message: 'Email notification failed' };
        }
      } else {
        console.log('No email address provided');
        results.email = { success: false, message: 'No email address provided' };
      }

      console.log('Notification results:', results);
      return {
        success: results.whatsapp.success || results.email.success,
        whatsapp: results.whatsapp,
        email: results.email
      };
    } catch (error) {
      console.error("Error sending notifications:", error);
      return {
        success: false,
        message: 'Failed to send notifications',
        error: error
      };
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={testEmailNotification}
            className="text-xs"
          >
            Test Email
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowCustomerSearch(true)}
          >
            Change Customer
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error:</strong> {error.message}
            {error.code && (
              <span className="ml-2 text-xs opacity-75">(Code: {error.code})</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Engineers Loading/Error State */}
      {isLoadingEngineers && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Loading technicians...
          </AlertDescription>
        </Alert>
      )}

      {engineersError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {engineersError}
            <Button
              variant="link"
              size="sm"
              className="p-0 h-auto ml-2"
              onClick={() => fetchEngineers()}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

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
                    maxLength={REPAIR_CONFIG.MAX_DEVICE_BRAND_LENGTH}
                    className={validationErrors.deviceBrand ? "border-red-500" : ""}
                  />
                  {validationErrors.deviceBrand && (
                    <p className="text-xs text-red-500 mt-1">{validationErrors.deviceBrand}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.deviceBrand.length}/{REPAIR_CONFIG.MAX_DEVICE_BRAND_LENGTH} characters
                  </p>
                </div>
                <div>
                <Label htmlFor="deviceModel">Model *</Label>
                  <Input
                    id="deviceModel"
                    value={formData.deviceModel}
                  onChange={(e) => handleInputChange("deviceModel", e.target.value)}
                  placeholder="e.g., Inspiron 15, ThinkPad X1"
                  maxLength={REPAIR_CONFIG.MAX_DEVICE_MODEL_LENGTH}
                  className={validationErrors.deviceModel ? "border-red-500" : ""}
                  />
                  {validationErrors.deviceModel && (
                    <p className="text-xs text-red-500 mt-1">{validationErrors.deviceModel}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.deviceModel.length}/{REPAIR_CONFIG.MAX_DEVICE_MODEL_LENGTH} characters
                  </p>
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
                  maxLength={REPAIR_CONFIG.MAX_SERIAL_NUMBER_LENGTH}
                  className={validationErrors.serialNumber ? "border-red-500" : ""}
                  />
                  {validationErrors.serialNumber && (
                    <p className="text-xs text-red-500 mt-1">{validationErrors.serialNumber}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.serialNumber.length}/{REPAIR_CONFIG.MAX_SERIAL_NUMBER_LENGTH} characters
                  </p>
                </div>
                <div>
                <Label htmlFor="imei">IMEI</Label>
                  <Input
                    id="imei"
                    value={formData.imei}
                    onChange={(e) => handleInputChange("imei", e.target.value)}
                  placeholder="Optional"
                  maxLength={REPAIR_CONFIG.MAX_IMEI_LENGTH}
                  className={validationErrors.imei ? "border-red-500" : ""}
                  />
                  {validationErrors.imei && (
                    <p className="text-xs text-red-500 mt-1">{validationErrors.imei}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.imei.length}/{REPAIR_CONFIG.MAX_IMEI_LENGTH} characters
                  </p>
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
                  maxLength={REPAIR_CONFIG.MAX_ISSUE_LENGTH}
                  className={validationErrors.issue ? "border-red-500" : ""}
                />
                {validationErrors.issue && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.issue}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.issue.length}/{REPAIR_CONFIG.MAX_ISSUE_LENGTH} characters
                </p>
              </div>
              <div>
                <Label htmlFor="diagnosis">Initial Diagnosis</Label>
                <Textarea
                  id="diagnosis"
                  value={formData.diagnosis}
                onChange={(e) => handleInputChange("diagnosis", e.target.value)}
                placeholder="Initial assessment of the issue..."
                rows={2}
                maxLength={REPAIR_CONFIG.MAX_DIAGNOSIS_LENGTH}
                className={validationErrors.diagnosis ? "border-red-500" : ""}
                />
                {validationErrors.diagnosis && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.diagnosis}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.diagnosis.length}/{REPAIR_CONFIG.MAX_DIAGNOSIS_LENGTH} characters
                </p>
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
                <Label htmlFor="estimatedCost">Estimated Cost (₹) *</Label>
                <Input
                  id="estimatedCost"
                  type="number"
                  min={REPAIR_CONFIG.MIN_ESTIMATED_COST}
                  max={REPAIR_CONFIG.MAX_ESTIMATED_COST}
                  value={formData.estimatedCost}
                  onChange={(e) => handleInputChange("estimatedCost", parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className={validationErrors.estimatedCost ? "border-red-500" : ""}
                />
                {validationErrors.estimatedCost && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.estimatedCost}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Range: ₹{REPAIR_CONFIG.MIN_ESTIMATED_COST.toLocaleString()} - ₹{REPAIR_CONFIG.MAX_ESTIMATED_COST.toLocaleString()}
                </p>
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
                  min={REPAIR_CONFIG.MIN_ESTIMATED_DAYS}
                  max={REPAIR_CONFIG.MAX_ESTIMATED_DAYS}
                  value={formData.estimatedDays}
                  onChange={(e) => handleInputChange("estimatedDays", parseInt(e.target.value) || 1)}
                  className={validationErrors.estimatedDays ? "border-red-500" : ""}
                />
                {validationErrors.estimatedDays && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.estimatedDays}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Range: {REPAIR_CONFIG.MIN_ESTIMATED_DAYS} - {REPAIR_CONFIG.MAX_ESTIMATED_DAYS} days
                </p>
              </div>
              <div>
                <Label htmlFor="technicianId">Assign Technician *</Label>
                <Select
                  value={formData.technicianId}
                  onValueChange={(value) => handleInputChange("technicianId", value)}
                  disabled={isLoadingEngineers || engineers.length === 0}
                >
                  <SelectTrigger className={validationErrors.technicianId ? "border-red-500" : ""}>
                    <SelectValue placeholder={isLoadingEngineers ? "Loading..." : engineers.length === 0 ? "No technicians available" : "Select technician"} />
                  </SelectTrigger>
                  <SelectContent>
                    {engineers.map((engineer) => (
                      <SelectItem key={engineer._id} value={engineer._id}>
                        {engineer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationErrors.technicianId && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.technicianId}</p>
                )}
                {engineers.length === 0 && !isLoadingEngineers && (
                  <p className="text-xs text-amber-600 mt-1">
                    <Info className="inline h-3 w-3 mr-1" />
                    No technicians available. Please contact your administrator.
                  </p>
                )}
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
                type="tel"
                value={formData.whatsappNumber}
                onChange={(e) => {
                  // Only allow digits and common phone number characters
                  const value = e.target.value.replace(/[^\d+\-\(\)\s]/g, '');
                  handleInputChange("whatsappNumber", value);
                }}
                placeholder="Enter 10-digit number (e.g., 9876543210)"
                maxLength={15}
                className={validationErrors.whatsappNumber ? "border-red-500" : ""}
                />
                {validationErrors.whatsappNumber && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.whatsappNumber}</p>
                )}
                {formData.whatsappNumber && (
                  <p className={`text-xs mt-1 ${formData.whatsappNumber.replace(/\D/g, '').length === 10 ? "text-green-600" : "text-amber-600"}`}>
                    {formData.whatsappNumber.replace(/\D/g, '').length === 10 
                      ? <><CheckCircle className="inline h-3 w-3 mr-1" />Valid 10-digit number</>
                      : `${formData.whatsappNumber.replace(/\D/g, '').length}/10 digits`
                    }
                  </p>
                )}
              </div>
            <div>
              <Label htmlFor="notificationEmail">Notification Email</Label>
              <Input
                id="notificationEmail"
                type="email"
                value={formData.notificationEmail}
                onChange={(e) => handleInputChange("notificationEmail", e.target.value)}
                placeholder="customer@example.com"
                maxLength={REPAIR_CONFIG.MAX_EMAIL_LENGTH}
                className={validationErrors.notificationEmail ? "border-red-500" : ""}
              />
                {validationErrors.notificationEmail && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.notificationEmail}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.notificationEmail.length}/{REPAIR_CONFIG.MAX_EMAIL_LENGTH} characters
                </p>
                </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="notificationConsent"
                checked={formData.notificationConsent}
                onChange={(e) => handleInputChange("notificationConsent", e.target.checked)}
                className="rounded"
                required
              />
              <Label htmlFor="notificationConsent" className={validationErrors.notificationConsent ? "text-red-500" : ""}>
                Send notifications about repair progress *
              </Label>
              </div>
              {validationErrors.notificationConsent && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.notificationConsent}</p>
              )}
            </CardContent>
          </Card>
      </div>

      {/* Form Summary */}
      {Object.keys(formErrors).length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Please fix the following errors:</strong>
            <ul className="mt-2 list-disc list-inside">
              {Object.values(formErrors).map((error, index) => (
                <li key={index} className="text-sm">{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
              <Button
                onClick={submitRepair}
                disabled={isSubmitting || isLoadingEngineers || Object.keys(formErrors).length > 0}
          className="px-8"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
