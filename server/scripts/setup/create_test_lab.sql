-- =====================================================
-- LabManager Test Data Creation Script
-- Creates a new lab with admin user and sample patients
-- =====================================================

-- Create a new lab
INSERT INTO lab (
    name,
    path,
    contact_person,
    phone,
    region,
    subscription_status,
    trial_expires_at,
    is_active,
    created_at,
    updated_at
) VALUES (
    'Test Medical Laboratory',
    'test-medical-lab',
    'Dr. Ahmed Hassan',
    '+201234567890',
    'Cairo, Egypt',
    'trial',
    DATE_ADD(NOW(), INTERVAL 14 DAY),
    1,
    NOW(),
    NOW()
);

-- Get the lab ID
SET @lab_id = LAST_INSERT_ID();

-- Create admin user for the lab
INSERT INTO admin (
    lab_id,
    name,
    email,
    password,
    role,
    is_active,
    created_at,
    updated_at
) VALUES (
    @lab_id,
    'Dr. Ahmed Hassan',
    'admin@testmedlab.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: 'password'
    'admin',
    1,
    NOW(),
    NOW()
);

-- Create sample patients
INSERT INTO patient (
    lab_id,
    name,
    email,
    phone,
    gender,
    date_of_birth,
    address,
    emergency_contact,
    emergency_phone,
    blood_type,
    is_active,
    created_at,
    updated_at
) VALUES 
-- Patient 1
(@lab_id, 'Sarah Mohamed Ali', 'sarah.ali@email.com', '+201111111111', 'female', '1990-05-15', '123 Main St, Cairo', 'Ahmed Ali', '+201111111112', 'O+', 1, NOW(), NOW()),

-- Patient 2
(@lab_id, 'Omar Hassan Ibrahim', 'omar.ibrahim@email.com', '+202222222222', 'male', '1985-08-22', '456 Oak Ave, Alexandria', 'Fatima Ibrahim', '+202222222223', 'A+', 1, NOW(), NOW()),

-- Patient 3
(@lab_id, 'Layla Ahmed Hassan', 'layla.hassan@email.com', '+203333333333', 'female', '1992-12-10', '789 Pine Rd, Giza', 'Mohamed Hassan', '+203333333334', 'B+', 1, NOW(), NOW()),

-- Patient 4
(@lab_id, 'Karim Samir Mohamed', 'karim.mohamed@email.com', '+204444444444', 'male', '1988-03-28', '321 Elm St, Luxor', 'Nour Mohamed', '+204444444445', 'AB+', 1, NOW(), NOW()),

-- Patient 5
(@lab_id, 'Amina Youssef Ali', 'amina.ali@email.com', '+205555555555', 'female', '1995-07-14', '654 Maple Dr, Aswan', 'Youssef Ali', '+205555555556', 'O-', 1, NOW(), NOW());

-- Get patient IDs
SET @patient1_id = (SELECT id FROM patient WHERE lab_id = @lab_id AND email = 'sarah.ali@email.com' LIMIT 1);
SET @patient2_id = (SELECT id FROM patient WHERE lab_id = @lab_id AND email = 'omar.ibrahim@email.com' LIMIT 1);
SET @patient3_id = (SELECT id FROM patient WHERE lab_id = @lab_id AND email = 'layla.hassan@email.com' LIMIT 1);
SET @patient4_id = (SELECT id FROM patient WHERE lab_id = @lab_id AND email = 'karim.mohamed@email.com' LIMIT 1);
SET @patient5_id = (SELECT id FROM patient WHERE lab_id = @lab_id AND email = 'amina.ali@email.com' LIMIT 1);

