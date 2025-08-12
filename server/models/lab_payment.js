const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('lab_payment', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    lab_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Allow null for payment intentions before lab creation
      references: {
        model: 'lab',
        key: 'id'
      },
      comment: 'Reference to the lab making the payment (null for payment intentions)'
    },
    // Payment Gateway Response Fields
    payment_intention_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Payment intention ID from gateway (e.g., pi_test_96c03b98a34c4294908a1fac96e8117d)'
    },
    transaction_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'Transaction ID from webhook response (e.g., 327894951)'
    },
    order_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: 'Order ID from payment gateway (e.g., 367475282)'
    },
    merchant_order_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Merchant order ID for tracking (e.g., phe4sjw11q-1xxxxxxxzz)'
    },
    special_reference: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Special reference from payment gateway'
    },
    
    // Payment Amount and Currency
    amount_cents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Payment amount in cents (e.g., 2000 for 20.00 EGP)'
    },
    amount: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: false,
      comment: 'Payment amount in decimal format (e.g., 20.00)'
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'EGP',
      comment: 'Currency code (EGP, USD, etc.)'
    },
    paid_amount_cents: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Actually paid amount in cents'
    },
    
    // Payment Status and Flags
    payment_status: {
      type: DataTypes.ENUM('intended', 'pending', 'paid', 'failed', 'cancelled', 'refunded'),
      allowNull: false,
      defaultValue: 'intended',
      comment: 'Current payment status'
    },
    success: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      comment: 'Payment success flag from webhook'
    },
    pending: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: 'Payment pending flag'
    },
    confirmed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Payment confirmation status'
    },
    is_3d_secure: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      comment: '3D Secure authentication flag'
    },
    is_auth: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      comment: 'Authorization flag'
    },
    is_capture: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      comment: 'Capture flag'
    },
    is_voided: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: 'Void flag'
    },
    is_refunded: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: 'Refund flag'
    },
    
    // Payment Method Information
    payment_method_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Payment method type (card, wallet, etc.)'
    },
    gateway_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Payment gateway type (MIGS, etc.)'
    },
    integration_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Gateway integration ID'
    },
    
    // Card Details (if applicable)
    card_pan: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'Last 4 digits of card (masked)'
    },
    card_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Card type (MasterCard, Visa, etc.)'
    },
    card_sub_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Card sub type'
    },
    
    // Billing Information
    billing_first_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Billing first name'
    },
    billing_last_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Billing last name'
    },
    billing_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Billing email address'
    },
    billing_phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Billing phone number'
    },
    billing_street: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Billing street address'
    },
    billing_building: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Billing building'
    },
    billing_floor: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Billing floor'
    },
    billing_apartment: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Billing apartment'
    },
    billing_city: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Billing city'
    },
    billing_state: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Billing state'
    },
    billing_country: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Billing country'
    },
    billing_postal_code: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Billing postal code'
    },
    
    // Subscription Information
    subscription_plan: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Subscription plan name'
    },
    subscription_duration: {
      type: DataTypes.ENUM('free_trial','monthly','3_months','6_months','yearly'),
      allowNull: true,
      comment: 'Subscription duration type'
    },
    
    // Payment Items (JSON field for flexibility)
    payment_items: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'JSON array of payment items with name, description, amount, quantity'
    },
    
    // Registration Data (for lab creation)
    registration_data: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON string containing lab and admin registration data for completion after payment'
    },
    
    // Gateway Specific Data
    gateway_response: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Complete gateway response for debugging and audit'
    },
    webhook_response: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Complete webhook response for debugging and audit'
    },
    
    // URLs and Redirections
    redirection_url: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Payment redirection URL'
    },
    notification_url: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Webhook notification URL'
    },
    
    // Merchant Information
    merchant_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Merchant ID from payment gateway'
    },
    profile_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Profile ID from payment gateway'
    },
    
    // Fees and Commission
    commission_fees: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true,
      defaultValue: 0.00,
      comment: 'Commission fees charged'
    },
    merchant_commission: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true,
      defaultValue: 0.00,
      comment: 'Merchant commission'
    },
    
    // Timestamps
    gateway_created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Creation timestamp from gateway'
    },
    transaction_processed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Transaction processing timestamp'
    },
    webhook_received_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Webhook received timestamp'
    },
    
    // Audit Fields
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      comment: 'Record creation timestamp'
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      comment: 'Record last update timestamp'
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'User who created the record'
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'User who last updated the record'
    }
  }, {
    sequelize,
    tableName: 'lab_payment',
    timestamps: false, // We're managing timestamps manually
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" }
        ]
      },
      {
        name: "idx_lab_payment_lab_id",
        using: "BTREE",
        fields: [
          { name: "lab_id" }
        ]
      },
      {
        name: "idx_lab_payment_intention_id",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "payment_intention_id" }
        ]
      },
      {
        name: "idx_lab_payment_transaction_id",
        using: "BTREE",
        fields: [
          { name: "transaction_id" }
        ]
      },
      {
        name: "idx_lab_payment_order_id",
        using: "BTREE",
        fields: [
          { name: "order_id" }
        ]
      },
      {
        name: "idx_lab_payment_status",
        using: "BTREE",
        fields: [
          { name: "payment_status" }
        ]
      },
      {
        name: "idx_lab_payment_created_at",
        using: "BTREE",
        fields: [
          { name: "created_at" }
        ]
      },
      {
        name: "idx_lab_payment_merchant_order",
        using: "BTREE",
        fields: [
          { name: "merchant_order_id" }
        ]
      }
    ]
  });
};