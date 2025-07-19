-- Fix medical_report_has_culture table primary key conflict
-- Run this script directly on your MySQL database
-- This script handles sql_require_primary_key constraint safely

-- Step 1: Check if table exists
SELECT COUNT(*) as table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'medical_report_has_culture';

-- Step 2: Show current table structure
DESCRIBE medical_report_has_culture;

-- Step 3: Check if id column already exists
SELECT COUNT(*) as id_exists FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND table_name = 'medical_report_has_culture' 
AND column_name = 'id';

-- Step 4: Create a backup of the current table
CREATE TABLE medical_report_has_culture_backup AS SELECT * FROM medical_report_has_culture;

-- Step 5: Drop the original table
DROP TABLE medical_report_has_culture;

-- Step 6: Recreate the table with the correct structure
CREATE TABLE medical_report_has_culture (
    id int NOT NULL AUTO_INCREMENT,
    medical_report_id int NOT NULL,
    culture_id int NOT NULL,
    created_at datetime DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY unique_medical_report_culture (medical_report_id, culture_id),
    KEY idx_medical_report_id (medical_report_id),
    KEY idx_culture_id (culture_id)
);

-- Step 7: Copy data back from backup
INSERT INTO medical_report_has_culture (medical_report_id, culture_id, created_at, updated_at)
SELECT medical_report_id, culture_id, created_at, updated_at 
FROM medical_report_has_culture_backup;

-- Step 8: Drop the backup table
DROP TABLE medical_report_has_culture_backup;

-- Step 9: Verify the fix
DESCRIBE medical_report_has_culture;

-- Step 10: Show the final structure
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_KEY,
    EXTRA
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND table_name = 'medical_report_has_culture'
ORDER BY ORDINAL_POSITION;

-- Step 11: Show sample data to verify
SELECT * FROM medical_report_has_culture LIMIT 5; 