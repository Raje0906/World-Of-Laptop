import { Customer, Repair, Store } from "@/types";
import { emailService } from './emailService';

interface NotificationConfig {
  whatsapp: {
    enabled: boolean;
    phoneNumberId: string;
    accessToken: string;
    apiVersion: string;
  };
  email: {
    enabled: boolean;
    provider: "sendgrid" | "mailgun" | "aws-ses";
    apiKey: string;
    fromEmail: string;
    fromName: string;
    domain?: string; // for Mailgun
    region?: string; // for AWS
  };
  store: {
    name: string;
    website: string;
    supportEmail: string;
    supportPhone: string;
  };
}

class RealNotificationService {
  private config: NotificationConfig;
  private isProduction: boolean;

  constructor() {
    // Use process.env for Node.js environment
    this.isProduction = process.env.NODE_ENV === 'production' || 
      process.env.ENABLE_REAL_NOTIFICATIONS === 'true';

    // Initialize config with basic structure first
    this.config = {
      whatsapp: {
        enabled: false,
        phoneNumberId: "",
        accessToken: "",
        apiVersion: "v18.0",
      },
      email: {
        enabled: false,
        provider: "sendgrid",
        apiKey: "",
        fromEmail: "noreply@laptopstore.com",
        fromName: "Laptop Store",
        domain: "",
        region: "us-east-1",
      },
      store: {
        name: "Laptop Store",
        website: "https://laptopstore.com",
        supportEmail: "support@laptopstore.com",
        supportPhone: "+91 98765 43210",
      },
    };

    // Then set the actual values
    this.config.whatsapp = {
      enabled: !!(
        import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID &&
        import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN
      ),
      phoneNumberId: import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID || "",
      accessToken: import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN || "",
      apiVersion: import.meta.env.VITE_WHATSAPP_API_VERSION || "v18.0",
    };

    // Determine provider first, then set email config
    const emailProvider = this.determineEmailProvider();
    this.config.email = {
      enabled: !!(
        import.meta.env.VITE_SENDGRID_API_KEY ||
        import.meta.env.VITE_MAILGUN_API_KEY ||
        import.meta.env.VITE_AWS_ACCESS_KEY
      ),
      provider: emailProvider,
      apiKey: this.getEmailApiKey(),
      fromEmail: import.meta.env.VITE_FROM_EMAIL || "noreply@laptopstore.com",
      fromName: import.meta.env.VITE_FROM_NAME || "Laptop Store",
      domain: import.meta.env.VITE_MAILGUN_DOMAIN || "",
      region: import.meta.env.VITE_AWS_REGION || "us-east-1",
    };

    this.config.store = {
      name: import.meta.env.VITE_STORE_NAME || "Laptop Store",
      website: import.meta.env.VITE_STORE_WEBSITE || "https://laptopstore.com",
      supportEmail: import.meta.env.VITE_STORE_SUPPORT_EMAIL || "support@laptopstore.com",
      supportPhone: import.meta.env.VITE_STORE_SUPPORT_PHONE || "+91 98765 43210",
    };
  }

  private determineEmailProvider(): "sendgrid" | "mailgun" | "aws-ses" {
    if (import.meta.env.VITE_SENDGRID_API_KEY) return "sendgrid";
    if (import.meta.env.VITE_MAILGUN_API_KEY) return "mailgun";
    if (import.meta.env.VITE_AWS_ACCESS_KEY) return "aws-ses";
    return "sendgrid";
  }

  private getEmailApiKey(): string {
    switch (this.config.email.provider) {
      case "sendgrid":
        return import.meta.env.VITE_SENDGRID_API_KEY || "";
      case "mailgun":
        return import.meta.env.VITE_MAILGUN_API_KEY || "";
      case "aws-ses":
        return import.meta.env.VITE_AWS_ACCESS_KEY || "";
      default:
        return "";
    }
  }

