import { Customer, Repair, Store } from "@/types";
import { sendWhatsAppNotification, sendEmailNotification } from "./dataUtils";

export interface NotificationResult {
  success: boolean;
  message: string;
  channels: {
    whatsapp: boolean;
    email: boolean;
  };
}

export const sendRepairCompletionNotification = async (
  repair: Repair,
  customer: Customer,
  store?: Store,
): Promise<NotificationResult> => {
  try {
    const result: NotificationResult = {
      success: false,
      message: "",
      channels: { whatsapp: false, email: false },
    };

    // Enhanced WhatsApp message for completion
    const whatsappMessage = `🎉 REPAIR COMPLETE! 

Hi ${customer.name}, great news! Your ${repair.deviceInfo.brand} ${repair.deviceInfo.model} repair is DONE! ✅

📋 Repair Summary:
• Issue: ${repair.issue}
• Final Cost: ₹${repair.actualCost.toLocaleString()}
• Completed: ${new Date().toLocaleDateString()}
• Repair ID: ${repair.id}

📍 PICKUP DETAILS:
${store?.name || "Laptop Store"}
${store?.address || "Store Address"}
📞 ${store?.phone || "Contact Store"}

⏰ Store Hours:
Mon-Sat: 10AM-8PM
Sun: 11AM-6PM

🆔 Please bring valid ID for pickup
💯 Quality checked & ready!

Thank you for choosing Laptop Store! 🙏`;

    // Enhanced email content for completion
    const emailSubject = `✅ Device Ready for Pickup - ${repair.deviceInfo.brand} ${repair.deviceInfo.model}`;
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🎉 Your Device is Ready!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Repair completed successfully</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Dear ${customer.name},</p>
          
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Excellent news! Your <strong>${repair.deviceInfo.brand} ${repair.deviceInfo.model}</strong> 
            has been successfully repaired and is ready for pickup.
          </p>
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #3b82f6;">
            <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">📋 Repair Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 5px 0; color: #4b5563;"><strong>Issue:</strong></td><td style="padding: 5px 0; color: #374151;">${repair.issue}</td></tr>
              <tr><td style="padding: 5px 0; color: #4b5563;"><strong>Solution:</strong></td><td style="padding: 5px 0; color: #374151;">${repair.diagnosis}</td></tr>
              <tr><td style="padding: 5px 0; color: #4b5563;"><strong>Final Cost:</strong></td><td style="padding: 5px 0; color: #374151; font-weight: bold;">₹${repair.actualCost.toLocaleString()}</td></tr>
              <tr><td style="padding: 5px 0; color: #4b5563;"><strong>Completed:</strong></td><td style="padding: 5px 0; color: #374151;">${new Date().toLocaleDateString()}</td></tr>
              <tr><td style="padding: 5px 0; color: #4b5563;"><strong>Repair ID:</strong></td><td style="padding: 5px 0; color: #374151; font-family: monospace;">${repair.id}</td></tr>
            </table>
          </div>
          
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
            <h3 style="color: #d97706; margin: 0 0 15px 0; font-size: 18px;">📍 Pickup Information</h3>
            <div style="color: #92400e;">
              <p style="margin: 0 0 10px 0; font-weight: bold; font-size: 16px;">${store?.name || "Laptop Store"}</p>
              <p style="margin: 0 0 10px 0;">${store?.address || "Store Address"}</p>
              <p style="margin: 0 0 15px 0;">📞 ${store?.phone || "Contact Store"}</p>
              
              <div style="margin-top: 15px;">
                <p style="margin: 0 0 5px 0; font-weight: bold;">Store Hours:</p>
                <p style="margin: 0; line-height: 1.4;">
                  Monday - Saturday: 10:00 AM - 8:00 PM<br>
                  Sunday: 11:00 AM - 6:00 PM
                </p>
              </div>
            </div>
          </div>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 25px 0;">
            <p style="margin: 0; color: #374151; font-weight: bold;">🆔 Please bring valid photo ID for device pickup</p>
          </div>
          
          <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-top: 25px;">
            Your device has been quality-checked and is ready for pickup. 
            Thank you for choosing Laptop Store for your repair needs!
          </p>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            Best regards,<br>
            <strong>The Laptop Store Team</strong>
          </p>
        </div>
      </div>
    `;

    // Send WhatsApp notification
    try {
      await sendWhatsAppNotification(customer.phone, whatsappMessage);
      result.channels.whatsapp = true;
    } catch (error) {
      console.error("WhatsApp notification failed:", error);
    }

    // Send email notification
    try {
      await sendEmailNotification(customer.email, emailSubject, emailContent);
      result.channels.email = true;
    } catch (error) {
      console.error("Email notification failed:", error);
    }

    // Determine overall success
    result.success = result.channels.whatsapp || result.channels.email;

    if (result.success) {
      const channels = [];
      if (result.channels.whatsapp) channels.push("WhatsApp");
      if (result.channels.email) channels.push("Email");
      result.message = `Customer notified via ${channels.join(" and ")}`;
    } else {
      result.message = "Failed to send notifications";
    }

    return result;
  } catch (error) {
    console.error("Notification service error:", error);
    return {
      success: false,
      message: "Notification system error",
      channels: { whatsapp: false, email: false },
    };
  }
};

export const sendRepairStatusNotification = async (
  repair: Repair,
  customer: Customer,
  store?: Store,
): Promise<NotificationResult> => {
  try {
    const statusMessages: Record<string, string> = {
      received: "We've received your device and will begin diagnosis shortly.",
      diagnosing: "Our technicians are currently diagnosing the issue.",
      approved: `Repair approved! Estimated cost: ₹${repair.estimatedCost.toLocaleString()}. We'll start the repair process.`,
      "in-progress": "Great news! Your repair is now in progress.",
      cancelled: "Your repair has been cancelled as requested.",
      delivered: "Thank you! Your device has been marked as delivered.",
    };

    const message =
      statusMessages[repair.status] || `Status updated to: ${repair.status}`;

    const whatsappMessage = `Hi ${customer.name}, 

📱 ${repair.deviceInfo.brand} ${repair.deviceInfo.model} Update

🔧 ${message}

${repair.estimatedCompletion ? `📅 Expected completion: ${new Date(repair.estimatedCompletion).toLocaleDateString()}` : ""}

📞 Questions? Call ${store?.phone || "us"}
🆔 Repair ID: ${repair.id}

- ${store?.name || "Laptop Store"}`;

    await sendWhatsAppNotification(customer.phone, whatsappMessage);

    return {
      success: true,
      message: "Status update sent to customer",
      channels: { whatsapp: true, email: false },
    };
  } catch (error) {
    console.error("Status notification error:", error);
    return {
      success: false,
      message: "Failed to send status update",
      channels: { whatsapp: false, email: false },
    };
  }
};
