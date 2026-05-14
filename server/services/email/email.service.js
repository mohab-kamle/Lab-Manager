const resend = require('./resend.client');
const otpTemplate = require('./templates/otp.template');

class EmailService {
  /**
   * Send a generic email using Resend
   * @param {string} to Recipient email
   * @param {string} subject Email subject
   * @param {string} html HTML content
   */
  static async sendEmail(to, subject, html) {
    try {
      const from = process.env.EMAIL_FROM || 'noreply@mail.curasystem.online';
      
      const { data, error } = await resend.emails.send({
        from: `Cura System <${from}>`,
        to: [to],
        subject: subject,
        html: html,
      });

      if (error) {
        console.error('Resend API Error:', error);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      return data;
    } catch (err) {
      console.error('Email sending failed:', err);
      throw err; // Re-throw to be handled by caller
    }
  }

  /**
   * Send an OTP email for account verification or password reset
   * @param {string} to Recipient email
   * @param {string} otp The generated OTP code
   * @param {string} type 'verify' | 'reset'
   */
  static async sendOTPEmail(to, otp, type = 'verify') {
    const subject = type === 'reset' ? 'Password Reset OTP - Cura System' : 'Verify Your Email - Cura System';
    const html = otpTemplate(otp, type);
    return this.sendEmail(to, subject, html);
  }

  /**
   * Send a welcome email when an account is created
   * @param {string} to Recipient email
   * @param {string} name User's name
   * @param {string} initialPassword User's initial generated password
   */
  static async sendWelcomeEmail(to, name, initialPassword) {
    const subject = 'Welcome to Cura System - Account Created';
    const html = `
      <h1>Welcome to Cura System, ${name}!</h1>
      <p>Your account has been successfully created.</p>
      <p>Your initial login details are:</p>
      <ul>
        <li>Email: ${to}</li>
        <li>Password: <strong>${initialPassword}</strong></li>
      </ul>
      <p>Please log in and change your password as soon as possible.</p>
    `;
    return this.sendEmail(to, subject, html);
  }
}

module.exports = EmailService;
