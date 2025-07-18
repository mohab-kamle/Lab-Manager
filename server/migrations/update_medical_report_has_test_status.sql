-- Update medical_report_has_test table to add 'pending' status (if needed)
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'medical_report_has_test' 
     AND COLUMN_NAME = 'status'
     AND COLUMN_TYPE LIKE '%pending%') = 0,
    'ALTER TABLE `medical_report_has_test` MODIFY COLUMN `status` enum(\'pending\',\'low\',\'critical low\',\'normal\',\'high\',\'critical high\') DEFAULT \'pending\'',
    'SELECT "Status column already includes pending" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt; 