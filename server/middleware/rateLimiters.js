const rateLimit = require('express-rate-limit');

/**
 * Creates a rate limiter middleware with specified options
 * @param {Object} options Configuration options for rate limiter
 * @returns {Function} Express middleware
 */
const createRateLimiter = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // Default: 15 minutes
    max: options.max || 100, // Default: 100 requests per window
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: options.message || { error: "Too many requests, please try again later." },
    ...options
  });
};

// Specific limiters

// Login limiter: 10 attempts per 15 minutes
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: "Too many login attempts, please try again later." }
});

// API limiter: 100 requests per 15 minutes (example general limiter)
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100
});

module.exports = {
  createRateLimiter,
  loginLimiter,
  apiLimiter
};
