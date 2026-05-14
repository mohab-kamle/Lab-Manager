module.exports = (otp, type = 'verify') => {
  const title = type === 'reset' ? 'Reset Your Password' : 'Verify Your Email';
  const description = type === 'reset' 
    ? 'You have requested to reset your password. Use the following OTP to complete the process.' 
    : 'Welcome to Cura System! Use the following OTP to verify your email address.';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
    .header { background-color: #1a202c; color: #ffffff; padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 40px 30px; color: #4a5568; line-height: 1.6; }
    .otp-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; text-align: center; margin: 30px 0; }
    .otp-code { font-size: 32px; font-weight: 700; color: #2b6cb0; letter-spacing: 4px; margin: 0; }
    .footer { background-color: #f8fafc; padding: 20px; text-align: center; color: #a0aec0; font-size: 14px; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Cura System</h1>
    </div>
    <div class="content">
      <h2 style="color: #2d3748; margin-top: 0;">${title}</h2>
      <p>${description}</p>
      
      <div class="otp-box">
        <p style="margin-top: 0; color: #718096; font-size: 14px; text-transform: uppercase; font-weight: 600;">Your One-Time Password</p>
        <p class="otp-code">${otp}</p>
      </div>
      
      <p style="font-size: 14px; color: #718096;">This code will expire in 5 minutes. If you did not request this code, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Cura System. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
};
