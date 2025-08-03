import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Mail,
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";
import { whatsappService } from "@/services/whatsappService";
import { emailService } from "@/services/emailService";

export function NotificationSetup() {
  const [whatsappStatus, setWhatsappStatus] = useState<{
    configured: boolean;
    tested?: boolean;
    error?: string;
  }>({ configured: false });

  const [emailStatus, setEmailStatus] = useState<{
    configured: boolean;
    tested?: boolean;
    error?: string;
  }>({ configured: false });

  const [isRealEnabled, setIsRealEnabled] = useState(
    import.meta.env.VITE_ENABLE_REAL_NOTIFICATIONS === "true",
  );

  const [showEnvVars, setShowEnvVars] = useState(false);

  useEffect(() => {
    checkServices();
  }, []);

  const checkServices = async () => {
    // Check WhatsApp configuration
    const hasWhatsAppKeys = !!(
      import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID &&
      import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN
    );

    setWhatsappStatus({
      configured: hasWhatsAppKeys,
    });

    // Check Email configuration
    const hasEmailKeys = !!(
      import.meta.env.VITE_SENDGRID_API_KEY ||
      import.meta.env.VITE_MAILGUN_API_KEY ||
      import.meta.env.VITE_AWS_ACCESS_KEY
    );

    setEmailStatus({
      configured: hasEmailKeys,
    });
  };

  const testWhatsApp = async () => {
    try {
      const result = await whatsappService.testConnection();
      setWhatsappStatus((prev) => ({
        ...prev,
        tested: result.success,
        error: result.error,
      }));
    } catch (error) {
      setWhatsappStatus((prev) => ({
        ...prev,
        tested: false,
        error: "Connection test failed",
      }));
    }
  };

  const testEmail = async () => {
    try {
      const result = await emailService.testConnection();
      setEmailStatus((prev) => ({
        ...prev,
        tested: result.success,
        error: result.error,
      }));
    } catch (error) {
      setEmailStatus((prev) => ({
        ...prev,
        tested: false,
        error: "Connection test failed",
      }));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const envTemplate = `# Real Notification Service Configuration
# Add these to your .env file

# WhatsApp Business API Configuration
VITE_WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
VITE_WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token_here
VITE_WHATSAPP_API_VERSION=v17.0

# Email Service Configuration (Choose one)
# Option 1: SendGrid
VITE_SENDGRID_API_KEY=your_sendgrid_api_key_here

# Option 2: Mailgun
VITE_MAILGUN_API_KEY=your_mailgun_api_key_here
VITE_MAILGUN_DOMAIN=your_mailgun_domain_here

# Store Configuration
VITE_FROM_EMAIL=noreply@laptopstore.com
VITE_FROM_NAME=Laptop Store

# Enable Real Notifications
VITE_ENABLE_REAL_NOTIFICATIONS=true
VITE_NOTIFICATION_DEBUG=false`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="fixed top-4 right-4 z-50">
          <Settings className="w-4 h-4 mr-2" />
          Notification Setup
          {!isRealEnabled && (
            <Badge variant="secondary" className="ml-2">
              Demo Mode
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Real Notification Setup
          </DialogTitle>
          <DialogDescription>
            Configure WhatsApp Business API and Email Service for real
            notification delivery
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Status */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  WhatsApp Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Configuration:</span>
                  {whatsappStatus.configured ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                </div>
                {whatsappStatus.configured && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={testWhatsApp}
                    className="w-full"
                  >
                    Test Connection
                  </Button>
                )}
                {whatsappStatus.error && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {whatsappStatus.error}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Configuration:</span>
                  {emailStatus.configured ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                </div>
                {emailStatus.configured && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={testEmail}
                    className="w-full"
                  >
                    Test Connection
                  </Button>
                )}
                {emailStatus.error && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {emailStatus.error}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Setup Instructions */}
          <Tabs defaultValue="whatsapp" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="whatsapp">WhatsApp Setup</TabsTrigger>
              <TabsTrigger value="email">Email Setup</TabsTrigger>
              <TabsTrigger value="env">Environment</TabsTrigger>
            </TabsList>

            <TabsContent value="whatsapp" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    WhatsApp Business API Setup
                  </CardTitle>
                  <CardDescription>
                    Get API credentials from Meta for Business
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Step 1: Create Facebook App</h4>
                    <p className="text-sm text-gray-600">
                      Go to{" "}
                      <a
                        href="https://developers.facebook.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        Facebook for Developers
                        <ExternalLink className="w-3 h-3" />
                      </a>{" "}
                      and create a new app with WhatsApp Business API
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">
                      Step 2: Get Phone Number ID & Access Token
                    </h4>
                    <p className="text-sm text-gray-600">
                      From your WhatsApp Business API setup, copy:
                    </p>
                    <ul className="text-sm text-gray-600 list-disc list-inside ml-4">
                      <li>Phone Number ID (from WhatsApp Business Account)</li>
                      <li>Permanent Access Token (from App Settings)</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Step 3: Verify Webhook</h4>
                    <p className="text-sm text-gray-600">
                      Set up webhook URL for message delivery status (optional
                      for basic sending)
                    </p>
                  </div>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      <strong>Important:</strong> WhatsApp Business API requires
                      business verification and may have costs. Test numbers are
                      available for development.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="email" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Email Service Setup</CardTitle>
                  <CardDescription>
                    Choose one email provider and get API credentials
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="font-medium">
                      Option 1: SendGrid (Recommended)
                    </h4>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-800 mb-2">
                        Free tier: 100 emails/day forever
                      </p>
                      <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
                        <li>
                          Sign up at{" "}
                          <a
                            href="https://sendgrid.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            sendgrid.com
                          </a>
                        </li>
                        <li>Go to Settings → API Keys</li>
                        <li>Create new API key with "Mail Send" permissions</li>
                        <li>Copy the API key to your .env file</li>
                      </ol>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Option 2: Mailgun</h4>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-sm text-green-800 mb-2">
                        Free tier: 5,000 emails for 3 months
                      </p>
                      <ol className="text-sm text-green-700 list-decimal list-inside space-y-1">
                        <li>
                          Sign up at{" "}
                          <a
                            href="https://mailgun.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            mailgun.com
                          </a>
                        </li>
                        <li>Add and verify your domain</li>
                        <li>Get API key from Settings → API Keys</li>
                        <li>Copy domain and API key to .env file</li>
                      </ol>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Option 3: AWS SES</h4>
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <p className="text-sm text-orange-800 mb-2">
                        Very low cost, requires AWS account
                      </p>
                      <ol className="text-sm text-orange-700 list-decimal list-inside space-y-1">
                        <li>Set up AWS SES in your AWS account</li>
                        <li>Verify your domain/email</li>
                        <li>Create IAM user with SES permissions</li>
                        <li>Use access key/secret in .env file</li>
                      </ol>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="env" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Environment Variables
                  </CardTitle>
                  <CardDescription>
                    Add these to your .env file to enable real notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Environment Template</h4>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowEnvVars(!showEnvVars)}
                      >
                        {showEnvVars ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(envTemplate)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-xs overflow-x-auto">
                      {showEnvVars
                        ? envTemplate
                        : envTemplate.replace(/your_[a-z_]+_here/g, "***")}
                    </pre>
                  </div>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      <strong>Security Note:</strong> Never commit .env files to
                      version control. Add .env to your .gitignore file.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <h4 className="font-medium">After adding .env file:</h4>
                    <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1">
                      <li>Save the .env file in your project root</li>
                      <li>Restart your development server</li>
                      <li>Set VITE_ENABLE_REAL_NOTIFICATIONS=true</li>
                      <li>Test the connections using buttons above</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Status Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Real Notifications:</span>
                  <Badge variant={isRealEnabled ? "default" : "secondary"}>
                    {isRealEnabled ? "Enabled" : "Demo Mode"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>WhatsApp Ready:</span>
                  <Badge
                    variant={
                      whatsappStatus.configured ? "default" : "destructive"
                    }
                  >
                    {whatsappStatus.configured ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Email Ready:</span>
                  <Badge
                    variant={emailStatus.configured ? "default" : "destructive"}
                  >
                    {emailStatus.configured ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
