# Multi-Tenant SaaS Implementation Guide

## Overview

This document describes the implementation of multi-tenant SaaS architecture for the LabManager system. The system now supports multiple labs as tenants, each with their own isolated data, employees, branches, and configurations.

## Key Features

### 1. Tenant Isolation
- Each lab operates as a separate tenant
- Complete data isolation between labs
- Lab-specific configurations and settings
- Tenant-specific branding and customization

### 2. Subscription Management
- Free trial system (14-day trial by default)
- Multiple subscription durations (monthly, 3 months, 6 months, yearly)
- Gym-style subscription model (all features available)
- Subscription status tracking (trial, active, suspended, cancelled, expired)
- Automatic trial expiration handling
- Trial extension capabilities

### 3. Branch Management
- Each lab can have multiple branches
- Main branch designation
- Branch-specific operations
- Employee assignment to branches

### 4. Data Architecture

#### Core Tenant Tables
- `lab` - Main tenant table with subscription and branding info
- `lab_settings` - Lab-specific configurations
- `lab_activity_log` - Audit trail for lab activities

#### Tenant-Specific Data
All major entities now include `lab_id` for tenant isolation:
- `patient` - Lab-specific patients
- `bill` - Lab-specific invoices (also includes `branch_id`)
- `medical_report` - Lab-specific reports (also includes `branch_id`)
- `employee` - Lab-specific employees
- `contract` - Lab-specific contracts
- `packages_and_offers` - Lab-specific packages

#### Shared Resources
The following entities are shared across all labs (no lab_id needed):
- `test` - Common tests used by all labs
- `culture` - Common cultures used by all labs
- `test_group` - Common test groups used by all labs
- `antibiotic` - Common antibiotics used by all labs
- `sample_type` - Common sample types used by all labs
- `categories_test_and_culture` - Common categories
- `status` - Common statuses
- `diseases` - Common diseases
- `question` - Common questions

#### Lab-Specific Resources
The following entities are specific to each lab:
- `payment_method` - Lab-specific payment methods
- `company` - Lab-specific companies
- `doctor` - Lab-specific doctors

## Database Schema Changes

### New Tables
```sql
-- Lab settings for configuration
CREATE TABLE lab_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lab_id INT NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE,
    UNIQUE KEY unique_lab_setting (lab_id, setting_key)
);

-- Activity logging for audit trail
CREATE TABLE lab_activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lab_id INT NOT NULL,
    user_id INT,
    user_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE
);
```

### Modified Tables
All tenant-specific tables now include:
- `lab_id INT NOT NULL` - Foreign key to lab table
- Appropriate indexes for performance
- Unique constraints scoped to lab_id

## Authentication & Authorization

### JWT Token Structure
```javascript
{
  id: user_id,
  role: "admin|chemist|receptionist|patient",
  lab_id: lab_id  // Added for multi-tenant support
}
```

### Middleware Stack
1. `authenticateUser` - Validates JWT and adds lab_id to req.user
2. `tenantContext` - Validates lab access and subscription status
3. `tenantIsolation` - Ensures data isolation in queries
4. `authorizeRoles` - Role-based access control

### Example Route Protection
```javascript
router.get("/patients", 
  authenticateUser,        // Validates JWT and adds lab_id
  tenantContext,           // Validates lab access
  authorizeRoles("admin"), // Role-based access
  async (req, res) => {
    // All queries automatically filtered by lab_id
    const patients = await patient.findAll({
      where: { lab_id: req.tenant.lab_id }
    });
  }
);
```

## API Endpoints

### Lab Management
- `POST /api/labs/register` - Register new lab (starts with free trial)
- `GET /api/labs/info` - Get lab information
- `PUT /api/labs/settings` - Update lab settings
- `GET /api/labs/settings` - Get lab settings
- `GET /api/labs/activity-log` - Get activity log
- `PUT /api/labs/branding` - Update branding and contact info
- `PUT /api/labs/templates` - Update invoice and report templates
- `POST /api/labs/upgrade-subscription` - Upgrade from trial to paid subscription
- `GET /api/labs/subscription-status` - Get subscription status and trial info
- `GET /api/labs/statistics` - Get lab statistics

