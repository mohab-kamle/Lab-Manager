const axios = require('axios');
const db = require('../../../models');

class MetaProvider {
  /**
   * Placeholder for connecting/checking status of Meta API integration
   */
  static getStatus(labId) {
    // For Meta, "connected" implies they have configured the Phone Number ID and Access Token.
    // We would need to fetch the DB config to verify. For this abstraction, we will return 'disconnected' initially.
    return 'disconnected'; 
  }

  /**
   * Placeholder to send template message via Meta Graph API
   */
  static async sendTemplateMessage(labId, phone, templateName, params) {
    const account = await db.lab_whatsapp_account.findOne({ where: { lab_id: labId, provider: 'meta' } });
    if (!account || !account.meta_access_token || !account.meta_phone_number_id) {
      throw new Error(`Meta API configuration is missing for lab ${labId}`);
    }

    const { meta_phone_number_id, meta_access_token } = account;
    
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('00')) formattedPhone = formattedPhone.substring(2);

    const url = `https://graph.facebook.com/v18.0/${meta_phone_number_id}/messages`;
    
    // This is just a placeholder payload for what Meta expects
    const payload = {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: "en_US"
        },
        components: [
          {
            type: "body",
            parameters: params
          }
        ]
      }
    };

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${meta_access_token}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  }

  /**
   * Placeholder to send a document. Meta API requires uploading the media first to get a media_id,
   * or providing an external HTTPS link.
   */
  static async sendDocument(labId, phone, pdfBuffer, caption = "Lab Report") {
    throw new Error("Meta document sending not implemented yet. Media upload required.");
  }
}

module.exports = MetaProvider;
