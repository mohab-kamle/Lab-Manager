const Sequelize = require('sequelize');

/**
 * Subscription model for managing subscription plans and pricing
 * This model stores different subscription plans with their durations and prices
 * It's not linked to any other table and serves as a reference for current pricing
 */
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('subscription', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Name of the subscription plan (e.g., Basic Monthly, Premium Yearly)'
    },
    duration_type: {
      type: DataTypes.ENUM('free_trial', 'monthly', '3_months', '6_months', 'yearly'),
      allowNull: false,
      comment: 'Duration type of the subscription plan'
    },
    duration_value: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Duration value in days (e.g., 30 for monthly, 365 for yearly)'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: 'Price of the subscription plan'
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD',
      comment: 'Currency code (e.g., USD, EUR, EGP)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Detailed description of the subscription plan features'
    },
    features: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'JSON object containing plan features and limits'
    },
    max_labs: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Maximum number of labs allowed in this plan'
    },
    max_users: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Maximum number of users allowed in this plan'
    },
    max_patients: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Maximum number of patients allowed in this plan'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether this subscription plan is currently active and available'
    },
    is_popular: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this plan should be highlighted as popular'
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Sort order for displaying subscription plans'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      comment: 'Timestamp when the subscription plan was created'
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      comment: 'Timestamp when the subscription plan was last updated'
    }
  }, {
    sequelize,
    tableName: 'subscription',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_subscription_duration_type",
        using: "BTREE",
        fields: [
          { name: "duration_type" },
        ]
      },
      {
        name: "idx_subscription_active",
        using: "BTREE",
        fields: [
          { name: "is_active" },
        ]
      },
      {
        name: "idx_subscription_sort_order",
        using: "BTREE",
        fields: [
          { name: "sort_order" },
        ]
      }
    ]
  });
};