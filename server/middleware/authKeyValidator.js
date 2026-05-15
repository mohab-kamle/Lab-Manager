const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const { manager_key } = require('../models'); // Adjust path to your models

const validateRefundKey = async (plainTextKey, labId) => {
  if (!plainTextKey) {
    throw new Error("Authorization key is required for this refund.");
  }

  // 1. Fetch ALL active, non-expired keys for this specific lab
  const activeKeys = await manager_key.findAll({
    where: {
      lab_id: labId,
      is_active: true,
      expires_at: {
        [Op.gt]: new Date() // Must be in the future
      }
    }
  });

  if (!activeKeys || activeKeys.length === 0) {
    throw new Error("No active authorization keys found for this lab.");
  }

  // 2. Iterate through the keys and compare the hashes
  for (let keyRecord of activeKeys) {
    const isMatch = await bcrypt.compare(plainTextKey, keyRecord.key_hash);
    if (isMatch) {
      return keyRecord; // We found the matching, valid key!
    }
  }

  // 3. If the loop finishes without returning, the key was wrong
  throw new Error("Invalid Authorization Key.");
};

module.exports = { validateRefundKey };
