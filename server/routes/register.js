const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const db = require('../models');
const { lab, employee, admin, lab_settings, subscription, lab_payment, Sequelize, phone_number } = db;
const { Op } = Sequelize;
const nodemailer = require('nodemailer');
const { registrationLimiter } = require('../middleware/rateLimiters');
const { validatePassword } = require('../utils/passwordValidator');

// Configure email transporter
var transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  port: 465,
  secure: true, // use SSL
  auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
  }
});

// Complete lab registration after successful payment
router.post('/complete/:merchantOrderId', registrationLimiter, async (req, res) => {
  let transaction;
  
  try {
    // Start database transaction
    transaction = await db.sequelize.transaction();
    
    const { merchantOrderId } = req.params;
    
    // Find payment record by merchant order ID
    const paymentRecord = await lab_payment.findOne({
      where: { merchant_order_id: merchantOrderId },
      transaction
    });
    
    if (!paymentRecord) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Payment record not found' });
    }
    
    // Check if payment is confirmed
    if (paymentRecord.payment_status !== 'paid' || !paymentRecord.confirmed) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Payment not confirmed yet' });
    }
    
    // Parse registration data
    const registrationData = JSON.parse(paymentRecord.registration_data);
    const { lab: labData, admin: adminData, subscription: subscriptionData } = registrationData;
    
    // Check if this is an upgrade (lab already exists)
    if (paymentRecord.lab_id) {
      // This is a subscription upgrade, not a new lab registration
      const existingLab = await lab.findByPk(paymentRecord.lab_id, { transaction });
      const adminEmployee = await employee.findOne({
        where: { lab_id: paymentRecord.lab_id, role: 'admin', is_owner: true },
        transaction
      });
      
      if (existingLab && adminEmployee) {
        // Get subscription details for upgrade
        const subscriptionDetails = await getSubscriptionDetails(subscriptionData.plan, transaction);
        
        // Update lab subscription
        const startDate = new Date();
        const endDate = new Date();
        
        switch (subscriptionData.plan) {
          case 'monthly':
            endDate.setMonth(endDate.getMonth() + 1);
            break;
          case '3_months':
            endDate.setMonth(endDate.getMonth() + 3);
            break;
          case '6_months':
            endDate.setMonth(endDate.getMonth() + 6);
            break;
          case 'yearly':
            endDate.setFullYear(endDate.getFullYear() + 1);
            break;
          default:
            endDate.setMonth(endDate.getMonth() + 1);
        }
        
        await existingLab.update({
          subscription_duration: subscriptionData.plan,
          subscription_status: 'active',
          subscription_start_date: startDate,
          subscription_end_date: endDate,
          subscription_amount: subscriptionDetails.amount
        }, { transaction });
        
        await transaction.commit();
        
        console.log(`Lab subscription upgraded successfully: Lab ID ${existingLab.id}, Plan: ${subscriptionData.plan}`);
        
        // Generate JWT token
        const token = jwt.sign(
          { 
            id: adminEmployee.id, 
            username: adminEmployee.username, 
            role: adminEmployee.role,
            lab_id: existingLab.id,
          },
          process.env.SECRET_KEY,
          { expiresIn: '6h' }
        );
        
        return res.json({
          success: true,
          message: 'Subscription upgraded successfully!',
          token: token,
          user: {
            id: adminEmployee.id,
            username: adminEmployee.username,
            name: adminEmployee.name,
            email: adminEmployee.email,
            role: adminEmployee.role,
            lab_id: existingLab.id,
          },
          lab: {
            id: existingLab.id,
            name: existingLab.name,
            subdomain: existingLab.subdomain
          }
        });
      } else {
        await transaction.rollback();
        return res.status(404).json({ error: 'Lab or admin not found for upgrade' });
      }
    }
    
    // This is a new lab registration
    // Get subscription details
    const subscriptionDetails = await getSubscriptionDetails(subscriptionData.plan, transaction);
    
    // Generate unique subdomain
    const subdomain = generateSubdomain(labData.name);
    
    // Validate password strength
    const passwordValidation = validatePassword(adminData.password);
    if (!passwordValidation.isValid) {
      await transaction.rollback();
      return res.status(400).json({ error: passwordValidation.error });
    }

    // Hash admin password (only for new registrations)
    const hashedPassword = await bcrypt.hash(adminData.password, 10);
    
    // Create lab
    const newLab = await lab.create({
      name: labData.name,
      subdomain: subdomain,
      region: labData.region,
      owner: adminData.name,
      lab_email: labData.email,
      lab_phone: labData.phoneNumbers && labData.phoneNumbers.length > 0 ? labData.phoneNumbers[0].phone : null,
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
    
    const adminEmployee = await employee.create({
      username: adminData.username,
      password: hashedPassword,
      name: adminData.name,
      email: adminData.email,
      role: 'admin',
      lab_id: newLab.id,
      is_owner: true,
    }, { transaction });
    
    // Create phone records for lab and admin
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
    if (labData.phoneNumbers && labData.phoneNumbers.length > 0) {
      await phone_number.bulkCreate(
        labData.phoneNumbers.map(p => ({
          phone: normalizePhone(p.phone),
          type: p.type || 'work',
          is_primary: p.is_primary,
          lab_id: newLab.id
        })),
        { transaction }
      );
    }

    // Admin phones
    if (adminData.phoneNumbers && adminData.phoneNumbers.length > 0) {
      await phone_number.bulkCreate(
        adminData.phoneNumbers.map(p => ({
          phone: normalizePhone(p.phone),
          type: p.type || 'personal',
          is_primary: p.is_primary,
          employee_id: adminEmployee.id
        })),
        { transaction }
      );
    } else if (adminData.phone) {
      // Fallback for legacy data if needed, though new frontend sends phoneNumbers
      await phone_number.create({
        phone: normalizePhone(adminData.phone),
        type: 'personal',
        is_primary: true,
        employee_id: adminEmployee.id
      }, { transaction });
    }
    
    // Add admin to admin table
    await admin.create({
      id: adminEmployee.id,
    }, { transaction });
    
    // Update lab with admin ID
    await newLab.update({ owner_id: adminEmployee.id }, { transaction });
    
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
          lab_phone: labData.phoneNumbers && labData.phoneNumbers.length > 0 ? labData.phoneNumbers[0].phone : (labData.phone || ''),
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
    
    // Update payment record with lab ID
    await paymentRecord.update({ lab_id: newLab.id }, { transaction });
    
    // Commit transaction
    await transaction.commit();
    
    console.log(`Lab registration completed successfully: Lab ID ${newLab.id}, Admin ID ${adminEmployee.id}, Subscription Plan: ${subscriptionData.plan}`);
    
    try {
      // Send welcome email
      await sendWelcomeEmail(adminData.email, adminData.name, labData.name, adminData.username, subdomain, subscriptionData.plan);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: adminEmployee.id, 
        username: adminEmployee.username, 
        role: adminEmployee.role,
        lab_id: newLab.id,
      },
      process.env.SECRET_KEY,
      { expiresIn: '6h' }
    );
    
    res.json({
      success: true,
      message: 'Lab registration completed successfully!',
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
    // Rollback transaction on error
    try {
      if (transaction && transaction.finished !== 'commit' && transaction.finished !== 'rollback') {
        await transaction.rollback();
      }
    } catch (rollbackError) {
      console.error('Error during transaction rollback:', rollbackError);
    }
    
    console.error('Error completing lab registration:', error);
    
    const errorMessage = error.message || 'Failed to complete lab registration. Please try again.';
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Upgrade existing lab subscription - Step 1: Create payment intention only
router.post('/upgrade', registrationLimiter, async (req, res) => {
  try {
    const { lab: labData, admin: adminData, subscription: subscriptionData } = req.body;

    // Comprehensive validation of required fields
    if (!labData || !adminData || !subscriptionData) {
      return res.status(400).json({ error: 'Missing required data sections: lab, admin, or subscription' });
    }

    if (!labData.id || !labData.name || !adminData.email || !subscriptionData.plan) {
      return res.status(400).json({ error: 'Lab ID, name, admin email, and subscription plan are required for upgrade' });
    }

    // Validate subscription plan
    if (!subscriptionData.paymentMethod) {
      return res.status(400).json({ error: 'Payment method is required' });
    }

    // Verify lab exists
    const existingLab = await lab.findByPk(labData.id);
    if (!existingLab) {
      return res.status(404).json({ error: 'Lab not found' });
    }

    // Get subscription details
    const subscriptionDetails = await getSubscriptionDetails(subscriptionData.plan);

    // Create payment intention for upgrade
    const paymentResult = await createPaymentIntention({
      lab: labData,
      admin: adminData,
      subscription: subscriptionData,
      isUpgrade: true
    }, subscriptionDetails);
    
    if (!paymentResult || !paymentResult.success) {
      return res.status(400).json({ 
        error: 'Payment processing failed. Please try again.',
        details: paymentResult ? 'Payment gateway error' : 'Payment configuration error'
      });
    }

    const responseData = {
      success: true,
      message: 'Payment intention created for subscription upgrade. Please complete payment to activate your new subscription.',
      payment: {
        payment_intention_id: paymentResult.payment_intention_id,
        payment_url: paymentResult.payment_url,
        order_id: paymentResult.order_id,
        merchant_order_id: paymentResult.merchant_order_id,
        amount: paymentResult.amount,
        currency: paymentResult.currency
      }
    };
    
    console.log('Sending upgrade response to client:', JSON.stringify(responseData, null, 2));
    res.json(responseData);

  } catch (error) {
    console.error('Error upgrading lab subscription:', error);
    
    const errorMessage = error.message || 'Failed to upgrade subscription. Please try again.';
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Register new lab with payment - Step 1: Create payment intention only
router.post('/', registrationLimiter, async (req, res) => {
  try {
    const { lab: labData, admin: adminData, subscription: subscriptionData } = req.body;

    // Comprehensive validation of required fields
    if (!labData || !adminData || !subscriptionData) {
      return res.status(400).json({ error: 'Missing required data sections: lab, admin, or subscription' });
    }

    if (!labData.name || !labData.email || !adminData.name || !adminData.email || !adminData.username || !adminData.password) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Validate subscription plan
    if (!subscriptionData.plan || !subscriptionData.paymentMethod) {
      return res.status(400).json({ error: 'Subscription plan and payment method are required' });
    }

    // Check if lab or admin email already exists (without transaction)
    const [existingLab, existingAdmin] = await Promise.all([
      lab.findOne({
        where: { 
          [Op.or]: [
            { lab_email: labData.email },
            { name: labData.name }
          ]
        }
      }),
      employee.findOne({
        where: { 
          [Op.or]: [
            { email: adminData.email },
            { username: adminData.username }
          ]
        }
      })
    ]);

    if (existingLab) {
      return res.status(400).json({ error: 'A lab with this email or name already exists' });
    }

    if (existingAdmin) {
      return res.status(400).json({ error: 'An admin with this email or username already exists' });
    }

    // Get subscription details
    const subscriptionDetails = await getSubscriptionDetails(subscriptionData.plan);

    // Create payment intention without creating lab yet
    const paymentResult = await createPaymentIntention({
      lab: labData,
      admin: adminData,
      subscription: subscriptionData
    }, subscriptionDetails);
    
    if (!paymentResult || !paymentResult.success) {
      return res.status(400).json({ 
        error: 'Payment processing failed. Please try again.',
        details: paymentResult ? 'Payment gateway error' : 'Payment configuration error'
      });
    }

    const responseData = {
      success: true,
      message: 'Payment intention created. Please complete payment to activate your subscription.',
      payment: {
        payment_intention_id: paymentResult.payment_intention_id,
        payment_url: paymentResult.payment_url,
        order_id: paymentResult.order_id,
        merchant_order_id: paymentResult.merchant_order_id,
        amount: paymentResult.amount,
        currency: paymentResult.currency
      }
    };
    
    console.log('Sending response to client:', JSON.stringify(responseData, null, 2));
    res.json(responseData);

  } catch (error) {
    // If we get here, something went wrong - rollback the transaction to prevent orphaned data
    try {
      if (transaction && transaction.finished !== 'commit' && transaction.finished !== 'rollback') {
        await transaction.rollback();
        console.log('Transaction rolled back successfully to prevent orphaned data');
      }
    } catch (rollbackError) {
      console.error('Error during transaction rollback:', rollbackError);
    }
    
    console.error('Error registering lab:', error);
    
    // Handle specific database constraint errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      if (error.errors.some(e => e.path === 'lab_email')) {
        return res.status(400).json({ error: 'A lab with this email already exists.' });
      }
      if (error.errors.some(e => e.path === 'email')) {
        return res.status(400).json({ error: 'An admin with this email already exists.' });
      }
      if (error.errors.some(e => e.path === 'unique_lab_setting')) {
        return res.status(400).json({ error: 'Lab settings conflict detected. Please try again.' });
      }
      return res.status(400).json({ error: 'Registration data conflicts with existing records.' });
    }
    
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
async function getSubscriptionDetails(plan, transaction = null) {
  try {
    // Try to find the subscription plan in the database within transaction context
    const { subscription } = db;
    const subscriptionPlan = await subscription.findOne({
      where: { duration_type: plan },
      ...(transaction && { transaction })
    });
    
    if (subscriptionPlan) {
      return {
        duration: subscriptionPlan.duration_value * 24 * 60 * 60 * 1000, // Convert days to milliseconds
        amount: parseFloat(subscriptionPlan.price)
      };
    }
    
    // Fallback to hardcoded plans if not found in database
    const fallbackPlans = {
      monthly: { duration: 30 * 24 * 60 * 60 * 1000, amount: 29 },
      '3_months': { duration: 90 * 24 * 60 * 60 * 1000, amount: 79 },
      '6_months': { duration: 180 * 24 * 60 * 60 * 1000, amount: 149 },
      yearly: { duration: 365 * 24 * 60 * 60 * 1000, amount: 249 }
    };
    
    return fallbackPlans[plan] || fallbackPlans.monthly;
  } catch (error) {
    console.error('Error fetching subscription details:', error);
    // Return default monthly plan on error
    return { duration: 30 * 24 * 60 * 60 * 1000, amount: 29 };
  }
}

// Create payment intention with registration data stored in payment record
async function createPaymentIntention(registrationData, subscriptionDetails) {
  try {
    const { lab: labData, admin: adminData, subscription: subscriptionData, isUpgrade } = registrationData;
    
    const actionType = isUpgrade ? 'upgrade' : 'registration';
    console.log(`Creating payment intention for ${adminData.email}: ${subscriptionData.plan} plan ${actionType}, Amount: ${subscriptionDetails.amount}`);
    
    // Payment gateway configuration
    const env = process.env.NODE_ENV || 'development';
    let paymobConfig = {};
    
    if(env === 'development') {
        paymobConfig = {
            apiKey: process.env.DEVELOPMENT_PAYMOB_API_KEY,
            secretKey: process.env.DEVELOPMENT_PAYMOB_SECRET_KEY,
            integrationId: process.env.DEVELOPMENT_PAYMOB_INTEGRATION_ID,
            publicKey: process.env.DEVELOPMENT_PAYMOB_PUBLIC_KEY,
          baseUrl: 'https://accept.paymob.com/v1/intention/',
          paymentUrlIframe: 'https://accept.paymob.com/api/acceptance/iframes/941556?payment_token=',
        };
    } else {
        paymobConfig = {
            apiKey: process.env.PRODUCTION_PAYMOB_API_KEY,
            secretKey: process.env.PRODUCTION_PAYMOB_SECRET_KEY,
            integrationId: process.env.PRODUCTION_PAYMOB_INTEGRATION_ID,
            publicKey: process.env.PRODUCTION_PAYMOB_PUBLIC_KEY,
          baseUrl: 'https://accept.paymob.com/v1/intention/',
             paymentUrlIframe: 'https://accept.paymob.com/api/acceptance/iframes/357451?payment_token='
        };
    }
    
    // Validate payment gateway configuration
    if (!paymobConfig.apiKey || !paymobConfig.integrationId) {
      console.error('Payment gateway configuration missing');
      return false;
    }
    
    // Convert amount to cents
    const amountCents = Math.round(subscriptionDetails.amount * 100);
    
    // Generate unique merchant order ID with appropriate prefix
    const orderPrefix = isUpgrade ? 'lab_upgrade' : 'lab_reg';
    const merchantOrderId = `${orderPrefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Prepare billing data from subscription data
    // Ensure phone number doesn't exceed 15 characters (payment gateway requirement)
    const rawPhoneNumber = subscriptionData.billingData?.phone_number || adminData.phone || '+20000000000';
    const phoneNumber = rawPhoneNumber.length > 15 ? rawPhoneNumber.substring(0, 15) : rawPhoneNumber;
    
    const billingData = {
      first_name: subscriptionData.billingData?.first_name || adminData.name.split(' ')[0] || 'Lab',
      last_name: subscriptionData.billingData?.last_name || adminData.name.split(' ').slice(1).join(' ') || 'Admin',
      email: adminData.email,
      phone_number: phoneNumber,
      street: subscriptionData.billingData?.street || labData.address || 'N/A',
      building: subscriptionData.billingData?.building || 'N/A',
      floor: subscriptionData.billingData?.floor || 'N/A',
      apartment: subscriptionData.billingData?.apartment || 'N/A',
      city: subscriptionData.billingData?.city || 'N/A',
      state: subscriptionData.billingData?.state || 'N/A',
      country: subscriptionData.billingData?.country || 'EG',
      postal_code: subscriptionData.billingData?.postal_code || 'N/A'
    };
    
    // Prepare payment intention data
    const itemName = isUpgrade ? `Lab Subscription Upgrade - ${subscriptionData.plan}` : `Lab Registration - ${subscriptionData.plan}`;
    const itemDescription = isUpgrade ? `${subscriptionData.plan} subscription upgrade` : `${subscriptionData.plan} subscription for lab registration`;
    
    const paymentIntentionData = {
      amount: amountCents,
      currency: 'EGP',
      payment_methods: [parseInt(paymobConfig.integrationId)],
      billing_data: billingData,
      items: [{
        name: itemName,
        description: itemDescription,
        amount: amountCents,
        quantity: 1
      }],
      delivery_needed: false,
      merchant_order_id: merchantOrderId,
      integration_id: parseInt(paymobConfig.integrationId),
      redirection_url: `${process.env.CLIENT_URL}/payment-callback?merchant_order_id=${merchantOrderId}`,
      notification_url: `${process.env.SERVER_URL}/api/payments/webhook`
    };
    
    console.log('Payment intention data:', paymentIntentionData);
    // Create payment intention with Paymob
    const response = await axios.post(
      `${paymobConfig.baseUrl}`,
      paymentIntentionData,
      {
        headers: {
          'Authorization': `Token ${paymobConfig.secretKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    );
    
    const paymentData = response.data;
    console.log('Paymob API response:', JSON.stringify(paymentData, null, 2));
    
    // Save payment intention with registration data to database
    const paymentRecord = {
      lab_id: isUpgrade ? labData.id : null, // Use existing lab ID for upgrades, null for new registrations
      payment_intention_id: paymentData.id,
      order_id: paymentData.intention_order_id,
      merchant_order_id: merchantOrderId,
      special_reference: paymentData.special_reference,
      
      // Amount and currency
      amount_cents: amountCents,
      amount: subscriptionDetails.amount,
      currency: 'EGP',
      
      // Payment status
      payment_status: paymentData.status || 'intended',
      confirmed: paymentData.confirmed || false,
      
      // Payment method information
      gateway_type: paymentData.payment_keys?.[0]?.gateway_type,
      integration_id: paymentData.payment_keys?.[0]?.integration,
      
      // Billing information
      billing_first_name: billingData.first_name,
      billing_last_name: billingData.last_name,
      billing_email: billingData.email,
      billing_phone: billingData.phone_number,
      billing_street: billingData.street,
      billing_building: billingData.building,
      billing_floor: billingData.floor,
      billing_apartment: billingData.apartment,
      billing_city: billingData.city,
      billing_state: billingData.state,
      billing_country: billingData.country,
      billing_postal_code: billingData.postal_code,
      
      // Payment items
      payment_items: paymentIntentionData.items,
      
      // URLs
      redirection_url: paymentData.redirection_url,
      notification_url: paymentIntentionData.notification_url,
      
      // Gateway response
      gateway_response: paymentData,
      gateway_created_at: paymentData.created ? new Date(paymentData.created) : new Date(),
      
      // Store registration data for later use
      registration_data: JSON.stringify(registrationData),
      
      // Subscription details
      subscription_plan: subscriptionData.plan,
      subscription_duration: subscriptionData.plan
    };
    
    // Create payment record
    const savedPayment = await lab_payment.create(paymentRecord);
    
    console.log(`Payment intention created successfully:`, {
      payment_intention_id: paymentData.id,
      order_id: paymentData.intention_order_id,
      amount: subscriptionDetails.amount,
      currency: 'EGP',
      merchant_order_id: merchantOrderId,
      database_record_id: savedPayment.id
    });
    
    // Return payment data for frontend redirect
    // Use the client_secret from Paymob API response for the payment URL
    const paymentUrl = paymentData.client_secret ? 
      `https://accept.paymob.com/unifiedcheckout/?publicKey=${paymobConfig.publicKey}&clientSecret=${paymentData.client_secret}` :
      `${paymobConfig.paymentUrlIframe}${paymentData.payment_token || paymentData.token || ''}`;
    
    return {
      success: true,
      payment_intention_id: paymentData.id,
      payment_url: paymentUrl,
      order_id: paymentData.intention_order_id,
      merchant_order_id: merchantOrderId,
      amount: subscriptionDetails.amount,
      currency: 'EGP'
    };
    
  } catch (error) {
    console.error('Payment intention creation error:', error.response?.data || error.message);
    
    // Log detailed error for debugging
    if (error.response) {
      console.error('Payment gateway response error:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    }
    
    return false;
  }
}

// Process payment with Paymob payment gateway (legacy function - kept for compatibility)
// Integrates with actual payment gateway and stores payment records in database
async function processPayment(subscriptionData, email, labId, subscriptionDetails, transaction) {
  try {
    console.log(`Processing payment for ${email}: ${subscriptionData.plan} plan, Amount: ${subscriptionDetails.amount}`);
    
    // Payment gateway configuration
    const env = process.env.NODE_ENV || 'development';
    let paymobConfig = {};
    
    if(env === 'development') {
        paymobConfig = {
            apiKey: process.env.DEVELOPMENT_PAYMOB_API_KEY,
            secretKey: process.env.DEVELOPMENT_PAYMOB_SECRET_KEY,
            integrationId: process.env.DEVELOPMENT_PAYMOB_INTEGRATION_ID,
            publicKey: process.env.DEVELOPMENT_PAYMOB_PUBLIC_KEY,
            baseUrl: 'https://accept.paymob.com/v1/intention/'
        };
    } else {
        paymobConfig = {
            apiKey: process.env.PRODUCTION_PAYMOB_API_KEY,
            secretKey: process.env.PRODUCTION_PAYMOB_SECRET_KEY,
            integrationId: process.env.PRODUCTION_PAYMOB_INTEGRATION_ID,
            publicKey: process.env.PRODUCTION_PAYMOB_PUBLIC_KEY,
            baseUrl: 'https://accept.paymob.com/v1/intention/'
        };
    }
    
    // Validate payment gateway configuration
    if (!paymobConfig.apiKey || !paymobConfig.integrationId) {
      console.error('Payment gateway configuration missing');
      return false;
    }
    
    // Convert amount to cents
    const amountCents = Math.round(subscriptionDetails.amount * 100);
    
    // Generate unique merchant order ID
    const merchantOrderId = `lab_${labId}_reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Prepare billing data from subscription data
    // Ensure phone number doesn't exceed 15 characters (payment gateway requirement)
    const rawPhoneNumber = subscriptionData.billingData?.phone_number || '+20000000000';
    const phoneNumber = rawPhoneNumber.length > 15 ? rawPhoneNumber.substring(0, 15) : rawPhoneNumber;
    
    const billingData = {
      first_name: subscriptionData.billingData?.first_name || 'Lab',
      last_name: subscriptionData.billingData?.last_name || 'Admin',
      email: email,
      phone_number: phoneNumber,
      street: subscriptionData.billingData?.street || 'N/A',
      building: subscriptionData.billingData?.building || 'N/A',
      floor: subscriptionData.billingData?.floor || 'N/A',
      apartment: subscriptionData.billingData?.apartment || 'N/A',
      city: subscriptionData.billingData?.city || 'N/A',
      state: subscriptionData.billingData?.state || 'N/A',
      country: subscriptionData.billingData?.country || 'EG',
      postal_code: subscriptionData.billingData?.postal_code || 'N/A'
    };
    
    // Prepare payment intention data
    const paymentIntentionData = {
      amount: amountCents,
      currency: 'EGP',
      payment_methods: [parseInt(paymobConfig.integrationId)],
      billing_data: billingData,
      items: [{
        name: `Lab Subscription - ${subscriptionData.plan}`,
        description: `${subscriptionData.plan} subscription for lab registration`,
        amount: amountCents,
        quantity: 1
      }],
      delivery_needed: false,
      merchant_order_id: merchantOrderId,
      integration_id: parseInt(paymobConfig.integrationId),
      redirection_url: `${process.env.CLIENT_URL}/registration-success`,
      notification_url: `${process.env.SERVER_URL}/api/payments/webhook`
    };
    
    console.log('Payment intention data:', paymentIntentionData);
    // Create payment intention with Paymob
    const response = await axios.post(
      `${paymobConfig.baseUrl}`,
      paymentIntentionData,
      {
        headers: {
          'Authorization': `Token ${paymobConfig.secretKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    );
    
    const paymentData = response.data;
    
    // Save payment intention to database within the transaction
    const paymentRecord = {
      lab_id: labId,
      payment_intention_id: paymentData.id,
      order_id: paymentData.intention_order_id,
      merchant_order_id: merchantOrderId,
      special_reference: paymentData.special_reference,
      
      // Amount and currency
      amount_cents: amountCents,
      amount: subscriptionDetails.amount,
      currency: 'EGP',
      
      // Payment status
      payment_status: paymentData.status || 'intended',
      confirmed: paymentData.confirmed || false,
      
      // Payment method information
      gateway_type: paymentData.payment_keys?.[0]?.gateway_type,
      integration_id: paymentData.payment_keys?.[0]?.integration,
      
      // Billing information
      billing_first_name: billingData.first_name,
      billing_last_name: billingData.last_name,
      billing_email: billingData.email,
      billing_phone: billingData.phone_number,
      billing_street: billingData.street,
      billing_building: billingData.building,
      billing_floor: billingData.floor,
      billing_apartment: billingData.apartment,
      billing_city: billingData.city,
      billing_state: billingData.state,
      billing_country: billingData.country,
      billing_postal_code: billingData.postal_code,
      
      // Payment items
      payment_items: paymentIntentionData.items,
      
      // URLs
      redirection_url: paymentData.redirection_url,
      notification_url: paymentIntentionData.notification_url,
      
      // Gateway response
      gateway_response: paymentData,
      gateway_created_at: paymentData.created ? new Date(paymentData.created) : new Date(),
      
      // Subscription details
      subscription_plan: subscriptionData.plan,
      subscription_duration: subscriptionData.plan
    };
    
    // Create payment record within the transaction
    const savedPayment = await lab_payment.create(paymentRecord, { transaction });
    
    console.log(`Payment intention created successfully:`, {
      payment_intention_id: paymentData.id,
      order_id: paymentData.intention_order_id,
      amount: subscriptionDetails.amount,
      currency: 'EGP',
      merchant_order_id: merchantOrderId,
      database_record_id: savedPayment.id
    });
    
    // For registration flow, we'll consider the payment intention creation as success
    // The actual payment will be processed via webhook when user completes payment
    // Return payment data for frontend to handle payment flow
    return {
      success: true,
      payment_intention_id: paymentData.id,
      payment_keys: paymentData.payment_keys,
      redirection_url: paymentData.redirection_url,
      order_id: paymentData.intention_order_id,
      merchant_order_id: merchantOrderId,
      database_record_id: savedPayment.id,
      amount: subscriptionDetails.amount,
      currency: 'EGP'
    };
    
  } catch (error) {
    console.error('Payment processing error:', error.response?.data || error.message);
    
    // Log detailed error for debugging
    if (error.response) {
      console.error('Payment gateway response error:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    }
    
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
            <p><strong>Login URL:</strong> https://${process.env.PROD_CLIENT_URL}/login</p>
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
            <a href="https://${process.env.PROD_CLIENT_URL}/login" 
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

// Cancel registration and cleanup lab data when payment fails
router.delete('/cancel/:labId', async (req, res) => {
  let transaction;
  
  try {
    const { labId } = req.params;
    
    // Start transaction to ensure all related data is deleted
    transaction = await db.sequelize.transaction();
    
    // Find the lab to be cancelled
    const labToCancel = await lab.findByPk(labId, { transaction });
    
    if (!labToCancel) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Lab not found' });
    }
    
    // Check if lab has any successful payments (prevent deletion of paid labs)
    const successfulPayments = await lab_payment.findOne({
      where: {
        lab_id: labId,
        payment_status: 'paid',
        confirmed: true
      },
      transaction
    });
    
    if (successfulPayments) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Cannot cancel lab with successful payments. Contact support for assistance.' 
      });
    }
    
    // Delete related records in correct order (respecting foreign key constraints)
    
    // 1. Delete lab payments
    await lab_payment.destroy({
      where: { lab_id: labId },
      transaction
    });
    
    // 2. Delete lab settings
    await lab_settings.destroy({
      where: { lab_id: labId },
      transaction
    });
    
    // 3. Delete admin employee
    await employee.destroy({
      where: { 
        lab_id: labId,
        role: 'admin'
      },
      transaction
    });
    
    // 4. Finally delete the lab
    await lab.destroy({
      where: { id: labId },
      transaction
    });
    
    // Commit transaction
    await transaction.commit();
    
    console.log(`Lab ${labId} and all related data cancelled successfully`);
    
    res.json({
      success: true,
      message: 'Lab registration cancelled successfully'
    });
    
  } catch (error) {
    // Rollback transaction on error
    if (transaction && transaction.finished !== 'commit' && transaction.finished !== 'rollback') {
      await transaction.rollback();
    }
    
    console.error('Error cancelling lab registration:', error);
    res.status(500).json({
      error: 'Failed to cancel lab registration',
      details: error.message
    });
  }
});

module.exports = router;