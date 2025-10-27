# Subscription Model Documentation

This document describes the new subscription model that has been added to the LabManager application.

## Overview

The subscription model is designed to store different subscription plans with their durations, prices, and features. It's a standalone model that is not linked to any other table and serves as a reference for current pricing and plan information.

## Model Structure

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | INTEGER | Primary key, auto-increment |
| `name` | STRING(100) | Name of the subscription plan |
| `duration_type` | ENUM | Type of duration: 'free_trial', 'monthly', '3_months', '6_months', 'yearly' |
| `duration_value` | INTEGER | Duration value in days |
| `price` | DECIMAL(10,2) | Price of the subscription plan |
| `currency` | STRING(3) | Currency code (default: 'USD') |
| `description` | TEXT | Detailed description of the plan |
| `features` | JSON | JSON object containing plan features and limits |
| `max_labs` | INTEGER | Maximum number of labs allowed |
| `max_users` | INTEGER | Maximum number of users allowed |
| `max_patients` | INTEGER | Maximum number of patients allowed |
| `is_active` | BOOLEAN | Whether the plan is currently active |
| `is_popular` | BOOLEAN | Whether the plan should be highlighted as popular |
| `sort_order` | INTEGER | Sort order for displaying plans |
| `created_at` | DATE | Timestamp when created |
| `updated_at` | DATE | Timestamp when last updated |

## API Endpoints

### Public Endpoints (No Authentication Required)

#### GET /subscriptions
Retrieve all active subscription plans, ordered by sort_order and price.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Basic Monthly",
    "duration_type": "monthly",
    "duration_value": 30,
    "price": "29.99",
    "currency": "USD",
    "description": "Perfect for small labs getting started",
    "features": {
      "max_labs": 1,
      "max_users": 5,
      "support": "Email & Chat"
    },
    "is_popular": false
  }
]
```

#### GET /subscriptions/:id
Retrieve a specific subscription plan by ID.

#### GET /subscriptions/duration/:durationType
Retrieve subscription plans filtered by duration type.

**Valid duration types:** `free_trial`, `monthly`, `3_months`, `6_months`, `yearly`

### Admin Endpoints (Authentication Required)

#### POST /subscriptions
Create a new subscription plan (Admin only).

**Required fields:** `name`, `duration_type`, `duration_value`, `price`

#### PUT /subscriptions/:id
Update an existing subscription plan (Admin only).

#### DELETE /subscriptions/:id
Soft delete a subscription plan by setting `is_active` to false (Admin only).

## Usage Examples

### Frontend Integration

```javascript
// Fetch all subscription plans
const response = await fetch('/api/subscriptions');
const plans = await response.json();

// Fetch monthly plans only
const monthlyPlans = await fetch('/api/subscriptions/duration/monthly');
const monthlyData = await monthlyPlans.json();

// Get a specific plan
const plan = await fetch('/api/subscriptions/1');
const planData = await plan.json();
```

### Admin Operations

```javascript
// Create a new subscription plan (requires admin authentication)
const newPlan = {
  name: "Premium Monthly",
  duration_type: "monthly",
  duration_value: 30,
  price: 99.99,
  description: "Premium features for advanced labs",
  max_labs: 5,
  max_users: 25,
  max_patients: 5000
};

const response = await fetch('/api/subscriptions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  },
  body: JSON.stringify(newPlan)
});
```

## Database Setup

### 1. Model Registration
The subscription model is automatically registered in the `init-models.js` file and will be available as `db.subscription`.

### 2. Database Migration
The model will create the table automatically when the server starts, thanks to Sequelize's sync functionality.

### 3. Seeding Data
To populate the subscription table with default plans, run:

```bash
node scripts/seedSubscriptions.js
```

This will create 10 default subscription plans with various durations and pricing tiers.

## Features Object Structure

The `features` field is a JSON object that can contain any plan-specific features. Example structure:

```json
{
  "max_labs": 3,
  "max_users": 15,
  "max_patients": 2000,
  "support": "Priority Support",
  "reports": "Advanced",
  "storage": "50GB",
  "backup": "Real-time",
  "integrations": "API Access",
  "discount": "20% savings"
}
```

## Integration with Lab Model

While the subscription model is standalone, it can be used in conjunction with the existing lab model fields:

- `lab.subscription_duration` - matches `subscription.duration_type`
- `lab.subscription_amount` - can be populated from `subscription.price`
- `lab.subscription_status` - tracks the current status of the lab's subscription

## Security Considerations

1. **Public Access**: Basic subscription information is publicly accessible to allow potential customers to view pricing.
2. **Admin Protection**: All modification endpoints require admin authentication.
3. **Soft Deletion**: Plans are deactivated rather than deleted to maintain data integrity.
4. **Input Validation**: All inputs are validated for proper format and allowed values.

## Future Enhancements

Possible future improvements:

1. **Multi-currency Support**: Expand to support multiple currencies with exchange rates.
2. **Promotional Pricing**: Add support for temporary discounts and promotions.
3. **Feature Toggles**: More granular feature control per subscription plan.
4. **Usage Tracking**: Integration with actual usage metrics.
5. **Billing Integration**: Connect with payment processors for automated billing.

## Troubleshooting

### Common Issues

1. **Model Not Found**: Ensure the subscription model is properly imported in `init-models.js`.
2. **Route Not Working**: Verify the route is registered in `index.js`.
3. **Seeding Fails**: Check database connection and ensure no existing data conflicts.

### Debugging

```javascript
// Test model availability
const { subscription } = require('./models');
console.log('Subscription model:', subscription);

// Test database connection
subscription.findAll().then(plans => {
  console.log('Found plans:', plans.length);
}).catch(error => {
  console.error('Database error:', error);
});
```