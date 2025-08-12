const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
require("dotenv").config();

// Import database models
const db = require('../models');
const payment_method = require('../models/payment_method');
const { lab_payment, lab, Sequelize } = db;

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

/**
 * Helper function to save payment data to database
 * @param {Object} paymentData - Payment data from gateway response
 * @param {Object} webhookData - Webhook data (optional)
 * @returns {Promise<Object>} - Created payment record
 */
async function savePaymentToDatabase(paymentData, webhookData = null) {
    try {
        const paymentRecord = {
            lab_id: paymentData.lab_id,
            payment_intention_id: paymentData.id,
            order_id: paymentData.intention_order_id,
            merchant_order_id: paymentData.extras?.creation_extras?.merchant_order_id,
            special_reference: paymentData.special_reference,
            
            // Amount and currency
            amount_cents: paymentData.intention_detail?.amount,
            amount: paymentData.intention_detail?.amount / 100, // Convert cents to decimal
            currency: paymentData.intention_detail?.currency || 'EGP',
            
            // Payment status
            payment_status: paymentData.status,
            confirmed: paymentData.confirmed,
            
            // Payment method information
            gateway_type: paymentData.payment_keys?.[0]?.gateway_type,
            integration_id: paymentData.payment_keys?.[0]?.integration,
            
            // Billing information
            billing_first_name: paymentData.intention_detail?.billing_data?.first_name,
            billing_last_name: paymentData.intention_detail?.billing_data?.last_name,
            billing_email: paymentData.intention_detail?.billing_data?.email,
            billing_phone: paymentData.intention_detail?.billing_data?.phone_number,
            billing_street: paymentData.intention_detail?.billing_data?.street,
            billing_building: paymentData.intention_detail?.billing_data?.building,
            billing_floor: paymentData.intention_detail?.billing_data?.floor,
            billing_apartment: paymentData.intention_detail?.billing_data?.apartment,
            billing_city: paymentData.intention_detail?.billing_data?.city,
            billing_state: paymentData.intention_detail?.billing_data?.state,
            billing_country: paymentData.intention_detail?.billing_data?.country,
            billing_postal_code: paymentData.intention_detail?.billing_data?.postal_code,
            
            // Payment items
            payment_items: paymentData.intention_detail?.items,
            
            // URLs
            redirection_url: paymentData.redirection_url,
            notification_url: paymentData.intention_detail?.billing_data?.notification_url,
            
            // Gateway response
            gateway_response: paymentData,
            gateway_created_at: paymentData.created ? new Date(paymentData.created) : null,
            
            // Webhook data if available
            webhook_response: webhookData,
            webhook_received_at: webhookData ? new Date() : null
        };
        
        // Add webhook-specific data if available
        if (webhookData && webhookData.obj) {
            const transaction = webhookData.obj;
            paymentRecord.transaction_id = transaction.id;
            paymentRecord.success = transaction.success;
            paymentRecord.pending = transaction.pending;
            paymentRecord.paid_amount_cents = transaction.paid_amount_cents;
            paymentRecord.is_3d_secure = transaction.is_3d_secure;
            paymentRecord.is_auth = transaction.is_auth;
            paymentRecord.is_capture = transaction.is_capture;
            paymentRecord.is_voided = transaction.is_voided;
            paymentRecord.is_refunded = transaction.is_refunded;
            paymentRecord.payment_method_type = transaction.source_data?.type;
            paymentRecord.card_pan = transaction.source_data?.pan;
            paymentRecord.card_type = transaction.source_data?.sub_type;
            paymentRecord.commission_fees = transaction.order?.commission_fees;
            paymentRecord.merchant_commission = transaction.merchant_commission;
            paymentRecord.merchant_id = transaction.order?.merchant?.id;
            paymentRecord.profile_id = transaction.profile_id;
            paymentRecord.transaction_processed_at = transaction.created_at ? new Date(transaction.created_at) : null;
            
            // Update payment status based on webhook
            if (transaction.success) {
                paymentRecord.payment_status = 'paid';
            } else if (transaction.pending) {
                paymentRecord.payment_status = 'pending';
            } else {
                paymentRecord.payment_status = 'failed';
            }
        }
        
        // Create or update payment record
        const [payment, created] = await lab_payment.upsert(paymentRecord, {
            returning: true,
            conflictFields: ['payment_intention_id']
        });
        
        console.log(`Payment ${created ? 'created' : 'updated'} successfully:`, {
            id: payment.id,
            payment_intention_id: payment.payment_intention_id,
            status: payment.payment_status,
            amount: payment.amount,
            currency: payment.currency
        });
        
        return payment;
    } catch (error) {
        console.error('Error saving payment to database:', error);
        throw error;
    }
}