-- Create sample tests
INSERT INTO test (
    lab_id,
    name,
    description,
    price,
    is_active,
    created_at,
    updated_at
) VALUES 
(@lab_id, 'Complete Blood Count (CBC)', 'Complete blood count with differential', 150.00, 1, NOW(), NOW()),
(@lab_id, 'Blood Glucose Test', 'Fasting blood glucose measurement', 80.00, 1, NOW(), NOW()),
(@lab_id, 'Cholesterol Panel', 'Total cholesterol, HDL, LDL, triglycerides', 120.00, 1, NOW(), NOW()),
(@lab_id, 'Liver Function Test', 'ALT, AST, ALP, bilirubin, protein', 200.00, 1, NOW(), NOW()),
(@lab_id, 'Kidney Function Test', 'Creatinine, BUN, eGFR', 180.00, 1, NOW(), NOW());

-- Get test IDs
SET @cbc_test_id = (SELECT id FROM test WHERE lab_id = @lab_id AND name = 'Complete Blood Count (CBC)' LIMIT 1);
SET @glucose_test_id = (SELECT id FROM test WHERE lab_id = @lab_id AND name = 'Blood Glucose Test' LIMIT 1);
SET @cholesterol_test_id = (SELECT id FROM test WHERE lab_id = @lab_id AND name = 'Cholesterol Panel' LIMIT 1);
SET @liver_test_id = (SELECT id FROM test WHERE lab_id = @lab_id AND name = 'Liver Function Test' LIMIT 1);
SET @kidney_test_id = (SELECT id FROM test WHERE lab_id = @lab_id AND name = 'Kidney Function Test' LIMIT 1);

-- Create sample medical reports
INSERT INTO medical_report (
    lab_id,
    patient_id,
    report_number,
    report_date,
    status,
    total_amount,
    is_active,
    created_at,
    updated_at
) VALUES 
-- Report 1: Sarah's CBC
(@lab_id, @patient1_id, 'RPT-001-2024', NOW(), 'completed', 150.00, 1, NOW(), NOW()),

-- Report 2: Omar's Glucose Test
(@lab_id, @patient2_id, 'RPT-002-2024', NOW(), 'completed', 80.00, 1, NOW(), NOW()),

-- Report 3: Layla's Cholesterol Panel
(@lab_id, @patient3_id, 'RPT-003-2024', NOW(), 'completed', 120.00, 1, NOW(), NOW()),

-- Report 4: Karim's Liver Function Test
(@lab_id, @patient4_id, 'RPT-004-2024', NOW(), 'in_progress', 200.00, 1, NOW(), NOW()),

-- Report 5: Amina's Kidney Function Test
(@lab_id, @patient5_id, 'RPT-005-2024', NOW(), 'pending', 180.00, 1, NOW(), NOW());

-- Get report IDs
SET @report1_id = (SELECT id FROM medical_report WHERE lab_id = @lab_id AND report_number = 'RPT-001-2024' LIMIT 1);
SET @report2_id = (SELECT id FROM medical_report WHERE lab_id = @lab_id AND report_number = 'RPT-002-2024' LIMIT 1);
SET @report3_id = (SELECT id FROM medical_report WHERE lab_id = @lab_id AND report_number = 'RPT-003-2024' LIMIT 1);
SET @report4_id = (SELECT id FROM medical_report WHERE lab_id = @lab_id AND report_number = 'RPT-004-2024' LIMIT 1);
SET @report5_id = (SELECT id FROM medical_report WHERE lab_id = @lab_id AND report_number = 'RPT-005-2024' LIMIT 1);

-- Create test results for completed reports
INSERT INTO medical_report_has_test (
    medical_report_id,
    test_id,
    result,
    reference_range,
    unit,
    status,
    price,
    created_at,
    updated_at
) VALUES 
-- Sarah's CBC Results
(@report1_id, @cbc_test_id, 'Normal', '4.5-11.0', 'K/μL', 'completed', 150.00, NOW(), NOW()),

-- Omar's Glucose Results
(@report2_id, @glucose_test_id, '95', '70-100', 'mg/dL', 'completed', 80.00, NOW(), NOW()),

-- Layla's Cholesterol Results
(@report3_id, @cholesterol_test_id, 'Normal', '<200', 'mg/dL', 'completed', 120.00, NOW(), NOW());

