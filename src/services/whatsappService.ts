interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  apiVersion: string;
}

interface WhatsAppTextMessage {
  messaging_product: "whatsapp";
  to: string;
  type: "text";
  text: {
    body: string;
  };
}

interface WhatsAppTemplateMessage {
  messaging_product: "whatsapp";
  to: string;
  type: "template";
  template: {
    name: string;
    language: {
      code: string;
    };
    components: Array<{
      type: string;
      parameters: Array<{
        type: string;
        text: string;
      }>;
    }>;
  };
}

class WhatsAppService {
  private config: WhatsAppConfig;
  private baseUrl: string;

  constructor() {
    this.config = {
      phoneNumberId: import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID || "",
      accessToken: import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN || "",
      apiVersion: import.meta.env.VITE_WHATSAPP_API_VERSION || "v17.0",
    };

    this.baseUrl = `https://graph.facebook.com/${this.config.apiVersion}/${this.config.phoneNumberId}/messages`;
  }

  private isConfigured(): boolean {
    return !!(this.config.phoneNumberId && this.config.accessToken);
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, "");

    // Add country code if not present (assuming India +91)
    if (!cleaned.startsWith("91") && cleaned.length === 10) {
      return "91" + cleaned;
    }

    // Remove leading + if present
    return cleaned.startsWith("91") ? cleaned : "91" + cleaned;
  }

  async sendTextMessage(
    phone: string,
    message: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured()) {
      console.warn(
        "WhatsApp API not configured. Please add VITE_WHATSAPP_PHONE_NUMBER_ID and VITE_WHATSAPP_ACCESS_TOKEN to your .env file",
      );
      return { success: false, error: "WhatsApp API not configured" };
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phone);

      const payload: WhatsAppTextMessage = {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "text",
        text: {
          body: message,
        },
      };

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("WhatsApp API Error:", errorData);
        return {
          success: false,
          error:
            errorData.error?.message ||
            `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      console.log("✅ WhatsApp message sent successfully:", data);

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
      };
    } catch (error) {
      console.error("WhatsApp send error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async sendRepairCompletionMessage(
    phone: string,
    customerName: string,
    deviceBrand: string,
    deviceModel: string,
    repairCost: number,
    storeName: string,
    storeAddress: string,
    storePhone: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = `🎉 Great news ${customerName}! 

Your ${deviceBrand} ${deviceModel} repair is COMPLETE! ✅

📋 Repair Details:
• Total Cost: ₹${repairCost.toLocaleString()}
• Completion Date: ${new Date().toLocaleDateString()}

📍 Pickup Location:
${storeName}
${storeAddress}
📞 ${storePhone}

⏰ Store Hours: Mon-Sat 10AM-8PM, Sun 11AM-6PM

Please bring a valid ID for pickup. Thank you for choosing Laptop Store! 🙏

Reply STOP to opt out.`;

    return this.sendTextMessage(phone, message);
  }

  async sendRepairStatusUpdate(
    phone: string,
    customerName: string,
    deviceBrand: string,
    deviceModel: string,
    newStatus: string,
    estimatedCompletion?: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = `Hi ${customerName}, 

📱 ${deviceBrand} ${deviceModel} Update

🔧 Status: ${newStatus.toUpperCase()}

${estimatedCompletion ? `📅 Expected completion: ${new Date(estimatedCompletion).toLocaleDateString()}` : ""}

📞 Questions? Call us
🆔 Repair tracking available

- Laptop Store

Reply STOP to opt out.`;

    return this.sendTextMessage(phone, message);
  }

  // Health check method
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: "WhatsApp API not configured" };
    }

    try {
      // Test with a simple API call to check business profile
      const testUrl = `https://graph.facebook.com/${this.config.apiVersion}/${this.config.phoneNumberId}`;
      const response = await fetch(testUrl, {
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
        },
      });

      if (response.ok) {
        return { success: true };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error?.message || "API test failed",
        };
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Connection test failed",
      };
    }
  }
}

export const whatsappService = new WhatsAppService();
