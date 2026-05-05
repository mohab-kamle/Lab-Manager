const db = require('../../models');
const WebProvider = require('./providers/web');
const MetaProvider = require('./providers/meta');

class WhatsAppService {
  /**
   * Determine the best provider for a given lab deterministically
   */
  static async getProvider(labId) {
    // 1. Try to find the active provider
    let account = await db.lab_whatsapp_account.scope('active').findOne({ where: { lab_id: labId } });
    
    // 2. Fallback to the best available provider using priority/last_used ordering
    if (!account) {
      account = await db.lab_whatsapp_account.scope('ordered').findOne({ where: { lab_id: labId } });
    }

    if (!account) {
      return null;
    }
    
    const implementation = account.provider === 'meta' ? MetaProvider : WebProvider;
    return { 
      type: account.provider, 
      implementation,
      account // exposing the account record if needed
    };
  }

  /**
   * Set the active provider for a lab
   */
  static async setActiveProvider(labId, provider) {
    return await db.sequelize.transaction(async (t) => {
      // Deactivate all providers for this lab
      await db.lab_whatsapp_account.update(
        { is_active: false },
        { where: { lab_id: labId }, transaction: t }
      );

      // Activate the requested provider
      const [updated] = await db.lab_whatsapp_account.update(
        { is_active: true },
        { where: { lab_id: labId, provider }, transaction: t }
      );

      return updated > 0;
    });
  }

  /**
   * Update the last used timestamp for a provider
   */
  static async updateLastUsed(labId, provider) {
    return await db.lab_whatsapp_account.update(
      { last_used_at: new Date() },
      { where: { lab_id: labId, provider } }
    );
  }

  /**
   * Connect to WhatsApp service
   * Specific to WebProvider mostly, as Meta handles connection externally
   */
  static async connect(labId, onQrCallback, onConnectedCallback, onDisconnectedCallback) {
    const provider = await this.getProvider(labId);
    
    if (!provider) {
      throw new Error('No WhatsApp provider configuration found for this lab. Please configure one in settings.');
    }
    
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
    if (!provider) return { provider: 'none', status: 'disconnected' };

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
    
    if (!provider) {
      throw new Error('No active WhatsApp provider found for this lab.');
    }

    let status = 'pending';
    let errorMessage = null;
    
    try {
      await provider.implementation.sendDocument(labId, phone, pdfBuffer, caption);
      status = 'sent';
      
      // Update last used timestamp
      await this.updateLastUsed(labId, provider.type);
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
