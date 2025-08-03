import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Mail, Clock } from "lucide-react";
import { saveNotificationsToIDB, getNotificationsFromIDB } from '@/lib/dataUtils';

interface NotificationLog {
  id: string;
  type: "whatsapp" | "email";
  timestamp: string;
  recipient: string;
  subject?: string;
  message: string;
}

export function NotificationDemo() {
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);

  useEffect(() => {
    const handleWhatsAppSent = (event: any) => {
      const { phone, message, timestamp } = event.detail;
      setNotifications((prev) => [
        {
          id: `wa-${Date.now()}`,
          type: "whatsapp",
          timestamp,
          recipient: phone,
          message,
        },
        ...prev.slice(0, 9), // Keep last 10
      ]);
    };

    const handleEmailSent = (event: any) => {
      const { email, subject, message, timestamp } = event.detail;
      setNotifications((prev) => [
        {
          id: `email-${Date.now()}`,
          type: "email",
          timestamp,
          recipient: email,
          subject,
          message,
        },
        ...prev.slice(0, 9), // Keep last 10
      ]);
    };

    window.addEventListener("whatsapp-sent", handleWhatsAppSent);
    window.addEventListener("email-sent", handleEmailSent);

    return () => {
      window.removeEventListener("whatsapp-sent", handleWhatsAppSent);
      window.removeEventListener("email-sent", handleEmailSent);
    };
  }, []);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 max-h-96 z-50 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Demo Notifications Sent
        </CardTitle>
        <CardDescription className="text-xs">
          Real notifications would be delivered to customers
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="border rounded-lg p-3 text-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {notification.type === "whatsapp" ? (
                      <MessageSquare className="w-3 h-3 text-green-600" />
                    ) : (
                      <Mail className="w-3 h-3 text-blue-600" />
                    )}
                    <Badge
                      variant={
                        notification.type === "whatsapp" ? "default" : "outline"
                      }
                      className="text-xs"
                    >
                      {notification.type === "whatsapp" ? "WhatsApp" : "Email"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500">
                    <Clock className="w-3 h-3" />
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="font-medium">
                    To: {notification.recipient}
                  </div>
                  {notification.subject && (
                    <div className="text-gray-600">
                      Subject: {notification.subject}
                    </div>
                  )}
                  <div className="text-gray-700 max-h-16 overflow-hidden">
                    {notification.message.substring(0, 150)}
                    {notification.message.length > 150 && "..."}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="mt-3 p-2 bg-yellow-50 rounded text-xs text-yellow-800">
          💡 These are demo notifications. To enable real delivery, configure
          WhatsApp Business API and email service credentials.
        </div>
      </CardContent>
    </Card>
  );
}
