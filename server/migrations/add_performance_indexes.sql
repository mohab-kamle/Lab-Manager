-- Performance Optimization Indexes for Medical Reports
-- This migration adds strategic indexes to improve query performance
-- and reduce N+1 query issues

-- Medical Report Indexes
CREATE INDEX IF NOT EXISTS idx_medical_report_lab_date 
ON medical_report(lab_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_medical_report_patient_date 
ON medical_report(patient_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_medical_report_reported_at 
ON medical_report(reported_at);

CREATE INDEX IF NOT EXISTS idx_medical_report_collected_at 
ON medical_report(collected_at);

-- Junction Table Indexes for Medical Report Associations
CREATE INDEX IF NOT EXISTS idx_medical_report_has_test_report 
ON medical_report_has_test(medical_report_id);

CREATE INDEX IF NOT EXISTS idx_medical_report_has_test_test 
ON medical_report_has_test(test_id);

CREATE INDEX IF NOT EXISTS idx_medical_report_has_culture_report 
ON medical_report_has_culture(medical_report_id);

CREATE INDEX IF NOT EXISTS idx_medical_report_has_culture_culture 
ON medical_report_has_culture(culture_id);

CREATE INDEX IF NOT EXISTS idx_medical_report_has_tg_report 
ON medical_report_has_tg(medical_report_id);

CREATE INDEX IF NOT EXISTS idx_medical_report_has_tg_group 
ON medical_report_has_tg(test_group_id);

-- Test Component Results Indexes
CREATE INDEX IF NOT EXISTS idx_test_component_result_report 
ON medical_report_test_component_result(medical_report_id);

CREATE INDEX IF NOT EXISTS idx_test_component_result_test 
ON medical_report_test_component_result(test_id);

CREATE INDEX IF NOT EXISTS idx_test_component_result_component 
ON medical_report_test_component_result(test_component_id);

-- Composite index for test component results lookup
CREATE INDEX IF NOT EXISTS idx_test_component_result_composite 
ON medical_report_test_component_result(medical_report_id, test_id, test_component_id);

-- Patient Indexes for Search
CREATE INDEX IF NOT EXISTS idx_patient_name 
ON patient(name);

CREATE INDEX IF NOT EXISTS idx_patient_code 
ON patient(patientcode);

CREATE INDEX IF NOT EXISTS idx_patient_lab 
ON patient(lab_id);

-- Test and Culture Indexes
CREATE INDEX IF NOT EXISTS idx_test_name 
ON test(name);

CREATE INDEX IF NOT EXISTS idx_culture_name 
ON culture(name);

CREATE INDEX IF NOT EXISTS idx_test_component_test 
ON test_component(test_id);

-- Test Group Indexes
CREATE INDEX IF NOT EXISTS idx_tg_component_group 
ON tg_component(test_group_id);

CREATE INDEX IF NOT EXISTS idx_tg_component_category 
ON tg_component(test_category_id);

CREATE INDEX IF NOT EXISTS idx_tg_fields_group 
ON tg_fields(test_group_id);

-- Medical Report Field Values Index
CREATE INDEX IF NOT EXISTS idx_medical_report_tg_field_value_report 
ON medical_report_tg_field_value(medical_report_id);

CREATE INDEX IF NOT EXISTS idx_medical_report_tg_field_value_component 
ON medical_report_tg_field_value(tg_component_id);

CREATE INDEX IF NOT EXISTS idx_medical_report_tg_field_value_field 
ON medical_report_tg_field_value(tg_fields_id);

-- Culture Results Indexes
CREATE INDEX IF NOT EXISTS idx_medical_report_culture_result_report_culture 
ON medical_report_culture_result(medical_report_has_culture_id);

CREATE INDEX IF NOT EXISTS idx_medical_report_has_culture_antibiotic_culture 
ON medical_report_has_culture_antibiotic(medical_report_has_culture_id);

-- Bill Indexes
CREATE INDEX IF NOT EXISTS idx_bill_date 
ON bill(date DESC);

CREATE INDEX IF NOT EXISTS idx_bill_lab 
ON bill(lab_id);

-- Employee and Admin Indexes for Signatories
CREATE INDEX IF NOT EXISTS idx_employee_name 
ON employee(name);

CREATE INDEX IF NOT EXISTS idx_admin_employee 
ON admin(id_employee);

CREATE INDEX IF NOT EXISTS idx_chemist_employee 
ON chemist(id_employee);

-- Referral Indexes
CREATE INDEX IF NOT EXISTS idx_referral_patient 
ON referral(patient_id);

CREATE INDEX IF NOT EXISTS idx_referral_doctor_name 
ON referral(doctor_name);

-- Lab Settings and Activity Log Indexes
CREATE INDEX IF NOT EXISTS idx_lab_settings_lab 
ON lab_settings(lab_id);

CREATE INDEX IF NOT EXISTS idx_lab_activity_log_lab_date 
ON lab_activity_log(lab_id, created_at DESC);

-- Antibiotic Indexes
CREATE INDEX IF NOT EXISTS idx_antibiotic_name 
ON antibiotic(name);

-- Sample Type Indexes
CREATE INDEX IF NOT EXISTS idx_sample_type_name 
ON sample_type(name);

-- Status Indexes
CREATE INDEX IF NOT EXISTS idx_status_name 
ON status(name);

-- Categories Indexes
CREATE INDEX IF NOT EXISTS idx_categories_test_culture_name 
ON categories_test_and_culture(name);

CREATE INDEX IF NOT EXISTS idx_tgc_category_name 
ON tgc_category(name);

-- Optimize for tenant-based queries
CREATE INDEX IF NOT EXISTS idx_test_lab 
ON test(lab_id);

CREATE INDEX IF NOT EXISTS idx_culture_lab 
ON culture(lab_id);

CREATE INDEX IF NOT EXISTS idx_test_group_lab 
ON test_group(lab_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_medical_report_patient_lab_date 
ON medical_report(patient_id, lab_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_patient_lab_name 
ON patient(lab_id, name);

CREATE INDEX IF NOT EXISTS idx_patient_lab_code 
ON patient(lab_id, patientcode);

-- Indexes for soft delete patterns (if using paranoid tables)
-- Uncomment if using soft deletes
-- CREATE INDEX IF NOT EXISTS idx_medical_report_deleted_at 
-- ON medical_report(deleted_at);

-- CREATE INDEX IF NOT EXISTS idx_test_deleted_at 
-- ON test(deleted_at);

-- CREATE INDEX IF NOT EXISTS idx_culture_deleted_at 
-- ON culture(deleted_at);

-- CREATE INDEX IF NOT EXISTS idx_test_group_deleted_at 
-- ON test_group(deleted_at);

-- Performance monitoring indexes
CREATE INDEX IF NOT EXISTS idx_medical_report_prints 
ON medical_report(prints_number);

-- Full-text search indexes (MySQL specific)
-- Uncomment if using MySQL and want full-text search
-- ALTER TABLE patient ADD FULLTEXT(name);
-- ALTER TABLE test ADD FULLTEXT(name);
-- ALTER TABLE culture ADD FULLTEXT(name);

COMMIT;