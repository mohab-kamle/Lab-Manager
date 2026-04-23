const db = require('../../models');
const WebProvider = require('./providers/web');
const MetaProvider = require('./providers/meta');

class WhatsAppService {
  /**
   * Determine provider for a given lab
   */
  static async getProvider(labId) {
    const account = await db.lab_whatsapp_account.findOne({ where: { lab_id: labId } });
    if (!account) {
      // Default to web provider if no configuration exists
      return { type: 'web', implementation: WebProvider };
    }
    
    if (account.provider === 'meta') {
      return { type: 'meta', implementation: MetaProvider };
    }
    
    return { type: 'web', implementation: WebProvider };
  }

  /**
   * Connect to WhatsApp service
   * Specific to WebProvider mostly, as Meta handles connection externally
   */
  static async connect(labId, onQrCallback, onConnectedCallback, onDisconnectedCallback) {
    const provider = await this.getProvider(labId);
    
    if (provider.type === 'web') {
      await provider.implementation.connect(labId, onQrCallback, onConnectedCallback, onDisconnectedCallback);
      return { provider: 'web', status: 'initializing' };
    } else {
      return { provider: 'meta', status: provider.implementation.getStatus(labId) };
    }
  }

  /**
   * Get Connection Status
   */
  static async getStatus(labId) {
    const provider = await this.getProvider(labId);
    return {
      provider: provider.type,
      status: provider.implementation.getStatus(labId)
    };
  }

  /**
   * Send a Lab Report Document
   * @param {string|number} labId
   * @param {string|number} patientId
   * @param {string} phone
   * @param {Buffer} pdfBuffer
   * @param {string} caption - Custom message to accompany the PDF
   */
  static async sendReport(labId, patientId, phone, pdfBuffer, caption = "Your Lab Report") {
    const provider = await this.getProvider(labId);
    
    let status = 'pending';
    let errorMessage = null;
    
    try {
      await provider.implementation.sendDocument(labId, phone, pdfBuffer, caption);
      status = 'sent';
    } catch (error) {
      status = 'failed';
      errorMessage = error.message;
      throw error;
    } finally {
      // Log message to database
      await db.whatsapp_message.create({
        lab_id: labId,
        patient_id: patientId || null,
        phone_number: phone,
        message_type: 'document',
        status: status,
        error: errorMessage
      });
    }
    
    return { success: status === 'sent', error: errorMessage };
  }
}

module.exports = WhatsAppService;