-- Create lab settings
INSERT INTO lab_settings (
    lab_id,
    setting_key,
    setting_value,
    setting_type,
    created_at,
    updated_at
) VALUES 
-- Branding settings
(@lab_id, 'lab_logo', '', 'string', NOW(), NOW()),
(@lab_id, 'primary_color', '#007bff', 'string', NOW(), NOW()),
(@lab_id, 'secondary_color', '#6c757d', 'string', NOW(), NOW()),
(@lab_id, 'lab_address', '123 Medical Center St, Cairo, Egypt', 'string', NOW(), NOW()),
(@lab_id, 'lab_phone', '+201234567890', 'string', NOW(), NOW()),
(@lab_id, 'lab_email', 'info@testmedlab.com', 'string', NOW(), NOW()),
(@lab_id, 'lab_website', 'https://testmedlab.com', 'string', NOW(), NOW()),
(@lab_id, 'report_header', 'Test Medical Laboratory', 'string', NOW(), NOW()),
(@lab_id, 'report_footer', 'Generated by LabManager - Professional Laboratory Management System', 'string', NOW(), NOW()),

-- System settings
(@lab_id, 'enable_email_notifications', 'true', 'boolean', NOW(), NOW()),
(@lab_id, 'enable_sms_notifications', 'false', 'boolean', NOW(), NOW()),
(@lab_id, 'auto_generate_reports', 'true', 'boolean', NOW(), NOW()),
(@lab_id, 'require_patient_consent', 'true', 'boolean', NOW(), NOW()),
(@lab_id, 'max_patients_per_month', '1000', 'number', NOW(), NOW()),
(@lab_id, 'max_tests_per_month', '5000', 'number', NOW(), NOW()),

-- Regional settings
(@lab_id, 'currency', 'EGP', 'string', NOW(), NOW()),
(@lab_id, 'timezone', 'Africa/Cairo', 'string', NOW(), NOW()),
(@lab_id, 'date_format', 'DD/MM/YYYY', 'string', NOW(), NOW()),
(@lab_id, 'language', 'en', 'string', NOW(), NOW());

-- Create sample invoices
INSERT INTO bill (
    lab_id,
    patient_id,
    bill_number,
    bill_date,
    total_amount,
    status,
    payment_method,
    created_at,
    updated_at
) VALUES 
(@lab_id, @patient1_id, 'INV-001-2024', NOW(), 150.00, 'paid', 'cash', NOW(), NOW()),
(@lab_id, @patient2_id, 'INV-002-2024', NOW(), 80.00, 'paid', 'card', NOW(), NOW()),
(@lab_id, @patient3_id, 'INV-003-2024', NOW(), 120.00, 'pending', 'cash', NOW(), NOW()),
(@lab_id, @patient4_id, 'INV-004-2024', NOW(), 200.00, 'pending', 'card', NOW(), NOW()),
(@lab_id, @patient5_id, 'INV-005-2024', NOW(), 180.00, 'pending', 'cash', NOW(), NOW());

-- =====================================================
-- Summary of Created Data:
-- =====================================================
-- Lab: Test Medical Laboratory (ID: @lab_id)
-- Admin: Dr. Ahmed Hassan (admin@testmedlab.com / password: 'password')
-- Patients: 5 sample patients with different demographics
-- Tests: 5 common laboratory tests
-- Reports: 5 medical reports (3 completed, 1 in progress, 1 pending)
-- Settings: Complete lab configuration
-- Invoices: 5 sample invoices
-- =====================================================

-- Display summary
SELECT 
    'Lab Created Successfully!' as message,
    @lab_id as lab_id,
    'Test Medical Laboratory' as lab_name,
    'test-medical-lab' as lab_path;

SELECT 
    'Admin Credentials:' as info,
    'admin@testmedlab.com' as email,
    'password' as password;

SELECT 
    'Access URL:' as info,
    CONCAT('http://localhost:5173/lab/test-medical-lab') as url; 