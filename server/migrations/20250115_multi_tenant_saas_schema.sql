-- Multi-Tenant SaaS Schema Migration
-- This migration extends the existing system to support multiple labs as tenants

-- 1. Add lab_id to all tenant-specific tables
-- 2. Create proper relationships between labs, branches, and employees
-- 3. Ensure data isolation between tenants

-- Add lab_id to patient table
ALTER TABLE patient ADD COLUMN lab_id INT NOT NULL AFTER id;
ALTER TABLE patient ADD CONSTRAINT fk_patient_lab FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE;
CREATE INDEX idx_patient_lab ON patient(lab_id);

-- Add lab_id to bill table
ALTER TABLE bill ADD COLUMN lab_id INT NOT NULL AFTER id;
ALTER TABLE bill ADD COLUMN branch_id INT NOT NULL AFTER lab_id;
ALTER TABLE bill ADD CONSTRAINT fk_bill_lab FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE;
ALTER TABLE bill ADD CONSTRAINT fk_bill_branch FOREIGN KEY (branch_id) REFERENCES branch(id) ON DELETE CASCADE;
CREATE INDEX idx_bill_lab ON bill(lab_id);
CREATE INDEX idx_bill_branch ON bill(branch_id);

-- Add lab_id to medical_report table
ALTER TABLE medical_report ADD COLUMN lab_id INT NOT NULL AFTER id;
ALTER TABLE medical_report ADD COLUMN branch_id INT NOT NULL AFTER lab_id;
ALTER TABLE medical_report ADD CONSTRAINT fk_medical_report_lab FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE;
ALTER TABLE medical_report ADD CONSTRAINT fk_medical_report_branch FOREIGN KEY (branch_id) REFERENCES branch(id) ON DELETE CASCADE;
CREATE INDEX idx_medical_report_lab ON medical_report(lab_id);
CREATE INDEX idx_medical_report_branch ON medical_report(branch_id);

-- Add lab_id to employee table
ALTER TABLE employee ADD COLUMN lab_id INT NOT NULL AFTER id;
ALTER TABLE employee ADD CONSTRAINT fk_employee_lab FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE;
CREATE INDEX idx_employee_lab ON employee(lab_id);

-- Add lab_id to contract table
ALTER TABLE contract ADD COLUMN lab_id INT NOT NULL AFTER id;
ALTER TABLE contract ADD CONSTRAINT fk_contract_lab FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE;
CREATE INDEX idx_contract_lab ON contract(lab_id);

-- Add lab_id to packages_and_offers table
ALTER TABLE packages_and_offers ADD COLUMN lab_id INT NOT NULL AFTER id;
ALTER TABLE packages_and_offers ADD CONSTRAINT fk_packages_lab FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE;
CREATE INDEX idx_packages_lab ON packages_and_offers(lab_id);

-- Add lab_id to payment_method table (payment methods are lab-specific)
ALTER TABLE payment_method ADD COLUMN lab_id INT NOT NULL AFTER id;
ALTER TABLE payment_method ADD CONSTRAINT fk_payment_method_lab FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE;
CREATE INDEX idx_payment_method_lab ON payment_method(lab_id);

-- Add lab_id to company table (companies are lab-specific)
ALTER TABLE company ADD COLUMN lab_id INT NOT NULL AFTER id;
ALTER TABLE company ADD CONSTRAINT fk_company_lab FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE;
CREATE INDEX idx_company_lab ON company(lab_id);

-- Add lab_id to doctor table (doctors are lab-specific)
ALTER TABLE doctor ADD COLUMN lab_id INT NOT NULL AFTER id;
ALTER TABLE doctor ADD CONSTRAINT fk_doctor_lab FOREIGN KEY (lab_id) REFERENCES lab(id) ON DELETE CASCADE;
CREATE INDEX idx_doctor_lab ON doctor(lab_id);

-- Note: Tests, cultures, test_groups, antibiotics, sample_types, categories, statuses, diseases, and questions are SHARED across all labs
-- They do not need lab_id as they are common resources used by all labs

-- Add is_main_branch flag to branch table
ALTER TABLE branch ADD COLUMN is_main_branch BOOLEAN DEFAULT FALSE AFTER manager_id;
CREATE INDEX idx_branch_main ON branch(is_main_branch);

