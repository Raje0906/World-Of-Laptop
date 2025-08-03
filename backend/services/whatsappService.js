import fetch from 'node-fetch';

/**
 * Sends a WhatsApp message using Twilio API
 * @param {string} to - The recipient's phone number in E.164 format (e.g., '+1234567890')
 * @param {string} message - The message to send
 * @returns {Promise<Object>} - The API response
 */
export async function sendWhatsAppNotification(to, message) {
  try {
    console.log(`[WhatsApp] Attempting to send message to ${to}`);

    // Check if required environment variables are set
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.warn('[WhatsApp] Missing required environment variables. Message not sent.');
      return { success: false, error: 'WhatsApp service not configured' };
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;
    const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
        },
        body: new URLSearchParams({
          From: from,
          To: toNumber,
          Body: message
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('[WhatsApp] Error sending message:', data);
      return { success: false, error: data.message || 'Failed to send WhatsApp message' };
    }

    console.log(`[WhatsApp] Message sent to ${to} (SID: ${data.sid})`);
    return { success: true, sid: data.sid };
  } catch (error) {
    console.error('[WhatsApp] Exception while sending message:', error);
    return { success: false, error: error.message };
  }
}