  // Real WhatsApp sending via API
  async sendWhatsAppMessage(
    phone: string,
    message: string,
  ): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    if (!this.isProduction || !this.config.whatsapp.enabled) {
      return this.simulateWhatsApp(phone, message);
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      const url = `https://graph.facebook.com/${this.config.whatsapp.apiVersion}/${this.config.whatsapp.phoneNumberId}/messages`;

      const payload = {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "text",
        text: { body: message },
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.whatsapp.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error:
            errorData.error?.message ||
            `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        messageId: data.messages?.[0]?.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Real Email sending via configured provider
  async sendEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    // Use emailjs frontend service instead of backend providers
    try {
      const templateParams = {
        to_email: to,
        subject,
        html,
        user_name: '', // You may want to pass more params as needed
        device_name: '',
        issue_description: '',
        repair_id: '',
        estimated_date: '',
      };
      const result = await emailService.sendEmail(templateParams);
      return { success: result.success, messageId: result.messageId };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // SendGrid implementation
  private async sendViaSendGrid(to: string, subject: string, html: string) {
    const payload = {
      personalizations: [{ to: [{ email: to }] }],
      from: {
        email: this.config.email.fromEmail,
        name: this.config.email.fromName,
      },
      subject,
      content: [{ type: "text/html", value: html }],
    };

    const response = await fetch("https://api.sendgrid.v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.email.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.errors?.[0]?.message || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      messageId: response.headers.get("x-message-id") || undefined,
    };
  }

  // Mailgun implementation
  private async sendViaMailgun(to: string, subject: string, html: string) {
    if (!this.config.email.domain) {
      return { success: false, error: "Mailgun domain not configured" };
    }

    const formData = new FormData();
    formData.append(
      "from",
      `${this.config.email.fromName} <${this.config.email.fromEmail}>`,
    );
    formData.append("to", to);
    formData.append("subject", subject);
    formData.append("html", html);

    const response = await fetch(
      `https://api.mailgun.net/v3/${this.config.email.domain}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`api:${this.config.email.apiKey}`)}`,
        },
        body: formData,
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return { success: true, messageId: data.id };
  }

  // AWS SES implementation (simplified)
  private async sendViaAWSSES(to: string, subject: string, _html: string) {
    // Note: This requires proper AWS SDK implementation for production
    console.log("AWS SES would send:", { to, subject });
    return { success: true, messageId: `aws-ses-${Date.now()}` };
  }

