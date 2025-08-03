import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Wrench,
  Search,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Phone,
  Mail,
  Eye,
  Edit,
  Send,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getRepairs,
  updateRepair,
  sendWhatsAppNotification,
  saveRepairsToIDB,
  getRepairsFromIDB,
} from "@/lib/dataUtils";
import { customers, stores } from "@/lib/mockData";
import { Repair } from "@/types";
import { emailService } from '@/services/emailService';
import jsPDF from 'jspdf';

export function RepairsOverview() {
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [filteredRepairs, setFilteredRepairs] = useState<Repair[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);
  const [updateNote, setUpdateNote] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSendingUpdate, setIsSendingUpdate] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const allRepairs = getRepairs();
    setRepairs(allRepairs);
    setFilteredRepairs(allRepairs);
  }, []);

  useEffect(() => {
    let filtered = repairs;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((repair) => {
        const customer = customers.find((c) => c.id === repair.customerId);
        return (
          repair.deviceInfo.brand
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          repair.deviceInfo.model
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          repair.issue.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer?.phone.includes(searchQuery)
        );
      });
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((repair) => repair.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter(
        (repair) => repair.priority === priorityFilter,
      );
    }

    setFilteredRepairs(filtered);
  }, [repairs, searchQuery, statusFilter, priorityFilter]);

  const getStatusBadge = (status: string) => {
    const statusMap = {
      received: { label: "Received", variant: "secondary" as const },
      diagnosing: { label: "Diagnosing", variant: "outline" as const },
      approved: { label: "Approved", variant: "default" as const },
      "in-progress": { label: "In Progress", variant: "default" as const },
      completed: { label: "Completed", variant: "default" as const },
      delivered: { label: "Delivered", variant: "default" as const },
      cancelled: { label: "Cancelled", variant: "destructive" as const },
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || {
      label: status,
      variant: "secondary" as const,
    };

    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityMap = {
      low: { label: "Low", variant: "secondary" as const },
      medium: { label: "Medium", variant: "outline" as const },
      high: { label: "High", variant: "destructive" as const },
      urgent: { label: "Urgent", variant: "destructive" as const },
    };

    const priorityInfo = priorityMap[priority as keyof typeof priorityMap] || {
      label: priority,
      variant: "secondary" as const,
    };

    return <Badge variant={priorityInfo.variant}>{priorityInfo.label}</Badge>;
  };

  const getCustomerName = (customerId: string) => {
    return customers.find((c) => c.id === customerId)?.name || "Unknown";
  };

  const getStoreName = (storeId: string) => {
    return stores.find((s) => s.id === storeId)?.name || "Unknown Store";
  };

  const updateRepairStatus = async (
    repairId: string,
    newStatus: string,
    note?: string,
  ) => {
    setIsUpdating(true);
    try {
      // Prepare update data with completion timestamp if needed
      const updateData: any = {
        status: newStatus as any,
        notes: selectedRepair
          ? [...selectedRepair.notes, note || `Status updated to ${newStatus}`]
          : [],
      };

      // If marking as completed, set completion timestamp
      if (newStatus === "completed") {
        updateData.actualCompletion = new Date().toISOString().split("T")[0];
        updateData.customerNotified = {
          whatsapp: true,
          email: true,
          lastNotified: new Date().toISOString(),
        };
      }

      const updatedRepair = updateRepair(repairId, updateData);

      if (updatedRepair) {
        setRepairs(repairs.map((r) => (r.id === repairId ? updatedRepair : r)));

        // Get customer details and contact information
        const customer = customers.find(
          (c) => c.id === updatedRepair.customerId,
        );

        // Use specific contact info from repair record if available, otherwise fallback to customer data
        const whatsappNumber =
          updatedRepair.contactInfo?.whatsappNumber || customer?.phone;
        const notificationEmail =
          updatedRepair.contactInfo?.notificationEmail || customer?.email;

        if (customer && whatsappNumber && notificationEmail) {
          if (newStatus === "completed") {
            // Enhanced completion notifications
            const store = stores.find((s) => s.id === updatedRepair.storeId);
            const whatsappMessage = `🎉 Great news ${customer.name}! 

Your ${updatedRepair.deviceInfo.brand} ${updatedRepair.deviceInfo.model} repair is COMPLETE! ✅

📋 Repair Details:
• Issue: ${updatedRepair.issue}
• Total Cost: ₹${updatedRepair.actualCost.toLocaleString()}
• Completion Date: ${new Date().toLocaleDateString()}

📍 Pickup Location:
${store?.name || "Our Store"}
${store?.address || "Store Address"}
📞 ${store?.phone || "Store Phone"}

⏰ Store Hours: Mon-Sat 10AM-8PM, Sun 11AM-6PM

Please bring a valid ID for pickup. Thank you for choosing Laptop Store! 🙏`;

            const templateParams = {
              user_name: customer.name,
              device_name: updatedRepair.deviceInfo.brand + ' ' + updatedRepair.deviceInfo.model,
              issue_description: updatedRepair.issue,
              repair_id: updatedRepair.id,
              estimated_date: updatedRepair.estimatedCompletion,
              to_email: customer.email,
            };
            await sendWhatsAppNotification(whatsappNumber, whatsappMessage);
            await emailService.sendEmail(templateParams);

            // Show success message with details
            toast({
              title: "🎉 Repair Completed & Customer Notified!",
              description: `${customer.name} has been notified via WhatsApp and email about the completed repair.`,
              duration: 5000,
            });
          } else if (newStatus === "in-progress") {
            // Notify when repair starts
            const message = `Hi ${customer.name}, good news! Your ${updatedRepair.deviceInfo.brand} ${updatedRepair.deviceInfo.model} repair is now IN PROGRESS. We'll keep you updated! - Laptop Store`;
            await sendWhatsAppNotification(whatsappNumber, message);

            toast({
              title: "Customer Notified",
              description: `${customer.name} informed that repair is in progress`,
            });
          } else if (newStatus === "approved") {
            // Notify when repair is approved
            const message = `Hi ${customer.name}, your ${updatedRepair.deviceInfo.brand} repair has been APPROVED. Estimated cost: ₹${updatedRepair.estimatedCost.toLocaleString()}. We'll start the repair shortly. - Laptop Store`;
            await sendWhatsAppNotification(whatsappNumber, message);

            toast({
              title: "Customer Notified",
              description: `${customer.name} informed about repair approval`,
            });
          } else {
            // Generic status update
            await sendWhatsAppNotification(
              whatsappNumber,
              `Hi ${customer.name}, your repair status has been updated to: ${newStatus.toUpperCase()}. We'll keep you informed! - Laptop Store`,
            );

            toast({
              title: "Status Updated",
              description: `Customer notified about status change to ${newStatus}`,
            });
          }
        } else {
          toast({
            title: "Repair Updated",
            description: `Status changed to ${newStatus}`,
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update repair status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
      setUpdateNote("");
    }
  };

  const activeRepairs = repairs.filter((r) =>
    ["received", "diagnosing", "approved", "in-progress"].includes(r.status),
  );
  const completedToday = repairs.filter(
    (r) =>
      r.status === "completed" &&
      r.actualCompletion === new Date().toISOString().split("T")[0],
  );
  const urgentRepairs = repairs.filter((r) => r.priority === "urgent");
  const overdueRepairs = repairs.filter((r) => {
    if (!r.estimatedCompletion) return false;
    return (
      new Date(r.estimatedCompletion) < new Date() &&
      !["completed", "delivered", "cancelled"].includes(r.status)
    );
  });

  const generateRepairPDF = (repair) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Repair Receipt', 14, 20);
    doc.setFontSize(12);
    doc.text(`Ticket Number: ${repair.ticketNumber || '-'}`, 14, 35);
    doc.text(`Date: ${repair.receivedDate ? new Date(repair.receivedDate).toLocaleDateString() : '-'}`, 14, 43);
    doc.text(`Customer: ${getCustomerName(repair.customerId)}`, 14, 51);
    doc.text(`Device: ${repair.deviceInfo.brand} ${repair.deviceInfo.model}`, 14, 59);
    doc.text(`Serial Number: ${repair.deviceInfo.serialNumber || '-'}`, 14, 67);
    doc.text(`Problem: ${repair.issue}`, 14, 75);
    doc.text(`Status: ${repair.status}`, 14, 83);
    doc.text(`Priority: ${repair.priority}`, 14, 91);
    doc.text(`Cost: ₹${repair.actualCost || 0}`, 14, 99);
    doc.text('Thank you for choosing our service!', 14, 120);
    doc.save(`RepairReceipt_${repair.ticketNumber || repair.id || 'receipt'}.pdf`);
  };

  const handleStatusUpdate = async () => {
    if (!selectedRepair || !updateNote) return;

    setIsUpdating(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      const updatedRepair = {
        ...selectedRepair,
        status: updateNote,
        lastUpdated: new Date().toISOString(),
      };
      
      updateRepair(updatedRepair);
      setRepairs(prev => 
        prev.map(repair => 
          repair.id === selectedRepair.id ? updatedRepair : repair
        )
      );
      
      // Refresh filtered repairs
      setFilteredRepairs(prev => 
        prev.map(repair => 
          repair.id === selectedRepair.id ? updatedRepair : repair
        )
      );
      
      toast({
        title: "Status updated",
        description: `Repair status has been updated to ${updateNote}`,
      });
      
      // Close the dialog
      setSelectedRepair(null);
      setUpdateNote("");
    } catch (error) {
      console.error("Error updating repair status:", error);
      toast({
        title: "Error",
        description: "Failed to update repair status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendUpdate = async () => {
    if (!selectedRepair || !updateMessage.trim()) return;

    setIsSendingUpdate(true);
    try {
      // Get customer details
      const customer = customers.find(c => c.id === selectedRepair.customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Prepare notification content
      const notificationContent = `🔧 Repair Update - ${selectedRepair.deviceInfo.brand} ${selectedRepair.deviceInfo.model}

${updateMessage.trim()}

Thank you for choosing our service!`;

      // Send WhatsApp notification if number is available
      if (customer.phone) {
        await sendWhatsAppNotification(customer.phone, notificationContent);
      }

      // Send email notification if email is available
      if (customer.email) {
        const templateParams = {
          to_email: customer.email,
          user_name: customer.name,
          device_name: `${selectedRepair.deviceInfo.brand} ${selectedRepair.deviceInfo.model}`,
          repair_id: selectedRepair.id,
          message: updateMessage.trim(),
          subject: `Repair Update: ${selectedRepair.deviceInfo.brand} ${selectedRepair.deviceInfo.model}`,
          reply_to: 'support@laptopstore.com',
          template_id: 'template_59o95vh'  // Using the provided template ID
        };
        
        await emailService.sendEmail(templateParams, true);
      }

      // Log the update in the repair notes
      const updatedNotes = [
        ...selectedRepair.notes,
        `Update sent to customer: ${updateMessage.trim()}`
      ];
      
      // Update the repair record
      const updatedRepair = {
        ...selectedRepair,
        notes: updatedNotes,
        lastUpdated: new Date().toISOString()
      };
      
      updateRepair(updatedRepair);
      setRepairs(prev => prev.map(r => r.id === selectedRepair.id ? updatedRepair : r));

      toast({
        title: "Update sent!",
        description: `The repair update has been sent to the customer via ${customer.email ? 'email and WhatsApp' : 'WhatsApp'}.`,
      });

      // Reset form
      setUpdateMessage("");
      setSelectedRepair(null);
    } catch (error) {
      console.error("Error sending repair update:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send update",
        variant: "destructive",
      });
    } finally {
      setIsSendingUpdate(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Repairs
            </CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeRepairs.length}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Today
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {completedToday.length}
            </div>
            <p className="text-xs text-muted-foreground">Finished repairs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Urgent Repairs
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {urgentRepairs.length}
            </div>
            <p className="text-xs text-muted-foreground">High priority</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {overdueRepairs.length}
            </div>
            <p className="text-xs text-muted-foreground">Past due date</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter Repairs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search repairs..."
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
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="diagnosing">Diagnosing</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setPriorityFilter("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Repairs Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Repairs</CardTitle>
          <CardDescription>
            Showing {filteredRepairs.length} of {repairs.length} repairs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Device & Customer</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRepairs.map((repair) => (
                <TableRow key={repair.id}>
                  <TableCell><b>{repair.ticketNumber || '-'}</b></TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {repair.deviceInfo.brand} {repair.deviceInfo.model}
                      </p>
                      <p className="text-sm text-gray-600">
                        {getCustomerName(repair.customerId)}
                      </p>
                      {repair.deviceInfo.serialNumber && (
                        <p className="text-xs text-gray-500">
                          S/N: {repair.deviceInfo.serialNumber}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm max-w-xs truncate">{repair.issue}</p>
                  </TableCell>
                  <TableCell>{getStatusBadge(repair.status)}</TableCell>
                  <TableCell>{getPriorityBadge(repair.priority)}</TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {getStoreName(repair.storeId)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      {repair.contactInfo?.whatsappNumber && (
                        <div className="flex items-center gap-1 text-green-600">
                          <MessageSquare className="w-3 h-3" />
                          {repair.contactInfo.whatsappNumber}
                        </div>
                      )}
                      {repair.contactInfo?.notificationEmail && (
                        <div className="flex items-center gap-1 text-blue-600">
                          <Mail className="w-3 h-3" />
                          {repair.contactInfo.notificationEmail.substring(
                            0,
                            20,
                          )}
                          ...
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <button
                        className="text-blue-600 hover:text-blue-900 mr-2"
                        onClick={() => generateRepairPDF(repair)}
                        title="View Repair Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedRepair(repair)}
                        title="Send Update"
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Update
                      </Button>

                      {repair.status !== "completed" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            updateRepairStatus(
                              repair.id,
                              "completed",
                              "Repair completed and ready for pickup",
                            )
                          }
                          disabled={isUpdating}
                          className="bg-green-600 hover:bg-green-700"
                          title="Mark as Complete"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Complete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredRepairs.length === 0 && (
            <div className="text-center py-12">
              <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No repairs found
              </h3>
              <p className="text-gray-600">
                Try adjusting your search criteria or filters
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
