const { Resend } = require('resend');

// Initialize Resend with the API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = resend;
