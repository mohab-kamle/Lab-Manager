const { parsePhoneNumberFromString } = require('libphonenumber-js');
const SessionManager = require('../sessionManager');

class WebProvider {
  /**
   * Initializes the Baileys socket for a given lab.
   */
  static async connect(labId, onQrCallback, onConnectedCallback, onDisconnectedCallback) {
    // freshStart=true clears old auth data so a new QR code is generated
    await SessionManager.initSession(labId, onQrCallback, onConnectedCallback, onDisconnectedCallback, true);
  }

  /**
   * Gets the current status of the WhatsApp connection.
   */
  static getStatus(labId) {
    return SessionManager.getStatus(labId);
  }

  /**
   * Sends a document (PDF) to a specified phone number.
   */
  static async sendDocument(labId, phone, pdfBuffer, caption = "Lab Report") {
    let sock = SessionManager.getSession(labId);
    
    // If no active session, try to restore from saved auth (handles server restarts)
    if (!sock) {
      console.log(`[WebProvider] No active session for lab ${labId}, attempting restore...`);
      const restored = await SessionManager.restoreSession(labId);
      if (restored) {
        sock = SessionManager.getSession(labId);
      }
    }

    if (!sock) {
      throw new Error("WhatsApp is not connected. Please connect it first in the settings.");
    }

    // Format phone number to JID (Jabber ID used by WhatsApp)
    // We use libphonenumber-js for robust international formatting
    let jid;
    try {
      let phoneNumber = parsePhoneNumberFromString(phone);
      // Fallback to EG (Egypt) if no country code or invalid as international
      if (!phoneNumber || !phoneNumber.isValid()) {
        phoneNumber = parsePhoneNumberFromString(phone, 'EG');
      }

      if (phoneNumber && phoneNumber.isValid()) {
        const countryCode = phoneNumber.countryCallingCode;
        const nationalNumber = phoneNumber.nationalNumber;
        jid = `${countryCode}${nationalNumber}@s.whatsapp.net`;
        console.log(`[WebProvider] Formatted phone ${phone} to JID: ${jid} (Country: ${phoneNumber.country})`);
      } else {
        // Final fallback to numeric only
        const formattedPhone = phone.replace(/\D/g, '');
        jid = `${formattedPhone}@s.whatsapp.net`;
        console.warn(`[WebProvider] Phone ${phone} is not valid, using fallback JID: ${jid}`);
      }
    } catch (err) {
      const formattedPhone = phone.replace(/\D/g, '');
      jid = `${formattedPhone}@s.whatsapp.net`;
      console.error(`[WebProvider] Error formatting phone ${phone}:`, err.message);
    }

    // Ensure the ID exists on WhatsApp
    console.log(`[WebProvider] Checking registration for JID: ${jid}...`);
    const [result] = await sock.onWhatsApp(jid);
    
    if (!result || !result.exists) {
      console.error(`[WebProvider] Registration check failed for ${jid}. Result:`, result);
      throw new Error(`Phone number ${phone} is not registered on WhatsApp.`);
    }

    console.log(`[WebProvider] Registration confirmed for ${jid}. Sending document...`);

    const messageContent = {
      document: pdfBuffer,
      mimetype: 'application/pdf',
      fileName: 'Medical_Report.pdf',
      caption: caption
    };

    const sentMsg = await sock.sendMessage(result.jid, messageContent);
    return sentMsg;
  }

  /**
   * Sends a text message to a specified phone number.
   */
  static async sendText(labId, phone, text) {
    let sock = SessionManager.getSession(labId);
    
    // If no active session, try to restore from saved auth (handles server restarts)
    if (!sock) {
      const restored = await SessionManager.restoreSession(labId);
      if (restored) {
        sock = SessionManager.getSession(labId);
      }
    }

    if (!sock) {
      throw new Error("WhatsApp is not connected. Please connect it first in the settings.");
    }

    let jid;
    try {
      let phoneNumber = parsePhoneNumberFromString(phone);
      if (!phoneNumber || !phoneNumber.isValid()) {
        phoneNumber = parsePhoneNumberFromString(phone, 'EG');
      }

      if (phoneNumber && phoneNumber.isValid()) {
        jid = `${phoneNumber.countryCallingCode}${phoneNumber.nationalNumber}@s.whatsapp.net`;
      } else {
        const formattedPhone = phone.replace(/\D/g, '');
        jid = `${formattedPhone}@s.whatsapp.net`;
      }
    } catch (err) {
      const formattedPhone = phone.replace(/\D/g, '');
      jid = `${formattedPhone}@s.whatsapp.net`;
    }

    const [result] = await sock.onWhatsApp(jid);
    if (!result || !result.exists) {
      throw new Error(`Phone number ${phone} is not registered on WhatsApp.`);
    }

    const sentMsg = await sock.sendMessage(result.jid, { text: text });
    return sentMsg;
  }
}

module.exports = WebProvider;
