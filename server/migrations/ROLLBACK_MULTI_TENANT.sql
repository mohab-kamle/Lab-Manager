-- =====================================================
-- ROLLBACK MULTI-TENANT SAAS MIGRATION
-- =====================================================
-- WARNING: This script will remove all multi-tenant functionality
-- Only use this if you need to revert the changes
-- Make sure to backup your database before running this
-- =====================================================

-- Start transaction for safety
START TRANSACTION;

-- =====================================================
-- STEP 1: Drop foreign key constraints
-- =====================================================

-- Drop foreign key constraints for lab_id
ALTER TABLE patient DROP FOREIGN KEY IF EXISTS fk_patient_lab;
ALTER TABLE bill DROP FOREIGN KEY IF EXISTS fk_bill_lab;
ALTER TABLE medical_report DROP FOREIGN KEY IF EXISTS fk_medical_report_lab;
ALTER TABLE employee DROP FOREIGN KEY IF EXISTS fk_employee_lab;
ALTER TABLE contract DROP FOREIGN KEY IF EXISTS fk_contract_lab;
ALTER TABLE packages_and_offers DROP FOREIGN KEY IF EXISTS fk_packages_lab;
ALTER TABLE payment_method DROP FOREIGN KEY IF EXISTS fk_payment_method_lab;
ALTER TABLE company DROP FOREIGN KEY IF EXISTS fk_company_lab;
ALTER TABLE doctor DROP FOREIGN KEY IF EXISTS fk_doctor_lab;
ALTER TABLE receptionist DROP FOREIGN KEY IF EXISTS fk_receptionist_lab;
ALTER TABLE chemist DROP FOREIGN KEY IF EXISTS fk_chemist_lab;
ALTER TABLE admin DROP FOREIGN KEY IF EXISTS fk_admin_lab;

-- Drop foreign key constraints for branch_id
ALTER TABLE patient DROP FOREIGN KEY IF EXISTS fk_patient_branch;
ALTER TABLE bill DROP FOREIGN KEY IF EXISTS fk_bill_branch;
ALTER TABLE medical_report DROP FOREIGN KEY IF EXISTS fk_medical_report_branch;

-- =====================================================
-- STEP 2: Drop indexes
-- =====================================================

-- Drop indexes for lab_id columns
DROP INDEX IF EXISTS idx_patient_lab_id ON patient;
DROP INDEX IF EXISTS idx_bill_lab_id ON bill;
DROP INDEX IF EXISTS idx_medical_report_lab_id ON medical_report;
DROP INDEX IF EXISTS idx_employee_lab_id ON employee;
DROP INDEX IF EXISTS idx_contract_lab_id ON contract;
DROP INDEX IF EXISTS idx_packages_lab_id ON packages_and_offers;
DROP INDEX IF EXISTS idx_payment_method_lab_id ON payment_method;
DROP INDEX IF EXISTS idx_company_lab_id ON company;
DROP INDEX IF EXISTS idx_doctor_lab_id ON doctor;
DROP INDEX IF EXISTS idx_receptionist_lab_id ON receptionist;
DROP INDEX IF EXISTS idx_chemist_lab_id ON chemist;
DROP INDEX IF EXISTS idx_admin_lab_id ON admin;

-- Drop indexes for branch_id columns
DROP INDEX IF EXISTS idx_patient_branch_id ON patient;
DROP INDEX IF EXISTS idx_bill_branch_id ON bill;
DROP INDEX IF EXISTS idx_medical_report_branch_id ON medical_report;

-- Drop indexes for subscription management
DROP INDEX IF EXISTS idx_lab_subscription_status ON lab;
DROP INDEX IF EXISTS idx_lab_subscription_end_date ON lab;
DROP INDEX IF EXISTS idx_lab_subscription_duration ON lab;

-- Drop indexes for tenant identifiers
DROP INDEX IF EXISTS idx_lab_subdomain ON lab;
DROP INDEX IF EXISTS idx_lab_tenant_id ON lab;

-- =====================================================
-- STEP 3: Drop new tables
-- =====================================================

-- Drop lab_activity_log table
DROP TABLE IF EXISTS lab_activity_log;