### Tenant Context in Existing Routes
All existing routes should be updated to include tenant context:
- Patient routes: Filter by lab_id
- Bill routes: Filter by lab_id and branch_id
- Medical report routes: Filter by lab_id and branch_id
- Employee routes: Filter by lab_id
- Test/Culture routes: Filter by lab_id (if lab-specific)

## Implementation Steps

### 1. Run Migration
```bash
cd server
node scripts/run_multi_tenant_migration.js
```

### 2. Update Existing Routes
Add tenant context middleware to all existing routes:
```javascript
// Before
router.get("/patients", authenticateUser, async (req, res) => {
  const patients = await patient.findAll();
});

// After
router.get("/patients", 
  authenticateUser, 
  tenantContext, 
  async (req, res) => {
    const patients = await patient.findAll({
      where: { lab_id: req.tenant.lab_id }
    });
  }
);
```

### 3. Update Frontend
- Add lab context to API calls
- Implement tenant-specific branding
- Add subscription plan features
- Update user interface for multi-tenant awareness

## Subscription Plans

### Subscription Model
All labs have access to all features regardless of subscription duration:

#### Free Trial
- 14-day free trial
- All features available
- No credit card required
- Automatic expiration
- Easy upgrade to paid plans

#### Monthly Subscription
- 1 month access
- All features available
- Automatic renewal

#### 3-Month Subscription
- 3 months access
- All features available
- Cost-effective option

#### 6-Month Subscription
- 6 months access
- All features available
- Better value

#### Yearly Subscription
- 12 months access
- All features available
- Best value option

## Security Considerations

### Data Isolation
- All queries must include lab_id filter
- Middleware ensures tenant context
- Database constraints prevent cross-tenant access

### Access Control
- Role-based permissions within lab
- Lab-specific user management
- Audit logging for all activities

### API Security
- JWT tokens include lab_id
- Request validation for tenant context
- Rate limiting per tenant

## Monitoring & Analytics

### Activity Logging
All user actions are logged with:
- Lab ID
- User ID and role
- Action performed
- Entity affected
- Timestamp
- IP address and user agent

### Usage Metrics
Track per-lab usage for:
- Number of patients
- Number of bills
- Number of medical reports
- Employee count
- Branch count

## Migration Strategy

### Phase 1: Database Migration
1. Run the migration script
2. Update existing data with lab_id
3. Verify data integrity

### Phase 2: Backend Updates
1. Update all models with new associations
2. Add tenant context middleware
3. Update all routes for tenant isolation
4. Add new lab management routes

### Phase 3: Frontend Updates
1. Update authentication flow
2. Add tenant context to API calls
3. Implement subscription features
4. Add lab management interface

### Phase 4: Testing & Deployment
1. Comprehensive testing of tenant isolation
2. Performance testing with multiple tenants
3. Security audit
4. Gradual rollout

## Best Practices

### Development
1. Always include lab_id in queries
2. Use tenant context middleware
3. Test with multiple tenants
4. Log all tenant-specific activities

### Deployment
1. Backup before migration
2. Test migration on staging
3. Monitor performance impact
4. Plan for rollback if needed

### Maintenance
1. Regular audit of tenant isolation
2. Monitor subscription usage
3. Update subscription limits as needed
4. Maintain activity logs

## Troubleshooting

### Common Issues
1. **Missing lab_id in queries**: Use tenant context middleware
2. **Cross-tenant data access**: Check database constraints
3. **Performance issues**: Add proper indexes
4. **Subscription limits**: Check plan configuration

### Debug Tools
- Activity log review
- Database query monitoring
- Tenant context validation
- Subscription status checks

## Future Enhancements

### Planned Features
1. White-label customization
2. Advanced analytics per tenant
3. API rate limiting per plan
4. Automated billing integration
5. Multi-language support per tenant
6. Custom workflow configurations
7. Trial conversion optimization
8. Automated trial extension based on usage
9. Trial-to-paid conversion analytics

### Scalability Considerations
1. Database partitioning by tenant
2. Caching strategies per tenant
3. Load balancing for tenant distribution
4. Microservices architecture 