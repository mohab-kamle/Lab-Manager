-- =====================================================
-- PRODUCTION MULTI-TENANT SAAS UPDATE SCRIPT
-- =====================================================
-- This script updates the existing database to support multi-tenant SaaS architecture
-- Run this script in production after backing up your database
-- =====================================================

-- Start transaction for safety
START TRANSACTION;

-- =====================================================
-- STEP 1: Add lab_id columns to existing tables
-- =====================================================

-- Add lab_id to patient table
ALTER TABLE patient ADD COLUMN lab_id INT AFTER id;
ALTER TABLE patient ADD COLUMN branch_id INT AFTER lab_id;

-- Add lab_id to bill table
ALTER TABLE bill ADD COLUMN lab_id INT AFTER id;
ALTER TABLE bill ADD COLUMN branch_id INT AFTER lab_id;

-- Add lab_id to medical_report table
ALTER TABLE medical_report ADD COLUMN lab_id INT AFTER id;
ALTER TABLE bill_id ADD COLUMN branch_id INT AFTER lab_id;

-- Add lab_id to employee table
ALTER TABLE employee ADD COLUMN lab_id INT AFTER id;

-- Add lab_id to contract table
ALTER TABLE contract ADD COLUMN lab_id INT AFTER id;

-- Add lab_id to packages_and_offers table
ALTER TABLE packages_and_offers ADD COLUMN lab_id INT AFTER id;

-- Add lab_id to payment_method table
ALTER TABLE payment_method ADD COLUMN lab_id INT AFTER id;

-- Add lab_id to company table
ALTER TABLE company ADD COLUMN lab_id INT AFTER id;

-- Add lab_id to doctor table
ALTER TABLE doctor ADD COLUMN lab_id INT AFTER id;

-- Add lab_id to receptionist table
ALTER TABLE receptionist ADD COLUMN lab_id INT AFTER id;

-- Add lab_id to chemist table
ALTER TABLE chemist ADD COLUMN lab_id INT AFTER id;

-- Add lab_id to admin table
ALTER TABLE admin ADD COLUMN lab_id INT AFTER id;

-- =====================================================
-- STEP 2: Update lab table with subscription fields
-- =====================================================

-- Add subscription and plan information to lab table
ALTER TABLE lab ADD COLUMN subscription_duration ENUM('free_trial', 'monthly', '3_months', '6_months', 'yearly') DEFAULT 'free_trial' AFTER owner_id;
ALTER TABLE lab ADD COLUMN subscription_status ENUM('trial', 'active', 'suspended', 'cancelled', 'expired') DEFAULT 'trial' AFTER subscription_duration;
ALTER TABLE lab ADD COLUMN subscription_start_date DATE AFTER subscription_status;
ALTER TABLE lab ADD COLUMN subscription_end_date DATE AFTER subscription_start_date;
ALTER TABLE lab ADD COLUMN subscription_amount DECIMAL(10,2) DEFAULT 0.00 AFTER subscription_end_date;

-- Add contact and branding information
ALTER TABLE lab ADD COLUMN lab_name_invoice VARCHAR(255) AFTER subscription_amount;
ALTER TABLE lab ADD COLUMN lab_phone VARCHAR(50) AFTER lab_name_invoice;
ALTER TABLE lab ADD COLUMN lab_address TEXT AFTER lab_phone;
ALTER TABLE lab ADD COLUMN lab_email VARCHAR(255) AFTER lab_address;
ALTER TABLE lab ADD COLUMN lab_website VARCHAR(255) AFTER lab_email;

-- Add tenant identifiers
ALTER TABLE lab ADD COLUMN subdomain VARCHAR(100) UNIQUE AFTER lab_website;
ALTER TABLE lab ADD COLUMN tenant_id VARCHAR(100) UNIQUE AFTER subdomain;

-- =====================================================
-- STEP 3: Update branch table
-- =====================================================

-- Add main branch designation
ALTER TABLE branch ADD COLUMN is_main_branch BOOLEAN DEFAULT FALSE AFTER name;

-- =====================================================
-- STEP 4: Create new tables for lab management
-- =====================================================

-- Create lab_settings table
CREATE TABLE lab_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lab_id INT NOT NULL,
    default_currency VARCHAR(10) DEFAULT 'USD',
    timezone VARCHAR(50) DEFAULT 'UTC',
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    language VARCHAR(10) DEFAULT 'en',
    invoice_template LONGTEXT,
    report_template LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE,
    UNIQUE KEY unique_lab_settings (lab_id)
);

