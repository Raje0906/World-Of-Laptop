import React, { useState, useCallback } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { repairService } from "@/services/api";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Search, Phone, Mail, Calendar, Clock, CheckCircle, AlertTriangle, Loader2, Wrench, User, Check, Send, Download, History } from "lucide-react";
import { emailService } from '@/services/emailService';
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface PriceHistoryEntry {
  repairCost: number;
  partsCost: number;
  laborCost: number;
  totalCost: number;
  updatedAt: string | Date;
  updatedBy?: {
    name?: string;
    email?: string;
    _id?: string;
  };
}

interface Repair {
  _id: string;
  ticketNumber: string;
  status: string;
  device: string;
  deviceType?: string;
  brand?: string;
  model?: string;
  issue: string;
  issueDescription?: string;
  receivedDate: string;
  estimatedCompletion: string;
  repairCost: number;
  partsCost: number;
  laborCost: number;
  totalCost: number;
  priceHistory?: PriceHistoryEntry[];
  customer: {
    _id?: string;
    name: string;
    phone: string;
    email: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      pincode: string;
    };
  };
  name?: string;
  phone?: string;
  email?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export function TrackRepair() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchBy, setSearchBy] = useState<"ticket" | "phone" | "name">("ticket");
  const [foundRepairs, setFoundRepairs] = useState<Repair[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCompleting, setIsCompleting] = useState<Record<string, boolean>>({});
  const [isSendingUpdate, setIsSendingUpdate] = useState<Record<string, boolean>>({});
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);
  const [updateMessage, setUpdateMessage] = useState("");
  const [remainingRepairs, setRemainingRepairs] = useState<Repair[]>([]);
  const [receivedRepairs, setReceivedRepairs] = useState<Repair[]>([]);
  const [isLoadingRemaining, setIsLoadingRemaining] = useState(false);
  const [isLoadingReceived, setIsLoadingReceived] = useState(false);
  const { toast } = useToast();
  
  // Export repairs to Excel
  const exportToExcel = useCallback((repairs: Repair[], fileName: string) => {
    try {
      // Prepare data for export
      const exportData = repairs.map(repair => ({
        'Ticket #': repair.ticketNumber,
        'Status': repair.status,
        'Device': repair.device,
        'Issue': repair.issue,
        'Customer': repair.customer?.name || 'N/A',
        'Phone': repair.customer?.phone || 'N/A',
        'Email': repair.customer?.email || 'N/A',
        'Received Date': new Date(repair.receivedDate).toLocaleDateString(),
        'Estimated Completion': new Date(repair.estimatedCompletion).toLocaleDateString(),
        'Total Cost': `₹${repair.totalCost?.toFixed(2) || '0.00'}`,
        'Address': repair.customer?.address 
          ? `${repair.customer.address.line1}${repair.customer.address.line2 ? ', ' + repair.customer.address.line2 : ''}, ${repair.customer.address.city}, ${repair.customer.address.state} - ${repair.customer.address.pincode}`
          : 'N/A'
      }));

      // Create worksheet and workbook
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Repairs');

      // Generate Excel file and trigger download
      XLSX.writeFile(workbook, `${fileName}-${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast({
        title: 'Export Successful',
        description: `${repairs.length} repairs exported to Excel`,
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export repairs to Excel',
        variant: 'destructive',
      });
    }
  }, [toast]);
  
  // Fetch remaining repairs
  const fetchRemainingRepairs = async () => {
    try {
      setIsLoadingRemaining(true);
      const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
      const response = await axios.get(`${baseUrl}/api/repairs?status=in_progress&limit=5`);
      if (response.data.success) {
        setRemainingRepairs(response.data.data || []);
      }
    } catch (error: any) {
      console.error('Error fetching remaining repairs:', error);
      toast({
        title: "Error",
        description: "Failed to load remaining repairs.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRemaining(false);
    }
  };
  
  // Fetch repairs when component mounts
  React.useEffect(() => {
    fetchRemainingRepairs();
    fetchReceivedRepairs();
  }, []);

  // Function to fetch repairs with 'received' status and filter out 'completed' status
  const fetchReceivedRepairs = async () => {
    try {
      setIsLoadingReceived(true);
      const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
      const response = await axios.get(`${baseUrl}/api/repairs?status=received`, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        withCredentials: true
      });
      
      console.log('Received repairs response:', response.data); // Debug log
      
      if (response.data.success) {
        // Ensure we have an array and filter for 'received' status as a fallback
        let repairs = Array.isArray(response.data.data) 
          ? response.data.data 
          : [response.data.data].filter(Boolean);
        
        // Filter out any repairs with 'completed' status (case-insensitive)
        repairs = repairs.filter(repair => 
          repair.status && 
          typeof repair.status === 'string' && 
          !repair.status.toLowerCase().includes('completed')
        );
          
        console.log('Setting received repairs (filtered):', repairs); // Debug log
        setReceivedRepairs(repairs);
      } else {
        console.error('Failed to fetch received repairs:', response.data.message);
        toast({
          title: "Error",
          description: response.data.message || "Failed to load received repairs.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error fetching received repairs:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load received repairs.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingReceived(false);
    }
  };
  
  // Function to navigate to repair details
  const navigateToRepairDetails = (ticketNumber: string) => {
    window.location.href = `/repairs/details/${ticketNumber}`;
  };

  const handleCompleteRepair = async (ticketNumber: string) => {
    if (!window.confirm('Are you sure you want to mark this repair as complete? This will notify the customer.')) {
      return;
    }

    try {
      setIsCompleting(prev => ({ ...prev, [ticketNumber]: true }));
      console.log('Starting repair completion process for ticket:', ticketNumber);
      
      // Fetch the full repair object by ticketNumber to get the _id
      const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
      console.log('Fetching repair details for ticket:', ticketNumber);
      
      const repairResp = await axios.get(`${baseUrl}/api/repairs/track/status?ticket=${ticketNumber}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          'Accept': 'application/json'
        }
      });
      
      console.log('Full repair API response:', {
        status: repairResp.status,
        statusText: repairResp.statusText,
        data: repairResp.data
      });

      // Handle different response structures
      let repairId;
      let repairData;
      
      if (Array.isArray(repairResp.data?.data)) {
        // Handle array response
        repairId = repairResp.data.data[0]?._id;
        repairData = repairResp.data.data[0];
        console.log('Found repair in array response:', repairData);
      } else if (repairResp.data?.data?._id) {
        // Handle single object response
        repairId = repairResp.data.data._id;
        repairData = repairResp.data.data;
        console.log('Found repair in object response:', repairData);
      } else if (repairResp.data?._id) {
        // Handle direct data response
        repairId = repairResp.data._id;
        repairData = repairResp.data;
        console.log('Found repair in direct response:', repairData);
      }
      
      if (!repairId || !repairData) {
        console.error('Could not find repair ID in response. Full response:', repairResp.data);
        throw new Error('Could not find repair ID for this ticket. Please check the ticket number and try again.');
      }

      console.log('Marking repair as completed in the system...');
      const response = await axios.post(
        `${baseUrl}/api/repairs/${repairId}/complete`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
          },
          withCredentials: true
        }
      );

      console.log('Repair completion API response:', response.data);

      if (response.data.success && repairData) {
        const customerName = repairData.customer?.name || 'Valued Customer';
        const customerEmail = repairData.customer?.email?.trim();
        
        console.log('Preparing to send email to:', customerEmail);
        
        if (customerEmail && emailService.isValidEmail(customerEmail)) {
          console.log('Sending completion email to:', customerEmail);
          try {
            const templateParams = {
              user_name: customerName,
              device_name: repairData.device || 'your device',
              issue_description: repairData.issue || 'Not specified',
              repair_id: repairData.ticketNumber || 'N/A',
              estimated_date: repairData.estimatedCompletion || new Date().toISOString().split('T')[0],
              to_email: customerEmail,
              completion_date: new Date().toISOString().split('T')[0],
              total_cost: repairData.totalCost ? `₹${repairData.totalCost.toFixed(2)}` : 'To be determined'
            };
            
            console.log('Sending email with params:', templateParams);
            const emailResult = await emailService.sendCompletionEmail(templateParams);
            console.log('Email sent successfully:', emailResult);
            
        toast({
          title: "Success",
              description: `Repair marked as completed and notification sent to ${customerEmail}`,
          variant: "default",
        });
        
          } catch (error: any) {
            console.error('Failed to send completion email:', error);
            toast({
              title: "Repair Completed",
              description: `Repair was marked as completed, but there was an issue sending the email notification: ${error.message}`,
              variant: "default",
            });
          }
        } else {
          console.log('No valid customer email available for sending completion notification');
          toast({
            title: "Repair Completed",
            description: "Repair was marked as completed, but no valid email was found to send a notification.",
            variant: "default",
          });
        }
        }
        
        // Refresh the repairs list
        await searchRepairs();
      
    } catch (error: any) {
      console.error('Error in handleCompleteRepair:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || 'An error occurred while processing your request',
        variant: "destructive",
      });
    } finally {
      setIsCompleting(prev => ({ ...prev, [ticketNumber]: false }));
    }
  };

  const searchRepairs = async () => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      toast({
        title: "Error",
        description: "Please enter a search query",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSearching(true);
      
      // Build query parameters based on search type
      const params = new URLSearchParams();
      
      if (searchBy === "ticket") {
        // For ticket search, use the exact value
        params.append("ticket", trimmedQuery);
      } else if (searchBy === "name") {
        // For name search, use a case-insensitive search
        params.append("customerName", trimmedQuery);
      } else if (searchBy === "phone") {
        // Clean and format phone number - ensure it has at least 10 digits
        const phoneNumber = trimmedQuery.replace(/\D/g, "");
        if (phoneNumber.length < 10) {
          throw new Error('Please enter a valid phone number with at least 10 digits');
        }
        params.append("phone", phoneNumber);
      } else if (searchBy === "email") {
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedQuery)) {
          throw new Error('Please enter a valid email address');
        }
        params.append("email", trimmedQuery.toLowerCase());
      }

      const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
      const apiUrl = `${baseUrl}/api/repairs/track/status?${params.toString()}`;
      console.log('Constructed API URL:', apiUrl);

      try {
        console.log('Sending request to:', apiUrl);
        console.log('Request headers:', {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'withCredentials': true
        });
        
        const response = await axios.get(apiUrl, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          withCredentials: true,  // Include credentials for CORS
          validateStatus: (status) => status < 500 // Don't throw for 4xx errors
        });

        console.log('API Response Status:', response.status);
        console.log('API Response Headers:', response.headers);
        console.log('API Response Data:', response.data);

        if (response.status === 200 && response.data?.success) {
          const repairs = Array.isArray(response.data.data) 
            ? response.data.data 
            : [response.data.data];
          
          if (repairs.length === 0) {
            throw new Error('No repairs found with the provided details');
          }
          
          // Transform the response to match the Repair interface
          const formattedRepairs = repairs.map(repair => ({
            ...repair,
            _id: repair._id || repair.id, // ensure _id is present
            customer: {
              name: repair.customer?.name || 'N/A',
              phone: repair.customer?.phone || 'N/A',
              email: repair.customer?.email || 'N/A',
              address: {
                line1: repair.customer?.address?.line1 || '',
                line2: repair.customer?.address?.line2 || '',
                city: repair.customer?.address?.city || '',
                state: repair.customer?.address?.state || '',
                pincode: repair.customer?.address?.pincode || ''
              }
            }
          }));
          
          setFoundRepairs(formattedRepairs);
        } else {
          throw new Error(response.data?.message || 'Failed to search for repairs');
        }
      } catch (error: any) {
        console.error('API Error:', error);
        
        // Handle different types of errors
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          const status = error.response.status;
          let message = error.response.data?.message || 'Failed to search for repairs';
          
          // Customize message for different status codes
          if (status === 404) {
            if (message.includes('No customers found')) {
              message = 'No repair records found with the provided details. Please check your search criteria.';
            } else {
              message = 'No repair records found. Please check your search criteria.';
            }
          } else if (status === 400) {
            message = 'Invalid search parameters. Please check your input and try again.';
          } else if (status >= 500) {
            message = 'Server error. Please try again later.';
          }
          
          throw new Error(message);
        } else if (error.request) {
          // The request was made but no response was received
          throw new Error('No response from server. Please check your internet connection and try again.');
        } else {
          // Something happened in setting up the request that triggered an Error
          throw new Error(error.message || 'An error occurred while processing your request');
        }
      }
    } catch (error: any) {
      console.error("Error searching repairs:", error);
      
      // Default error message
      let errorMessage = (error as Error).message || 'Failed to search for repairs. Please try again.';
      
      // Extract the actual error message if it's wrapped in a server response
      if (errorMessage.includes('Server responded with status')) {
        // Extract just the message part after the status code
        const match = errorMessage.match(/Server responded with status \d+: (.+)/);
        if (match && match[1]) {
          errorMessage = match[1];
        }
      }
      
      // Show the error to the user
      toast({
        title: "Search Failed",
        description: (error as Error).message,
        variant: "destructive",
        duration: 5000, // Show for 5 seconds
      });
      
      // Clear previous results
      setFoundRepairs([]);
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: string; icon: React.ReactNode }> = {
      completed: {
        label: "Completed",
        variant: "bg-green-100 text-green-800 hover:bg-green-200",
        icon: <CheckCircle className="h-3 w-3 mr-1" />
      },
      delivered: {
        label: "Delivered",
        variant: "bg-green-100 text-green-800 hover:bg-green-200",
        icon: <CheckCircle className="h-3 w-3 mr-1" />
      },
      cancelled: {
        label: "Cancelled",
        variant: "bg-red-100 text-red-800 hover:bg-red-200",
        icon: <AlertTriangle className="h-3 w-3 mr-1" />
      },
      in_progress: {
        label: "In Progress",
        variant: "bg-blue-100 text-blue-800 hover:bg-blue-200",
        icon: <Wrench className="h-3 w-3 mr-1" />
      },
      received: {
        label: "Received",
        variant: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
        icon: <Clock className="h-3 w-3 mr-1" />
      },
      default: {
        label: status.replace('_', ' '),
        variant: "bg-gray-100 text-gray-800 hover:bg-gray-200",
        icon: <Clock className="h-3 w-3 mr-1" />
      }
    };

    const statusInfo = statusMap[status] || statusMap.default;
    
    return (
      <Badge className={statusInfo.variant}>
        {statusInfo.icon}
        {statusInfo.label}
      </Badge>
    );
  };

  const getProgressValue = (status: string) => {
    const progressMap: Record<string, number> = {
      received: 20,
      diagnosed: 40,
      approved: 60,
      in_progress: 80,
      completed: 100,
      delivered: 100,
      cancelled: 0
    };
    
    return progressMap[status] || 0;
  };

  const handleSendUpdate = async (repair: Repair) => {
    if (!updateMessage.trim()) {
      toast({
        title: "Error",
        description: "Please enter an update message",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSendingUpdate(prev => ({ ...prev, [repair._id]: true }));
      
      const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
      const response = await fetch(`${baseUrl}/api/repairs/${repair._id}/send-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          message: updateMessage.trim()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send update');
      }

      toast({
        title: "Update sent!",
        description: `The repair update has been sent to the customer.`,
      });

      // Reset form
      setUpdateMessage("");
      setSelectedRepair(null);
    } catch (error: any) {
      console.error("Error sending repair update:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send update",
        variant: "destructive",
      });
    } finally {
      setIsSendingUpdate(prev => ({ ...prev, [repair._id]: false }));
    }
  };

  // Add state for update price dialog
  const [priceUpdateRepair, setPriceUpdateRepair] = useState<Repair | null>(null);
  const [newPrice, setNewPrice] = useState<string>("");
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);

  const handleUpdatePrice = async () => {
    if (!priceUpdateRepair || !newPrice) return;
    setIsUpdatingPrice(true);
    try {
      const response = await axios.put(
        `/api/repairs/${priceUpdateRepair._id}/price`,
        { price: newPrice },
        { withCredentials: true }
      );

      if (response.data.success) {
        // Update the local state with the updated repair data from the server
        setFoundRepairs(currentRepairs =>
          currentRepairs.map(r =>
            r._id === priceUpdateRepair._id 
              ? { ...r, ...response.data.data, totalCost: Number(newPrice) } 
              : r
          )
        );
        
        // Also update the selected repair if it's the one being updated
        if (selectedRepair?._id === priceUpdateRepair._id) {
          setSelectedRepair(prev => prev ? { ...prev, totalCost: Number(newPrice) } : null);
        }
        
        toast({
          title: "Success",
          description: response.data.message || "Repair price has been updated.",
        });
        setPriceUpdateRepair(null);
      }
    } catch (error: any) {
      toast({
        title: "Error updating price",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      {/* Search Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Track Your Repair</CardTitle>
          <CardDescription>
            Enter your ticket number or phone number to check the status of your repair.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={searchBy === "ticket" ? "default" : "outline"}
                onClick={() => setSearchBy("ticket")}
                className="flex-1 sm:flex-none"
              >
                <Search className="mr-2 h-4 w-4" /> Ticket
              </Button>
              <Button
                variant={searchBy === "phone" ? "default" : "outline"}
                onClick={() => setSearchBy("phone")}
                className="flex-1 sm:flex-none"
              >
                <Phone className="mr-2 h-4 w-4" /> Phone
              </Button>

              <Button
                variant={searchBy === "name" ? "default" : "outline"}
                onClick={() => setSearchBy("name")}
                className="flex-1 sm:flex-none"
              >
                <User className="mr-2 h-4 w-4" /> Name
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                type={searchBy === "phone" ? "tel" : searchBy === "email" ? "email" : "text"}
                placeholder={
                  searchBy === "ticket"
                    ? "Enter your ticket number"
                    : searchBy === "phone"
                    ? "Enter your phone number (with country code)"
                    : "Enter customer name"
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchRepairs()}
                className="flex-1"
              />
              <Button 
                onClick={searchRepairs} 
                disabled={isSearching}
                className="w-24"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-1" />
                )}
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {foundRepairs.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">
            {foundRepairs.length} {foundRepairs.length === 1 ? 'Repair Found' : 'Repairs Found'}
          </h2>
          {/* Sort repairs: incomplete first */}
          {foundRepairs
            .slice()
            .sort((a, b) => {
              const isAIncomplete = !['completed', 'delivered', 'cancelled'].includes(a.status);
              const isBIncomplete = !['completed', 'delivered', 'cancelled'].includes(b.status);
              if (isAIncomplete === isBIncomplete) return 0;
              return isAIncomplete ? -1 : 1;
            })
            .map((repair: Repair) => (
            <Card key={repair.ticketNumber} className="overflow-hidden">
              <CardHeader className="bg-gray-50 p-4 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">
                        {repair.device}
                      </h3>
                      {getStatusBadge(repair.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Ticket: {repair.ticketNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      ₹{repair.totalCost?.toFixed(2) || '0.00'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Received: {new Date(repair.receivedDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Repair Progress</span>
                      <span>{getProgressValue(repair.status)}%</span>
                    </div>
                    <Progress value={getProgressValue(repair.status)} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Received</span>
                      <span>Diagnosed</span>
                      <span>In Progress</span>
                      <span>Completed</span>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Left Column - Customer Details */}
                    <div>
                      <h4 className="font-medium mb-2 flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        Customer Details
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p className="font-medium">{repair.customer.name}</p>
                        <p className="flex items-center">
                          <Phone className="h-3.5 w-3.5 mr-1.5 opacity-70" />
                          {repair.customer.phone}
                        </p>
                        <p className="flex items-center">
                          <Mail className="h-3.5 w-3.5 mr-1.5 opacity-70" />
                          {repair.customer.email || 'No email provided'}
                        </p>
                        <p className="text-muted-foreground text-xs mt-2">
                          {repair.customer.address.line1}
                          {repair.customer.address.line2 && `, ${repair.customer.address.line2}`}
                          {repair.customer.address.city && `, ${repair.customer.address.city}`}
                          {repair.customer.address.state && `, ${repair.customer.address.state}`}
                          {repair.customer.address.pincode && ` - ${repair.customer.address.pincode}`}
                        </p>
                      </div>
                    </div>

                    {/* Right Column - Repair Details */}
                    <div>
                      <h4 className="font-medium mb-2 flex items-center">
                        <Wrench className="h-4 w-4 mr-2" />
                        Repair Details
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <p className="font-medium">Issue</p>
                          <p className="text-muted-foreground">{repair.issue}</p>
                        </div>
                        <div>
                          <p className="font-medium">Estimated Completion</p>
                          <p className="text-muted-foreground">
                            {repair.estimatedCompletion 
                              ? new Date(repair.estimatedCompletion).toLocaleDateString() 
                              : 'Not specified'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Status Updates */}
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2 flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      Status Updates
                    </h4>
                    <div className="relative">
                      <div className="absolute left-4 top-0 h-full w-0.5 bg-gray-200"></div>
                      <div className="space-y-4">
                        <div className="relative pl-8">
                          <div className="absolute left-0 top-1 h-2 w-2 rounded-full bg-primary"></div>
                          <div className="text-sm">
                            <p className="font-medium">Repair {repair.status.replace('_', ' ')}</p>
                            <p className="text-muted-foreground text-xs">
                              {new Date(repair.receivedDate).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        
                        {(repair.status === 'completed' || repair.status === 'delivered') && (
                          <div className="relative pl-8">
                            <div className="absolute left-0 top-1 h-2 w-2 rounded-full bg-green-500"></div>
                            <div className="text-sm">
                              <p className="font-medium">
                                {repair.status === 'delivered' ? 'Device Delivered' : 'Repair Completed'}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {new Date(repair.estimatedCompletion || repair.receivedDate).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {repair.status !== 'completed' && repair.status !== 'delivered' && (
                          <div className="relative pl-8">
                            <div className="absolute left-0 top-1 h-2 w-2 rounded-full border-2 border-gray-300"></div>
                            <div className="text-sm text-muted-foreground">
                              <p>Awaiting completion</p>
                              <div className="flex gap-2 mt-2">
                                <Button 
                                  variant="outline"
                                  size="sm" 
                                  onClick={() => setSelectedRepair(repair)}
                                  disabled={isSendingUpdate[repair._id]}
                                >
                                  <Send className="h-4 w-4 mr-1" />
                                  Send Update
                                </Button>
                                <Button 
                                  size="sm" 
                                  onClick={() => handleCompleteRepair(repair.ticketNumber)}
                                  disabled={isCompleting[repair.ticketNumber]}
                                >
                                  {isCompleting[repair.ticketNumber] ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Completing...
                                    </>
                                  ) : (
                                    <>
                                      <Check className="mr-2 h-4 w-4" />
                                      Complete
                                    </>
                                  )}
                                </Button>
                                {(repair.status === 'pending' || repair.status === 'received') && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setPriceUpdateRepair(repair);
                                      setNewPrice(repair.totalCost?.toString() || '0');
                                    }}
                                  >
                                    Update Price
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Update Repair Dialog */}
      <Dialog open={!!selectedRepair} onOpenChange={(open) => !open && setSelectedRepair(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Send Repair Update</DialogTitle>
            <DialogDescription>
              Send an update about the repair status to the customer.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="update-message">Update Message</Label>
              <Textarea
                id="update-message"
                placeholder="Enter update message for the customer..."
                value={updateMessage}
                onChange={(e) => setUpdateMessage(e.target.value)}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                This message will be sent to the customer via WhatsApp and/or email.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setSelectedRepair(null)}
                disabled={isSendingUpdate[selectedRepair?._id || '']}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => selectedRepair && handleSendUpdate(selectedRepair)}
                disabled={!updateMessage.trim() || isSendingUpdate[selectedRepair?._id || '']}
              >
                {isSendingUpdate[selectedRepair?._id || ''] ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Update
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Price Dialog */}
      <Dialog open={!!priceUpdateRepair} onOpenChange={(open) => !open && setPriceUpdateRepair(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Repair Price</DialogTitle>
            <DialogDescription>
              Update the repair cost and view price history.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="repairCost" className="text-right">
                New Repair Cost
              </Label>
              <Input
                id="repairCost"
                type="number"
                min="0"
                step="0.01"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="col-span-3"
              />
            </div>
            
            {priceUpdateRepair?.priceHistory && priceUpdateRepair.priceHistory.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2 flex items-center">
                  <History className="h-4 w-4 mr-2" />
                  Price History
                </h4>
                <div className="border rounded-md p-4">
                  <div className="grid grid-cols-5 gap-2 font-medium text-sm mb-2 pb-2 border-b">
                    <div>Date</div>
                    <div className="text-right">Repair</div>
                    <div className="text-right">Parts</div>
                    <div className="text-right">Labor</div>
                    <div className="text-right">Total</div>
                  </div>
                  {[...priceUpdateRepair.priceHistory]
                    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                    .map((entry, index) => (
                      <div key={index} className="grid grid-cols-5 gap-2 text-sm py-1 border-b last:border-0">
                        <div className="text-xs text-muted-foreground">
                          {new Date(entry.updatedAt).toLocaleString()}
                        </div>
                        <div className="text-right">₹{entry.repairCost.toFixed(2)}</div>
                        <div className="text-right">₹{entry.partsCost.toFixed(2)}</div>
                        <div className="text-right">₹{entry.laborCost.toFixed(2)}</div>
                        <div className="text-right font-medium">
                          ₹{entry.totalCost.toFixed(2)}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPriceUpdateRepair(null)}
              disabled={isUpdatingPrice}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpdatePrice}
              disabled={isUpdatingPrice || !newPrice}
            >
              {isUpdatingPrice ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Price'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show repair lists when no search is performed */}
      {foundRepairs.length === 0 && (
        <div className="space-y-8">
          {/* Received Repairs Section */}
          {receivedRepairs.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
                Received Repairs Awaiting Processing
              </h3>
              {isLoadingReceived ? (
                <div className="grid gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse bg-muted/50 p-4 rounded-lg">
                      <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {receivedRepairs.map((repair) => (
                    <Card key={repair._id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{repair.customer?.name || 'No Name'}</div>
                            <div className="text-sm text-muted-foreground">
                              {repair.device} - {repair.issue}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Received: {new Date(repair.receivedDate).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                              {repair.status}
                            </Badge>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                setSearchQuery(repair.ticketNumber);
                                setSearchBy('ticket');
                                const searchBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
                                if (searchBtn) searchBtn.click();
                              }}
                            >
                              View
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