/**
 * Create payment intention
 * POST /api/payments/create-intention
 */
router.post('/create-intention', async (req, res) => {
    try {
        const {
            lab_id,
            amount, // Amount in EGP
            currency = 'EGP',
            billing_data,
            items = [],
            subscription_plan,
            subscription_duration,
            notification_url,
            redirection_url
        } = req.body;
        
        // Validate required fields
        if (!lab_id || !amount || !billing_data) {
            return res.status(400).json({
                error: 'Missing required fields: lab_id, amount, billing_data'
            });
        }
        
        // Verify lab exists
        const labExists = await lab.findByPk(lab_id);
        if (!labExists) {
            return res.status(404).json({ error: 'Lab not found' });
        }
        
        // Convert amount to cents
        const amountCents = Math.round(amount * 100);
        
        // Generate unique merchant order ID
        const merchantOrderId = `lab_${lab_id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Ensure phone number doesn't exceed 15 characters (payment gateway requirement)
        const rawPhoneNumber = billing_data.phone_number || '+20000000000';
        const phoneNumber = rawPhoneNumber.length > 15 ? rawPhoneNumber.substring(0, 15) : rawPhoneNumber;
        
        // Prepare payment intention data
        const paymentIntentionData = {
            amount: amountCents,
            currency: currency,
            payment_methods: [paymobConfig.integrationId],
            billing_data: {
                first_name: billing_data.first_name || 'Lab',
                last_name: billing_data.last_name || 'Admin',
                email: billing_data.email,
                phone_number: phoneNumber,
                street: billing_data.street || 'N/A',
                building: billing_data.building || 'N/A',
                floor: billing_data.floor || 'N/A',
                apartment: billing_data.apartment || 'N/A',
                city: billing_data.city || 'N/A',
                state: billing_data.state || 'N/A',
                country: billing_data.country || 'EG',
                postal_code: billing_data.postal_code || 'N/A'
            },
            items: items.length > 0 ? items : [{
                name: subscription_plan || 'Lab Subscription',
                description: `${subscription_duration || 'monthly'} subscription`,
                amount: amountCents,
                quantity: 1
            }],
            delivery_needed: false,
            merchant_order_id: merchantOrderId,
            redirection_url: redirection_url || `${process.env.CLIENT_URL}/payment-success`,
            notification_url: notification_url || `${process.env.SERVER_URL}/api/payments/webhook`,
            payment_methods: [parseInt(paymobConfig.integrationId)],
        };
        
        console.log('Payment intention data:', paymentIntentionData);
        // Create payment intention with Paymob
        const response = await axios.post(
            `${paymobConfig.baseUrl}`,
            paymentIntentionData,
            {
                headers: {
                    'Authorization': `Bearer ${paymobConfig.secretKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        const paymentData = response.data;
        
        // Add lab_id to payment data for database storage
        paymentData.lab_id = lab_id;
        paymentData.subscription_plan = subscription_plan;
        paymentData.subscription_duration = subscription_duration;
        
        // Save payment intention to database
        const savedPayment = await savePaymentToDatabase(paymentData);
        
        // Return payment intention data to frontend
        res.json({
            success: true,
            payment_intention_id: paymentData.id,
            payment_keys: paymentData.payment_keys,
            redirection_url: paymentData.redirection_url,
            order_id: paymentData.intention_order_id,
            amount: amount,
            currency: currency,
            merchant_order_id: merchantOrderId,
            database_record_id: savedPayment.id
        });
        
    } catch (error) {
        console.error('Error creating payment intention:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to create payment intention',
            details: error.response?.data || error.message
        });
    }
});

/**
 * Handle payment webhook from Paymob
 * POST /api/payments/webhook
 */
