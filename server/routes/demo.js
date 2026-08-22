const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const EmailService = require('../services/email/email.service');

// Request demo account
router.post('/request', async (req, res) => {
  try {
    const { email, labName, contactPerson, phone, region, message } = req.body;

    // Validation
    if (!email || !labName || !contactPerson || !phone) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Phone validation
    const phonesToValidate = req.body.phoneNumbers || [{ phone: req.body.phone }];
    if (phonesToValidate.some(p => !p.phone)) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Check if lab name already exists
    const existingLab = await lab.findOne({ where: { name: labName } });
    if (existingLab) {
      return res.status(400).json({ error: 'Lab name already exists. Please choose a different name.' });
    }

    // Check if email already exists as admin
    const existingAdmin = await employee.findOne({ where: { email, role: 'admin' } });
    if (existingAdmin) {
      return res.status(400).json({ error: 'Email already registered. Please use a different email.' });
    }

    // Check if email already exists as employee
    const existingEmployee = await employee.findOne({ where: { email, role: 'employee' } });
    if (existingEmployee) {
      return res.status(400).json({ error: 'Email already registered. Please use a different email.' });
    }

    // Create lab path (sanitized lab name for URL)
    const labPath = labName.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Check if lab path already exists
    const existingLabPath = await lab.findOne({ where: { path: labPath } });
    if (existingLabPath) {
      return res.status(400).json({ error: 'Lab name too similar to existing lab. Please choose a different name.' });
    }
    // make a transaction to ensure that the lab is created and the admin user is created
    await sequelize.transaction(async (t) => {
      // Generate admin credentials securely
    const adminPassword = crypto.randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    // Create trial lab
    const trialLab = await lab.create({
      name: labName,
      path: labPath,
      contact_person: contactPerson,
      lab_phone: req.body.phoneNumbers?.[0]?.phone || phone,
      region: region || 'Unknown',
      subscription_status: 'trial',
      trial_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      is_active: true
    }, { transaction: t });

    // Create phone records
    const { parsePhoneNumberFromString } = require('libphonenumber-js');
    const normalizePhone = (phoneStr) => {
      if (!phoneStr) return null;
      try {
        const phoneNumber = parsePhoneNumberFromString(phoneStr);
        if (phoneNumber && phoneNumber.isValid()) {
          return phoneNumber.format('E.164');
        }
        return phoneStr;
      } catch (error) {
        return phoneStr;
      }
    };

    // Lab phones
    const labPhones = req.body.phoneNumbers || [{ phone, type: 'work', is_primary: true }];
    await phone_number.bulkCreate(
      labPhones.map(p => ({
        phone: normalizePhone(p.phone),
        type: p.type || 'work',
        is_primary: p.is_primary,
        lab_id: trialLab.id
      })),
      { transaction: t }
    );
      
    // Create admin user in the employee table with generated username
    const username = email.split('@')[0];
      const adminUser = await employee.create({
      lab_id: trialLab.id,
      name: contactPerson,
      username: username,
      email: email,
      password: hashedPassword,
      role: 'admin',
      is_active: true
    }, { transaction: t });

    // Admin phones (same as lab for demo initially or whatever is provided)
    await phone_number.bulkCreate(
      labPhones.map(p => ({
        phone: normalizePhone(p.phone),
        type: p.type || 'personal',
        is_primary: p.is_primary,
        employee_id: adminUser.id
      })),
      { transaction: t }
    );

    // Create admin user in the admin table containing the id only of the employee
    const adminUserAdmin = await admin.create({
      id: adminUser.id,
    }, { transaction: t });
    //update the owner and tenant of the lab
      await trialLab.update({
        owner: adminUser.name,
        owner_id: adminUser.id,
        tenant_id: trialLab.id // or use a UUID or labPath if you want
      }, { transaction: t });
      
    // Create default lab settings
    const defaultSettings = [
      { setting_key: 'lab_logo', setting_value: '', setting_type: 'string' },
      { setting_key: 'primary_color', setting_value: '#007bff', setting_type: 'string' },
      { setting_key: 'secondary_color', setting_value: '#6c757d', setting_type: 'string' },
      { setting_key: 'lab_address', setting_value: '', setting_type: 'string' },
      { setting_key: 'lab_phone', setting_value: phone, setting_type: 'string' },
      { setting_key: 'lab_email', setting_value: email, setting_type: 'string' },
      { setting_key: 'lab_website', setting_value: '', setting_type: 'string' },
      { setting_key: 'report_header', setting_value: labName, setting_type: 'string' },
      { setting_key: 'report_footer', setting_value: 'Generated by LabManager', setting_type: 'string' },
      { setting_key: 'enable_email_notifications', setting_value: 'true', setting_type: 'boolean' },
      { setting_key: 'enable_sms_notifications', setting_value: 'false', setting_type: 'boolean' },
      { setting_key: 'auto_generate_reports', setting_value: 'true', setting_type: 'boolean' },
      { setting_key: 'require_patient_consent', setting_value: 'true', setting_type: 'boolean' },
      { setting_key: 'max_patients_per_month', setting_value: '1000', setting_type: 'number' },
      { setting_key: 'max_tests_per_month', setting_value: '5000', setting_type: 'number' },
      { setting_key: 'currency', setting_value: 'USD', setting_type: 'string' },
      { setting_key: 'timezone', setting_value: 'UTC', setting_type: 'string' },
      { setting_key: 'date_format', setting_value: 'MM/DD/YYYY', setting_type: 'string' },
      { setting_key: 'language', setting_value: 'en', setting_type: 'string' }
    ];

    for (const setting of defaultSettings) {
        await lab_settings.create({
        lab_id: trialLab.id,
        ...setting
      }, { transaction: t });
    }

    // Send welcome email
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@labmanager.com',
      to: email,
      subject: `Welcome to LabManager - Your Trial Account is Ready!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007bff;">Welcome to LabManager!</h2>
          <p>Hello ${contactPerson},</p>
          <p>Your trial account for <strong>${labName}</strong> has been successfully created!</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Your Login Credentials:</h3>
            <p><strong>Lab URL:</strong> <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/lab/${labPath}">${process.env.FRONTEND_URL || 'http://localhost:5173'}/lab/${labPath}</a></p>
            <p><strong>username:</strong> ${username}</p>
            <p><strong>Password:</strong> ${adminPassword}</p>
          </div>

          <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Trial Details:</h3>
            <ul>
              <li><strong>Duration:</strong> 14 days (no limitations)</li>
              <li><strong>Access:</strong> All features included</li>
              <li><strong>Support:</strong> Full support during trial</li>
              <li><strong>Expires:</strong> ${new Date(trialLab.trial_expires_at).toLocaleDateString()}</li>
            </ul>
          </div>

          <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">What's Next?</h3>
            <ol>
              <li>Log in to your account using the credentials above</li>
              <li>Customize your lab settings and branding</li>
              <li>Add your first patients and tests</li>
              <li>Explore all features during your trial</li>
            </ol>
          </div>

          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          
          <p>Best regards,<br>The LabManager Team</p>
        </div>
      `
    };

    await EmailService.sendEmail(email, mailOptions.subject, mailOptions.html);

    res.json({
      success: true,
      message: 'Demo account created successfully. Check your email for login details.',
      lab: {
        id: trialLab.id,
        name: trialLab.name,
        path: trialLab.path,
        trial_expires_at: trialLab.trial_expires_at
      }
    });
    });
  } catch (error) {
    console.error('Demo request error:', error);
    res.status(500).json({ error: 'Failed to create demo account. Please try again.' });
  }
});

module.exports = router;