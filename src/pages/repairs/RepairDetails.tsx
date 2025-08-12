import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Wrench, User, Calendar, DollarSign, Phone, Mail, MapPin, Clock, AlertTriangle, CheckCircle, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

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
}

export function RepairDetails() {
  const { ticketNumber } = useParams<{ ticketNumber: string }>();
  const navigate = useNavigate();
  const [repair, setRepair] = useState<Repair | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticketNumber) {
      setError("No ticket number provided");
      setIsLoading(false);
      return;
    }

    fetchRepairDetails();
  }, [ticketNumber]);

  const fetchRepairDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

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

      const response = await fetch(`${apiUrl}/repairs/track/status?ticket=${ticketNumber}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        // Handle both array and single object responses
        const repairData = Array.isArray(data.data) ? data.data[0] : data.data;
        if (repairData) {
          setRepair(repairData);
        } else {
          throw new Error('Repair not found');
        }
      } else {
        throw new Error(data.message || 'Failed to fetch repair details');
      }
    } catch (err: any) {
      console.error('Error fetching repair details:', err);
      setError(err.message || 'Failed to load repair details');
      toast.error('Failed to load repair details');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      received: { label: 'Received', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-800' },
      diagnosed: { label: 'Diagnosed', variant: 'outline' as const, color: 'bg-blue-100 text-blue-800' },
      in_repair: { label: 'In Repair', variant: 'default' as const, color: 'bg-yellow-100 text-yellow-800' },
      ready_for_pickup: { label: 'Ready for Pickup', variant: 'default' as const, color: 'bg-green-100 text-green-800' },
      delivered: { label: 'Delivered', variant: 'default' as const, color: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Cancelled', variant: 'destructive' as const, color: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.received;
    
    return (
      <Badge variant={config.variant} className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getProgressValue = (status: string) => {
    const statusProgress = {
      received: 25,
      diagnosed: 50,
      in_repair: 75,
      ready_for_pickup: 90,
      delivered: 100,
      cancelled: 0
    };
    return statusProgress[status as keyof typeof statusProgress] || 0;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Return Back Button Skeleton */}
        <div className="flex items-center">
          <Skeleton className="h-10 w-32" />
        </div>
        
        {/* Header Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        
        {/* Content Skeleton */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !repair) {
    return (
      <div className="space-y-6">
        {/* Return Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/repairs/track')}
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-0 py-2 h-auto font-medium"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          ← Return to Track Repair
        </Button>
        
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Repair Not Found</h2>
          <p className="text-muted-foreground mb-4">
            {error || 'The repair ticket you are looking for could not be found.'}
          </p>
          <Button onClick={() => navigate('/repairs/track')}>
            Back to Track Repair
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Return Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/repairs/track')}
        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-0 py-2 h-auto font-medium focus:ring-2 focus:ring-blue-200 focus:ring-offset-2"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        ← Return to Track Repair
      </Button>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Repair Details</h1>
          {getStatusBadge(repair.status)}
        </div>
        <p className="text-muted-foreground">
          Ticket Number: {repair.ticketNumber}
        </p>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Repair Progress</span>
              <span>{getProgressValue(repair.status)}%</span>
            </div>
            <Progress value={getProgressValue(repair.status)} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium">{repair.customer.name}</h4>
              <div className="flex items-center text-sm text-muted-foreground mt-1">
                <Phone className="h-4 w-4 mr-2" />
                {repair.customer.phone}
              </div>
              <div className="flex items-center text-sm text-muted-foreground mt-1">
                <Mail className="h-4 w-4 mr-2" />
                {repair.customer.email}
              </div>
            </div>
            
            <div className="pt-2 border-t">
              <div className="flex items-start text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <div>{repair.customer.address.line1}</div>
                  {repair.customer.address.line2 && <div>{repair.customer.address.line2}</div>}
                  <div>
                    {repair.customer.address.city}, {repair.customer.address.state} {repair.customer.address.pincode}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Device Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wrench className="h-5 w-5 mr-2" />
              Device Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium">{repair.brand} {repair.model}</h4>
              <p className="text-sm text-muted-foreground">{repair.deviceType}</p>
            </div>
            
            <div className="pt-2 border-t">
              <h5 className="font-medium mb-2">Issue</h5>
              <p className="text-sm text-muted-foreground">{repair.issue}</p>
              {repair.issueDescription && (
                <p className="text-sm text-muted-foreground mt-2">{repair.issueDescription}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                <div className="flex-1">
                  <div className="font-medium">Received</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(repair.receivedDate)}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <div className="flex-1">
                  <div className="font-medium">Estimated Completion</div>
                  <div className="text-sm text-muted-foreground">
                    {repair.estimatedCompletion ? formatDate(repair.estimatedCompletion) : 'Not specified'}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cost Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Cost Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Repair Cost:</span>
                <span className="font-medium">{formatCurrency(repair.repairCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Parts Cost:</span>
                <span className="font-medium">{formatCurrency(repair.partsCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Labor Cost:</span>
                <span className="font-medium">{formatCurrency(repair.laborCost)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total Cost:</span>
                <span>{formatCurrency(repair.totalCost)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Price History */}
      {repair.priceHistory && repair.priceHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <History className="h-5 w-5 mr-2" />
              Price History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Date</th>
                    <th className="text-right py-2">Repair</th>
                    <th className="text-right py-2">Parts</th>
                    <th className="text-right py-2">Labor</th>
                    <th className="text-right py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {repair.priceHistory.map((entry, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2">
                        {formatDate(entry.updatedAt.toString())}
                      </td>
                      <td className="text-right py-2">{formatCurrency(entry.repairCost)}</td>
                      <td className="text-right py-2">{formatCurrency(entry.partsCost)}</td>
                      <td className="text-right py-2">{formatCurrency(entry.laborCost)}</td>
                      <td className="text-right py-2 font-medium">{formatCurrency(entry.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default RepairDetails; 