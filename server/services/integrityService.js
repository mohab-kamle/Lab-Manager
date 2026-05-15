const crypto = require('crypto');
require('dotenv').config();

const SECRET = process.env.BILLING_SECRET || 'lab-manager-fallback-secret-2024';

/**
 * Integrity Service
 * Handles HMAC signing of invoice items and the overall bill to prevent tampering.
 */
const integrityService = {
  /**
   * Generates an HMAC signature for an individual item (test or package).
   * @param {number|string} billId 
   * @param {number|string} itemId 
   * @param {number} price 
   * @returns {string} HMAC Signature
   */
  signItem: (billId, itemId, price) => {
    const data = `${billId}:${itemId}:${parseFloat(price).toFixed(2)}`;
    return crypto.createHmac('sha256', SECRET).update(data).digest('hex');
  },

  /**
   * Verifies the signature of an individual item.
   */
  verifyItem: (billId, itemId, price, signature) => {
    const expected = integrityService.signItem(billId, itemId, price);
    return expected === signature;
  },

  /**
   * Generates a combined signature for the entire bill.
   * @param {Object} billData { id, total }
   * @param {Array} items List of objects containing { signature }
   * @returns {string} Combined Bill HMAC
   */
  signBill: (billData, items) => {
    const itemSignatures = items.map(i => i.signature).sort().join('|');
    const data = `${billData.id}:${parseFloat(billData.total).toFixed(2)}:[${itemSignatures}]`;
    return crypto.createHmac('sha256', SECRET).update(data).digest('hex');
  }
};

module.exports = integrityService;
