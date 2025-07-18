-- =====================================================
-- SAFE MIGRATION: Add Timestamps to Tables
-- =====================================================
-- 
-- BEFORE RUNNING THIS MIGRATION:
-- 1. BACKUP YOUR DATABASE:
--    - Use MySQL Workbench: Server > Data Export > Select labmanager > Export to Self-Contained File
--    - Or use phpMyAdmin: Export > Custom > Select all tables > Go
--    - Or manually: mysqldump -u root -p labmanager > backup_$(date +%Y%m%d_%H%M%S).sql
--
-- 2. TEST ON A COPY FIRST (recommended)
-- 3. Run during low-traffic period
-- =====================================================

-- Start transaction for safety
START TRANSACTION;

-- Add createdAt/updatedAt to medical_report if not exists
ALTER TABLE `medical_report` ADD COLUMN `createdAt` DATETIME NULL, ADD COLUMN `updatedAt` DATETIME NULL;

-- Add createdAt/updatedAt to patient if not exists
ALTER TABLE `patient` ADD COLUMN `createdAt` DATETIME NULL, ADD COLUMN `updatedAt` DATETIME NULL;

-- Set default values for new columns
UPDATE `medical_report` SET `createdAt` = COALESCE(`date`, NOW()), `updatedAt` = COALESCE(`date`, NOW()) WHERE `createdAt` IS NULL;
UPDATE `patient` SET `createdAt` = NOW(), `updatedAt` = NOW() WHERE `createdAt` IS NULL;

-- Set NOT NULL and default constraints (if needed)
ALTER TABLE `medical_report` MODIFY `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, MODIFY `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE `patient` MODIFY `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, MODIFY `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Verify the changes
SELECT 
    'medical_report' as table_name,
    COUNT(*) as total_records,
    COUNT(`createdAt`) as records_with_createdAt,
    COUNT(`updatedAt`) as records_with_updatedAt
FROM `medical_report`
UNION ALL
SELECT 
    'patient' as table_name,
    COUNT(*) as total_records,
    COUNT(`createdAt`) as records_with_createdAt,
    COUNT(`updatedAt`) as records_with_updatedAt
FROM `patient`;

-- If everything looks good, commit the transaction
-- If there are issues, you can run: ROLLBACK;
COMMIT;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- 
-- To verify everything worked:
-- 1. Check that both tables have createdAt and updatedAt columns
-- 2. Verify that existing records have proper timestamps
-- 3. Test your application to ensure it works correctly
-- ===================================================== 