  // Utility functions
  private formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, "");
    if (!cleaned.startsWith("91") && cleaned.length === 10) {
      return "91" + cleaned;
    }
    return cleaned.startsWith("91") ? cleaned : "91" + cleaned;
  }

  // Simulation methods for demo mode
  private simulateWhatsApp(phone: string, message: string) {
    console.log(
      `📱 DEMO WhatsApp to ${phone}:`,
      message.substring(0, 100) + "...",
    );
    return Promise.resolve({
      success: true,
      messageId: `demo-wa-${Date.now()}`,
    });
  }

  private simulateEmail(to: string, subject: string, _html: string) {
    console.log(`📧 DEMO Email to ${to}:`, subject);
    return Promise.resolve({
      success: true,
      messageId: `demo-email-${Date.now()}`,
    });
  }

  // High-level methods for repair notifications
  async sendRepairCompletionNotifications(
    repair: Repair,
    customer: Customer,
    store: Store,
  ): Promise<{
    whatsapp: { success: boolean; messageId?: string; error?: string };
    email: { success: boolean; messageId?: string; error?: string };
  }> {
    const whatsappNumber = repair.contactInfo?.whatsappNumber || customer.phone;
    const emailAddress =
      repair.contactInfo?.notificationEmail || customer.email;

    // Generate WhatsApp message
    const whatsappMessage = this.generateCompletionWhatsAppMessage(
      repair,
      customer,
      store,
    );

    // Generate Email HTML
    const emailHtml = this.generateCompletionEmailHTML(repair, customer, store);
    const emailSubject = `✅ Device Ready for Pickup - ${repair.deviceInfo.brand} ${repair.deviceInfo.model}`;

    // Send both notifications in parallel
    const [whatsappResult, emailResult] = await Promise.all([
      this.sendWhatsAppMessage(whatsappNumber, whatsappMessage),
      emailService.sendEmail({
        user_name: customer.name,
        device_name: repair.deviceInfo.brand + ' ' + repair.deviceInfo.model,
        issue_description: repair.issue,
        repair_id: repair.id,
        estimated_date: repair.estimatedCompletion,
        to_email: emailAddress,
        html: emailHtml,
        subject: emailSubject,
      }),
    ]);

    return {
      whatsapp: whatsappResult,
      email: emailResult,
    };
  }

  private generateCompletionWhatsAppMessage(
    repair: Repair,
    customer: Customer,
    store: Store,
  ): string {
    return `🎉 Great news ${customer.name}! 

Your ${repair.deviceInfo.brand} ${repair.deviceInfo.model} repair is COMPLETE! ✅

📋 Repair Details:
• Issue: ${repair.issue}
• Total Cost: ₹${repair.actualCost.toLocaleString()}
• Completion Date: ${new Date().toLocaleDateString()}

📍 Pickup Location:
${store.name}
${store.address}
📞 ${store.phone}

⏰ Store Hours: Mon-Sat 10AM-8PM, Sun 11AM-6PM

Please bring a valid ID for pickup. Thank you for choosing ${this.config.store.name}! 🙏

${import.meta.env.VITE_WHATSAPP_OPT_OUT_MESSAGE || "Reply STOP to opt out"}`;
  }

  private generateCompletionEmailHTML(
    repair: Repair,
    customer: Customer,
    store: Store,
  ): string {
    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0; font-size: 32px; font-weight: bold;">🎉 Your Device is Ready!</h1>
          <p style="margin: 15px 0 0 0; font-size: 18px; opacity: 0.9;">Repair completed successfully</p>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 40px 30px; background: white;">
          <p style="font-size: 18px; color: #374151; margin-bottom: 25px; line-height: 1.6;">
            Dear <strong>${customer.name}</strong>,
          </p>
          
          <p style="font-size: 16px; color: #374151; line-height: 1.7; margin-bottom: 30px;">
            Excellent news! Your <strong>${repair.deviceInfo.brand} ${repair.deviceInfo.model}</strong> 
            has been successfully repaired and is ready for pickup.
          </p>
          
          <!-- Repair Summary -->
          <div style="background: #f0f9ff; padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 5px solid #3b82f6;">
            <h3 style="color: #1e40af; margin: 0 0 20px 0; font-size: 20px; font-weight: bold;">📋 Repair Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #4b5563; font-weight: 500;"><strong>Issue:</strong></td><td style="padding: 8px 0; color: #374151;">${repair.issue}</td></tr>
              <tr><td style="padding: 8px 0; color: #4b5563; font-weight: 500;"><strong>Solution:</strong></td><td style="padding: 8px 0; color: #374151;">${repair.diagnosis}</td></tr>
              <tr><td style="padding: 8px 0; color: #4b5563; font-weight: 500;"><strong>Final Cost:</strong></td><td style="padding: 8px 0; color: #374151; font-weight: bold; font-size: 18px;">₹${repair.actualCost.toLocaleString()}</td></tr>
              <tr><td style="padding: 8px 0; color: #4b5563; font-weight: 500;"><strong>Completed:</strong></td><td style="padding: 8px 0; color: #374151;">${new Date().toLocaleDateString()}</td></tr>
              <tr><td style="padding: 8px 0; color: #4b5563; font-weight: 500;"><strong>Repair ID:</strong></td><td style="padding: 8px 0; color: #374151; font-family: 'Courier New', monospace; background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${repair.id}</td></tr>
            </table>
          </div>
          
          <!-- Pickup Information -->
          <div style="background: #fef3c7; padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 5px solid #f59e0b;">
            <h3 style="color: #d97706; margin: 0 0 20px 0; font-size: 20px; font-weight: bold;">📍 Pickup Information</h3>
            <div style="color: #92400e;">
              <p style="margin: 0 0 12px 0; font-weight: bold; font-size: 18px;">${store.name}</p>
              <p style="margin: 0 0 12px 0; line-height: 1.5;">${store.address}</p>
              <p style="margin: 0 0 20px 0; font-weight: 600;">📞 ${store.phone}</p>
              
              <div style="background: white; padding: 15px; border-radius: 8px; margin-top: 15px;">
                <p style="margin: 0 0 8px 0; font-weight: bold; color: #92400e;">🕒 Store Hours:</p>
                <p style="margin: 0; line-height: 1.6; color: #92400e;">
                  <strong>Monday - Saturday:</strong> 10:00 AM - 8:00 PM<br>
                  <strong>Sunday:</strong> 11:00 AM - 6:00 PM
                </p>
              </div>
            </div>
          </div>
          
          <!-- Important Notice -->
          <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; margin: 30px 0; border-left: 5px solid #6b7280;">
            <p style="margin: 0; color: #374151; font-weight: bold; font-size: 16px;">🆔 Important: Please bring valid photo ID for device pickup</p>
          </div>
          
          <!-- Call to Action -->
          <div style="text-align: center; margin: 40px 0;">
            <a href="tel:${store.phone}" style="display: inline-block; background: #3b82f6; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">📞 Call Store Now</a>
          </div>
          
          <p style="font-size: 16px; color: #374151; line-height: 1.7; margin-top: 30px;">
            Your device has been quality-checked and is ready for pickup. 
            Thank you for choosing <strong>${this.config.store.name}</strong> for your repair needs!
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #f9fafb; padding: 25px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
            Best regards,<br>
            <strong style="color: #374151;">${this.config.store.name} Team</strong>
          </p>
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            ${this.config.store.website} | ${this.config.store.supportEmail} | ${this.config.store.supportPhone}
          </p>
        </div>
      </div>
    `;
  }

  // Status check methods
  getServiceStatus() {
    return {
      isProduction: this.isProduction,
      whatsapp: {
        enabled: this.config.whatsapp.enabled,
        configured: !!(
          this.config.whatsapp.phoneNumberId && this.config.whatsapp.accessToken
        ),
      },
      email: {
        enabled: this.config.email.enabled,
        provider: this.config.email.provider,
        configured: !!this.config.email.apiKey,
      },
    };
  }
}

// Export singleton instance
export const realNotificationService = new RealNotificationService();