-- Add subscription and plan information to lab table
ALTER TABLE lab ADD COLUMN subscription_duration ENUM('free_trial', 'monthly', '3_months', '6_months', 'yearly') DEFAULT 'free_trial' AFTER owner_id;
ALTER TABLE lab ADD COLUMN subscription_status ENUM('trial', 'active', 'suspended', 'cancelled', 'expired') DEFAULT 'trial' AFTER subscription_duration;
ALTER TABLE lab ADD COLUMN subscription_start_date DATE AFTER subscription_status;
ALTER TABLE lab ADD COLUMN subscription_end_date DATE AFTER subscription_start_date;
ALTER TABLE lab ADD COLUMN subscription_amount DECIMAL(10,2) DEFAULT 0.00 AFTER subscription_end_date;
ALTER TABLE lab ADD COLUMN logo_url VARCHAR(255) AFTER subscription_amount;
ALTER TABLE lab ADD COLUMN lab_name_invoice VARCHAR(100) AFTER logo_url;
ALTER TABLE lab ADD COLUMN lab_phone VARCHAR(20) AFTER lab_name_invoice;
ALTER TABLE lab ADD COLUMN lab_address TEXT AFTER lab_phone;
ALTER TABLE lab ADD COLUMN lab_email VARCHAR(100) AFTER lab_address;
ALTER TABLE lab ADD COLUMN lab_website VARCHAR(255) AFTER lab_email;
ALTER TABLE lab ADD COLUMN primary_color VARCHAR(7) AFTER lab_website;
ALTER TABLE lab ADD COLUMN secondary_color VARCHAR(7) AFTER primary_color;

-- Add tenant context to lab table
ALTER TABLE lab ADD COLUMN tenant_id VARCHAR(50) UNIQUE AFTER id;
ALTER TABLE lab ADD COLUMN subdomain VARCHAR(100) UNIQUE AFTER tenant_id;
CREATE INDEX idx_lab_tenant ON lab(tenant_id);
CREATE INDEX idx_lab_subdomain ON lab(subdomain);

-- Add audit fields to lab table
ALTER TABLE lab ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER secondary_color;
ALTER TABLE lab ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;
ALTER TABLE lab ADD COLUMN created_by INT AFTER updated_at;
ALTER TABLE lab ADD COLUMN updated_by INT AFTER created_by;

-- Create lab_settings table for lab-specific configurations
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

-- Create lab_activity_log table for audit trail
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

-- Create indexes for performance
CREATE INDEX idx_lab_settings_lab ON lab_settings(lab_id);
CREATE INDEX idx_lab_activity_lab ON lab_activity_log(lab_id);
CREATE INDEX idx_lab_activity_user ON lab_activity_log(user_id);
CREATE INDEX idx_lab_activity_created ON lab_activity_log(created_at);

-- Update existing data to set lab_id for existing records
-- This assumes there's at least one lab in the system
UPDATE patient SET lab_id = (SELECT id FROM lab LIMIT 1) WHERE lab_id IS NULL;
UPDATE bill SET lab_id = (SELECT id FROM lab LIMIT 1), branch_id = (SELECT id FROM branch LIMIT 1) WHERE lab_id IS NULL;
UPDATE medical_report SET lab_id = (SELECT id FROM lab LIMIT 1), branch_id = (SELECT id FROM branch LIMIT 1) WHERE lab_id IS NULL;
UPDATE employee SET lab_id = (SELECT id FROM lab LIMIT 1) WHERE lab_id IS NULL;
UPDATE contract SET lab_id = (SELECT id FROM lab LIMIT 1) WHERE lab_id IS NULL;
UPDATE packages_and_offers SET lab_id = (SELECT id FROM lab LIMIT 1) WHERE lab_id IS NULL;

-- Set the first branch as main branch for existing labs
UPDATE branch SET is_main_branch = TRUE WHERE id IN (
    SELECT MIN(id) FROM branch GROUP BY lab_id
);

-- Add unique constraints for tenant isolation
-- Patient codes should be unique within a lab
ALTER TABLE patient DROP INDEX patientcode_UNIQUE;
ALTER TABLE patient ADD CONSTRAINT unique_patient_code_per_lab UNIQUE (lab_id, patientcode);

-- National ID should be unique within a lab
ALTER TABLE patient DROP INDEX national_id_UNIQUE;
ALTER TABLE patient ADD CONSTRAINT unique_national_id_per_lab UNIQUE (lab_id, national_id);

-- Passport should be unique within a lab
ALTER TABLE patient DROP INDEX passport_no_UNIQUE;
ALTER TABLE patient ADD CONSTRAINT unique_passport_per_lab UNIQUE (lab_id, passport_no);

-- Branch numbers should be unique within a lab
ALTER TABLE branch ADD CONSTRAINT unique_branch_number_per_lab UNIQUE (lab_id, branch_number);

-- Payment method names should be unique within a lab
ALTER TABLE payment_method ADD CONSTRAINT unique_payment_method_name_per_lab UNIQUE (lab_id, name);

-- Company names should be unique within a lab
ALTER TABLE company ADD CONSTRAINT unique_company_name_per_lab UNIQUE (lab_id, name);

-- Doctor names should be unique within a lab (optional, depending on business logic)
-- ALTER TABLE doctor ADD CONSTRAINT unique_doctor_name_per_lab UNIQUE (lab_id, name); 