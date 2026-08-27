const express = require('express');
const router = express.Router();
const { employee, patient, doctor, otp_verification } = require('../models');
const { otpSendLimiter, otpVerifyLimiter } = require('../middleware/rateLimiters');
const OTPManager = require('../utils/otpManager');
const EmailService = require('../services/email/email.service');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

/**
 * Common function to find a user by email across all roles
 */
async function findUserByEmail(email) {
  // Check employee
  let user = await employee.findOne({ where: { email } });
  if (user) return { user, role: 'employee' };

  // Check patient
  user = await patient.findOne({ where: { email } });
  if (user) return { user, role: 'patient' };

  // Check doctor
  user = await doctor.findOne({ where: { email } });
  if (user) return { user, role: 'doctor' };

  return null;
}

// ==========================================
// POST /auth/send-otp
// Purpose: Send an OTP for email verification
// ==========================================
router.post('/send-otp', otpSendLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required and must be a string' });
    }

    // Generate a secure 6-digit OTP
    const otp = OTPManager.generateOTP();
    const otpHash = OTPManager.hashOTP(otp);
    
    // Set expiration to 5 minutes from now
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Store in database
    // Delete any existing unverified OTPs for this email to prevent spam
    await otp_verification.destroy({
      where: { 
        email,
        verified: false
      }
    });

    await otp_verification.create({
      email,
      otp_hash: otpHash,
      expires_at: expiresAt,
      attempts: 0,
      verified: false
    });

    // Send email via Resend
    await EmailService.sendOTPEmail(email, otp, 'verify');

    // Return success without revealing if the user exists
    return res.status(200).json({ 
      message: 'If the email is valid, an OTP has been sent.' 
    });

  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ error: 'Failed to send OTP. Please try again later.' });
  }
});

// ==========================================
// POST /auth/forgot-password
// Purpose: Send an OTP for password reset
// ==========================================
router.post('/forgot-password', otpSendLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required and must be a string' });
    }

    // Enumeration protection: always return success quickly even if email doesn't exist
    // However, we only actually send the email if the user exists
    const userResult = await findUserByEmail(email);

    if (userResult) {
      const otp = OTPManager.generateOTP();
      const otpHash = OTPManager.hashOTP(otp);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await otp_verification.destroy({
        where: { email, verified: false }
      });

      await otp_verification.create({
        email,
        otp_hash: otpHash,
        expires_at: expiresAt,
        attempts: 0,
        verified: false
      });

      await EmailService.sendOTPEmail(email, otp, 'reset');
    }

    // Generic success message to prevent user enumeration
    return res.status(200).json({ 
      message: 'If an account with that email exists, a password reset link has been sent.' 
    });

  } catch (error) {
    console.error('Error in forgot-password:', error);
    res.status(500).json({ error: 'Failed to process request.' });
  }
});

// ==========================================
// POST /auth/verify-otp
// Purpose: Verify the provided OTP
// ==========================================
router.post('/verify-otp', otpVerifyLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp || typeof email !== 'string' || typeof otp !== 'string') {
      return res.status(400).json({ error: 'Email and OTP are required and must be strings' });
    }

    const verificationRecord = await otp_verification.findOne({
      where: { email, verified: false },
      order: [['createdAt', 'DESC']]
    });

    if (!verificationRecord) {
      return res.status(400).json({ error: 'Invalid or expired OTP.' });
    }

    // Increment attempts
    verificationRecord.attempts += 1;
    await verificationRecord.save();

    if (verificationRecord.attempts > 3) {
      await verificationRecord.destroy();
      return res.status(400).json({ error: 'Too many failed attempts. Please request a new OTP.' });
    }

    if (OTPManager.isExpired(verificationRecord.expires_at)) {
      await verificationRecord.destroy();
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    if (!OTPManager.verifyOTP(otp, verificationRecord.otp_hash)) {
      return res.status(400).json({ error: 'Invalid OTP.' });
    }

    // OTP is valid
    verificationRecord.verified = true;
    await verificationRecord.save();

    return res.status(200).json({ message: 'OTP verified successfully.' });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ error: 'Failed to verify OTP.' });
  }
});

// ==========================================
// POST /auth/reset-password
// Purpose: Reset password after OTP verification
// ==========================================
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword || typeof email !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'Email and new password are required and must be strings' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Check if there is a verified OTP record that hasn't expired
    // We give them 15 minutes after verification to change the password
    const verifiedRecord = await otp_verification.findOne({
      where: { 
        email, 
        verified: true,
        updatedAt: {
          [Op.gt]: new Date(Date.now() - 15 * 60 * 1000)
        }
      }
    });

    if (!verifiedRecord) {
      return res.status(400).json({ error: 'Invalid or expired password reset session. Please request a new OTP.' });
    }

    const userResult = await findUserByEmail(email);
    if (!userResult) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const { user } = userResult;

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    // Consume the OTP record so it can't be used again
    await verifiedRecord.destroy();

    return res.status(200).json({ message: 'Password reset successfully. You can now log in.' });

  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

module.exports = router;
