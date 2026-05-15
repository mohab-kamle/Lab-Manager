const rateLimit = require('express-rate-limit');

// Global limiter: 1000 requests per 15 minutes
// Used for general API protection to prevent DoS
// Set to a high value to avoid blocking legitimate users behind NAT or SPAs making many requests
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." }
});

// Login limiter: 10 requests per 15 minutes
// Used for login endpoints to prevent brute-force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again later." }
});

// Registration limiter: 5 requests per hour
// Used for registration endpoints to prevent bot spam and resource exhaustion
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many registration attempts, please try again later." }
});

// Prevent email spam (Max 3 requests per 15 mins per IP)
const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, 
    message: { error: 'Too many password reset requests from this IP. Please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Prevent Token brute-forcing (Max 5 attempts per 15 mins per IP)
const resetPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many password reset attempts from this IP. Please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// OTP Send limiter: 5 requests per 15 minutes
const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many OTP requests. Please wait before requesting another." }
});

// OTP Verify limiter: 10 attempts per 15 minutes
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many failed attempts. Please try again later." }
});

module.exports = {
  globalLimiter,
  loginLimiter,
  registrationLimiter,
  otpSendLimiter,
  otpVerifyLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
};
