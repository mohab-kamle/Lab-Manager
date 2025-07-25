const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models');
const { lab, employee, lab_settings, Sequelize } = db;
const { Op } = Sequelize;
const nodemailer = require('nodemailer');

// Configure email transporter
var transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  port: 465,
  secure: true, // use SSL
  auth: {
      user: process.env.EMAIL_USER || 'myzoho@zoho.com',
      pass: process.env.EMAIL_PASS || 'myPassword'
  }
});

// Register new lab with payment
router.post('/', async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { lab: labData, admin: adminData, subscription: subscriptionData } = req.body;

    // Validate required fields
    if (!labData.name || !labData.email || !adminData.name || !adminData.email || !adminData.username || !adminData.password) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Check if lab or admin email already exists within the transaction
    const [existingLab, existingAdmin] = await Promise.all([
      lab.findOne({
        where: { 
          [Op.or]: [
            { lab_email: labData.email },
            { name: labData.name }
          ]
        },
        transaction
      }),
      employee.findOne({
        where: { 
          [Op.or]: [
            { email: adminData.email },
            { username: adminData.username }
          ]
        },
        transaction
      })
    ]);

    if (existingLab) {
      await transaction.rollback();
      return res.status(400).json({ error: 'A lab with this email or name already exists' });
    }

    if (existingAdmin) {
      await transaction.rollback();
      return res.status(400).json({ error: 'An admin with this email or username already exists' });
    }

    // Generate unique subdomain
    const subdomain = generateSubdomain(labData.name);
    
    // Hash admin password
    const hashedPassword = await bcrypt.hash(adminData.password, 10);

    // Determine subscription details
    const subscriptionDetails = getSubscriptionDetails(subscriptionData.plan);

    // Create lab within transaction
    const newLab = await lab.create({
      name: labData.name,
      subdomain: subdomain,
      region: labData.region,
      owner: adminData.name,
      lab_email: labData.email,
      lab_phone: labData.phone,
      subscription_duration: subscriptionData.plan,
      subscription_status: 'active',
      subscription_start_date: new Date(),
      subscription_end_date: new Date(Date.now() + subscriptionDetails.duration),
      subscription_amount: subscriptionDetails.amount,
      lab_name_invoice: labData.name,
      lab_address: labData.address,
      lab_website: labData.website,
      primary_color: '#007bff',
      secondary_color: '#6c757d'
    }, { transaction });

    // Create admin employee within the same transaction
    const adminEmployee = await employee.create({
      username: adminData.username,
      password: hashedPassword,
      name: adminData.name,
      email: adminData.email,
      phone: adminData.phone,
      role: 'admin',
      lab_id: newLab.id,
      is_owner: true,
    }, { transaction });
    //add the admin to his table with id only
    await admin.create({
      id: adminEmployee.id,
    }, { transaction });

    // Update lab with the admin's ID
    await newLab.update({ owner_id: adminEmployee.id }, { transaction });

    // Create default lab settings within the same transaction
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
          lab_phone: labData.phone,
          lab_email: labData.email,
          lab_address: labData.address
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
    ], { transaction });

    // Process payment within the transaction
    const paymentSuccess = await processPayment(subscriptionData, adminData.email);
    
    if (!paymentSuccess) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Payment processing failed. Please try again.' });
    }

    // If we get here, all database operations were successful - commit the transaction
    await transaction.commit();

    try {
      // Send welcome email (outside transaction as it's not critical for data consistency)
      await sendWelcomeEmail(adminData.email, adminData.name, labData.name, adminData.username, subdomain, subscriptionData.plan);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the registration if email fails
    }

    // Generate JWT token for immediate login
    const token = jwt.sign(
      { 
        id: adminEmployee.id, 
        username: adminEmployee.username, 
        role: adminEmployee.role,
        lab_id: newLab.id,
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '3h' }
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
        lab_id: newLab.id,

      },
      lab: {
        id: newLab.id,
        name: newLab.name,
        subdomain: newLab.subdomain
      }
    });

  } catch (error) {
    // If we get here, something went wrong - rollback the transaction
    if (transaction.finished !== 'commit' && transaction.finished !== 'rollback') {
      await transaction.rollback();
    }
    
    console.error('Error registering lab:', error);
    const errorMessage = error.message || 'Failed to register lab. Please try again.';
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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
            <p><strong>Login URL:</strong> https://${process.env.API_URL}/login</p>
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
            <a href="https://${process.env.API_URL}/login" 
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
            For support, contact us at <a href="mailto:techsupport@labdoctors-laboratories.com">techsupport@labdoctors-laboratories.com</a>
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