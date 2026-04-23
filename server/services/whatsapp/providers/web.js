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
    // Remove '+' and leading zeros
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('00')) formattedPhone = formattedPhone.substring(2);
    const jid = `${formattedPhone}@s.whatsapp.net`;

    // Ensure the ID exists on WhatsApp
    const [result] = await sock.onWhatsApp(jid);
    if (!result || !result.exists) {
      throw new Error(`Phone number ${phone} is not registered on WhatsApp.`);
    }

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

    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('00')) formattedPhone = formattedPhone.substring(2);
    const jid = `${formattedPhone}@s.whatsapp.net`;

    const [result] = await sock.onWhatsApp(jid);
    if (!result || !result.exists) {
      throw new Error(`Phone number ${phone} is not registered on WhatsApp.`);
    }

    const sentMsg = await sock.sendMessage(result.jid, { text: text });
    return sentMsg;
  }
}

module.exports = WebProvider;
