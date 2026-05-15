const crypto = require('crypto');

class OTPManager {
  /**
   * Generates a secure 6-digit OTP
   * @returns {string} 6-digit OTP
   */
  static generateOTP() {
    // Generate a secure random number between 100000 and 999999
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Hashes an OTP using SHA-256 for secure database storage
   * @param {string} otp The raw OTP
   * @returns {string} The hashed OTP
   */
  static hashOTP(otp) {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  /**
   * Verifies if a provided OTP matches the stored hash
   * @param {string} providedOtp The raw OTP provided by the user
   * @param {string} storedHash The hashed OTP stored in the database
   * @returns {boolean} True if they match
   */
  static verifyOTP(providedOtp, storedHash) {
    const providedHash = this.hashOTP(providedOtp);
    // Use timingSafeEqual to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(providedHash),
      Buffer.from(storedHash)
    );
  }

  /**
   * Checks if an OTP has expired
   * @param {Date} expiresAt The expiration date
   * @returns {boolean} True if expired
   */
  static isExpired(expiresAt) {
    return new Date() > new Date(expiresAt);
  }
}

module.exports = OTPManager;