-- Drop lab_settings table
DROP TABLE IF EXISTS lab_settings;

-- =====================================================
-- STEP 4: Remove columns from existing tables
-- =====================================================

-- Remove lab_id and branch_id from patient table
ALTER TABLE patient DROP COLUMN IF EXISTS lab_id;
ALTER TABLE patient DROP COLUMN IF EXISTS branch_id;

-- Remove lab_id and branch_id from bill table
ALTER TABLE bill DROP COLUMN IF EXISTS lab_id;
ALTER TABLE bill DROP COLUMN IF EXISTS branch_id;

-- Remove lab_id and branch_id from medical_report table
ALTER TABLE medical_report DROP COLUMN IF EXISTS lab_id;
ALTER TABLE medical_report DROP COLUMN IF EXISTS branch_id;

-- Remove lab_id from employee table
ALTER TABLE employee DROP COLUMN IF EXISTS lab_id;

-- Remove lab_id from contract table
ALTER TABLE contract DROP COLUMN IF EXISTS lab_id;

-- Remove lab_id from packages_and_offers table
ALTER TABLE packages_and_offers DROP COLUMN IF EXISTS lab_id;

-- Remove lab_id from payment_method table
ALTER TABLE payment_method DROP COLUMN IF EXISTS lab_id;

-- Remove lab_id from company table
ALTER TABLE company DROP COLUMN IF EXISTS lab_id;

-- Remove lab_id from doctor table
ALTER TABLE doctor DROP COLUMN IF EXISTS lab_id;

-- Remove lab_id from receptionist table
ALTER TABLE receptionist DROP COLUMN IF EXISTS lab_id;

-- Remove lab_id from chemist table
ALTER TABLE chemist DROP COLUMN IF EXISTS lab_id;

-- Remove lab_id from admin table
ALTER TABLE admin DROP COLUMN IF EXISTS lab_id;

-- =====================================================
-- STEP 5: Remove columns from lab table
-- =====================================================

-- Remove subscription fields
ALTER TABLE lab DROP COLUMN IF EXISTS subscription_duration;
ALTER TABLE lab DROP COLUMN IF EXISTS subscription_status;
ALTER TABLE lab DROP COLUMN IF EXISTS subscription_start_date;
ALTER TABLE lab DROP COLUMN IF EXISTS subscription_end_date;
ALTER TABLE lab DROP COLUMN IF EXISTS subscription_amount;

-- Remove contact and branding fields
ALTER TABLE lab DROP COLUMN IF EXISTS lab_name_invoice;
ALTER TABLE lab DROP COLUMN IF EXISTS lab_phone;
ALTER TABLE lab DROP COLUMN IF EXISTS lab_address;
ALTER TABLE lab DROP COLUMN IF EXISTS lab_email;
ALTER TABLE lab DROP COLUMN IF EXISTS lab_website;

-- Remove tenant identifiers
ALTER TABLE lab DROP COLUMN IF EXISTS subdomain;
ALTER TABLE lab DROP COLUMN IF EXISTS tenant_id;

-- =====================================================
-- STEP 6: Remove columns from branch table
-- =====================================================

-- Remove main branch designation
ALTER TABLE branch DROP COLUMN IF EXISTS is_main_branch;

-- =====================================================
-- STEP 7: Clean up default data
-- =====================================================

-- Remove default payment methods (keep original ones)
DELETE FROM payment_method WHERE lab_id = 1;

-- Remove default lab if it was created during migration
DELETE FROM lab WHERE id = 1 AND name = 'Default Lab';

-- =====================================================
-- ROLLBACK COMPLETE
-- =====================================================

-- Commit the transaction
COMMIT;

-- Display completion message
SELECT 'Multi-tenant SaaS rollback completed successfully!' as status;

-- =====================================================
-- POST-ROLLBACK NOTES
-- =====================================================
/*
1. All multi-tenant columns have been removed
2. New tables (lab_settings, lab_activity_log) have been dropped
3. All foreign key constraints and indexes have been removed
4. The database is now back to its original single-tenant state

IMPORTANT:
- Your application code will need to be reverted to the pre-multi-tenant version
- All lab-specific data will be lost
- Make sure to update your application to work with the original schema
*/ 