router.post('/webhook', async (req, res) => {
    try {
        const webhookData = req.body;
        
        console.log('Received payment webhook:', JSON.stringify(webhookData, null, 2));
        
        // Verify webhook authenticity (optional but recommended)
        // You can implement HMAC verification here if Paymob provides it
        
        if (webhookData.type === 'TRANSACTION' && webhookData.obj) {
            const transaction = webhookData.obj;
            const orderId = transaction.order?.id;
            const merchantOrderId = transaction.order?.merchant_order_id;
            
            // Find existing payment record by order_id or merchant_order_id
            let existingPayment = null;
            
            if (orderId) {
                existingPayment = await lab_payment.findOne({
                    where: { order_id: orderId }
                });
            }
            
            if (!existingPayment && merchantOrderId) {
                existingPayment = await lab_payment.findOne({
                    where: { merchant_order_id: merchantOrderId }
                });
            }
            
            if (existingPayment) {
                // Update existing payment with webhook data
                await savePaymentToDatabase({
                    id: existingPayment.payment_intention_id,
                    lab_id: existingPayment.lab_id,
                    intention_order_id: orderId,
                    status: transaction.success ? 'paid' : (transaction.pending ? 'pending' : 'failed'),
                    confirmed: transaction.success,
                    extras: { creation_extras: { merchant_order_id: merchantOrderId } },
                    special_reference: existingPayment.special_reference,
                    intention_detail: {
                        amount: transaction.amount_cents,
                        currency: transaction.currency,
                        items: transaction.order?.items || [],
                        billing_data: transaction.order?.shipping_data || {}
                    },
                    payment_keys: [{
                        gateway_type: 'MIGS', // Default, can be extracted from transaction data
                        integration: transaction.integration_id
                    }],
                    redirection_url: existingPayment.redirection_url,
                    created: existingPayment.gateway_created_at
                }, webhookData);
                
                // If payment is successful, trigger lab registration completion
                if (transaction.success) {
                    try {
                        // Call the complete registration endpoint
                        const completeUrl = `${req.protocol}://${req.get('host')}/api/register/complete/${merchantOrderId}`;
                        const response = await axios.post(completeUrl);
                        console.log('Lab registration completed via webhook:', response.data);
                    } catch (completeError) {
                        console.error('Error completing lab registration via webhook:', completeError.message);
                        // If lab creation fails, we still acknowledge the webhook
                        // The user can retry registration completion manually
                    }
                }
                
                console.log(`Payment webhook processed successfully for order ${orderId}`);
            } else {
                console.warn(`No existing payment record found for order ${orderId} or merchant order ${merchantOrderId}`);
            }
        }
        
        // Always respond with 200 to acknowledge webhook receipt
        res.status(200).json({ received: true });
        
    } catch (error) {
        console.error('Error processing payment webhook:', error);
        // Still respond with 200 to prevent webhook retries
        res.status(200).json({ received: true, error: error.message });
    }
});

/**
 * Helper function to update lab subscription status after successful payment
 * @param {number} labId - Lab ID
 * @param {Object} transaction - Transaction data from webhook
 */
async function updateLabSubscriptionStatus(labId, transaction) {
    try {
        const labRecord = await lab.findByPk(labId);
        if (!labRecord) {
            console.error(`Lab not found: ${labId}`);
            return;
        }
        
        // Calculate subscription dates based on duration
        const startDate = new Date();
        let endDate = new Date();
        
        // Determine subscription duration from payment amount or existing lab data
        const subscriptionDuration = labRecord.subscription_duration || 'monthly';
        
        switch (subscriptionDuration) {
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
                endDate.setMonth(endDate.getMonth() + 1); // Default to monthly
        }
        
        // Update lab subscription status
        await labRecord.update({
            subscription_status: 'active',
            subscription_start_date: startDate.toISOString().split('T')[0],
            subscription_end_date: endDate.toISOString().split('T')[0],
            subscription_amount: transaction.amount_cents / 100 // Convert cents to decimal
        });
        
        console.log(`Lab ${labId} subscription updated successfully:`, {
            status: 'active',
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            amount: transaction.amount_cents / 100
        });
        
    } catch (error) {
        console.error('Error updating lab subscription status:', error);
    }
}

/**
 * Get payment history for a lab
 * GET /api/payments/lab/:labId/history
 */
router.get('/lab/:labId/history', async (req, res) => {
    try {
        const { labId } = req.params;
        const { page = 1, limit = 10, status } = req.query;
        
        // Build where clause
        const whereClause = { lab_id: labId };
        if (status) {
            whereClause.payment_status = status;
        }
        
        // Get payments with pagination
        const payments = await lab_payment.findAndCountAll({
            where: whereClause,
            include: [{
                model: lab,
                as: 'lab',
                attributes: ['id', 'name', 'lab_email']
            }],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });
        
        res.json({
            success: true,
            payments: payments.rows,
            pagination: {
                total: payments.count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(payments.count / parseInt(limit))
            }
        });
        
    } catch (error) {
        console.error('Error fetching payment history:', error);
        res.status(500).json({
            error: 'Failed to fetch payment history',
            details: error.message
        });
    }
});

/**
 * Get payment details by ID
 * GET /api/payments/:paymentId
 */
router.get('/:paymentId', async (req, res) => {
    try {
        const { paymentId } = req.params;
        
        const payment = await lab_payment.findByPk(paymentId, {
            include: [{
                model: lab,
                as: 'lab',
                attributes: ['id', 'name', 'lab_email', 'subscription_status']
            }]
        });
        
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        res.json({
            success: true,
            payment: payment
        });
        
    } catch (error) {
        console.error('Error fetching payment details:', error);
        res.status(500).json({
            error: 'Failed to fetch payment details',
            details: error.message
        });
    }
});

