-- =====================================================
-- MANUAL TIMESTAMP MIGRATION SCRIPT
-- =====================================================
-- 
-- This script adds createdAt and updatedAt columns to:
-- - patient table
-- - medical_report table
--
-- Run this in your MySQL client (Workbench, phpMyAdmin, etc.)
-- =====================================================

-- Step 1: Add columns to patient table
ALTER TABLE `patient` 
ADD COLUMN `createdAt` DATETIME NULL, 
ADD COLUMN `updatedAt` DATETIME NULL;

-- Step 2: Add columns to medical_report table  
ALTER TABLE `medical_report` 
ADD COLUMN `createdAt` DATETIME NULL, 
ADD COLUMN `updatedAt` DATETIME NULL;

-- Step 3: Update existing records with meaningful timestamps
-- For medical reports: use existing date field if available, otherwise use current time
UPDATE `medical_report` 
SET `createdAt` = COALESCE(`date`, NOW()), 
    `updatedAt` = COALESCE(`date`, NOW()) 
WHERE `createdAt` IS NULL;

-- For patients: use current timestamp (reasonable default for existing records)
UPDATE `patient` 
SET `createdAt` = NOW(), 
    `updatedAt` = NOW() 
WHERE `createdAt` IS NULL;

-- Step 4: Set NOT NULL constraints with defaults
ALTER TABLE `medical_report` 
MODIFY `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, 
MODIFY `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE `patient` 
MODIFY `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, 
MODIFY `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Step 5: Verify the changes
SELECT 'patient' as table_name, COUNT(*) as total_records, COUNT(createdAt) as with_timestamps FROM patient
UNION ALL
SELECT 'medical_report' as table_name, COUNT(*) as total_records, COUNT(createdAt) as with_timestamps FROM medical_report;

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
-- 
-- Next steps:
-- 1. Restart your server
-- 2. Test the AdminDashboard
-- 3. Verify new records get automatic timestamps
-- ===================================================== 