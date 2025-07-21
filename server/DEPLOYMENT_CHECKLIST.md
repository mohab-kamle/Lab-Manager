# Multi-Tenant SaaS Deployment Checklist

## 🚨 PRE-DEPLOYMENT CHECKLIST

### 1. Database Backup
- [ ] **Create full database backup** before running any scripts
- [ ] **Test backup restoration** in a safe environment
- [ ] **Document current database state** (table counts, data samples)

### 2. Environment Preparation
- [ ] **Stop all application instances** to prevent data corruption
- [ ] **Disable automated backups** during migration
- [ ] **Notify team members** about maintenance window
- [ ] **Prepare rollback plan** in case of issues

### 3. Script Verification
- [ ] **Review SQL scripts** for your specific database version
- [ ] **Test scripts in staging environment** first
- [ ] **Verify all table names** match your database
- [ ] **Check for any custom modifications** in your schema

## 🚀 DEPLOYMENT STEPS

### Step 1: Database Migration
```bash
# 1. Connect to your production database
mysql -u your_username -p your_database_name

# 2. Run the migration script
source server/migrations/PRODUCTION_MULTI_TENANT_UPDATE.sql

# 3. Verify migration success
SELECT 'Migration completed successfully!' as status;
```

### Step 2: Application Deployment
- [ ] **Deploy updated backend code** with multi-tenant support
- [ ] **Deploy updated frontend code** with lab management features
- [ ] **Update environment variables** if needed
- [ ] **Restart application servers**

### Step 3: Verification Tests
- [ ] **Test existing functionality** still works
- [ ] **Test lab registration** process
- [ ] **Test data isolation** between tenants
- [ ] **Test trial expiration** functionality
- [ ] **Test subscription upgrade** process

## ✅ POST-DEPLOYMENT VERIFICATION

### Database Verification
```sql
-- Check that all tables have lab_id columns
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
    AND COLUMN_NAME = 'lab_id'
    AND TABLE_NAME IN ('patient', 'bill', 'medical_report', 'employee', 'contract', 'packages_and_offers', 'payment_method', 'company', 'doctor', 'receptionist', 'chemist', 'admin')
ORDER BY TABLE_NAME;

-- Check subscription status
SELECT 
    id,
    name,
    subscription_status,
    subscription_duration,
    subscription_start_date,
    subscription_end_date
FROM lab
ORDER BY id;

-- Check lab settings
SELECT 
    ls.lab_id,
    l.name as lab_name,
    ls.default_currency,
    ls.timezone,
    ls.date_format,
    ls.language
FROM lab_settings ls
JOIN lab l ON ls.lab_id = l.id;
```

### Application Verification
- [ ] **Login functionality** works for all user types
- [ ] **Patient management** works with tenant isolation
- [ ] **Invoice generation** works correctly
- [ ] **Medical reports** are properly isolated
- [ ] **Admin dashboard** shows lab management options
- [ ] **Trial status** displays correctly

### Performance Verification
- [ ] **Database queries** perform well with new indexes
- [ ] **Application response times** are acceptable
- [ ] **Memory usage** is within normal ranges
- [ ] **No new errors** in application logs

## 🔧 TROUBLESHOOTING

### Common Issues and Solutions

#### Issue: Foreign Key Constraint Errors
```sql
-- Check for orphaned records
SELECT 'patient' as table_name, COUNT(*) as orphaned_count 
FROM patient WHERE lab_id NOT IN (SELECT id FROM lab)
UNION ALL
SELECT 'bill' as table_name, COUNT(*) as orphaned_count 
FROM bill WHERE lab_id NOT IN (SELECT id FROM lab);
```

#### Issue: Missing lab_id Values
```sql
-- Update any records with NULL lab_id
UPDATE patient SET lab_id = 1 WHERE lab_id IS NULL;
UPDATE bill SET lab_id = 1 WHERE lab_id IS NULL;
UPDATE medical_report SET lab_id = 1 WHERE lab_id IS NULL;
-- ... repeat for other tables
```

#### Issue: Application Errors
- [ ] **Check application logs** for specific error messages
- [ ] **Verify environment variables** are set correctly
- [ ] **Check database connection** settings
- [ ] **Verify API endpoints** are accessible

## 🚨 ROLLBACK PROCEDURE

If issues occur, follow this rollback procedure:

### 1. Stop Application
```bash
# Stop all application instances
sudo systemctl stop your-app
# or
pm2 stop all
```

### 2. Rollback Database
```sql
-- Run the rollback script
source server/migrations/ROLLBACK_MULTI_TENANT.sql
```

### 3. Deploy Previous Version
```bash
# Deploy the previous version of your application
git checkout previous-version
npm install
npm run build
# Restart application
```

### 4. Verify Rollback
- [ ] **Test all functionality** works as before
- [ ] **Verify data integrity** is maintained
- [ ] **Check application logs** for errors

## 📊 MONITORING

### Key Metrics to Monitor
- [ ] **Database performance** (query times, connection count)
- [ ] **Application response times**
- [ ] **Error rates** in application logs
- [ ] **Trial conversion rates**
- [ ] **Subscription upgrade rates**
- [ ] **User activity** patterns

### Alerts to Set Up
- [ ] **Database connection failures**
- [ ] **High error rates**
- [ ] **Trial expiration** notifications
- [ ] **Subscription status** changes
- [ ] **Performance degradation**

## 📝 DOCUMENTATION

### Update These Documents
- [ ] **API documentation** with new endpoints
- [ ] **User manual** with lab management features
- [ ] **Admin guide** for subscription management
- [ ] **Database schema** documentation
- [ ] **Deployment procedures** for future updates

### Training Required
- [ ] **Admin users** on lab management features
- [ ] **Support team** on multi-tenant troubleshooting
- [ ] **Development team** on new architecture

## 🎯 SUCCESS CRITERIA

### Technical Success
- [ ] **All existing functionality** works correctly
- [ ] **Data isolation** between tenants is maintained
- [ ] **Performance** is within acceptable limits
- [ ] **No data loss** during migration

### Business Success
- [ ] **New labs can register** successfully
- [ ] **Trial system** works as expected
- [ ] **Subscription upgrades** process correctly
- [ ] **Lab customization** features work

### User Success
- [ ] **Existing users** can continue working normally
- [ ] **New users** can easily register and start trials
- [ ] **Admin users** can manage lab settings
- [ ] **Support team** can assist with new features

---

## 📞 SUPPORT CONTACTS

- **Database Administrator**: [Contact Info]
- **System Administrator**: [Contact Info]
- **Development Team Lead**: [Contact Info]
- **Business Stakeholder**: [Contact Info]

## 📋 CHECKLIST COMPLETION

- [ ] **Pre-deployment checklist** completed
- [ ] **Database migration** executed successfully
- [ ] **Application deployment** completed
- [ ] **Verification tests** passed
- [ ] **Performance monitoring** set up
- [ ] **Documentation** updated
- [ ] **Team training** completed

**Deployment Date**: _______________
**Deployed By**: _______________
**Verified By**: _______________ 