/**
 * Verify payment status and update if needed
 * GET /api/payments/verify/:paymentIntentionId
 */
router.get('/verify/:paymentIntentionId', async (req, res) => {
    try {
        const { paymentIntentionId } = req.params;
        
        // Check payment status in database
        const payment = await lab_payment.findOne({
            where: { payment_intention_id: paymentIntentionId },
            include: [{
                model: lab,
                as: 'lab',
                attributes: ['id', 'name', 'subscription_status']
            }]
        });
        
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        // If payment is not confirmed, try to verify with Paymob
        if (!payment.confirmed || payment.payment_status !== 'paid') {
            try {
                const verifyUrl = `https://accept.paymob.com/v1/intention/${paymentIntentionId}`;
                const verifyResponse = await axios.get(verifyUrl, {
                    headers: {
                        'Authorization': `Token ${paymobConfig.secretKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                
                const paymentData = verifyResponse.data;
                console.log('Payment verification response:', paymentData);
                
                // Update payment status if it has changed
                if (paymentData.status === 'PAID' || paymentData.confirmed) {
                    await payment.update({
                        payment_status: 'paid',
                        confirmed: true,
                        webhook_received_at: new Date()
                    });
                    
                    // Trigger lab registration completion
                    try {
                        const completeUrl = `${req.protocol}://${req.get('host')}/register/complete/${payment.merchant_order_id}`;
                        const completeResponse = await axios.post(completeUrl);
                        console.log('Lab registration completed via verification:', completeResponse.data);
                    } catch (completeError) {
                        console.error('Error completing lab registration via verification:', completeError.message);
                    }
                }
            } catch (verifyError) {
                console.error('Error verifying with Paymob:', verifyError.message);
                // Continue with database status if verification fails
            }
        }
        
        // Refresh payment data
        await payment.reload();
        
        res.json({
            success: true,
            payment_status: payment.payment_status,
            confirmed: payment.confirmed,
            amount: payment.amount,
            currency: payment.currency,
            lab: payment.lab
        });
        
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({
            error: 'Failed to verify payment',
            details: error.message
        });
    }
});

/**
  * Manual payment completion for testing
  * POST /api/payments/complete-manual/:merchantOrderId
  */
 router.post('/complete-manual/:merchantOrderId', async (req, res) => {
     try {
         const { merchantOrderId } = req.params;
         console.log(`Manual completion requested for merchant order: ${merchantOrderId}`);
         
         // Find payment record
         const payment = await lab_payment.findOne({
             where: { merchant_order_id: merchantOrderId }
         });
         
         if (!payment) {
             console.log(`Payment record not found for merchant order: ${merchantOrderId}`);
             return res.status(404).json({ error: 'Payment record not found' });
         }
         
         console.log(`Found payment record:`, {
             id: payment.id,
             status: payment.payment_status,
             confirmed: payment.confirmed
         });
         
         // Update payment status to paid (for testing purposes)
         await payment.update({
             payment_status: 'paid',
             confirmed: true,
             success: true,
             webhook_received_at: new Date()
         });
         
         console.log('Payment status updated to paid');
         
         // Trigger lab registration completion
         try {
             const completeUrl = `${req.protocol}://${req.get('host')}/register/complete/${merchantOrderId}`;
             console.log(`Calling completion URL: ${completeUrl}`);
             
             const completeResponse = await axios.post(completeUrl, {}, {
                 headers: {
                     'Content-Type': 'application/json'
                 },
                 timeout: 30000
             });
             
             console.log('Lab registration completed manually:', completeResponse.data);
             
             res.json({
                 success: true,
                 message: 'Payment manually completed and lab registration triggered',
                 payment_status: 'paid',
                 lab_creation: completeResponse.data
             });
         } catch (completeError) {
             console.error('Error completing lab registration manually:', {
                 message: completeError.message,
                 status: completeError.response?.status,
                 data: completeError.response?.data
             });
             res.status(500).json({
                 error: 'Payment updated but lab creation failed',
                 details: completeError.response?.data || completeError.message
             });
         }
         
     } catch (error) {
         console.error('Error in manual payment completion:', {
             message: error.message,
             stack: error.stack
         });
         res.status(500).json({
             error: 'Failed to complete payment manually',
             details: error.message
         });
     }
 });

// Health check endpoint
router.get('/', (req, res) => {
    res.json({
        message: 'Payment Gateway API is running',
        environment: env,
        timestamp: new Date().toISOString()
    });
});

module.exports = router;