-- Create lab_activity_log table
CREATE TABLE lab_activity_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
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
    FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE,
    INDEX idx_lab_activity (lab_id, created_at),
    INDEX idx_user_activity (user_id, created_at)
);

-- =====================================================
-- STEP 5: Set default values for existing data
-- =====================================================

-- Create a default lab for existing data (if no lab exists)
INSERT IGNORE INTO lab (id, name, region, governorate, license_number, owner, subscription_duration, subscription_status, subscription_start_date, subscription_end_date, subscription_amount, lab_name_invoice, created_at)
SELECT 
    1, 
    'Default Lab', 
    'Default Region', 
    'Default Governorate', 
    'DEFAULT001', 
    'System Administrator',
    'free_trial',
    'trial',
    CURDATE(),
    DATE_ADD(CURDATE(), INTERVAL 14 DAY),
    0.00,
    'Default Lab',
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM lab WHERE id = 1);

-- Create default main branch
INSERT IGNORE INTO branch (id, name, is_main_branch, lab_id, created_at)
SELECT 
    1, 
    'Main Branch', 
    TRUE,
    1,
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM branch WHERE id = 1);

-- Update existing data to use default lab_id
UPDATE patient SET lab_id = 1 WHERE lab_id IS NULL;
UPDATE bill SET lab_id = 1 WHERE lab_id IS NULL;
UPDATE medical_report SET lab_id = 1 WHERE lab_id IS NULL;
UPDATE employee SET lab_id = 1 WHERE lab_id IS NULL;
UPDATE contract SET lab_id = 1 WHERE lab_id IS NULL;
UPDATE packages_and_offers SET lab_id = 1 WHERE lab_id IS NULL;
UPDATE payment_method SET lab_id = 1 WHERE lab_id IS NULL;
UPDATE company SET lab_id = 1 WHERE lab_id IS NULL;
UPDATE doctor SET lab_id = 1 WHERE lab_id IS NULL;
UPDATE receptionist SET lab_id = 1 WHERE lab_id IS NULL;
UPDATE chemist SET lab_id = 1 WHERE lab_id IS NULL;
UPDATE admin SET lab_id = 1 WHERE lab_id IS NULL;

-- Set default branch_id for existing records
UPDATE patient SET branch_id = 1 WHERE branch_id IS NULL;
UPDATE bill SET branch_id = 1 WHERE branch_id IS NULL;
UPDATE medical_report SET branch_id = 1 WHERE branch_id IS NULL;

-- Update lab branding for default lab
UPDATE lab SET 
    lab_name_invoice = name,
    lab_phone = '',
    lab_address = '',
    lab_email = '',
    lab_website = ''
WHERE id = 1;

-- =====================================================
-- STEP 6: Create default lab settings
-- =====================================================

INSERT IGNORE INTO lab_settings (lab_id, default_currency, timezone, date_format, language, invoice_template, report_template)
VALUES (
    1,
    'USD',
    'UTC',
    'DD/MM/YYYY',
    'en',
    NULL,
    NULL
);

-- =====================================================
-- STEP 7: Add foreign key constraints
-- =====================================================

-- Add foreign key constraints for lab_id
ALTER TABLE patient ADD CONSTRAINT fk_patient_lab FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE;
ALTER TABLE bill ADD CONSTRAINT fk_bill_lab FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE;
ALTER TABLE medical_report ADD CONSTRAINT fk_medical_report_lab FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE;
ALTER TABLE employee ADD CONSTRAINT fk_employee_lab FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE;
ALTER TABLE contract ADD CONSTRAINT fk_contract_lab FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE;
ALTER TABLE packages_and_offers ADD CONSTRAINT fk_packages_lab FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE;
ALTER TABLE payment_method ADD CONSTRAINT fk_payment_method_lab FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE;
ALTER TABLE company ADD CONSTRAINT fk_company_lab FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE;
ALTER TABLE doctor ADD CONSTRAINT fk_doctor_lab FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE;
ALTER TABLE receptionist ADD CONSTRAINT fk_receptionist_lab FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE;
ALTER TABLE chemist ADD CONSTRAINT fk_chemist_lab FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE;
ALTER TABLE admin ADD CONSTRAINT fk_admin_lab FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE;

-- Add foreign key constraints for branch_id
ALTER TABLE patient ADD CONSTRAINT fk_patient_branch FOREIGN KEY (branch_id) REFERENCES branch(id) ON DELETE SET NULL;
ALTER TABLE bill ADD CONSTRAINT fk_bill_branch FOREIGN KEY (branch_id) REFERENCES branch(id) ON DELETE SET NULL;
ALTER TABLE medical_report ADD CONSTRAINT fk_medical_report_branch FOREIGN KEY (branch_id) REFERENCES branch(id) ON DELETE SET NULL;

