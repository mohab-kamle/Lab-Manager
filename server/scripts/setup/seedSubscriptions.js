/**
 * Seed script for subscription plans
 * This script creates default subscription plans with different durations and prices
 * Run this script to populate the subscription table with initial data
 */

require('dotenv').config();
const { subscription } = require('../../models');

// Default subscription plans data
const defaultSubscriptions = [
  {
    name: 'Free Trial',
    duration_type: 'free_trial',
    duration_value: 7, // 7 days
    price: 0.00,
    currency: 'USD',
    description: 'Try our platform for free for 7 days with limited features',
    features: {
      max_labs: 1,
      max_users: 2,
      max_patients: 50,
      support: 'Email only',
      reports: 'Basic',
      storage: '1GB'
    },
    max_labs: 1,
    max_users: 2,
    max_patients: 50,
    is_active: true,
    is_popular: false,
    sort_order: 1
  },
  {
    name: 'Basic Monthly',
    duration_type: 'monthly',
    duration_value: 30, // 30 days
    price: 29.99,
    currency: 'USD',
    description: 'Perfect for small labs getting started',
    features: {
      max_labs: 1,
      max_users: 5,
      max_patients: 500,
      support: 'Email & Chat',
      reports: 'Standard',
      storage: '10GB',
      backup: 'Daily'
    },
    max_labs: 1,
    max_users: 5,
    max_patients: 500,
    is_active: true,
    is_popular: false,
    sort_order: 2
  },
  {
    name: 'Professional Monthly',
    duration_type: 'monthly',
    duration_value: 30, // 30 days
    price: 59.99,
    currency: 'USD',
    description: 'Ideal for growing laboratories',
    features: {
      max_labs: 3,
      max_users: 15,
      max_patients: 2000,
      support: 'Priority Support',
      reports: 'Advanced',
      storage: '50GB',
      backup: 'Real-time',
      integrations: 'API Access'
    },
    max_labs: 3,
    max_users: 15,
    max_patients: 2000,
    is_active: true,
    is_popular: true,
    sort_order: 3
  },
  {
    name: 'Basic Quarterly',
    duration_type: '3_months',
    duration_value: 90, // 90 days
    price: 79.99,
    currency: 'USD',
    description: 'Save 10% with quarterly billing - Basic plan',
    features: {
      max_labs: 1,
      max_users: 5,
      max_patients: 500,
      support: 'Email & Chat',
      reports: 'Standard',
      storage: '10GB',
      backup: 'Daily',
      discount: '10% savings'
    },
    max_labs: 1,
    max_users: 5,
    max_patients: 500,
    is_active: true,
    is_popular: false,
    sort_order: 4
  },
  {
    name: 'Professional Quarterly',
    duration_type: '3_months',
    duration_value: 90, // 90 days
    price: 159.99,
    currency: 'USD',
    description: 'Save 10% with quarterly billing - Professional plan',
    features: {
      max_labs: 3,
      max_users: 15,
      max_patients: 2000,
      support: 'Priority Support',
      reports: 'Advanced',
      storage: '50GB',
      backup: 'Real-time',
      integrations: 'API Access',
      discount: '10% savings'
    },
    max_labs: 3,
    max_users: 15,
    max_patients: 2000,
    is_active: true,
    is_popular: false,
    sort_order: 5
  },
  {
    name: 'Basic Semi-Annual',
    duration_type: '6_months',
    duration_value: 180, // 180 days
    price: 149.99,
    currency: 'USD',
    description: 'Save 15% with semi-annual billing - Basic plan',
    features: {
      max_labs: 1,
      max_users: 5,
      max_patients: 500,
      support: 'Email & Chat',
      reports: 'Standard',
      storage: '10GB',
      backup: 'Daily',
      discount: '15% savings'
    },
    max_labs: 1,
    max_users: 5,
    max_patients: 500,
    is_active: true,
    is_popular: false,
    sort_order: 6
  },
  {
    name: 'Professional Semi-Annual',
    duration_type: '6_months',
    duration_value: 180, // 180 days
    price: 299.99,
    currency: 'USD',
    description: 'Save 15% with semi-annual billing - Professional plan',
    features: {
      max_labs: 3,
      max_users: 15,
      max_patients: 2000,
      support: 'Priority Support',
      reports: 'Advanced',
      storage: '50GB',
      backup: 'Real-time',
      integrations: 'API Access',
      discount: '15% savings'
    },
    max_labs: 3,
    max_users: 15,
    max_patients: 2000,
    is_active: true,
    is_popular: false,
    sort_order: 7
  },
  {
    name: 'Basic Annual',
    duration_type: 'yearly',
    duration_value: 365, // 365 days
    price: 299.99,
    currency: 'USD',
    description: 'Save 20% with annual billing - Basic plan',
    features: {
      max_labs: 1,
      max_users: 5,
      max_patients: 500,
      support: 'Email & Chat',
      reports: 'Standard',
      storage: '10GB',
      backup: 'Daily',
      discount: '20% savings'
    },
    max_labs: 1,
    max_users: 5,
    max_patients: 500,
    is_active: true,
    is_popular: false,
    sort_order: 8
  },
  {
    name: 'Professional Annual',
    duration_type: 'yearly',
    duration_value: 365, // 365 days
    price: 599.99,
    currency: 'USD',
    description: 'Save 20% with annual billing - Professional plan',
    features: {
      max_labs: 3,
      max_users: 15,
      max_patients: 2000,
      support: 'Priority Support',
      reports: 'Advanced',
      storage: '50GB',
      backup: 'Real-time',
      integrations: 'API Access',
      discount: '20% savings'
    },
    max_labs: 3,
    max_users: 15,
    max_patients: 2000,
    is_active: true,
    is_popular: false,
    sort_order: 9
  },
  {
    name: 'Enterprise Annual',
    duration_type: 'yearly',
    duration_value: 365, // 365 days
    price: 1199.99,
    currency: 'USD',
    description: 'Complete solution for large laboratory networks',
    features: {
      max_labs: 'unlimited',
      max_users: 'unlimited',
      max_patients: 'unlimited',
      support: '24/7 Phone & Email',
      reports: 'Custom Reports',
      storage: 'Unlimited',
      backup: 'Real-time',
      integrations: 'Full API Access',
      customization: 'Custom Features',
      training: 'Included',
      account_manager: 'Dedicated'
    },
    max_labs: null, // unlimited
    max_users: null, // unlimited
    max_patients: null, // unlimited
    is_active: true,
    is_popular: false,
    sort_order: 10
  }
];

async function seedSubscriptions() {
  try {
    console.log('Starting subscription seeding...');

    // Check if subscriptions already exist
    const existingCount = await subscription.count();
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing subscription plans.`);
      console.log('Skipping seeding to avoid duplicates.');
      console.log('If you want to reseed, please clear the subscription table first.');
      return;
    }

    // Create all subscription plans
    const createdSubscriptions = await subscription.bulkCreate(defaultSubscriptions);

    console.log(`Successfully created ${createdSubscriptions.length} subscription plans:`);
    createdSubscriptions.forEach(sub => {
      console.log(`- ${sub.name}: $${sub.price} (${sub.duration_type})`);
    });

    console.log('\nSubscription seeding completed successfully!');

  } catch (error) {
    console.error('Error seeding subscriptions:', error);
    throw error;
  }
}

// Run the seeding function if this script is executed directly
if (require.main === module) {
  seedSubscriptions()
    .then(() => {
      console.log('Seeding process finished.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedSubscriptions, defaultSubscriptions };