-- Add bill_id column to medical_report table (if not exists)
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'medical_report' 
     AND COLUMN_NAME = 'bill_id') = 0,
    'ALTER TABLE `medical_report` ADD COLUMN `bill_id` INT NULL',
    'SELECT "Column bill_id already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key constraint (if not exists)
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'medical_report' 
     AND CONSTRAINT_NAME = 'fk_medical_report_bill1') = 0,
    'ALTER TABLE `medical_report` ADD CONSTRAINT `fk_medical_report_bill1` FOREIGN KEY (`bill_id`) REFERENCES `bill` (`id`) ON DELETE SET NULL ON UPDATE CASCADE',
    'SELECT "Foreign key constraint already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for better performance (if not exists)
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'medical_report' 
     AND INDEX_NAME = 'fk_medical_report_bill1_idx') = 0,
    'ALTER TABLE `medical_report` ADD INDEX `fk_medical_report_bill1_idx` USING BTREE (`bill_id`)',
    'SELECT "Index already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt; 