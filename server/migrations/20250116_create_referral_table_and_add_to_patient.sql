-- Migration: Create referral table and add referral_id to patient table
-- Date: 2025-01-16
-- Description: Creates the referral table for managing doctor referrals and adds referral_id foreign key to patient table

-- Create referral table
CREATE TABLE IF NOT EXISTS `referral` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `doctor_name` VARCHAR(255) NOT NULL COMMENT 'Name of the referring doctor',
  `specialization` VARCHAR(255) NOT NULL COMMENT 'Medical specialization of the doctor',
  `phone` VARCHAR(20) NULL COMMENT 'Contact phone number',
  `email` VARCHAR(255) NULL COMMENT 'Email address',
  `address` TEXT NULL COMMENT 'Physical address',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Whether the referral is active (1) or soft-deleted (0)',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record last update timestamp',
  PRIMARY KEY (`id`),
  INDEX `idx_referral_doctor_name` (`doctor_name`),
  INDEX `idx_referral_specialization` (`specialization`),
  INDEX `idx_referral_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Table for managing doctor referrals';

-- Add referral_id column to patient table
ALTER TABLE `patient` 
ADD COLUMN `referral_id` INT NULL COMMENT 'Foreign key reference to referral table' AFTER `contract_id`;

-- Add foreign key constraint
ALTER TABLE `patient` 
ADD CONSTRAINT `fk_patient_referral` 
FOREIGN KEY (`referral_id`) 
REFERENCES `referral` (`id`) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Add index for the foreign key
ALTER TABLE `patient` 
ADD INDEX `fk_patient_referral_idx` (`referral_id`);

-- Insert some sample referral data (optional)
INSERT INTO `referral` (`doctor_name`, `specialization`, `phone`, `email`, `address`) VALUES
('Dr. Ahmed Hassan', 'Cardiology', '+201234567890', 'ahmed.hassan@hospital.com', '123 Medical Center St, Cairo'),
('Dr. Fatima Ali', 'Dermatology', '+201234567891', 'fatima.ali@clinic.com', '456 Health Plaza, Alexandria'),
('Dr. Mohamed Saleh', 'Internal Medicine', '+201234567892', 'mohamed.saleh@medical.com', '789 Care Center Ave, Giza'),
('Dr. Nour Ibrahim', 'Pediatrics', '+201234567893', 'nour.ibrahim@children.com', '321 Kids Hospital Rd, Cairo'),
('Dr. Omar Mahmoud', 'Orthopedics', '+201234567894', 'omar.mahmoud@bones.com', '654 Bone Clinic St, Alexandria');