-- =====================================================
-- STEP 8: Create indexes for performance
-- =====================================================

-- Create indexes for lab_id columns
CREATE INDEX idx_patient_lab_id ON patient(lab_id);
CREATE INDEX idx_bill_lab_id ON bill(lab_id);
CREATE INDEX idx_medical_report_lab_id ON medical_report(lab_id);
CREATE INDEX idx_employee_lab_id ON employee(lab_id);
CREATE INDEX idx_contract_lab_id ON contract(lab_id);
CREATE INDEX idx_packages_lab_id ON packages_and_offers(lab_id);
CREATE INDEX idx_payment_method_lab_id ON payment_method(lab_id);
CREATE INDEX idx_company_lab_id ON company(lab_id);
CREATE INDEX idx_doctor_lab_id ON doctor(lab_id);
CREATE INDEX idx_receptionist_lab_id ON receptionist(lab_id);
CREATE INDEX idx_chemist_lab_id ON chemist(lab_id);
CREATE INDEX idx_admin_lab_id ON admin(lab_id);

-- Create indexes for branch_id columns
CREATE INDEX idx_patient_branch_id ON patient(branch_id);
CREATE INDEX idx_bill_branch_id ON bill(branch_id);
CREATE INDEX idx_medical_report_branch_id ON medical_report(branch_id);

-- Create indexes for subscription management
CREATE INDEX idx_lab_subscription_status ON lab(subscription_status);
CREATE INDEX idx_lab_subscription_end_date ON lab(subscription_end_date);
CREATE INDEX idx_lab_subscription_duration ON lab(subscription_duration);

-- Create indexes for tenant identifiers
CREATE INDEX idx_lab_subdomain ON lab(subdomain);
CREATE INDEX idx_lab_tenant_id ON lab(tenant_id);

-- =====================================================
-- STEP 9: Update existing labs to have proper trial dates
-- =====================================================

-- Set trial end dates for existing labs that don't have them
UPDATE lab 
SET subscription_end_date = DATE_ADD(CURDATE(), INTERVAL 14 DAY)
WHERE subscription_end_date IS NULL AND subscription_status = 'trial';

-- Set trial start dates for existing labs that don't have them
UPDATE lab 
SET subscription_start_date = CURDATE()
WHERE subscription_start_date IS NULL AND subscription_status = 'trial';

-- =====================================================
-- STEP 10: Create default payment methods for existing lab
-- =====================================================

INSERT IGNORE INTO payment_method (name, lab_id, created_at)
VALUES 
    ('Cash', 1, NOW()),
    ('Credit Card', 1, NOW()),
    ('Bank Transfer', 1, NOW()),
    ('Check', 1, NOW());

-- =====================================================
-- STEP 11: Log the migration
-- =====================================================

INSERT INTO lab_activity_log (lab_id, action, entity_type, entity_id, details, created_at)
VALUES (
    1,
    'system_migration',
    'lab',
    1,
    JSON_OBJECT(
        'migration_type', 'multi_tenant_saas',
        'version', '1.0.0',
        'description', 'Production multi-tenant SaaS migration completed',
        'tables_updated', JSON_ARRAY('patient', 'bill', 'medical_report', 'employee', 'contract', 'packages_and_offers', 'payment_method', 'company', 'doctor', 'receptionist', 'chemist', 'admin', 'lab', 'branch'),
        'new_tables_created', JSON_ARRAY('lab_settings', 'lab_activity_log')
    ),
    NOW()
);

-- =====================================================
-- STEP 12: Verify migration
-- =====================================================

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

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Commit the transaction
COMMIT;

-- Display completion message
SELECT 'Multi-tenant SaaS migration completed successfully!' as status;

-- =====================================================
-- POST-MIGRATION NOTES
-- =====================================================
/*
1. All existing data has been assigned to a default lab (ID: 1)
2. A default main branch has been created (ID: 1)
3. All existing labs start with a 14-day free trial
4. Default payment methods have been created for the default lab
5. Lab settings have been initialized with default values

NEXT STEPS:
1. Update your application code to use the new multi-tenant APIs
2. Test the lab registration process
3. Verify data isolation between tenants
4. Monitor the trial expiration process
5. Set up automated trial management if needed

IMPORTANT:
- Backup your database before running this script
- Test in a staging environment first
- Monitor the application after deployment
- Check that all existing functionality still works
*/ 