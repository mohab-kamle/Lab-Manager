const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models');
const { lab, employee, lab_settings } = db;
const nodemailer = require('nodemailer');

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

// Register new lab with payment
router.post('/', async (req, res) => {
  try {
    const { lab: labData, admin: adminData, subscription: subscriptionData } = req.body;

    // Validate required fields
    if (!labData.name || !labData.email || !adminData.name || !adminData.email || !adminData.username || !adminData.password) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Check if lab or admin email already exists
    const existingLab = await lab.findOne({
      where: { 
        $or: [
          { email: labData.email },
          { name: labData.name }
        ]
      }
    });

    if (existingLab) {
      return res.status(400).json({ error: 'A lab with this email or name already exists' });
    }

    const existingAdmin = await employee.findOne({
      where: { 
        $or: [
          { email: adminData.email },
          { username: adminData.username }
        ]
      }
    });

    if (existingAdmin) {
      return res.status(400).json({ error: 'An admin with this email or username already exists' });
    }

    // Generate unique subdomain
    const subdomain = generateSubdomain(labData.name);
    
    // Hash admin password
    const hashedPassword = await bcrypt.hash(adminData.password, 10);

    // Determine subscription details
    const subscriptionDetails = getSubscriptionDetails(subscriptionData.plan);

    // Create lab
    const newLab = await lab.create({
      name: labData.name,
      subdomain: subdomain,
      region: labData.region,
      owner: adminData.name,
      email: labData.email,
      phone: labData.phone,
      subscription_duration: subscriptionData.plan,
      subscription_status: 'active',
      subscription_start_date: new Date(),
      subscription_end_date: new Date(Date.now() + subscriptionDetails.duration),
      subscription_amount: subscriptionDetails.amount,
      lab_name_invoice: labData.name,
      lab_phone: labData.phone,
      lab_email: labData.email,
      lab_address: labData.address,
      lab_website: labData.website,
      primary_color: '#007bff',
      secondary_color: '#6c757d'
    });

    // Create admin employee
    const adminEmployee = await employee.create({
      username: adminData.username,
      password: hashedPassword,
      name: adminData.name,
      email: adminData.email,
      phone: adminData.phone,
      role: 'admin',
      lab_id: newLab.id,
      is_owner: true
    });

    // Create default lab settings
    await lab_settings.bulkCreate([
      {
        lab_id: newLab.id,
        setting_key: 'branding_colors',
        setting_value: JSON.stringify({
          primary: '#007bff',
          secondary: '#6c757d',
          accent: '#28a745'
        }),
        setting_type: 'json'
      },
      {
        lab_id: newLab.id,
        setting_key: 'logo_url',
        setting_value: '',
        setting_type: 'string'
      },
      {
        lab_id: newLab.id,
        setting_key: 'contact_info',
        setting_value: JSON.stringify({
          phone: labData.phone,
          email: labData.email,
          address: labData.address
        }),
        setting_type: 'json'
      },
      {
        lab_id: newLab.id,
        setting_key: 'subscription_plan',
        setting_value: subscriptionData.plan,
        setting_type: 'string'
      },
      {
        lab_id: newLab.id,
        setting_key: 'payment_method',
        setting_value: subscriptionData.paymentMethod,
        setting_type: 'string'
      },
      {
        lab_id: newLab.id,
        setting_key: 'email_notifications',
        setting_value: 'true',
        setting_type: 'boolean'
      },
      {
        lab_id: newLab.id,
        setting_key: 'auto_backup',
        setting_value: 'true',
        setting_type: 'boolean'
      }
    ]);

    // In a real implementation, you would process payment here
    // For now, we'll simulate successful payment
    const paymentSuccess = await processPayment(subscriptionData, adminData.email);
    
    if (!paymentSuccess) {
      // If payment fails, delete the created lab and admin
      await lab.destroy({ where: { id: newLab.id } });
      return res.status(400).json({ error: 'Payment processing failed. Please try again.' });
    }

    // Send welcome email
    await sendWelcomeEmail(adminData.email, adminData.name, labData.name, adminData.username, subdomain, subscriptionData.plan);

    // Generate JWT token for immediate login
    const token = jwt.sign(
      { 
        id: adminEmployee.id, 
        username: adminEmployee.username, 
        role: adminEmployee.role,
        lab_id: newLab.id 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Lab registration successful!',
      token: token,
      user: {
        id: adminEmployee.id,
        username: adminEmployee.username,
        name: adminEmployee.name,
        email: adminEmployee.email,
        role: adminEmployee.role,
        lab_id: newLab.id
      },
      lab: {
        id: newLab.id,
        name: newLab.name,
        subdomain: newLab.subdomain
      }
    });

  } catch (error) {
    console.error('Error registering lab:', error);
    res.status(500).json({ error: 'Failed to register lab. Please try again.' });
  }
});

// Generate unique subdomain
function generateSubdomain(labName) {
  const base = labName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20);
  
  const timestamp = Date.now().toString().slice(-4);
  return `${base}${timestamp}`;
}

// Get subscription details
function getSubscriptionDetails(plan) {
  const plans = {
    monthly: { duration: 30 * 24 * 60 * 60 * 1000, amount: 29 },
    '3_months': { duration: 90 * 24 * 60 * 60 * 1000, amount: 79 },
    '6_months': { duration: 180 * 24 * 60 * 60 * 1000, amount: 149 },
    yearly: { duration: 365 * 24 * 60 * 60 * 1000, amount: 249 }
  };
  
  return plans[plan] || plans.monthly;
}

// Process payment (simulated)
async function processPayment(subscriptionData, email) {
  try {
    // In a real implementation, you would integrate with a payment gateway like Stripe
    // For now, we'll simulate a successful payment
    
    console.log(`Processing payment for ${email}: ${subscriptionData.plan} plan`);
    
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate 95% success rate
    return Math.random() > 0.05;
  } catch (error) {
    console.error('Payment processing error:', error);
    return false;
  }
}

// Send welcome email
async function sendWelcomeEmail(email, adminName, labName, username, subdomain, plan) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@labmanager.com',
      to: email,
      subject: `Welcome to LabManager - Your Lab is Ready!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007bff;">Welcome to LabManager!</h2>
          <p>Dear ${adminName},</p>
          
          <p>Congratulations! Your lab "${labName}" has been successfully registered and is now ready to use.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Your Lab Information:</h3>
            <p><strong>Lab Name:</strong> ${labName}</p>
            <p><strong>Subdomain:</strong> ${subdomain}.labmanager.com</p>
            <p><strong>Admin Username:</strong> ${username}</p>
            <p><strong>Subscription Plan:</strong> ${plan}</p>
          </div>
          
          <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">What's Included:</h3>
            <ul>
              <li>Unlimited patients and tests</li>
              <li>Professional medical reports</li>
              <li>Custom branding and settings</li>
              <li>Multi-user access</li>
              <li>24/7 support</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://${subdomain}.labmanager.com/login" 
               style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Access Your Lab
            </a>
          </div>
          
          <p><strong>Getting Started:</strong></p>
          <ol>
            <li>Login to your lab dashboard</li>
            <li>Customize your lab branding and settings</li>
            <li>Add your first patients and tests</li>
            <li>Invite team members</li>
          </ol>
          
          <p>If you need any assistance, our support team is here to help!</p>
          
          <p>Best regards,<br>The LabManager Team</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666;">
            This is an automated message. Please do not reply to this email.
            For support, contact us at support@labmanager.com
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${email}`);
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Don't fail the request if email fails
  }
}

module.exports = router; 