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

module.exports = {
  globalLimiter,
  loginLimiter,
  registrationLimiter
};
